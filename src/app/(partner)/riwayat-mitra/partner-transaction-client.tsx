"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";

export type PartnerTransactionItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PartnerTransaction = {
  id: string;
  transactionNumber: string;
  partnerStoreId: string;
  storeName: string;
  soldAt: string;
  total: number;
  paymentMethod: string | null;
  items: PartnerTransactionItem[];
};

type StoreOption = {
  id: string;
  name: string;
};

type PartnerTransactionClientProps = {
  initialTransactions: PartnerTransaction[];
  stores: StoreOption[];
  errorMessage?: string;
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function getLocalDateString(dateInput: Date | string): string {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function PaymentMethodBadge({ method }: { method: string | null | undefined }) {
  const m = String(method || "cash").toLowerCase().trim();

  if (m === "qris") {
    return (
      <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 shadow-neu-sm">
        QRIS
      </span>
    );
  }

  if (m === "transfer") {
    return (
      <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-neu-sm">
        Transfer
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-lg bg-[#e0e5ec] px-2 py-0.5 text-[10px] font-bold text-[#2d3440] shadow-neu-sm border border-white/50">
      Tunai
    </span>
  );
}

export default function PartnerTransactionClient({
  initialTransactions,
  stores,
  errorMessage,
}: PartnerTransactionClientProps) {
  const [transactions] = useState<PartnerTransaction[]>(initialTransactions);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<string>("all");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Tanggal Hari Ini & Kemarin untuk Shortcut Cepat
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return getLocalDateString(y);
  }, []);

  // Filter Data Transaksi secara Reaktif
  const filteredTransactions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return transactions.filter((tx) => {
      // Filter Tanggal
      if (selectedDate) {
        const txDateStr = getLocalDateString(tx.soldAt);
        if (txDateStr !== selectedDate) return false;
      }

      // Filter Toko (jika punya lebih dari 1 toko)
      if (selectedStore !== "all" && tx.partnerStoreId !== selectedStore) {
        return false;
      }

      // Filter Metode Pembayaran
      if (selectedPayment !== "all") {
        const pm = String(tx.paymentMethod || "cash").toLowerCase().trim();
        if (selectedPayment === "cash" && pm !== "cash" && pm !== "tunai") return false;
        if (selectedPayment === "transfer" && pm !== "transfer") return false;
        if (selectedPayment === "qris" && pm !== "qris") return false;
      }

      // Filter Pencarian Teks
      if (!q) return true;

      const matchTxNumber = tx.transactionNumber.toLowerCase().includes(q);
      const matchStore = tx.storeName.toLowerCase().includes(q);
      const matchItems = tx.items.some((item) =>
        item.name.toLowerCase().includes(q)
      );
      const matchPayment = (tx.paymentMethod || "tunai").toLowerCase().includes(q);

      return matchTxNumber || matchStore || matchItems || matchPayment;
    });
  }, [transactions, selectedDate, selectedStore, selectedPayment, searchTerm]);

  // Kalkulasi Reaktif Ringkasan Total Penjualan
  const summaryMetrics = useMemo(() => {
    let totalOmzet = 0;
    let totalItems = 0;
    let qrisRevenue = 0;
    let transferRevenue = 0;
    let cashRevenue = 0;

    for (const tx of filteredTransactions) {
      const amount = Number(tx.total || 0);
      totalOmzet += amount;

      for (const item of tx.items) {
        totalItems += Number(item.quantity || 0);
      }

      const pm = String(tx.paymentMethod || "cash").toLowerCase().trim();
      if (pm === "qris") qrisRevenue += amount;
      else if (pm === "transfer") transferRevenue += amount;
      else cashRevenue += amount;
    }

    return {
      totalOmzet,
      totalTransactions: filteredTransactions.length,
      totalItems,
      qrisRevenue,
      transferRevenue,
      cashRevenue,
    };
  }, [filteredTransactions]);

  // Fungsi Ekspor ke Excel (.xlsx) Berdasarkan Filter Aktif
  function handleExportExcel() {
    if (filteredTransactions.length === 0) {
      alert("Tidak ada data transaksi untuk diekspor pada filter ini.");
      return;
    }

    setIsExporting(true);
    try {
      const excelRows: any[] = [];

      filteredTransactions.forEach((tx) => {
        const txDateFormatted = new Date(tx.soldAt).toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        });

        const paymentDisplay =
          String(tx.paymentMethod || "cash").toLowerCase() === "qris"
            ? "QRIS"
            : String(tx.paymentMethod || "cash").toLowerCase() === "transfer"
            ? "Transfer"
            : "Tunai";

        if (tx.items.length === 0) {
          excelRows.push({
            "No. Transaksi": tx.transactionNumber,
            "Tanggal Transaksi": txDateFormatted,
            "Toko Mitra": tx.storeName,
            "Metode Pembayaran": paymentDisplay,
            "Nama Produk": "-",
            "Qty": 0,
            "Harga Satuan (Rp)": 0,
            "Subtotal Item (Rp)": 0,
            "Total Struk (Rp)": tx.total,
          });
        } else {
          tx.items.forEach((item, idx) => {
            excelRows.push({
              "No. Transaksi": tx.transactionNumber,
              "Tanggal Transaksi": txDateFormatted,
              "Toko Mitra": tx.storeName,
              "Metode Pembayaran": paymentDisplay,
              "Nama Produk": item.name,
              "Qty": item.quantity,
              "Harga Satuan (Rp)": item.unitPrice,
              "Subtotal Item (Rp)": item.lineTotal,
              "Total Struk (Rp)": idx === 0 ? tx.total : "",
            });
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(excelRows);

      // Kolom terformat rapi
      worksheet["!cols"] = [
        { wch: 22 }, // No. Transaksi
        { wch: 20 }, // Tanggal
        { wch: 25 }, // Toko Mitra
        { wch: 18 }, // Metode Pembayaran
        { wch: 30 }, // Nama Produk
        { wch: 8 },  // Qty
        { wch: 16 }, // Harga Satuan
        { wch: 16 }, // Subtotal Item
        { wch: 18 }, // Total Struk
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Transaksi Mitra");

      const fileDateLabel = selectedDate
        ? selectedDate
        : `Semua_${todayStr}`;

      XLSX.writeFile(workbook, `SarniyaSync_Riwayat_Mitra_${fileDateLabel}.xlsx`);
    } catch (error) {
      console.error("Gagal mengekspor file Excel:", error);
      alert("Terjadi kesalahan saat mengekspor data ke Excel.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ── Toolbar: Date Picker, Filter Dropdown & Tombol Download Excel ── */}
      <div className="rounded-2xl bg-[#e0e5ec] p-3 sm:p-4 shadow-neu-flat border border-white/40">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Kolom Kiri: Search Input & Date Picker Neumorphism Inset */}
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Input Search */}
            <div className="relative flex-1 min-w-[200px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7a8394]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
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
                placeholder="Cari no. struk, produk..."
                className="h-9 w-full rounded-xl bg-[#e0e5ec] pl-9 pr-7 text-xs text-[#2d3440] shadow-neu-inset outline-none transition-all placeholder:text-[#8f98a8] focus:ring-2 focus:ring-terracotta-clay/30"
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

            {/* Input Date Picker Neumorphism Inset */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 rounded-xl bg-[#e0e5ec] px-3 text-xs font-semibold text-[#2d3440] shadow-neu-inset outline-none transition-all focus:ring-2 focus:ring-terracotta-clay/30"
                  title="Pilih tanggal transaksi"
                />
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate("")}
                    title="Hapus filter tanggal"
                    className="ml-1.5 flex size-7 items-center justify-center rounded-lg bg-[#e0e5ec] text-[11px] font-bold text-terracotta-clay shadow-neu-sm hover:brightness-105 active:scale-95"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Tombol Shortcut Preset Tanggal */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`h-9 px-2.5 rounded-xl text-[11px] font-bold transition-all ${
                    selectedDate === todayStr
                      ? "bg-terracotta-clay text-white shadow-neu-sm"
                      : "bg-[#e0e5ec] text-[#576071] shadow-neu-sm hover:text-terracotta-clay active:shadow-neu-inset-sm"
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(yesterdayStr)}
                  className={`h-9 px-2.5 rounded-xl text-[11px] font-bold transition-all ${
                    selectedDate === yesterdayStr
                      ? "bg-terracotta-clay text-white shadow-neu-sm"
                      : "bg-[#e0e5ec] text-[#576071] shadow-neu-sm hover:text-terracotta-clay active:shadow-neu-inset-sm"
                  }`}
                >
                  Kemarin
                </button>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate("")}
                    className="h-9 px-2.5 rounded-xl text-[11px] font-bold bg-[#e0e5ec] text-[#7a8394] shadow-neu-sm hover:text-[#2d3440] active:shadow-neu-inset-sm"
                  >
                    Semua
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Filter Toko (jika > 1), Filter Pembayaran & Download Excel */}
          <div className="flex flex-wrap items-center gap-2">
            {stores.length > 1 && (
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="h-9 rounded-xl bg-[#e0e5ec] px-3 text-xs font-semibold text-[#2d3440] shadow-neu-sm outline-none transition-all focus:ring-2 focus:ring-terracotta-clay/30"
              >
                <option value="all">Semua Toko Saya</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {/* Filter Metode Pembayaran */}
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="h-9 rounded-xl bg-[#e0e5ec] px-3 text-xs font-semibold text-[#2d3440] shadow-neu-sm outline-none transition-all focus:ring-2 focus:ring-terracotta-clay/30"
            >
              <option value="all">Semua Metode</option>
              <option value="cash">Tunai</option>
              <option value="transfer">Transfer</option>
              <option value="qris">QRIS</option>
            </select>

            {/* Tombol Download Excel Neumorphism Timbul (Dusty Rose / Terracotta Clay) */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || filteredTransactions.length === 0}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-dusty-rose to-terracotta-clay px-3.5 text-xs font-bold text-white shadow-neu-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Unduh data transaksi toko Anda dalam format file Excel (.xlsx)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <span>{isExporting ? "Menyiapkan..." : "Download Excel"}</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <p className="mt-2.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs text-rose-800">
            {errorMessage}
          </p>
        )}
      </div>

      {/* ── Ringkasan Total Penjualan (Total Omzet Reaktif Mitra) ────────── */}
      <section aria-label="Ringkasan Penjualan Mitra Terfilter" className="rounded-2xl bg-[#e0e5ec] p-3.5 sm:p-4 shadow-neu-flat border border-white/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-[#a3b1c6]/20">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-almond-cream text-terracotta-clay shadow-neu-sm">
              Ringkasan Penjualan Toko
            </span>
            <span className="text-xs text-[#7a8394]">
              {selectedDate
                ? `Tanggal: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date(selectedDate))}`
                : "Periode: Seluruh Riwayat Toko"}
            </span>
          </div>
          <span className="text-xs font-bold text-[#576071]">
            Menampilkan: <span className="text-[#2d3440] font-black">{filteredTransactions.length}</span> transaksi
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Kartu 1: Total Penjualan Reaktif (Terracotta Clay Highlight) */}
          <div className="rounded-xl bg-[#e0e5ec] p-3 shadow-neu-sm flex flex-col justify-between border border-white/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#576071]">
                Total Penjualan
              </span>
              <p className="mt-1 text-lg sm:text-xl font-black tracking-tight text-terracotta-clay">
                {currencyFormatter.format(summaryMetrics.totalOmzet)}
              </p>
            </div>
            <p className="mt-1.5 text-[10px] text-[#7a8394] border-t border-[#a3b1c6]/20 pt-1">
              Pendapatan toko pada filter aktif
            </p>
          </div>

          {/* Kartu 2: Total Unit Terjual */}
          <div className="rounded-xl bg-[#e0e5ec] p-3 shadow-neu-sm flex flex-col justify-between border border-white/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#576071]">
                Total Unit Terjual
              </span>
              <p className="mt-1 text-lg sm:text-xl font-black text-[#2d3440]">
                {summaryMetrics.totalItems} pcs
              </p>
            </div>
            <p className="mt-1.5 text-[10px] text-[#7a8394] border-t border-[#a3b1c6]/20 pt-1">
              Total jilbab/produk terjual
            </p>
          </div>

          {/* Kartu 3: Omzet QRIS & Transfer */}
          <div className="rounded-xl bg-[#e0e5ec] p-3 shadow-neu-sm flex flex-col justify-between border border-white/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#576071]">
                Non-Tunai (QRIS &amp; TF)
              </span>
              <p className="mt-1 text-base sm:text-lg font-black text-[#2d3440]">
                {currencyFormatter.format(summaryMetrics.qrisRevenue + summaryMetrics.transferRevenue)}
              </p>
            </div>
            <div className="mt-1.5 flex items-center justify-between border-t border-[#a3b1c6]/20 pt-1 text-[10px] text-[#7a8394]">
              <span>QRIS: {currencyFormatter.format(summaryMetrics.qrisRevenue)}</span>
              <span>TF: {currencyFormatter.format(summaryMetrics.transferRevenue)}</span>
            </div>
          </div>

          {/* Kartu 4: Omzet Tunai */}
          <div className="rounded-xl bg-[#e0e5ec] p-3 shadow-neu-sm flex flex-col justify-between border border-white/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#576071]">
                Penjualan Tunai
              </span>
              <p className="mt-1 text-base sm:text-lg font-black text-[#2d3440]">
                {currencyFormatter.format(summaryMetrics.cashRevenue)}
              </p>
            </div>
            <p className="mt-1.5 text-[10px] text-[#7a8394] border-t border-[#a3b1c6]/20 pt-1">
              Porsi: {summaryMetrics.totalOmzet > 0 ? Math.round((summaryMetrics.cashRevenue / summaryMetrics.totalOmzet) * 100) : 0}%
            </p>
          </div>
        </div>
      </section>

      {/* ── Tabel Riwayat Transaksi Toko ─────────────────────────────────── */}
      <section aria-label="Tabel Riwayat Transaksi Toko" className="overflow-hidden rounded-2xl bg-[#e0e5ec] shadow-neu-flat border border-white/40">
        <div className="border-b border-[#a3b1c6]/20 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-[#2d3440]">
              Riwayat Transaksi Kasir Toko
            </h2>
            <p className="text-[11px] text-[#7a8394]">
              Daftar struk penjualan yang telah selesai di gerai Anda.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-almond-cream px-2.5 py-0.5 text-[10px] font-bold text-terracotta-clay shadow-neu-sm">
            {filteredTransactions.length} Struk
          </span>
        </div>

        <div className="overflow-x-auto p-1.5 sm:p-2">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#7a8394]">
              <span className="text-3xl block mb-2">🧾</span>
              <p className="font-bold text-[#2d3440]">Belum ada transaksi pada filter ini.</p>
              <p className="mt-0.5">Silakan pilih tanggal lain atau buat transaksi baru dari Kasir.</p>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate("")}
                  className="mt-3 inline-flex items-center rounded-xl bg-almond-cream px-3 py-1 text-xs font-bold text-terracotta-clay shadow-neu-sm hover:brightness-105"
                >
                  Tampilkan Semua Tanggal
                </button>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead className="bg-[#e0e5ec] text-[11px] font-bold uppercase tracking-wider text-[#576071] border-b border-[#a3b1c6]/20">
                <tr>
                  <th scope="col" className="px-3 py-2.5">No. Struk</th>
                  <th scope="col" className="px-3 py-2.5">Waktu Transaksi</th>
                  {stores.length > 1 && <th scope="col" className="px-3 py-2.5">Toko</th>}
                  <th scope="col" className="px-3 py-2.5">Metode</th>
                  <th scope="col" className="px-3 py-2.5">Item Belanja (Produk &amp; Qty)</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#a3b1c6]/15">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="align-top hover:bg-almond-cream/25 transition-colors">
                    {/* No. Struk */}
                    <td className="px-3 py-2 font-mono text-xs font-bold text-[#2d3440]">
                      {tx.transactionNumber}
                    </td>

                    {/* Tanggal & Waktu */}
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-[#7a8394]">
                      {dateFormatter.format(new Date(tx.soldAt))}
                    </td>

                    {/* Nama Toko (jika lebih dari 1) */}
                    {stores.length > 1 && (
                      <td className="px-3 py-2 font-semibold text-[#2d3440]">
                        {tx.storeName}
                      </td>
                    )}

                    {/* Metode Pembayaran */}
                    <td className="whitespace-nowrap px-3 py-2">
                      <PaymentMethodBadge method={tx.paymentMethod} />
                    </td>

                    {/* Item Belanja */}
                    <td className="px-3 py-2 max-w-[320px]">
                      {tx.items.length > 0 ? (
                        <ul className="space-y-1">
                          {tx.items.map((item, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-2 text-xs text-[#2d3440]">
                              <span className="truncate font-medium" title={item.name}>
                                • {item.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-[#7a8394]">
                                  @{currencyFormatter.format(item.unitPrice)}
                                </span>
                                <span className="inline-flex items-center rounded-md bg-almond-cream px-1.5 py-0.2 text-[10px] font-bold text-terracotta-clay shadow-neu-sm">
                                  ×{item.quantity}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[11px] italic text-[#7a8394]">Rincian item tidak tersedia</span>
                      )}
                    </td>

                    {/* Grand Total */}
                    <td className="whitespace-nowrap px-3 py-2 text-right font-black text-terracotta-clay text-xs sm:text-sm">
                      {currencyFormatter.format(Number(tx.total || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
