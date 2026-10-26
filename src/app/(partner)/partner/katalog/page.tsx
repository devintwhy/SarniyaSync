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

  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name, is_active, status")
    .eq("owner_id", user.id);

  const storeIds = (stores ?? []).map((store) => store.id);
  const storeNames = new Map((stores ?? []).map((store) => [store.id, store.name]));
  let errorMessage = storesError?.message ?? "";

  type MasterProduct = {
    id: string;
    sku: string;
    name: string;
    category: string | null;
    selling_price: number;
    image_url: string | null;
    is_active: boolean;
  };
  const masterProducts: MasterProduct[] = [];

  if (!errorMessage) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("products")
        .select("id, sku, name, category, selling_price, image_url, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        errorMessage = error.message;
        break;
      }

      const page = data ?? [];
      masterProducts.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }

  type InventoryRow = {
    id: string;
    partner_store_id: string;
    product_id: string;
    stock_quantity: number;
  };

  const inventoryRows: InventoryRow[] = [];

  if (storeIds.length > 0 && !errorMessage) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("partner_store_inventory")
        .select("id, partner_store_id, product_id, stock_quantity")
        .in("partner_store_id", storeIds)
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

  // Relasi master produk dengan inventaris gerai mitra
  const inventoryMap = new Map<string, InventoryRow>();
  for (const row of inventoryRows) {
    inventoryMap.set(`${row.partner_store_id}_${row.product_id}`, row);
  }

  let partnerCatalogProducts: PartnerCatalogProduct[] = [];

  if ((stores ?? []).length > 0) {
    partnerCatalogProducts = (stores ?? []).flatMap((store) =>
      masterProducts.map((product) => {
        const allocation = inventoryMap.get(`${store.id}_${product.id}`);
        const stock = allocation ? (allocation.stock_quantity ?? 0) : 0;

        return {
          id: `${product.id}-${allocation?.id ?? store.id}`,
          name: product.name,
          sku: product.sku,
          category: product.category || "Hijab",
          selling_price: product.selling_price,
          stock_quantity: Math.max(0, stock),
          image_url: product.image_url ?? null,
          is_active: product.is_active,
          store_id: store.id,
          store_name: storeNames.get(store.id) || undefined,
        };
      })
    );
  } else {
    // Fallback: Tampilkan master produk dengan stok 0 jika mitra belum memiliki gerai
    partnerCatalogProducts = masterProducts.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category || "Hijab",
      selling_price: product.selling_price,
      stock_quantity: 0,
      image_url: product.image_url ?? null,
      is_active: product.is_active,
    }));
  }

  const storeOptions = (stores ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className="w-full px-2 py-3 sm:px-4 sm:py-4">
      <header className="mb-4">
        <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-3 py-0.5 text-[11px] font-bold text-terracotta-clay">
          Portal Mitra
        </span>
        <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-gray-900">
          Katalog Produk Mitra
        </h1>
        <p className="mt-0.5 text-xs text-gray-500">
          Etalase visual koleksi hijab dan ketersediaan stok fisik di gerai toko Anda.
        </p>
      </header>

      <PartnerCatalogClient
        products={partnerCatalogProducts}
        stores={storeOptions}
        errorMessage={errorMessage}
      />
    </div>
  );
}
