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
    return [{
      productName: typeof record.name === "string" ? record.name : "Produk",
      quantity: Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0,
      revenue: Number.isFinite(lineTotal) ? lineTotal : Number.isFinite(unitPrice) ? unitPrice * quantity : 0,
    }];
  });
}

export default async function AdminSalesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await getProfileRole(supabase, user.id);
  if (role !== "admin" && role !== "pemilik") redirect("/partner");

  const transactions: Array<{
    id: string;
    transaction_number: string;
    partner_store_id: string;
    items: Json;
    total: number;
    sold_at: string;
  }> = [];
  let errorMessage = "";

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("sales_transactions")
      .select("id, transaction_number, partner_store_id, items, total, sold_at")
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

  const totalRevenue = transactions.reduce((sum, transaction) => sum + Number(transaction.total || 0), 0);
  const reportRows = transactions.flatMap((transaction) => {
    const items = saleLines(transaction.items);
    const normalizedItems = items.length > 0
      ? items
      : [{ productName: "Rincian produk tidak tersedia", quantity: 0, revenue: Number(transaction.total || 0) }];

    return normalizedItems.map((item, index) => ({
      id: `${transaction.id}-${index}`,
      transactionId: transaction.id,
      isFirstItem: index === 0,
      transactionNumber: transaction.transaction_number,
      storeName: storeNames.get(transaction.partner_store_id) ?? "Toko tidak ditemukan",
      soldAt: transaction.sold_at,
      ...item,
    }));
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#557b64]">Area Pemilik/Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">Laporan Penjualan</h1>
        <p className="mt-2 text-sm text-[#68756e]">Ringkasan transaksi dari seluruh toko mitra.</p>
      </header>

      <section aria-label="Ringkasan omset" className="mb-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-md border border-[#cfe2d0] bg-[#edf5e8] p-5 shadow-sm shadow-[#173b32]/5">
          <p className="text-sm font-medium text-[#557b64]">Total Omset Keseluruhan</p>
          <p className="mt-3 break-words text-3xl font-semibold text-[#173b32]">
            {errorMessage ? "—" : currencyFormatter.format(totalRevenue)}
          </p>
          <p className="mt-2 text-xs text-[#64806b]">{transactions.length} transaksi seluruh mitra</p>
        </article>
      </section>

      {errorMessage ? (
        <p role="alert" className="rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-4 py-3 text-sm text-[#9b4936]">
          Laporan gagal dimuat: {errorMessage}
        </p>
      ) : reportRows.length === 0 ? (
        <div className="rounded-md border border-[#e1e7e0] bg-white px-5 py-10 text-center text-sm text-[#68756e]">Belum ada penjualan dari toko mitra.</div>
      ) : (
        <section aria-label="Semua penjualan mitra" className="overflow-hidden rounded-md border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5">
          <div className="border-b border-[#edf0ec] px-5 py-4">
            <h2 className="font-semibold text-[#173b32]">Transaksi Seluruh Mitra</h2>
            <p className="mt-1 text-sm text-[#7b877f]">{reportRows.length} baris item, tanggal terbaru di atas.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-[#f7f9f6] text-xs uppercase text-[#68756e]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Toko Mitra</th>
                  <th scope="col" className="px-5 py-3 font-medium">Nama Produk</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Jumlah</th>
                  <th scope="col" className="px-5 py-3 font-medium">Tanggal</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Pendapatan</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ec]">
                {reportRows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#fafbf9]">
                    <td className="px-5 py-4 text-[#68756e]">{row.storeName}</td>
                    <th scope="row" className="px-5 py-4 font-medium text-[#293a32]">
                      {row.productName}
                      <span className="mt-1 block text-xs font-normal text-[#7b877f]">{row.transactionNumber}</span>
                    </th>
                    <td className="px-5 py-4 text-right text-[#293a32]">{row.quantity}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#68756e]">{dateFormatter.format(new Date(row.soldAt))}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-[#293a32]">{currencyFormatter.format(row.revenue)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      {row.isFirstItem && (
                        <CancelSaleButton
                          transactionId={row.transactionId}
                          transactionNumber={row.transactionNumber}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}