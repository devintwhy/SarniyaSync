"use client";

import { useState, useMemo, useEffect } from "react";
import { MessageSquare, X, Send, AlertCircle, Check } from "lucide-react";
import { updateMitraStatus, type MitraStatus } from "./actions";

export type StoreItem = {
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
  const [storesList, setStoresList] = useState<StoreItem[]>(stores);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // State untuk Modal Pesan
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMitra, setSelectedMitra] = useState<StoreItem | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // State untuk status update inline di tabel
  const [updatingStoreId, setUpdatingStoreId] = useState<string | null>(null);

  // Sinkronisasi data ketika prop stores berubah
  useEffect(() => {
    setStoresList(stores);
  }, [stores]);

  const statusStyles: Record<MitraStatus, string> = {
    aktif: "border-emerald-200 bg-emerald-50 text-emerald-700 focus:ring-emerald-300",
    nonaktif: "border-rose-200 bg-rose-50 text-rose-700 focus:ring-rose-300",
    pending: "border-amber-200 bg-amber-50 text-amber-700 focus:ring-amber-300",
  };

  // Filter daftar toko mitra berdasarkan pencarian dan status
  const filteredStores = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return storesList.filter((store) => {
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
  }, [storesList, searchTerm, filterStatus]);

  // Handler ubah status langsung dari dropdown di baris tabel
  async function handleStatusChange(storeId: string, newStatus: MitraStatus) {
    setUpdatingStoreId(storeId);
    try {
      const currentStore = storesList.find((s) => s.id === storeId);
      const res = await updateMitraStatus(
        storeId,
        newStatus,
        currentStore?.status_message ?? undefined
      );

      if (!res?.error) {
        setStoresList((prev) =>
          prev.map((s) =>
            s.id === storeId
              ? {
                  ...s,
                  status: newStatus,
                  is_active: newStatus === "aktif",
                }
              : s
          )
        );
      } else {
        alert(`Gagal mengubah status: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message || "Gagal memperbarui status"}`);
    } finally {
      setUpdatingStoreId(null);
    }
  }

  // Buka Modal untuk toko terpilih
  function handleOpenMessageModal(store: StoreItem) {
    setSelectedMitra(store);
    setMessageInput(store.status_message ?? "");
    setModalFeedback(null);
    setIsModalOpen(true);
  }

  // Simpan pesan dari dalam Modal ke Supabase
  async function handleSaveMessage() {
    if (!selectedMitra) return;

    setIsSaving(true);
    setModalFeedback(null);

    try {
      const currentStatus = selectedMitra.status || (selectedMitra.is_active ? "aktif" : "pending");
      const res = await updateMitraStatus(selectedMitra.id, currentStatus, messageInput);

      if (res?.error) {
        setModalFeedback({ type: "error", text: res.error });
      } else {
        const trimmed = messageInput.trim() || null;
        // Perbarui state lokal agar data langsung sinkron
        setStoresList((prev) =>
          prev.map((s) =>
            s.id === selectedMitra.id
              ? { ...s, status_message: trimmed }
              : s
          )
        );

        setModalFeedback({ type: "success", text: "Pesan berhasil disimpan!" });
        setTimeout(() => {
          setIsModalOpen(false);
          setSelectedMitra(null);
          setModalFeedback(null);
        }, 800);
      }
    } catch (err: any) {
      setModalFeedback({ type: "error", text: err.message || "Gagal memperbarui pesan" });
    } finally {
      setIsSaving(false);
    }
  }

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
            <option value="all">Semua Status ({storesList.length})</option>
            <option value="aktif">Aktif</option>
            <option value="pending">Pending</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
          <span className="rounded-full bg-almond-cream px-2.5 py-0.5 text-[11px] font-bold text-terracotta-clay shadow-neu-sm">
            {filteredStores.length} dari {storesList.length} toko
          </span>
        </div>
      </div>

      {/* ── Tabel Toko Mitra (Sleek & Compact) ────────────────────────────── */}
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
                <th scope="col" className="px-4 py-2.5 font-black">STATUS &amp; AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#a3b1c6]/20">
              {filteredStores.map((store) => {
                const currentStatus = (store.status || (store.is_active ? "aktif" : "pending")) as MitraStatus;

                const ownerName = Array.isArray(store.owner)
                  ? store.owner[0]?.full_name ?? "—"
                  : store.owner?.full_name ?? "—";

                const isRowUpdating = updatingStoreId === store.id;

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
                    
                    {/* Kolom Terakhir: STATUS & AKSI (Compact Horizontal Flexbox) */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {/* Dropdown Status Compact */}
                        <div className="relative inline-flex items-center">
                          <select
                            value={currentStatus}
                            disabled={isRowUpdating}
                            onChange={(e) => handleStatusChange(store.id, e.target.value as MitraStatus)}
                            aria-label={`Ubah status untuk toko ${store.name}`}
                            className={`cursor-pointer rounded-xl border px-2.5 py-1 text-xs font-bold shadow-neu-sm outline-none transition-all focus:ring-1 focus:ring-dusty-rose/40 disabled:cursor-wait disabled:opacity-60 ${
                              statusStyles[currentStatus] || statusStyles.pending
                            }`}
                          >
                            <option value="aktif" className="bg-[#e0e5ec] text-emerald-800">
                              ● Aktif
                            </option>
                            <option value="pending" className="bg-[#e0e5ec] text-amber-800">
                              ▲ Pending
                            </option>
                            <option value="nonaktif" className="bg-[#e0e5ec] text-rose-800">
                              ✕ Nonaktif
                            </option>
                          </select>
                          {isRowUpdating && (
                            <span className="pointer-events-none absolute right-2 text-[10px] text-terracotta-clay animate-spin font-bold">
                              ⏳
                            </span>
                          )}
                        </div>

                        {/* Tombol Ikon Pesan (Neumorphism Compact) */}
                        <button
                          type="button"
                          onClick={() => handleOpenMessageModal(store)}
                          title={
                            store.status_message
                              ? `Pesan tersimpan: "${store.status_message}"`
                              : "Kirim pesan peringatan / catatan mitra"
                          }
                          aria-label={`Kirim pesan untuk toko ${store.name}`}
                          className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#e0e5ec] text-[#576071] shadow-neu-sm border border-white/60 transition-all hover:text-terracotta-clay hover:shadow-neu-flat active:scale-95"
                        >
                          <MessageSquare className="h-4 w-4" />
                          {store.status_message && (
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" title="Ada pesan aktif">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terracotta-clay opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-terracotta-clay border border-white" />
                            </span>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Pop-up Kirim Pesan Mitra (Backdrop Blur & Neumorphism) ── */}
      {isModalOpen && selectedMitra && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-[#e0e5ec] p-5 sm:p-6 shadow-neu-flat border border-white/60 space-y-4">
            {/* Header Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-[#a3b1c6]/25">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-almond-cream px-2.5 py-0.5 text-[10px] font-bold text-terracotta-clay shadow-neu-sm">
                    Pesan Toko Mitra
                  </span>
                  <span className="text-[11px] font-semibold text-[#7a8394]">
                    {selectedMitra.city || "SarniyaSync"}
                  </span>
                </div>
                <h3
                  id="modal-headline"
                  className="mt-1 text-base sm:text-lg font-black text-[#2d3440]"
                >
                  Kirim Pesan ke {selectedMitra.name}
                </h3>
                <p className="mt-0.5 text-xs text-[#6d7687]">
                  Pesan peringatan, peninjauan, atau instruksi resmi untuk mitra ini.
                </p>
              </div>

              <button
                type="button"
                onClick={() => !isSaving && setIsModalOpen(false)}
                aria-label="Tutup modal"
                className="rounded-xl p-1.5 text-[#7a8394] transition-colors hover:bg-black/5 hover:text-[#2d3440]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Modal: Textarea Luas */}
            <div className="space-y-2">
              <label
                htmlFor="mitra-message"
                className="block text-xs font-bold uppercase tracking-wider text-[#576071]"
              >
                Isi Pesan / Instruksi Khusus:
              </label>
              <textarea
                id="mitra-message"
                rows={4}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Tuliskan pesan peringatan, peninjauan, atau instruksi untuk mitra ini (misal: 'Harap segera lakukan verifikasi dokumen outlet' atau 'Akun sedang dalam tahap peninjauan tim verifikasi'). Kosongkan jika ingin menghapus pesan."
                style={{
                  boxShadow:
                    "inset 3px 3px 6px rgba(163, 177, 198, 0.65), inset -3px -3px 6px rgba(255, 255, 255, 0.85)",
                }}
                className="w-full rounded-xl border-none bg-[#e0e5ec] p-3 text-xs sm:text-sm font-medium text-[#2d3440] placeholder:text-[#8f98a8] outline-none transition-all focus:ring-1 focus:ring-dusty-rose/50"
              />
              <div className="flex items-center justify-between text-[11px] text-[#7a8394]">
                <span>
                  {selectedMitra.status_message ? "Catatan: Mitra ini memiliki pesan aktif sebelumnya" : "Belum ada pesan tersimpan"}
                </span>
                <span>{messageInput.length} karakter</span>
              </div>
            </div>

            {/* Feedback Alert bila ada */}
            {modalFeedback && (
              <div
                role={modalFeedback.type === "error" ? "alert" : "status"}
                className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold ${
                  modalFeedback.type === "error"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {modalFeedback.type === "error" ? (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <Check className="h-4 w-4 shrink-0" />
                )}
                <span>{modalFeedback.text}</span>
              </div>
            )}

            {/* Footer Modal: Tombol Batal & Simpan Pesan */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#a3b1c6]/25">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="rounded-xl bg-[#e0e5ec] px-4 py-2 text-xs font-bold text-[#576071] shadow-neu-sm border border-white/60 transition-all hover:text-[#2d3440] active:scale-95 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveMessage}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta-clay px-4 py-2 text-xs font-bold text-white shadow-neu-sm transition-all hover:brightness-105 active:scale-95 disabled:cursor-wait disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Simpan Pesan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
