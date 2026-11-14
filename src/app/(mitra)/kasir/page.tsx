import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import PosCartForm from "./pos-cart-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kasir (Point of Sale) | Portal Mitra SarniyaSync",
  description: "Layar kasir toko untuk melayani transaksi belanja pelanggan, keranjang POS, dan cetak struk thermal.",
};

const PAGE_SIZE = 1000;

// Halaman Utama Kasir (Point of Sale)
export default async function MitraKasirPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  type MasterProduct = {
    id: string;
    sku: string;
    name: string;
    category?: string | null;
    selling_price: number;
    image_url: string | null;
  };

  const [storesResult, initialProductsResult] = await Promise.all([
    supabase
      .from("partner_stores")
      .select("id, name, is_active, status")
      .eq("owner_id", user.id),
    supabase
      .from("products")
      .select("id, sku, name, category, selling_price, image_url")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(0, PAGE_SIZE - 1),
  ]);

  const stores = storesResult.data;
  let inventoryError = storesResult.error?.message ?? initialProductsResult.error?.message ?? "";

  const activeStores = (stores ?? []).filter((store) =>
    store.status ? store.status === "aktif" : store.is_active,
  );

  if ((stores ?? []).length > 0 && activeStores.length === 0) {
    redirect("/status");
  }

  const storeIds = activeStores.map((store) => store.id);

  const masterProducts: MasterProduct[] = (initialProductsResult.data ?? []).map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    category: item.category,
    selling_price: Number(item.selling_price || 0),
    image_url: item.image_url,
  }));

  if (!inventoryError && (initialProductsResult.data ?? []).length === PAGE_SIZE) {
    for (let offset = PAGE_SIZE; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("products")
        .select("id, sku, name, category, selling_price, image_url")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        inventoryError = error.message;
        break;
      }

      const page = (data ?? []).map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        selling_price: Number(item.selling_price || 0),
        image_url: item.image_url,
      }));

      masterProducts.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }

  const masterProductMap = new Map(masterProducts.map((product) => [product.id, product]));

  type RawInventoryRow = {
    id: string;
    partner_store_id: string;
    product_id: string;
    stock_quantity: number | string | null;
  };
  const storeInventoryRows: RawInventoryRow[] = [];

  if (storeIds.length > 0 && !inventoryError) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("partner_store_inventory")
        .select("id, partner_store_id, product_id, stock_quantity")
        .in("partner_store_id", storeIds)
        .order("created_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        inventoryError = error.message;
        break;
      }

      const page = (data ?? []) as RawInventoryRow[];
      storeInventoryRows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }

  const inventory = storeInventoryRows.flatMap((row) => {
    const product = masterProductMap.get(row.product_id);
    if (!product) return [];

    return [
      {
        storeId: row.partner_store_id,
        allocationId: row.id,
        productId: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        sellingPrice: product.selling_price,
        stock: Number(row.stock_quantity ?? 0),
        imageUrl: product.image_url,
      },
    ];
  });

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {inventoryError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50/95 p-3 text-xs sm:text-sm font-semibold text-rose-800"
        >
          Gagal sinkronisasi data kasir: {inventoryError}
        </div>
      )}

      {activeStores.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Belum Ada Toko Terdaftar</h2>
          <p className="mt-1 text-xs text-gray-500">
            Anda belum memiliki toko mitra aktif untuk membuka sesi kasir.
          </p>
        </div>
      ) : (
        <PosCartForm
          stores={activeStores.map((s) => ({ id: s.id, name: s.name }))}
          inventory={inventory}
        />
      )}
    </div>
  );
}

