import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function uniqClean(arr: string[] = [], max = 8) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const v = (x || "").trim().toLowerCase();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("image") as File | null;
    const mode = (form.get("mode") as string) || "food";

    if (!file) return NextResponse.json({ error: "Görsel bulunamadı." }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const sysFood = `
Sen bir buzdolabı analiz uzmanısın.

Kurallar:
- SADECE fotoğrafta NET görünen ürünleri yaz.
- Emin değilsen yazma. Tahmin yapma.
- Maksimum 8 ürün yaz.
- Her ürün için confidence (0-1) ver.

SADECE JSON:

{
 "isCookable": boolean,
 "ingredients":[{"name":"domates","conf":0.82}],
 "chefLine":"kısa cümle",
 "confidence": number
}
`.trim();

    const sysDrinks = `
Sen bir bar uzmanısın.

Kurallar:
- Sadece fotoğrafta görünen içecekleri yaz.
- Emin değilsen ekleme.
- Maks 8 item.
- Her item için conf ver (0-1).

SADECE JSON:

{
 "drinks":[{"name":"vodka","conf":0.8}],
 "chefLine":"kısa cümle",
 "confidence": number
}
`.trim();

    const system = mode === "drinks" ? sysDrinks : sysFood;

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: "Fotoğrafı analiz et." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
          ],
        },
      ],
    });

    const text = r.choices?.[0]?.message?.content || "{}";
    const data = JSON.parse(text);

    if (mode === "drinks") {
      const raw =
        (data?.drinks || [])
          .filter((x: any) => (x?.conf ?? 0) > 0.55)
          .map((x: any) => x.name) || [];

      const drinks = uniqClean(raw, 8);

      return NextResponse.json({
        drinks,
        chefLine: data?.chefLine || (drinks.length ? "İçecekleri yakaladım 😄" : "İçecekleri net göremedim 😄"),
        confidence: Number(data?.confidence ?? 0),
      });
    }

    // food
    const raw =
      (data?.ingredients || [])
        .filter((x: any) => (x?.conf ?? 0) > 0.55)
        .map((x: any) => x.name) || [];

    const ingredients = uniqClean(raw, 8);

    return NextResponse.json({
      isCookable: ingredients.length >= 2,
      ingredients,
      chefLine: data?.chefLine || (ingredients.length ? "Malzemeleri yakaladım 😄" : "Foto net değil 😄 Daha yakın çek."),
      confidence: Number(data?.confidence ?? 0),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Vision hatası" }, { status: 500 });
  }
}