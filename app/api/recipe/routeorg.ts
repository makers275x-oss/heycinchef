import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type RecipeOut = {
  chefLine: string;
  ingredients: string[];
  recipe: {
    id: string;
    title: string;
    timeMin: number;
    calories?: number;
    why: string;
    steps: string[];
    shopping?: string[];
  };
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: string[] = Array.isArray(body?.items) ? body.items : [];
    const timeLimit: number = Number(body?.timeLimit ?? 25);
    const diet: string = String(body?.diet ?? "Serbest");

    if (!items.length) {
      return NextResponse.json({ error: "items missing" }, { status: 400 });
    }

    const prompt = `
Sen Türkçe konuşan, samimi bir şef asistansın.
Kullanıcının elindeki malzemeler: ${items.join(", ")}.

Kısıtlar:
- Süre en fazla ${timeLimit} dakika
- Diyet tercihi: ${diet}
- Evde olmayan malzemeler için 'shopping' alanına opsiyonel öneri yaz.
- 4 ila 7 adım arasında, net ve uygulanabilir anlat.

SADECE geçerli JSON döndür. Açıklama yazma.

JSON şeması:
{
  "chefLine": "kısa, eğlenceli 1-2 cümle",
  "ingredients": ["kullanılan malzemeler"],
  "recipe": {
    "id": "r1",
    "title": "tarif adı",
    "timeMin": 20,
    "calories": 520,
    "why": "neden bu tarifi seçtin",
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
    const data = JSON.parse(text) as RecipeOut;

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
