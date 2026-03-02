import OpenAI from "openai";
import { NextResponse } from "next/server";

const apiKey = process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing (.env.local)" },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const body = await req.json();
    const items: string[] = Array.isArray(body?.items) ? body.items : [];
    const timeLimit: number = Number(body?.timeLimit ?? 25);
    const diet: string = String(body?.diet ?? "Serbest");
    const mealType: string = String(body?.mealType ?? "Yemek"); // Yemek | Salata

    if (items.length < 2) {
      return NextResponse.json(
        { error: "Select at least 2 ingredients" },
        { status: 400 }
      );
    }

    const prompt = `
Sen Türkçe konuşan, komik bir Cin Şef'sin.
Kullanıcının SEÇTİĞİ malzemeler: ${items.join(", ")}.
Çıktı türü: ${mealType}.

Kısıtlar:
- Süre en fazla ${timeLimit} dakika
- Diyet tercihi: ${diet}
- Eğer mealType="Salata" ise soğuk/ferah servis odaklı ve az pişirme.
- Eğer mealType="Yemek" ise sıcak ana yemek odaklı.
- Malzeme yetersizse "shopping" alanına 1-3 tamamlayıcı öner.

SADECE geçerli JSON döndür. Açıklama yazma.

JSON:
{
  "chefLine": "kısa komik 1-2 cümle",
  "ingredients": ["kullanılan malzemeler"],
  "recipe": {
    "id": "r1",
    "title": "tarif adı",
    "timeMin": 20,
    "calories": 520,
    "why": "neden bu tarif",
    "steps": ["adım 1", "adım 2", "..."],
    "shopping": ["opsiyonel eksikler"]
  }
}
`.trim();

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      text: { format: { type: "json_object" } },
    });

    const text = resp.output_text;
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (e: any) {
    // DEMO YOK: gerçek hatayı döndür
    console.error("RECIPE API ERROR:", e);
    const msg = e?.message ?? "unknown error";

    // OpenAI error body bazen e.response?.data içinde olabilir; yoksa message yeter
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
