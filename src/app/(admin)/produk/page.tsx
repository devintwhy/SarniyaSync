import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import AddProductModal from "./add-product-modal";
import ProductTableClient from "./product-table-client";

export const metadata = {
  title: "Katalog Produk | SarniyaSync",
  description: "Kelola seluruh produk katalog SarniyaSync — tambah, lihat harga modal, harga jual, dan stok pusat.",
};

async function addProductAction(formData: FormData): Promise<{ error?: string }> {
  "use server";

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() ?? null;
  const category = (formData.get("category") as string | null)?.trim() ?? "";
  const color = (formData.get("color") as string | null)?.trim() || null;
  const size = (formData.get("size") as string | null)?.trim() || null;
  const costPriceRaw = formData.get("cost_price");
  const sellingPriceRaw = formData.get("selling_price");
  const stockRaw = formData.get("stock_quantity");

  if (!name) return { error: "Nama produk wajib diisi." };
  if (!category) return { error: "Kategori wajib dipilih." };

  const cost_price = Number(costPriceRaw);
  const selling_price = Number(sellingPriceRaw);
  const stock_quantity = Number(stockRaw);

  if (!Number.isFinite(cost_price) || cost_price < 0)
    return { error: "Harga modal tidak boleh minus atau kosong." };
  if (!Number.isFinite(selling_price) || selling_price < 0)
    return { error: "Harga jual tidak boleh minus atau kosong." };
  if (!Number.isFinite(stock_quantity) || stock_quantity < 0)
    return { error: "Stok awal tidak boleh minus atau kosong." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").insert({
    name,
    description,
    category,
    color,
    size,
    cost_price,
    selling_price,
    stock_quantity: Math.floor(stock_quantity),
    sku: `SKU-${Date.now()}`,
  });

  if (error) return { error: error.message };

  revalidatePath("/produk");
  return {};
}

export default async function ProdukPage() {
  const supabase = await createSupabaseServerClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id, sku, name, category, cost_price, selling_price, stock_quantity, image_url, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-[11px] font-bold text-terracotta-clay">
            Area Pemilik / Administrator
          </span>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-gray-900">
            Katalog Produk
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Katalog visual produk pusat dengan stok, harga jual, dan aksi kelola.
          </p>
        </div>

        <AddProductModal action={addProductAction} />
      </header>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ProductTableClient products={(products ?? []) as any} errorMessage={error?.message} />
    </div>
  );
}
