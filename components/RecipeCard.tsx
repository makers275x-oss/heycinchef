"use client";

import React, { useMemo, useState } from "react";

export type Recipe = {
  id: string;
  title: string;
  timeMin: number;
  calories?: number;
  why: string;
  steps: string[];
  tags?: string[];
  // artık "aynı yemek resmi" iddiası yok:
  imagePrompt?: string;
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-xs text-gray-700">
      {children}
    </span>
  );
}

function stepEmoji(i: number) {
  const e = ["🍗", "🍳", "🧅", "🧂", "🍅", "🔥", "🥗", "🍽️"];
  return e[i % e.length];
}

// Çok hızlı: sadece 3 ilham görseli (tarife birebir değil)
function galleryUrls(seed: string) {
  // picsum: hızlı ama alakasız olabilir → o yüzden "foodish" tercih ediyoruz
  // foodish görselleri hep yemek olur (burger gelebilir ama "ilham" dediğimiz için sorun değil)
  const n1 = (hash(seed) % 50) + 1;
  const n2 = (hash(seed + "x") % 50) + 1;
  const n3 = (hash(seed + "y") % 50) + 1;

  return [
    `https://foodish-api.com/images/pasta/pasta${n1}.jpg`,
    `https://foodish-api.com/images/rice/rice${n2}.jpg`,
    `https://foodish-api.com/images/biryani/biryani${n3}.jpg`,
  ];
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function RecipeCard({
  recipe,
  chefLine,
  onStart,
  onNewPhoto,
}: {
  recipe: Recipe;
  chefLine: string;
  onStart: () => void;
  onNewPhoto: () => void;
}) {
  const seed = recipe.title || recipe.id || "dish";
  const imgs = useMemo(() => galleryUrls(seed), [seed]);

  // reklam metni (dinamik, komik)
  const adText = useMemo(() => {
    const lines = [
      "Bugünün sponsoru: “BiberBank” — acıyı artır, lezzeti katla 🌶️",
      "Reklam: “YoğurtSoft” — her şeye yakışır, tartışılmaz 😄",
      "Sponsor: “TavaExpress” — 5 dakikada şakır şakır 🔥",
      "Reklam: “SoğanGözlük” — doğrar, ağlamazsın 😎",
    ];
    return lines[hash(seed) % lines.length];
  }, [seed]);

  const tags = (recipe.tags || []).slice(0, 2);

  return (
    <div className="overflow-hidden rounded-[28px] border bg-white shadow-sm">
      {/* ÜST: konuşma balonu (chef yok) */}
      <div className="bg-white p-4">
        <div className="rounded-[22px] bg-[#f3eadf] px-4 py-3">
          <div className="text-sm font-extrabold text-gray-900">Şak! Tarif hazır 🫰</div>
          <div className="mt-1 text-sm text-gray-800">{chefLine}</div>
        </div>
      </div>

      {/* REKLAM / SPONSOR BANNER */}
      <div className="px-4">
        <div className="rounded-[22px] border bg-white px-4 py-3">
          <div className="text-xs font-extrabold text-gray-500">REKLAM</div>
          <div className="text-sm font-semibold text-gray-900">{adText}</div>
          <div className="mt-1 text-xs text-gray-500">
            Not: Aşağıdaki görseller ilham amaçlıdır; tarifle birebir aynı olmayabilir.
          </div>
        </div>
      </div>

      {/* HIZLI GÖRSEL GALERİ (3 küçük) */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          {imgs.map((src, i) => (
            <div key={i} className="aspect-[4/3] overflow-hidden rounded-2xl bg-gray-200">
              <img
                src={src}
                alt="İlham görseli"
                className="h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // hata olursa basit placeholder
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* TARİF KARTI */}
      <div className="px-4 pb-4">
        <div className="rounded-[26px] bg-white">
          <div className="text-2xl font-extrabold">{recipe.title}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Pill>⏱️ {recipe.timeMin} dk</Pill>
            {tags[0] ? <Pill>🏷️ {tags[0]}</Pill> : null}
            {typeof recipe.calories === "number" ? <Pill>🔥 {recipe.calories}k</Pill> : null}
          </div>

          <div className="mt-3 text-sm text-gray-700">
            <span className="font-semibold">Reason:</span> {recipe.why}
          </div>

          <div className="mt-4">
            <div className="text-sm font-extrabold">Sağab!</div>
            <ul className="mt-2 space-y-2 text-sm text-gray-800">
              {recipe.steps.slice(0, 6).map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-5">{stepEmoji(i)}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={onStart} className="rounded-2xl bg-black py-3 text-white font-extrabold">
              Başla!
            </button>
            <button onClick={onNewPhoto} className="rounded-2xl bg-gray-100 py-3 text-gray-800 font-extrabold">
              Yeni foto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}