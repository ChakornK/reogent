/** Accepts HTTP(S) citation links without embedded credentials. */
export function safeSourceUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return undefined;
    return value.trim();
  } catch {
    return undefined;
  }
}

/** Normalizes a source-page identity while retaining meaningful query parameters. */
export function canonicalSourceUrl(value: unknown): string | undefined {
  const source = safeSourceUrl(value);
  if (!source) return undefined;
  const url = new URL(source);
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  url.searchParams.sort();
  return url.href;
}
