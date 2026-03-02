"use client";

import React, { useMemo, useRef, useState } from "react";
import ChefBubble from "@/components/ChefBubble";
import RecipeCard, { Recipe } from "@/components/RecipeCard";

type Stage = "upload" | "preview" | "scanning" | "result" | "cook";

export default function FridgeChefApp() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [stage, setStage] = useState<Stage>("upload");
  const [chefText, setChefText] = useState(
    "Merhaba! Dolabının fotoğrafını yükle, sana bugün ne yapacağını söyleyeyim."
  );
  const [chefMood, setChefMood] = useState<
    "happy" | "thinking" | "excited" | "warning"
  >("happy");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [best, setBest] = useState<Recipe | null>(null);

  const cookingSteps = useMemo(() => best?.steps ?? [], [best]);

  const pickFile = (f: File) => {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setStage("preview");
    setChefMood("thinking");
    setChefText("Güzel! Şimdi analiz edeyim…");
  };

  const analyze = async () => {
    if (!file) return;
    setStage("scanning");
    setChefMood("thinking");
    setChefText("Dolabını tarıyorum… Malzemeleri buluyorum…");

    const fd = new FormData();
    fd.append("image", file);

    const res = await fetch("/api/analyze", { method: "POST", body: fd });
    if (!res.ok) {
      setChefMood("warning");
      setChefText("Bir hata oldu. Tekrar dener misin?");
      setStage("preview");
      return;
    }

    const data = await res.json();
    setIngredients(data.ingredients ?? []);
    setBest(data.best ?? null);

    setChefMood("excited");
    setChefText(data.chefLine ?? "Buldum! Sana en iyi seçeneği getirdim ✨");
    setStage("result");
  };

  const reset = () => {
    setStage("upload");
    setFile(null);
    setIngredients([]);
    setBest(null);
    setChefMood("happy");
    setChefText("Yeni foto yükle, yeni öneri çıkaralım 😄");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold">🍳 FridgeChef</div>
          <div className="text-sm text-gray-500">
            Upload → AI Chef → Recipe → Cook
          </div>
        </div>

        <ChefBubble mood={chefMood} text={chefText} />

        {/* UPLOAD */}
        {stage === "upload" && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
            <div className="h-56 rounded-xl bg-gray-200 flex items-center justify-center">
              📷 Buzdolabı fotoğrafı
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl bg-black py-3 text-white"
            >
              Fotoğraf yükle
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
              }}
            />
          </div>
        )}

        {/* PREVIEW */}
        {stage === "preview" && previewUrl && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
            <img
              src={previewUrl}
              alt="preview"
              className="h-56 w-full rounded-xl object-cover"
            />

            <div className="flex gap-2">
              <button
                onClick={analyze}
                className="flex-1 rounded-xl bg-black py-3 text-white"
              >
                Analiz et
              </button>
              <button
                onClick={reset}
                className="rounded-xl bg-gray-200 px-4 py-3"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* SCANNING */}
        {stage === "scanning" && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm text-center space-y-3">
            <div className="text-lg font-semibold">🤖 Analiz ediliyor…</div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-full w-3/4 animate-pulse bg-black" />
            </div>
            <div className="text-sm text-gray-500">
              2–3 saniye içinde sonuç gelecek.
            </div>
          </div>
        )}

        {/* RESULT */}
        {stage === "result" && best && (
          <div className="space-y-4">
            <RecipeCard recipe={best} onStart={() => setStage("cook")} />

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="font-semibold mb-2">🥕 Algılanan malzemeler</div>
              <div className="flex flex-wrap gap-2">
                {ingredients.map((i) => (
                  <span
                    key={i}
                    className="rounded-full bg-gray-200 px-3 py-1 text-sm"
                  >
                    {i}
                  </span>
                ))}
              </div>

              <button
                onClick={reset}
                className="mt-4 w-full rounded-xl bg-gray-200 py-3"
              >
                Tekrar tara
              </button>
            </div>
          </div>
        )}

        {/* COOK */}
        {stage === "cook" && best && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
            <div className="text-lg font-bold">{best.title}</div>
            <div className="text-sm text-gray-500">Adım adım pişirme</div>

            <div className="space-y-2">
              {cookingSteps.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border bg-white p-3"
                >
                  <div className="text-xs text-gray-500">Adım {idx + 1}</div>
                  <div className="text-sm font-medium">{s}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStage("result")}
              className="w-full rounded-xl bg-gray-200 py-3"
            >
              Geri
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
