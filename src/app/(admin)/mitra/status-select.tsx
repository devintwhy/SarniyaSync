"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateMitraStatus, type MitraStatus } from "./actions";

type StatusSelectProps = {
  storeId: string;
  initialStatus: string;
  initialMessage?: string | null;
};

export default function StatusSelect({
  storeId,
  initialStatus,
  initialMessage,
}: StatusSelectProps) {
  const normalizedInitial = (["aktif", "nonaktif", "pending"].includes(initialStatus)
    ? initialStatus
    : "pending") as MitraStatus;

  const [status, setStatus] = useState<MitraStatus>(normalizedInitial);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const statusStyles: Record<MitraStatus, string> = {
    aktif: "border-emerald-200 bg-emerald-50 text-emerald-700 focus:ring-emerald-300",
    nonaktif: "border-rose-200 bg-rose-50 text-rose-700 focus:ring-rose-300",
    pending: "border-amber-200 bg-amber-50 text-amber-700 focus:ring-amber-300",
  };

  function handleSave(newStatus = status, newMsg = message) {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateMitraStatus(storeId, newStatus, newMsg);
      if (res?.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setFeedback({ type: "success", text: "Status & pesan berhasil disimpan!" });
        setTimeout(() => setFeedback(null), 3000);
      }
    });
  }

  function handleStatusChange(selectedStatus: string) {
    setStatus(selectedStatus as MitraStatus);
    handleSave(selectedStatus as MitraStatus, message);
  }

  return (
    <div className="flex min-w-[270px] max-w-sm flex-col gap-2.5 py-1">
      <div className="flex items-center gap-2.5">
        <div className="relative inline-flex items-center">
          <select
            value={status}
            disabled={isPending}
            onChange={(e) => handleStatusChange(e.target.value)}
            aria-label="Pilih status mitra"
            className={`cursor-pointer rounded-lg border px-3 py-1.5 pr-8 text-xs font-semibold shadow-sm outline-none transition-all focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay disabled:cursor-wait disabled:opacity-60 ${statusStyles[status]}`}
          >
            <option value="aktif" className="bg-white text-emerald-800">
              ● Aktif
            </option>
            <option value="pending" className="bg-white text-amber-800">
              ▲ Pending
            </option>
            <option value="nonaktif" className="bg-white text-rose-800">
              ✕ Nonaktif
            </option>
          </select>
          <span
            className="pointer-events-none absolute right-2.5 text-[10px] text-current opacity-70 font-bold"
            aria-hidden="true"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "▼"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isPending}
          className="rounded-lg bg-terracotta-clay px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Menyimpan..." : "Simpan Pesan"}
        </button>
      </div>

      <div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Pesan kustom jika pending/nonaktif..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-medium text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
        />
      </div>

      {feedback && (
        <span
          role={feedback.type === "error" ? "alert" : "status"}
          className={`text-[11px] font-bold ${
            feedback.type === "error" ? "text-rose-600" : "text-emerald-700"
          }`}
        >
          {feedback.text}
        </span>
      )}
    </div>
  );
}
