import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import MitraDashboardCharts from "@/components/mitra/mitra-dashboard-charts";
import { numberFormatter, currencyFormatter, dateFormatter } from "@/utils/format";

export const dynamic = "force-dynamic";

type LowStockItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  storeName: string;
};

type RecentTransaction = {
  id: string;
  transaction_number: string;
  sold_at: string;
  total: number;
  payment_method: string;
  store_name: string;
};

type PartnerTransactionItem = {
  name?: string;
  quantity?: number | string;
};

type PartnerTransactionRow = {
  id: string;
  transaction_number: string;
  total: number | string | null;
  items: PartnerTransactionItem[] | null;
  sold_at: string;
  payment_method: string | null;
  partner_store_id: string;
};

type LowStockInventoryRow = {
  id: string;
  stock_quantity: number | string;
  partner_stores: { name: string | null } | { name: string | null }[] | null;
  products: { sku: string | null; name: string | null; category: string | null; selling_price: number | null } | { sku: string | null; name: string | null; category: string | null; selling_price: number | null }[] | null;
};

type RecentTransactionRow = {
  id: string;
  transaction_number: string;
  sold_at: string;
  total: number;
  payment_method: string | null;
  partner_stores: { name: string | null } | { name: string | null }[] | null;
};

// Pengambilan Data dan Perhitungan Dashboard
export default async function MitraDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name, is_active, status")
    .eq("owner_id", user.id)
    .order("name", { ascending: true });

  if (storesError) {
    return (
      <div className="w-full px-5 py-8 sm:px-8">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Gagal memuat profil toko: {storesError.message}
        </p>
      </div>
    );
  }

  const activeStores = (stores ?? []).filter((store) => {
    if (store.status) return store.status === "aktif" || store.status === "active";
    return store.is_active !== false;
  });
  const activeStoreIds = activeStores.map((s) => s.id);

  if (activeStoreIds.length === 0) {
    return (
      <div className="w-full px-5 py-12 sm:px-8">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-orange-50">
            <Store className="size-7 text-terracotta-clay" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Belum Ada Toko Aktif</h1>
          <p className="mt-2 text-sm text-gray-500">
            Akun Anda belum memiliki toko dengan status aktif. Hubungi Administrator pusat untuk
            verifikasi dan aktivasi toko mitra Anda.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/profil-mitra"
              className="rounded-xl border border-terracotta-clay px-4 py-2 text-sm font-semibold text-terracotta-clay hover:bg-orange-50 transition-colors"
            >
              Cek Status Profil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const thirtyDaysAgoDate = new Date();
  thirtyDaysAgoDate.setDate(now.getDate() - 30);
  const thirtyDaysAgo = thirtyDaysAgoDate.toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let todayRevenue = 0;
  let todayTransactionCount = 0;
  let todayQris = 0;
  let todayTransfer = 0;
  let todayTunai = 0;

  let monthlyRevenue = 0;
  let monthlyItemsSold = 0;
  let monthlyTransactionCount = 0;

  const salesByDate: Record<string, { date: string; timestamp: number; total: number }> = {};
  const salesByProduct: Record<string, number> = {};

  const [
    txResult,
    lowStockResult,
    totalUniqueResult,
    recentResult,
  ] = await Promise.all([
    supabase
      .from("sales_transactions")
      .select(`
        id,
        transaction_number,
        total,
        items,
        sold_at,
        payment_method,
        partner_store_id
      `)
      .in("partner_store_id", activeStoreIds)
      .gte("sold_at", thirtyDaysAgo)
      .order("sold_at", { ascending: true }),
    supabase
      .from("partner_store_inventory")
      .select(`
        id,
        stock_quantity,
        partner_stores ( name ),
        products ( sku, name, category, selling_price )
      `)
      .in("partner_store_id", activeStoreIds)
      .lte("stock_quantity", 10)
      .order("stock_quantity", { ascending: true })
      .limit(20),
    supabase
      .from("partner_store_inventory")
      .select("product_id", { count: "exact", head: true })
      .in("partner_store_id", activeStoreIds)
      .gt("stock_quantity", 0),
    supabase
      .from("sales_transactions")
      .select(`
        id,
        transaction_number,
        sold_at,
        total,
        payment_method,
        partner_stores ( name )
      `)
      .in("partner_store_id", activeStoreIds)
      .order("sold_at", { ascending: false })
      .limit(5),
  ]);

  const transactions = txResult.data as unknown as PartnerTransactionRow[] | null;
  const lowStockData = lowStockResult.data as unknown as LowStockInventoryRow[] | null;
  const totalUniqueProducts = totalUniqueResult.count;
  const recentData = recentResult.data as unknown as RecentTransactionRow[] | null;

  if (transactions) {
    for (const tx of transactions) {
      const total = Number(tx.total || 0);
      const txDate = new Date(tx.sold_at);
      const isToday = txDate.toDateString() === now.toDateString();
      const isThisMonth = tx.sold_at >= startOfMonth;

      if (isToday) {
        todayRevenue += total;
        todayTransactionCount += 1;
        const method = String(tx.payment_method || "cash").toLowerCase().trim();
        if (method === "qris") {
          todayQris += total;
        } else if (method === "transfer") {
          todayTransfer += total;
        } else {
          todayTunai += total;
        }
      }

      const dateKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}-${String(txDate.getDate()).padStart(2, "0")}`;
      const dateString = txDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = {
          date: dateString,
          timestamp: new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime(),
          total: 0,
        };
      }
      salesByDate[dateKey].total += total;

      if (isThisMonth) {
        monthlyRevenue += total;
        monthlyTransactionCount += 1;

        if (Array.isArray(tx.items)) {
          for (const item of tx.items) {
            const record = item as PartnerTransactionItem;
            if (record && typeof record === "object" && record.quantity && record.name) {
              const qty = Number(record.quantity);
              monthlyItemsSold += qty;
              salesByProduct[record.name] = (salesByProduct[record.name] || 0) + qty;
            }
          }
        }
      }
    }
  }

  const dailySales = Object.values(salesByDate)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ date, total }) => ({ date, total }));

  const bestSellers = Object.entries(salesByProduct)
    .map(([productName, quantity]) => ({ productName, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const lowStockItems: LowStockItem[] = [];
  if (lowStockData) {
    lowStockData.forEach((inv) => {
      const product = Array.isArray(inv.products) ? inv.products[0] : inv.products;
      const store = Array.isArray(inv.partner_stores) ? inv.partner_stores[0] : inv.partner_stores;

      if (product) {
        lowStockItems.push({
          id: inv.id,
          sku: product.sku || "-",
          name: product.name || "-",
          category: product.category || "-",
          stock: Number(inv.stock_quantity ?? 0),
          storeName: store?.name || "Toko Saya",
        });
      }
    });
  }

  const recentTransactions: RecentTransaction[] = (recentData ?? []).map((tx) => {
    const store = Array.isArray(tx.partner_stores) ? tx.partner_stores[0] : tx.partner_stores;
    return {
      id: tx.id,
      transaction_number: tx.transaction_number,
      sold_at: tx.sold_at,
      total: tx.total,
      payment_method: tx.payment_method || "Tunai",
      store_name: store?.name || "Toko Saya",
    };
  });

  const storeNames = activeStores.map((s) => s.name).join(", ");

  const metrics = [
    {
      label: "Total Omzet Bulan Ini",
      value: currencyFormatter.format(monthlyRevenue),
      detail: `${numberFormatter.format(monthlyTransactionCount)} transaksi berhasil`,
      valueClass: "text-emerald-700",
    },
    {
      label: "Total Barang Terjual",
      value: `${numberFormatter.format(monthlyItemsSold)} unit`,
      detail: "Barang keluar bulan ini",
      valueClass: "text-gray-900",
    },
    {
      label: "Total Produk Etalase",
      value: `${numberFormatter.format(totalUniqueProducts ?? 0)} variasi`,
      detail: "Produk dengan stok tersedia di toko",
      valueClass: "text-gray-900",
    },
  ];

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <header className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-xs font-bold text-terracotta-clay">
              Portal Mitra
            </span>
            <span className="text-xs text-gray-500">&bull; {storeNames}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Dasbor Toko Saya</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Pantau omzet harian, performa produk, dan peringatan stok inventaris toko Anda secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/kasir"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-terracotta-clay px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            + Kasir POS
          </Link>
          <Link
            href="/transaksi"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
          >
            Riwayat Transaksi
          </Link>
        </div>
      </header>

      <section aria-label="Ringkasan Pendapatan Hari Ini">
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 sm:p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 border border-orange-200/60 text-terracotta-clay">
                Hari Ini
              </span>
              <span className="text-xs text-gray-500">
                {new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Transaksi Hari Ini:{" "}
              <span className="font-bold text-gray-900">
                {numberFormatter.format(todayTransactionCount)} struk
              </span>
            </div>
          </div>

          <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-gradient-to-br from-terracotta-clay to-rosy-taupe p-3.5 sm:p-4 text-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                    Pendapatan Hari Ini
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                    Live
                  </span>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white">
                  {currencyFormatter.format(todayRevenue)}
                </p>
              </div>
              <p className="mt-2 text-[11px] font-medium text-white/80">Total omzet kas masuk toko hari ini</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 sm:p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">QRIS</span>
                  <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                    QRIS
                  </span>
                </div>
                <p className="mt-2 text-lg sm:text-xl font-black text-gray-900">
                  {currencyFormatter.format(todayQris)}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-gray-200/60 pt-1.5 text-[11px] text-gray-500">
                <span>Kontribusi</span>
                <span className="font-bold text-gray-900">
                  {todayRevenue > 0 ? Math.round((todayQris / todayRevenue) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 sm:p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Transfer Bank</span>
                  <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                    Transfer
                  </span>
                </div>
                <p className="mt-2 text-lg sm:text-xl font-black text-gray-900">
                  {currencyFormatter.format(todayTransfer)}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-gray-200/60 pt-1.5 text-[11px] text-gray-500">
                <span>Kontribusi</span>
                <span className="font-bold text-gray-900">
                  {todayRevenue > 0 ? Math.round((todayTransfer / todayRevenue) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 sm:p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tunai / Cash</span>
                  <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 border border-gray-300/60">
                    Tunai
                  </span>
                </div>
                <p className="mt-2 text-lg sm:text-xl font-black text-gray-900">
                  {currencyFormatter.format(todayTunai)}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-gray-200/60 pt-1.5 text-[11px] text-gray-500">
                <span>Kontribusi</span>
                <span className="font-bold text-gray-900">
                  {todayRevenue > 0 ? Math.round((todayTunai / todayRevenue) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Statistik Utama Mitra" className="grid gap-3 md:grid-cols-3">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-gray-200 bg-white p-3.5 sm:p-4 shadow-sm"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{metric.label}</p>
            <p className={`mt-2 break-words text-xl sm:text-2xl font-black text-balance ${metric.valueClass}`}>
              {metric.value}
            </p>
            <p className="mt-1 text-xs text-gray-500">{metric.detail}</p>
          </article>
        ))}
      </section>

      <div>
        <MitraDashboardCharts dailySales={dailySales} bestSellers={bestSellers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <section
          aria-label="Peringatan stok menipis toko saya"
          className="flex flex-col h-full rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Stok Menipis Toko Saya</h2>
              <p className="text-[11px] text-gray-500">Produk dengan sisa stok &le; 10 unit di toko Anda.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
              {lowStockItems.length} item
            </span>
          </div>

          <div className="flex-1 flex flex-col p-4">
            {lowStockItems.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-gray-500 my-auto">
                Stok aman. Tidak ada produk di bawah 10 unit.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 py-1.5 px-2 hover:bg-gray-50 transition-colors rounded-lg"
                  >
                    <div className="min-w-0 max-w-[150px] sm:max-w-[180px]">
                      <p
                        className="font-bold text-gray-800 truncate"
                        title={item.name}
                      >
                        {item.name}
                      </p>
                      <p className="text-[10px] font-mono text-gray-500 truncate">
                        {item.sku}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span
                        className={`inline-flex min-w-[2.2rem] justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold ${item.stock === 0
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-orange-50 text-terracotta-clay border border-orange-200/60"
                          }`}
                      >
                        {numberFormatter.format(item.stock)} pcs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          aria-label="Transaksi terbaru toko saya"
          className="flex flex-col h-full rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Penjualan Terbaru Toko Saya</h2>
              <p className="text-[11px] text-gray-500">5 transaksi kasir terakhir di toko Anda.</p>
            </div>
            <Link
              href="/transaksi"
              className="text-[11px] font-bold text-terracotta-clay hover:underline"
            >
              Semua &rarr;
            </Link>
          </div>

          <div className="flex-1 flex flex-col p-4">
            {recentTransactions.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-gray-500 my-auto">
                Belum ada transaksi penjualan yang tercatat.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-2 py-1.5 px-2 hover:bg-gray-50 transition-colors rounded-lg"
                  >
                    <div className="min-w-0 max-w-[150px] sm:max-w-[180px]">
                      <p
                        className="font-bold text-gray-800 truncate"
                        title={tx.transaction_number}
                      >
                        {tx.transaction_number}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono truncate">
                        {tx.store_name}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="font-black text-terracotta-clay text-xs">
                        {currencyFormatter.format(tx.total)}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {dateFormatter.format(new Date(tx.sold_at))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

