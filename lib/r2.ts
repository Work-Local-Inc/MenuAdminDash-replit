const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.menuai.ca";
const R2_UPLOAD_SECRET = process.env.R2_UPLOAD_SECRET || "";

export function getCdnUrl(bucket: string, path: string): string {
  return `${CDN_BASE_URL}/${bucket}/${path}`;
}

export function parseR2Url(
  url: string,
): { bucket: string; path: string } | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.slice(1).split("/");
    if (parts.length < 2) return null;
    const bucket = parts[0];
    const path = parts.slice(1).join("/");
    return { bucket, path };
  } catch {
    return null;
  }
}

export async function uploadToR2(
  bucket: string,
  path: string,
  body: Buffer | ArrayBuffer,
  contentType: string,
): Promise<{ url: string; key: string }> {
  const key = `${bucket}/${path}`;
  const response = await fetch(`${CDN_BASE_URL}/${key}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${R2_UPLOAD_SECRET}`,
      "Content-Type": contentType,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 upload failed (${response.status}): ${text}`);
  }

  return { url: `${CDN_BASE_URL}/${key}`, key };
}

export async function deleteFromR2(url: string): Promise<void> {
  const parsed = parseR2Url(url);
  if (!parsed) return;

  const key = `${parsed.bucket}/${parsed.path}`;
  const response = await fetch(`${CDN_BASE_URL}/${key}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${R2_UPLOAD_SECRET}`,
    },
  });

  if (!response.ok) {
    console.error(`R2 delete failed (${response.status}) for ${key}`);
  }
}
