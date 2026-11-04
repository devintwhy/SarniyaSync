"use client";

const numberFormatter = new Intl.NumberFormat("id-ID");

type TopSellingItem = {
  productName: string;
  quantity: number;
};

type TopSellingProductsProps = {
  items: TopSellingItem[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
};

export default function TopSellingProducts({
  items,
  title = "Produk Terlaris",
  subtitle = "Top produk paling laku bulan ini.",
  emptyMessage = "Belum ada data barang terjual bulan ini.",
}: TopSellingProductsProps) {
  const maxQty = items.length > 0 ? items[0].quantity || 1 : 1;

  return (
    <section
      aria-label={title}
      className="lg:col-span-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col justify-between h-full"
    >
      <div className="border-b border-gray-100 px-4 py-3 sm:px-5 flex flex-col gap-0.5">
        <h2 className="text-sm sm:text-base font-black text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>

      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-around">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map((item, index) => {
              const percentage = Math.max(8, Math.round((item.quantity / maxQty) * 100));

              return (
                <li key={item.productName} className="group flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          index === 0
                            ? "bg-terracotta-clay text-white"
                            : index === 1
                            ? "bg-orange-50 text-terracotta-clay border border-orange-200/60"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <p className="truncate text-sm font-semibold text-gray-900">{item.productName}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-gray-900">
                      {numberFormatter.format(item.quantity)} pcs
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-terracotta-clay transition-all duration-700 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

