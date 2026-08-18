import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { uploadImageToBlob } from "@/lib/blob";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function getFileExtension(file: File) {
  const fileNameExtension = file.name.split(".").pop()?.toLowerCase();
  if (fileNameExtension) {
    return fileNameExtension;
  }

  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File is too large" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const blob = new Blob([bytes], { type: file.type });
    const extension = getFileExtension(file);
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const url = await uploadImageToBlob(blob, fileName);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
