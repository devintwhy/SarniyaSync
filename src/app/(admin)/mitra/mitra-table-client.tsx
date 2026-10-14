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
    <div className="space-y-4">
      {/* ── Search Bar & Filter Toolbar ──────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7a8394]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama toko, pemilik, kota, nomor telepon..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-[#2d3440] outline-none transition-all placeholder:text-[#9ea8b4] focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-[#7a8394] hover:text-[#2d3440]"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-status" className="text-xs font-medium text-[#576071]">
            Status:
          </label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-[#2d3440] outline-none focus:border-[#cc9787]"
          >
            <option value="all">Semua Status ({stores.length})</option>
            <option value="aktif">Aktif</option>
            <option value="pending">Pending</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
          <span className="text-xs font-medium text-[#cc9787] ml-2">
            {filteredStores.length} dari {stores.length} toko
          </span>
        </div>
      </div>

      {/* ── Tabel Toko Mitra ─────────────────────────────────────────────── */}
      {filteredStores.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-[#6d7687]">
          Tidak ada toko mitra yang cocok dengan pencarian{" "}
          {searchTerm ? <span className="font-semibold text-[#2d3440]">"{searchTerm}"</span> : ""}.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#f0f2f5] text-xs uppercase tracking-wider text-[#576071]">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-bold">Nama Toko</th>
                <th scope="col" className="px-5 py-3.5 font-bold">Pemilik</th>
                <th scope="col" className="px-5 py-3.5 font-bold">Kontak</th>
                <th scope="col" className="px-5 py-3.5 font-bold">Lokasi</th>
                <th scope="col" className="px-5 py-3.5 font-bold">Kontrol Status &amp; Pesan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStores.map((store) => {
                const currentStatus = (store.status || (store.is_active ? "aktif" : "pending")) as
                  | "aktif"
                  | "nonaktif"
                  | "pending";

                const ownerName = Array.isArray(store.owner)
                  ? store.owner[0]?.full_name ?? "—"
                  : store.owner?.full_name ?? "—";

                return (
                  <tr key={store.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-medium text-[#2d3440]">
                      <div className="font-semibold">{store.name}</div>
                      <div className="text-xs text-[#7a8394]">ID: {store.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-5 py-4 text-[#2d3440]">{ownerName}</td>
                    <td className="px-5 py-4 text-[#576071]">{store.phone || "—"}</td>
                    <td className="px-5 py-4 text-[#576071]">
                      {store.city || store.address || "—"}
                    </td>
                    <td className="px-5 py-4">
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
