"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

// ===== CONFIG =====
const CODE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const CODE_DIGITS = 6;

const GROUPS = [
  { id: 1, name: "Nhóm 1", seed: 2654435761 },
  { id: 2, name: "Nhóm 2", seed: 1597334677 },
  { id: 3, name: "Nhóm 3", seed: 3714946381 },
  { id: 4, name: "Nhóm 4", seed: 2246822519 },
  { id: 5, name: "Nhóm 5", seed: 1013904223 },
  { id: 6, name: "Nhóm 6", seed: 3862272853 },
  { id: 7, name: "Nhóm 7", seed: 1664525 },
];

// ===== LOGIC =====
function hashCode(slotIndex: number, seed: number): string {
  let h = Math.imul(slotIndex, seed);
  h = Math.imul((h >>> 16) ^ h, 0x45d9f3b);
  h = Math.imul((h >>> 16) ^ h, 0x45d9f3b);
  h = (h >>> 16) ^ h;
  const code = Math.abs(h) % Math.pow(10, CODE_DIGITS);
  return code.toString().padStart(CODE_DIGITS, "0");
}

function formatCode(code: string): string {
  // Format as "XXX XXX"
  const mid = Math.floor(code.length / 2);
  return code.slice(0, mid) + " " + code.slice(mid);
}

interface AppState {
  slotIndex: number;
  remainingSeconds: number;
  totalSeconds: number;
}

function computeState(): AppState {
  const now = Date.now();
  const slotIndex = Math.floor(now / CODE_INTERVAL_MS);
  const slotStart = slotIndex * CODE_INTERVAL_MS;
  const remaining = CODE_INTERVAL_MS - (now - slotStart);

  return {
    slotIndex,
    remainingSeconds: Math.max(0, Math.ceil(remaining / 1000)),
    totalSeconds: CODE_INTERVAL_MS / 1000,
  };
}

// ===== CIRCULAR PROGRESS COMPONENT =====
function CircleTimer({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  const size = 32;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = remaining / total;
  const dashOffset = circumference * (1 - progress);
  const isUrgent = remaining <= 30;

  return (
    <svg
      width={size}
      height={size}
      className="countdown-circle flex-shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="countdown-circle-track"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        className={`countdown-circle-progress ${isUrgent ? "urgent" : ""}`}
      />
    </svg>
  );
}

// ===== MAIN COMPONENT =====
export default function AuthCodeDisplay() {
  const [state, setState] = useState<AppState | null>(null);
  const [prevSlotIndex, setPrevSlotIndex] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = useCallback((id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const tick = useCallback(() => {
    const newState = computeState();
    setState((prev) => {
      if (prev && prev.slotIndex !== newState.slotIndex) {
        setPrevSlotIndex(prev.slotIndex);
        setAnimating(true);
        setTimeout(() => setAnimating(false), 400);
      }
      return newState;
    });
  }, []);

  useEffect(() => {
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  const codes = useMemo(() => {
    if (!state) return [];
    return GROUPS.map((group) => ({
      ...group,
      code: hashCode(state.slotIndex, group.seed),
    }));
  }, [state?.slotIndex]);

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const minutes = Math.floor(state.remainingSeconds / 60);
  const seconds = state.remainingSeconds % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md px-4 pt-4 pb-3 border-b border-divider">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Xác thực mã
          </h1>
          <div className="flex items-center gap-2">
            <CircleTimer
              remaining={state.remainingSeconds}
              total={state.totalSeconds}
            />
            <span
              className={`text-sm font-mono font-medium ${
                state.remainingSeconds <= 30 ? "text-red-400" : "text-accent"
              }`}
            >
              {timeStr}
            </span>
          </div>
        </div>
      </header>

      {/* Code List */}
      <div className="flex-1 px-4 pb-8">
        {codes.map((item, index) => (
          <div
            key={item.id}
            className="fade-in border-b border-divider py-4"
            style={{ animationDelay: `${index * 0.04}s` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-muted mb-1">
                  {item.name}
                </p>
                <p
                  className={`text-3xl font-mono font-bold text-accent tracking-wider ${
                    animating ? "code-flip" : ""
                  }`}
                >
                  {formatCode(item.code)}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => handleCopy(item.id, item.code)}
                  className="p-1.5 rounded-lg active:bg-white/10 transition-colors"
                  aria-label={`Copy code ${item.name}`}
                >
                  {copiedId === item.id ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
                <CircleTimer
                  remaining={state.remainingSeconds}
                  total={state.totalSeconds}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
