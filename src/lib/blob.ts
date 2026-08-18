import { put } from "@vercel/blob";

const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export function isBlobConfigured() {
  return hasBlobToken;
}

export async function uploadImageToBlob(file: Blob, fileName: string) {
  if (!hasBlobToken) {
    throw new Error("Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN.");
  }

  const blob = await put(fileName, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return blob.url;
}
