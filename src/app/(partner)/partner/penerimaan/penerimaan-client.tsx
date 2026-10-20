"use client";

import { useState, useCallback } from "react";
import { receiveStockTransfer } from "./actions";

export type StockTransferItem = {
  id: string;
  quantity: number;
  status: string;
  sent_at: string;
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
    image_url: string | null;
  } | null;
};

type Toast = {
  id: number;
  type: "success" | "error";
  message: string;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("id-ID");

export default function PenerimaanClient({
  initialTransfers,
  storeName,
}: {
  initialTransfers: StockTransferItem[];
  storeName: string;
}) {
  const [transfers, setTransfers] = useState<StockTransferItem[]>(initialTransfers);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const handleTerimaBarang = useCallback(
    async (transfer: StockTransferItem) => {
      const productName = transfer.product?.name ?? "Produk";
      const confirmed = window.confirm(
        `Konfirmasi penerimaan barang:\n\n📦 ${productName}\n🔢 Qty: ${numberFormatter.format(transfer.quantity)} pcs\n\nApakah paket ini sudah Anda terima secara fisik?`
      );
      if (!confirmed) return;

      // Optimistic: hapus dari daftar seketika
      setProcessingIds((prev) => new Set(prev).add(transfer.id));
      setTransfers((prev) => prev.filter((t) => t.id !== transfer.id));

      try {
        const result = await receiveStockTransfer(transfer.id);
        if (result.error) {
          // Rollback: kembalikan ke daftar jika gagal
          setTransfers((prev) => [transfer, ...prev]);
          addToast("error", `Gagal: ${result.error}`);
        } else {
          addToast(
            "success",
            `✅ ${productName} (${numberFormatter.format(transfer.quantity)} pcs) berhasil diterima! Stok telah ditambahkan ke toko.`
          );
        }
      } catch (err) {
        setTransfers((prev) => [transfer, ...prev]);
        addToast("error", err instanceof Error ? err.message : "Penerimaan gagal.");
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(transfer.id);
          return next;
        });
      }
    },
    [addToast]
  );

  return (
    <div className="space-y-4">
      {/* ── Toast Notifications ──────────────────────────────────────────── */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-4 z-[99] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-neu-flat max-w-sm backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <span className="text-sm leading-none shrink-0">
              {toast.type === "success" ? "✅" : "❌"}
            </span>
            <span className="leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* ── Daftar Kiriman ────────────────────────────────────────────────── */}
      {transfers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-[#e0e5ec] py-16 shadow-neu-flat border border-white/40 text-center">
          <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-[#e0e5ec] shadow-neu-flat">
            <svg
              className="size-9 text-terracotta-clay opacity-70"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <p className="text-sm font-black text-[#2d3440]">Tidak Ada Kiriman Masuk</p>
          <p className="mt-1 text-xs text-[#7a8394]">
            Semua paket dari Gudang Pusat untuk <span className="font-semibold">{storeName}</span> sudah diterima.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((transfer) => {
            const isProcessing = processingIds.has(transfer.id);
            const product = transfer.product;

            return (
              <div
                key={transfer.id}
                className="rounded-2xl bg-[#e0e5ec] border border-white/50 shadow-neu-sm overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4 sm:p-5">
                  {/* Ikon Produk / Gambar */}
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#e0e5ec] shadow-neu-sm overflow-hidden">
                    {product?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <svg
                        className="size-7 text-[#a3b1c6]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                  </div>

                  {/* Info Produk */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#2d3440]">
                          {product?.name ?? "Produk tidak dikenal"}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-[#7a8394]">
                          SKU: {product?.sku ?? "-"}
                        </p>
                        {product?.category && (
                          <span className="mt-1 inline-flex items-center rounded-md bg-almond-cream px-2 py-0.5 text-[10px] font-bold text-terracotta-clay shadow-neu-sm">
                            {product.category}
                          </span>
                        )}
                      </div>

                      {/* Badge Status */}
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                        </span>
                        Dalam Perjalanan
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 rounded-xl bg-[#e0e5ec] px-3 py-1.5 shadow-neu-inset-sm">
                        <svg className="size-4 text-terracotta-clay shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                          <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                        </svg>
                        <span className="text-xs font-black text-[#2d3440]">
                          {numberFormatter.format(transfer.quantity)} pcs
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#7a8394]">
                        <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>Dikirim: {dateFormatter.format(new Date(transfer.sent_at))}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tombol Terima */}
                <div className="border-t border-[#a3b1c6]/20 bg-[#e0e5ec]/50 px-4 py-3 sm:px-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleTerimaBarang(transfer)}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-terracotta-clay to-dusty-rose px-5 py-2 text-xs font-bold text-white shadow-neu-sm transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isProcessing ? (
                      <>
                        <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Terima Paket
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
