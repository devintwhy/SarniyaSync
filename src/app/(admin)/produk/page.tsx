import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import AddProductModal from "./add-product-modal";
import ProductTableClient from "./product-table-client";

export const metadata = {
  title: "Katalog Produk | SarniyaSync",
  description: "Kelola seluruh produk katalog SarniyaSync — tambah, lihat harga modal, harga jual, dan stok pusat.",
};

// ── Server Action ──────────────────────────────────────────────────────────────
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

  // ── Validasi dasar ─────────────────────────────────────────────────────────
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

  // ── Insert ke Supabase ─────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function ProdukPage() {
  const supabase = await createSupabaseServerClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id, sku, name, category, cost_price, selling_price, stock_quantity, image_url, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-block rounded-full bg-almond-cream px-2.5 py-0.5 text-[11px] font-bold text-terracotta-clay shadow-neu-sm">
            Area Pemilik / Administrator
          </span>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#2d3440]">
            Katalog Produk
          </h1>
          <p className="mt-0.5 text-xs text-[#6d7687]">
            Katalog visual produk pusat dengan stok, harga jual, dan aksi kelola.
          </p>
        </div>

        {/* Tombol + Modal Tambah Produk (Client Component) */}
        <AddProductModal action={addProductAction} />
      </header>

      {/* ── Grid Kartu Produk (Client Component) ─────────────────────────── */}
      <ProductTableClient products={(products ?? []) as any} errorMessage={error?.message} />
    </div>
  );
}
