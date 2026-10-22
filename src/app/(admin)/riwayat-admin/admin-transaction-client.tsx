"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { CheckCircle2, XCircle, Receipt } from "lucide-react";
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
      <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
        QRIS
      </span>
    );
  }

  if (m === "transfer") {
    return (
      <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        Transfer
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-lg bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-700">
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
  }, [transactions, selectedDate, selectedStore, selectedPayment, searchTerm]);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      <div
        aria-live="polite"
        className="fixed bottom-5 right-4 z-[99] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-sm max-w-xs backdrop-blur-sm transition-all animate-in slide-in-from-right ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-white border border-gray-200 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
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
                className="h-9 w-full rounded-lg bg-gray-50 border border-gray-200 pl-9 pr-7 text-xs text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 rounded-lg bg-gray-50 border border-gray-200 px-3 text-xs font-semibold text-gray-700 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
                  title="Pilih tanggal transaksi"
                />
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate("")}
                    title="Hapus filter tanggal"
                    className="ml-1.5 flex size-7 items-center justify-center rounded-lg bg-gray-100 border border-gray-200 text-[11px] font-bold text-terracotta-clay hover:bg-gray-200 active:scale-95"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`h-9 px-2.5 rounded-lg text-[11px] font-semibold transition-all ${
                    selectedDate === todayStr
                      ? "bg-terracotta-clay text-white shadow-sm"
                      : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(yesterdayStr)}
                  className={`h-9 px-2.5 rounded-lg text-[11px] font-semibold transition-all ${
                    selectedDate === yesterdayStr
                      ? "bg-terracotta-clay text-white shadow-sm"
                      : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Kemarin
                </button>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate("")}
                    className="h-9 px-2.5 rounded-lg text-[11px] font-semibold bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100"
                  >
                    Semua
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="h-9 rounded-lg bg-gray-50 border border-gray-200 px-3 text-xs font-semibold text-gray-700 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
            >
              <option value="all">Semua Toko Mitra</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="h-9 rounded-lg bg-gray-50 border border-gray-200 px-3 text-xs font-semibold text-gray-700 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
            >
              <option value="all">Semua Metode</option>
              <option value="cash">Tunai</option>
              <option value="transfer">Transfer</option>
              <option value="qris">QRIS</option>
            </select>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || filteredTransactions.length === 0}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-terracotta-clay px-3.5 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="mt-2.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs text-rose-800">
            {errorMessage}
          </p>
        )}
      </div>

      <section aria-label="Ringkasan Terfilter" className="rounded-xl bg-white border border-gray-200 p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 border border-orange-100 text-terracotta-clay">
              Periode Filter
            </span>
            <span className="text-xs text-gray-500">
              {selectedDate
                ? new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date(selectedDate))
                : "Seluruh Riwayat Transaksi"}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Total: <span className="font-bold text-gray-800">{numberFormatter.format(filteredTransactions.length)} transaksi</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
          <div className="h-full flex flex-col justify-between rounded-xl bg-terracotta-clay p-3.5 sm:p-4 text-white shadow-sm">
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

          <div className="h-full flex flex-col justify-between rounded-xl bg-white p-3.5 sm:p-4 border border-gray-200 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  TOTAL UNIT TERJUAL
                </span>
                <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                  Unit
                </span>
              </div>
              <p className="mt-2 text-lg sm:text-xl font-black text-gray-800">
                {numberFormatter.format(summaryMetrics.totalItems)} pcs
              </p>
            </div>
            <div className="mt-2 border-t border-gray-100 pt-1.5 text-[11px] text-gray-400">
              Jumlah kuantitas produk keluar
            </div>
          </div>

          <div className="h-full flex flex-col justify-between rounded-xl bg-white p-3.5 sm:p-4 border border-gray-200 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  METODE QRIS
                </span>
                <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                  QRIS
                </span>
              </div>
              <p className="mt-2 text-lg sm:text-xl font-black text-gray-800">
                {currencyFormatter.format(summaryMetrics.qrisRevenue)}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-1.5 text-[11px] text-gray-500">
              <span>Porsi pendapatan</span>
              <span className="font-bold text-gray-800">{summaryMetrics.qrisPercent}%</span>
            </div>
          </div>

          <div className="h-full flex flex-col justify-between rounded-xl bg-white p-3.5 sm:p-4 border border-gray-200 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  METODE TRANSFER
                </span>
                <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                  Transfer
                </span>
              </div>
              <p className="mt-2 text-lg sm:text-xl font-black text-gray-800">
                {currencyFormatter.format(summaryMetrics.transferRevenue)}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-1.5 text-[11px] text-gray-500">
              <span>Porsi pendapatan</span>
              <span className="font-bold text-gray-800">{summaryMetrics.transferPercent}%</span>
            </div>
          </div>

          <div className="h-full flex flex-col justify-between rounded-xl bg-white p-3.5 sm:p-4 border border-gray-200 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  METODE TUNAI
                </span>
                <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                  Tunai
                </span>
              </div>
              <p className="mt-2 text-lg sm:text-xl font-black text-gray-800">
                {currencyFormatter.format(summaryMetrics.cashRevenue)}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-1.5 text-[11px] text-gray-500">
              <span>Porsi pendapatan</span>
              <span className="font-bold text-gray-800">{summaryMetrics.cashPercent}%</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Tabel Riwayat Transaksi" className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
        <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-gray-900">
              Daftar Riwayat Transaksi
            </h2>
            <p className="text-[11px] text-gray-500">
              Urutan transaksi penjualan terbaru dari seluruh gerai toko mitra.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-[10px] font-bold text-terracotta-clay">
            {filteredTransactions.length} Data
          </span>
        </div>

        <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar p-1.5 sm:p-2">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              <Receipt className="mx-auto h-10 w-10 text-gray-400 mb-2" />
              <p className="font-bold text-gray-900">Tidak ada transaksi yang cocok.</p>
              <p className="mt-0.5">Coba ubah filter tanggal atau kata kunci pencarian Anda.</p>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate("")}
                  className="mt-3 inline-flex items-center rounded-lg bg-orange-50 border border-orange-200/60 px-3 py-1 text-xs font-bold text-terracotta-clay hover:opacity-90"
                >
                  Tampilkan Semua Tanggal
                </button>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 shadow-sm">
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
              <tbody className="divide-y divide-gray-100">
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

                      <td className="px-3 py-2 font-semibold text-[#2d3440]">
                        {tx.storeName}
                      </td>

                      <td className="whitespace-nowrap px-3 py-2 text-[11px] text-[#7a8394]">
                        {dateFormatter.format(new Date(tx.soldAt))}
                      </td>

                      <td className="whitespace-nowrap px-3 py-2">
                        <PaymentMethodBadge method={tx.paymentMethod} />
                      </td>

                      <td className="px-3 py-2 max-w-[280px]">
                        {tx.items.length > 0 ? (
                          <ul className="space-y-1">
                            {tx.items.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-1.5 text-xs text-[#2d3440]">
                                <span className="truncate font-medium" title={item.name}>
                                  • {item.name}
                                </span>
                                <span className="inline-flex shrink-0 items-center rounded-md bg-orange-50 border border-orange-200/60 px-1.5 py-0.5 text-[10px] font-bold text-terracotta-clay">
                                  x{item.quantity}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-[11px] italic text-[#7a8394]">Rincian produk tidak tersedia</span>
                        )}
                      </td>

                      <td className={`whitespace-nowrap px-3 py-2 text-right font-black text-xs sm:text-sm ${
                        isCancelled ? "text-[#9a9a9a] line-through" : "text-terracotta-clay"
                      }`}>
                        {currencyFormatter.format(Number(tx.total || 0))}
                      </td>

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
