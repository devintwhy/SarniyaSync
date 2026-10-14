"use client";

import { useState, useTransition } from "react";
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
    <div className="flex min-w-[270px] max-w-sm flex-col gap-2 py-1">
      <div className="flex items-center gap-2">
        <div className="relative inline-flex items-center">
          <select
            value={status}
            disabled={isPending}
            onChange={(e) => handleStatusChange(e.target.value)}
            aria-label="Pilih status mitra"
            className={`cursor-pointer rounded-full border px-3 py-1 pr-7 text-xs font-semibold outline-none transition-all focus:ring-2 disabled:cursor-wait disabled:opacity-60 ${statusStyles[status]}`}
          >
            <option value="aktif" className="bg-white text-emerald-700">
              ● Aktif
            </option>
            <option value="pending" className="bg-white text-amber-700">
              ▲ Pending
            </option>
            <option value="nonaktif" className="bg-white text-rose-700">
              ✕ Nonaktif
            </option>
          </select>
          <span
            className="pointer-events-none absolute right-2 text-[10px] text-current opacity-70"
            aria-hidden="true"
          >
            {isPending ? "⏳" : "▼"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isPending}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-[#2d3440] hover:bg-slate-50 hover:border-[#cc9787] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
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
          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#2d3440] placeholder:text-[#9ea8b4] outline-none focus:border-[#cc9787] focus:ring-1 focus:ring-[#cc9787]/25 transition-all"
        />
      </div>

      {feedback && (
        <span
          role={feedback.type === "error" ? "alert" : "status"}
          className={`text-[11px] font-medium ${
            feedback.type === "error" ? "text-rose-600" : "text-emerald-600"
          }`}
        >
          {feedback.text}
        </span>
      )}
    </div>
  );
}
