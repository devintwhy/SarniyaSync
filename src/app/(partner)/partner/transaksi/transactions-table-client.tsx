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
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
        <div className="relative flex-1 max-w-md">
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
            placeholder="Cari no. struk, nama produk, tanggal..."
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-7 text-xs sm:text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-terracotta-clay focus:ring-2 focus:ring-terracotta-clay/20"
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

        <div className="flex items-center gap-2">
          <label htmlFor="filter-pm" className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Metode:
          </label>
          <select
            id="filter-pm"
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-900 outline-none transition-all focus:border-terracotta-clay focus:ring-2 focus:ring-terracotta-clay/20"
          >
            <option value="all">Semua Metode</option>
            <option value="cash">Tunai</option>
            <option value="transfer">Transfer</option>
            <option value="qris">QRIS</option>
          </select>
          <span className="text-xs font-bold text-terracotta-clay ml-1">
            {filteredRows.length} dari {rows.length}
          </span>
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[650px] text-left text-xs sm:text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 shadow-sm">
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
          <tbody className="divide-y divide-gray-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs sm:text-sm text-gray-500">
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
                    : "bg-gray-100 text-gray-700 border border-gray-200";

                return (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50">
                    <th scope="row" className="px-3.5 py-2 font-semibold text-gray-900">
                      <div>{item.name}</div>
                      <div className="text-[10px] font-mono font-normal text-gray-500">
                        {item.transactionNumber}
                      </div>
                    </th>
                    <td className="whitespace-nowrap px-3.5 py-2 text-right tabular-nums font-bold text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-right tabular-nums text-gray-600">
                      {currencyFormatter.format(item.unitPrice)}
                    </td>
                    <td className="px-3.5 py-2 text-xs text-gray-600">{item.storeName}</td>
                    <td className="whitespace-nowrap px-3.5 py-2">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${badgeClass}`}>
                        {paymentLabel[item.paymentMethod] ?? item.paymentMethod}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-[11px] text-gray-500">
                      {dateFormatter.format(new Date(item.soldAt))}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-right tabular-nums font-black text-gray-900">
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
