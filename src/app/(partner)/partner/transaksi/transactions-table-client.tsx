"use client";

import { useState, useMemo } from "react";

type HistoryRow = {
  id: string;
  transactionNumber: string;
  storeName: string;
  paymentMethod: string;
  soldAt: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type TransactionsTableClientProps = {
  rows: HistoryRow[];
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

const paymentLabel: Record<string, string> = {
  cash: "Tunai",
  transfer: "Transfer",
  qris: "QRIS",
};

export default function TransactionsTableClient({ rows }: TransactionsTableClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("all");

  const filteredRows = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return rows.filter((item) => {
      if (selectedPayment !== "all") {
        const pm = item.paymentMethod.toLowerCase();
        if (selectedPayment === "cash" && pm !== "cash" && pm !== "tunai") return false;
        if (selectedPayment === "transfer" && pm !== "transfer") return false;
        if (selectedPayment === "qris" && pm !== "qris") return false;
      }

      if (!q) return true;

      const matchName = item.name.toLowerCase().includes(q);
      const matchTx = item.transactionNumber.toLowerCase().includes(q);
      const matchStore = item.storeName.toLowerCase().includes(q);
      const matchPayment = (paymentLabel[item.paymentMethod] || item.paymentMethod).toLowerCase().includes(q);
      const matchDate = new Date(item.soldAt).toLocaleDateString("id-ID").toLowerCase().includes(q);

      return matchName || matchTx || matchStore || matchPayment || matchDate;
    });
  }, [rows, searchTerm, selectedPayment]);

  return (
    <div>
      {/* ── Search Bar & Filter Toolbar ──────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 border-b border-slate-100 bg-[#f0f2f5]/40">
        <div className="relative flex-1 max-w-md">
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
            placeholder="Cari no. struk, nama produk, tanggal..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-7 text-xs sm:text-sm text-[#2d3440] outline-none transition-all placeholder:text-[#8f98a8] focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
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
          <label htmlFor="filter-pm" className="text-xs font-bold uppercase tracking-wider text-[#576071]">
            Metode:
          </label>
          <select
            id="filter-pm"
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-[#2d3440] outline-none transition-all focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
          >
            <option value="all">Semua Metode</option>
            <option value="cash">Tunai</option>
            <option value="transfer">Transfer</option>
            <option value="qris">QRIS</option>
          </select>
          <span className="text-xs font-bold text-[#9d5c4c] ml-1">
            {filteredRows.length} dari {rows.length}
          </span>
        </div>
      </div>

      {/* ── Tabel Riwayat ────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-xs sm:text-sm">
          <thead className="bg-[#f0f2f5] text-[11px] uppercase tracking-wider text-[#6d7687] font-bold">
            <tr>
              <th scope="col" className="px-3.5 py-2.5">Produk &amp; No. Struk</th>
              <th scope="col" className="px-3.5 py-2.5 text-right">Jml</th>
              <th scope="col" className="px-3.5 py-2.5 text-right">Harga Satuan</th>
              <th scope="col" className="px-3.5 py-2.5">Toko</th>
              <th scope="col" className="px-3.5 py-2.5">Bayar</th>
              <th scope="col" className="px-3.5 py-2.5">Waktu</th>
              <th scope="col" className="px-3.5 py-2.5 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs sm:text-sm text-[#7a8394]">
                  {searchTerm
                    ? `Tidak ada transaksi yang cocok dengan pencarian "${searchTerm}".`
                    : "Belum ada transaksi toko."}
                </td>
              </tr>
            ) : (
              filteredRows.map((item) => {
                const pm = item.paymentMethod.toLowerCase();
                const badgeClass =
                  pm === "qris"
                    ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                    : pm === "transfer"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    : "bg-slate-100 text-slate-700 border border-slate-300/60";

                return (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                    <th scope="row" className="px-3.5 py-2 font-semibold text-[#2d3440]">
                      <div>{item.name}</div>
                      <div className="text-[10px] font-mono font-normal text-[#7a8394]">
                        {item.transactionNumber}
                      </div>
                    </th>
                    <td className="whitespace-nowrap px-3.5 py-2 text-right tabular-nums font-bold text-[#2d3440]">
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-right tabular-nums text-[#576071]">
                      {currencyFormatter.format(item.unitPrice)}
                    </td>
                    <td className="px-3.5 py-2 text-xs text-[#576071]">{item.storeName}</td>
                    <td className="whitespace-nowrap px-3.5 py-2">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${badgeClass}`}>
                        {paymentLabel[item.paymentMethod] ?? item.paymentMethod}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-[11px] text-[#576071]">
                      {dateFormatter.format(new Date(item.soldAt))}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-right tabular-nums font-black text-[#2d3440]">
                      {currencyFormatter.format(item.total)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
