"use client";

import React, { useEffect, useState } from "react";

type Mood = "happy" | "thinking" | "excited" | "warning";

export default function GenieChefAnim({
  mood = "thinking",
}: {
  mood?: Mood;
}) {
  const [explode, setExplode] = useState(false);

  // SAYFA GELİNCE PATLAMA
  useEffect(() => {
    setExplode(true);
    const t = setTimeout(() => setExplode(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const face =
    mood === "happy"
      ? "😄"
      : mood === "excited"
      ? "🤩"
      : mood === "warning"
      ? "😵‍💫"
      : "🤔";

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="relative overflow-hidden rounded-3xl border bg-white p-4 shadow-sm">

        {/* PATLAMA DUMANI */}
        {explode && (
          <>
            <div className="boom boom1" />
            <div className="boom boom2" />
            <div className="boom boom3" />
          </>
        )}

        <div className="relative h-44">

          {/* GENIE */}
          <div className="absolute left-1/2 top-10 -translate-x-1/2">
            <div className={explode ? "genie-pop" : "genie-float"}>
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border bg-white text-3xl shadow">
                {face}

                {/* ŞEF ŞAPKASI */}
                <div className="absolute -top-3 left-1/2 h-3 w-10 -translate-x-1/2 rounded-full bg-black" />
                <div className="absolute -top-6 left-1/2 h-4 w-5 -translate-x-1/2 rounded-t-full bg-black" />
              </div>

              {/* Alt duman */}
              <div className="mx-auto mt-2 h-12 w-12 rounded-full border bg-gray-50 genie-swirl" />
            </div>
          </div>

          {/* LAMBA */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <Lamp />
          </div>
        </div>
      </div>

      <style jsx>{`
        /* NORMAL FLOAT */
        .genie-float {
          animation: floaty 2.4s ease-in-out infinite;
        }

        @keyframes floaty {
          0% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }

        /* PATLAYARAK ÇIKIŞ */
        .genie-pop {
          animation: pop 1.1s cubic-bezier(0.2, 1.4, 0.4, 1);
        }

        @keyframes pop {
          0% {
            transform: scale(0.1) translateY(50px);
            opacity: 0;
          }
          40% {
            transform: scale(1.3) translateY(-20px);
            opacity: 1;
          }
          70% {
            transform: scale(0.9) translateY(0px);
          }
          100% {
            transform: scale(1);
          }
        }

        /* ALT SWIRL */
        .genie-swirl {
          animation: swirl 1.6s linear infinite;
        }

        @keyframes swirl {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* PATLAMA DUMANLARI */
        .boom {
          position: absolute;
          left: 50%;
          top: 60%;
          width: 120px;
          height: 120px;
          border-radius: 999px;
          background: #e5e7eb;
          transform: translate(-50%, -50%);
          animation: boomAnim 1s ease-out forwards;
          opacity: 0.8;
        }

        .boom1 { animation-delay: 0s; }
        .boom2 { animation-delay: 0.1s; }
        .boom3 { animation-delay: 0.2s; }

        @keyframes boomAnim {
          0% {
            transform: translate(-50%, -50%) scale(0.2);
            opacity: 0.9;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function Lamp() {
  return (
    <div className="relative">
      <div className="h-10 w-28 rounded-full border bg-gray-50 shadow-sm" />
      <div className="absolute -right-5 top-2 h-6 w-8 rounded-r-full border bg-gray-50" />
      <div className="absolute left-3 -top-2 h-6 w-10 rounded-full border bg-gray-50" />
    </div>
  );
}
