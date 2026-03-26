import { auth } from "@clerk/nextjs/server";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

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
    const buffer = Buffer.from(bytes);
    const extension = getFileExtension(file);
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const uploadDirectory = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadDirectory, fileName);

    await fs.mkdir(uploadDirectory, { recursive: true });
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ url: `/uploads/${fileName}` });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
