import { redirect } from "next/navigation";
import type { Json } from "@/utils/supabase/database.types";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import TransactionsTableClient from "./transactions-table-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Riwayat Transaksi | Portal Mitra SarniyaSync",
  description: "Daftar riwayat transaksi dan penjualan toko mitra SarniyaSync.",
};

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

function readSaleItems(items: Json) {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, Json | undefined>;
    const quantity = Number(record.quantity);
    const unitPrice = Number(record.unit_price);
    const total = Number(record.line_total);
    return [
      {
        name: typeof record.name === "string" ? record.name : "Produk",
        quantity:
          Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        total: Number.isFinite(total)
          ? total
          : Number.isFinite(unitPrice)
            ? unitPrice * quantity
            : 0,
      },
    ];
  });
}

export default async function PartnerTransactionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Ambil daftar toko mitra ──────────────────────────────────────────────
  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name, is_active")
    .eq("owner_id", user.id);

  const storeNames = new Map(
    (stores ?? []).map((store) => [store.id, store.name]),
  );
  const activeStores = (stores ?? []).filter((store) => store.is_active);
  const storeIds = activeStores.map((store) => store.id);

  // ── Ambil riwayat transaksi ──────────────────────────────────────────────
  const transactions: Array<{
    id: string;
    transaction_number: string;
    partner_store_id: string;
    items: Json;
    total: number;
    payment_method: string | null;
    status: string;
    sold_at: string;
  }> = [];
  let errorMessage = storesError?.message ?? "";

  if (storeIds.length && !errorMessage) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("sales_transactions")
        .select(
          "id, transaction_number, partner_store_id, items, total, payment_method, status, sold_at",
        )
        .in("partner_store_id", storeIds)
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
  }

  // ── Buat baris riwayat per item di dalam transaksi ───────────────────────
  const historyRows = transactions.flatMap((transaction) =>
    readSaleItems(transaction.items).map((item, index) => ({
      id: `${transaction.id}-${index}`,
      transactionNumber: transaction.transaction_number,
      storeName: storeNames.get(transaction.partner_store_id) ?? "-",
      paymentMethod: transaction.payment_method ?? "-",
      soldAt: transaction.sold_at,
      ...item,
    })),
  );

  const paymentLabel: Record<string, string> = {
    cash: "Tunai",
    transfer: "Transfer",
    qris: "QRIS",
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="mb-8">
        <span className="inline-block rounded-full bg-[#f7e4d4] px-3 py-1 text-xs font-bold text-[#9d5c4c]">
          Portal Mitra
        </span>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#2d3440]">
          Riwayat Transaksi
        </h1>
        <p className="mt-2 text-sm text-[#6d7687]">
          Daftar seluruh transaksi penjualan yang telah selesai di toko Anda.
        </p>
      </header>

      {/* ── Riwayat Transaksi ───────────────────────────────────────────────── */}
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          Transaksi gagal dimuat: {errorMessage}
        </p>
      ) : historyRows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-[#6d7687]">
          Belum ada transaksi toko.
        </div>
      ) : (
        <section
          aria-label="Riwayat transaksi toko"
          className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5"
        >
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-bold text-[#2d3440]">Data Transaksi Toko</h2>
            <p className="mt-1 text-sm text-[#7a8394]">
              {historyRows.length} item terjual — tanggal terbaru di atas.
            </p>
          </div>
          <TransactionsTableClient rows={historyRows} />
        </section>
      )}
    </div>
  );
}