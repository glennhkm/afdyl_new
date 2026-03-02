"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

// ─── Break Notification SFX (gentle bell chime) ─────────────────────────────

let breakAudioCtx: AudioContext | null = null;

function getBreakAudioCtx(): AudioContext {
  if (!breakAudioCtx || breakAudioCtx.state === "closed") {
    breakAudioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  if (breakAudioCtx.state === "suspended") {
    breakAudioCtx.resume();
  }
  return breakAudioCtx;
}

function playBreakTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.15,
  delay: number = 0,
) {
  try {
    const ctx = getBreakAudioCtx();
    const t = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.02);
    gain.gain.setValueAtTime(volume, t + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  } catch {
    /* fail silently */
  }
}

/** Gentle wind-chime bell — three soft ascending notes */
function playBreakNotificationSFX() {
  // Soft bell: C6 → E6 → G6 (gentle, not startling)
  playBreakTone(1046.5, 0.35, "sine", 0.12, 0);
  playBreakTone(1318.51, 0.35, "sine", 0.14, 0.25);
  playBreakTone(1567.98, 0.5, "sine", 0.16, 0.5);
  // Tiny shimmer
  try {
    const ctx = getBreakAudioCtx();
    const t = ctx.currentTime + 0.8;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(2093, t);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  } catch {
    /* */
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BREAK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const GAME_MODULES = [
  { title: "Tebak Hijaiyah", icon: "RiGamepadLine", emoji: "🎯" },
  { title: "Tangkap Hijaiyah", icon: "RiCameraLine", emoji: "🖐️" },
  { title: "Jejak Hijaiyah", icon: "RiEditLine", emoji: "✏️" },
  { title: "Latihan Lafal", icon: "RiMicLine", emoji: "🎤" },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface BreakReminderProps {
  /** Where to navigate on "Istirahat" — defaults to /guru/siswa */
  backUrl?: string;
}

const BreakReminder: React.FC<BreakReminderProps> = ({
  backUrl = "/guru/siswa",
}) => {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sfxPlayedRef = useRef(false);

  // Start / restart the interval
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    sfxPlayedRef.current = false;
    timerRef.current = setInterval(() => {
      setIsVisible(true);
    }, BREAK_INTERVAL_MS);
  }, []);

  // On mount → start timer; on unmount → clear
  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breakAudioCtx && breakAudioCtx.state !== "closed") {
        breakAudioCtx.close().catch(() => {});
        breakAudioCtx = null;
      }
    };
  }, [startTimer]);

  // When modal appears → animate in + play SFX
  useEffect(() => {
    if (isVisible) {
      // Small delay so the backdrop appears first, then modal bounces in
      const raf = requestAnimationFrame(() => {
        setAnimateIn(true);
      });
      // Play notification sound only once per show
      if (!sfxPlayedRef.current) {
        sfxPlayedRef.current = true;
        playBreakNotificationSFX();
      }
      return () => cancelAnimationFrame(raf);
    }
  }, [isVisible]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isVisible]);

  // Dismiss & restart timer
  const handleContinue = useCallback(() => {
    setAnimateIn(false);
    setTimeout(() => {
      setIsVisible(false);
      sfxPlayedRef.current = false;
      startTimer();
    }, 200);
  }, [startTimer]);

  // Go to break → navigate to module menu with game highlight
  const handleTakeBreak = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    router.push(`${backUrl}?highlight=games`);
  }, [router, backUrl]);

  if (!isVisible) return null;

  return (
    <>
      {/* Scoped animations */}
      <style jsx global>{`
        @keyframes break-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes break-bounce-in {
          0% { opacity: 0; transform: scale(0.7) translateY(20px); }
          50% { opacity: 1; transform: scale(1.03) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes break-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes break-pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.15; }
          100% { transform: scale(1); opacity: 0.4; }
        }
        @keyframes break-card-stagger {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-9999 flex items-center justify-center px-4"
        style={{ animation: "break-backdrop-in 0.3s ease-out forwards" }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <div
          className={`
            relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden
            ${animateIn ? "" : "opacity-0"}
          `}
          style={
            animateIn
              ? { animation: "break-bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }
              : undefined
          }
        >
          {/* Top decorative gradient */}
          <div className="h-2 bg-linear-to-r from-amber-400 via-orange-400 to-amber-500" />

          {/* Content */}
          <div className="px-6 pt-5 pb-6">
            {/* Illustration area */}
            <div className="flex flex-col items-center mb-4">
              {/* Animated clock/rest icon */}
              <div className="relative w-20 h-20 mb-3">
                {/* Pulse ring */}
                <div
                  className="absolute inset-0 rounded-full bg-amber-400/30"
                  style={{ animation: "break-pulse-ring 2s ease-in-out infinite" }}
                />
                {/* Icon circle */}
                <div
                  className="relative w-20 h-20 bg-linear-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
                  style={{ animation: "break-float 3s ease-in-out infinite" }}
                >
                  <span className="text-3xl">⏰</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-800 text-center">
                Waktunya Istirahat! 🌟
              </h2>
              <p className="text-sm text-gray-500 text-center mt-1.5 leading-relaxed max-w-xs">
                Sudah 5 menit belajar, yuk istirahat sebentar agar tetap semangat dan fokus!
              </p>
            </div>

            {/* Game suggestions */}
            <div className="bg-amber-50 rounded-2xl p-3 mb-4 border border-amber-200/60">
              <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                <span>🎮</span> Sambil istirahat, coba mainkan:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {GAME_MODULES.map((game, i) => (
                  <div
                    key={game.title}
                    className="flex items-center gap-1.5 bg-white rounded-xl px-2.5 py-2 border border-amber-200/40 shadow-sm"
                    style={{
                      animation: animateIn
                        ? `break-card-stagger 0.3s ease-out ${0.4 + i * 0.08}s both`
                        : undefined,
                    }}
                  >
                    <span className="text-base">{game.emoji}</span>
                    <span className="text-xs font-medium text-gray-700 leading-tight">
                      {game.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2.5">
              {/* Primary: take a break */}
              <button
                onClick={handleTakeBreak}
                className="w-full py-3 rounded-2xl bg-linear-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Icon name="RiGamepadLine" className="w-5 h-5" />
                Istirahat & Bermain
              </button>

              {/* Secondary: continue learning */}
              <button
                onClick={handleContinue}
                className="w-full py-2.5 rounded-2xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Icon name="RiBookOpenLine" className="w-4 h-4" />
                Lanjutkan Belajar
              </button>
            </div>

            {/* Bottom note */}
            <p className="text-center text-[10px] text-gray-400 mt-3">
              Pengingat akan muncul lagi dalam 5 menit
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default BreakReminder;
