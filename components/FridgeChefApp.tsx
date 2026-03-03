"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * TEK DOSYA
 * Bunu direkt `app/page.tsx` içine yapıştır.
 *
 * Notlar:
 * - CinChef (SVG) kod ile çizilir, dosya yok.
 * - Cin opsiyonel (kapat/aç) ve localStorage ile kalıcı.
 * - Mobilde sayfa ORTALANMAZ (üstten akar).
 * - Cin her ekranda altta kalır, içerik cinin üstüne binmesin diye pb-48.
 * - “Tarif stili” => Hızlı / Fit / Yeni (Tarif ekranında gösterilir)
 * - “Kokteyl uzun içim” ayrı (hafif/orta/sert)
 * - Ses: sadece erkek sesi (Türkçe varsa seçer). Her sayfada girişte konuşur.
 * - Hydration hatası: button içinde button YOK (Cin wrapper div role=button).
 */

type Screen = "home" | "recipe" | "cocktail";
type AlcoholLevel = "hafif" | "orta" | "sert";
type Mode = "hizli" | "fit" | "yeni";

type RecipeResponse = {
  title: string;
  summary: string;
  ingredients: string[];
  steps: string[];
};

function normalize(s: string) {
  return String(s || "").trim().toLowerCase();
}

function stripEmojisForTTS(text: string) {
  // Basit emoji temizliği
  return String(text || "").replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "");
}

function getSynth() {
  if (typeof window === "undefined") return null;
  const s = window.speechSynthesis;
  return s || null;
}

function pickMaleTrVoice(voices: SpeechSynthesisVoice[]) {
  // Öncelik: tr-TR, adı "Tolga" gibi erkek TR sesi
  const tr = voices.filter((v) => /tr/i.test(v.lang) || /turk/i.test(v.name));
  const tolga = tr.find((v) => /tolga/i.test(v.name));
  if (tolga) return tolga;

  // TR varsa ilkini al
  if (tr.length) return tr[0];

  // Yoksa herhangi bir erkek vari isim (heuristic)
  const maleHint = voices.find((v) => /male|erkek|david|mark|alex|tom/i.test(v.name));
  if (maleHint) return maleHint;

  // Son çare: ilk ses
  return voices[0] || null;
}

function speakText(text: string, voice: SpeechSynthesisVoice | null) {
  const synth = getSynth();
  if (!synth) return;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(stripEmojisForTTS(text));
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.pitch = 1.0;
    u.volume = 1.0;
    synth.speak(u);
  } catch {
    // sessiz geç
  }
}

function stopSpeaking() {
  const synth = getSynth();
  if (!synth) return;
  try {
    synth.cancel();
  } catch {}
}

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx(
        "rounded-full border px-3 py-1 text-[13px] font-semibold transition",
        active
          ? "bg-black text-white border-black shadow-sm"
          : "bg-white text-black border-black/15 hover:border-black/30"
      )}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "w-full rounded-2xl px-4 py-4 text-base font-extrabold shadow-sm transition",
        disabled
          ? "bg-black/20 text-white/70 cursor-not-allowed"
          : "bg-black text-white hover:opacity-95 active:scale-[0.99]"
      )}
    >
      {children}
    </button>
  );
}

/** CinChef: kod ile çizilen SVG maskot */
function ChefCin({
  bubble,
  showBubble,
  onToggleBubble,
  onQuick,
  onFit,
  onNew,
  showActions,
  dock = "left",
}: {
  bubble: string;
  showBubble: boolean;
  onToggleBubble: () => void;
  onQuick?: () => void;
  onFit?: () => void;
  onNew?: () => void;
  showActions?: boolean;
  dock?: "left" | "right";
}) {
  return (
    <div
      className={cx(
        "fixed bottom-3 z-[70] select-none",
        dock === "left" ? "left-3" : "right-3"
      )}
      style={{ pointerEvents: "none" }}
      aria-hidden="false"
    >
      {/* Bubble */}
      {showBubble && (
        <div
          className="mb-2 w-[min(86vw,360px)] rounded-3xl border border-black/10 bg-white/95 p-3 shadow-lg backdrop-blur"
          style={{ pointerEvents: "auto" }}
        >
          <div className="text-[15px] font-extrabold">{bubble}</div>

          {showActions && (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onQuick?.();
                }}
                className="glow-hover rounded-full border border-black/10 bg-white px-3 py-2 text-[13px] font-bold shadow-sm"
              >
                ⚡ Hızlı
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFit?.();
                }}
                className="glow-hover rounded-full border border-black/10 bg-white px-3 py-2 text-[13px] font-bold shadow-sm"
              >
                🧊 Fit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNew?.();
                }}
                className="glow-hover rounded-full border border-black/10 bg-white px-3 py-2 text-[13px] font-bold shadow-sm"
              >
                🎲 Yeni
              </button>
            </div>
          )}

          <div className="mt-2 text-[12px] text-black/60">
            (Balona dokun: gizle/göster)
          </div>
        </div>
      )}

      {/* Cin + tıklanabilir alan */}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleBubble();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onToggleBubble();
        }}
        className="cursor-pointer outline-none"
        style={{ pointerEvents: "auto" }}
        aria-label="Cin Şef"
      >
        <div className="relative h-[170px] w-[170px] sm:h-[190px] sm:w-[190px]">
          {/* gölge */}
          <div className="absolute bottom-0 left-1/2 h-5 w-[120px] -translate-x-1/2 rounded-full bg-black/15 blur-[0.5px]" />
          {/* hover wobble */}
          <div className="cin-bob absolute bottom-2 left-1/2 -translate-x-1/2">
            <svg width="170" height="170" viewBox="0 0 200 200" fill="none">
              {/* gövde */}
              <path
                d="M60 95C60 63 79 45 100 45C121 45 140 63 140 95V150C140 170 124 185 100 185C76 185 60 170 60 150V95Z"
                fill="#1E88FF"
              />
              {/* yüz */}
              <circle cx="100" cy="90" r="52" fill="#76C5FF" />
              {/* gözler */}
              <circle cx="83" cy="86" r="8" fill="#0B1B2B" />
              <circle cx="117" cy="86" r="8" fill="#0B1B2B" />
              {/* ağız */}
              <path
                d="M120 110C114 121 95 124 82 115"
                stroke="#0B1B2B"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* şapka */}
              <path
                d="M62 55C62 40 76 30 100 30C124 30 138 40 138 55V66H62V55Z"
                fill="#FFFFFF"
              />
              <path
                d="M50 66H150C150 76 141 84 130 84H70C59 84 50 76 50 66Z"
                fill="#F2F2F2"
                stroke="#0B1B2B"
                strokeOpacity="0.12"
              />
              {/* şapka bant */}
              <rect x="62" y="56" width="76" height="10" rx="5" fill="#E9E9E9" />
              {/* kol */}
              <path
                d="M140 128C154 125 166 133 166 148C166 162 153 170 140 166"
                fill="#1E88FF"
              />
              <circle cx="150" cy="150" r="6" fill="#0B1B2B" opacity="0.18" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [screen, setScreen] = useState<Screen>("home");

  // Cin opsiyonel + kalıcı
  const [showCin, setShowCin] = useState(true);
  useEffect(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem("showCin") : null;
    if (v === "0") setShowCin(false);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("showCin", showCin ? "1" : "0");
  }, [showCin]);

  // Cin balon göster/gizle
  const [showBubble, setShowBubble] = useState(true);

  // Ses / konuşma
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Tarif modu (Hızlı/Fit/Yeni)
  const [mode, setMode] = useState<Mode>("fit");

  // Kokteyl alkol seviyesi
  const [alcoholLevel, setAlcoholLevel] = useState<AlcoholLevel>("orta");

  // Manuel malzeme
  const [manual, setManual] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);

  // Foto
  const [photoURL, setPhotoURL] = useState<string>("");

  // Sonuç
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecipeResponse | null>(null);

  // “her sayfada konuşsun” giriş cümleleri
  const greetRef = useRef<string>("");

  // Voices yükle (erkek tek)
  useEffect(() => {
    const synth = getSynth();
    if (!synth) return;

    const load = () => {
      const list = synth.getVoices() || [];
      setVoices(list);
      const picked = pickMaleTrVoice(list);
      setVoice(picked || null);
    };

    load();
    synth.onvoiceschanged = load;

    return () => {
      // @ts-ignore
      synth.onvoiceschanged = null;
    };
  }, []);

  const cinBubble = useMemo(() => {
    if (screen === "home") return "Lamba hazır… Cin Asistan burada 😄";
    if (screen === "recipe") return "Tarif modundayız. Malzemeyi yaz/çek, ben şak diye çıkarayım 😎";
    return "Kokteyl (Uzun içim). Etiketi tara, ben karışımı akıtırım 😄";
  }, [screen]);

  // Sayfa giriş konuşması (screen değişince 1 kez)
  useEffect(() => {
    const text =
      screen === "home"
        ? "Hoş geldin! Ben Cin Şef. Foto çek, ben büyüyü yapayım."
        : screen === "recipe"
        ? "Tarif ekranı. Malzemeleri söyle, hızlıca bir tarif çıkarıyorum."
        : "Kokteyl ekranı. Uzun içim modundayız. Etiketi tararsan şahane olur.";
    // Aynı cümleyi tekrar tekrar basmasın
    if (greetRef.current === text) return;
    greetRef.current = text;

    // küçük gecikme: mobilde daha stabil
    const t = setTimeout(() => speakText(text, voice), 250);
    return () => clearTimeout(t);
  }, [screen, voice]);

  function addManual() {
    const items = manual
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!items.length) return;
    setSelected((prev) => {
      const set = new Set(prev);
      for (const it of items) set.add(it);
      return Array.from(set).slice(0, 12);
    });
    setManual("");
  }

  function removeItem(item: string) {
    setSelected((prev) => prev.filter((x) => x !== item));
  }

  async function generate() {
    setLoading(true);
    setResult(null);

    // DEMO: burada normalde API çağırırsın.
    // Şimdilik ekranda düzgün çalışsın diye local üretim yapıyorum.
    try {
      const baseTitle =
        screen === "recipe"
          ? mode === "hizli"
            ? "Hızlı Tarif"
            : mode === "fit"
            ? "Fit Tarif"
            : "Yeni Tarif"
          : "Uzun İçim Kokteyl";

      const ing = selected.length
        ? selected
        : screen === "recipe"
        ? ["yumurta", "domates", "peynir"]
        : ["limon", "soda", "buz"];

      const steps =
        screen === "recipe"
          ? [
              "Malzemeleri hazırla.",
              "Tavayı ısıt, kısa bir ön hazırlık yap.",
              "Karıştır, pişir, servis et.",
            ]
          : [
              "Bardağı buzla doldur.",
              "Malzemeleri sırayla ekle.",
              "Karıştır, üzerine aroma dokunuşu yap.",
            ];

      const summary =
        screen === "recipe"
          ? "Dolaptan çıkanlarla pratik ve lezzetli bir tabak."
          : `Alkol seviyesi: ${alcoholLevel}. Ferah, uzun içim bir karışım.`;

      const fake: RecipeResponse = {
        title: baseTitle,
        summary,
        ingredients: ing.map((x) => `• ${x}`),
        steps: steps.map((s, i) => `${i + 1}) ${s}`),
      };

      setResult(fake);

      speakText(
        screen === "recipe"
          ? "Tarif hazır! İstersen bir tıkla yeniden öneririm."
          : "Kokteyl hazır! Beğenmezsen yeni bir karışım patlatırım.",
        voice
      );
    } finally {
      setLoading(false);
    }
  }

  // Cin aksiyonları: Hızlı/Fit/Yeni
  function cinQuick() {
    // Tarif ekranında hızlı moda al
    setMode("hizli");
    speakText("Hızlı moda aldım. Daha kısa, daha net anlatıyorum.", voice);
  }
  function cinFit() {
    // Tarif ekranında fit moda al
    setMode("fit");
    speakText("Fit moda geçtik. Daha hafif, daha dengeli.", voice);
  }
  function cinNew() {
    // Yeni öner
    setMode("yeni");
    speakText("Yeni öneri modu! Aynı malzemeden farklı bir şey çıkarıyorum.", voice);
    // sonuç varsa yenile
    if (result) generate();
  }

  const pageTitle = useMemo(() => {
    if (screen === "home") return "HeyCinChef";
    if (screen === "recipe") return "Tarif";
    return "Kokteyl (Uzun içim)";
  }, [screen]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* glow + cin anim */}
      <style jsx global>{`
        .glow-hover:hover {
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06), 0 10px 24px rgba(0, 0, 0, 0.12);
          transform: translateY(-1px);
        }
        .cin-bob {
          animation: cinbob 2.8s ease-in-out infinite;
          transform-origin: 50% 100%;
        }
        @keyframes cinbob {
          0% {
            transform: translate(-50%, 0) rotate(-1deg);
          }
          50% {
            transform: translate(-50%, -6px) rotate(1deg);
          }
          100% {
            transform: translate(-50%, 0) rotate(-1deg);
          }
        }
      `}</style>

      {/* Cin toggle */}
      <button
        type="button"
        onClick={() => setShowCin((p) => !p)}
        className="fixed right-3 top-3 z-[80] rounded-full border border-black/10 bg-white/90 px-3 py-2 text-xs font-extrabold shadow-sm backdrop-blur"
      >
        {showCin ? "🧞 Cin’i kapat" : "🧞 Cin’i aç"}
      </button>

      {/* Top container (ASLA ortalama yok) */}
      <div className="mx-auto w-full max-w-md px-4 py-5 pb-48">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xl font-black">{pageTitle}</div>
          {screen !== "home" ? (
            <button
              type="button"
              onClick={() => {
                setScreen("home");
                setResult(null);
                stopSpeaking();
              }}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold shadow-sm"
            >
              Ana Sayfa
            </button>
          ) : (
            <div className="text-xs font-semibold text-black/50">heycinchef.com</div>
          )}
        </div>

        {/* HOME */}
        {screen === "home" && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-black/10 bg-[#f3eadc] p-5 shadow-sm">
              <div className="text-2xl font-black text-black/10">Lamba hazır…</div>
              <div className="mt-2 text-lg font-bold">Cin Asistan burada 😄</div>
              <div className="mt-2 text-black/60">
                Tarif mi, kokteyl mi? Foto çek, ben büyüyü yapayım 👀
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setScreen("recipe")}
                  className="glow-hover flex-1 rounded-3xl bg-black p-5 text-left text-white shadow-sm transition"
                >
                  <div className="text-3xl font-black">Tarif</div>
                  <div className="mt-1 text-white/70">Dolap foto → tara → seç → tarif</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScreen("cocktail")}
                  className="glow-hover flex-1 rounded-3xl border border-black/10 bg-white p-5 text-left shadow-sm transition"
                >
                  <div className="text-3xl font-black text-black/20">Kokteyl</div>
                  <div className="mt-1 text-black/50">Şişe foto → tara → seç → karışım</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RECIPE */}
        {screen === "recipe" && (
          <div className="space-y-4">
            {/* Ses kontrol */}
            <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold">Ses</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      speakText("Ben buradayım. Tarif için hazırım.", voice)
                    }
                    className="rounded-full bg-black px-4 py-2 text-sm font-extrabold text-white"
                  >
                    Konuş
                  </button>
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-extrabold"
                  >
                    Sus
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs font-bold text-black/50">Seçili ses</div>
                <div className="mt-1 rounded-2xl border border-black/10 bg-gray-50 px-4 py-3 text-sm font-semibold text-black/60">
                  {voice ? `${voice.name} (${voice.lang})` : "Ses bulunamadı"}
                </div>
              </div>
            </div>

            {/* Tarif modu */}
            <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="text-sm font-extrabold">Tarif stili</div>
              <div className="mt-3 flex gap-2">
                <Chip
                  active={mode === "hizli"}
                  onClick={() => setMode("hizli")}
                  title="Daha kısa ve hızlı anlatım"
                >
                  ⚡ Hızlı
                </Chip>
                <Chip
                  active={mode === "fit"}
                  onClick={() => setMode("fit")}
                  title="Daha hafif / dengeli"
                >
                  🧊 Fit
                </Chip>
                <Chip
                  active={mode === "yeni"}
                  onClick={() => setMode("yeni")}
                  title="Farklı alternatif öner"
                >
                  🎲 Yeni
                </Chip>
              </div>
              <div className="mt-2 text-xs text-black/55">
                İpucu: “Tarif” ekranı için en mantıklısı Fit. (Senin istediğin gibi ✅)
              </div>
            </div>

            {/* Manuel ekle */}
            <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-lg font-black">Manual ekle</div>
                <div className="text-xs font-bold text-black/40">{selected.length}/12</div>
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="Örn: marul, elma (virgülle)"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-black/30"
                />
                <button
                  type="button"
                  onClick={addManual}
                  className="rounded-2xl bg-black px-4 py-3 text-sm font-extrabold text-white"
                >
                  Ekle
                </button>
              </div>

              <div className="mt-2 text-xs text-black/50">
                İpucu: “buz, limon, soda” gibi virgülle tek seferde ekleyebilirsin.
              </div>

              {selected.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.map((it) => (
                    <button
                      key={it}
                      type="button"
                      onClick={() => removeItem(it)}
                      className="rounded-full border border-black/10 bg-gray-50 px-3 py-1 text-sm font-bold text-black/70"
                      title="Kaldır"
                    >
                      {it} ✕
                    </button>
                  ))}
                </div>
              )}
            </div>

            <PrimaryButton onClick={generate} disabled={loading}>
              {loading ? "Hazırlanıyor…" : "Tarifi üret"}
            </PrimaryButton>

            {/* Sonuç */}
            {result && (
              <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="text-2xl font-black">{result.title}</div>
                <div className="mt-1 text-black/60">{result.summary}</div>

                <div className="mt-4 text-sm font-extrabold">Malzemeler</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-black/80">
                  {result.ingredients.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>

                <div className="mt-4 text-sm font-extrabold">Adımlar</div>
                <ol className="mt-2 list-decimal pl-5 text-sm text-black/80">
                  {result.steps.map((x, i) => (
                    <li key={i} className="mb-1">
                      {x}
                    </li>
                  ))}
                </ol>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => speakText(`${result.title}. ${result.summary}`, voice)}
                    className="rounded-2xl bg-black px-4 py-3 text-sm font-extrabold text-white"
                  >
                    Oku
                  </button>
                  <button
                    type="button"
                    onClick={cinNew}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-extrabold"
                  >
                    Yeni öner
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* COCKTAIL */}
        {screen === "cocktail" && (
          <div className="space-y-4">
            {/* Ses kontrol */}
            <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold">Ses</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      speakText("Kokteyl modundayım. Etiketi tara, başlayalım.", voice)
                    }
                    className="rounded-full bg-black px-4 py-2 text-sm font-extrabold text-white"
                  >
                    Konuş
                  </button>
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-extrabold"
                  >
                    Sus
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs font-bold text-black/50">Seçili ses</div>
                <div className="mt-1 rounded-2xl border border-black/10 bg-gray-50 px-4 py-3 text-sm font-semibold text-black/60">
                  {voice ? `${voice.name} (${voice.lang})` : "Ses bulunamadı"}
                </div>
              </div>
            </div>

            {/* Alkol seviyesi */}
            <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="text-sm font-extrabold">Alkol seviyesi</div>
              <div className="mt-3 flex gap-2">
                <Chip active={alcoholLevel === "hafif"} onClick={() => setAlcoholLevel("hafif")}>
                  hafif
                </Chip>
                <Chip active={alcoholLevel === "orta"} onClick={() => setAlcoholLevel("orta")}>
                  orta
                </Chip>
                <Chip active={alcoholLevel === "sert"} onClick={() => setAlcoholLevel("sert")}>
                  sert
                </Chip>
              </div>
              <div className="mt-2 text-xs text-black/55">
                (Burada Hızlı/Fit/Yeni yok — karışıklık olmasın diye.)
              </div>
            </div>

            {/* Foto alanı */}
            <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="text-sm font-extrabold text-center">Şişe/bardak fotoğrafı yükle</div>

              <div className="mt-3 overflow-hidden rounded-3xl border border-black/10 bg-gray-50">
                {photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoURL} alt="preview" className="h-56 w-full object-cover" />
                ) : (
                  <div className="flex h-56 items-center justify-center text-sm font-semibold text-black/40">
                    Foto seçince önizleme gelir.
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-2">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = URL.createObjectURL(f);
                      setPhotoURL(url);
                      speakText("Foto geldi. Etiketi taramaya hazırım.", voice);
                    }}
                  />
                  <div className="glow-hover cursor-pointer rounded-2xl bg-black px-4 py-4 text-center text-base font-extrabold text-white">
                    Fotoğraf seç
                  </div>
                </label>

                <PrimaryButton
                  onClick={() => {
                    speakText("Etiket tarama şimdilik demo. Yakında gerçek tarama geliyor.", voice);
                  }}
                >
                  Şişeleri tara (etiket okuma)
                </PrimaryButton>
              </div>
            </div>

            <PrimaryButton onClick={generate} disabled={loading}>
              {loading ? "Hazırlanıyor…" : "Kokteyli üret"}
            </PrimaryButton>

            {result && (
              <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="text-2xl font-black">{result.title}</div>
                <div className="mt-1 text-black/60">{result.summary}</div>

                <div className="mt-4 text-sm font-extrabold">İçindekiler</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-black/80">
                  {result.ingredients.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>

                <div className="mt-4 text-sm font-extrabold">Yapılış</div>
                <ol className="mt-2 list-decimal pl-5 text-sm text-black/80">
                  {result.steps.map((x, i) => (
                    <li key={i} className="mb-1">
                      {x}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CinChef (her sayfa) */}
      {showCin && (
        <ChefCin
          bubble={cinBubble}
          showBubble={showBubble}
          onToggleBubble={() => setShowBubble((p) => !p)}
          showActions={screen !== "cocktail"} // kokteylde karışıklık olmasın
          onQuick={cinQuick}
          onFit={cinFit}
          onNew={cinNew}
          dock="left"
        />
      )}

      {/* Alt imza (opsiyonel) */}
      <div className="fixed bottom-2 left-1/2 z-[60] -translate-x-1/2 text-[12px] font-semibold text-black/50">
        Cin Şef © — “Satır satır okurum, sen şaşırırsın.”
      </div>
    </div>
  );
}