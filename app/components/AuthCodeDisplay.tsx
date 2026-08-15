"use client";

import { useState, useEffect, useCallback } from "react";

// ===== LOGIC: Generate deterministic 3-digit code from time slot =====
// Uses a simple hash of the 10-minute slot index to produce a code 000-999.
// All users compute the same slot index at the same time → same code.

const CODE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes


function hashSlotIndex(slotIndex: number): number {
  // Simple deterministic hash: multiply by a prime, mix bits, mod 1000
  let h = slotIndex * 2654435761; // Knuth multiplicative hash
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return Math.abs(h) % 1000;
}

function getCurrentSlotIndex(): number {
  return Math.floor(Date.now() / CODE_INTERVAL_MS);
}

function getSlotStartTime(slotIndex: number): number {
  return slotIndex * CODE_INTERVAL_MS;
}

function getCodeForSlot(slotIndex: number): string {
  return hashSlotIndex(slotIndex).toString().padStart(3, "0");
}

// ===== COMPONENT =====

interface CodeState {
  currentCode: string;
  remainingSeconds: number;
  totalSeconds: number;
  slotIndex: number;
}

function computeState(): CodeState {
  const now = Date.now();
  const slotIndex = getCurrentSlotIndex();
  const slotStart = getSlotStartTime(slotIndex);
  const remaining = CODE_INTERVAL_MS - (now - slotStart);

  return {
    currentCode: getCodeForSlot(slotIndex),
    remainingSeconds: Math.max(0, Math.ceil(remaining / 1000)),
    totalSeconds: CODE_INTERVAL_MS / 1000,
    slotIndex,
  };
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export default function AuthCodeDisplay() {
  const [state, setState] = useState<CodeState | null>(null);
  const [prevSlotIndex, setPrevSlotIndex] = useState<number | null>(null);
  const [codeAnimKey, setCodeAnimKey] = useState(0);

  const tick = useCallback(() => {
    const newState = computeState();
    setState((prev) => {
      if (prev && prev.slotIndex !== newState.slotIndex) {
        // Code just changed — trigger animation
        setCodeAnimKey((k) => k + 1);
      }
      return newState;
    });
    if (prevSlotIndex === null) {
      setPrevSlotIndex(newState.slotIndex);
    }
  }, [prevSlotIndex]);

  useEffect(() => {
    tick(); // Initial
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const progressPercent =
    ((state.totalSeconds - state.remainingSeconds) / state.totalSeconds) * 100;

  const isUrgent = state.remainingSeconds <= 60;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 relative overflow-hidden">
      {/* Decorative floating particles */}
      <FloatingParticles />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">


        {/* Current Code Card */}
        <div
          key={codeAnimKey}
          className="fade-in-up w-full rounded-2xl border border-card-border bg-card-bg backdrop-blur-xl p-8 sm:p-10 glow-pulse"
        >
          {/* Code label */}
          <div className="text-center mb-2">
            <span className="text-xs font-semibold tracking-widest text-accent uppercase">
              Mã hiện tại
            </span>
          </div>

          {/* Code digits */}
          <div className="flex justify-center items-center gap-3 sm:gap-4 my-6">
            {state.currentCode.split("").map((digit, i) => (
              <div
                key={`${codeAnimKey}-${i}`}
                className="fade-in-up w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/25 flex items-center justify-center"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="text-5xl sm:text-6xl font-mono font-bold text-foreground tracking-wider">
                  {digit}
                </span>
              </div>
            ))}
          </div>

          {/* Countdown */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-text-muted">Thời gian còn lại</span>
              <span
                className={`text-sm font-mono font-semibold ${
                  isUrgent ? "text-red-400" : "text-accent"
                }`}
              >
                {formatTime(state.remainingSeconds)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  isUrgent
                    ? "bg-gradient-to-r from-red-500 to-orange-400"
                    : "countdown-bar"
                }`}
                style={{ width: `${100 - progressPercent}%` }}
              />
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}

// ===== Floating Particles Background =====
function FloatingParticles() {
  // Fixed set of particles with deterministic positions
  const particles = [
    { size: 4, left: 10, top: 20, duration: 8, delay: 0 },
    { size: 6, left: 25, top: 60, duration: 12, delay: 2 },
    { size: 3, left: 45, top: 30, duration: 10, delay: 4 },
    { size: 5, left: 70, top: 70, duration: 9, delay: 1 },
    { size: 4, left: 85, top: 15, duration: 11, delay: 3 },
    { size: 7, left: 55, top: 85, duration: 13, delay: 5 },
    { size: 3, left: 30, top: 45, duration: 7, delay: 6 },
    { size: 5, left: 90, top: 50, duration: 14, delay: 2 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle absolute rounded-full bg-accent/20"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
