import { apiFetch } from "./api";

export async function suggestTitle(
  content: string,
  avoid: string | null,
  getToken: () => Promise<string | null>,
): Promise<string> {
  const result = await apiFetch<{ title: string }>(
    "/api/chat/suggest-title",
    getToken,
    {
      method: "POST",
      body: { content, avoid },
    },
  );
  return result.title;
}
