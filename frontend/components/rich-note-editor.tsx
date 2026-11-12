"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import { useCallback } from "react";

interface RichNoteEditorProps {
  content: object | null;
  onChange: (content: object) => void;
  disabled?: boolean;
}

export function RichNoteEditor({
  content,
  onChange,
  disabled = false,
}: RichNoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
        protocols: ["http", "https", "mailto"],
        autolink: true,
        validate: (url: string) => {
          const pattern =
            /^(https?:\/\/|mailto:)[-\w.]+[-\w]+(:\d+)?(\/[-\w./?%&=]*)?$/i;
          return pattern.test(url);
        },
      }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON());
    },
  });

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    editor?.chain().focus().toggleUnderline().run();
  }, [editor]);

  const toggleStrikethrough = useCallback(() => {
    editor?.chain().focus().toggleStrike().run();
  }, [editor]);

  const toggleHeading1 = useCallback(() => {
    editor?.chain().focus().toggleHeading({ level: 1 }).run();
  }, [editor]);

  const toggleHeading2 = useCallback(() => {
    editor?.chain().focus().toggleHeading({ level: 2 }).run();
  }, [editor]);

  const toggleHeading3 = useCallback(() => {
    editor?.chain().focus().toggleHeading({ level: 3 }).run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const toggleCodeBlock = useCallback(() => {
    editor?.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  const toggleInlineCode = useCallback(() => {
    editor?.chain().focus().toggleCode().run();
  }, [editor]);

  const addLink = useCallback(() => {
    const url = prompt("Enter the URL:");
    if (url) {
      editor
        ?.chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-t-md bg-gray-50">
        <ToolbarButton
          onClick={toggleBold}
          active={editor?.isActive("bold")}
          disabled={disabled}
          title="Bold"
        >
          <Bold size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={toggleItalic}
          active={editor?.isActive("italic")}
          disabled={disabled}
          title="Italic"
        >
          <Italic size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={toggleUnderline}
          active={editor?.isActive("underline")}
          disabled={disabled}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={toggleStrikethrough}
          active={editor?.isActive("strike")}
          disabled={disabled}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={toggleHeading1}
          active={editor?.isActive("heading", { level: 1 })}
          disabled={disabled}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={toggleHeading2}
          active={editor?.isActive("heading", { level: 2 })}
          disabled={disabled}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={toggleHeading3}
          active={editor?.isActive("heading", { level: 3 })}
          disabled={disabled}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={toggleBulletList}
          active={editor?.isActive("bulletList")}
          disabled={disabled}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={toggleOrderedList}
          active={editor?.isActive("orderedList")}
          disabled={disabled}
          title="Ordered List"
        >
          <ListOrdered size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={toggleBlockquote}
          active={editor?.isActive("blockquote")}
          disabled={disabled}
          title="Blockquote"
        >
          <Quote size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={toggleInlineCode}
          active={editor?.isActive("code")}
          disabled={disabled}
          title="Inline Code"
        >
          <Code size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={toggleCodeBlock}
          active={editor?.isActive("codeBlock")}
          disabled={disabled}
          title="Code Block"
        >
          <Code2 size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={addLink}
          active={editor?.isActive("link")}
          disabled={disabled}
          title="Add Link"
        >
          <LinkIcon size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={disabled}
          title="Undo"
        >
          <Undo2 size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={disabled}
          title="Redo"
        >
          <Redo2 size={16} />
        </ToolbarButton>
      </div>

      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none focus:outline-none p-4 border border-t-0 border-gray-300 rounded-b-md bg-white min-h-96"
      />
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
          : "bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />;
}
