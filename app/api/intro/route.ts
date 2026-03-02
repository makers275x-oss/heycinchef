import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          title: "Lamba hazır…",
          subtitle: "Cin Asistan burada 😄",
          line: "Bugün ne yapıyoruz? Foto çek, ben büyüyü yapayım 👀",
          speak: "Lamba hazır! Ben Cin Şef. Fotoğrafı göster bakalım 😄",
        },
        { status: 200 }
      );
    }

    const prompt = `
Sen eğlenceli “Cin Asistan”sın.
Mobil app açılışında görünecek 3 satır üret.
Kısa, komik, kullanıcıyı aksiyona çağıran.

JSON döndür:
{
 "title": string,
 "subtitle": string,
 "line": string,
 "speak": string
}
`;

    const payload = {
      model: "gpt-4.1-mini",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
      text: {
        format: {
          type: "json_schema",
          name: "intro",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              subtitle: { type: "string" },
              line: { type: "string" },
              speak: { type: "string" },
            },
            required: ["title", "subtitle", "line", "speak"],
          },
          strict: true,
        },
      },
    };

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      return NextResponse.json(
        {
          title: "Lamba hazır…",
          subtitle: "Cin Asistan burada 😄",
          line: "Bugün ne yapıyoruz? Foto çek, ben büyüyü yapayım 👀",
          speak: "Lamba hazır! Ben Cin Şef. Fotoğrafı göster bakalım 😄",
        },
        { status: 200 }
      );
    }

    const json = await resp.json();
    const outText: string = (json.output_text as string) || "";
    let data: any = null;

    try {
      data = JSON.parse(outText);
    } catch {
      const m = outText.match(/\{[\s\S]*\}/);
      if (m?.[0]) data = JSON.parse(m[0]);
    }

    return NextResponse.json(
      {
        title: String(data?.title || "Lamba hazır…"),
        subtitle: String(data?.subtitle || "Cin Asistan burada 😄"),
        line: String(data?.line || "Bugün ne yapıyoruz? Foto çek, ben büyüyü yapayım 👀"),
        speak: String(data?.speak || "Lamba hazır! Ben Cin Şef 😄"),
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        title: "Lamba hazır…",
        subtitle: "Cin Asistan burada 😄",
        line: "Bugün ne yapıyoruz? Foto çek, ben büyüyü yapayım 👀",
        speak: "Lamba hazır! Ben Cin Şef. Fotoğrafı göster bakalım 😄",
      },
      { status: 200 }
    );
  }
}