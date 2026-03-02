import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ✅ Responses API'den metni sağlam şekilde çek */
function extractOutputText(respJson: any): string {
  // 1) Bazen direkt burada gelir
  if (typeof respJson?.output_text === "string" && respJson.output_text.trim()) {
    return respJson.output_text.trim();
  }

  // 2) Çoğu zaman output -> content -> text içinde gelir
  const out = Array.isArray(respJson?.output) ? respJson.output : [];
  for (const item of out) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === "string" && c.text.trim()) return c.text.trim();
      if (typeof c?.content === "string" && c.content.trim()) return c.content.trim();
      if (typeof c?.value === "string" && c.value.trim()) return c.value.trim();
    }
  }

  return "";
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY yok" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const items: string[] = Array.isArray(body?.items) ? body.items : [];
    const variation: number = Number.isFinite(body?.variation) ? Number(body.variation) : 0;

    if (items.length === 0) return NextResponse.json({ error: "items boş" }, { status: 400 });

    // ✅ FridgeChef: net + kısa + temel mutfak serbest
    const prompt = `
Sen “Cin Şef”sin.
Kısa konuş. Maks 1 espri.
Sadece 1 tarif üret.

Elimdeki malzemeler: ${items.join(", ")}
Variation: ${variation}

Kurallar:
- Tahmin yok: listede yoksa “var” deme.
- Listedekiler dışına çıkma. (İSTİSNA: su, tuz, yağ, karabiber serbest)
- 5+ kısa adım yaz (satır satır okunabilir).
- SADECE geçerli JSON döndür. Açıklama/markdown yok.

Şema:
{
 "title": "string",
 "summary": "string",
 "ingredients": ["string"],
 "steps": ["string"]
}

Not: variation arttıkça tarifi GERÇEKTEN değiştir.
`.trim();

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
          name: "fridge_recipe",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              ingredients: { type: "array", items: { type: "string" } },
              steps: { type: "array", items: { type: "string" } },
            },
            required: ["title", "summary", "ingredients", "steps"],
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

    const raw = await resp.json().catch(async () => ({ _raw: await resp.text().catch(() => "") }));

    if (!resp.ok) {
      return NextResponse.json(
        { error: "OpenAI recipe hatası", detail: raw?._raw || raw },
        { status: 500 }
      );
    }

    const outText = extractOutputText(raw);

    if (!outText) {
      // ✅ Debug için kısa kesilmiş response
      return NextResponse.json(
        { error: "Model boş çıktı döndü", detail: JSON.stringify(raw).slice(0, 2000) },
        { status: 500 }
      );
    }

    // ✅ JSON parse (normalde strict schema ile direkt JSON gelir)
    let data: any = null;
    try {
      data = JSON.parse(outText);
    } catch {
      // son çare: içindeki JSON bloğunu yakala
      const m = outText.match(/\{[\s\S]*\}/);
      if (m?.[0]) data = JSON.parse(m[0]);
    }

    // ✅ Boş tarif dönmesin
    const title = String(data?.title || "Cin Şef Tarifi");
    const summary = String(data?.summary || "");
    const ingredients = Array.isArray(data?.ingredients) ? data.ingredients : [];
    const steps = Array.isArray(data?.steps) ? data.steps : [];

    if (!steps.length) {
      return NextResponse.json(
        { error: "Tarif boş döndü", detail: outText.slice(0, 800) },
        { status: 500 }
      );
    }

    return NextResponse.json({ title, summary, ingredients, steps }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "recipe route crash", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}