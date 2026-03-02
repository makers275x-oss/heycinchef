"use client";

import React from "react";
import Image from "next/image";

type Mood = "happy" | "thinking" | "excited" | "warning";

export default function ChefBubble({
  mood = "excited",
  text,
  name = "Cin Şef Cino",
}: {
  mood?: Mood;
  text: string;
  name?: string;
}) {
  const badge =
    mood === "warning" ? "😵‍💫" : mood === "thinking" ? "🤔" : mood === "happy" ? "😄" : "✨";

  return (
    <div className="relative rounded-3xl border bg-white shadow-sm overflow-hidden">
      {/* Top small header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white">
          🪔
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-xs text-gray-500">Lamba serviste {badge}</div>
        </div>
      </div>

      {/* Big speech */}
      <div className="px-4 pb-4">
        <div className="rounded-3xl bg-[#f3eadf] px-4 py-4">
          <div className="text-2xl font-extrabold text-gray-900">Şak! Tarif hazır 🫰</div>
          <div className="mt-1 text-sm text-gray-800">{text}</div>
        </div>
      </div>
    </div>
  );
}
