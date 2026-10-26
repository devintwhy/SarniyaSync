import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;
const numberFormatter = new Intl.NumberFormat("id-ID");
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function getCategoryBadgeClass(category: string | null | undefined): string {
  const cat = String(category || "").toLowerCase().trim();
  if (cat.includes("pashmina")) {
    return "bg-purple-100 text-purple-700";
  }
  if (cat.includes("bergo")) {
    return "bg-orange-100 text-orange-700";
  }
  if (cat.includes("segi empat") || cat.includes("segiempat") || cat.includes("square")) {
    return "bg-teal-100 text-teal-700";
  }
  return "bg-gray-100 text-gray-700";
}

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
      <header>
        <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-xs font-bold text-terracotta-clay">
          Portal Mitra
        </span>
        <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-gray-900">Stok Toko</h1>
        <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Produk yang telah dialokasikan ke toko Anda.</p>
      </header>

      {errorMessage ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800">Stok gagal dimuat: {errorMessage}</p>
      ) : inventory.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-xs sm:text-sm text-gray-500 shadow-sm">
          Belum ada produk yang dialokasikan ke toko Anda.
        </div>
      ) : (
        <section aria-label="Inventori toko mitra" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-3">
            <h2 className="text-base font-bold text-gray-900">Produk Toko</h2>
            <p className="mt-0.5 text-xs text-gray-500">{inventory.length} alokasi produk</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 shadow-sm">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5">Toko</th>
                  <th scope="col" className="px-3.5 py-2.5">SKU</th>
                  <th scope="col" className="px-3.5 py-2.5">Produk</th>
                  <th scope="col" className="px-3.5 py-2.5">Kategori</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right">Stok</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right">Harga Jual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventory.map((product) => (
                  <tr key={product.allocationId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3.5 py-2 text-xs sm:text-sm text-gray-600">{product.storeName}</td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-xs font-mono text-gray-500">{product.sku}</td>
                    <th scope="row" className="px-3.5 py-2 font-semibold text-gray-900">{product.name}</th>
                    <td className="px-3.5 py-2">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryBadgeClass(product.category)}`}>
                        {product.category || "Hijab"}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-3.5 py-2 text-right font-bold ${product.stock_quantity <= 5 ? "text-amber-700" : "text-gray-900"}`}>
                      {numberFormatter.format(product.stock_quantity)}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-right font-black text-gray-900">{currencyFormatter.format(product.selling_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}