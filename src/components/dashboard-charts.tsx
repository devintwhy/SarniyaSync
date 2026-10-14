"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DailySales = {
  date: string;
  total: number;
};

type PartnerPerformance = {
  storeName: string;
  totalSales: number;
};

type BestSeller = {
  productName: string;
  quantity: number;
};

type DashboardChartsProps = {
  dailySales: DailySales[];
  topPartners: PartnerPerformance[];
  bestSellers: BestSeller[];
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("id-ID");

export default function DashboardCharts({
  dailySales,
  topPartners,
  bestSellers,
}: DashboardChartsProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* ── 1. Grafik Tren Penjualan ─────────────────────────────────────── */}
      <section className="col-span-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5 lg:col-span-3">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-bold text-[#2d3440]">Grafik Tren Penjualan (30 Hari Terakhir)</h2>
          <p className="mt-1 text-sm text-[#7a8394]">Akumulasi pendapatan harian.</p>
        </div>
        <div className="h-72 w-full px-6 py-6 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailySales}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f2f5" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#7a8394" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#7a8394" }}
                tickFormatter={(value) => `Rp ${value / 1000}K`}
              />
              <Tooltip
                cursor={{ fill: "#f0f2f5" }}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 8px 16px -4px rgba(45, 52, 64, 0.1)" }}
                formatter={(value: any) => [currencyFormatter.format(Number(value)), "Pendapatan"]}
                labelStyle={{ color: "#2d3440", fontWeight: "bold", marginBottom: "4px" }}
              />
              <Bar dataKey="total" fill="#cc9787" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── 2. Papan Peringkat Kinerja Mitra ─────────────────────────────── */}
      <section className="col-span-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5 lg:col-span-2">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-bold text-[#2d3440]">Leaderboard Mitra Terbaik</h2>
          <p className="mt-1 text-sm text-[#7a8394]">Top 5 mitra dengan omzet tertinggi bulan ini.</p>
        </div>
        <div className="px-6 py-6">
          {topPartners.length === 0 ? (
            <p className="text-center text-sm text-[#6d7687]">Belum ada data penjualan mitra.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {topPartners.map((partner, index) => {
                // Kalkulasi persentase bar relatif terhadap juara 1 (index 0)
                const maxSales = topPartners[0].totalSales || 1;
                const percentage = Math.max(2, Math.round((partner.totalSales / maxSales) * 100));
                
                return (
                  <div key={partner.storeName} className="group relative">
                    <div className="mb-2 flex items-end justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-[#f7e4d4] text-xs font-bold text-[#9d5c4c]">
                          {index + 1}
                        </span>
                        <span className="text-sm font-semibold text-[#2d3440]">{partner.storeName}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-[#2d3440]">
                        {currencyFormatter.format(partner.totalSales)}
                      </span>
                    </div>
                    {/* Progress bar visual */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#cc9787] to-[#9d5c4c] transition-all duration-1000 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── 3. Daftar Produk Terlaris (Top 5 Best Sellers) ───────────────── */}
      <section className="col-span-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-bold text-[#2d3440]">Produk Terlaris</h2>
          <p className="mt-1 text-sm text-[#7a8394]">Bulan ini.</p>
        </div>
        <div className="px-6 py-6">
          {bestSellers.length === 0 ? (
            <p className="text-center text-sm text-[#6d7687]">Belum ada data produk terjual.</p>
          ) : (
            <ul className="flex flex-col gap-5">
              {bestSellers.map((item, index) => (
                <li key={item.productName} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#e1b5a4]/30 font-bold text-[#9d5c4c]">
                      #{index + 1}
                    </div>
                    <p className="truncate text-sm font-semibold text-[#2d3440]">{item.productName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rounded-full bg-[#f7e4d4] px-3 py-1 text-xs font-bold tabular-nums text-[#9d5c4c]">
                      {numberFormatter.format(item.quantity)} pcs
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
