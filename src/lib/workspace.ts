export function workspaceFromRequest(request: Request) {
  const value = request.headers.get("x-loopaal-workspace") || "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || undefined;
}
