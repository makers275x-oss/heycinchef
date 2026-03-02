import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("image") as File | null;

  if (!file) {
    return NextResponse.json({ error: "image missing" }, { status: 400 });
  }

  // TODO: Buraya gerçek AI bağlanacak.
  // Şimdilik: gerçek site hissi için mantıklı mock döndürüyoruz.

  return NextResponse.json({
    chefLine:
      "Dolabında güzel kombinasyon var 😄 Tavuk + domates + yoğurt ile 20 dakikada harika bir tabak çıkar!",
    ingredients: ["Tavuk", "Domates", "Yoğurt", "Soğan", "Biber", "Peynir"],
    best: {
      id: "r1",
      title: "Tavuklu Sebze Sote",
      timeMin: 20,
      calories: 520,
      why: "Hem hızlı, hem dolaptaki sebzeleri israf etmeden bitiriyor.",
      steps: [
        "Tavayı ısıt, zeytinyağı ekle.",
        "Soğan ve biberi 3-4 dk sotele.",
        "Tavuğu ekle, 8-10 dk pişir.",
        "Domates ekle, 3 dk daha çevir. Tuz/karabiber.",
      ],
    },
  });
}
