"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";

type Screen = "home" | "recipe" | "cocktail";
type AlcoholLevel = "hafif" | "orta" | "sert";

type VisionFoodItem = { name: string; confidence?: number };
type VisionDrinkItem = { name: string; category?: string; confidence?: number };

type RecipeResponse = {
  title: string;
  summary: string;
  ingredients: string[];
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

type NativeTTSPlugin = {
  speak: (options: {
    text: string;
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    queueStrategy?: number;
  }) => Promise<void>;
  stop: () => Promise<void>;
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
        className="h-full w-full object-cover object-[22%_center] sm:object-center"
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

const API_BASE = "https://heycinchef-7lqs.vercel.app";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function mapApiError(err: unknown, fallback: string) {
  const raw = err instanceof Error ? err.message : String(err || fallback);

  if (/failed to fetch/i.test(raw)) {
    return "API bağlantısı kurulamadı. Vercel API route tarafında CORS ayarı gerekiyor.";
  }

  if (!raw || raw === "Error") return fallback;
  return raw;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function postForm<T>(path: string, body: FormData): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

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

const isNativeApp = () => typeof window !== "undefined" && Capacitor.isNativePlatform();

const getTtsLang = (_text?: string) => "tr";

async function importNativeTTS() {
  if (typeof window === "undefined") return null;
  if (!isNativeApp()) return null;

  try {
    const mod = await import("@capacitor-community/text-to-speech");
    return mod;
  } catch (err) {
    console.warn("[TTS] plugin import hatası:", err);
    return null;
  }
}

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

  const btnBase =
    "rounded-full text-[11px] px-3 py-1.5 border transition-all font-extrabold shadow-sm active:scale-95";
  const btnOn = "bg-black text-white border-black scale-[1.04]";
  const btnOff = "bg-white border-black/15 text-black hover:bg-slate-50";

  const isTalking = mode === "talk";
  const isCooking = mode === "cook";
  const isScanning = mode === "scan";

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
      <style jsx>{`
        @keyframes genieFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes blink {
          0%,
          44%,
          48%,
          100% {
            transform: scaleY(1);
          }
          46% {
            transform: scaleY(0.12);
          }
        }
        @keyframes talkMouth {
          0%,
          100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(1.35);
          }
        }
        @keyframes spoonWave {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(8deg);
          }
        }
        @keyframes steam {
          0% {
            transform: translateY(8px);
            opacity: 0;
          }
          30% {
            opacity: 0.45;
          }
          100% {
            transform: translateY(-18px);
            opacity: 0;
          }
        }
        @keyframes sparkle {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.12);
          }
        }
        .genie-float {
          animation: genieFloat 3s ease-in-out infinite;
        }
        .genie-eye {
          animation: blink 5s infinite;
          transform-origin: center;
        }
        .genie-mouth-talk {
          animation: talkMouth 0.45s infinite ease-in-out;
          transform-origin: center;
        }
        .spoon-wave {
          animation: spoonWave 1.2s ease-in-out infinite;
          transform-origin: 150px 128px;
        }
        .steam-1 {
          animation: steam 1.8s ease-out infinite;
        }
        .steam-2 {
          animation: steam 1.8s ease-out infinite 0.5s;
        }
        .sparkle {
          animation: sparkle 1.6s ease-in-out infinite;
        }
      `}</style>

      <div className="pointer-events-auto mb-2 ml-auto w-[170px] sm:w-[300px] rounded-[20px] border border-white/55 bg-white/92 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-bold text-[#111827] shadow-[0_16px_38px_rgba(0,0,0,0.18)] backdrop-blur-md">
        <div className="truncate text-[12px] sm:text-sm">{bubble || "Hazırım 😄"}</div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFast?.();
            }}
            className={`${btnBase} ${fastActive ? btnOn : btnOff}`}
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
          >
            🎲 Yeni {newActive ? "✓" : ""}
          </button>
        </div>

        <div className="mt-2 text-[11px] font-semibold text-slate-600">{hint}</div>
      </div>

      <div className="ml-auto w-[180px] sm:w-[205px] genie-float">
        <svg viewBox="0 0 220 260" className="h-auto w-full overflow-visible">
          <ellipse cx="110" cy="240" rx="52" ry="10" fill="rgba(0,0,0,0.10)" />

          <g className="sparkle">
            <path d="M28 74 L33 84 L43 89 L33 94 L28 104 L23 94 L13 89 L23 84 Z" fill="#FACC15" />
          </g>
          <g className="sparkle" style={{ animationDelay: "0.4s" }}>
            <path d="M188 96 L192 104 L200 108 L192 112 L188 120 L184 112 L176 108 L184 104 Z" fill="#FACC15" />
          </g>

          {(isCooking || isTalking) && (
            <>
              <ellipse className="steam-1" cx="74" cy="170" rx="12" ry="9" fill="rgba(255,255,255,0.34)" />
              <ellipse className="steam-2" cx="84" cy="162" rx="10" ry="7" fill="rgba(255,255,255,0.24)" />
            </>
          )}

          {isScanning && (
            <>
              <circle cx="110" cy="102" r="58" fill="rgba(59,130,246,0.08)" />
              <circle cx="110" cy="102" r="72" fill="rgba(59,130,246,0.05)" />
            </>
          )}

          <g>
            <path
              d="M108 214 C88 218, 76 205, 80 190 C66 180, 72 162, 90 165 C90 145, 126 145, 126 165 C144 161, 150 180, 138 190 C142 204, 130 218, 108 214 Z"
              fill="url(#smokeGrad)"
            />

            <path
              d="M86 156 C82 188, 134 188, 130 156 C128 132, 121 118, 108 116 C95 118, 88 132, 86 156 Z"
              fill="url(#bodyGrad)"
            />

            <ellipse cx="110" cy="92" rx="44" ry="42" fill="#63B6FF" />
            <ellipse cx="96" cy="78" rx="14" ry="10" fill="rgba(255,255,255,0.22)" />

            <g transform="translate(58 10)">
              <ellipse cx="52" cy="38" rx="18" ry="28" fill="#fff" />
              <ellipse cx="26" cy="50" rx="22" ry="18" fill="#fff" />
              <ellipse cx="52" cy="46" rx="24" ry="20" fill="#fff" />
              <ellipse cx="80" cy="50" rx="22" ry="18" fill="#fff" />
              <ellipse cx="100" cy="40" rx="18" ry="16" fill="#fff" />
              <rect x="20" y="54" width="64" height="14" rx="7" fill="#F3F4F6" stroke="rgba(0,0,0,0.08)" />
            </g>

            <path d="M73 54 Q110 30 147 54" stroke="#D97706" strokeWidth="14" strokeLinecap="round" fill="none" />
            <circle cx="110" cy="46" r="13" fill="#F59E0B" />
            <circle cx="110" cy="46" r="8" fill="#DC2626" />
            <circle cx="106" cy="42" r="2.8" fill="#fff" />

            <ellipse cx="93" cy="98" rx="15" ry="19" fill="#fff" />
            <ellipse cx="126" cy="98" rx="15" ry="19" fill="#fff" />
            <ellipse cx="95" cy="100" rx="9.5" ry="12.5" fill="#111827" className="genie-eye" />
            <ellipse cx="124" cy="100" rx="9.5" ry="12.5" fill="#111827" className="genie-eye" />
            <circle cx="98" cy="95" r="3.8" fill="#fff" />
            <circle cx="127" cy="95" r="3.8" fill="#fff" />
            <circle cx="94" cy="103" r="1.8" fill="rgba(255,255,255,0.45)" />
            <circle cx="123" cy="103" r="1.8" fill="rgba(255,255,255,0.45)" />

            {isTalking ? (
              <g className="genie-mouth-talk">
                <ellipse cx="110" cy="126" rx="10" ry="8" fill="#7F1D1D" />
                <path d="M102 123 Q110 132 118 123" fill="#FCA5A5" />
              </g>
            ) : (
              <path d="M100 126 Q110 134 120 126" stroke="#111827" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            )}

            <path
              d="M74 132 C61 132, 48 122, 46 108"
              stroke="#2F83FF"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="45" cy="106" r="8" fill="#2F83FF" />
            <ellipse cx="39" cy="102" rx="20" ry="15" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2" />
            <path d="M21 102 H57" stroke="#D1D5DB" strokeWidth="2" />

            <g className={isTalking || isCooking ? "spoon-wave" : ""}>
              <path
                d="M146 132 C160 132, 171 124, 177 112"
                stroke="#2F83FF"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
              />
              <ellipse cx="183" cy="100" rx="9" ry="14" fill="#B45309" />
              <rect x="177" y="112" width="6" height="24" rx="3" fill="#92400E" />
            </g>

            <path
              d="M76 148 C86 140, 96 137, 110 137 C124 137, 134 140, 144 148"
              stroke="#DC2626"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="100" cy="149" r="4" fill="#DC2626" />
            <circle cx="120" cy="149" r="4" fill="#DC2626" />
          </g>

          <g transform="translate(8,10)">
            <path
              d="M44 206 C54 190, 83 186, 108 192 C121 195, 126 202, 123 208 C119 215, 94 219, 69 217 C53 216, 42 212, 44 206 Z"
              fill="url(#lampGrad)"
              stroke="#A16207"
              strokeWidth="2"
            />
            <path
              d="M106 195 C116 192, 127 193, 134 199"
              stroke="#A16207"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M52 204 C44 201, 39 195, 39 188"
              stroke="#A16207"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8DDCFF" />
              <stop offset="60%" stopColor="#4DA8FF" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="smokeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#A5D8FF" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="lampGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>
        </svg>
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
  const [voiceLoadDone, setVoiceLoadDone] = useState(false);
  const [ttsReady, setTtsReady] = useState(false);

  const [ttsMode, setTtsMode] = useState<"off" | "steps">("off");
  const [stepIndex, setStepIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [nativeTtsEnabled, setNativeTtsEnabled] = useState(false);

  const [lastSpokenText, setLastSpokenText] = useState<string>("");
  const [cinAction, setCinAction] = useState<"fast" | "fit" | "new" | null>(null);

  const lastSpokenScreenRef = useRef<Screen | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ttsModeRef = useRef<"off" | "steps">("off");

  const canTTS = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    ttsModeRef.current = ttsMode;
  }, [ttsMode]);

  const finalItems = useMemo(() => {
    const all = [...selectedNames, ...manualItems].map(normalize).filter(Boolean);
    return Array.from(new Set(all));
  }, [selectedNames, manualItems]);

  const safeSteps = useMemo(() => {
    const steps = screen === "cocktail" ? cocktail?.steps : recipe?.steps;
    return (Array.isArray(steps) ? steps : []).map((x) => String(x || "").trim()).filter(Boolean);
  }, [screen, recipe, cocktail]);

  const scaledIngredients = useMemo(() => {
    if (screen !== "recipe") return recipe?.ingredients || [];

    return (recipe?.ingredients || []).map((item) =>
      String(item).replace(/(\d+(\.\d+)?)/, (n) => String(Number(n) * persons))
    );
  }, [recipe, persons, screen]);

  const activeStepText = safeSteps[stepIndex] || safeSteps[0] || "";
  const activeStepBadge = getStepBadge(activeStepText, screen);
  const activeStepComment = getStepComment(activeStepText, screen);

  function ensureSynth() {
    if (typeof window === "undefined") return null;
    return window.speechSynthesis || null;
  }

  function unlockTTS() {
    if (isNativeApp()) {
      setTtsReady(true);
      return true;
    }

    const synth = ensureSynth();
    if (!synth) return false;

    try {
      synth.cancel();

      const probe = new SpeechSynthesisUtterance(" ");
      probe.volume = 0;
      probe.rate = 1;
      probe.pitch = 1;
      probe.lang = "tr-TR";

      synth.speak(probe);
      setTtsReady(true);
      return true;
    } catch {
      return false;
    }
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

  function openImagePicker() {
    if (!fileRef.current) return;

    try {
      fileRef.current.value = "";
    } catch {}

    fileRef.current.click();
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

      const data = await postJson<{ imageUrl?: string }>("/api/dish-image", params);
      setDishImageUrl(data?.imageUrl || "");
    } catch (err) {
      console.error("Görsel üretilemedi:", err);
    } finally {
      setIsImageGenerating(false);
    }
  }

  async function speakNativeDirect(text: string, interrupt = true) {
    const clean = stripEmojisForTTS(text).trim();
    if (!clean) return;

    const mod = await importNativeTTS();
    const TTS = mod?.TextToSpeech as NativeTTSPlugin | undefined;

    if (!TTS) {
      throw new Error("Native TTS plugin yüklenemedi");
    }

    setLastSpokenText(clean);

    try {
      if (interrupt) {
        await TTS.stop().catch(() => {});
      }

      setIsSpeaking(true);
      setIsPaused(false);
      setTtsReady(true);

      try {
        await TTS.speak({
          text: clean,
          lang: getTtsLang(clean),
          rate: 1,
          pitch: 1,
          volume: 1,
          queueStrategy: interrupt ? 0 : 1,
        });
      } catch (err1) {
        console.warn("[TTS] dil ile konuşma başarısız, default deneniyor:", err1);

        await TTS.speak({
          text: clean,
          rate: 1,
          pitch: 1,
          volume: 1,
          queueStrategy: interrupt ? 0 : 1,
        });
      }
    } finally {
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }

  async function stopSpeaking() {
    if (isNativeApp()) {
      const mod = await importNativeTTS();
      const TTS = mod?.TextToSpeech as NativeTTSPlugin | undefined;

      if (TTS) {
        try {
          await TTS.stop();
        } catch (err) {
          console.warn("[TTS] Native stop hatası:", err);
        }
      }

      setIsSpeaking(false);
      setIsPaused(false);
      ttsModeRef.current = "off";
      setTtsMode("off");
      setStepIndex(0);
      utterRef.current = null;
      return;
    }

    const synth = ensureSynth();
    if (synth) {
      try {
        synth.cancel();
      } catch {}
    }

    setIsSpeaking(false);
    setIsPaused(false);
    ttsModeRef.current = "off";
    setTtsMode("off");
    setStepIndex(0);
    utterRef.current = null;
  }

  async function speak(text: string, interrupt = true) {
    const clean = stripEmojisForTTS(text);
    if (!clean.trim()) return;

    setLastSpokenText(clean);

    if (isNativeApp()) {
      try {
        await speakNativeDirect(clean, interrupt);
        return;
      } catch (err) {
        console.warn("[TTS] Native konuşma başarısız, browser fallback deneniyor:", err);
      }
    }

    const synth = ensureSynth();
    if (!synth) return;

    try {
      if (interrupt) {
        synth.cancel();
      }

      const doSpeak = () => {
        const u = new SpeechSynthesisUtterance(clean);

        const selectedVoice =
          (voiceURI ? voices.find((x) => x.voiceURI === voiceURI) : null) ||
          pickMaleVoice(voices) ||
          null;

        if (selectedVoice) {
          u.voice = selectedVoice;
          u.lang = selectedVoice.lang || "tr-TR";
        } else {
          u.lang = "tr-TR";
        }

        u.rate = 1;
        u.pitch = 1;
        u.volume = 1;

        u.onstart = () => {
          setIsSpeaking(true);
          setIsPaused(false);
          setTtsReady(true);
        };

        u.onend = () => {
          setIsSpeaking(false);
          setIsPaused(false);
        };

        u.onerror = () => {
          setIsSpeaking(false);
          setIsPaused(false);
        };

        utterRef.current = u;
        synth.speak(u);
      };

      if (!ttsReady) {
        unlockTTS();
        setTimeout(doSpeak, 180);
      } else {
        setTimeout(doSpeak, interrupt ? 80 : 0);
      }
    } catch {
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }

  async function pauseTTS() {
    if (isNativeApp()) {
      const mod = await importNativeTTS();
      const TTS = mod?.TextToSpeech as NativeTTSPlugin | undefined;

      if (TTS) {
        try {
          await TTS.stop();
        } catch (err) {
          console.warn("[TTS] Native pause/stop hatası:", err);
        }
      }

      setIsPaused(true);
      setIsSpeaking(false);
      return;
    }

    const synth = ensureSynth();
    if (!synth) return;
    if (!synth.speaking) return;
    synth.pause();
    setIsPaused(true);
  }

  async function resumeTTS() {
    if (isNativeApp()) {
      setIsPaused(false);

      if (ttsModeRef.current === "steps") {
        await speakStepAt(stepIndex);
        return;
      }

      if (lastSpokenText) {
        await speak(lastSpokenText, true);
      }
      return;
    }

    const synth = ensureSynth();
    if (!synth) return;
    synth.resume();
    setIsPaused(false);
  }

  async function speakStepAt(i: number) {
    const steps = safeSteps;

    if (!steps.length) {
      await speak("Adım yok. Önce üretelim 😄");
      return;
    }

    const idx = Math.max(0, Math.min(i, steps.length - 1));
    setStepIndex(idx);
    ttsModeRef.current = "steps";
    setTtsMode("steps");

    const text = `Adım ${idx + 1}. ${steps[idx]}`;
    const clean = stripEmojisForTTS(text);
    setLastSpokenText(clean);

    if (isNativeApp()) {
      try {
        await speakNativeDirect(clean, true);

        const next = idx + 1;
        if (ttsModeRef.current === "steps" && next < steps.length) {
          setTimeout(() => {
            void speakStepAt(next);
          }, 350);
        } else if (next >= steps.length) {
          ttsModeRef.current = "off";
          setTtsMode("off");
        }

        return;
      } catch (err) {
        console.warn("[TTS] Native speakStepAt hatası:", err);
        setIsSpeaking(false);
        setIsPaused(false);
        ttsModeRef.current = "off";
        setTtsMode("off");
        return;
      }
    }

    const synth = ensureSynth();
    if (!synth) return;

    try {
      synth.cancel();

      const doSpeak = () => {
        const u = new SpeechSynthesisUtterance(clean);

        const selectedVoice =
          (voiceURI ? voices.find((x) => x.voiceURI === voiceURI) : null) ||
          pickMaleVoice(voices) ||
          null;

        if (selectedVoice) {
          u.voice = selectedVoice;
          u.lang = selectedVoice.lang || "tr-TR";
        } else {
          u.lang = "tr-TR";
        }

        u.rate = 1;
        u.pitch = 1;
        u.volume = 1;

        u.onstart = () => {
          setIsSpeaking(true);
          setIsPaused(false);
          setTtsReady(true);
        };

        u.onend = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          const next = idx + 1;
          if (ttsModeRef.current === "steps" && next < steps.length) {
            setTimeout(() => {
              void speakStepAt(next);
            }, 350);
          } else {
            ttsModeRef.current = "off";
            setTtsMode("off");
          }
        };

        u.onerror = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          ttsModeRef.current = "off";
          setTtsMode("off");
        };

        utterRef.current = u;
        synth.speak(u);
      };

      if (!ttsReady) {
        unlockTTS();
        setTimeout(doSpeak, 180);
      } else {
        setTimeout(doSpeak, 100);
      }
    } catch {
      setIsSpeaking(false);
      setIsPaused(false);
      ttsModeRef.current = "off";
      setTtsMode("off");
    }
  }

  async function startPremium() {
    if (!safeSteps.length) {
      await speak("Önce tarif ya da karışım üret 😄");
      return;
    }

    unlockTTS();
    ttsModeRef.current = "steps";
    setTtsMode("steps");
    await speak("Cin Şef modu açıldı. Adım adım gidiyoruz 😎");
    setTimeout(() => {
      void speakStepAt(0);
    }, 700);
  }

  useEffect(() => {
    let mounted = true;

    async function initTTS() {
      if (!isNativeApp()) {
        if (mounted) {
          setNativeTtsEnabled(false);
          setTtsReady(true);
        }
        return;
      }

      const mod = await importNativeTTS();

      if (mounted) {
        setNativeTtsEnabled(!!mod?.TextToSpeech);
        setTtsReady(true);
      }
    }

    void initTTS();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isNativeApp()) {
      setVoiceLoadDone(true);
      setVoices([]);
      return;
    }

    const synth = ensureSynth();
    if (!synth) {
      setVoiceLoadDone(true);
      return;
    }

    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loadVoices = () => {
      if (cancelled) return;

      const list = synth.getVoices() || [];

      if (list.length > 0) {
        setVoices(list);
        setVoiceLoadDone(true);

        if (!voiceURI) {
          const picked = pickMaleVoice(list);
          if (picked) setVoiceURI(picked.voiceURI);
        }
        return;
      }

      tries += 1;

      if (tries >= 8) {
        setVoices([]);
        setVoiceLoadDone(true);
        return;
      }

      timer = setTimeout(loadVoices, 500);
    };

    loadVoices();

    synth.onvoiceschanged = () => {
      if (cancelled) return;

      const list = synth.getVoices() || [];
      setVoices(list);

      if (list.length > 0 && !voiceURI) {
        const picked = pickMaleVoice(list);
        if (picked) setVoiceURI(picked.voiceURI);
      }

      setVoiceLoadDone(true);
    };

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      synth.onvoiceschanged = null;
    };
  }, [voiceURI, nativeTtsEnabled]);

  useEffect(() => {
    if (!voices.length) return;
    const v = pickMaleVoice(voices);
    if (v) setVoiceURI(v.voiceURI);
  }, [voices]);

  useEffect(() => {
    if (lastSpokenScreenRef.current === screen) return;
    lastSpokenScreenRef.current = screen;

    setTimeout(() => {
      void speak(aiLine(screen), true);
    }, 450);
  }, [screen, voices.length, nativeTtsEnabled]);

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

      void speak(idleLines[Math.floor(Math.random() * idleLines.length)], true);
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

  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  function resetAll() {
    void stopSpeaking();
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

    if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImagePreviewUrl("");
    if (fileRef.current) fileRef.current.value = "";
    resetIdleTimer();
  }

  function goHome() {
    resetAll();
    setScreen("home");
  }

  function onPickFile(file: File | null) {
    if (!file) return;

    setError("");
    setRecipe(null);
    setCocktail(null);
    setDishImageUrl("");
    void stopSpeaking();

    setScanDone(false);
    setVisionFood([]);
    setVisionDrinks([]);
    setSelectedNames([]);
    setManualItems([]);
    setManualInput("");
    setTryIndex(0);

    if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreviewUrl(objectUrl);

    resetIdleTimer();
    void speak("Foto geldi. Şimdi büyü zamanı 😎");
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
    void speak("Manual malzeme eklendi 😎");
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
    await stopSpeaking();

    if (!imageFile) {
      setError("Önce fotoğraf seç 🧞");
      await speak("Foto yok… önce seçelim 😄");
      return;
    }

    const type = screen === "cocktail" ? "drinks" : "food";

    setIsScanning(true);
    resetIdleTimer();
    await speak(
      type === "food" ? "Dolabı tarıyorum… içindekiler saklanmasın 👀" : "Etiketleri okuyorum… kaçamazlar 👀"
    );

    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      fd.append("type", type);

      const data = await postForm<{ items?: any[] }>("/api/vision", fd);
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
        await speak(
          list.length ? `Buldum: ${list.map((x) => x.name).join(", ")} 😎` : "Bir şey göremedim… daha net çek 😅"
        );
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
        await speak(list.length ? "Etiketleri okudum. Bar açıldı 😎" : "Etiket okunmuyor… daha net çek ya da manuel ekle 😄");
      }

      setScanDone(true);
      setTryIndex(0);
      resetIdleTimer();
    } catch (e) {
      const msg = mapApiError(e, "Tarama hatası");
      setError(msg);
      await speak("Tarama biraz dramatik bitti… bir daha deneyelim 😅");
    } finally {
      setIsScanning(false);
    }
  }

  async function generateRecipe(nextTry?: number) {
    setError("");
    setRecipe(null);
    setDishImageUrl("");
    await stopSpeaking();

    if (!finalItems.length) {
      setError("En az 1 ürün seç 🧞");
      await speak("Ürün seçmeden tarif çıkmaz 😄");
      return;
    }

    const v = typeof nextTry === "number" ? nextTry : tryIndex;

    setIsGenerating(true);
    resetIdleTimer();
    await speak("Tarif yazıyorum… mutfakta olay var 😎");

    try {
      const data = await postJson<RecipeResponse>("/api/recipe", {
        items: finalItems,
        variation: v,
        persons,
      });

      setRecipe(data);
      ttsModeRef.current = "off";
      setTtsMode("off");
      setStepIndex(0);

      void generateDishImage({
        mode: "recipe",
        title: data.title,
        summary: data.summary,
        ingredients: data.ingredients || [],
      });

      await speak("Tarif hazır. Kalori ve sağlık puanını da çıkardım 😎");
    } catch (e) {
      const msg = mapApiError(e, "Tarif üretilemedi");
      setError(msg);
      await speak("Tarif çıkmadı… 😅");
    } finally {
      setIsGenerating(false);
      resetIdleTimer();
    }
  }

  async function generateCocktail(nextTry?: number) {
    setError("");
    setCocktail(null);
    setDishImageUrl("");
    await stopSpeaking();

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
      await speak("Karışım için biraz yardımcı lazım 😄");
      return;
    }

    const v = typeof nextTry === "number" ? nextTry : tryIndex;

    setIsGenerating(true);
    resetIdleTimer();
    await speak("Karışımı ayarlıyorum… barmen modu 😎");

    try {
      const data = await postJson<CocktailResponse>("/api/cocktail", {
        items: payloadItems,
        alcoholLevel,
        variation: v,
      });

      setCocktail(data);
      ttsModeRef.current = "off";
      setTtsMode("off");
      setStepIndex(0);

      void generateDishImage({
        mode: "cocktail",
        title: data.title,
        summary: data.summary,
        ingredients: data.ingredients || [],
      });

      await speak("Karışım hazır. Güç ve alkol oranını da hesapladım 😎");
    } catch (e) {
      const msg = mapApiError(e, "Kokteyl üretilemedi");
      setError(msg);
      await speak("Kokteyl çıkmadı… 😅");
    } finally {
      setIsGenerating(false);
      resetIdleTimer();
    }
  }

  function actionFast() {
    setCinAction("fast");
    setTimeout(() => setCinAction(null), 1400);

    void speak(screen === "cocktail" ? "Pratik mod açıldı 😎" : "Hız modu açıldı 😎");

    const next = tryIndex + 11;
    setTryIndex(next);
    resetIdleTimer();

    setTimeout(() => {
      if (screen === "recipe") void generateRecipe(next);
      else if (screen === "cocktail") void generateCocktail(next);
    }, 350);
  }

  function actionFit() {
    setCinAction("fit");
    setTimeout(() => setCinAction(null), 1400);

    void speak(screen === "cocktail" ? "Uzun içim modu 🧊" : "Fit mod açıldı 🥗");

    const next = tryIndex + 22;
    setTryIndex(next);
    resetIdleTimer();

    setTimeout(() => {
      if (screen === "recipe") void generateRecipe(next);
      else if (screen === "cocktail") void generateCocktail(next);
    }, 350);
  }

  function actionNew() {
    setCinAction("new");
    setTimeout(() => setCinAction(null), 1400);

    void speak("Yeni fikir geliyor 🎲");

    const next = tryIndex + 1;
    setTryIndex(next);
    resetIdleTimer();

    setTimeout(() => {
      if (screen === "recipe") void generateRecipe(next);
      else if (screen === "cocktail") void generateCocktail(next);
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
    const nativeMode = nativeTtsEnabled && isNativeApp();

    return (
      <div className={`mt-4 p-4 ${glassPanelSoft}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-black text-[#111827]">Ses</div>

          <button
            onClick={() => {
              resetIdleTimer();
              unlockTTS();
              void speak("Cin Şef burada. Ses testi başarılı 😎", true);
            }}
            className="rounded-2xl bg-black px-3 py-2 text-xs font-extrabold text-white"
          >
            Konuş
          </button>
        </div>

        {!nativeMode && (
          <div className="mt-3 grid grid-cols-1 gap-2">
            <select
              value={voiceURI}
              onChange={(e) => setVoiceURI(e.target.value)}
              className="w-full rounded-2xl border border-black/15 bg-white px-3 py-2 text-sm font-bold text-[#111827]"
            >
              {!voiceLoadDone ? (
                <option value="">Ses yükleniyor…</option>
              ) : voices.length === 0 ? (
                <option value="">Varsayılan sistem sesi kullanılacak</option>
              ) : (
                list.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} - {v.lang}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              void stopSpeaking();
            }}
            className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm font-extrabold text-[#111827]"
          >
            Sus
          </button>
        </div>

        {!nativeMode && (
          <div className="mt-2 text-xs font-semibold text-slate-600">
            {!canTTS
              ? "Tarayıcı TTS desteklemiyor olabilir."
              : !voiceLoadDone
              ? "Sesler yükleniyor…"
              : voices.length === 0
              ? "Varsayılan sistem sesi kullanılacak. İlk tıklamada kısa gecikme olabilir."
              : "Tarayıcı sesi hazır."}
          </div>
        )}
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
        <button
          onClick={() => {
            void startPremium();
          }}
          className="rounded-2xl bg-black px-3 py-3 text-sm font-black text-white"
        >
          Başla
        </button>

        <button
          onClick={() => {
            void stopSpeaking();
          }}
          className="rounded-2xl border border-black/15 bg-white px-3 py-3 text-sm font-extrabold text-[#111827]"
        >
          Sus
        </button>

        <button
          onClick={() => {
            void speakStepAt(stepIndex - 1);
          }}
          disabled={!safeSteps.length}
          className="rounded-2xl border border-black/15 bg-white px-3 py-3 text-sm font-extrabold text-[#111827] disabled:opacity-40"
        >
          ⟵ Geri
        </button>

        <button
          onClick={() => {
            void speakStepAt(stepIndex + 1);
          }}
          disabled={!safeSteps.length}
          className="rounded-2xl border border-black/15 bg-white px-3 py-3 text-sm font-extrabold text-[#111827] disabled:opacity-40"
        >
          İleri ⟶
        </button>

        <button
          onClick={() => {
            if (isPaused) {
              void resumeTTS();
            } else {
              void pauseTTS();
            }
          }}
          disabled={!isSpeaking && !isPaused}
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

          <div className="col-span-2 rounded-2xl bg-slate-50 p-3">
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
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0] ?? null;
          onPickFile(file);
        }}
      />

      <button
        onClick={openImagePicker}
        className="mt-4 w-full rounded-2xl bg-black px-4 py-4 text-lg font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
      >
        Kamera / Fotoğraf Aç
      </button>

      <button
        onClick={() => {
          void scanImage();
        }}
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
          <ul className="mt-2 list-disc pl-5 text-sm font-semibold leading-6 text-slate-800">
            {(screen === "recipe" ? scaledIngredients : data.ingredients || []).map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-3xl bg-white/70 p-4">
          <div className="text-sm font-black text-[#111827]">Adımlar</div>
          <ol className="mt-2 list-decimal pl-5 text-sm font-semibold leading-6 text-slate-800">
            {safeSteps.map((x, i) => {
              const active = ttsMode === "steps" && i === stepIndex;
              return (
                <li
                  key={i}
                  className={
                    "mt-2 rounded-xl px-2 py-2 transition " + (active ? "bg-black text-white shadow-sm" : "bg-transparent")
                  }
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

            void generateDishImage({
              mode: screen === "cocktail" ? "cocktail" : "recipe",
              title: d.title,
              summary: d.summary,
              ingredients: d.ingredients || [],
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
            if (screen === "cocktail") void generateCocktail(next);
            else void generateRecipe(next);
          }}
          className="mt-3 w-full rounded-2xl border border-black/15 bg-slate-100 px-4 py-3 text-sm font-black text-[#111827]"
        >
          😤 Beğenmedim → yeni öner
        </button>
      </div>
    );
  }

  const chefMode: "idle" | "scan" | "cook" | "talk" =
    isScanning ? "scan" : isGenerating ? "cook" : isSpeaking ? "talk" : "idle";

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
            <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#111827] shadow-sm">
              AI Sunum Görseli
            </div>
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
                        void speak(`Tamam. Güç seviyesi ${lvl} 😎`);
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
                    if (screen === "recipe") void generateRecipe();
                    else void generateCocktail();
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
          mode={chefMode}
          bubble={lastSpokenText}
          screen={screen}
          cinAction={cinAction}
          onClick={() => {
            resetIdleTimer();
            unlockTTS();
            setTimeout(() => {
              void speak("Hadi canım… foto ver de biraz şov yapalım 😎", true);
            }, 120);
          }}
          onFast={actionFast}
          onFit={actionFit}
          onNew={actionNew}
        />
      </div>
    </div>
  );
}