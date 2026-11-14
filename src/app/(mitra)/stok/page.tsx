import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import MitraStokClient, { MitraStockProduct } from "./mitra-stok-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Stok Toko | Portal Mitra SarniyaSync",
  description: "Daftar inventaris dan sisa stok produk di gerai toko mitra.",
};

const PAGE_SIZE = 1000;

// Pengambilan Data Inventaris Toko Mitra
export default async function MitraStockPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Ambil data toko dan batch pertama inventory secara paralel
  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name")
    .eq("owner_id", user.id);

  const storeIds = (stores ?? []).map((store) => store.id);
  const storeNames = new Map((stores ?? []).map((store) => [store.id, store.name]));
  type InventoryQueryRow = {
    id: string;
    partner_store_id: string;
    product_id: string;
    stock_quantity: number;
    products: {
      id: string;
      sku: string;
      name: string;
      category: string | null;
      selling_price: number;
      image_url: string | null;
    } | Array<{
      id: string;
      sku: string;
      name: string;
      category: string | null;
      selling_price: number;
      image_url: string | null;
    }> | null;
  };

  const allocations: InventoryQueryRow[] = [];
  let errorMessage = storesError?.message ?? "";

  // Ambil inventaris toko beserta data produk dalam satu kueri terpadu
  if (storeIds.length > 0 && !errorMessage) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = (await supabase
        .from("partner_store_inventory")
        .select(`
          id,
          partner_store_id,
          product_id,
          stock_quantity,
          products (
            id,
            sku,
            name,
            category,
            selling_price,
            image_url
          )
        `)
        .in("partner_store_id", storeIds)
        .order("created_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)) as unknown as {
          data: InventoryQueryRow[] | null;
          error: { message: string } | null;
        };

      if (error) {
        errorMessage = error.message;
        break;
      }

      const page = data ?? [];
      allocations.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }

  const inventory: MitraStockProduct[] = allocations.flatMap((allocation) => {
    const product = Array.isArray(allocation.products)
      ? allocation.products[0]
      : allocation.products;

    if (!product) return [];

    return [{
      allocationId: allocation.id,
      storeName: storeNames.get(allocation.partner_store_id) ?? "Toko",
      stock_quantity: allocation.stock_quantity,
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category || "Hijab",
      selling_price: Number(product.selling_price || 0),
      image_url: product.image_url,
    }];
  });

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-xs font-bold text-terracotta-clay">
            Portal Mitra
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Stok Toko</h1>
          <p className="mt-0.5 text-sm text-gray-500">Produk yang telah dialokasikan ke toko Anda.</p>
        </div>
        <Link
          href="/penyesuaian-stok"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#9D5C4C]/30 bg-orange-50/50 px-3.5 text-xs font-bold text-[#9D5C4C] shadow-sm transition hover:bg-[#9D5C4C] hover:text-white"
        >
          Penyesuaian Stok &rarr;
        </Link>
      </header>

      {errorMessage ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800">
          Stok gagal dimuat: {errorMessage}
        </p>
      ) : inventory.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-xs sm:text-sm text-gray-500 shadow-sm">
          Belum ada produk yang dialokasikan ke toko Anda.
        </div>
      ) : (
        <MitraStokClient initialInventory={inventory} />
      )}
    </div>
  );
}

