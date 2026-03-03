"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/** Manual input focus kaçmasın diye memo'lu input */
const ManualInput = React.memo(function ManualInput(props: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  placeholder: string;
}) {
  const ref = React.useRef<HTMLInputElement | null>(null);

  return (
    <input
      ref={ref}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          props.onEnter();
          setTimeout(() => ref.current?.focus(), 0);
        }
      }}
      placeholder={props.placeholder}
      className="w-full rounded-2xl border border-black/10 px-3 py-3 outline-none text-base"
    />
  );
});

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

/** ✅ ChefCin (tek dosya içinde)
 *  - Mobilde ortada, desktop'ta sol altta
 *  - Glow + hover animasyon (desktop) + active (mobil)
 */
function ChefCin(props: {
  bubble?: string;
  fastActive?: boolean;
  fitActive?: boolean;
  onFast?: () => void;
  onFit?: () => void;
  onClick?: () => void;
}) {
  const btnBase =
    "rounded-full text-[11px] px-3 py-1 border transition-all duration-200";
  const btnOn = "bg-black text-white border-black";
  const btnOff = "bg-white border-black/20 text-black";

  return (
    <div
      className="
        fixed z-50 select-none
        left-1/2 -translate-x-1/2
        bottom-[calc(env(safe-area-inset-bottom)+12px)]
        md:left-4 md:-translate-x-0 md:bottom-4
      "
    >
      {/* Bubble */}
      <div
        className="
          pointer-events-auto mb-2 mx-auto
          w-[92vw] max-w-[360px]
          md:w-auto md:mx-0 md:max-w-[320px]
          rounded-2xl border border-black/10 bg-white/95 px-3 py-2
          text-[13px] leading-snug shadow-sm text-black
          backdrop-blur
        "
      >
        {props.bubble || "Hazırım 👀"}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              props.onFast?.();
            }}
            className={`${btnBase} ${props.fastActive ? btnOn : btnOff}`}
          >
            ⚡ Hızlı
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              props.onFit?.();
            }}
            className={`${btnBase} ${props.fitActive ? btnOn : btnOff}`}
          >
            🧊 Fit
          </button>
        </div>
      </div>

      {/* Cin clickable area */}
      <div
        role="button"
        tabIndex={0}
        onClick={props.onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") props.onClick?.();
        }}
        className="
          cursor-pointer
          w-[150px] md:w-[220px]
          scale-95 md:scale-100 origin-bottom
          transition-transform duration-200
          hover:scale-[1.03] active:scale-[0.98]
        "
      >
        {/* Glow layer */}
        <div
          className="
            relative
            rounded-[32px]
            transition-all duration-300
            hover:drop-shadow-[0_0_22px_rgba(0,0,0,0.25)]
            active:drop-shadow-[0_0_18px_rgba(0,0,0,0.20)]
          "
        >
          {/* SVG */}
          <svg viewBox="0 0 200 200" className="w-full h-auto">
            {/* ===========================
               YOUR SVG HERE
               (width/height varsa KALDIR)
               =========================== */}

            {/* Placeholder basit maskot: */}
            <circle cx="100" cy="105" r="70" fill="#2dd4bf" opacity="0.95" />
            <circle cx="75" cy="95" r="10" fill="#0f172a" />
            <circle cx="125" cy="95" r="10" fill="#0f172a" />
            <path
              d="M70 125 C85 145, 115 145, 130 125"
              stroke="#0f172a"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M55 70 C85 40, 115 40, 145 70"
              stroke="#ffffff"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M60 70 C80 88, 120 88, 140 70"
              stroke="#ffffff"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function FridgeChefApp() {
  const [screen, setScreen] = useState<Screen>("home");

  // hero text
  const [homeTitle] = useState("Lamba hazır…");
  const [homeSubtitle] = useState("Cin Asistan burada 😄");
  const [homeLine] = useState("Tarif mi, kokteyl mi? Foto çek, ben büyüyü yapayım 👀");

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

  // “Tarif = Fit” dediğin için: cocktail yerine “uzun içim” ekranını da kokteyl olarak tutuyoruz
  const [fastMode, setFastMode] = useState(false);
  const [fitMode, setFitMode] = useState(false);
  const [alcoholLevel, setAlcoholLevel] = useState<AlcoholLevel>("orta");

  // TTS
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");

  const [ttsMode, setTtsMode] = useState<"off" | "steps">("off");
  const [stepIndex, setStepIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const canTTS = typeof window !== "undefined" && "speechSynthesis" in window;

  const finalItems = useMemo(() => {
    const all = [...selectedNames, ...manualItems].map(normalize).filter(Boolean);
    return Array.from(new Set(all));
  }, [selectedNames, manualItems]);

  const safeSteps = useMemo(() => {
    const steps = screen === "cocktail" ? cocktail?.steps : recipe?.steps;
    return (Array.isArray(steps) ? steps : []).map((x) => String(x || "").trim()).filter(Boolean);
  }, [screen, recipe, cocktail]);

  function ensureSynth() {
    if (typeof window === "undefined") return null;
    // @ts-ignore
    return window.speechSynthesis || null;
  }

  function stopSpeaking() {
    const synth = ensureSynth();
    if (!synth) return;
    synth.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setTtsMode("off");
    setStepIndex(0);
    utterRef.current = null;
  }

  function speak(text: string, interrupt = true) {
    const synth = ensureSynth();
    if (!synth) return;
    if (interrupt) synth.cancel();

    const clean = stripEmojisForTTS(text);
    if (!clean.trim()) return;

    const u = new SpeechSynthesisUtterance(clean);

    // sadece erkek sesi kalsın dediğin için:
    // Türkçe voice yoksa ilk voice seçer
    const tr = voices.filter((v) => /tr|turkish/i.test(v.lang) || /turk/i.test(v.name));
    const pool = tr.length ? tr : voices;
    const maleHints = ["male", "erkek", "man", "mehmet", "ali", "kemal", "mert", "tolga"];
    const picked =
      pool.find((v) => v.voiceURI === voiceURI) ||
      pool.find((v) => maleHints.some((h) => v.name.toLowerCase().includes(h))) ||
      pool[0] ||
      null;

    if (picked) u.voice = picked;

    u.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    u.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterRef.current = u;
    setIsSpeaking(true);
    setIsPaused(false);
    synth.speak(u);
  }

  function pauseTTS() {
    const synth = ensureSynth();
    if (!synth) return;
    if (!synth.speaking) return;
    synth.pause();
    setIsPaused(true);
  }

  function resumeTTS() {
    const synth = ensureSynth();
    if (!synth) return;
    synth.resume();
    setIsPaused(false);
  }

  function speakStepAt(i: number) {
    const steps = safeSteps;
    if (!steps.length) {
      speak("Adım yok. Önce üretelim 😄");
      return;
    }

    const idx = Math.max(0, Math.min(i, steps.length - 1));
    setStepIndex(idx);
    setTtsMode("steps");

    const synth = ensureSynth();
    if (!synth) return;
    synth.cancel();

    const text = `Adım ${idx + 1}. ${steps[idx]}`;
    const u = new SpeechSynthesisUtterance(stripEmojisForTTS(text));

    const tr = voices.filter((v) => /tr|turkish/i.test(v.lang) || /turk/i.test(v.name));
    const pool = tr.length ? tr : voices;
    const maleHints = ["male", "erkek", "man", "mehmet", "ali", "kemal", "mert", "tolga"];
    const picked =
      pool.find((v) => v.voiceURI === voiceURI) ||
      pool.find((v) => maleHints.some((h) => v.name.toLowerCase().includes(h))) ||
      pool[0] ||
      null;

    if (picked) u.voice = picked;

    u.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      const next = idx + 1;
      if (next < steps.length) setTimeout(() => speakStepAt(next), 250);
      else setTtsMode("off");
    };
    u.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setTtsMode("off");
    };

    utterRef.current = u;
    setIsSpeaking(true);
    setIsPaused(false);
    synth.speak(u);
  }

  function startPremium() {
    if (!safeSteps.length) {
      speak("Önce tarif/karışım üret 😄");
      return;
    }
    speak("Premium okuma başlıyor. Satır satır 😎");
    setTimeout(() => speakStepAt(0), 600);
  }

  // ✅ Voices yükleme: (erkek seçici otomatik)
  useEffect(() => {
    const synth = ensureSynth();
    if (!synth) return;

    const load = () => {
      const list = synth.getVoices() || [];
      setVoices(list);

      // voiceURI boşsa erkek/Türkçe seçmeye çalış
      if (!voiceURI && list.length) {
        const tr = list.filter((v) => /tr|turkish/i.test(v.lang) || /turk/i.test(v.name));
        const pool = tr.length ? tr : list;
        const maleHints = ["male", "erkek", "man", "mehmet", "ali", "kemal", "mert", "tolga"];
        const picked =
          pool.find((v) => maleHints.some((h) => v.name.toLowerCase().includes(h))) ||
          pool[0] ||
          null;
        if (picked) setVoiceURI(picked.voiceURI);
      }
    };

    load();
    synth.onvoiceschanged = load;
    return () => {
      // @ts-ignore
      synth.onvoiceschanged = null;
    };
  }, [voiceURI]);

  // ✅ Açılışta konuşsun (tek sefer)
  useEffect(() => {
    if (screen !== "home") return;
    const t = setTimeout(() => {
      speak("Hoş geldin! Dolabı göster, ben de şeflik yapayım 😎", true);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  function resetAll() {
    stopSpeaking();
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
    stopSpeaking();

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
      prev.some((x) => normalize(x) === n) ? prev.filter((x) => normalize(x) !== n) : [...prev, n]
    );
  }

  function addManual() {
    let raw = String(manualInput || "").trim();
    raw = raw.replace(/^örn[:\s-]*/i, "").replace(/\(.*?\)/g, "").replace(/^ipucu[:\s-]*/i, "").trim();
    if (!raw) return;

    const parts = raw
      .split(/[,;\n]+/g)
      .map((x) => normalize(x))
      .filter((x) => x && !/^örn$/i.test(x) && !/^ipucu$/i.test(x));

    if (!parts.length) return;

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
    stopSpeaking();

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
          .map((x: any) => ({ name: normalize(x?.name), confidence: Number(x?.confidence ?? 0) }))
          .filter((x: any) => x.name);

        setVisionFood(list);
        setSelectedNames(list.map((x) => x.name));
        speak(list.length ? `Buldum: ${list.map((x) => x.name).join(", ")}.` : "Dolap sessiz… 😅");
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
        speak(list.length ? `Etiketleri okudum. Bar hazır 😎` : "Etiket okunmuyor. Daha net çek ya da manuel ekle 😄");
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
    stopSpeaking();

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
      setTtsMode("off");
      setStepIndex(0);
      speak("Tarif hazır. Beğenmezsen yeni öner bas 😏");
    } catch (e: any) {
      setError(e?.message || "Tarif üretilemedi");
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateCocktail(nextTry?: number) {
    setError("");
    setCocktail(null);
    stopSpeaking();

    const selectedDrinkObjects = visionDrinks
      .filter((d) => selectedNames.includes(normalize(d.name)))
      .map((d) => ({ name: d.name, category: d.category }));

    const manualAsObjects = manualItems.map((m) => ({ name: m, category: "" }));
    const payloadItems = [...selectedDrinkObjects, ...manualAsObjects].filter((x) => x.name);

    const mixerCats = ["tonik", "soda", "kola", "ginger_ale", "limon", "lime", "nane", "buz"];
    const mixerCount = payloadItems.filter(
      (x) => mixerCats.includes((x.category || "").toLowerCase()) || mixerCats.includes(normalize(x.name))
    ).length;

    if (payloadItems.length < 2 || mixerCount === 0) {
      setError("Uzun içim için mixer şart 🧞‍♂️ Manual ekle: buz + limon + soda/tonik/kola.");
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
      setTtsMode("off");
      setStepIndex(0);
      speak("Uzun içim hazır. Beğenmezsen yeni öner bas 😏");
    } catch (e: any) {
      setError(e?.message || "Karışım üretilemedi");
    } finally {
      setIsGenerating(false);
    }
  }

  // ----- UI bits -----
  const PageHeader = ({ title }: { title: string }) => (
    <div className="flex items-start justify-between gap-3">
      <div className="text-xl font-extrabold">{title}</div>
      <button onClick={goHome} className="rounded-2xl border border-black/10 px-3 py-2 text-sm">
        Ana Sayfa
      </button>
    </div>
  );

  const VoicePanel = () => (
    <div className="mt-4 rounded-3xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold">Ses</div>
        <button
          onClick={() => speak("Ben buradayım. Dolabı göster de iş başlayalım 😄")}
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
            voices
              .filter((v) => /tr|turkish/i.test(v.lang) || /turk/i.test(v.name) || voices.length < 6)
              .map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))
          )}
        </select>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={stopSpeaking}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold"
        >
          Sus
        </button>
      </div>

      {!canTTS && <div className="mt-2 text-xs text-black/50">Tarayıcı TTS desteklemiyor olabilir.</div>}
    </div>
  );

  const PremiumPanel = () => (
    <div className="mt-4 rounded-3xl border border-black/10 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold">Premium Okuma</div>
        <div className="text-xs text-black/60">{safeSteps.length ? `${stepIndex + 1}/${safeSteps.length}` : "0/0"}</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={startPremium} className="rounded-2xl bg-black px-3 py-3 text-sm font-semibold text-white">
          Başla
        </button>
        <button onClick={stopSpeaking} className="rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm font-semibold">
          Sus
        </button>

        <button
          onClick={() => speakStepAt(stepIndex - 1)}
          disabled={!safeSteps.length}
          className="rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm font-semibold disabled:opacity-40"
        >
          ⟵ Geri
        </button>
        <button
          onClick={() => speakStepAt(stepIndex + 1)}
          disabled={!safeSteps.length}
          className="rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm font-semibold disabled:opacity-40"
        >
          İleri ⟶
        </button>

        <button
          onClick={() => (isPaused ? resumeTTS() : pauseTTS())}
          disabled={!isSpeaking}
          className="col-span-2 rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm font-semibold disabled:opacity-40"
        >
          {isPaused ? "Devam" : "Duraklat"}
        </button>
      </div>
    </div>
  );

  const UploadPanel = ({ label, scanLabel }: { label: string; scanLabel: string }) => (
    <>
      <div className="mt-4 rounded-3xl bg-gray-100 p-6 text-center border border-black/5">
        <div className="text-sm font-semibold">{label}</div>
        {imagePreviewUrl ? (
          <img src={imagePreviewUrl} className="mt-4 w-full rounded-3xl border border-black/10 object-cover" alt="preview" />
        ) : (
          <div className="mt-4 text-xs text-black/50">Foto seçince önizleme gelir.</div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />

      <button onClick={() => fileRef.current?.click()} className="mt-4 w-full rounded-2xl bg-black px-4 py-4 text-white text-lg font-extrabold">
        Fotoğraf seç
      </button>

      <button
        onClick={scanImage}
        disabled={!imageFile || isScanning}
        className="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-base font-bold disabled:opacity-40"
      >
        {isScanning ? "Taranıyor…" : scanLabel}
      </button>
    </>
  );

  const ManualPanel = ({ placeholder }: { placeholder: string }) => (
    <div className="mt-4 rounded-3xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-base font-extrabold">Manual ekle</div>
        <div className="text-xs text-black/50">{manualItems.length}/12</div>
      </div>

      <div className="mt-3 flex gap-2">
        <ManualInput value={manualInput} onChange={setManualInput} onEnter={addManual} placeholder={placeholder} />
        <button onClick={addManual} className="rounded-2xl bg-black px-4 py-2 text-white font-semibold">
          Ekle
        </button>
      </div>

      <div className="mt-2 text-xs text-black/50">
        {screen === "recipe" ? "İpucu: “marul, elma” gibi virgülle tek seferde ekleyebilirsin." : "İpucu: “buz, limon, soda” gibi virgülle tek seferde ekleyebilirsin."}
      </div>

      {manualItems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {manualItems.map((it) => (
            <button key={it} onClick={() => removeManual(it)} className="rounded-full border border-black/10 bg-gray-50 px-3 py-1 text-sm">
              {it} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );

  function renderFoundItems() {
    if (screen === "recipe") {
      return (
        <div className="mt-5 rounded-3xl border border-black/10 bg-white p-4">
          <div className="text-base font-extrabold">Bulunan ürünler</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {visionFood.map((it) => {
              const checked = selectedNames.includes(normalize(it.name));
              return (
                <label key={it.name} className="flex items-center gap-2 rounded-2xl border border-black/10 px-3 py-2 text-sm">
                  <input type="checkbox" checked={checked} onChange={() => toggleSelected(it.name)} />
                  <span className="truncate">{it.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-5 rounded-3xl border border-black/10 bg-white p-4">
        <div className="text-base font-extrabold">Bulunan içkiler</div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {visionDrinks.map((it, idx) => {
            const key = `${it.name}-${idx}`;
            const checked = selectedNames.includes(normalize(it.name));
            return (
              <label key={key} className="flex items-center gap-2 rounded-2xl border border-black/10 px-3 py-2 text-sm">
                <input type="checkbox" checked={checked} onChange={() => toggleSelected(it.name)} />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{it.name}</div>
                  <div className="truncate text-xs text-black/60">
                    kategori: {it.category || "?"} • conf: {(it.confidence ?? 0).toFixed(2)}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  function renderResult() {
    const data = screen === "cocktail" ? cocktail : recipe;
    if (!data) return null;

    return (
      <div className="mt-5 rounded-3xl border border-black/10 bg-white p-4">
        <div className="text-lg font-extrabold">{data.title}</div>
        <div className="mt-1 text-sm text-black/70">{data.summary}</div>

        <PremiumPanel />

        <div className="mt-4 text-sm font-bold">Malzemeler</div>
        <ul className="mt-2 list-disc pl-5 text-sm text-black/80">
          {(data.ingredients || []).map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>

        <div className="mt-4 text-sm font-bold">Adımlar</div>
        <ol className="mt-2 list-decimal pl-5 text-sm text-black/80">
          {safeSteps.map((x, i) => {
            const active = ttsMode === "steps" && i === stepIndex;
            return (
              <li key={i} className={"mt-1 rounded-xl px-2 py-1 " + (active ? "bg-black text-white" : "bg-transparent")}>
                {x}
              </li>
            );
          })}
        </ol>

        <button
          onClick={() => {
            const next = tryIndex + 1;
            setTryIndex(next);
            if (screen === "cocktail") generateCocktail(next);
            else generateRecipe(next);
          }}
          className="mt-3 w-full rounded-2xl border border-black/10 bg-gray-100 px-4 py-3 text-sm font-semibold"
        >
          😤 Beğenmedim → yeni öner
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ChefCin overlay */}
      <ChefCin
        bubble={
          screen === "home"
            ? "Hoş geldin! Foto çek, ben hallederim 😎"
            : screen === "recipe"
            ? "Fit tarif mi? Seç → tara → yap!"
            : "Uzun içim mi? Etiketi tara 😄"
        }
        fastActive={fastMode}
        fitActive={fitMode}
        onFast={() => {
          setFastMode((p) => !p);
          speak(!fastMode ? "Tamam. Hızlı mod!" : "Hızlı mod kapandı.");
        }}
        onFit={() => {
          setFitMode((p) => !p);
          speak(!fitMode ? "Fit mod açıldı." : "Fit mod kapandı.");
        }}
        onClick={() => {
          // Her sayfada konuşsun
          if (screen === "home") speak("Hoş geldin! Dolabı göster de büyüyü yapalım 😄");
          else if (screen === "recipe") speak("Ürünleri seç, sonra tarif çıkaralım 😎");
          else speak("Etiketi net çek, uzun içim hazırlayayım 😏");
        }}
      />

      <div className="mx-auto w-full max-w-md px-4 py-5">
        <div className="rounded-3xl bg-[#f5eee4] p-5 shadow-sm border border-black/5">
          <div className="text-2xl font-extrabold">{homeTitle}</div>
          <div className="mt-1 text-sm text-black/70">{homeSubtitle}</div>
          <div className="mt-2 text-sm text-black/60">{homeLine}</div>
        </div>

        {screen === "home" && (
          <div className="mt-4 grid gap-3">
            <button
              onClick={() => {
                resetAll();
                setScreen("recipe");
                setTimeout(() => speak("Fit tarif sayfasına geldik. Fotoğrafı seç, tara! 😎"), 200);
              }}
              className="w-full rounded-3xl bg-black p-5 text-left text-white shadow-sm"
            >
              <div className="text-xl font-extrabold">Tarif (Fit)</div>
              <div className="mt-1 text-sm text-white/80">Dolap foto → tara → seç → fit tarif</div>
            </button>

            <button
              onClick={() => {
                resetAll();
                setScreen("cocktail");
                setTimeout(() => speak("Uzun içim zamanı. Şişeleri tara, karışımı kurarım 😄"), 200);
              }}
              className="w-full rounded-3xl border border-black/10 bg-white p-5 text-left shadow-sm"
            >
              <div className="text-xl font-extrabold">Kokteyl (Uzun İçim)</div>
              <div className="mt-1 text-sm text-black/60">Şişe foto → tara → seç → uzun içim</div>
            </button>
          </div>
        )}

        {screen !== "home" && (
          <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm border border-black/5">
            <PageHeader title={screen === "recipe" ? "Tarif (Fit)" : "Kokteyl (Uzun İçim)"} />
            <VoicePanel />

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
                        (alcoholLevel === lvl ? "bg-black text-white border-black" : "bg-white border-black/10")
                      }
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <UploadPanel
              label={screen === "recipe" ? "Buzdolabı fotoğrafı yükle" : "Şişe/bardak fotoğrafı yükle"}
              scanLabel={screen === "recipe" ? "🧊 Buzdolabını tara" : "🍸 Şişeleri tara (etiket okuma)"}
            />

            {scanDone && (
              <>
                {renderFoundItems()}
                <ManualPanel
                  placeholder={screen === "recipe" ? "Örn: marul, elma (virgülle)" : "Örn: buz, limon, soda (virgülle)"}
                />

                <button
                  onClick={() => (screen === "recipe" ? generateRecipe() : generateCocktail())}
                  disabled={isGenerating}
                  className="mt-5 w-full rounded-2xl bg-black px-4 py-4 text-white text-lg font-extrabold disabled:opacity-40"
                >
                  {isGenerating ? "Hazırlanıyor…" : screen === "recipe" ? "Seçilenlerle Fit Tarif Yap" : "Seçilenlerle Uzun İçim Yap"}
                </button>
              </>
            )}

            {renderResult()}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-500">Cin Şef © — “Satır satır okurum, sen şaşırırsın.” 🧞</div>
      </div>
    </div>
  );
}