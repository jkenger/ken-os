export async function post<T>(path: string, body: unknown = {}): Promise<T> {
  return send<T>(path, "POST", body);
}

export async function send<T>(path: string, method: "POST" | "PUT" | "DELETE", body: unknown = {}): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}

export const textarea =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
