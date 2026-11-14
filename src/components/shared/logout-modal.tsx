"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut } from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoggingOut?: boolean;
}

export default function LogoutModal({
  isOpen,
  onClose,
  onConfirm,
  isLoggingOut = false,
}: LogoutModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoggingOut) {
          onClose();
        }
      }}
    >
      <div className="relative bg-white p-6 rounded-xl shadow-xl w-[90%] max-w-sm z-[101] text-center space-y-4 border border-gray-100">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
          <LogOut className="size-6 -scale-x-100" />
        </div>

        <div>
          <h3
            id="logout-modal-title"
            className="text-base font-bold text-gray-900"
          >
            Keluar dari SarniyaSync?
          </h3>
          <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
            Sesi Anda akan berakhir. Silakan masuk kembali menggunakan email dan kata sandi Anda untuk mengakses sistem.
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="flex-1 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 active:scale-95"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="flex-1 rounded-xl bg-[#9D5C4C] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#864c3e] disabled:opacity-60 active:scale-95"
          >
            {isLoggingOut ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </div>
    </div>
  );

  if (mounted && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}

