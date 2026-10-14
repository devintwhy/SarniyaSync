import { redirect } from "next/navigation";
import type { Json } from "@/utils/supabase/database.types";
import { getProfileRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import CancelSaleButton from "./cancel-sale-button";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function saleLines(items: Json) {
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, Json | undefined>;
    const quantity = Number(record.quantity);
    const unitPrice = Number(record.unit_price);
    const lineTotal = Number(record.line_total);
    return [
      {
        productName: typeof record.name === "string" ? record.name : "Produk",
        quantity: Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0,
        revenue: Number.isFinite(lineTotal)
          ? lineTotal
          : Number.isFinite(unitPrice)
            ? unitPrice * quantity
            : 0,
      },
    ];
  });
}

function PaymentMethodBadge({ method }: { method: string | null | undefined }) {
  const m = String(method || "cash").toLowerCase().trim();

  if (m === "qris") {
    return (
      <span className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
        QRIS
      </span>
    );
  }

  if (m === "transfer") {
    return (
      <span className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        Transfer
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      Tunai
    </span>
  );
}

export default async function AdminSalesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await getProfileRole(supabase, user.id);
  if (role !== "admin" && role !== "pemilik") redirect("/partner");

  const transactions: Array<{
    id: string;
    transaction_number: string;
    partner_store_id: string;
    items: Json;
    total: number;
    payment_method: string | null;
    sold_at: string;
  }> = [];
  let errorMessage = "";

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("sales_transactions")
      .select("id, transaction_number, partner_store_id, items, total, payment_method, sold_at")
      .order("sold_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      errorMessage = error.message;
      break;
    }

    const page = data ?? [];
    transactions.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name");
  if (!errorMessage && storesError) errorMessage = storesError.message;
  const storeNames = new Map((stores ?? []).map((store) => [store.id, store.name]));

  // Kalkulasi 4 Metrik Pendapatan
  let totalRevenue = 0;
  let qrisRevenue = 0;
  let qrisCount = 0;
  let transferRevenue = 0;
  let transferCount = 0;
  let cashRevenue = 0;
  let cashCount = 0;

  for (const tx of transactions) {
    const total = Number(tx.total || 0);
    totalRevenue += total;

    const pm = String(tx.payment_method || "cash").toLowerCase().trim();
    if (pm === "qris") {
      qrisRevenue += total;
      qrisCount += 1;
    } else if (pm === "transfer") {
      transferRevenue += total;
      transferCount += 1;
    } else {
      cashRevenue += total;
      cashCount += 1;
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="inline-block rounded-full bg-[#f7e4d4] px-3.5 py-1 text-xs font-bold text-[#9d5c4c]">
            Area Pemilik / Administrator
          </span>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-[#2d3440]">
            Laporan Penjualan
          </h1>
          <p className="mt-1 text-sm sm:text-base text-[#6d7687]">
            Rekapitulasi omzet dan riwayat transaksi dari seluruh gerai toko mitra.
          </p>
        </div>
        <a
          href="/api/export-penjualan"
          className="inline-flex min-h-12 items-center justify-center self-start rounded-2xl bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-5 text-sm font-bold text-white shadow-md transition-all hover:brightness-105 active:scale-[0.99] sm:self-auto"
        >
          <svg className="mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Download Laporan (CSV)
        </a>
      </header>

      {/* ── 4 Kotak Metrik Ringkasan Pendapatan ─────────────────────────── */}
      <section aria-label="Ringkasan omset penjualan" className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Kotak 1: Total Omzet Keseluruhan (Rose Gold Gradient Megah) */}
        <div className="rounded-2xl bg-gradient-to-br from-[#e1b5a4] via-[#cc9787] to-[#9d5c4c] p-6 text-white shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                Total Omzet Keseluruhan
              </span>
              <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm border border-white/30">
                Akumulasi
              </span>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight text-white drop-shadow-sm">
              {errorMessage ? "—" : currencyFormatter.format(totalRevenue)}
            </p>
          </div>
          <p className="mt-4 text-xs font-medium text-white/80">
            {transactions.length} transaksi seluruh mitra
          </p>
        </div>

        {/* Kotak 2: Pendapatan via QRIS */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#576071]">
                Pendapatan via QRIS
              </span>
              <span className="inline-flex items-center rounded-xl bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                QRIS
              </span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-[#2d3440]">
              {errorMessage ? "—" : currencyFormatter.format(qrisRevenue)}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-[#7b877f]">
            <span>{qrisCount} transaksi</span>
            <span className="font-bold text-[#2d3440]">
              {totalRevenue > 0 ? Math.round((qrisRevenue / totalRevenue) * 100) : 0}% porsi
            </span>
          </div>
        </div>

        {/* Kotak 3: Pendapatan via Transfer */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#576071]">
                Pendapatan via Transfer
              </span>
              <span className="inline-flex items-center rounded-xl bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                Transfer
              </span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-[#2d3440]">
              {errorMessage ? "—" : currencyFormatter.format(transferRevenue)}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-[#7b877f]">
            <span>{transferCount} transaksi</span>
            <span className="font-bold text-[#2d3440]">
              {totalRevenue > 0 ? Math.round((transferRevenue / totalRevenue) * 100) : 0}% porsi
            </span>
          </div>
        </div>

        {/* Kotak 4: Pendapatan via Tunai / Cash */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#576071]">
                Pendapatan via Tunai
              </span>
              <span className="inline-flex items-center rounded-xl bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
                Tunai
              </span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-[#2d3440]">
              {errorMessage ? "—" : currencyFormatter.format(cashRevenue)}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-[#7b877f]">
            <span>{cashCount} transaksi</span>
            <span className="font-bold text-[#2d3440]">
              {totalRevenue > 0 ? Math.round((cashRevenue / totalRevenue) * 100) : 0}% porsi
            </span>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <p role="alert" className="rounded-2xl border border-rose-300 bg-rose-50/95 p-4 text-xs sm:text-sm font-medium text-rose-800">
          Laporan gagal dimuat: {errorMessage}
        </p>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white px-5 py-12 text-center text-sm text-[#6d7687]">
          Belum ada penjualan dari toko mitra.
        </div>
      ) : (
        <section aria-label="Semua penjualan mitra" className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-bold text-[#2d3440]">Transaksi Seluruh Mitra</h2>
            <p className="mt-1 text-sm text-[#7b877f]">{transactions.length} transaksi struk terdaftar, tanggal terbaru di urutan atas.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs font-bold uppercase tracking-wider text-[#576071]">
                <tr>
                  <th scope="col" className="px-6 py-4">No. Transaksi</th>
                  <th scope="col" className="px-6 py-4">Toko Mitra</th>
                  <th scope="col" className="px-6 py-4">Tanggal</th>
                  <th scope="col" className="px-6 py-4">Metode Pembayaran</th>
                  <th scope="col" className="px-6 py-4">Item Belanja (Produk &amp; Qty)</th>
                  <th scope="col" className="px-6 py-4 text-right">Grand Total</th>
                  <th scope="col" className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => {
                  const items = saleLines(transaction.items);
                  const storeName = storeNames.get(transaction.partner_store_id) ?? "Toko tidak ditemukan";

                  return (
                    <tr key={transaction.id} className="align-top hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-[#2d3440]">
                        {transaction.transaction_number}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[#2d3440]">
                        {storeName}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-[#6d7687]">
                        {dateFormatter.format(new Date(transaction.sold_at))}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <PaymentMethodBadge method={transaction.payment_method} />
                      </td>
                      <td className="px-6 py-4">
                        {items.length > 0 ? (
                          <ul className="space-y-1.5">
                            {items.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-xs text-[#2d3440]">
                                <span className="font-medium">• {item.productName}</span>
                                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-[#576071]">
                                  ×{item.quantity}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs italic text-[#7b877f]">Rincian produk tidak tersedia</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-base font-bold text-[#2d3440]">
                        {currencyFormatter.format(Number(transaction.total || 0))}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <CancelSaleButton
                          transactionId={transaction.id}
                          transactionNumber={transaction.transaction_number}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
