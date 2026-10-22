import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import PenerimaanClient, { StockTransferItem } from "./penerimaan-client";
import { Truck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Riwayat Penerimaan Barang | Portal Mitra",
  description: "Pantau seluruh riwayat pengiriman stok dari Gudang Pusat ke toko Anda.",
};

export default async function PenerimaanPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: store, error: storeError } = await supabase
    .from("partner_stores")
    .select("id, name")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (storeError) {
    console.error("[PenerimaanPage] storeError:", storeError.message);
  }

  let initialTransfers: StockTransferItem[] = [];

  if (store) {
    // Ambil SELURUH riwayat (semua status), urutkan terbaru
    const { data, error: transferError } = await supabase
      .from("stock_transfers")
      .select(
        `id, quantity, status, sent_at, received_at,
         product:products(id, name, sku, category)`
      )
      .eq("partner_store_id", store.id)
      .order("sent_at", { ascending: false });

    if (transferError) {
      console.error("[PenerimaanPage] transferError:", transferError.message);
    } else {
      initialTransfers = (data ?? []) as unknown as StockTransferItem[];
    }
  }

  const storeName = store?.name ?? "Toko Anda";
  const pendingCount = initialTransfers.filter((t) => t.status === "DIKIRIM").length;

  return (
    <div className="w-full space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-xs font-bold text-terracotta-clay">
            Logistik Mitra
          </span>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-gray-900">
            Riwayat Penerimaan Barang
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
            Seluruh riwayat pengiriman stok dari Gudang Pusat ke{" "}
            <span className="font-semibold text-gray-800">{storeName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 shadow-sm px-3 py-1.5 text-xs font-bold text-amber-600">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
              </span>
              {pendingCount} Paket Menunggu
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 shadow-sm px-3 py-1.5 text-xs font-bold text-gray-700">
            <Truck size={13} />
            {initialTransfers.length} Total Kiriman
          </span>
        </div>
      </header>

      {!store && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-xs font-semibold text-rose-800"
        >
          Akun Anda belum memiliki toko mitra aktif. Hubungi Admin untuk aktivasi.
        </div>
      )}

      <PenerimaanClient
        initialTransfers={initialTransfers}
        storeName={storeName}
      />
    </div>
  );
}
