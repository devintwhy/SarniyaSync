"use client";

import { useState, useMemo } from "react";
import StatusSelect from "./status-select";

type StoreItem = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  is_active: boolean;
  status: string;
  status_message: string | null;
  owner: { full_name: string } | { full_name: string }[] | null;
};

type MitraTableClientProps = {
  stores: StoreItem[];
};

export default function MitraTableClient({ stores }: MitraTableClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredStores = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return stores.filter((store) => {
      const ownerName = Array.isArray(store.owner)
        ? store.owner[0]?.full_name ?? ""
        : store.owner?.full_name ?? "";

      const currentStatus = (store.status || (store.is_active ? "aktif" : "pending")).toLowerCase();

      // Filter status
      if (filterStatus !== "all" && currentStatus !== filterStatus) {
        return false;
      }

      // Filter search term
      if (!q) return true;

      const matchName = store.name.toLowerCase().includes(q);
      const matchOwner = ownerName.toLowerCase().includes(q);
      const matchPhone = (store.phone ?? "").toLowerCase().includes(q);
      const matchLocation = `${store.address ?? ""} ${store.city ?? ""}`.toLowerCase().includes(q);

      return matchName || matchOwner || matchPhone || matchLocation;
    });
  }, [stores, searchTerm, filterStatus]);

  return (
    <div className="space-y-3">
      {/* ── Search Bar & Filter Toolbar ──────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-[#a3b1c6]/20 bg-[#e0e5ec]">
        <div className="relative flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7a8394]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama toko, pemilik, kota, no telepon..."
            style={{
              boxShadow:
                "inset 3px 3px 6px rgba(163, 177, 198, 0.65), inset -3px -3px 6px rgba(255, 255, 255, 0.85)",
            }}
            className="w-full h-9 rounded-xl border-none bg-[#e0e5ec] py-1.5 pl-9 pr-8 text-xs font-medium text-[#2d3440] outline-none transition-all placeholder:text-[#8f98a8] focus:ring-1 focus:ring-dusty-rose/50"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs font-bold text-[#7a8394] hover:text-terracotta-clay"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="filter-status" className="text-[11px] font-bold uppercase tracking-wider text-[#576071]">
            Status:
          </label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-xl border-none bg-[#e0e5ec] px-3 text-xs font-bold text-[#2d3440] shadow-neu-sm outline-none transition-all focus:ring-1 focus:ring-dusty-rose/40 cursor-pointer"
          >
            <option value="all">Semua Status ({stores.length})</option>
            <option value="aktif">Aktif</option>
            <option value="pending">Pending</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
          <span className="rounded-full bg-almond-cream px-2.5 py-0.5 text-[11px] font-bold text-terracotta-clay shadow-neu-sm">
            {filteredStores.length} dari {stores.length} toko
          </span>
        </div>
      </div>

      {/* ── Tabel Toko Mitra ─────────────────────────────────────────────── */}
      {filteredStores.length === 0 ? (
        <div className="px-4 py-10 text-center text-xs font-medium text-[#7a8394]">
          Tidak ada toko mitra yang cocok dengan pencarian{" "}
          {searchTerm ? <span className="font-bold text-terracotta-clay">"{searchTerm}"</span> : ""}.
        </div>
      ) : (
        <div className="overflow-x-auto px-1 pb-2">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-[#a3b1c6]/25 text-[11px] font-bold uppercase tracking-wider text-[#576071]">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-black">Nama Toko</th>
                <th scope="col" className="px-4 py-2.5 font-black">Pemilik</th>
                <th scope="col" className="px-4 py-2.5 font-black">Kontak</th>
                <th scope="col" className="px-4 py-2.5 font-black">Lokasi</th>
                <th scope="col" className="px-4 py-2.5 font-black">Kontrol Status &amp; Pesan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#a3b1c6]/20">
              {filteredStores.map((store) => {
                const currentStatus = (store.status || (store.is_active ? "aktif" : "pending")) as
                  | "aktif"
                  | "nonaktif"
                  | "pending";

                const ownerName = Array.isArray(store.owner)
                  ? store.owner[0]?.full_name ?? "—"
                  : store.owner?.full_name ?? "—";

                return (
                  <tr key={store.id} className="transition-colors hover:bg-almond-cream/25">
                    <td className="px-4 py-2.5 font-medium text-[#2d3440]">
                      <div className="font-bold text-[#2d3440]">{store.name}</div>
                      <div className="text-[10px] font-medium text-[#7a8394]">ID: {store.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-[#2d3440]">{ownerName}</td>
                    <td className="px-4 py-2.5 font-medium text-[#576071]">{store.phone || "—"}</td>
                    <td className="px-4 py-2.5 font-medium text-[#576071]">
                      {store.city || store.address || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusSelect
                        storeId={store.id}
                        initialStatus={currentStatus}
                        initialMessage={store.status_message}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
