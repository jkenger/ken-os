import { appUrl } from "../config";

export function hasValidOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === appUrl();
}
