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
      <section className="col-span-1 overflow-hidden rounded-xl border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5 lg:col-span-3">
        <div className="border-b border-[#edf0ec] px-5 py-4">
          <h2 className="font-semibold text-[#173b32]">Grafik Tren Penjualan (30 Hari Terakhir)</h2>
          <p className="mt-1 text-sm text-[#7b877f]">Akumulasi pendapatan harian.</p>
        </div>
        <div className="h-72 w-full px-5 py-6 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailySales}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0ec" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#7b877f" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#7b877f" }}
                tickFormatter={(value) => `Rp ${value / 1000}K`}
              />
              <Tooltip
                cursor={{ fill: "#f7f9f6" }}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e1e7e0", boxShadow: "0 4px 6px -1px rgb(23 59 50 / 0.1)" }}
                formatter={(value: any) => [currencyFormatter.format(Number(value)), "Pendapatan"]}
                labelStyle={{ color: "#52645a", marginBottom: "4px" }}
              />
              <Bar dataKey="total" fill="#285b46" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── 2. Papan Peringkat Kinerja Mitra ─────────────────────────────── */}
      <section className="col-span-1 overflow-hidden rounded-xl border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5 lg:col-span-2">
        <div className="border-b border-[#edf0ec] px-5 py-4">
          <h2 className="font-semibold text-[#173b32]">Leaderboard Mitra Terbaik</h2>
          <p className="mt-1 text-sm text-[#7b877f]">Top 5 mitra dengan omzet tertinggi bulan ini.</p>
        </div>
        <div className="px-5 py-5">
          {topPartners.length === 0 ? (
            <p className="text-center text-sm text-[#68756e]">Belum ada data penjualan mitra.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {topPartners.map((partner, index) => {
                // Kalkulasi persentase bar relatif terhadap juara 1 (index 0)
                const maxSales = topPartners[0].totalSales || 1;
                const percentage = Math.max(2, Math.round((partner.totalSales / maxSales) * 100));
                
                return (
                  <div key={partner.storeName} className="group relative">
                    <div className="mb-1.5 flex items-end justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-[#f7f9f6] text-[10px] font-bold text-[#557b64]">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-[#293a32]">{partner.storeName}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-[#173b32]">
                        {currencyFormatter.format(partner.totalSales)}
                      </span>
                    </div>
                    {/* Progress bar visual */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#f0f3f1]">
                      <div
                        className="h-full rounded-full bg-[#315d3e] transition-all duration-1000 ease-out"
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
      <section className="col-span-1 overflow-hidden rounded-xl border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5">
        <div className="border-b border-[#edf0ec] px-5 py-4">
          <h2 className="font-semibold text-[#173b32]">Produk Terlaris</h2>
          <p className="mt-1 text-sm text-[#7b877f]">Bulan ini.</p>
        </div>
        <div className="px-5 py-5">
          {bestSellers.length === 0 ? (
            <p className="text-center text-sm text-[#68756e]">Belum ada data produk terjual.</p>
          ) : (
            <ul className="flex flex-col gap-5">
              {bestSellers.map((item, index) => (
                <li key={item.productName} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#edf5e8] font-bold text-[#315d3e]">
                      #{index + 1}
                    </div>
                    <p className="truncate text-sm font-medium text-[#293a32]">{item.productName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rounded-full bg-[#f0f3f1] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#52645a]">
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
