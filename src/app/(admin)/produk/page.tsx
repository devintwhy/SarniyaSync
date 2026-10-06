import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import AddProductModal from "./add-product-modal";

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
    .select("id, sku, name, category, cost_price, selling_price, stock_quantity, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1.5 text-sm font-medium text-[#557b64]">Area Owner</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">
            Katalog Produk
          </h1>
          <p className="mt-2 text-sm text-[#68756e]">
            Kelola seluruh produk — harga modal, harga jual, dan stok pusat.
          </p>
        </div>

        {/* Tombol + Modal Tambah Produk (Client Component) */}
        <AddProductModal action={addProductAction} />
      </header>

      {/* ── Tabel Produk ───────────────────────────────────────────────────── */}
      <section
        aria-label="Daftar produk"
        className="overflow-hidden rounded-xl border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5"
      >
        <div className="flex items-center justify-between border-b border-[#edf0ec] px-5 py-4">
          <div>
            <h2 className="font-semibold text-[#173b32]">Semua Produk</h2>
            <p className="mt-0.5 text-sm text-[#7b877f]">
              {products ? `${products.length} produk terdaftar` : "Memuat data..."}
            </p>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-3 py-1.5 text-xs text-[#9b4936]"
            >
              Gagal memuat: {error.message}
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[#f7f9f6] text-xs uppercase tracking-wide text-[#68756e]">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-medium">
                  Nama Produk / SKU
                </th>
                <th scope="col" className="px-5 py-3.5 font-medium">
                  Kategori
                </th>
                <th scope="col" className="px-5 py-3.5 text-right font-medium">
                  Harga Modal
                </th>
                <th scope="col" className="px-5 py-3.5 text-right font-medium">
                  Harga Jual
                </th>
                <th scope="col" className="px-5 py-3.5 text-right font-medium">
                  Stok Pusat
                </th>
                <th scope="col" className="px-5 py-3.5 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0ec]">
              {!products || products.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-[#7b877f]"
                  >
                    {error
                      ? "Terjadi kesalahan saat memuat produk."
                      : "Belum ada produk. Klik \u00abTambah Produk\u00bb untuk memulai."}
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isLowStock = product.stock_quantity <= 5;
                  return (
                    <tr
                      key={product.id}
                      className="transition-colors hover:bg-[#fafbf9]"
                    >
                      {/* Nama / SKU */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#293a32]">{product.name}</p>
                        <p className="mt-0.5 text-xs text-[#7b877f]">{product.sku}</p>
                      </td>

                      {/* Kategori */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-[#edf5e8] px-2.5 py-0.5 text-xs font-medium text-[#315d3e]">
                          {product.category}
                        </span>
                      </td>

                      {/* Harga Modal */}
                      <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-[#52645a]">
                        {formatRupiah(product.cost_price)}
                      </td>

                      {/* Harga Jual */}
                      <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums font-medium text-[#293a32]">
                        {formatRupiah(product.selling_price)}
                      </td>

                      {/* Stok */}
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                            isLowStock
                              ? "bg-[#fff5f1] text-[#9b4936]"
                              : "bg-[#edf5e8] text-[#315d3e]"
                          }`}
                        >
                          {isLowStock && (
                            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#9b4936]" />
                          )}
                          {product.stock_quantity} pcs
                        </span>
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            product.is_active ? "text-[#315d3e]" : "text-[#7b877f]"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`size-2 rounded-full ${
                              product.is_active ? "bg-[#4caf50]" : "bg-[#b0bab6]"
                            }`}
                          />
                          {product.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
