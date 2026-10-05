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

  const [{ data: stores, error: storesError }] = await Promise.all([
    supabase
      .from("partner_stores")
      .select("id, name, city, is_active")
      .order("name", { ascending: true }),
  ]);

  const storeNames = new Map((stores ?? []).map((store) => [store.id, store]));
  const activeStores = (stores ?? []).filter((store) => store.is_active);
  const products: Array<{
    id: string;
    sku: string;
    name: string;
    stock_quantity: number;
    is_active: boolean;
  }> = [];
  let productError = "";

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, stock_quantity, is_active")
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
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#557b64]">Area Pemilik/Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">Alokasi Stok</h1>
        <p className="mt-2 text-sm text-[#68756e]">Pindahkan stok dari katalog pusat ke toko mitra.</p>
      </header>

      <section aria-label="Form alokasi stok" className="mb-6 overflow-hidden rounded-md border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5">
        <div className="border-b border-[#edf0ec] px-5 py-4">
          <h2 className="font-semibold text-[#173b32]">Alokasikan Produk</h2>
          <p className="mt-1 text-sm text-[#7b877f]">Stok pusat berkurang saat alokasi berhasil.</p>
        </div>
        <AllocationForm
          stores={activeStores.map((store) => ({ id: store.id, name: store.name }))}
          products={products.filter((product) => product.is_active && product.stock_quantity > 0).map((product) => ({
            id: product.id,
            sku: product.sku,
            name: product.name,
            stock_quantity: product.stock_quantity,
          }))}
        />
      </section>

      <section aria-label="Daftar alokasi stok" className="overflow-hidden rounded-md border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5">
        <div className="border-b border-[#edf0ec] px-5 py-4">
          <h2 className="font-semibold text-[#173b32]">Stok di Toko Mitra</h2>
          <p className="mt-1 text-sm text-[#7b877f]">{allocations.length} alokasi produk</p>
        </div>
        {loadError ? (
          <p role="alert" className="px-5 py-5 text-sm text-[#9b4936]">Data alokasi gagal dimuat: {loadError}</p>
        ) : allocations.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#68756e]">Belum ada stok yang dialokasikan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#f7f9f6] text-xs uppercase text-[#68756e]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Toko Mitra</th>
                  <th scope="col" className="px-5 py-3 font-medium">SKU</th>
                  <th scope="col" className="px-5 py-3 font-medium">Produk</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Stok Dialokasikan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ec]">
                {allocations.map((allocation) => {
                  const store = storeNames.get(allocation.partner_store_id);
                  const product = productsById.get(allocation.product_id);

                  return (
                    <tr key={allocation.id} className="hover:bg-[#fafbf9]">
                      <td className="px-5 py-4 text-[#68756e]">
                        {store ? `${store.name}${store.city ? ` · ${store.city}` : ""}` : "Toko tidak ditemukan"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-[#7b877f]">{product?.sku ?? "-"}</td>
                      <th scope="row" className="px-5 py-4 font-medium text-[#293a32]">{product?.name ?? "Produk tidak ditemukan"}</th>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-[#293a32]">
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