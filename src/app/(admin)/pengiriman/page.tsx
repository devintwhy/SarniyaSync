import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getProfileRole } from "@/utils/supabase/auth";
import PengirimanClient from "./pengiriman-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Status Pengiriman | SarniyaSync",
  description: "Monitoring status pengiriman stok dari Gudang Pusat ke Toko Mitra.",
};

export default async function PengirimanPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getProfileRole(supabase, user.id);
  if (role !== "admin" && role !== "pemilik") redirect("/dashboard");

  const { data, error } = await supabase
    .from("stock_transfers")
    .select(`
      id,
      quantity,
      status,
      sent_at,
      received_at,
      notes,
      product:products(id, name, sku),
      store:partner_stores(id, name, city)
    `)
    .order("sent_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[PengirimanPage] fetch error:", error.message);
  }

  const transfers = (data ?? []) as unknown as import("./pengiriman-client").TransferRow[];

  return (
    <div className="w-full space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-xs font-bold text-terracotta-clay">
            Logistik & Supply Chain
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            Status Pengiriman
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Pantau seluruh status kiriman stok dari Gudang Pusat ke Toko Mitra secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="rounded-lg bg-white border border-gray-200 shadow-sm px-3 py-1.5 text-xs font-bold text-amber-600">
            {transfers.filter((t) => t.status === "DIKIRIM").length} Dalam Perjalanan
          </span>
          <span className="rounded-lg bg-white border border-gray-200 shadow-sm px-3 py-1.5 text-xs font-bold text-emerald-700">
            {transfers.filter((t) => t.status === "DITERIMA").length} Telah Diterima
          </span>
        </div>
      </header>

      <PengirimanClient initialTransfers={transfers} />
    </div>
  );
}
