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
    { id: string; sku: string; name: string; selling_price: number }
  >();

  for (
    let offset = 0;
    offset < allocatedProductIds.length && !inventoryError;
    offset += PAGE_SIZE
  ) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, selling_price")
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
          },
        ]
      : [];
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="mb-8">
        <span className="inline-block rounded-full bg-[#f7e4d4] px-3 py-1 text-xs font-bold text-[#9d5c4c]">
          Portal Mitra
        </span>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#2d3440]">
          Kasir Penjualan
        </h1>
        <p className="mt-2 text-sm text-[#6d7687]">
          Pilih produk, tentukan jumlah, masukkan ke keranjang belanja, dan proses pembayaran transaksi.
        </p>
      </header>

      {/* ── Form POS Kasir ──────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-bold text-[#2d3440]">Point of Sale (POS)</h2>
          <p className="mt-1 text-sm text-[#7a8394]">
            Layar kasir untuk melayani pesanan belanja pelanggan secara langsung.
          </p>
        </div>

        {inventoryError ? (
          <p role="alert" className="px-5 py-5 text-sm text-[#9b4936]">
            Pilihan stok gagal dimuat: {inventoryError}
          </p>
        ) : activeStores.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#68756e]">
            Belum ada toko aktif yang terdaftar untuk akun Anda.
          </p>
        ) : (
          <PosCartForm
            stores={activeStores.map((store) => ({
              id: store.id,
              name: store.name,
            }))}
            inventory={partnerInventory}
          />
        )}
      </section>
    </div>
  );
}
