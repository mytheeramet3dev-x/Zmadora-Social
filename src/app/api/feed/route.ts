import { getPostsPage } from "@/actions/post.action";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const page = await getPostsPage(cursor);

    return NextResponse.json(page);
  } catch (error) {
    console.error("Failed to load feed page:", error);
    return NextResponse.json(
      { error: "Failed to load feed page" },
      { status: 500 }
    );
  }
}
