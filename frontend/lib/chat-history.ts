import { apiFetch } from "./api";

export async function getChatHistory(
  getToken: () => Promise<string | null>,
): Promise<Array<Record<string, unknown>>> {
  const result = await apiFetch<{ messages: Array<Record<string, unknown>> }>(
    "/api/chat/history",
    getToken,
  );
  return result.messages;
}

export async function saveChatHistory(
  messages: Array<Record<string, unknown>>,
  getToken: () => Promise<string | null>,
): Promise<void> {
  await apiFetch<void>("/api/chat/history", getToken, {
    method: "PUT",
    body: { messages },
  });
}
