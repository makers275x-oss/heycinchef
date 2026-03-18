import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers || {}),
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

function extractOutputText(respJson: any): string {
  if (typeof respJson?.output_text === "string" && respJson.output_text.trim()) {
    return respJson.output_text.trim();
  }

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
    if (!apiKey) {
      return jsonResponse({ error: "OPENAI_API_KEY yok" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const items: string[] = Array.isArray(body?.items) ? body.items : [];
    const variation: number = Number.isFinite(body?.variation) ? Number(body.variation) : 0;

    if (items.length === 0) {
      return jsonResponse({ error: "items boş" }, { status: 400 });
    }

    const prompt = `
Sen “Cin Şef”sin.
Kısa konuş. Maksimum 1 küçük espri yap.
Sadece 1 tarif üret.

Elimdeki malzemeler: ${items.join(", ")}
Variation: ${variation}

Kurallar:
- ÇIKTI DİLİ: Türkçe zorunlu. İngilizce kelime kullanma.
- Tahmin yok: listede olmayan bir malzemeyi varmış gibi yazma.
- Listedekiler dışına çıkma.
- İSTİSNA olarak sadece şu temel mutfak öğeleri serbest: su, tuz, yağ, karabiber.
- Tarif gerçekçi, uygulanabilir ve kısa olsun.
- 5 veya daha fazla kısa adım yaz.
- Adımlar satır satır okunabilir olsun.
- variation arttıkça tarif gerçekten değişsin. Aynı tarifi tekrar etme.
- "calories" alanında yaklaşık toplam kalori ver. Örn: "420 kcal"
- "healthScore" alanında 1 ile 10 arasında sağlık puanı ver. Ondalıklı olabilir. Örn: 8.4
- "protein" alanında yaklaşık protein ver. Örn: "22 g"
- "carbs" alanında yaklaşık karbonhidrat ver. Örn: "30 g"
- "fat" alanında yaklaşık yağ ver. Örn: "18 g"
- "duration" alanında toplam süre ver. Örn: "20 dk"
- "difficulty" alanında sadece şu değerlerden birini ver: "Kolay", "Orta", "Zor"
- "summary" kısa olsun.
- SADECE geçerli JSON döndür. Açıklama, markdown, kod bloğu yok.

Şema:
{
  "title": "string",
  "summary": "string",
  "ingredients": ["string"],
  "steps": ["string"],
  "calories": "string",
  "healthScore": 8.4,
  "protein": "string",
  "carbs": "string",
  "fat": "string",
  "duration": "string",
  "difficulty": "Kolay | Orta | Zor"
}
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
              ingredients: {
                type: "array",
                items: { type: "string" },
              },
              steps: {
                type: "array",
                items: { type: "string" },
              },
              calories: { type: "string" },
              healthScore: { type: "number" },
              protein: { type: "string" },
              carbs: { type: "string" },
              fat: { type: "string" },
              duration: { type: "string" },
              difficulty: { type: "string" },
            },
            required: [
              "title",
              "summary",
              "ingredients",
              "steps",
              "calories",
              "healthScore",
              "protein",
              "carbs",
              "fat",
              "duration",
              "difficulty",
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

    const raw = await resp.json().catch(async () => ({
      _raw: await resp.text().catch(() => ""),
    }));

    if (!resp.ok) {
      return jsonResponse(
        { error: "OpenAI recipe hatası", detail: raw?._raw || raw },
        { status: 500 }
      );
    }

    const outText = extractOutputText(raw);

    if (!outText) {
      return jsonResponse(
        { error: "Model boş çıktı döndü", detail: JSON.stringify(raw).slice(0, 2000) },
        { status: 500 }
      );
    }

    let data: any = null;
    try {
      data = JSON.parse(outText);
    } catch {
      const m = outText.match(/\{[\s\S]*\}/);
      if (m?.[0]) data = JSON.parse(m[0]);
    }

    const title = String(data?.title || "Cin Şef Tarifi");
    const summary = String(data?.summary || "");
    const ingredients = Array.isArray(data?.ingredients) ? data.ingredients : [];
    const steps = Array.isArray(data?.steps) ? data.steps : [];

    const calories = String(data?.calories || "-");
    const healthScore =
      typeof data?.healthScore === "number" && Number.isFinite(data.healthScore)
        ? data.healthScore
        : 0;
    const protein = String(data?.protein || "-");
    const carbs = String(data?.carbs || "-");
    const fat = String(data?.fat || "-");
    const duration = String(data?.duration || "-");
    const difficulty = String(data?.difficulty || "-");

    if (!steps.length) {
      return jsonResponse(
        { error: "Tarif boş döndü", detail: outText.slice(0, 800) },
        { status: 500 }
      );
    }

    return jsonResponse(
      {
        title,
        summary,
        ingredients,
        steps,
        calories,
        healthScore,
        protein,
        carbs,
        fat,
        duration,
        difficulty,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return jsonResponse(
      { error: "recipe route crash", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}