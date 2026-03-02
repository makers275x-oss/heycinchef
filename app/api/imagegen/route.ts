import OpenAI from "openai";
import { NextResponse } from "next/server";

const apiKey = process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });
    const { prompt } = await req.json();

    const p = String(prompt || "").trim();
    if (!p) {
      return NextResponse.json({ error: "prompt missing" }, { status: 400 });
    }

    // ✅ Image generation
    const img = await client.images.generate({
      model: "gpt-image-1",
      prompt: p,
      size: "1024x1024",
    });

    // OpenAI images API base64 döndürebilir; URL yerine base64 daha yaygın
    const b64 = img.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ error: "no_image_returned" }, { status: 500 });
    }

    return NextResponse.json({ b64 });
  } catch (e: any) {
    console.error("IMAGEGEN ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "imagegen_error" }, { status: 500 });
  }
}
