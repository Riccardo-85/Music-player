export async function sha256Hex(input: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", input);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}


