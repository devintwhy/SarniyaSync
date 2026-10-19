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
    <div className="w-full px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8">
        <Link href="/dashboard-mitra" className="mb-4 inline-flex text-sm font-semibold text-[#9d5c4c] hover:underline">
          &larr; Kembali ke dashboard mitra
        </Link>
        <div>
          <span className="inline-block rounded-full bg-[#f7e4d4] px-3 py-1 text-xs font-bold text-[#9d5c4c]">
            Laporan Toko Mitra
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#2d3440]">{store.name}</h1>
          <p className="mt-2 text-sm text-[#6d7687]">
            {[store.address, store.city].filter(Boolean).join(", ") || "Alamat belum tersedia"}
          </p>
        </div>
      </header>

      <section aria-label="Ringkasan penjualan toko" className="mb-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-[#2d3440]/5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7a8394]">Jumlah Transaksi</p>
          <p className="mt-3 text-3xl font-black text-[#2d3440]">{loadError ? "—" : transactions.length}</p>
        </article>
        <article className="rounded-2xl bg-gradient-to-br from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] p-6 text-white shadow-lg shadow-[#9d5c4c]/20">
          <p className="text-xs font-bold uppercase tracking-wider text-white/80">Total Penjualan</p>
          <p className="mt-3 break-words text-3xl font-black tracking-tight text-white">
            {loadError ? "—" : currencyFormatter.format(totalSales)}
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-bold text-[#2d3440]">Transaksi Toko</h2>
          <p className="mt-1 text-sm text-[#7a8394]">Riwayat transaksi berdasarkan waktu penjualan.</p>
        </div>
        {loadError ? (
          <p role="alert" className="px-6 py-6 text-sm text-red-600">Transaksi gagal dimuat: {loadError}</p>
        ) : transactions.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[#6d7687]">Belum ada transaksi untuk toko ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f0f2f5] text-xs uppercase tracking-wider text-[#6d7687] font-bold">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Nomor</th>
                  <th scope="col" className="px-6 py-3.5">Waktu</th>
                  <th scope="col" className="px-6 py-3.5">Pelanggan</th>
                  <th scope="col" className="px-6 py-3.5">Kanal</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Total</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50/70 transition-colors">
                    <th scope="row" className="whitespace-nowrap px-6 py-4 font-mono font-semibold text-[#2d3440]">
                      {transaction.transaction_number}
                    </th>
                    <td className="whitespace-nowrap px-6 py-4 text-[#576071]">
                      {dateFormatter.format(new Date(transaction.sold_at))}
                    </td>
                    <td className="px-6 py-4 text-[#576071]">{transaction.customer_name || "-"}</td>
                    <td className="px-6 py-4 text-[#576071]">{transaction.channel}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-black text-[#2d3440]">
                      {currencyFormatter.format(Number(transaction.total || 0))}
                    </td>
                    <td className="px-6 py-4 text-[#576071]">{transaction.status}</td>
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