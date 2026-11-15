# Research: Folder Management and Enhanced Note Formatting

## Resolved Unknowns

- **Testing**: None. Constitution forbids test files and testing tasks. Validation is manual via [quickstart.md](./quickstart.md).
- **Scale**: Assume up to 100 folders and 10,000 notes per user. Decision: index `notes (clerk_user_id, folder_id)` so folder lookups stay indexed.
- **Folder name limit**: 60 characters. Fits the navbar width. Rejected: 255 (the database limit), which is too long for the navbar.
- **Color palettes**: Notion-inspired. 10 text colors including Default, and 9 highlight colors plus "Remove highlight". Exact hex values are a styling task for the developer.
- **Drag-and-drop**: Native HTML5 drag-and-drop with a custom MIME type (`application/x-carta-note`). Only note-to-folder drop is required, so no library is needed.
- **Platform**: Existing Next.js, FastAPI, and Neon PostgreSQL. No new infrastructure.

## Best Practices

- **Tiptap v2 marks**: Register `TextStyle` before `Color`. Use `Highlight.configure({ multicolor: true })` for colored highlights.
- **Ownership**: Every folder and note query filters by `clerk_user_id`, matching existing repositories.
- **Foreign key**: `ON DELETE SET NULL` on `notes.folder_id` keeps notes when a folder is deleted (FR-009).
