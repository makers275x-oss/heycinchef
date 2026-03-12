import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode, // "recipe" | "cocktail"
      title,
      summary,
      ingredients = [],
    } = body || {};

    if (!title) {
      return NextResponse.json({ error: "title gerekli" }, { status: 400 });
    }

    const isCocktail = mode === "cocktail";

    const prompt = isCocktail
      ? `
Premium mobil uygulama için iştah açıcı bir kokteyl görseli üret.

Kurallar:
- Tek bir premium kokteyl sunumu göster.
- Şık bardak, güzel ışık, temiz bar masası.
- Aşırı karmaşık arka plan yapma.
- Yazı, watermark, logo, etiket yazısı olmasın.
- Görsel fotogerçekçi olsun.
- Görselde sadece sonuç içecek öne çıksın.
- Başlık: ${title}
- Açıklama: ${summary || ""}
- İçerikler: ${Array.isArray(ingredients) ? ingredients.join(", ") : ""}
`
      : `
Premium mobil uygulama için iştah açıcı bir yemek görseli üret.

Kurallar:
- Tek bir servis edilmiş yemek göster.
- Şık tabak, temiz masa, sıcak ve premium sunum.
- Arka plan sade olsun.
- Yazı, watermark, logo olmasın.
- Görsel fotogerçekçi olsun.
- Görselde sadece sonuç yemek öne çıksın.
- Başlık: ${title}
- Açıklama: ${summary || ""}
- İçerikler: ${Array.isArray(ingredients) ? ingredients.join(", ") : ""}
`;

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
    });

    const b64 = result.data?.[0]?.b64_json;

    if (!b64) {
      return NextResponse.json({ error: "Görsel üretilemedi" }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${b64}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Beklenmeyen hata" },
      { status: 500 }
    );
  }
}