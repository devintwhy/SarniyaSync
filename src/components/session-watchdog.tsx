"use client";

/**
 * SessionWatchdog — Auto-logout saat tidak ada aktivitas selama durasi tertentu.
 *
 * Cara kerja:
 *  1. Pasang event listener untuk aktivitas pengguna (mouse, keyboard, touch, scroll).
 *  2. Setiap ada aktivitas, timer di-reset.
 *  3. Jika timer habis tanpa aktivitas → panggil supabase.auth.signOut() + redirect login.
 *  4. Di 60 detik terakhir, tampilkan countdown modal agar pengguna bisa memperpanjang sesi.
 *
 * Penggunaan di layout.tsx (atau di komponen yang selalu ter-render):
 *   <SessionWatchdog idleMinutes={480} /> // 8 jam shift
 *   <SessionWatchdog idleMinutes={30} />  // 30 menit untuk kasir
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

type SessionWatchdogProps = {
  /** Jumlah menit tidak aktif sebelum logout otomatis. Default: 480 (8 jam). */
  idleMinutes?: number;
  /** Jumlah detik sebelum logout di mana countdown dialog ditampilkan. Default: 60. */
  warningSeconds?: number;
};

// Path yang dikecualikan — tidak perlu memantau aktivitas di halaman login
const EXCLUDED_PATHS = ["/login"];

export default function SessionWatchdog({
  idleMinutes = 480,
  warningSeconds = 60,
}: SessionWatchdogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [countdown, setCountdown] = useState<number | null>(null); // null = dialog tersembunyi
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isExcluded = EXCLUDED_PATHS.some((p) => pathname.startsWith(p));

  const idleMs = idleMinutes * 60 * 1000;
  const warnMs = idleMs - warningSeconds * 1000;

  // ── Logout ────────────────────────────────────────────────────────────────
  const doLogout = useCallback(async () => {
    clearTimeout(idleTimerRef.current ?? undefined);
    clearTimeout(warnTimerRef.current ?? undefined);
    clearInterval(countdownIntervalRef.current ?? undefined);
    setCountdown(null);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Lanjutkan redirect meski signOut gagal
    }
    router.replace("/login?reason=idle");
  }, [router]);

  // ── Reset timer saat ada aktivitas ────────────────────────────────────────
  const resetTimer = useCallback(() => {
    if (isExcluded) return;

    // Sembunyikan warning jika sedang tampil
    if (countdown !== null) {
      setCountdown(null);
      clearInterval(countdownIntervalRef.current ?? undefined);
    }

    clearTimeout(idleTimerRef.current ?? undefined);
    clearTimeout(warnTimerRef.current ?? undefined);

    // Timer peringatan (warnMs sebelum logout)
    if (warnMs > 0) {
      warnTimerRef.current = setTimeout(() => {
        setCountdown(warningSeconds);
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownIntervalRef.current ?? undefined);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }, warnMs);
    }

    // Timer logout utama
    idleTimerRef.current = setTimeout(() => {
      void doLogout();
    }, idleMs);
  }, [isExcluded, countdown, warnMs, warningSeconds, idleMs, doLogout]);

  // ── Pasang event listener aktivitas ───────────────────────────────────────
  useEffect(() => {
    if (isExcluded) return;

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
      "click",
      "focus",
    ];

    const handleActivity = () => resetTimer();

    // Mulai timer pertama kali
    resetTimer();

    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      clearTimeout(idleTimerRef.current ?? undefined);
      clearTimeout(warnTimerRef.current ?? undefined);
      clearInterval(countdownIntervalRef.current ?? undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExcluded, pathname]);

  // ── Jika halaman dikecualikan, render nothing ──────────────────────────────
  if (isExcluded) return null;

  // ── Warning Dialog ────────────────────────────────────────────────────────
  if (countdown === null) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
      aria-describedby="idle-warning-desc"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#173b32]/60 backdrop-blur-sm"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-[#e1e7e0] bg-white p-6 shadow-2xl shadow-[#173b32]/30">
        {/* Ikon peringatan */}
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[#fff9ef]">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              stroke="#b45309"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2
          id="idle-warning-title"
          className="text-lg font-semibold text-[#173b32]"
        >
          Sesi akan berakhir
        </h2>
        <p id="idle-warning-desc" className="mt-2 text-sm text-[#68756e]">
          Tidak ada aktivitas terdeteksi. Anda akan otomatis keluar dalam:
        </p>

        {/* Countdown */}
        <p
          aria-live="assertive"
          aria-atomic="true"
          className="my-5 text-center text-5xl font-bold tabular-nums text-[#173b32]"
        >
          {countdown}
          <span className="ml-1 text-xl font-normal text-[#68756e]">dtk</span>
        </p>

        {/* Tombol aksi */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={resetTimer}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#285b46] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1f4938] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e9a75]"
          >
            Saya masih aktif — Lanjutkan
          </button>
          <button
            type="button"
            onClick={() => void doLogout()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d9e1d9] px-4 text-sm font-medium text-[#52645a] transition-colors hover:bg-[#f7f9f6]"
          >
            Keluar sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
