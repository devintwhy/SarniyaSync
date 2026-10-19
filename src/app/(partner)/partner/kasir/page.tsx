import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import PosCartForm from "./pos-cart-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kasir (Point of Sale) | Portal Mitra SarniyaSync",
  description: "Layar kasir toko untuk melayani transaksi belanja pelanggan, keranjang POS, dan cetak struk thermal.",
};

const PAGE_SIZE = 1000;

export default async function PartnerKasirPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Ambil daftar toko mitra ──────────────────────────────────────────────
  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name, is_active, status")
    .eq("owner_id", user.id);

  const activeStores = (stores ?? []).filter((store) =>
    store.status ? store.status === "aktif" : store.is_active,
  );

  // Jika akun mitra masih pending atau nonaktif, cegah akses kasir dan arahkan ke halaman status
  if ((stores ?? []).length > 0 && activeStores.length === 0) {
    redirect("/partner/status");
  }

  const storeIds = activeStores.map((store) => store.id);

  // ── Ambil inventaris (partner_store_inventory + produk) ─────────────────
  type AllocationRow = {
    id: string;
    partner_store_id: string;
    product_id: string;
    stock_quantity: number;
  };
  const allocationRows: AllocationRow[] = [];
  let inventoryError = storesError?.message ?? "";

  if (storeIds.length > 0 && !inventoryError) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("partner_store_inventory")
        .select("id, partner_store_id, product_id, stock_quantity")
        .in("partner_store_id", storeIds)
        .gt("stock_quantity", 0)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        inventoryError = error.message;
        break;
      }

      const page = data ?? [];
      allocationRows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }

  const allocatedProductIds = Array.from(
    new Set(allocationRows.map((row) => row.product_id)),
  );
  const productsById = new Map<
    string,
    { id: string; sku: string; name: string; selling_price: number; image_url: string | null }
  >();

  for (
    let offset = 0;
    offset < allocatedProductIds.length && !inventoryError;
    offset += PAGE_SIZE
  ) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, selling_price, image_url")
      .in("id", allocatedProductIds.slice(offset, offset + PAGE_SIZE))
      .eq("is_active", true);

    if (error) {
      inventoryError = error.message;
      break;
    }

    for (const product of data ?? []) productsById.set(product.id, product);
  }

  // ── Bentuk array inventory yang dibutuhkan PosCartForm ───────────────────
  const partnerInventory = allocationRows.flatMap((allocation) => {
    const product = productsById.get(allocation.product_id);
    return product
      ? [
        {
          storeId: allocation.partner_store_id,
          allocationId: allocation.id,
          productId: product.id,
          sku: product.sku,
          name: product.name,
          sellingPrice: product.selling_price,
          stock: allocation.stock_quantity,
          imageUrl: product.image_url ?? null,
        },
      ]
      : [];
  });

  return (
    <div className="w-full px-2 py-3 sm:px-4 sm:py-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="mb-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-block rounded-full bg-almond-cream px-3 py-0.5 text-[11px] font-bold text-terracotta-clay shadow-neu-sm">
            Portal Mitra POS
          </span>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#2d3440]">
            Kasir Penjualan
          </h1>
          <p className="mt-0.5 text-xs font-medium text-[#7a8394]">
            Layar kasir modern untuk melayani pesanan pelanggan secara cepat &amp; cetak struk nota.
          </p>
        </div>
      </header>

      {/* ── Konten Kasir Modern POS ────────────────────────────────────────── */}
      {inventoryError ? (
        <div
          role="alert"
          className="rounded-3xl border border-rose-300 bg-rose-50/95 p-6 text-sm font-semibold text-rose-800 shadow-neu-sm"
        >
          Pilihan stok gagal dimuat: {inventoryError}
        </div>
      ) : activeStores.length === 0 ? (
        <div className="rounded-3xl bg-[#e0e5ec] p-12 text-center text-sm font-medium text-[#7a8394] shadow-neu-flat">
          Belum ada toko aktif yang terdaftar untuk akun Anda.
        </div>
      ) : (
        <PosCartForm
          stores={activeStores.map((store) => ({
            id: store.id,
            name: store.name,
          }))}
          inventory={partnerInventory}
        />
      )}
    </div>
  );
}
