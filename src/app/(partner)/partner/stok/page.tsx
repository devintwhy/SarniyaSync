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
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4">
      <header>
        <span className="inline-block rounded-full bg-[#f7e4d4] px-2.5 py-0.5 text-xs font-bold text-[#9d5c4c]">
          Portal Mitra
        </span>
        <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#2d3440]">Stok Toko</h1>
        <p className="mt-0.5 text-xs sm:text-sm text-[#6d7687]">Produk yang telah dialokasikan ke toko Anda.</p>
      </header>

      {errorMessage ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs sm:text-sm text-red-600">Stok gagal dimuat: {errorMessage}</p>
      ) : inventory.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-xs sm:text-sm text-[#6d7687]">
          Belum ada produk yang dialokasikan ke toko Anda.
        </div>
      ) : (
        <section aria-label="Inventori toko mitra" className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-bold text-[#2d3440]">Produk Toko</h2>
            <p className="mt-0.5 text-xs text-[#7a8394]">{inventory.length} alokasi produk</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
              <thead className="bg-[#f0f2f5] text-[11px] uppercase tracking-wider text-[#6d7687] font-bold">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5">Toko</th>
                  <th scope="col" className="px-3.5 py-2.5">SKU</th>
                  <th scope="col" className="px-3.5 py-2.5">Produk</th>
                  <th scope="col" className="px-3.5 py-2.5">Kategori</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right">Stok</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right">Harga Jual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((product) => (
                  <tr key={product.allocationId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3.5 py-2 text-xs sm:text-sm text-[#576071]">{product.storeName}</td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-xs font-mono text-[#7a8394]">{product.sku}</td>
                    <th scope="row" className="px-3.5 py-2 font-semibold text-[#2d3440]">{product.name}</th>
                    <td className="px-3.5 py-2 text-[#576071]">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#576071]">
                        {product.category}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-3.5 py-2 text-right font-bold ${product.stock_quantity <= 5 ? "text-amber-600" : "text-[#2d3440]"}`}>
                      {numberFormatter.format(product.stock_quantity)}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-right font-black text-[#2d3440]">{currencyFormatter.format(product.selling_price)}</td>
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