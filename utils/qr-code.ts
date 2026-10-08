/** Inline SVG QR code for access links; the library loads on first use. */
export async function renderQrSvg(text: string): Promise<string> {
  const { toString } = await import("qrcode");
  return toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}
