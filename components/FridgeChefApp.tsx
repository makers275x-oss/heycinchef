"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Screen = "home" | "recipe" | "cocktail";
type AlcoholLevel = "hafif" | "orta" | "sert";

type VisionFoodItem = { name: string; confidence?: number };
type VisionDrinkItem = { name: string; category?: string; confidence?: number };

type RecipeResponse = {
  title: string;
  summary: string;
  ingredients: string[];
  steps: string[];
};

type CocktailResponse = {
  title: string;
  summary: string;
  ingredients: string[];
  steps: string[];
  tips?: string[];
};

function normalize(s: string) {
  return String(s || "").trim().toLowerCase();
}

function stripEmojisForTTS(text: string) {
  return String(text || "").replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "");
}

/** ✅ Tek dosyada komik/yaratıcı Cin:
 * - HER ZAMAN sol-alt sabit (sayfanın ortasına çıkmaz)
 * - Float + blink + hover wiggle + glow
 * - Bubble üstte, butonlar bubble içinde
 */
function ChefCin(props: {
  bubble?: string;
  fastActive?: boolean;
  fitActive?: boolean;
  onFast?: () => void;
  onFit?: () => void;
  onClick?: () => void;
  screen?: Screen;
}) {
  const btnBase =
    "rounded-full text-[11px] px-3 py-1 border transition-all duration-200";
  const btnOn = "bg-black text-white border-black";
  const btnOff = "bg-white border-black/20 text-black";

  // Bubble metni ekrana göre komikleşsin
  const bubbleText =
    props.bubble ||
    (props.screen === "home"
      ? "Cin Asistan burada 😄\nTarif mi kokteyl mi? Büyüyü ben yapayım 👀"
      : props.screen === "recipe"
      ? "Fit tarif mi? Dolabı göster 🧊😎"
      : "Uzun içim mi? Etiketi tara 😄🍸");

  return (
    <div className="cinDock">
      {/* Bubble */}
      <div className="cinBubble pointer-events-auto">
        <div className="whitespace-pre-line">{bubbleText}</div>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              props.onFast?.();
            }}
            className={`${btnBase} ${props.fastActive ? btnOn : btnOff}`}
          >
            ⚡ Hızlı {props.fastActive ? "✓" : ""}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              props.onFit?.();
            }}
            className={`${btnBase} ${props.fitActive ? btnOn : btnOff}`}
          >
            🧊 Fit {props.fitActive ? "✓" : ""}
          </button>
        </div>
      </div>

      {/* Cin */}
      <button
        type="button"
        aria-label="Cin"
        onClick={(e) => {
          e.stopPropagation();
          props.onClick?.();
        }}
        className="cinBtn pointer-events-auto"
      >
        <div className="cinGlow" />
        <svg viewBox="0 0 220 220" className="cinSvg">
          {/* =========================
             COMIC CIN SVG
             Buraya senin eski (komik) SVG path'lerini koyabilirsin.
             width/height yazma, sadece <path> <circle> vs.
             ========================= */}

          {/* Komik placeholder: */}
          <g className="cinFloat">
            {/* gövde */}
            <path
              d="M60 140c0-42 25-78 50-78s50 36 50 78c0 28-18 50-50 50s-50-22-50-50z"
              fill="#2dd4bf"
            />
            {/* yüz */}
            <circle cx="95" cy="120" r="10" fill="#0f172a" />
            <circle cx="135" cy="120" r="10" fill="#0f172a" />
            <path
              d="M92 148c16 16 44 16 60 0"
              stroke="#0f172a"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
            {/* şapka */}
            <path
              d="M70 85c25-35 55-35 80 0"
              stroke="#fff"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
              opacity="0.95"
            />
            <path
              d="M75 86c20 18 55 18 70 0"
              stroke="#fff"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
              opacity="0.75"
            />
            {/* göz kırpma layer */}
            <path
              className="cinBlink"
              d="M85 120h20"
              stroke="#0f172a"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </svg>
      </button>

      {/* Tek dosyada global CSS */}
      <style jsx global>{`
        /* === Cin sabitleme: her ekranda sol-alt === */
        .cinDock {
          position: fixed;
          left: 14px;
          bottom: calc(env(safe-area-inset-bottom) + 14px);
          z-index: 60;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          user-select: none;
        }

        /* Bubble: mobilde taşmasın diye max genişlik */
        .cinBubble {
          max-width: min(86vw, 360px);
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 18px;
          padding: 10px 12px;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(10px);
          font-size: 13px;
          line-height: 1.2rem;
        }

        /* Cin buton alanı */
        .cinBtn {
          position: relative;
          width: 130px;
          height: 130px;
          border-radius: 28px;
          border: 0;
          background: transparent;
          padding: 0;
          cursor: pointer;
          transform-origin: bottom left;
          -webkit-tap-highlight-color: transparent;
        }

        /* SVG boy */
        .cinSvg {
          width: 130px;
          height: 130px;
          display: block;
          filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.12));
        }

        /* Glow layer */
        .cinGlow {
          position: absolute;
          inset: -10px;
          border-radius: 36px;
          background: radial-gradient(
            circle at 40% 35%,
            rgba(45, 212, 191, 0.55),
            rgba(45, 212, 191, 0) 60%
          );
          opacity: 0.35;
          transition: opacity 220ms ease, transform 220ms ease;
          pointer-events: none;
        }

        /* Float animasyonu (komik) */
        .cinFloat {
          animation: cinFloat 2.9s ease-in-out infinite;
          transform-origin: 50% 90%;
        }

        @keyframes cinFloat {
          0% {
            transform: translateY(0px) rotate(-0.6deg);
          }
          50% {
            transform: translateY(-6px) rotate(0.6deg);
          }
          100% {
            transform: translateY(0px) rotate(-0.6deg);
          }
        }

        /* Blink (göz kırpma) */
        .cinBlink {
          opacity: 0;
          animation: cinBlink 4.2s infinite;
        }

        @keyframes cinBlink {
          0%,
          88%,
          100% {
            opacity: 0;
          }
          90%,
          92% {
            opacity: 1;
          }
        }

        /* Hover: daha komik + glow */
        .cinBtn:hover .cinGlow {
          opacity: 0.8;
          transform: scale(1.02);
        }

        .cinBtn:hover .cinSvg {
          animation: cinWiggle 0.55s ease-in-out;
        }

        @keyframes cinWiggle {
          0% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(-4deg) scale(1.02);
          }
          55% {
            transform: rotate(4deg) scale(1.03);
          }
          100% {
            transform: rotate(0deg) scale(1);
          }
        }

        /* Mobile tap: hover yok, active ile aynı his */
        .cinBtn:active .cinGlow {
          opacity: 0.9;
          transform: scale(0.98);
        }

        .cinBtn:active .cinSvg {
          transform: scale(0.98);
        }

        /* küçük ekranlarda cin biraz küçülsün */
        @media (max-width: 380px) {
          .cinBtn,
          .cinSvg {
            width: 115px;
            height: 115px;
          }
        }
      `}</style>
    </div>
  );
}

export default function FridgeChefApp() {
  const [screen, setScreen] = useState<Screen>("home");

  // hero
  const [homeTitle] = useState("Lamba hazır…");

  // file
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  // vision results
  const [isScanning, setIsScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [visionFood, setVisionFood] = useState<VisionFoodItem[]>([]);
  const [visionDrinks, setVisionDrinks] = useState<VisionDrinkItem[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  // manual
  const [manualItems, setManualItems] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");

  // generate
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [tryIndex, setTryIndex] = useState(0);

  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);
  const [cocktail, setCocktail] = useState<CocktailResponse | null>(null);

  const [fastMode, setFastMode] = useState(false);
  const [fitMode, setFitMode] = useState(false);
  const [alcoholLevel, setAlcoholLevel] = useState<AlcoholLevel>("orta");

  // TTS
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const canTTS = typeof window !== "undefined" && "speechSynthesis" in window;

  function ensureSynth() {
    if (typeof window === "undefined") return null;
    // @ts-ignore
    return window.speechSynthesis || null;
  }

  function speak(text: string) {
    const synth = ensureSynth();
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(stripEmojisForTTS(text));
    const list = synth.getVoices() || [];
    const picked = list.find((v) => v.voiceURI === voiceURI) || list[0];
    if (picked) u.voice = picked;
    synth.speak(u);
  }

  useEffect(() => {
    const synth = ensureSynth();
    if (!synth) return;

    const load = () => {
      const list = synth.getVoices() || [];
      setVoices(list);
      if (!voiceURI && list.length) setVoiceURI(list[0].voiceURI);
    };
    load();
    synth.onvoiceschanged = load;
    return () => {
      // @ts-ignore
      synth.onvoiceschanged = null;
    };
  }, [voiceURI]);

  const finalItems = useMemo(() => {
    const all = [...selectedNames, ...manualItems].map(normalize).filter(Boolean);
    return Array.from(new Set(all));
  }, [selectedNames, manualItems]);

  function resetAll() {
    setError("");
    setIsScanning(false);
    setScanDone(false);
    setVisionFood([]);
    setVisionDrinks([]);
    setSelectedNames([]);
    setManualItems([]);
    setManualInput("");
    setIsGenerating(false);
    setTryIndex(0);
    setRecipe(null);
    setCocktail(null);
    setAlcoholLevel("orta");
    setFastMode(false);
    setFitMode(false);
    setImageFile(null);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  function goHome() {
    resetAll();
    setScreen("home");
  }

  function onPickFile(file: File | null) {
    setError("");
    setRecipe(null);
    setCocktail(null);

    setScanDone(false);
    setVisionFood([]);
    setVisionDrinks([]);
    setSelectedNames([]);
    setManualItems([]);
    setManualInput("");
    setTryIndex(0);

    setImageFile(file);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : "";
    });
  }

  function toggleSelected(name: string) {
    const n = normalize(name);
    setSelectedNames((prev) =>
      prev.some((x) => normalize(x) === n)
        ? prev.filter((x) => normalize(x) !== n)
        : [...prev, n]
    );
  }

  function addManual() {
    const raw = String(manualInput || "").trim();
    if (!raw) return;
    const parts = raw
      .split(/[,;\n]+/g)
      .map((x) => normalize(x))
      .filter(Boolean);

    setManualItems((prev) => {
      const set = new Set(prev.map(normalize));
      const out = [...prev];
      for (const p of parts) {
        if (out.length >= 12) break;
        if (!set.has(p)) {
          out.push(p);
          set.add(p);
        }
      }
      return out;
    });

    setSelectedNames((prev) => {
      const set = new Set(prev.map(normalize));
      const out = [...prev];
      for (const p of parts) {
        if (!set.has(p)) {
          out.push(p);
          set.add(p);
        }
      }
      return out;
    });

    setManualInput("");
  }

  function removeManual(it: string) {
    const v = normalize(it);
    setManualItems((prev) => prev.filter((x) => normalize(x) !== v));
    setSelectedNames((prev) => prev.filter((x) => normalize(x) !== v));
  }

  async function scanImage() {
    setError("");
    setRecipe(null);
    setCocktail(null);

    if (!imageFile) {
      setError("Önce fotoğraf seç 🧞");
      return;
    }

    const type = screen === "cocktail" ? "drinks" : "food";

    setIsScanning(true);
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      fd.append("type", type);

      const res = await fetch("/api/vision", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const items = Array.isArray(data?.items) ? data.items : [];

      if (type === "food") {
        const list: VisionFoodItem[] = items
          .map((x: any) => ({
            name: normalize(x?.name),
            confidence: Number(x?.confidence ?? 0),
          }))
          .filter((x: any) => x.name);

        setVisionFood(list);
        setSelectedNames(list.map((x) => x.name));
      } else {
        const list: VisionDrinkItem[] = items
          .map((x: any) => ({
            name: String(x?.name || "").trim(),
            category: String(x?.category || "").trim(),
            confidence: Number(x?.confidence ?? 0),
          }))
          .filter((x: any) => x.name);

        setVisionDrinks(list);
        setSelectedNames(list.map((x) => normalize(x.name)));
      }

      setScanDone(true);
      setTryIndex(0);
    } catch (e: any) {
      setError(e?.message || "Tarama hatası");
    } finally {
      setIsScanning(false);
    }
  }

  async function generateRecipe(nextTry?: number) {
    setError("");
    setRecipe(null);

    if (!finalItems.length) {
      setError("En az 1 ürün seç 🧞");
      return;
    }

    const v = typeof nextTry === "number" ? nextTry : tryIndex;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: finalItems,
          variation: v,
          mode: fitMode ? "fit" : "normal",
          speed: fastMode ? "fast" : "normal",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRecipe(data);
    } catch (e: any) {
      setError(e?.message || "Tarif üretilemedi");
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateCocktail(nextTry?: number) {
    setError("");
    setCocktail(null);

    const selectedDrinkObjects = visionDrinks
      .filter((d) => selectedNames.includes(normalize(d.name)))
      .map((d) => ({ name: d.name, category: d.category }));

    const manualAsObjects = manualItems.map((m) => ({ name: m, category: "" }));
    const payloadItems = [...selectedDrinkObjects, ...manualAsObjects].filter(
      (x) => x.name
    );

    if (payloadItems.length < 2) {
      setError("Uzun içim için en az 2 malzeme seç 🧞‍♂️ (1 alkol + 1 mixer)");
      return;
    }

    const v = typeof nextTry === "number" ? nextTry : tryIndex;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/cocktail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          alcoholLevel,
          variation: v,
          style: "uzun_icim",
          speed: fastMode ? "fast" : "normal",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCocktail(data);
    } catch (e: any) {
      setError(e?.message || "Karışım üretilemedi");
    } finally {
      setIsGenerating(false);
    }
  }

  const data = screen === "cocktail" ? cocktail : recipe;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cin her ekranda sol-alt */}
      <ChefCin
        screen={screen}
        fastActive={fastMode}
        fitActive={fitMode}
        onFast={() => {
          setFastMode((p) => !p);
          speak(!fastMode ? "Hızlı mod! Şipşak 😎" : "Hızlı modu kapattım.");
        }}
        onFit={() => {
          setFitMode((p) => !p);
          speak(!fitMode ? "Fit mod açıldı. Hafif takılalım 😄" : "Fit mod kapalı.");
        }}
        onClick={() => {
          if (screen === "home") speak("Hoş geldin! Dolabı göster, büyüyü yapayım 😄");
          else if (screen === "recipe") speak("Seç, tara, sonra fit tarifi patlatayım 😎");
          else speak("Uzun içim mi? Etiketi tara da karışımı kurayım 😏");
        }}
      />

      <div className="mx-auto w-full max-w-md px-4 py-5">
        <div className="rounded-3xl bg-[#f5eee4] p-5 shadow-sm border border-black/5">
          <div className="text-2xl font-extrabold">{homeTitle}</div>
          <div className="mt-2 text-sm text-black/60">
            {screen === "home"
              ? "Tarif mi, kokteyl mi? Foto çek, cin işi halletsin 👀"
              : screen === "recipe"
              ? "Tarif (Fit)"
              : "Kokteyl (Uzun içim)"}
          </div>
        </div>

        {screen === "home" && (
          <div className="mt-4 grid gap-3">
            <button
              onClick={() => {
                resetAll();
                setScreen("recipe");
              }}
              className="w-full rounded-3xl bg-black p-5 text-left text-white shadow-sm"
            >
              <div className="text-xl font-extrabold">Tarif (Fit)</div>
              <div className="mt-1 text-sm text-white/80">
                Dolap foto → tara → seç → fit tarif
              </div>
            </button>

            <button
              onClick={() => {
                resetAll();
                setScreen("cocktail");
              }}
              className="w-full rounded-3xl border border-black/10 bg-white p-5 text-left shadow-sm"
            >
              <div className="text-xl font-extrabold">Kokteyl (Uzun İçim)</div>
              <div className="mt-1 text-sm text-black/60">
                Şişe foto → tara → seç → uzun içim
              </div>
            </button>
          </div>
        )}

        {screen !== "home" && (
          <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm border border-black/5">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xl font-extrabold">
                {screen === "recipe" ? "Tarif (Fit)" : "Kokteyl (Uzun İçim)"}
              </div>
              <button
                onClick={goHome}
                className="rounded-2xl border border-black/10 px-3 py-2 text-sm"
              >
                Ana Sayfa
              </button>
            </div>

            {/* Ses */}
            <div className="mt-4 rounded-3xl border border-black/10 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold">Ses</div>
                <button
                  onClick={() =>
                    speak(
                      screen === "recipe"
                        ? "Fit tarif için dolabı göster."
                        : "Uzun içim için etiketi tara."
                    )
                  }
                  className="rounded-2xl bg-black px-3 py-2 text-xs text-white"
                >
                  Konuş
                </button>
              </div>

              <div className="mt-3">
                <select
                  value={voiceURI}
                  onChange={(e) => setVoiceURI(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 px-3 py-2 text-sm"
                >
                  {voices.length === 0 ? (
                    <option value="">Ses yükleniyor…</option>
                  ) : (
                    voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {!canTTS && (
                <div className="mt-2 text-xs text-black/50">
                  Tarayıcı TTS desteklemiyor olabilir.
                </div>
              )}
            </div>

            {/* Alkol seviyesi */}
            {screen === "cocktail" && (
              <div className="mt-4 rounded-3xl border border-black/10 bg-white p-4">
                <div className="text-sm font-extrabold">Alkol seviyesi</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["hafif", "orta", "sert"] as AlcoholLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setAlcoholLevel(lvl)}
                      className={
                        "rounded-2xl px-3 py-2 text-sm font-semibold border " +
                        (alcoholLevel === lvl
                          ? "bg-black text-white border-black"
                          : "bg-white border-black/10")
                      }
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Upload */}
            <div className="mt-4 rounded-3xl bg-gray-100 p-6 text-center border border-black/5">
              <div className="text-sm font-semibold">
                {screen === "recipe"
                  ? "Buzdolabı fotoğrafı yükle"
                  : "Şişe/bardak fotoğrafı yükle"}
              </div>

              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  className="mt-4 w-full rounded-3xl border border-black/10 object-cover"
                  alt="preview"
                />
              ) : (
                <div className="mt-4 text-xs text-black/50">
                  Foto seçince önizleme gelir.
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />

            <button
              onClick={() => fileRef.current?.click()}
              className="mt-4 w-full rounded-2xl bg-black px-4 py-4 text-white text-lg font-extrabold"
            >
              Fotoğraf seç
            </button>

            <button
              onClick={scanImage}
              disabled={!imageFile || isScanning}
              className="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-base font-bold disabled:opacity-40"
            >
              {isScanning
                ? "Taranıyor…"
                : screen === "recipe"
                ? "🧊 Buzdolabını tara"
                : "🍸 Şişeleri tara (etiket okuma)"}
            </button>

            {/* Bulunanlar */}
            {scanDone && (
              <>
                <div className="mt-5 rounded-3xl border border-black/10 bg-white p-4">
                  <div className="text-base font-extrabold">
                    {screen === "recipe" ? "Bulunan ürünler" : "Bulunan içkiler"}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {(screen === "recipe" ? visionFood : visionDrinks).map(
                      (it: any, idx: number) => {
                        const name = screen === "recipe" ? it.name : it.name;
                        const checked = selectedNames.includes(normalize(name));
                        const key = `${name}-${idx}`;
                        return (
                          <label
                            key={key}
                            className="flex items-center gap-2 rounded-2xl border border-black/10 px-3 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelected(name)}
                            />
                            <div className="min-w-0">
                              <div className="truncate font-semibold">
                                {name}
                              </div>
                              {screen === "cocktail" && (
                                <div className="truncate text-xs text-black/60">
                                  kategori: {it.category || "?"}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Manual */}
                <div className="mt-4 rounded-3xl border border-black/10 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-extrabold">Manual ekle</div>
                    <div className="text-xs text-black/50">
                      {manualItems.length}/12
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addManual();
                        }
                      }}
                      placeholder={
                        screen === "recipe"
                          ? "Örn: marul, elma"
                          : "Örn: buz, limon, soda"
                      }
                      className="w-full rounded-2xl border border-black/10 px-3 py-3 outline-none text-base"
                    />
                    <button
                      onClick={addManual}
                      className="rounded-2xl bg-black px-4 py-2 text-white font-semibold"
                    >
                      Ekle
                    </button>
                  </div>

                  {manualItems.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {manualItems.map((it) => (
                        <button
                          key={it}
                          onClick={() => removeManual(it)}
                          className="rounded-full border border-black/10 bg-gray-50 px-3 py-1 text-sm"
                        >
                          {it} ✕
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Generate */}
                <button
                  onClick={() =>
                    screen === "recipe" ? generateRecipe() : generateCocktail()
                  }
                  disabled={isGenerating}
                  className="mt-5 w-full rounded-2xl bg-black px-4 py-4 text-white text-lg font-extrabold disabled:opacity-40"
                >
                  {isGenerating
                    ? "Hazırlanıyor…"
                    : screen === "recipe"
                    ? "Seçilenlerle Fit Tarif Yap"
                    : "Seçilenlerle Uzun İçim Yap"}
                </button>
              </>
            )}

            {/* Result */}
            {data && (
              <div className="mt-5 rounded-3xl border border-black/10 bg-white p-4">
                <div className="text-lg font-extrabold">{data.title}</div>
                <div className="mt-1 text-sm text-black/70">{data.summary}</div>

                <div className="mt-4 text-sm font-bold">Malzemeler</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-black/80">
                  {(data.ingredients || []).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>

                <div className="mt-4 text-sm font-bold">Adımlar</div>
                <ol className="mt-2 list-decimal pl-5 text-sm text-black/80">
                  {(data.steps || []).map((x, i) => (
                    <li key={i} className="mt-1">
                      {x}
                    </li>
                  ))}
                </ol>

                <button
                  onClick={() => {
                    const next = tryIndex + 1;
                    setTryIndex(next);
                    screen === "recipe"
                      ? generateRecipe(next)
                      : generateCocktail(next);
                  }}
                  className="mt-3 w-full rounded-2xl border border-black/10 bg-gray-100 px-4 py-3 text-sm font-semibold"
                >
                  😤 Beğenmedim → yeni öner
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-500">
          Cin Şef © — “Satır satır okurum, sen şaşırırsın.” 🧞
        </div>
      </div>
    </div>
  );
}