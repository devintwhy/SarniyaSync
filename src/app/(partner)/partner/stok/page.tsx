import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import PartnerStockClient from "./partner-stock-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;

export default async function PartnerStockPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name")
    .eq("owner_id", user.id);
  const storeIds = (stores ?? []).map((store) => store.id);
  const storeNames = new Map((stores ?? []).map((store) => [store.id, store.name]));
  const allocations: Array<{
    id: string;
    partner_store_id: string;
    product_id: string;
    stock_quantity: number;
  }> = [];
  let errorMessage = storesError?.message ?? "";

  if (storeIds.length > 0 && !errorMessage) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("partner_store_inventory")
        .select("id, partner_store_id, product_id, stock_quantity")
        .in("partner_store_id", storeIds)
        .order("created_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        errorMessage = error.message;
        break;
      }

      const page = data ?? [];
      allocations.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }

  const productIds = Array.from(new Set(allocations.map((allocation) => allocation.product_id)));
  const productsById = new Map<string, {
    id: string;
    sku: string;
    name: string;
    category: string;
    selling_price: number;
    image_url: string | null;
  }>();

  if (productIds.length > 0 && !errorMessage) {
    for (let offset = 0; offset < productIds.length; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("products")
        .select("id, sku, name, category, selling_price, image_url")
        .in("id", productIds.slice(offset, offset + PAGE_SIZE));

      if (error) {
        errorMessage = error.message;
        break;
      }

      for (const product of data ?? []) productsById.set(product.id, product);
    }
  }

  const inventory = allocations.flatMap((allocation) => {
    const product = productsById.get(allocation.product_id);
    return product
      ? [{
          allocationId: allocation.id,
          storeName: storeNames.get(allocation.partner_store_id) ?? "Toko",
          stock_quantity: allocation.stock_quantity,
          ...product,
        }]
      : [];
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
          href="/partner/stock-opname"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#9D5C4C]/30 bg-orange-50/50 px-3.5 text-xs font-bold text-[#9D5C4C] shadow-sm transition hover:bg-[#9D5C4C] hover:text-white"
        >
          Stock Opname &rarr;
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
        <PartnerStockClient initialInventory={inventory} />
      )}
    </div>
  );
}