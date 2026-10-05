import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type StorePageProps = {
  params: { id: string };
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

export default async function StoreReportPage({ params }: StorePageProps) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store, error: storeError } = await supabase
    .from("partner_stores")
    .select("id, name, address, city, phone, is_active")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (storeError || !store) notFound();

  const transactions: Array<{
    id: string;
    transaction_number: string;
    channel: string;
    customer_name: string | null;
    total: number;
    status: string;
    payment_method: string | null;
    sold_at: string;
  }> = [];
  let loadError = "";

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("sales_transactions")
      .select("id, transaction_number, channel, customer_name, total, status, payment_method, sold_at")
      .eq("partner_store_id", store.id)
      .order("sold_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      loadError = error.message;
      break;
    }

    const page = data ?? [];
    transactions.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const totalSales = transactions.reduce((sum, transaction) => sum + Number(transaction.total || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8">
        <Link href="/dashboard" className="mb-5 inline-flex text-sm font-medium text-[#557b64] hover:text-[#285b46]">
          &larr; Kembali ke dashboard mitra
        </Link>
        <p className="mb-2 text-sm font-medium text-[#557b64]">Laporan toko mitra</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">{store.name}</h1>
        <p className="mt-2 text-sm text-[#68756e]">
          {[store.address, store.city].filter(Boolean).join(", ") || "Alamat belum tersedia"}
        </p>
      </header>

      <section aria-label="Ringkasan penjualan toko" className="mb-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-md border border-[#e1e7e0] bg-white p-5 shadow-sm shadow-[#173b32]/5">
          <p className="text-sm text-[#68756e]">Jumlah Transaksi</p>
          <p className="mt-3 text-2xl font-semibold text-[#173b32]">{loadError ? "—" : transactions.length}</p>
        </article>
        <article className="rounded-md border border-[#e1e7e0] bg-white p-5 shadow-sm shadow-[#173b32]/5">
          <p className="text-sm text-[#68756e]">Total Penjualan</p>
          <p className="mt-3 break-words text-2xl font-semibold text-[#315d3e]">
            {loadError ? "—" : currencyFormatter.format(totalSales)}
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-md border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5">
        <div className="border-b border-[#edf0ec] px-5 py-4">
          <h2 className="font-semibold text-[#173b32]">Transaksi Toko</h2>
          <p className="mt-1 text-sm text-[#7b877f]">Riwayat transaksi berdasarkan waktu penjualan.</p>
        </div>
        {loadError ? (
          <p role="alert" className="px-5 py-6 text-sm text-[#9b4936]">Transaksi gagal dimuat: {loadError}</p>
        ) : transactions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#68756e]">Belum ada transaksi untuk toko ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f7f9f6] text-xs uppercase text-[#68756e]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Nomor</th>
                  <th scope="col" className="px-5 py-3 font-medium">Waktu</th>
                  <th scope="col" className="px-5 py-3 font-medium">Pelanggan</th>
                  <th scope="col" className="px-5 py-3 font-medium">Kanal</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Total</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ec]">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-[#fafbf9]">
                    <th scope="row" className="whitespace-nowrap px-5 py-4 font-medium text-[#293a32]">
                      {transaction.transaction_number}
                    </th>
                    <td className="whitespace-nowrap px-5 py-4 text-[#68756e]">
                      {dateFormatter.format(new Date(transaction.sold_at))}
                    </td>
                    <td className="px-5 py-4 text-[#68756e]">{transaction.customer_name || "-"}</td>
                    <td className="px-5 py-4 text-[#68756e]">{transaction.channel}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-[#293a32]">
                      {currencyFormatter.format(Number(transaction.total || 0))}
                    </td>
                    <td className="px-5 py-4 text-[#68756e]">{transaction.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}