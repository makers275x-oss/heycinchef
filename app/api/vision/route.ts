import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Kind = "food" | "drinks";
type DrinkCategory =
  | "cin"
  | "viski"
  | "votka"
  | "rom"
  | "tekila"
  | "likor"
  | "vermut"
  | "bira"
  | "sarap"
  | "sampanya"
  | "tonik"
  | "soda"
  | "kola"
  | "ginger_ale"
  | "limon"
  | "lime"
  | "nane"
  | "buz"
  | "unknown";

type VisionItem = {
  name: string;
  category?: DrinkCategory;
  confidence: number;
};

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

function toBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

function norm(s: string) {
  return String(s || "").trim();
}

function uniqMax8(items: VisionItem[]) {
  const m = new Map<string, VisionItem>();
  for (const it of items) {
    const key = (it.category ? `${it.category}::` : "") + it.name.toLowerCase();
    if (!it.name) continue;
    if (!m.has(key)) m.set(key, it);
  }
  return Array.from(m.values()).slice(0, 8);
}

async function readOutputText(json: any): Promise<string> {
  if (typeof json?.output_text === "string") return json.output_text;
  const out = json?.output;
  if (Array.isArray(out)) {
    const texts: string[] = [];
    for (const o of out) {
      const content = o?.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (typeof c?.text === "string") texts.push(c.text);
        }
      }
    }
    if (texts.length) return texts.join("\n");
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonResponse({ error: "OPENAI_API_KEY yok" }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get("image") as File | null;

    const kindRaw = String(form.get("type") || "food");
    const kind: Kind = kindRaw === "drinks" ? "drinks" : "food";
    const isDrinks = kind === "drinks";

    if (!file) {
      return jsonResponse({ error: "image missing" }, { status: 400 });
    }

    const mime = file.type || "image/jpeg";
    const okMime = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mime);

    if (!okMime) {
      return jsonResponse({ error: `Unsupported mime: ${mime}` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const b64 = toBase64(bytes);
    const dataUrl = `data:${mime};base64,${b64}`;

    const CONF_THRESHOLD = isDrinks ? 0.6 : 0.45;

    const prompt = isDrinks
      ? `
You are a STRICT label reader for drink bottles/cans.
Goal: Extract items ONLY if you can READ the label text or the item is unmistakable (e.g., "tonik" can).

Hard rules:
- DO NOT guess drink type from bottle shape.
- If label is NOT readable, set:
  name = "etiket okunmuyor"
  category = "unknown"
  confidence <= 0.55 (so it will be filtered out by threshold)
- If label IS readable:
  - name: write the product/brand name as seen (original spelling; do NOT translate)
  - category: one of: cin, viski, votka, rom, tekila, likor, vermut, bira, sarap, sampanya, tonik, soda, kola, ginger_ale, limon, lime, nane, buz
  - confidence: 0..1

Return up to 8 items.
Output ONLY JSON:
{"items":[{"name":"...","category":"...","confidence":0.0}]}
`
      : `
You are a precise image analyst for fridge food.
Return ONLY clearly visible items. NO guessing. Max 8.

Include if clearly visible:
- vegetables, fruits
- dairy (peynir, süt, yoğurt)
- basics (yumurta, tereyağı)
- meat/fish (tavuk, et, balık)
- ÇIKTI DİLİ: Türkçe zorunlu.
- İngilizce kelime KULLANMA.
- Örn: "cauliflower" değil "karnabahar", "carrot" değil "havuç".

Output ONLY JSON:
{"items":[{"name":"...","confidence":0.0}]}
confidence 0..1
`;

    const payload = {
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: dataUrl },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "vision_items",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              items: {
                type: "array",
                maxItems: 8,
                items: isDrinks
                  ? {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        name: { type: "string" },
                        category: {
                          type: "string",
                          enum: [
                            "cin",
                            "viski",
                            "votka",
                            "rom",
                            "tekila",
                            "likor",
                            "vermut",
                            "bira",
                            "sarap",
                            "sampanya",
                            "tonik",
                            "soda",
                            "kola",
                            "ginger_ale",
                            "limon",
                            "lime",
                            "nane",
                            "buz",
                            "unknown",
                          ],
                        },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                      },
                      required: ["name", "category", "confidence"],
                    }
                  : {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        name: { type: "string" },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                      },
                      required: ["name", "confidence"],
                    },
              },
            },
            required: ["items"],
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
      return jsonResponse(
        { error: "OpenAI vision hatası", detail: t },
        { status: 500 }
      );
    }

    const json = await resp.json();
    const outText = await readOutputText(json);

    let parsed: any = null;
    try {
      parsed = JSON.parse(outText);
    } catch {
      const m = outText.match(/\{[\s\S]*\}/);
      if (m?.[0]) parsed = JSON.parse(m[0]);
    }

    const rawItems: any[] = Array.isArray(parsed?.items) ? parsed.items : [];

    const items: VisionItem[] = rawItems
      .map((x: any) => ({
        name: norm(x?.name),
        category: isDrinks ? (x?.category as DrinkCategory) : undefined,
        confidence: Number(x?.confidence ?? 0),
      }))
      .filter((x) => x.name && Number.isFinite(x.confidence));

    const filtered = uniqMax8(items.filter((x) => x.confidence >= CONF_THRESHOLD));

    return jsonResponse(
      {
        kind,
        threshold: CONF_THRESHOLD,
        items: filtered,
        count: filtered.length,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return jsonResponse(
      {
        error: "vision route crash",
        detail: String(e?.message || e),
      },
      { status: 500 }
    );
  }
}