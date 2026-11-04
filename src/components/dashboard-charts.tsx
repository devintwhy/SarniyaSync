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
import TopSellingProducts from "./top-selling-products";

type DailySales = {
  date: string;
  total: number;
};

type BestSeller = {
  productName: string;
  quantity: number;
};

type DashboardChartsProps = {
  dailySales: DailySales[];
  bestSellers: BestSeller[];
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatDayOnly(dateStr: string): string {
  if (!dateStr) return "";
  const match = dateStr.match(/^\d{1,2}/);
  return match ? match[0].padStart(2, "0") : dateStr;
}

export default function DashboardCharts({
  dailySales,
  bestSellers,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      <section
        aria-label="Grafik Tren Penjualan"
        className="lg:col-span-7 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col justify-between h-full border border-gray-200"
      >
        <div className="border-b border-gray-100 px-4 py-3 sm:px-5 flex flex-col gap-0.5">
          <h2 className="text-sm sm:text-base font-black text-gray-900">
            Grafik Tren Penjualan (30 Hari Terakhir)
          </h2>
          <p className="text-xs text-gray-500">
            Akumulasi pendapatan harian dari seluruh transaksi gerai mitra.
          </p>
        </div>

        <div className="h-72 w-full p-3 sm:p-4 flex-1 flex flex-col justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailySales}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickFormatter={formatDayOnly}
                dy={6}
              />
              <YAxis
                width={60}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickFormatter={(value) => `Rp ${value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${value / 1000}K`}`}
              />
              <Tooltip
                cursor={{ fill: "rgba(204, 151, 135, 0.08)" }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                  fontSize: "12px",
                }}
                labelFormatter={(label) => String(label)}
                formatter={(value: unknown) => [currencyFormatter.format(Number(value) || 0), "Pendapatan"]}
                labelStyle={{ color: "#111827", fontWeight: "bold", marginBottom: "3px" }}
              />
              <Bar
                dataKey="total"
                fill="#cc9787"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <TopSellingProducts
        items={bestSellers}
        title="Top Produk Keseluruhan"
        subtitle="Top produk paling laku dari seluruh gerai mitra bulan ini."
        emptyMessage="Belum ada data penjualan produk bulan ini."
      />
    </div>
  );
}