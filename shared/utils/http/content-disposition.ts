// Download file names in a Content-Disposition header (RFC 6266): the server writes them, the app reads them.

// Characters RFC 5987 does not allow unencoded, on top of what encodeURIComponent encodes.
const encodeExtended = (value: string) => encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

/** `attachment` with an ASCII `filename` for old clients and the exact name as UTF-8 `filename*`. */
export function attachmentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeExtended(fileName)}`;
}

/** The file name of a Content-Disposition header, preferring `filename*`; null without one. */
export function dispositionFileName(header: string | null | undefined): string | null {
  const extended = /filename\*\s*=\s*UTF-8''([^;\s]+)/i.exec(header ?? "")?.[1];
  if (extended) {
    try {
      return decodeURIComponent(extended);
    } catch {
      // A broken encoding falls back to the plain name.
    }
  }
  const plain = /filename\s*=\s*(?:"([^"]*)"|([^;\s]+))/i.exec(header ?? "");
  return plain?.[1] || plain?.[2] || null;
}
