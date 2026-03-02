import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Weather = "soğuk" | "ılık" | "sıcak";
type Place = "günlük" | "iş" | "date" | "parti";
type Style = "sade" | "cool" | "şık" | "komik";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const weather = (body.weather ?? "ılık") as Weather;
    const place = (body.place ?? "günlük") as Place;
    const style = (body.style ?? "cool") as Style;

    const system = `
Sen komik ama gerçekçi bir moda danışmanı "Cin Asistan"sın.

KURALLAR:
- Türkiye'de giyilebilir ve gerçekçi kombin öner.
- Marka ASLA yazma.
- Abartılı kostüm önermeyi abartma (komik modda bile giyilebilir komiklik).
- Hava/yer/stil ile uyumlu olmalı.
- Her seçenek: üst + alt + ayakkabı + 1 aksesuar (en az 4 parça).
- Renk uyumu için kısa ipucu ver.
- SADECE JSON döndür.

ŞEMA:
{
  "chefLine": "komik kısa cümle",
  "options": [
    { "title": "Güvenli", "why": "kısa", "items": ["..."], "colorTip": "kısa" },
    { "title": "Cool",    "why": "kısa", "items": ["..."], "colorTip": "kısa" },
    { "title": "Komik",   "why": "kısa", "items": ["..."], "colorTip": "kısa" }
  ]
}
`.trim();

    const user = `
Hava: ${weather}
Yer: ${place}
Stil tercihi: ${style}

Not: Stil tercihi yön verir ama yine de 3 seçenek üret.
`.trim();

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = r.choices?.[0]?.message?.content || "{}";
    const data = JSON.parse(text);

    const options = Array.isArray(data?.options) ? data.options : [];
    if (options.length < 3) {
      return NextResponse.json({ error: "Kombin seçenekleri üretilemedi." }, { status: 500 });
    }

    return NextResponse.json({
      chefLine: String(data?.chefLine ?? "Şak! Kombinler geldi 😄").trim(),
      options: options.slice(0, 3).map((o: any) => ({
        title: String(o?.title ?? "Seçenek").trim(),
        why: String(o?.why ?? "").trim(),
        items: Array.isArray(o?.items) ? o.items.map((x: any) => String(x).trim()).filter(Boolean).slice(0, 8) : [],
        colorTip: String(o?.colorTip ?? "").trim(),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Kombin üretilemedi." }, { status: 500 });
  }
}