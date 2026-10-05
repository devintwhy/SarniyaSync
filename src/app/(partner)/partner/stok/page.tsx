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
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#557b64]">Portal Mitra</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">Stok Toko</h1>
        <p className="mt-2 text-sm text-[#68756e]">Produk yang telah dialokasikan ke toko Anda.</p>
      </header>

      {errorMessage ? (
        <p role="alert" className="rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-4 py-3 text-sm text-[#9b4936]">Stok gagal dimuat: {errorMessage}</p>
      ) : inventory.length === 0 ? (
        <div className="rounded-md border border-[#e1e7e0] bg-white px-5 py-10 text-center text-sm text-[#68756e]">
          Belum ada produk yang dialokasikan ke toko Anda.
        </div>
      ) : (
        <section aria-label="Inventori toko mitra" className="overflow-hidden rounded-md border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5">
          <div className="border-b border-[#edf0ec] px-5 py-4">
            <h2 className="font-semibold text-[#173b32]">Produk Toko</h2>
            <p className="mt-1 text-sm text-[#7b877f]">{inventory.length} alokasi produk</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f7f9f6] text-xs uppercase text-[#68756e]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Toko</th>
                  <th scope="col" className="px-5 py-3 font-medium">SKU</th>
                  <th scope="col" className="px-5 py-3 font-medium">Produk</th>
                  <th scope="col" className="px-5 py-3 font-medium">Kategori</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Stok</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Harga Jual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ec]">
                {inventory.map((product) => (
                  <tr key={product.allocationId} className="hover:bg-[#fafbf9]">
                    <td className="px-5 py-4 text-[#68756e]">{product.storeName}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-[#7b877f]">{product.sku}</td>
                    <th scope="row" className="px-5 py-4 font-medium text-[#293a32]">{product.name}</th>
                    <td className="px-5 py-4 text-[#68756e]">{product.category}</td>
                    <td className={`whitespace-nowrap px-5 py-4 text-right font-semibold ${product.stock_quantity <= 5 ? "text-[#a44d36]" : "text-[#293a32]"}`}>
                      {numberFormatter.format(product.stock_quantity)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-[#293a32]">{currencyFormatter.format(product.selling_price)}</td>
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