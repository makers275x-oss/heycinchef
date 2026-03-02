import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AlcoholLevel = "hafif" | "orta" | "sert";

function safeArr(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x || "").trim()).filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY yok" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const items: any[] = Array.isArray(body?.items) ? body.items : [];
    const alcoholLevel: AlcoholLevel =
      body?.alcoholLevel === "hafif" ||
      body?.alcoholLevel === "sert"
        ? body.alcoholLevel
        : "orta";

    const variation =
      Number.isFinite(body?.variation) ? Number(body.variation) : 0;

    if (!items.length) {
      return NextResponse.json(
        { error: "items boş" },
        { status: 400 }
      );
    }

    const itemText = items
      .map((x) => (typeof x === "string" ? x : x?.name))
      .filter(Boolean)
      .join(", ");

const prompt = `
Sen premium bir "Cin Şef Barmen"sin.

Kullanıcının elindeki içecekler:
${itemText}

Güç seviyesi: ${alcoholLevel}
Alternatif sayacı: ${variation}

KURALLAR:
- Sadece listede olanları kullan.
- Tahmin yapma.
- Alkolsüz üretme.
- Ölçü şart: her malzeme için ml veya cl yaz.
- Toplam hacim 150–250 ml arası olsun.
- Buz varsa "2-3 küp buz" yaz.
- Adımlar kısa ve net olsun, "kaç saniye karıştır/çalkala" mutlaka belirt.
- En az 3 malzeme ve 3 adım yaz (premium için).

JSON dışında hiçbir şey yazma.

ŞEMA:
{
  "title": string,
  "summary": string,
  "strength": "hafif"|"orta"|"sert",
  "score": number,
  "ingredients": string[],  // örn: "Jägermeister 50 ml"
  "steps": string[],        // örn: "Bardağa buz koy, 10 sn karıştır"
  "tips": string[]
}
`;

    const payload = {
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "cocktail_recipe",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              strength: {
                type: "string",
                enum: ["hafif", "orta", "sert"],
              },
              score: { type: "number" },
              ingredients: {
                type: "array",
                items: { type: "string" },
              },
              steps: {
                type: "array",
                items: { type: "string" },
              },
              tips: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: [
              "title",
              "summary",
              "strength",
              "score",
              "ingredients",
              "steps",
              "tips",
            ],
          },
          strict: true,
        },
      },
    };

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return NextResponse.json(
        { error: "OpenAI cocktail hatası", detail: t },
        { status: 500 }
      );
    }

    const json = await resp.json();

    let outText = "";
    if (typeof json?.output_text === "string") {
      outText = json.output_text;
    } else {
      const arr = json?.output || [];
      for (const o of arr) {
        if (Array.isArray(o?.content)) {
          for (const c of o.content) {
            if (typeof c?.text === "string") outText += c.text;
          }
        }
      }
    }

    let data: any = null;

    try {
      data = JSON.parse(outText);
    } catch {
      const m = outText.match(/\{[\s\S]*\}/);
      if (m?.[0]) data = JSON.parse(m[0]);
    }

    const title = String(data?.title || "Cin Şef Karışımı");
    const summary = String(data?.summary || "");
    const strength =
      (data?.strength as AlcoholLevel) || alcoholLevel;
    const score = Number.isFinite(data?.score)
      ? Number(data.score)
      : 70;

    const ingredients = safeArr(data?.ingredients);
    const steps = safeArr(data?.steps);
    const tips = safeArr(data?.tips);

    // 🔥 BOŞ DÖNMEYİ ENGELLE
    if (ingredients.length < 2 || steps.length < 2) {
      return NextResponse.json({
        title: "Mixer lazım 🧞",
        summary:
          "Karışım için en az 1 içki + 1 mixer gerekir. Manual ekle: buz + limon + soda/tonik/kola.",
        strength,
        score: 55,
        ingredients: [
          "(Eksik) buz",
          "(Eksik) limon/lime",
          "(Eksik) soda/tonik/kola",
        ],
        steps: [
          "Manual ekle bölümünden mixer ekle.",
          "Sonra tekrar karışım oluştur.",
        ],
        tips: ["Model tahmin yapmaz, sadece gördüğünü kullanır."],
      });
    }

    return NextResponse.json({
      title,
      summary,
      strength,
      score,
      ingredients,
      steps,
      tips,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "cocktail route crash",
        detail: String(e?.message || e),
      },
      { status: 500 }
    );
  }
}