import { NextRequest } from "next/server";
import { convertUrlToMarkdown } from "@/lib/markdown";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      return Response.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const result = await convertUrlToMarkdown(normalizedUrl);

    return Response.json(result);
  } catch (error: any) {
    console.error("Conversion error:", error);
    return Response.json(
      { error: error.message || "Failed to convert URL" },
      { status: 500 }
    );
  }
}
