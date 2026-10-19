import { redirect } from "next/navigation";
import AllocationForm from "./allocation-form";
import { getProfileRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;
const numberFormatter = new Intl.NumberFormat("id-ID");

export default async function StockAllocationPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getProfileRole(supabase, user.id);
  if (role !== "admin" && role !== "pemilik") redirect("/partner");

  const [{ data: storesData, error: storesError }] = await Promise.all([
    supabase
      .from("partner_stores")
      .select("id, name, city")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  const stores = storesData ?? [];
  const products: Array<{
    id: string;
    sku: string;
    name: string;
    stock_quantity: number;
  }> = [];
  let productError = "";

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, stock_quantity")
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

  const storeNames = new Map(stores.map((store) => [store.id, store]));
  const productsById = new Map(products.map((product) => [product.id, product]));
  const allocations: Array<{
    id: string;
    partner_store_id: string;
    product_id: string;
    stock_quantity: number;
  }> = [];
  let allocationError = "";

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("partner_store_inventory")
      .select("id, partner_store_id, product_id, stock_quantity")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      allocationError = error.message;
      break;
    }

    const page = data ?? [];
    allocations.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const loadError = storesError?.message ?? productError ?? allocationError;

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <header>
        <span className="inline-block rounded-full bg-[#f7e4d4] px-2.5 py-0.5 text-xs font-bold text-[#9d5c4c]">
          Area Pemilik / Admin
        </span>
        <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#2d3440]">Alokasi Stok</h1>
        <p className="mt-0.5 text-xs sm:text-sm text-[#6d7687]">Pindahkan stok dari katalog pusat ke toko mitra.</p>
      </header>

      <section aria-label="Form alokasi stok" className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-bold text-[#2d3440]">Alokasikan Produk</h2>
          <p className="mt-0.5 text-xs text-[#7a8394]">Stok pusat berkurang saat alokasi berhasil.</p>
        </div>
        <AllocationForm
          stores={stores.map((store) => ({ id: store.id, name: store.name }))}
          products={products.map((product) => ({
            id: product.id,
            sku: product.sku,
            name: product.name,
            stock_quantity: product.stock_quantity,
          }))}
        />
      </section>

      <section aria-label="Daftar alokasi stok" className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-bold text-[#2d3440]">Stok di Toko Mitra</h2>
          <p className="mt-0.5 text-xs text-[#7a8394]">{allocations.length} alokasi produk</p>
        </div>
        {loadError ? (
          <p role="alert" className="px-4 py-3 text-xs sm:text-sm text-red-600">Data alokasi gagal dimuat: {loadError}</p>
        ) : allocations.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs sm:text-sm text-[#6d7687]">Belum ada stok yang dialokasikan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
              <thead className="bg-[#f0f2f5] text-[11px] uppercase tracking-wider text-[#6d7687]">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5 font-bold">Toko Mitra</th>
                  <th scope="col" className="px-3.5 py-2.5 font-bold">SKU</th>
                  <th scope="col" className="px-3.5 py-2.5 font-bold">Produk</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right font-bold">Stok Dialokasikan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((allocation) => {
                  const store = storeNames.get(allocation.partner_store_id);
                  const product = productsById.get(allocation.product_id);

                  return (
                    <tr key={allocation.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3.5 py-2 text-xs sm:text-sm text-[#576071]">
                        {store ? `${store.name}${store.city ? ` · ${store.city}` : ""}` : "Toko tidak ditemukan"}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2 text-xs font-mono text-[#7a8394]">{product?.sku ?? "-"}</td>
                      <th scope="row" className="px-3.5 py-2 font-semibold text-[#2d3440]">{product?.name ?? "Produk tidak ditemukan"}</th>
                      <td className="whitespace-nowrap px-3.5 py-2 text-right font-bold text-[#2d3440]">
                        {numberFormatter.format(allocation.stock_quantity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}