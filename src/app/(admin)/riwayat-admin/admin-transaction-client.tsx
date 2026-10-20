"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { cancelPartnerSale } from "../penjualan/actions";

export type AdminTransactionItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  productId?: string;
};

export type AdminTransaction = {
  id: string;
  transactionNumber: string;
  partnerStoreId: string;
  storeName: string;
  soldAt: string;
  total: number;
  paymentMethod: string | null;
  status: string;
  items: AdminTransactionItem[];
};

type Toast = {
  id: number;
  type: "success" | "error";
  message: string;
};

type StoreOption = {
  id: string;
  name: string;
};

type AdminTransactionClientProps = {
  initialTransactions: AdminTransaction[];
  stores: StoreOption[];
  errorMessage?: string;
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

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

export default function AdminTransactionClient({
  initialTransactions,
  stores,
  errorMessage,
}: AdminTransactionClientProps) {
  const [transactions, setTransactions] = useState<AdminTransaction[]>(initialTransactions);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<string>("all");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Auto-sync jika initialTransactions berubah (navigasi/refresh)
  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  // Fungsi toast
  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // Fungsi Pembatalan Transaksi dengan Optimistic Update
  const handleCancelTransaction = useCallback(async (tx: AdminTransaction) => {
    if (tx.status === "Batal" || tx.status === "Dibatalkan") {
      addToast("error", "Transaksi ini sudah dibatalkan sebelumnya.");
      return;
    }

    const confirmed = window.confirm(
      `Yakin ingin membatalkan transaksi ini?\n\nNo: ${tx.transactionNumber}\nToko: ${tx.storeName}\n\nStok produk akan otomatis dikembalikan ke etalase Mitra.`
    );
    if (!confirmed) return;

    // Optimistic update: langsung tandai sebagai Batal di UI
    setCancellingIds((prev) => new Set(prev).add(tx.id));
    setTransactions((prev) =>
      prev.map((t) => (t.id === tx.id ? { ...t, status: "Batal" } : t))
    );

    try {
      const result = await cancelPartnerSale(tx.id);
      if (result.error) {
        // Rollback optimistic update jika server gagal
        setTransactions((prev) =>
          prev.map((t) => (t.id === tx.id ? { ...t, status: tx.status } : t))
        );
        addToast("error", `Pembatalan gagal: ${result.error}`);
      } else {
        addToast("success", `Transaksi ${tx.transactionNumber} berhasil dibatalkan. Stok telah dikembalikan ke mitra.`);
      }
    } catch (error) {
      // Rollback jika exception
      setTransactions((prev) =>
        prev.map((t) => (t.id === tx.id ? { ...t, status: tx.status } : t))
      );
      addToast("error", error instanceof Error ? error.message : "Pembatalan transaksi gagal.");
    } finally {
      setCancellingIds((prev) => {
        const next = new Set(prev);
        next.delete(tx.id);
        return next;
      });
    }
  }, [addToast]);

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
      // Filter Status
      const isCancelled = tx.status === "Batal" || tx.status === "Dibatalkan";
      if (selectedStatus === "active" && isCancelled) return false;
      if (selectedStatus === "cancelled" && !isCancelled) return false;

      // Filter Tanggal
      if (selectedDate) {
        const txDateStr = getLocalDateString(tx.soldAt);
        if (txDateStr !== selectedDate) return false;
      }

      // Filter Toko
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
  }, [transactions, selectedDate, selectedStore, selectedPayment, selectedStatus, searchTerm]);

  // Hanya hitung transaksi yang TIDAK dibatalkan untuk ringkasan pendapatan
  const activeForMetrics = useMemo(
    () => filteredTransactions.filter((tx) => tx.status !== "Batal" && tx.status !== "Dibatalkan"),
    [filteredTransactions]
  );

  // Kalkulasi Reaktif Ringkasan Total Penjualan (HANYA transaksi aktif — bukan Batal)
  const summaryMetrics = useMemo(() => {
    let totalOmzet = 0;
    let totalItems = 0;
    let qrisRevenue = 0;
    let transferRevenue = 0;
    let cashRevenue = 0;

    for (const tx of activeForMetrics) {
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

    const qrisPercent = totalOmzet > 0 ? Math.round((qrisRevenue / totalOmzet) * 100) : 0;
    const transferPercent = totalOmzet > 0 ? Math.round((transferRevenue / totalOmzet) * 100) : 0;
    const cashPercent = totalOmzet > 0 ? Math.round((cashRevenue / totalOmzet) * 100) : 0;

    return {
      totalOmzet,
      totalTransactions: activeForMetrics.length,
      totalItems,
      qrisRevenue,
      qrisPercent,
      transferRevenue,
      transferPercent,
      cashRevenue,
      cashPercent,
    };
  }, [activeForMetrics]);

  // Fungsi Ekspor ke Excel (.xlsx) Berdasarkan Filter yang Aktif
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

      // Atur lebar kolom agar rapi
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Transaksi");

      const fileDateLabel = selectedDate
        ? selectedDate
        : `Semua_${todayStr}`;

      XLSX.writeFile(workbook, `SarniyaSync_Riwayat_Transaksi_Admin_${fileDateLabel}.xlsx`);
    } catch (error) {
      console.error("Gagal mengekspor file Excel:", error);
      alert("Terjadi kesalahan saat mengekspor data ke Excel.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">

      {/* ── Toast Notification Stack ─────────────────────────────────────── */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-4 z-[99] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-neu-flat max-w-xs backdrop-blur-sm transition-all animate-in slide-in-from-right ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <span className="text-base leading-none">
              {toast.type === "success" ? "✅" : "❌"}
            </span>
            <span className="leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>
      {/* ── Toolbar: Date Picker, Dropdown Filter & Tombol Download Excel ── */}
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
                placeholder="Cari no. struk, produk, mitra..."
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

          {/* Kolom Kanan: Filter Dropdowns & Tombol Download Excel */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Status Transaksi */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 rounded-xl bg-[#e0e5ec] px-3 text-xs font-semibold text-[#2d3440] shadow-neu-sm outline-none transition-all focus:ring-2 focus:ring-terracotta-clay/30"
            >
              <option value="active">Transaksi Aktif</option>
              <option value="all">Semua Status</option>
              <option value="cancelled">Hanya Dibatalkan</option>
            </select>

            {/* Filter Toko Mitra */}
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="h-9 rounded-xl bg-[#e0e5ec] px-3 text-xs font-semibold text-[#2d3440] shadow-neu-sm outline-none transition-all focus:ring-2 focus:ring-terracotta-clay/30"
            >
              <option value="all">Semua Toko Mitra</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

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

            {/* Tombol Download Excel Neumorphism Timbul (Terracotta Clay / Dusty Rose) */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || filteredTransactions.length === 0}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-dusty-rose to-terracotta-clay px-3.5 text-xs font-bold text-white shadow-neu-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Unduh data riwayat transaksi dalam format file Excel (.xlsx)"
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

      {/* ── Ringkasan Terfilter (Grid 5 Kolom Bergaya Dashboard) ──────────── */}
      <section aria-label="Ringkasan Terfilter" className="rounded-2xl bg-[#e0e5ec] p-3.5 sm:p-4 shadow-neu-flat border border-white/40">
        {/* Header Bergaya Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#a3b1c6]/20">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-almond-cream text-terracotta-clay shadow-neu-sm">
              Periode Filter
            </span>
            <span className="text-xs text-[#7b877f]">
              {selectedDate
                ? new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date(selectedDate))
                : "Seluruh Riwayat Transaksi"}
            </span>
          </div>
          <div className="text-xs text-[#68756e]">
            Total: <span className="font-bold text-[#2d3440]">{numberFormatter.format(filteredTransactions.length)} transaksi</span>
          </div>
        </div>

        {/* Grid 5 Kartu (Tinggi Sejajar) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
          {/* Kartu 1: Total Pendapatan (Solid Color Terracotta/Cokelat Sarniya) */}
          <div className="h-full flex flex-col justify-between rounded-xl bg-terracotta-clay p-3.5 sm:p-4 text-white shadow-neu-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                  TOTAL PENDAPATAN
                </span>
                <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white border border-white/30 backdrop-blur-sm">
                  Total
                </span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                {currencyFormatter.format(summaryMetrics.totalOmzet)}
              </p>
            </div>
            <div className="mt-2 border-t border-white/20 pt-1.5 text-[11px] text-white/80">
              Akumulasi omzet data terfilter
            </div>
          </div>

          {/* Kartu 2: Neumorphism (Total Unit Terjual) */}
          <div className="h-full flex flex-col justify-between rounded-xl bg-[#e0e5ec] p-3.5 sm:p-4 shadow-neu-sm border border-white/60">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#576071]">
                  TOTAL UNIT TERJUAL
                </span>
                <span className="inline-flex items-center rounded-lg bg-[#d7dde6] px-2 py-0.5 text-[10px] font-bold text-[#576071]">
                  Unit
                </span>
              </div>
              <p className="mt-2 text-lg sm:text-xl font-black text-[#2d3440]">
                {numberFormatter.format(summaryMetrics.totalItems)} pcs
              </p>
            </div>
            <div className="mt-2 border-t border-[#a3b1c6]/20 pt-1.5 text-[11px] text-[#7b877f]">
              Jumlah kuantitas produk keluar
            </div>
          </div>

          {/* Kartu 3: Neumorphism (Metode QRIS) */}
          <div className="h-full flex flex-col justify-between rounded-xl bg-[#e0e5ec] p-3.5 sm:p-4 shadow-neu-sm border border-white/60">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#576071]">
                  METODE QRIS
                </span>
                <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                  QRIS
                </span>
              </div>
              <p className="mt-2 text-lg sm:text-xl font-black text-[#2d3440]">
                {currencyFormatter.format(summaryMetrics.qrisRevenue)}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[#a3b1c6]/20 pt-1.5 text-[11px] text-[#7b877f]">
              <span>Porsi pendapatan</span>
              <span className="font-bold text-[#2d3440]">{summaryMetrics.qrisPercent}%</span>
            </div>
          </div>

          {/* Kartu 4: Neumorphism (Metode Transfer) */}
          <div className="h-full flex flex-col justify-between rounded-xl bg-[#e0e5ec] p-3.5 sm:p-4 shadow-neu-sm border border-white/60">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#576071]">
                  METODE TRANSFER
                </span>
                <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                  Transfer
                </span>
              </div>
              <p className="mt-2 text-lg sm:text-xl font-black text-[#2d3440]">
                {currencyFormatter.format(summaryMetrics.transferRevenue)}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[#a3b1c6]/20 pt-1.5 text-[11px] text-[#7b877f]">
              <span>Porsi pendapatan</span>
              <span className="font-bold text-[#2d3440]">{summaryMetrics.transferPercent}%</span>
            </div>
          </div>

          {/* Kartu 5: Neumorphism (Metode Tunai) */}
          <div className="h-full flex flex-col justify-between rounded-xl bg-[#e0e5ec] p-3.5 sm:p-4 shadow-neu-sm border border-white/60">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#576071]">
                  METODE TUNAI
                </span>
                <span className="inline-flex items-center rounded-lg bg-[#e0e5ec] px-2 py-0.5 text-[10px] font-bold text-[#2d3440] shadow-neu-sm">
                  Tunai
                </span>
              </div>
              <p className="mt-2 text-lg sm:text-xl font-black text-[#2d3440]">
                {currencyFormatter.format(summaryMetrics.cashRevenue)}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[#a3b1c6]/20 pt-1.5 text-[11px] text-[#7b877f]">
              <span>Porsi pendapatan</span>
              <span className="font-bold text-[#2d3440]">{summaryMetrics.cashPercent}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tabel Riwayat Transaksi ─────────────────────────────────────── */}
      <section aria-label="Tabel Riwayat Transaksi" className="overflow-hidden rounded-2xl bg-[#e0e5ec] shadow-neu-flat border border-white/40">
        <div className="border-b border-[#a3b1c6]/20 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-[#2d3440]">
              Daftar Riwayat Transaksi
            </h2>
            <p className="text-[11px] text-[#7a8394]">
              Urutan transaksi penjualan terbaru dari seluruh gerai toko mitra.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-almond-cream px-2.5 py-0.5 text-[10px] font-bold text-terracotta-clay shadow-neu-sm">
            {filteredTransactions.length} Data
          </span>
        </div>

        <div className="overflow-x-auto p-1.5 sm:p-2">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#7a8394]">
              <span className="text-3xl block mb-2">🧾</span>
              <p className="font-bold text-[#2d3440]">Tidak ada transaksi yang cocok.</p>
              <p className="mt-0.5">Coba ubah filter tanggal atau kata kunci pencarian Anda.</p>
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
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-[#e0e5ec] text-[11px] font-bold uppercase tracking-wider text-[#576071] border-b border-[#a3b1c6]/20">
                <tr>
                  <th scope="col" className="px-3 py-2.5">No. Transaksi</th>
                  <th scope="col" className="px-3 py-2.5">Toko Mitra</th>
                  <th scope="col" className="px-3 py-2.5">Tanggal</th>
                  <th scope="col" className="px-3 py-2.5">Metode</th>
                  <th scope="col" className="px-3 py-2.5">Item Belanja (Produk &amp; Qty)</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Grand Total</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#a3b1c6]/15">
                {filteredTransactions.map((tx) => {
                  const isCancelled = tx.status === "Batal" || tx.status === "Dibatalkan";
                  const isCancelling = cancellingIds.has(tx.id);
                  return (
                    <tr
                      key={tx.id}
                      className={`align-top transition-colors ${
                        isCancelled
                          ? "opacity-60 bg-rose-50/30"
                          : "hover:bg-almond-cream/25"
                      }`}
                    >
                      {/* No. Transaksi */}
                      <td className="px-3 py-2 font-mono text-xs font-bold text-[#2d3440]">
                        <div className="flex flex-col gap-1">
                          <span className={isCancelled ? "line-through text-[#9a9a9a]" : ""}>
                            {tx.transactionNumber}
                          </span>
                          {isCancelled && (
                            <span className="inline-flex w-fit items-center rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-700">
                              ✕ Dibatalkan
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Toko Mitra */}
                      <td className="px-3 py-2 font-semibold text-[#2d3440]">
                        {tx.storeName}
                      </td>

                      {/* Tanggal */}
                      <td className="whitespace-nowrap px-3 py-2 text-[11px] text-[#7a8394]">
                        {dateFormatter.format(new Date(tx.soldAt))}
                      </td>

                      {/* Metode Pembayaran */}
                      <td className="whitespace-nowrap px-3 py-2">
                        <PaymentMethodBadge method={tx.paymentMethod} />
                      </td>

                      {/* Item Belanja */}
                      <td className="px-3 py-2 max-w-[280px]">
                        {tx.items.length > 0 ? (
                          <ul className="space-y-1">
                            {tx.items.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-1.5 text-xs text-[#2d3440]">
                                <span className="truncate font-medium" title={item.name}>
                                  • {item.name}
                                </span>
                                <span className="inline-flex shrink-0 items-center rounded-md bg-almond-cream px-1.5 py-0.2 text-[10px] font-bold text-terracotta-clay shadow-neu-sm">
                                  ×{item.quantity}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-[11px] italic text-[#7a8394]">Rincian produk tidak tersedia</span>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td className={`whitespace-nowrap px-3 py-2 text-right font-black text-xs sm:text-sm ${
                        isCancelled ? "text-[#9a9a9a] line-through" : "text-terracotta-clay"
                      }`}>
                        {currencyFormatter.format(Number(tx.total || 0))}
                      </td>

                      {/* Aksi Pembatalan */}
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {isCancelled ? (
                          <span className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600">
                            Dibatalkan
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleCancelTransaction(tx)}
                            disabled={isCancelling}
                            className="rounded-lg border border-[#ead5cf] px-2.5 py-1.5 text-xs font-medium text-[#9b4936] transition-all hover:bg-rose-50 hover:border-rose-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isCancelling ? (
                              <span className="flex items-center gap-1.5">
                                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#9b4936] border-t-transparent" />
                                Memproses...
                              </span>
                            ) : (
                              "Batalkan"
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
