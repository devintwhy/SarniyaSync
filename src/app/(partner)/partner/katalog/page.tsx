import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import PartnerCatalogClient, { PartnerCatalogProduct } from "./partner-catalog-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Katalog Produk Mitra | SarniyaSync",
  description: "Etalase visual koleksi hijab dan ketersediaan stok fisik di gerai toko Anda.",
};

const PAGE_SIZE = 1000;

export default async function PartnerKatalogPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. Ambil daftar toko milik Mitra yang sedang login (filter eksplisit: owner_id = user.id)
  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name, is_active, status")
    .eq("owner_id", user.id);

  const storeIds = (stores ?? []).map((store) => store.id);
  const storeNames = new Map((stores ?? []).map((store) => [store.id, store.name]));

  // 2. Ambil inventaris stok toko mitra dari partner_store_inventory
  type InventoryRow = {
    id: string;
    partner_store_id: string;
    product_id: string;
    stock_quantity: number;
  };

  const inventoryRows: InventoryRow[] = [];
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
      inventoryRows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }

  // 3. Ambil rincian produk (foto, nama, harga jual, kategori)
  const allocatedProductIds = Array.from(
    new Set(inventoryRows.map((row) => row.product_id))
  );

  const productsById = new Map<
    string,
    {
      id: string;
      sku: string;
      name: string;
      category: string;
      selling_price: number;
      image_url: string | null;
      is_active: boolean;
    }
  >();

  for (
    let offset = 0;
    offset < allocatedProductIds.length && !errorMessage;
    offset += PAGE_SIZE
  ) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, category, selling_price, image_url, is_active")
      .in("id", allocatedProductIds.slice(offset, offset + PAGE_SIZE));

    if (error) {
      errorMessage = error.message;
      break;
    }

    for (const product of data ?? []) {
      productsById.set(product.id, product);
    }
  }

  // 4. Bentuk data produk katalog mitra dengan stok aktual milik mitra
  const partnerCatalogProducts: PartnerCatalogProduct[] = inventoryRows.flatMap(
    (allocation) => {
      const product = productsById.get(allocation.product_id);
      if (!product) return [];

      return [
        {
          id: `${product.id}-${allocation.id}`,
          name: product.name,
          sku: product.sku,
          category: product.category || "Hijab",
          selling_price: product.selling_price,
          stock_quantity: allocation.stock_quantity,
          image_url: product.image_url ?? null,
          is_active: product.is_active,
          store_id: allocation.partner_store_id,
          store_name: storeNames.get(allocation.partner_store_id) || undefined,
        },
      ];
    }
  );

  const storeOptions = (stores ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className="w-full px-2 py-3 sm:px-4 sm:py-4">
      {/* ── Header Katalog Mitra ─────────────────────────────────────────── */}
      <header className="mb-4">
        <span className="inline-block rounded-full bg-almond-cream px-3 py-0.5 text-[11px] font-bold text-terracotta-clay shadow-neu-sm">
          Portal Mitra
        </span>
        <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#2d3440]">
          Katalog Produk Mitra
        </h1>
        <p className="mt-0.5 text-xs text-[#7a8394]">
          Etalase visual koleksi hijab dan ketersediaan stok fisik di gerai toko Anda.
        </p>
      </header>

      {/* ── Grid Katalog Visual (Read-Only) ─────────────────────────────── */}
      <PartnerCatalogClient
        products={partnerCatalogProducts}
        stores={storeOptions}
        errorMessage={errorMessage}
      />
    </div>
  );
}
