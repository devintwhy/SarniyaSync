import { redirect } from "next/navigation";
import type { Json } from "@/utils/supabase/database.types";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import PartnerTransactionClient, {
  PartnerTransaction,
  PartnerTransactionItem,
} from "./partner-transaction-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Riwayat Transaksi | Portal Mitra SarniyaSync",
  description: "Daftar riwayat transaksi dan penjualan toko mitra SarniyaSync.",
};

const PAGE_SIZE = 1000;

function parseTransactionItems(items: Json): PartnerTransactionItem[] {
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, Json | undefined>;
    const quantity = Number(record.quantity);
    const unitPrice = Number(record.unit_price);
    const lineTotal = Number(record.line_total);

    return [
      {
        name: typeof record.name === "string" ? record.name : "Produk",
        quantity: Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        lineTotal: Number.isFinite(lineTotal)
          ? lineTotal
          : Number.isFinite(unitPrice)
          ? unitPrice * quantity
          : 0,
      },
    ];
  });
}

export default async function PartnerRiwayatPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Ambil daftar toko milik mitra
  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name, is_active")
    .eq("owner_id", user.id);

  const storeMap = new Map((stores ?? []).map((store) => [store.id, store.name]));
  const storeIds = (stores ?? []).map((store) => store.id);

  const rawTransactions: Array<{
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
        .select("id, transaction_number, partner_store_id, items, total, payment_method, status, sold_at")
        .in("partner_store_id", storeIds)
        .order("sold_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        errorMessage = error.message;
        break;
      }

      const page = data ?? [];
      rawTransactions.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }

  const transactions: PartnerTransaction[] = rawTransactions.map((tx) => ({
    id: tx.id,
    transactionNumber: tx.transaction_number,
    partnerStoreId: tx.partner_store_id,
    storeName: storeMap.get(tx.partner_store_id) ?? "Toko Mitra",
    soldAt: tx.sold_at,
    total: Number(tx.total || 0),
    paymentMethod: tx.payment_method,
    items: parseTransactionItems(tx.items),
  }));

  const storeOptions = (stores ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className="w-full px-2 py-3 sm:px-4 sm:py-4">
      <header className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-3 py-0.5 text-[11px] font-bold text-terracotta-clay">
            Portal Mitra
          </span>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#2d3440]">
            Riwayat Transaksi
          </h1>
          <p className="mt-0.5 text-xs text-[#7a8394]">
            Daftar seluruh transaksi kasir yang telah selesai di toko Anda beserta ringkasan omzet dan ekspor Excel.
          </p>
        </div>
      </header>

      <PartnerTransactionClient
        initialTransactions={transactions}
        stores={storeOptions}
        errorMessage={errorMessage}
      />
    </div>
  );
}
