"use client";

import { useState, useMemo } from "react";

export type RiwayatRow = {
  id: string;
  transactionNumber: string;
  storeName: string;
  paymentMethod: string;
  soldAt: string;
  items: { name: string; quantity: number; unitPrice: number; lineTotal: number }[];
  total: number;
};

type RiwayatTableClientProps = {
  rows: RiwayatRow[];
  showStore?: boolean;
  showCancel?: boolean;
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

function toLocalDateString(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function downloadCSV(rows: RiwayatRow[], dateLabel: string) {
  const headers = [
    "No. Transaksi",
    "Toko Mitra",
    "Tanggal",
    "Metode Pembayaran",
    "Produk",
    "Qty",
    "Harga Satuan",
    "Subtotal",
    "Grand Total",
  ];

  const csvRows: string[] = [headers.join(",")];

  for (const row of rows) {
    if (row.items.length === 0) {
      csvRows.push(
        [
          `"${row.transactionNumber}"`,
          `"${row.storeName}"`,
          `"${dateFormatter.format(new Date(row.soldAt))}"`,
          `"${paymentLabel[row.paymentMethod.toLowerCase()] || row.paymentMethod}"`,
          '"-"',
          "0",
          "0",
          "0",
          row.total,
        ].join(",")
      );
    } else {
      for (const item of row.items) {
        csvRows.push(
          [
            `"${row.transactionNumber}"`,
            `"${row.storeName}"`,
            `"${dateFormatter.format(new Date(row.soldAt))}"`,
            `"${paymentLabel[row.paymentMethod.toLowerCase()] || row.paymentMethod}"`,
            `"${item.name}"`,
            item.quantity,
            item.unitPrice,
            item.lineTotal,
            row.total,
          ].join(",")
        );
      }
    }
  }

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `riwayat-transaksi${dateLabel ? `-${dateLabel}` : ""}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function RiwayatTableClient({
  rows,
  showStore = true,
}: RiwayatTableClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");

  const filteredRows = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return rows.filter((row) => {
      // Filter tanggal
      if (selectedDate) {
        const rowDate = toLocalDateString(row.soldAt);
        if (rowDate !== selectedDate) return false;
      }

      // Filter metode pembayaran
      if (selectedPayment !== "all") {
        const pm = row.paymentMethod.toLowerCase().trim();
        if (selectedPayment === "cash" && pm !== "cash" && pm !== "tunai") return false;
        if (selectedPayment === "transfer" && pm !== "transfer") return false;
        if (selectedPayment === "qris" && pm !== "qris") return false;
      }

      // Filter pencarian
      if (!q) return true;
      const matchTx = row.transactionNumber.toLowerCase().includes(q);
      const matchStore = row.storeName.toLowerCase().includes(q);
      const matchItems = row.items.some((i) => i.name.toLowerCase().includes(q));
      const matchPayment = (paymentLabel[row.paymentMethod.toLowerCase()] || row.paymentMethod).toLowerCase().includes(q);
      return matchTx || matchStore || matchItems || matchPayment;
    });
  }, [rows, searchTerm, selectedPayment, selectedDate]);

  const totalPenjualan = useMemo(() => {
    return filteredRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  }, [filteredRows]);

  const totalQris = useMemo(() => {
    return filteredRows
      .filter((r) => r.paymentMethod.toLowerCase().trim() === "qris")
      .reduce((s, r) => s + Number(r.total || 0), 0);
  }, [filteredRows]);

  const totalTransfer = useMemo(() => {
    return filteredRows
      .filter((r) => r.paymentMethod.toLowerCase().trim() === "transfer")
      .reduce((s, r) => s + Number(r.total || 0), 0);
  }, [filteredRows]);

  const totalTunai = useMemo(() => {
    return filteredRows
      .filter((r) => {
        const pm = r.paymentMethod.toLowerCase().trim();
        return pm !== "qris" && pm !== "transfer";
      })
      .reduce((s, r) => s + Number(r.total || 0), 0);
  }, [filteredRows]);

  return (
    <div className="space-y-3">
      {/* ── Toolbar Filter: Tanggal + Metode + Pencarian + Download ──────── */}
      <div className="rounded-2xl bg-[#e0e5ec] p-3 sm:p-3.5 shadow-neu-flat">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Baris Kiri: Date Picker + Metode Pembayaran */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* Date Picker */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-date" className="text-xs font-bold text-[#576071] whitespace-nowrap">
                Tanggal:
              </label>
              <input
                id="filter-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 rounded-xl bg-[#e0e5ec] px-3 text-xs font-semibold text-[#2d3440] shadow-neu-inset outline-none transition-all focus:ring-2 focus:ring-terracotta-clay/30"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate("")}
                  className="flex items-center justify-center size-7 rounded-lg bg-[#e0e5ec] text-xs font-bold text-[#7a8394] shadow-neu-sm hover:text-terracotta-clay transition-colors"
                  title="Reset tanggal"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Metode Pembayaran */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-pm" className="text-xs font-bold text-[#576071] whitespace-nowrap">
                Metode:
              </label>
              <select
                id="filter-pm"
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                className="h-9 rounded-xl bg-[#e0e5ec] px-3 text-xs font-semibold text-[#2d3440] shadow-neu-sm outline-none transition-all focus:ring-2 focus:ring-terracotta-clay/30"
              >
                <option value="all">Semua Metode</option>
                <option value="cash">Tunai</option>
                <option value="transfer">Transfer</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
          </div>

          {/* Baris Kanan: Search + Download */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7a8394]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
                placeholder="Cari no. struk, produk, toko..."
                className="h-9 w-full rounded-xl bg-[#e0e5ec] pl-8 pr-7 text-xs text-[#2d3440] shadow-neu-inset outline-none transition-all placeholder:text-[#8f98a8] focus:ring-2 focus:ring-terracotta-clay/30"
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

            {/* Download CSV */}
            <button
              type="button"
              onClick={() => downloadCSV(filteredRows, selectedDate)}
              disabled={filteredRows.length === 0}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-dusty-rose to-terracotta-clay px-4 text-xs font-bold text-white shadow-neu-sm transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Download CSV
            </button>

            {/* Counter */}
            <span className="text-xs font-bold text-terracotta-clay whitespace-nowrap">
              {filteredRows.length} dari {rows.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Kartu Ringkasan Omzet Reaktif ───────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Penjualan */}
        <div className="rounded-2xl bg-gradient-to-br from-almond-silk via-rosy-taupe to-terracotta-clay p-3.5 text-white shadow-neu-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                Total Penjualan
              </span>
              <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white border border-white/30 backdrop-blur-sm">
                {selectedDate || "Semua"}
              </span>
            </div>
            <p className="mt-2 text-xl font-black tracking-tight text-white drop-shadow-sm">
              {currencyFormatter.format(totalPenjualan)}
            </p>
          </div>
          <p className="mt-1.5 text-[11px] text-white/80">
            {filteredRows.length} transaksi terpilih
          </p>
        </div>

        {/* QRIS */}
        <div className="rounded-2xl bg-[#e0e5ec] p-3.5 shadow-neu-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#576071]">QRIS</span>
              <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">QRIS</span>
            </div>
            <p className="mt-2 text-lg font-black text-[#2d3440]">
              {currencyFormatter.format(totalQris)}
            </p>
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t border-[#a3b1c6]/20 pt-1.5 text-[11px] text-[#7b877f]">
            <span>Porsi</span>
            <span className="font-bold text-[#2d3440]">
              {totalPenjualan > 0 ? Math.round((totalQris / totalPenjualan) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Transfer */}
        <div className="rounded-2xl bg-[#e0e5ec] p-3.5 shadow-neu-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#576071]">Transfer</span>
              <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Transfer</span>
            </div>
            <p className="mt-2 text-lg font-black text-[#2d3440]">
              {currencyFormatter.format(totalTransfer)}
            </p>
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t border-[#a3b1c6]/20 pt-1.5 text-[11px] text-[#7b877f]">
            <span>Porsi</span>
            <span className="font-bold text-[#2d3440]">
              {totalPenjualan > 0 ? Math.round((totalTransfer / totalPenjualan) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Tunai */}
        <div className="rounded-2xl bg-[#e0e5ec] p-3.5 shadow-neu-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#576071]">Tunai</span>
              <span className="inline-flex items-center rounded-lg bg-[#e0e5ec] px-2 py-0.5 text-[10px] font-bold text-[#2d3440] shadow-neu-sm">Tunai</span>
            </div>
            <p className="mt-2 text-lg font-black text-[#2d3440]">
              {currencyFormatter.format(totalTunai)}
            </p>
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t border-[#a3b1c6]/20 pt-1.5 text-[11px] text-[#7b877f]">
            <span>Porsi</span>
            <span className="font-bold text-[#2d3440]">
              {totalPenjualan > 0 ? Math.round((totalTunai / totalPenjualan) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabel Riwayat Transaksi ─────────────────────────────────────── */}
      <section
        aria-label="Tabel riwayat transaksi"
        className="overflow-hidden rounded-2xl bg-[#e0e5ec] shadow-neu-flat border border-white/40"
      >
        <div className="border-b border-[#a3b1c6]/20 px-3.5 py-2.5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-[#2d3440]">Data Transaksi</h2>
            <p className="text-[11px] text-[#7a8394]">
              {filteredRows.length} transaksi
              {selectedDate ? ` — ${new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { dateStyle: "long" })}` : " — semua tanggal"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-[#d6dbe3] text-[11px] uppercase tracking-wider text-[#576071] font-bold">
              <tr>
                <th scope="col" className="px-3 py-2.5">No. Transaksi</th>
                {showStore && <th scope="col" className="px-3 py-2.5">Toko</th>}
                <th scope="col" className="px-3 py-2.5">Tanggal</th>
                <th scope="col" className="px-3 py-2.5">Metode</th>
                <th scope="col" className="px-3 py-2.5">Item Belanja</th>
                <th scope="col" className="px-3 py-2.5 text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#a3b1c6]/15">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={showStore ? 6 : 5} className="px-4 py-8 text-center text-xs text-[#7a8394]">
                    {searchTerm || selectedDate || selectedPayment !== "all"
                      ? "Tidak ada transaksi yang cocok dengan filter aktif."
                      : "Belum ada transaksi."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const pm = row.paymentMethod.toLowerCase().trim();
                  const badgeClass =
                    pm === "qris"
                      ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                      : pm === "transfer"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                      : "bg-almond-cream text-terracotta-clay border border-almond-silk";

                  return (
                    <tr key={row.id} className="transition-colors hover:bg-almond-cream/15">
                      <td className="px-3 py-2 font-mono text-xs font-bold text-[#2d3440]">
                        {row.transactionNumber}
                      </td>
                      {showStore && (
                        <td className="px-3 py-2 text-xs font-semibold text-[#2d3440]">
                          {row.storeName}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-3 py-2 text-[11px] text-[#6d7687]">
                        {dateFormatter.format(new Date(row.soldAt))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                          {paymentLabel[pm] ?? row.paymentMethod}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {row.items.length > 0 ? (
                          <ul className="space-y-0.5">
                            {row.items.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-1.5 text-xs text-[#2d3440]">
                                <span className="font-medium">• {item.name}</span>
                                <span className="inline-flex items-center rounded bg-almond-cream/60 px-1.5 py-0.5 text-[10px] font-bold text-terracotta-clay">
                                  ×{item.quantity}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs italic text-[#7b877f]">Rincian tidak tersedia</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-black text-terracotta-clay tabular-nums">
                        {currencyFormatter.format(Number(row.total || 0))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
