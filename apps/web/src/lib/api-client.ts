/** Calls a Loots JSON route from the browser and throws the route's own one-line error when it fails. */
export async function send<T>(path: string, method: "POST" | "PUT" | "DELETE", body: unknown = {}): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Couldn't finish. Try again");
  return result;
}

export async function post<T>(path: string, body: unknown = {}): Promise<T> {
  return send<T>(path, "POST", body);
}
