"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export type TransferRow = {
  id: string;
  quantity: number;
  status: string;
  sent_at: string;
  received_at: string | null;
  notes: string | null;
  product: { id: string; name: string; sku: string } | null;
  store: { id: string; name: string; city: string | null } | null;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});
const numFormatter = new Intl.NumberFormat("id-ID");

function StatusBadge({ status }: { status: string }) {
  if (status === "DIKIRIM") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
        </span>
        Dalam Perjalanan
      </span>
    );
  }
  if (status === "DITERIMA") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
        <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Telah Diterima
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
      {status}
    </span>
  );
}

export default function PengirimanClient({
  initialTransfers,
}: {
  initialTransfers: TransferRow[];
}) {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterStore, setFilterStore] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Unique stores for filter dropdown
  const stores = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of initialTransfers) {
      if (t.store) map.set(t.store.id, t.store.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [initialTransfers]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return initialTransfers.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterStore !== "all" && t.store?.id !== filterStore) return false;
      if (q) {
        const matchProd = t.product?.name.toLowerCase().includes(q) || t.product?.sku.toLowerCase().includes(q);
        const matchStore = t.store?.name.toLowerCase().includes(q);
        if (!matchProd && !matchStore) return false;
      }
      return true;
    });
  }, [initialTransfers, filterStatus, filterStore, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari produk / toko mitra..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-lg bg-gray-50 border border-gray-200 px-3 pl-8 text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
            />
            <svg className="size-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-lg bg-gray-50 border border-gray-200 px-3 text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
          >
            <option value="all">Semua Status</option>
            <option value="DIKIRIM">Dalam Perjalanan</option>
            <option value="DITERIMA">Telah Diterima</option>
            <option value="DIBATALKAN">Dibatalkan</option>
          </select>

          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="h-9 rounded-lg bg-gray-50 border border-gray-200 px-3 text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
          >
            <option value="all">Semua Toko ({stores.length})</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => router.refresh()}
            title="Refresh data"
            className="ml-auto h-9 px-3 rounded-lg bg-white border border-gray-200 shadow-sm text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-1.5"
          >
            <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
            Refresh
          </button>
        </div>

        <p className="mt-2 text-[11px] text-gray-500">
          Menampilkan <strong className="text-gray-900">{filtered.length}</strong> dari {initialTransfers.length} kiriman
        </p>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="size-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="1" />
                <path d="M16 8h4l3 3v5h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <p className="text-sm font-black text-gray-900">Tidak ada data pengiriman</p>
            <p className="text-xs text-gray-500">Belum ada kiriman yang sesuai filter.</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 shadow-sm">
                <tr>
                  <th scope="col" className="px-4 py-3">Tanggal Kirim</th>
                  <th scope="col" className="px-4 py-3">Tujuan (Toko Mitra)</th>
                  <th scope="col" className="px-4 py-3">Produk & Qty</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Tanggal Diterima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-almond-cream/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-semibold text-[#2d3440]">
                        {dateFormatter.format(new Date(t.sent_at))}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-bold text-[#2d3440] truncate max-w-[160px]">
                        {t.store?.name ?? "—"}
                      </p>
                      {t.store?.city && (
                        <p className="text-[10px] text-[#7a8394]">{t.store.city}</p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-bold text-[#2d3440] truncate max-w-[180px]" title={t.product?.name}>
                        {t.product?.name ?? "—"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#7a8394]">
                          {t.product?.sku ?? ""}
                        </span>
                        <span className="inline-flex items-center rounded-lg bg-orange-50 border border-orange-200/60 px-2 py-0.5 text-[11px] font-black text-terracotta-clay">
                          {numFormatter.format(t.quantity)} pcs
                        </span>
                      </div>
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
                        <span className="text-[11px] text-[#a3b1c6]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
