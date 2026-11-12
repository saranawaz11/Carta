import { Content, Editor } from "@tiptap/react";

/**
 * Convert plain text to Tiptap editor JSON.
 * Creates a simple document with paragraphs from line breaks.
 */
export function textToRichContent(plainText: string): Content {
  if (!plainText.trim()) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  const paragraphs = plainText
    .split(/\n\n+/)
    .map((text) => ({
      type: "paragraph",
      content:
        text.trim().length > 0
          ? [
              {
                type: "text",
                text: text.trim(),
              },
            ]
          : [],
    }));

  return {
    type: "doc",
    content: paragraphs,
  };
}

/**
 * Extract plain text projection from Tiptap editor JSON.
 * Produces deterministic, readable text for search and embeddings.
 */
export function richContentToText(editor: Editor | null): string {
  if (!editor) {
    return "";
  }

  const doc = editor.getJSON();
  const lines: string[] = [];

  function walkContent(content: Array<Record<string, unknown>>): void {
    if (!content) return;

    for (const node of content) {
      if (node.type === "paragraph") {
        const text = extractText(node.content as Array<Record<string, unknown>>);
        if (text.trim()) {
          lines.push(text);
        }
      } else if (node.type === "heading") {
        const text = extractText(node.content as Array<Record<string, unknown>>);
        if (text.trim()) {
          lines.push(text);
        }
      } else if (node.type === "bulletList" || node.type === "orderedList") {
        walkContent(node.content as Array<Record<string, unknown>>);
      } else if (node.type === "listItem") {
        const text = extractText(node.content as Array<Record<string, unknown>>);
        if (text.trim()) {
          lines.push(`• ${text}`);
        }
      } else if (node.type === "blockquote") {
        const text = extractText(node.content as Array<Record<string, unknown>>);
        if (text.trim()) {
          lines.push(`> ${text}`);
        }
      } else if (node.type === "codeBlock") {
        const text = extractText(node.content as Array<Record<string, unknown>>);
        if (text.trim()) {
          lines.push("```");
          lines.push(text);
          lines.push("```");
        }
      }
    }
  }

  function extractText(content: Array<Record<string, unknown>>): string {
    if (!content) return "";

    return content
      .map((node) => {
        if (node.type === "text") {
          return node.text || "";
        }
        if (node.type === "hardBreak") {
          return "\n";
        }
        return "";
      })
      .join("");
  }

  walkContent(doc.content as Array<Record<string, unknown>> || []);
  return lines.join("\n\n").trim();
}
