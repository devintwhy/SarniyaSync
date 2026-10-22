import { redirect } from "next/navigation";
import BulkAllocationClient from "./bulk-allocation-client";
import { getProfileRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Alokasi Stok Massal | SarniyaSync",
  description: "Alokasikan stok produk dari gudang pusat ke gerai toko mitra secara massal (bulk).",
};

const PAGE_SIZE = 1000;

export default async function StockAllocationPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getProfileRole(supabase, user.id);
  if (role !== "admin" && role !== "pemilik") redirect("/partner");

  // 1. Ambil data Toko Mitra Aktif
  const { data: storesData, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name, city")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const stores = storesData ?? [];

  // 2. Ambil seluruh produk gudang pusat yang memiliki stok > 0
  const products: Array<{
    id: string;
    sku: string;
    name: string;
    category?: string | null;
    stock_quantity: number;
  }> = [];
  let productError = "";

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, category, stock_quantity")
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .order("name", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      productError = error.message;
      break;
    }

    const page = data ?? [];
    products.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  // 3. Ambil data inventaris + join info toko mitra (tanpa filter is_active) agar toko yang sudah dinonaktifkan tetap muncul dengan datanya.
  const allocations: Array<{
    id: string;
    partner_store_id: string;
    product_id: string;
    stock_quantity: number;
    store_name: string | null;
    store_city: string | null;
    store_is_active: boolean | null;
  }> = [];
  let allocationError = "";

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("partner_store_inventory")
      .select(
        "id, partner_store_id, product_id, stock_quantity, partner_stores(name, city, is_active)"
      )
      .order("updated_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      allocationError = error.message;
      break;
    }

    const page = (data ?? []).map((row) => {
      const storeJoin = Array.isArray(row.partner_stores)
        ? row.partner_stores[0]
        : row.partner_stores;
      return {
        id: row.id,
        partner_store_id: row.partner_store_id,
        product_id: row.product_id,
        stock_quantity: row.stock_quantity,
        store_name: storeJoin?.name ?? null,
        store_city: storeJoin?.city ?? null,
        store_is_active: storeJoin?.is_active ?? null,
      };
    });

    allocations.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const loadError = storesError?.message ?? productError ?? allocationError;

  return (
    <div className="w-full space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-xs font-black text-terracotta-clay">
            Gudang Pusat & Logistik
          </span>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#2d3440]">
            Alokasi Stok Massal
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#7a8394]">
            Pilih multi-produk dari gudang pusat dan kirimkan stok sekaligus ke toko mitra pilihan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="rounded-xl bg-white border border-gray-200 shadow-sm px-3 py-1.5 text-xs font-bold text-gray-600">
            {products.length} Produk Tersedia
          </span>
          <span className="rounded-xl bg-orange-50 border border-orange-200/60 px-3 py-1.5 text-xs font-bold text-terracotta-clay">
            {stores.length} Toko Mitra Aktif
          </span>
        </div>
      </header>

      {loadError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800"
        >
          Sebagian data gagal dimuat: {loadError}
        </div>
      )}

      <BulkAllocationClient
        stores={stores.map((s) => ({
          id: s.id,
          name: s.name,
          city: s.city,
        }))}
        products={products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          stock_quantity: p.stock_quantity,
        }))}
        allocations={allocations.map((a) => ({
          id: a.id,
          partner_store_id: a.partner_store_id,
          product_id: a.product_id,
          stock_quantity: a.stock_quantity,
          store_name: a.store_name,
          store_city: a.store_city,
          store_is_active: a.store_is_active,
        }))}
      />
    </div>
  );
}