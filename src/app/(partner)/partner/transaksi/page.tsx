import { redirect } from "next/navigation";
import type { Json } from "@/utils/supabase/database.types";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import PosCartForm from "./pos-cart-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kasir & Transaksi | Portal Mitra SarniyaSync",
  description: "Catat penjualan multi-item dengan keranjang belanja dan tinjau riwayat transaksi toko.",
};

const PAGE_SIZE = 1000;
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function readSaleItems(items: Json) {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, Json | undefined>;
    const quantity = Number(record.quantity);
    const unitPrice = Number(record.unit_price);
    const total = Number(record.line_total);
    return [
      {
        name: typeof record.name === "string" ? record.name : "Produk",
        quantity:
          Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        total: Number.isFinite(total)
          ? total
          : Number.isFinite(unitPrice)
            ? unitPrice * quantity
            : 0,
      },
    ];
  });
}

export default async function PartnerTransactionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Ambil daftar toko mitra ──────────────────────────────────────────────
  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name, is_active")
    .eq("owner_id", user.id);

  const storeNames = new Map(
    (stores ?? []).map((store) => [store.id, store.name]),
  );
  const activeStores = (stores ?? []).filter((store) => store.is_active);
  const storeIds = activeStores.map((store) => store.id);

  // ── Ambil inventaris (partner_store_inventory + produk) ─────────────────
  type AllocationRow = {
    id: string;
    partner_store_id: string;
    product_id: string;
    stock_quantity: number;
  };
  const allocationRows: AllocationRow[] = [];
  let inventoryError = "";

  if (storeIds.length > 0) {
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

  // ── Ambil riwayat transaksi ──────────────────────────────────────────────
  const transactions: Array<{
    id: string;
    transaction_number: string;
    partner_store_id: string;
    items: Json;
    total: number;
    payment_method: string | null;
    status: string;
    sold_at: string;
  }> = [];
  let errorMessage = storesError?.message ?? inventoryError;

  if (storeIds.length && !errorMessage) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("sales_transactions")
        .select(
          "id, transaction_number, partner_store_id, items, total, payment_method, status, sold_at",
        )
        .in("partner_store_id", storeIds)
        .order("sold_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        errorMessage = error.message;
        break;
      }

      const page = data ?? [];
      transactions.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }

  // ── Buat baris riwayat per item di dalam transaksi ───────────────────────
  const historyRows = transactions.flatMap((transaction) =>
    readSaleItems(transaction.items).map((item, index) => ({
      id: `${transaction.id}-${index}`,
      transactionNumber: transaction.transaction_number,
      storeName: storeNames.get(transaction.partner_store_id) ?? "-",
      paymentMethod: transaction.payment_method ?? "-",
      soldAt: transaction.sold_at,
      ...item,
    })),
  );

  const paymentLabel: Record<string, string> = {
    cash: "Tunai",
    transfer: "Transfer",
    qris: "QRIS",
  };

  // =========================================================================
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="mb-8">
        <p className="mb-1.5 text-sm font-medium text-[#557b64]">Portal Mitra</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">
          Kasir &amp; Transaksi
        </h1>
        <p className="mt-2 text-sm text-[#68756e]">
          Tambahkan item ke keranjang, lalu proses transaksi sekaligus.
        </p>
      </header>

      {/* ── Form POS Kasir ──────────────────────────────────────────────────── */}
      <section className="mb-8 overflow-hidden rounded-xl border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5">
        <div className="border-b border-[#edf0ec] px-5 py-4">
          <h2 className="font-semibold text-[#173b32]">Catat Penjualan</h2>
          <p className="mt-0.5 text-sm text-[#7b877f]">
            Pilih produk dan jumlah, tambahkan ke keranjang, lalu tekan Proses Transaksi.
          </p>
        </div>

        {inventoryError ? (
          <p role="alert" className="px-5 py-5 text-sm text-[#9b4936]">
            Pilihan stok gagal dimuat: {inventoryError}
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

      {/* ── Riwayat Transaksi ───────────────────────────────────────────────── */}
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-[#f0d4cc] bg-[#fff5f1] px-4 py-3 text-sm text-[#9b4936]"
        >
          Transaksi gagal dimuat: {errorMessage}
        </p>
      ) : historyRows.length === 0 ? (
        <div className="rounded-xl border border-[#e1e7e0] bg-white px-5 py-10 text-center text-sm text-[#68756e]">
          Belum ada transaksi toko.
        </div>
      ) : (
        <section
          aria-label="Riwayat transaksi toko"
          className="overflow-hidden rounded-xl border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5"
        >
          <div className="border-b border-[#edf0ec] px-5 py-4">
            <h2 className="font-semibold text-[#173b32]">Riwayat Transaksi</h2>
            <p className="mt-0.5 text-sm text-[#7b877f]">
              {historyRows.length} item terjual — terbaru di atas.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-[#f7f9f6] text-xs uppercase tracking-wide text-[#68756e]">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-medium">
                    Produk
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right font-medium">
                    Jml
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right font-medium">
                    Harga Satuan
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-medium">
                    Toko
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-medium">
                    Bayar
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-medium">
                    Waktu
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right font-medium">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ec]">
                {historyRows.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-[#fafbf9]">
                    <th scope="row" className="px-5 py-4 font-medium text-[#293a32]">
                      <span>{item.name}</span>
                      <span className="mt-0.5 block text-xs font-normal text-[#7b877f]">
                        {item.transactionNumber}
                      </span>
                    </th>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums font-medium text-[#293a32]">
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-[#52645a]">
                      {currencyFormatter.format(item.unitPrice)}
                    </td>
                    <td className="px-5 py-4 text-[#68756e]">{item.storeName}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-full bg-[#edf5e8] px-2.5 py-0.5 text-xs font-medium text-[#315d3e]">
                        {paymentLabel[item.paymentMethod] ?? item.paymentMethod}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#68756e]">
                      {dateFormatter.format(new Date(item.soldAt))}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums font-semibold text-[#293a32]">
                      {currencyFormatter.format(item.total)}
                    </td>
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