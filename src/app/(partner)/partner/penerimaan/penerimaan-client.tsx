"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { receiveStockTransfer } from "./actions";
import { Check, Loader2, PackageCheck, Truck } from "lucide-react";

export type StockTransferItem = {
  id: string;
  quantity: number;
  status: string;
  sent_at: string;
  received_at: string | null;
  product: {
    id: string;
    name: string;
    sku: string;
    category: string | null;
  } | null;
};

type Toast = {
  id: number;
  type: "success" | "error";
  message: string;
};

const numberFormatter = new Intl.NumberFormat("id-ID");
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function StatusBadge({ status }: { status: string }) {
  if (status === "DIKIRIM") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 whitespace-nowrap">
        <span className="relative flex size-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
        </span>
        Dalam Perjalanan
      </span>
    );
  }
  if (status === "DITERIMA") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 whitespace-nowrap">
        <Check size={11} className="shrink-0" strokeWidth={3} />
        Telah Diterima
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600 whitespace-nowrap">
      {status}
    </span>
  );
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-sm max-w-sm ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <span className="shrink-0 mt-0.5">
            {toast.type === "success" ? (
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
          </span>
          <span className="leading-snug">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

export default function PenerimaanClient({
  initialTransfers,
}: {
  initialTransfers: StockTransferItem[];
  storeName?: string;
}) {
  const router = useRouter();
  const [transfers, setTransfers] = useState<StockTransferItem[]>(initialTransfers);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  function addToast(type: "success" | "error", message: string) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }

  const handleReceive = useCallback(
    async (transfer: StockTransferItem) => {
      const productName = transfer.product?.name ?? "Produk";
      const confirmed = window.confirm(
        `Konfirmasi penerimaan barang:\n\nProduk: ${productName}\nQty: ${numberFormatter.format(transfer.quantity)} pcs\n\nApakah paket ini sudah Anda terima secara fisik?`
      );
      if (!confirmed) return;

      setProcessingIds((prev) => new Set(prev).add(transfer.id));

      try {
        const result = await receiveStockTransfer(transfer.id);
        if (result.error) {
          setProcessingIds((prev) => {
            const next = new Set(prev);
            next.delete(transfer.id);
            return next;
          });
          addToast("error", `Gagal menerima paket: ${result.error}`);
        } else {
          // Update baris secara optimistik: ubah status jadi DITERIMA
          setTransfers((prev) =>
            prev.map((t) =>
              t.id === transfer.id
                ? { ...t, status: "DITERIMA", received_at: new Date().toISOString() }
                : t
            )
          );
          setProcessingIds((prev) => {
            const next = new Set(prev);
            next.delete(transfer.id);
            return next;
          });
          addToast(
            "success",
            `${productName} (${numberFormatter.format(transfer.quantity)} pcs) berhasil diterima. Stok telah ditambahkan ke toko.`
          );
          router.refresh();
        }
      } catch (err) {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(transfer.id);
          return next;
        });
        addToast("error", err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.");
      }
    },
    [router]
  );

  return (
    <>
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        {transfers.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
              <Truck size={28} className="text-gray-400" />
            </div>
            <p className="text-sm font-black text-gray-900">Belum Ada Riwayat Pengiriman</p>
            <p className="text-xs text-gray-500 text-center max-w-xs">
              Gudang Pusat belum mengirimkan stok ke toko Anda. Hubungi Admin untuk informasi lebih lanjut.
            </p>
          </div>
        ) : (
          /* Tabel Riwayat */
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 shadow-sm">
                <tr>
                  <th scope="col" className="px-4 py-3">Tanggal Pengiriman</th>
                  <th scope="col" className="px-4 py-3">Produk</th>
                  <th scope="col" className="px-4 py-3 text-right">Jumlah</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Tanggal Diterima</th>
                  <th scope="col" className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfers.map((t) => {
                  const isProcessing = processingIds.has(t.id);
                  return (
                    <tr
                      key={t.id}
                      className={`transition-colors ${
                        t.status === "DIKIRIM"
                          ? "hover:bg-amber-50/40"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-gray-900">
                          {dateFormatter.format(new Date(t.sent_at))}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900 truncate max-w-[180px]" title={t.product?.name}>
                          {t.product?.name ?? "—"}
                        </p>
                        <p className="font-mono text-[10px] text-gray-400 mt-0.5">
                          {t.product?.sku ?? ""}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center rounded-md bg-orange-50 border border-orange-200/60 px-2 py-0.5 text-[11px] font-bold text-terracotta-clay">
                          {numberFormatter.format(t.quantity)} pcs
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.received_at ? (
                          <span className="text-xs font-semibold text-emerald-700">
                            {dateFormatter.format(new Date(t.received_at))}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {t.status === "DIKIRIM" ? (
                          <button
                            type="button"
                            onClick={() => void handleReceive(t)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta-clay text-white shadow-sm px-3 py-1.5 text-[11px] font-bold transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 size={11} className="animate-spin shrink-0" />
                                Memproses...
                              </>
                            ) : (
                              <>
                                <PackageCheck size={12} className="shrink-0" />
                                Terima Paket
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                            <Check size={12} className="shrink-0 text-emerald-500" strokeWidth={3} />
                            Selesai
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} />
    </>
  );
}
