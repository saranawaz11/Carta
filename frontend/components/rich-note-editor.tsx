"use client";

import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
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
  Palette,
  Highlighter,
  RemoveFormatting,
} from "lucide-react";
import { useCallback, useEffect, useState, type MutableRefObject } from "react";

import { useDismiss } from "@/lib/use-dismiss";

interface RichNoteEditorProps {
  content: JSONContent | null;
  onChange: (content: JSONContent) => void;
  disabled?: boolean;
  editorRef?: MutableRefObject<Editor | null>;
}

export function RichNoteEditor({
  content,
  onChange,
  disabled = false,
  editorRef,
}: RichNoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
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

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (editorRef) editorRef.current = editor ?? null;
  }, [editor, editorRef]);

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

  const applyTextColor = useCallback(
    (color: string | null) => {
      const chain = editor?.chain().focus();
      if (!chain) return;
      if (color) chain.setColor(color).run();
      else chain.unsetColor().run();
    },
    [editor],
  );

  const applyHighlight = useCallback(
    (color: string | null) => {
      const chain = editor?.chain().focus();
      if (!chain) return;
      if (color) chain.setHighlight({ color }).run();
      else chain.unsetHighlight().run();
    },
    [editor],
  );

  const clearColorAndHighlight = useCallback(() => {
    editor?.chain().focus().unsetColor().unsetHighlight().run();
  }, [editor]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-line bg-panel px-2 py-1.5">
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

        <SwatchPopover
          icon={<Palette size={16} />}
          title="Text Color"
          options={TEXT_COLORS}
          disabled={disabled}
          onPick={applyTextColor}
        />

        <SwatchPopover
          icon={<Highlighter size={16} />}
          title="Highlight"
          options={HIGHLIGHT_COLORS}
          disabled={disabled}
          onPick={applyHighlight}
        />

        <ToolbarButton
          onClick={clearColorAndHighlight}
          disabled={disabled}
          title="Clear Color and Highlight"
        >
          <RemoveFormatting size={16} />
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
        className="rounded-b-xl border border-t-0 border-line bg-panel p-4 text-ink [&_.ProseMirror]:min-h-[50vh] [&_.ProseMirror]:outline-none [&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-line-strong [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-gray-600 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:bg-tint [&_.ProseMirror_code]:px-1 [&_.ProseMirror_pre]:rounded-md [&_.ProseMirror_pre]:bg-tint [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_a]:text-brand [&_.ProseMirror_a]:underline"
      />
    </div>
  );
}

interface SwatchOption {
  label: string;
  /** null removes the mark. */
  value: string | null;
  swatch?: string;
  /** Shown instead of a swatch for options without a color. */
  glyph?: string;
}

const TEXT_COLORS: SwatchOption[] = [
  { label: "Default", value: null, glyph: "A" },
  { label: "Red", value: "#dc2626", swatch: "#dc2626" },
  { label: "Orange", value: "#ea580c", swatch: "#ea580c" },
  { label: "Amber", value: "#ca8a04", swatch: "#ca8a04" },
  { label: "Green", value: "#16a34a", swatch: "#16a34a" },
  { label: "Teal", value: "#0d9488", swatch: "#0d9488" },
  { label: "Blue", value: "#2563eb", swatch: "#2563eb" },
  { label: "Violet", value: "#7c3aed", swatch: "#7c3aed" },
  { label: "Pink", value: "#db2777", swatch: "#db2777" },
  { label: "Gray", value: "#6b7280", swatch: "#6b7280" },
];

const HIGHLIGHT_COLORS: SwatchOption[] = [
  { label: "Yellow", value: "#fef08a", swatch: "#fef08a" },
  { label: "Green", value: "#bbf7d0", swatch: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe", swatch: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8", swatch: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa", swatch: "#fed7aa" },
  { label: "Violet", value: "#ddd6fe", swatch: "#ddd6fe" },
  { label: "Cyan", value: "#a5f3fc", swatch: "#a5f3fc" },
  { label: "Red", value: "#fecaca", swatch: "#fecaca" },
  { label: "Gray", value: "#e5e7eb", swatch: "#e5e7eb" },
  { label: "Remove highlight", value: null, glyph: "×" },
];

function SwatchPopover({
  icon,
  title,
  options,
  disabled,
  onPick,
}: {
  icon: React.ReactNode;
  title: string;
  options: SwatchOption[];
  disabled: boolean;
  onPick: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  return (
    <div ref={ref} className="relative">
      <ToolbarButton
        onClick={() => setOpen((v) => !v)}
        active={open}
        disabled={disabled}
        title={title}
      >
        {icon}
      </ToolbarButton>

      {open && (
        <div
          role="listbox"
          aria-label={title}
          className="absolute left-0 top-full z-20 mt-1 grid grid-cols-5 gap-1.5 rounded-lg border border-line bg-panel p-2 shadow-md"
        >
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              role="option"
              aria-selected={false}
              aria-label={option.label}
              title={option.label}
              onClick={() => {
                onPick(option.value);
                setOpen(false);
              }}
              className="flex size-6 items-center justify-center rounded border border-line text-[10px] text-gray-500 hover:ring-2 hover:ring-red-300"
              style={option.swatch ? { backgroundColor: option.swatch } : undefined}
            >
              {option.swatch ? null : option.glyph}
            </button>
          ))}
        </div>
      )}
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
      className={`rounded-md p-1.5 transition-colors ${
        active
          ? "bg-tint text-brand"
          : "text-gray-700 hover:bg-tint hover:text-brand"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 w-px self-stretch bg-line" />;
}
