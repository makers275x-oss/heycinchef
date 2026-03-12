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

function aiLine(screen: Screen) {
  const map: Record<Screen, string[]> = {
    home: [
      "Hoş geldin 😄 Foto ver, büyüyü başlatalım.",
      "Cin burada… dolabı konuşturacağım 😎",
      "Hadi canım… Tarif mi kokteyl mi? 😏",
    ],
    recipe: [
      "Tarif modundayız. Foto yükle, gerisini bana bırak 😎",
      "Malzeme varsa çözüm var 😄",
      "Dolabı tara… ben şefliği hallederim 🧞",
    ],
    cocktail: [
      "Bar açıldı 😎 Şişeleri göster.",
      "Barmen cin hazır 🧞",
      "Etiketi tara… oranı ben ayarlarım 😏",
    ],
  };
  const arr = map[screen];
  return arr[Math.floor(Math.random() * arr.length)];
}

const glassPanel =
  "rounded-[28px] border border-white/50 bg-white/88 backdrop-blur-md shadow-[0_10px_32px_rgba(15,23,42,0.12)]";
const glassPanelSoft =
  "rounded-[24px] border border-white/45 bg-white/84 backdrop-blur-md shadow-[0_8px_24px_rgba(15,23,42,0.10)]";

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
      className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-[15px] font-medium text-[#111827] outline-none placeholder:text-slate-400 focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
    />
  );
});

const ManualPanel = React.memo(function ManualPanel(props: {
  placeholder: string;
  screen: Screen;
  manualItems: string[];
  manualInput: string;
  setManualInput: (v: string) => void;
  addManual: () => void;
  removeManual: (it: string) => void;
}) {
  return (
    <div className={`mt-4 p-4 ${glassPanelSoft}`}>
      <div className="flex items-center justify-between">
        <div className="text-base font-black text-[#111827]">Manual ekle</div>
        <div className="text-xs font-bold text-slate-600">{props.manualItems.length}/12</div>
      </div>

      <div className="mt-3 flex gap-2">
        <ManualInput
          value={props.manualInput}
          onChange={props.setManualInput}
          onEnter={props.addManual}
          placeholder={props.placeholder}
        />

        <button
          type="button"
          onClick={props.addManual}
          className="rounded-2xl bg-black px-4 py-3 font-extrabold text-white shadow-sm transition active:scale-[0.98]"
        >
          Ekle
        </button>
      </div>

      <div className="mt-2 text-xs font-semibold text-slate-600">
        İpucu:{" "}
        {props.screen === "cocktail" ? (
          <>“buz, limon, soda” gibi virgülle tek seferde ekleyebilirsin.</>
        ) : (
          <>“marul, elma” gibi virgülle tek seferde ekleyebilirsin.</>
        )}
      </div>

      {props.manualItems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {props.manualItems.map((it) => (
            <button
              type="button"
              key={it}
              onClick={() => props.removeManual(it)}
              className="rounded-full border border-black/10 bg-slate-50 px-3 py-1.5 text-sm font-bold text-[#1f2937] shadow-sm"
            >
              {it} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

function ChefCin({
  mode,
  bubble,
  screen,
  cinAction,
  onClick,
  onFast,
  onFit,
  onNew,
}: {
  mode: "idle" | "scan" | "cook" | "talk";
  bubble: string;
  screen: Screen;
  cinAction: "fast" | "fit" | "new" | null;
  onClick?: () => void;
  onFast?: () => void;
  onFit?: () => void;
  onNew?: () => void;
}) {
  const fastLabel = screen === "cocktail" ? "Pratik" : "Hızlı";
  const fitLabel = screen === "cocktail" ? "Uzun içim" : "Fit";

  const fastActive = cinAction === "fast";
  const fitActive = cinAction === "fit";
  const newActive = cinAction === "new";

  const hint = screen === "cocktail" ? "Karışım stili" : "Tarif stili";

  const btnBase = "rounded-full text-[11px] px-3 py-1.5 border transition-all font-extrabold";
  const btnOn = "bg-black text-white border-black";
  const btnOff = "bg-white border-black/20 text-black";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      className="select-none cursor-pointer"
      aria-label="Chef Cin"
    >
      <div className="pointer-events-auto mb-2 mr-0 ml-auto w-[230px] sm:w-[290px] rounded-[22px] border border-white/50 bg-white/92 px-3 py-3 text-sm font-bold text-[#111827] shadow-[0_12px_35px_rgba(0,0,0,0.16)] backdrop-blur-md">
        <div className="line-clamp-2 text-[13px] sm:text-sm">{bubble || "Hazırım 😎"}</div>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFast?.();
            }}
            className={`${btnBase} ${fastActive ? btnOn : btnOff}`}
            title={screen === "cocktail" ? "Daha kolay karışım" : "Daha kısa tarif"}
          >
            ⚡ {fastLabel} {fastActive ? "✓" : ""}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFit?.();
            }}
            className={`${btnBase} ${fitActive ? btnOn : btnOff}`}
            title={screen === "cocktail" ? "Uzun içim / ferah" : "Daha hafif tarif"}
          >
            🧊 {fitLabel} {fitActive ? "✓" : ""}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNew?.();
            }}
            className={`${btnBase} ${newActive ? btnOn : btnOff}`}
            title="Farklı öneri"
          >
            🎲 Yeni {newActive ? "✓" : ""}
          </button>
        </div>

        <div className="mt-2 text-[11px] font-semibold text-slate-600">{hint}</div>
      </div>

      <svg width="118" height="150" viewBox="0 0 150 170" className="ml-auto drop-shadow-xl sm:h-[190px] sm:w-[150px]">
        <ellipse cx="78" cy="160" rx="42" ry="9" fill="rgba(0,0,0,0.15)" />

        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; 0 -7; 0 0"
            dur="2.4s"
            repeatCount="indefinite"
          />

          <path
            d="M78 140 C55 145, 52 125, 62 115 C48 105, 58 92, 72 98 C72 82, 96 82, 96 98 C112 90, 120 106, 104 116 C116 126, 104 148, 78 140 Z"
            fill="#3BA7FF"
            opacity="0.92"
          />
          <path
            d="M52 120 C46 92, 58 64, 78 62 C98 64, 110 92, 104 120 C95 140, 61 140, 52 120 Z"
            fill="#1E90FF"
          />

          <circle cx="78" cy="78" r="28" fill="#7CC7FF" />
          <circle cx="70" cy="76" r="4" fill="#0B1B2B" />
          <circle cx="90" cy="76" r="4" fill="#0B1B2B" />

          {mode === "talk" ? (
            <path d="M88 108 Q96 116 104 108" stroke="#0B1B2B" strokeWidth="3" strokeLinecap="round" />
          ) : mode === "cook" ? (
            <path d="M88 108 Q96 112 104 108" stroke="#0B1B2B" strokeWidth="3" strokeLinecap="round" />
          ) : (
            <path d="M88 108 Q96 110 104 108" stroke="#0B1B2B" strokeWidth="3" strokeLinecap="round" />
          )}

          <path
            d="M60 52 C58 40, 66 34, 74 38 C76 30, 88 30, 90 38 C98 34, 106 40, 104 52 C92 58, 72 58, 60 52 Z"
            fill="#FFFFFF"
            stroke="rgba(0,0,0,0.15)"
          />
          <rect x="62" y="50" width="44" height="10" rx="5" fill="#F3F3F3" stroke="rgba(0,0,0,0.12)" />

          {mode === "scan" && (
            <g>
              <circle cx="118" cy="92" r="12" stroke="#0B1B2B" strokeWidth="4" fill="rgba(255,255,255,0.35)" />
              <path d="M126 100 L138 112" stroke="#0B1B2B" strokeWidth="5" strokeLinecap="round" />
            </g>
          )}
          {mode === "cook" && (
            <g>
              <path d="M118 88 C110 86, 110 98, 118 96" stroke="#0B1B2B" strokeWidth="4" strokeLinecap="round" />
              <path d="M118 96 L140 118" stroke="#0B1B2B" strokeWidth="5" strokeLinecap="round" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

export default function FridgeChefApp() {
  const [screen, setScreen] = useState<Screen>("home");

  const [homeTitle] = useState("Lamba hazır...");
  const [homeSubtitle] = useState("Cin Asistan burada 😄");
  const [homeLine] = useState("Tarif mi, kokteyl mi? Foto çek, ben büyüyü yapayım 👀");

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  const [isScanning, setIsScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [visionFood, setVisionFood] = useState<VisionFoodItem[]>([]);
  const [visionDrinks, setVisionDrinks] = useState<VisionDrinkItem[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const [manualItems, setManualItems] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [tryIndex, setTryIndex] = useState(0);

  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);
  const [cocktail, setCocktail] = useState<CocktailResponse | null>(null);
  const [alcoholLevel, setAlcoholLevel] = useState<AlcoholLevel>("orta");

  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");

  const [ttsMode, setTtsMode] = useState<"off" | "steps">("off");
  const [stepIndex, setStepIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [lastSpokenText, setLastSpokenText] = useState<string>("");

  const [cinAction, setCinAction] = useState<"fast" | "fit" | "new" | null>(null);

  const lastSpokenScreenRef = useRef<Screen | null>(null);
  const idleTimerRef = useRef<any>(null);

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

  function pickMaleVoice(list: SpeechSynthesisVoice[]) {
    const tr = list.filter((v) => (v.lang || "").toLowerCase().startsWith("tr"));
    const pool = tr.length ? tr : list;

    const maleHints = ["male", "man", "erkek", "tolga", "mehmet", "ali", "kemal", "mert"];
    return (
      pool.find((v) => maleHints.some((h) => v.name.toLowerCase().includes(h))) ||
      pool.find((v) => maleHints.some((h) => (v.voiceURI || "").toLowerCase().includes(h))) ||
      pool[0] ||
      null
    );
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
    if (!synth) {
      setLastSpokenText(stripEmojisForTTS(text));
      return;
    }
    if (interrupt) synth.cancel();

    const clean = stripEmojisForTTS(text);
    if (!clean.trim()) return;

    setLastSpokenText(clean);

    const u = new SpeechSynthesisUtterance(clean);
    const v = (voiceURI ? voices.find((x) => x.voiceURI === voiceURI) : null) || pickMaleVoice(voices);
    if (v) u.voice = v;

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
    const v = (voiceURI ? voices.find((x) => x.voiceURI === voiceURI) : null) || pickMaleVoice(voices);
    if (v) u.voice = v;

    setLastSpokenText(stripEmojisForTTS(text));

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

  useEffect(() => {
    const synth = ensureSynth();
    if (!synth) return;

    const load = () => {
      const list = synth.getVoices() || [];
      setVoices(list);
    };

    load();
    synth.onvoiceschanged = load;

    return () => {
      // @ts-ignore
      synth.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (!voices.length) return;
    const v = pickMaleVoice(voices);
    if (v) setVoiceURI(v.voiceURI);
  }, [voices]);

  useEffect(() => {
    if (lastSpokenScreenRef.current === screen) return;
    lastSpokenScreenRef.current = screen;

    setTimeout(() => {
      speak(aiLine(screen), true);
    }, 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, voices.length]);

  function resetIdleTimer() {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      if (isScanning || isGenerating) return;

      const idleLines =
        screen === "home"
          ? ["Bir şeye tıklasana 😄", "Tarif mi kokteyl mi? Ben buradayım 😎", "Hadi canım… büyü bekliyor 😏"]
          : screen === "recipe"
          ? ["Foto yükle de tarif patlatalım 😄", "Dolap sessiz… sen konuş 😎", "Bir hamle yap, ben şefim 🧞"]
          : ["Etiketi tara… barmen cin bekliyor 😎", "Bir şey karıştıralım mı? 😏", "Hadi canım… bar hazır 🧞"];

      speak(idleLines[Math.floor(Math.random() * idleLines.length)], true);
    }, 12000);
  }

  useEffect(() => {
    const events: Array<keyof WindowEventMap> = ["mousemove", "click", "touchstart", "keydown", "scroll"];
    const handler = () => resetIdleTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetIdleTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [screen, isScanning, isGenerating]);

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
    setImageFile(null);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    if (fileRef.current) fileRef.current.value = "";
    resetIdleTimer();
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

    resetIdleTimer();
    speak(file ? "Foto geldi 😎 Tara butonuna bas." : "Foto yok… seçelim 😄");
  }

  function toggleSelected(name: string) {
    const n = normalize(name);
    setSelectedNames((prev) =>
      prev.some((x) => normalize(x) === n) ? prev.filter((x) => normalize(x) !== n) : [...prev, n]
    );
    resetIdleTimer();
  }

  function addManual() {
    let raw = String(manualInput || "").trim();

    raw = raw
      .replace(/^örn[:\s-]*/i, "")
      .replace(/\(.*?\)/g, "")
      .replace(/^ipucu[:\s-]*/i, "")
      .trim();

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
    resetIdleTimer();
    speak("Manual eklendi 😎");
  }

  function removeManual(it: string) {
    const v = normalize(it);
    setManualItems((prev) => prev.filter((x) => normalize(x) !== v));
    setSelectedNames((prev) => prev.filter((x) => normalize(x) !== v));
    resetIdleTimer();
  }

  async function scanImage() {
    setError("");
    setRecipe(null);
    setCocktail(null);
    stopSpeaking();

    if (!imageFile) {
      setError("Önce fotoğraf seç 🧞");
      speak("Foto yok… önce seçelim 😄");
      return;
    }

    const type = screen === "cocktail" ? "drinks" : "food";

    setIsScanning(true);
    resetIdleTimer();
    speak(type === "food" ? "Dolabı tarıyorum… 👀" : "Etiketi okuyorum… 👀");

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
        speak(list.length ? `Buldum: ${list.map((x) => x.name).join(", ")} 😎` : "Bir şey göremedim… daha net çek 😅");
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
        speak(list.length ? "Etiketleri okudum. Bar hazır 😎" : "Etiket okunmuyor… daha net çek ya da manuel ekle 😄");
      }

      setScanDone(true);
      setTryIndex(0);
      resetIdleTimer();
    } catch (e: any) {
      setError(e?.message || "Tarama hatası");
      speak("Tarama patladı… bi daha dene 😅");
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
      speak("Ürün seçmeden tarif olmaz 😄");
      return;
    }

    const v = typeof nextTry === "number" ? nextTry : tryIndex;

    setIsGenerating(true);
    resetIdleTimer();
    speak("Tarif yazıyorum… şef modu 😎");

    try {
      const res = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: finalItems, variation: v }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setRecipe(data);
      setTtsMode("off");
      setStepIndex(0);
      speak("Tarif hazır. Beğenmezsen yeni öner bas 😏");
    } catch (e: any) {
      setError(e?.message || "Tarif üretilemedi");
      speak("Tarif çıkmadı… bir daha deneriz 😅");
    } finally {
      setIsGenerating(false);
      resetIdleTimer();
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
      setError("Tek başına içkiyle karışım zor 🧞‍♂️ Manual ekle: buz + limon + soda/tonik/kola.");
      speak("Karışım için en az 1 mixer lazım: buz + limon + soda/tonik 😄");
      return;
    }

    const v = typeof nextTry === "number" ? nextTry : tryIndex;

    setIsGenerating(true);
    resetIdleTimer();
    speak("Karışım ayarlıyorum… barmen mod 😎");

    try {
      const res = await fetch("/api/cocktail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          alcoholLevel,
          variation: v,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setCocktail(data);
      setTtsMode("off");
      setStepIndex(0);
      speak("Karışım hazır. Beğenmezsen yeni öner bas 😏");
    } catch (e: any) {
      setError(e?.message || "Kokteyl üretilemedi");
      speak("Kokteyl çıkmadı… bi daha deneriz 😅");
    } finally {
      setIsGenerating(false);
      resetIdleTimer();
    }
  }

  function actionFast() {
    setCinAction("fast");
    setTimeout(() => setCinAction(null), 1400);

    speak(screen === "cocktail" ? "Pratik mod 😎 Daha kolay karışım." : "Hız moduna aldım 😎 Daha kısa tarif.");

    const next = tryIndex + 11;
    setTryIndex(next);
    resetIdleTimer();

    setTimeout(() => {
      if (screen === "recipe") generateRecipe(next);
      else if (screen === "cocktail") generateCocktail(next);
    }, 350);
  }

  function actionFit() {
    setCinAction("fit");
    setTimeout(() => setCinAction(null), 1400);

    speak(screen === "cocktail" ? "Uzun içim 🧊 Daha ferah karışım." : "Fit mod 🥗 Daha hafif tarif.");

    const next = tryIndex + 22;
    setTryIndex(next);
    resetIdleTimer();

    setTimeout(() => {
      if (screen === "recipe") generateRecipe(next);
      else if (screen === "cocktail") generateCocktail(next);
    }, 350);
  }

  function actionNew() {
    setCinAction("new");
    setTimeout(() => setCinAction(null), 1400);

    speak("Yeni fikir geliyor 🎲");

    const next = tryIndex + 1;
    setTryIndex(next);
    resetIdleTimer();

    setTimeout(() => {
      if (screen === "recipe") generateRecipe(next);
      else if (screen === "cocktail") generateCocktail(next);
    }, 350);
  }

  const PageHeader = ({ title }: { title: string }) => (
    <div className="flex items-start justify-between gap-3">
      <div className="text-[24px] font-black tracking-tight text-[#111827]">{title}</div>
      <button
        onClick={goHome}
        className="rounded-2xl border border-black/15 bg-white/95 px-3 py-2 text-sm font-extrabold text-[#111827] shadow-sm"
      >
        Ana Sayfa
      </button>
    </div>
  );

  const VoicePanel = () => {
    const trVoices = voices.filter((v) => /tr|turkish/i.test(v.lang) || /turk/i.test(v.name));
    const list = trVoices.length ? trVoices : voices;

    return (
      <div className={`mt-4 p-4 ${glassPanelSoft}`}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-black text-[#111827]">Ses (Erkek)</div>
          <button
            onClick={() => {
              resetIdleTimer();
              speak("Ben hazırım. Devam de yeter 😄");
            }}
            className="rounded-2xl bg-black px-3 py-2 text-xs font-extrabold text-white"
          >
            Konuş
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <select
            value={voiceURI}
            onChange={(e) => setVoiceURI(e.target.value)}
            className="w-full rounded-2xl border border-black/15 bg-white px-3 py-2 text-sm font-bold text-[#111827]"
          >
            {voices.length === 0 ? (
              <option value="">Ses yükleniyor…</option>
            ) : (
              list.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} - {v.lang}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={stopSpeaking}
            className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm font-extrabold text-[#111827]"
          >
            Sus
          </button>
        </div>

        {!canTTS && <div className="mt-2 text-xs font-semibold text-slate-600">Tarayıcı TTS desteklemiyor olabilir.</div>}
      </div>
    );
  };

  const PremiumPanel = () => (
    <div className="mt-4 rounded-[24px] border border-amber-200/70 bg-gradient-to-br from-amber-50/95 to-white/95 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-black text-[#111827]">Premium Okuma</div>
        <div className="text-xs font-extrabold text-slate-700">
          {safeSteps.length ? `${stepIndex + 1}/${safeSteps.length}` : "0/0"}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={startPremium} className="rounded-2xl bg-black px-3 py-3 text-sm font-black text-white">
          Başla (Satır Satır)
        </button>
        <button
          onClick={stopSpeaking}
          className="rounded-2xl border border-black/15 bg-white px-3 py-3 text-sm font-extrabold text-[#111827]"
        >
          Sus
        </button>

        <button
          onClick={() => speakStepAt(stepIndex - 1)}
          disabled={!safeSteps.length}
          className="rounded-2xl border border-black/15 bg-white px-3 py-3 text-sm font-extrabold text-[#111827] disabled:opacity-40"
        >
          ⟵ Geri
        </button>
        <button
          onClick={() => speakStepAt(stepIndex + 1)}
          disabled={!safeSteps.length}
          className="rounded-2xl border border-black/15 bg-white px-3 py-3 text-sm font-extrabold text-[#111827] disabled:opacity-40"
        >
          İleri ⟶
        </button>

        <button
          onClick={() => (isPaused ? resumeTTS() : pauseTTS())}
          disabled={!isSpeaking}
          className="col-span-2 rounded-2xl border border-black/15 bg-white px-3 py-3 text-sm font-extrabold text-[#111827] disabled:opacity-40"
        >
          {isPaused ? "Devam" : "Duraklat"}
        </button>
      </div>
    </div>
  );

  const UploadPanel = ({ label, scanLabel }: { label: string; scanLabel: string }) => (
    <>
      <div className={`mt-4 p-5 text-center ${glassPanelSoft}`}>
        <div className="text-sm font-black text-[#111827]">{label}</div>
        {imagePreviewUrl ? (
          <img
            src={imagePreviewUrl}
            className="mt-4 w-full rounded-3xl border border-black/10 object-cover"
            alt="preview"
          />
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed border-black/10 bg-white/70 px-4 py-10 text-sm font-semibold text-slate-600">
            Foto seçince önizleme burada görünür.
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
        className="mt-4 w-full rounded-2xl bg-black px-4 py-4 text-lg font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition active:scale-[0.98]"
      >
        Fotoğraf seç
      </button>

      <button
        onClick={scanImage}
        disabled={!imageFile || isScanning}
        className="mt-3 w-full rounded-2xl border border-black/15 bg-white/95 px-4 py-4 text-base font-black text-[#111827] shadow-sm disabled:opacity-40"
      >
        {isScanning ? "Taranıyor…" : scanLabel}
      </button>
    </>
  );

  function renderFoundItems() {
    if (screen === "recipe") {
      return (
        <div className={`mt-5 p-4 ${glassPanelSoft}`}>
          <div className="text-base font-black text-[#111827]">Bulunan ürünler</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {visionFood.map((it) => {
              const checked = selectedNames.includes(normalize(it.name));
              return (
                <label
                  key={it.name}
                  className="flex items-center gap-2 rounded-2xl border border-black/10 bg-slate-50/95 px-3 py-2.5 text-sm font-bold text-[#111827]"
                >
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
      <div className={`mt-5 p-4 ${glassPanelSoft}`}>
        <div className="text-base font-black text-[#111827]">Bulunan içkiler</div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {visionDrinks.map((it, idx) => {
            const key = `${it.name}-${idx}`;
            const checked = selectedNames.includes(normalize(it.name));
            return (
              <label
                key={key}
                className="flex items-center gap-2 rounded-2xl border border-black/10 bg-slate-50/95 px-3 py-2.5 text-sm"
              >
                <input type="checkbox" checked={checked} onChange={() => toggleSelected(it.name)} />
                <div className="min-w-0">
                  <div className="truncate font-black text-[#111827]">{it.name}</div>
                  <div className="truncate text-xs font-semibold text-slate-700">
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
      <div className={`mt-5 p-5 ${glassPanel}`}>
        <div className="text-[22px] font-black tracking-tight text-[#111827]">{data.title}</div>
        <div className="mt-2 text-[15px] font-semibold leading-6 text-slate-700">{data.summary}</div>

        <PremiumPanel />

        <div className="mt-5 text-sm font-black text-[#111827]">Malzemeler</div>
        <ul className="mt-2 list-disc pl-5 text-sm font-semibold leading-6 text-slate-800">
          {(data.ingredients || []).map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>

        <div className="mt-5 text-sm font-black text-[#111827]">Adımlar</div>
        <ol className="mt-2 list-decimal pl-5 text-sm font-semibold leading-6 text-slate-800">
          {safeSteps.map((x, i) => {
            const active = ttsMode === "steps" && i === stepIndex;
            return (
              <li
                key={i}
                className={
                  "mt-2 rounded-xl px-2 py-1.5 transition " +
                  (active ? "bg-black text-white shadow-sm" : "bg-transparent")
                }
              >
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
          className="mt-4 w-full rounded-2xl border border-black/15 bg-slate-100 px-4 py-3 text-sm font-black text-[#111827]"
        >
          😤 Beğenmedim → yeni öner
        </button>
      </div>
    );
  }

  const chefMode: "idle" | "scan" | "cook" | "talk" =
    isScanning ? "scan" : isGenerating ? "cook" : isSpeaking ? "talk" : "idle";

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/genie-bg.png')",
        }}
      />

      <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />

      <div className="relative mx-auto w-full max-w-md px-4 pt-6 pb-[260px] sm:pb-[220px]">
        <div className="rounded-[34px] border border-amber-200/70 bg-[#fff8ee]/95 p-5 shadow-[0_18px_40px_rgba(245,158,11,0.18)] backdrop-blur-sm">
          <div className="text-[26px] font-black tracking-tight text-[#111827]">{homeTitle}</div>
          <div className="mt-1 text-[17px] font-black text-[#1f2937]">{homeSubtitle}</div>
          <div className="mt-2 text-[15px] font-semibold leading-7 text-slate-700">{homeLine}</div>
        </div>

        {screen === "home" && (
          <div className="mt-5 grid gap-4">
            <button
              onClick={() => {
                resetAll();
                setScreen("recipe");
              }}
              className="w-full rounded-[32px] bg-black p-5 text-left text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] transition active:scale-[0.98]"
            >
              <div className="text-[22px] font-black tracking-tight">Tarif</div>
              <div className="mt-2 text-[15px] font-semibold text-white/85">Dolap foto → tara → seç → tarif</div>
            </button>

            <button
              onClick={() => {
                resetAll();
                setScreen("cocktail");
              }}
              className="w-full rounded-[32px] border border-white/40 bg-white/95 p-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm transition active:scale-[0.98]"
            >
              <div className="text-[22px] font-black tracking-tight text-[#111827]">Kokteyl</div>
              <div className="mt-2 text-[15px] font-semibold text-slate-700">Şişe foto → tara → seç → karışım</div>
            </button>
          </div>
        )}

        {screen !== "home" && (
          <div className={`mt-4 p-5 ${glassPanel}`}>
            <PageHeader title={screen === "recipe" ? "Tarif" : "Kokteyl"} />
            <VoicePanel />

            {screen === "cocktail" && (
              <div className={`mt-4 p-4 ${glassPanelSoft}`}>
                <div className="text-sm font-black text-[#111827]">Güç seviyesi</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["hafif", "orta", "sert"] as AlcoholLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => {
                        resetIdleTimer();
                        setAlcoholLevel(lvl);
                        speak(`Tamam 😎 Güç: ${lvl}`);
                      }}
                      className={
                        "rounded-2xl px-3 py-2.5 text-sm font-black border transition " +
                        (alcoholLevel === lvl
                          ? "bg-black text-white border-black shadow-sm"
                          : "bg-white text-[#111827] border-black/10")
                      }
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <UploadPanel
              label={screen === "recipe" ? "Buzdolabı fotoğrafı yükle" : "Şişe / bardak fotoğrafı yükle"}
              scanLabel={screen === "recipe" ? "🧊 Buzdolabını tara" : "🍸 Şişeleri tara (etiket okuma)"}
            />

            {scanDone && (
              <>
                {renderFoundItems()}

                <ManualPanel
                  screen={screen}
                  placeholder={screen === "recipe" ? "Örn: marul, elma (virgülle)" : "Örn: buz, limon, soda (virgülle)"}
                  manualItems={manualItems}
                  manualInput={manualInput}
                  setManualInput={setManualInput}
                  addManual={addManual}
                  removeManual={removeManual}
                />

                <button
                  onClick={() => {
                    resetIdleTimer();
                    if (screen === "recipe") generateRecipe();
                    else generateCocktail();
                  }}
                  disabled={isGenerating}
                  className="mt-5 w-full rounded-2xl bg-black px-4 py-4 text-lg font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition active:scale-[0.98] disabled:opacity-40"
                >
                  {isGenerating ? "Hazırlanıyor…" : screen === "recipe" ? "Seçilenlerle Tarif Yap" : "Seçilenlerle Karışım Yap"}
                </button>
              </>
            )}

            {renderResult()}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-xs font-bold text-slate-700">
          Cin Şef © — “Satır satır okurum, sen şaşırırsın.”
        </div>
      </div>

      <div className="fixed bottom-3 right-3 z-50 sm:bottom-6 sm:right-4">
        <ChefCin
          mode={chefMode}
          bubble={lastSpokenText}
          screen={screen}
          cinAction={cinAction}
          onClick={() => {
            resetIdleTimer();
            speak("Hadi canım… foto ver de büyüyü yapayım 😎");
          }}
          onFast={actionFast}
          onFit={actionFit}
          onNew={actionNew}
        />
      </div>
    </div>
  );
}