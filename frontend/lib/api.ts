export async function apiFetch<T>(
  path: string,
  getToken: () => Promise<string | null>,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!res.ok) {
    const responseBody = await res.text();
    let detail = responseBody;
    try {
      const payload: unknown = JSON.parse(responseBody);
      if (
        typeof payload === "object" &&
        payload !== null &&
        "detail" in payload &&
        typeof payload.detail === "string"
      ) {
        detail = payload.detail;
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    throw new Error(
      `Request failed: ${res.status}${detail ? ` - ${detail}` : ""}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
