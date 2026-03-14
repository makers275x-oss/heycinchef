"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Screen = "home" | "recipe" | "cocktail";
type AlcoholLevel = "hafif" | "orta" | "sert";

type VisionFoodItem = { name: string; confidence?: number };
type VisionDrinkItem = { name: string; category?: string; confidence?: number };

type RecipeIngredient = {
  name: string;
  amount: number;
  unit: string;
};

type RecipeResponse = {
  title: string;
  summary: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  calories?: string;
  healthScore?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
  duration?: string;
  difficulty?: string;
};

type CocktailResponse = {
  title: string;
  summary: string;
  ingredients: string[];
  steps: string[];
  tips?: string[];
  strength?: string;
  score?: number;
  abv?: string;
  tasteProfile?: string;
  drinkingStyle?: string;
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

function getStepBadge(step: string, screen: Screen) {
  const s = String(step || "").toLowerCase();

  if (screen === "cocktail") {
    if (s.includes("buz")) return "🧊";
    if (s.includes("çalkala") || s.includes("shake")) return "🍸";
    if (s.includes("dök") || s.includes("bardağa")) return "🥃";
    if (s.includes("karıştır")) return "🥄";
    if (s.includes("limon") || s.includes("lime")) return "🍋";
    return "✨";
  }

  if (s.includes("doğra") || s.includes("kes")) return "🔪";
  if (s.includes("karıştır")) return "🥣";
  if (s.includes("kızart") || s.includes("sotele")) return "🔥";
  if (s.includes("haşla") || s.includes("kaynat")) return "♨️";
  if (s.includes("fırın") || s.includes("pişir")) return "🍳";
  if (s.includes("servis")) return "🍽️";
  return "✨";
}

function getStepComment(step: string, screen: Screen) {
  const s = String(step || "").toLowerCase();

  if (screen === "cocktail") {
    if (s.includes("buz")) return "Cin diyor: Soğuk olursa karizma artar.";
    if (s.includes("çalkala") || s.includes("shake")) return "Cin diyor: Bilekten çalış, artistlik serbest.";
    if (s.includes("dök")) return "Cin diyor: Taşırma, bardağın da gururu var.";
    if (s.includes("limon") || s.includes("lime")) return "Cin diyor: Ekşilik dengedir.";
    if (s.includes("karıştır")) return "Cin diyor: Yavaş ve havalı karıştır.";
    return "Cin diyor: Bu bardak birazdan efsane olacak.";
  }

  if (s.includes("doğra") || s.includes("kes")) return "Cin diyor: Parmaklar kalsın, sebze gitsin.";
  if (s.includes("karıştır")) return "Cin diyor: Şef gibi karıştır, panik yok.";
  if (s.includes("kızart") || s.includes("sotele")) return "Cin diyor: Yakma da efsane olsun.";
  if (s.includes("haşla") || s.includes("kaynat")) return "Cin diyor: Sabır da malzeme sayılır.";
  if (s.includes("fırın") || s.includes("pişir")) return "Cin diyor: Koku geldi mi iş tamam.";
  if (s.includes("servis")) return "Cin diyor: Şimdi biraz hava atabilirsin.";
  return "Cin diyor: Devam et, mutfakta büyü var.";
}

function GenieBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <img
        src="/genie-bg.png"
        alt="Genie background"
        className="h-full w-full object-cover object-center"
        draggable={false}
      />
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
    </div>
  );
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
          className="rounded-2xl bg-black px-4 py-3 font-extrabold text-white shadow-sm"
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
  bubble,
  screen,
  cinAction,
  onClick,
  onFast,
  onFit,
  onNew,
}: {
  bubble: string;
  screen: "home" | "recipe" | "cocktail";
  cinAction: "fast" | "fit" | "new" | null;
  onClick?: () => void;
  onFast?: () => void;
  onFit?: () => void;
  onNew?: () => void;
}) {
  const fastLabel = screen === "cocktail" ? "Pratik" : "Hızlı";
  const fitLabel = screen === "cocktail" ? "Uzun içim" : "Fit";

  const btnBase = "rounded-full text-[11px] px-3 py-1.5 border transition-all font-extrabold shadow-sm";
  const btnOn = "bg-black text-white border-black";
  const btnOff = "bg-white border-black/15 text-black";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className="select-none cursor-pointer"
      aria-label="Chef Cin"
    >
      <div className="pointer-events-auto mb-2 ml-auto w-[170px] sm:w-[300px] rounded-[20px] border border-white/55 bg-white/92 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-bold text-[#111827] shadow-[0_16px_38px_rgba(0,0,0,0.18)] backdrop-blur-md">
        <div className="truncate text-[12px] sm:text-sm">{bubble || "Hazırım 😄"}</div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFast?.();
            }}
            className={`${btnBase} ${cinAction === "fast" ? btnOn : btnOff}`}
          >
            ⚡ {fastLabel}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFit?.();
            }}
            className={`${btnBase} ${cinAction === "fit" ? btnOn : btnOff}`}
          >
            🧊 {fitLabel}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNew?.();
            }}
            className={`${btnBase} ${cinAction === "new" ? btnOn : btnOff}`}
          >
            🎲 Yeni
          </button>
        </div>

        <div className="mt-2 text-[11px] font-semibold text-slate-600">
          {screen === "cocktail" ? "Karışım stili" : "Tarif stili"}
        </div>
      </div>

      <div className="ml-auto flex items-end gap-3">
        <div className="relative h-[70px] w-[110px]">
          <div className="absolute bottom-0 left-0 h-[34px] w-[86px] rounded-[999px] bg-gradient-to-r from-amber-300 via-amber-400 to-amber-700 shadow-[0_8px_18px_rgba(0,0,0,0.18)]" />
          <div className="absolute bottom-[18px] left-[26px] h-[16px] w-[18px] rounded-full bg-amber-300 border border-amber-700" />
          <div className="absolute bottom-[24px] left-[31px] h-[18px] w-[8px] rounded-full bg-amber-500" />
          <div className="absolute bottom-[12px] left-[74px] h-[10px] w-[30px] rounded-r-full border-t-[5px] border-r-[5px] border-amber-800" />
          <div className="absolute bottom-[14px] left-[-8px] h-[12px] w-[22px] rounded-l-full border-b-[5px] border-l-[5px] border-amber-800" />
        </div>

        <div className="relative w-[130px]">
          <div className="mx-auto h-[18px] w-[70px] rounded-t-full bg-white" />
          <div className="mx-auto h-[12px] w-[78px] rounded-full bg-orange-300" />
          <div className="relative mx-auto mt-1 h-[68px] w-[68px] rounded-full bg-sky-400">
            <div className="absolute left-[14px] top-[22px] h-[18px] w-[14px] rounded-full bg-white" />
            <div className="absolute right-[14px] top-[22px] h-[18px] w-[14px] rounded-full bg-white" />
            <div className="absolute left-[17px] top-[25px] h-[11px] w-[9px] rounded-full bg-slate-900" />
            <div className="absolute right-[17px] top-[25px] h-[11px] w-[9px] rounded-full bg-slate-900" />
            <div className="absolute left-[19px] top-[27px] h-[3px] w-[3px] rounded-full bg-white" />
            <div className="absolute right-[19px] top-[27px] h-[3px] w-[3px] rounded-full bg-white" />
            <div className="absolute left-[26px] top-[46px] h-[4px] w-[16px] rounded-full border-b-2 border-slate-900" />
          </div>

          <div className="mx-auto -mt-1 h-[40px] w-[48px] rounded-t-[20px] rounded-b-[26px] bg-sky-500" />
          <div className="absolute left-[2px] top-[72px] h-[8px] w-[32px] rotate-[25deg] rounded-full bg-sky-500" />
          <div className="absolute right-[2px] top-[72px] h-[8px] w-[32px] rotate-[-25deg] rounded-full bg-sky-500" />
          <div className="absolute left-0 top-[68px] h-[16px] w-[16px] rounded-full bg-sky-500" />
          <div className="absolute right-0 top-[68px] h-[16px] w-[16px] rounded-full bg-sky-500" />
        </div>
      </div>
    </div>
  );
}

export default function FridgeChefApp() {
  const [screen, setScreen] = useState<Screen>("home");

  const [homeTitle] = useState("🪔 Cin Şef");
  const [homeSubtitle] = useState("Tarif hiç bu kadar eğlenceli olmamıştı.");
  const [homeLine] = useState("Dolabı ya da şişeleri göster. Cin sana tarif büyüsü yapsın.");

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
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [dishImageUrl, setDishImageUrl] = useState("");
  const [error, setError] = useState("");
  const [tryIndex, setTryIndex] = useState(0);

  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);
  const [cocktail, setCocktail] = useState<CocktailResponse | null>(null);
  const [alcoholLevel, setAlcoholLevel] = useState<AlcoholLevel>("orta");
  const [persons, setPersons] = useState(2);

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

  const scaledIngredients = useMemo(() => {
    return (recipe?.ingredients || []).map((i) => ({
      ...i,
      amount: Number((i.amount * persons).toFixed(2)),
    }));
  }, [recipe, persons]);

  const activeStepText = safeSteps[stepIndex] || safeSteps[0] || "";
  const activeStepBadge = getStepBadge(activeStepText, screen);
  const activeStepComment = getStepComment(activeStepText, screen);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

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

  async function generateDishImage(params: {
    mode: "recipe" | "cocktail";
    title: string;
    summary: string;
    ingredients: string[];
  }) {
    try {
      setIsImageGenerating(true);
      setDishImageUrl("");

      const res = await fetch("/api/dish-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setDishImageUrl(data?.imageUrl || "");
    } catch (err) {
      console.error("Görsel üretilemedi:", err);
    } finally {
      setIsImageGenerating(false);
    }
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
      if (next < steps.length) setTimeout(() => speakStepAt(next), 300);
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
      speak("Önce tarif ya da karışım üret 😄");
      return;
    }
    speak("Cin Şef modu açıldı. Adım adım gidiyoruz 😎");
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
          ? ["Bir şeye bas da büyü başlasın 😄", "Tarif mi kokteyl mi? Ben hazırım 😎", "Dolabı konuşturalım mı? 😏"]
          : screen === "recipe"
          ? ["Foto yükle, mutfakta şov yapalım 😄", "Dolap sessiz… ama ben değilim 😎", "Hadi şef, sıra sende 🧞"]
          : ["Bar hazır 😎", "Şişeleri göster, karışımı uçuralım 😏", "Bir barmenlik görelim 🧞"];

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
    setIsImageGenerating(false);
    setDishImageUrl("");
    setTryIndex(0);
    setRecipe(null);
    setCocktail(null);
    setAlcoholLevel("orta");
    setPersons(2);
    setImageFile(null);
    setImagePreviewUrl("");
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
    setDishImageUrl("");
    stopSpeaking();

    setScanDone(false);
    setVisionFood([]);
    setVisionDrinks([]);
    setSelectedNames([]);
    setManualItems([]);
    setManualInput("");
    setTryIndex(0);

    if (!file) {
      setImageFile(null);
      setImagePreviewUrl("");
      resetIdleTimer();
      speak("Foto yok… önce onu halledelim 😄");
      return;
    }

    if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(file);

    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);

    resetIdleTimer();
    speak("Foto geldi. Şimdi büyü zamanı 😎");
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
    speak("Manual malzeme eklendi 😎");
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
    setDishImageUrl("");
    stopSpeaking();

    if (!imageFile) {
      setError("Önce fotoğraf seç 🧞");
      speak("Foto yok… önce seçelim 😄");
      return;
    }

    const type = screen === "cocktail" ? "drinks" : "food";

    setIsScanning(true);
    resetIdleTimer();
    speak(type === "food" ? "Dolabı tarıyorum… içindekiler saklanmasın 👀" : "Etiketleri okuyorum… kaçamazlar 👀");

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
        speak(list.length ? "Etiketleri okudum. Bar açıldı 😎" : "Etiket okunmuyor… daha net çek ya da manuel ekle 😄");
      }

      setScanDone(true);
      setTryIndex(0);
      resetIdleTimer();
    } catch (e: any) {
      setError(e?.message || "Tarama hatası");
      speak("Tarama biraz dramatik bitti… bir daha deneyelim 😅");
    } finally {
      setIsScanning(false);
    }
  }

  async function generateRecipe(nextTry?: number) {
    setError("");
    setRecipe(null);
    setDishImageUrl("");
    stopSpeaking();

    if (!finalItems.length) {
      setError("En az 1 ürün seç 🧞");
      speak("Ürün seçmeden tarif çıkmaz 😄");
      return;
    }

    const v = typeof nextTry === "number" ? nextTry : tryIndex;

    setIsGenerating(true);
    resetIdleTimer();
    speak("Tarif yazıyorum… mutfakta olay var 😎");

    try {
      const res = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: finalItems, variation: v, persons }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const safeIngredients = Array.isArray(data?.ingredients)
        ? data.ingredients
            .map((i: any) => ({
              name: String(i?.name || "").trim(),
              amount: Number(i?.amount || 0),
              unit: String(i?.unit || "").trim(),
            }))
            .filter((i: any) => i.name && i.unit && !Number.isNaN(i.amount))
        : [];

      setRecipe({
        title: String(data?.title || "Tarif"),
        summary: String(data?.summary || ""),
        ingredients: safeIngredients,
        steps: Array.isArray(data?.steps) ? data.steps.map((x: any) => String(x)) : [],
        calories: data?.calories ? String(data.calories) : "",
        healthScore: typeof data?.healthScore === "number" ? data.healthScore : 0,
        protein: data?.protein ? String(data.protein) : "",
        carbs: data?.carbs ? String(data.carbs) : "",
        fat: data?.fat ? String(data.fat) : "",
        duration: data?.duration ? String(data.duration) : "",
        difficulty: data?.difficulty ? String(data.difficulty) : "",
      });

      generateDishImage({
        mode: "recipe",
        title: data.title || "Tarif",
        summary: data.summary || "",
        ingredients: safeIngredients.map((i: RecipeIngredient) => `${i.amount} ${i.unit} ${i.name}`),
      });

      speak("Tarif hazır. Kalori ve sağlık puanını da çıkardım 😎");
    } catch (e: any) {
      setError(e?.message || "Tarif üretilemedi");
      speak("Tarif çıkmadı… 😅");
    } finally {
      setIsGenerating(false);
      resetIdleTimer();
    }
  }

  async function generateCocktail(nextTry?: number) {
    setError("");
    setCocktail(null);
    setDishImageUrl("");
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
      speak("Karışım için biraz yardımcı lazım 😄");
      return;
    }

    const v = typeof nextTry === "number" ? nextTry : tryIndex;

    setIsGenerating(true);
    resetIdleTimer();
    speak("Karışımı ayarlıyorum… barmen modu 😎");

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

      generateDishImage({
        mode: "cocktail",
        title: data.title,
        summary: data.summary,
        ingredients: data.ingredients || [],
      });

      speak("Karışım hazır. Güç ve alkol oranını da hesapladım 😎");
    } catch (e: any) {
      setError(e?.message || "Kokteyl üretilemedi");
      speak("Kokteyl çıkmadı… 😅");
    } finally {
      setIsGenerating(false);
      resetIdleTimer();
    }
  }

  function actionFast() {
    setCinAction("fast");
    setTimeout(() => setCinAction(null), 1400);

    speak(screen === "cocktail" ? "Pratik mod açıldı 😎" : "Hız modu açıldı 😎");

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

    speak(screen === "cocktail" ? "Uzun içim modu 🧊" : "Fit mod açıldı 🥗");

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
      <div>
        <div className="text-[24px] font-black tracking-tight text-[#111827]">{title}</div>
        <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          {screen === "recipe" ? "Cin Şef mutfakta" : "Cin Şef barda"}
        </div>
      </div>
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
              speak("Ben hazırım 😄");
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
        <div>
          <div className="text-sm font-black text-[#111827]">Cin Şef Rehber Modu</div>
          <div className="mt-1 text-xs font-semibold text-slate-600">Tarifi sana adım adım okur</div>
        </div>
        <div className="text-xs font-extrabold text-slate-700">
          {safeSteps.length ? `${stepIndex + 1}/${safeSteps.length}` : "0/0"}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={startPremium} className="rounded-2xl bg-black px-3 py-3 text-sm font-black text-white">
          Başla
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

  const StepFunPanel = () => {
    if (!safeSteps.length) return null;

    return (
      <div className="mt-4 overflow-hidden rounded-[24px] border border-white/45 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur-md">
        <div className="border-b border-black/5 bg-gradient-to-r from-amber-50 to-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Adım ekranı</div>
            <div className="rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
              Adım {Math.min(stepIndex + 1, safeSteps.length)} / {safeSteps.length}
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
              {activeStepBadge}
            </div>

            <div className="min-w-0">
              <div className="text-base font-black text-[#111827]">{activeStepText || "Adım bekleniyor"}</div>
              <div className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold leading-6 text-slate-700">
                {activeStepComment}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MetaInfoPanel = () => {
    const data = screen === "cocktail" ? cocktail : recipe;
    if (!data) return null;

    if (screen === "recipe") {
      return (
        <div className="mt-4 rounded-[24px] border border-white/45 bg-white/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur-md">
          <div className="text-sm font-black text-[#111827]">Besin ve Tarif Özeti</div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-xs font-bold text-slate-500">Kalori</div>
              <div className="mt-1 text-sm font-black text-[#111827]">{recipe?.calories || "-"}</div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-xs font-bold text-slate-500">Sağlık Puanı</div>
              <div className="mt-1 text-sm font-black text-[#111827]">
                {typeof recipe?.healthScore === "number" && recipe.healthScore > 0 ? `${recipe.healthScore}/10` : "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-xs font-bold text-slate-500">Protein</div>
              <div className="mt-1 text-sm font-black text-[#111827]">{recipe?.protein || "-"}</div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-xs font-bold text-slate-500">Karbonhidrat</div>
              <div className="mt-1 text-sm font-black text-[#111827]">{recipe?.carbs || "-"}</div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-xs font-bold text-slate-500">Yağ</div>
              <div className="mt-1 text-sm font-black text-[#111827]">{recipe?.fat || "-"}</div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-xs font-bold text-slate-500">Süre / Zorluk</div>
              <div className="mt-1 text-sm font-black text-[#111827]">
                {recipe?.duration || "-"} {recipe?.difficulty ? `• ${recipe.difficulty}` : ""}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-4 rounded-[24px] border border-white/45 bg-white/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur-md">
        <div className="text-sm font-black text-[#111827]">Kokteyl Profili</div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-bold text-slate-500">Güç</div>
            <div className="mt-1 text-sm font-black text-[#111827]">{cocktail?.strength || "-"}</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-bold text-slate-500">Tahmini Alkol</div>
            <div className="mt-1 text-sm font-black text-[#111827]">{cocktail?.abv || "-"}</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-bold text-slate-500">Puan</div>
            <div className="mt-1 text-sm font-black text-[#111827]">
              {typeof cocktail?.score === "number" ? `${cocktail.score}/100` : "-"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-bold text-slate-500">İçim Tipi</div>
            <div className="mt-1 text-sm font-black text-[#111827]">{cocktail?.drinkingStyle || "-"}</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 col-span-2">
            <div className="text-xs font-bold text-slate-500">Tat Profili</div>
            <div className="mt-1 text-sm font-black text-[#111827]">{cocktail?.tasteProfile || "-"}</div>
          </div>
        </div>
      </div>
    );
  };

  const UploadPanel = ({ label, scanLabel }: { label: string; scanLabel: string }) => (
    <>
      <div className={`mt-4 p-5 text-center ${glassPanelSoft}`}>
        <div className="text-sm font-black text-[#111827]">{label}</div>

        {imagePreviewUrl ? (
          <img
            key={imagePreviewUrl}
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
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onPickFile(file);
        }}
      />

      <button
        onClick={() => fileRef.current?.click()}
        className="mt-4 w-full rounded-2xl bg-black px-4 py-4 text-lg font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
      >
        Kamera / Fotoğraf Aç
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
          <div className="flex items-center justify-between">
            <div className="text-base font-black text-[#111827]">Bulunan ürünler</div>
            <div className="text-xs font-bold text-slate-500">Cin seçti, sen onayla</div>
          </div>

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
        <div className="flex items-center justify-between">
          <div className="text-base font-black text-[#111827]">Bulunan içkiler</div>
          <div className="text-xs font-bold text-slate-500">Okunan etiketler</div>
        </div>

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
        {isImageGenerating && (
          <div className="mb-4 rounded-3xl border border-black/10 bg-white/80 px-4 py-10 text-center text-sm font-bold text-slate-600">
            AI sunum görseli hazırlanıyor…
          </div>
        )}

        {dishImageUrl && (
          <div className="mb-4 overflow-hidden rounded-3xl border border-white/50 bg-white/80 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
            <img src={dishImageUrl} alt="AI sunum görseli" className="h-64 w-full object-cover" />
          </div>
        )}

        <div className="rounded-3xl bg-gradient-to-r from-[#fff7e8] to-white p-4">
          <div className="text-[22px] font-black tracking-tight text-[#111827]">{data.title}</div>
          <div className="mt-2 text-[15px] font-semibold leading-6 text-slate-700">{data.summary}</div>
        </div>

        {screen === "recipe" && (
          <div className="mt-4 rounded-[24px] border border-white/45 bg-white/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-[#111827]">Kaç kişilik</div>
              <div className="rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
                {persons} kişilik
              </div>
            </div>

            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={persons}
              onChange={(e) => setPersons(Number(e.target.value))}
              className="mt-4 w-full accent-black"
            />

            <div className="mt-2 flex justify-between text-xs font-bold text-slate-500">
              <span>1</span>
              <span>4</span>
              <span>8</span>
            </div>
          </div>
        )}

        <PremiumPanel />
        <StepFunPanel />
        <MetaInfoPanel />

        <div className="mt-5 rounded-3xl bg-slate-50/80 p-4">
          <div className="text-sm font-black text-[#111827]">Malzemeler</div>
          {screen === "recipe" ? (
            <ul className="mt-2 list-disc pl-5 text-sm font-semibold leading-6 text-slate-800">
              {scaledIngredients.map((i, x) => (
                <li key={x}>
                  {i.amount} {i.unit} {i.name}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-2 list-disc pl-5 text-sm font-semibold leading-6 text-slate-800">
              {(data.ingredients || []).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 rounded-3xl bg-white/70 p-4">
          <div className="text-sm font-black text-[#111827]">Adımlar</div>
          <ol className="mt-2 list-decimal pl-5 text-sm font-semibold leading-6 text-slate-800">
            {safeSteps.map((x, i) => {
              const active = ttsMode === "steps" && i === stepIndex;
              return (
                <li
                  key={i}
                  className={"mt-2 rounded-xl px-2 py-2 transition " + (active ? "bg-black text-white shadow-sm" : "bg-transparent")}
                >
                  <span className="mr-2">{getStepBadge(x, screen)}</span>
                  {x}
                </li>
              );
            })}
          </ol>
        </div>

        {screen === "cocktail" && cocktail?.tips?.length ? (
          <div className="mt-4 rounded-3xl bg-white/70 p-4">
            <div className="text-sm font-black text-[#111827]">Cin İpuçları</div>
            <ul className="mt-2 list-disc pl-5 text-sm font-semibold leading-6 text-slate-800">
              {cocktail.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {screen === "cocktail"
            ? "🧞 Cin notu: Bunu yapınca evin en havalı barmeni olabilirsin."
            : "🧞 Cin notu: Bunu yapınca mutfakta gereksiz özgüven oluşabilir."}
        </div>

        <button
          onClick={() => {
            const d = screen === "cocktail" ? cocktail : recipe;
            if (!d) return;

            generateDishImage({
              mode: screen === "cocktail" ? "cocktail" : "recipe",
              title: d.title,
              summary: d.summary,
              ingredients:
                screen === "recipe"
                  ? (recipe?.ingredients || []).map((i) => `${i.amount} ${i.unit} ${i.name}`)
                  : (d.ingredients as string[]) || [],
            });
          }}
          className="mt-4 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm font-black text-[#111827]"
        >
          🖼️ Görseli yenile
        </button>

        <button
          onClick={() => {
            const next = tryIndex + 1;
            setTryIndex(next);
            if (screen === "cocktail") generateCocktail(next);
            else generateRecipe(next);
          }}
          className="mt-3 w-full rounded-2xl border border-black/15 bg-slate-100 px-4 py-3 text-sm font-black text-[#111827]"
        >
          😤 Beğenmedim → yeni öner
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#ece8f1]">
      <GenieBackground />

      <div className="relative z-10 mx-auto w-full max-w-md px-4 pt-6 pb-[260px] sm:pb-[220px]">
        <div className="rounded-[34px] border border-amber-200/70 bg-[#fff8ee]/95 p-5 shadow-[0_18px_40px_rgba(245,158,11,0.18)] backdrop-blur-sm">
          <div className="text-[26px] font-black tracking-tight text-[#111827]">{homeTitle}</div>
          <div className="mt-1 text-[18px] font-black text-[#1f2937]">{homeSubtitle}</div>
          <div className="mt-2 text-[15px] font-semibold leading-7 text-slate-700">{homeLine}</div>

          <div className="mt-4 flex flex-wrap gap-2">
            <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#111827] shadow-sm">AI Vision</div>
            <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#111827] shadow-sm">Türkçe Tarif</div>
            <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#111827] shadow-sm">Adım Adım Okuma</div>
            <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#111827] shadow-sm">AI Sunum Görseli</div>
          </div>
        </div>

        {screen === "home" && (
          <>
            <div className="mt-4 rounded-3xl border border-white/40 bg-white/85 p-4 backdrop-blur-md">
              <div className="text-sm font-black text-[#111827]">Bugünün büyüsü</div>
              <div className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                Foto çek, ürünleri seç, Cin sana tarif ya da kokteyl çıkarsın. Sonra da adım adım okusun.
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <button
                onClick={() => {
                  resetAll();
                  setScreen("recipe");
                }}
                className="w-full rounded-[32px] bg-black p-5 text-left text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
              >
                <div className="text-[22px] font-black tracking-tight">🍳 Tarif</div>
                <div className="mt-2 text-[15px] font-semibold text-white/85">Dolap foto → tara → seç → tarif</div>
                <div className="mt-3 text-xs font-bold uppercase tracking-wide text-white/60">Cin Şef mutfakta</div>
              </button>

              <button
                onClick={() => {
                  resetAll();
                  setScreen("cocktail");
                }}
                className="w-full rounded-[32px] border border-white/40 bg-white/95 p-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm"
              >
                <div className="text-[22px] font-black tracking-tight text-[#111827]">🍸 Kokteyl</div>
                <div className="mt-2 text-[15px] font-semibold text-slate-700">Şişe foto → tara → seç → karışım</div>
                <div className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Cin Şef barda</div>
              </button>
            </div>
          </>
        )}

        {screen !== "home" && (
          <div className={`mt-4 p-5 ${glassPanel}`}>
            <PageHeader title={screen === "recipe" ? "Tarif" : "Kokteyl"} />
            <VoicePanel />

            {screen === "cocktail" && (
              <div className={`mt-4 p-4 ${glassPanelSoft}`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-[#111827]">Güç seviyesi</div>
                  <div className="text-xs font-bold text-slate-500">Bardak karakteri</div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["hafif", "orta", "sert"] as AlcoholLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => {
                        resetIdleTimer();
                        setAlcoholLevel(lvl);
                        speak(`Tamam. Güç seviyesi ${lvl} 😎`);
                      }}
                      className={
                        "rounded-2xl px-3 py-2.5 text-sm font-black border transition " +
                        (alcoholLevel === lvl ? "bg-black text-white border-black shadow-sm" : "bg-white text-[#111827] border-black/10")
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

                {screen === "recipe" && (
                  <div className={`mt-4 p-4 ${glassPanelSoft}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-[#111827]">Kaç kişilik tarif</div>
                      <div className="rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
                        {persons} kişilik
                      </div>
                    </div>

                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={persons}
                      onChange={(e) => setPersons(Number(e.target.value))}
                      className="mt-4 w-full accent-black"
                    />

                    <div className="mt-2 flex justify-between text-xs font-bold text-slate-500">
                      <span>1</span>
                      <span>4</span>
                      <span>8</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    resetIdleTimer();
                    if (screen === "recipe") generateRecipe();
                    else generateCocktail();
                  }}
                  disabled={isGenerating}
                  className="mt-5 w-full rounded-2xl bg-black px-4 py-4 text-lg font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] disabled:opacity-40"
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
          Cin Şef © — “Tarif hiç bu kadar eğlenceli olmamıştı.”
        </div>
      </div>

      <div className="fixed bottom-3 right-3 z-50 sm:bottom-6 sm:right-4">
        <ChefCin
          bubble={lastSpokenText}
          screen={screen}
          cinAction={cinAction}
          onClick={() => {
            resetIdleTimer();
            speak("Hadi canım… foto ver de biraz şov yapalım 😎");
          }}
          onFast={actionFast}
          onFit={actionFit}
          onNew={actionNew}
        />
      </div>
    </div>
  );
}