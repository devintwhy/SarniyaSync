"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getProfileRole } from "@/utils/supabase/auth";

// ── Tipe data item keranjang yang dikirim dari client ─────────────────────────
export type CartItemInput = {
  productId: string;
  productName: string;
  allocationId: string; // id baris partner_store_inventory
  price: number;        // selling_price saat ditambahkan ke keranjang
  quantity: number;
};

export type CartTransactionInput = {
  partnerStoreId: string;
  paymentMethod: string;
  items: CartItemInput[];
};

export type CartTransactionResult = {
  transactionId?: string;
  error?: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_PAYMENT = new Set(["cash", "transfer", "qris"]);

export async function recordCartTransaction(
  input: CartTransactionInput,
): Promise<CartTransactionResult> {
  try {
    // ── Validasi input dasar ───────────────────────────────────────────────
    if (!uuidPattern.test(input.partnerStoreId))
      return { error: "Toko tidak valid." };
    if (!VALID_PAYMENT.has(input.paymentMethod))
      return { error: "Metode pembayaran tidak valid." };
    if (!Array.isArray(input.items) || input.items.length === 0)
      return { error: "Keranjang belanja kosong." };
    if (input.items.length > 50)
      return { error: "Terlalu banyak item dalam satu transaksi (maks. 50)." };

    for (const item of input.items) {
      if (!uuidPattern.test(item.productId) || !uuidPattern.test(item.allocationId))
        return { error: `ID produk tidak valid: ${item.productName}.` };
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1)
        return { error: `Jumlah tidak valid untuk produk: ${item.productName}.` };
    }

    // ── Auth & Role ────────────────────────────────────────────────────────
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return { error: "Sesi login diperlukan. Silakan masuk kembali." };

    if ((await getProfileRole(supabase, user.id)) !== "mitra")
      return { error: "Hanya akun Mitra yang dapat mencatat penjualan." };

    // ── Verifikasi kepemilikan toko ────────────────────────────────────────
    const { data: store, error: storeError } = await supabase
      .from("partner_stores")
      .select("id")
      .eq("id", input.partnerStoreId)
      .eq("owner_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (storeError) throw storeError;
    if (!store) return { error: "Toko tidak ditemukan atau tidak aktif." };

    // ── Ambil data produk (harga resmi dari server) ────────────────────────
    const productIds = input.items.map((i) => i.productId);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, sku, name, selling_price")
      .in("id", productIds)
      .eq("is_active", true);

    if (productsError) throw productsError;
    const productsById = new Map(products?.map((p) => [p.id, p]) ?? []);

    // ── Ambil data alokasi stok & verifikasi ketersediaan ─────────────────
    const allocationIds = input.items.map((i) => i.allocationId);
    const { data: allocations, error: allocError } = await supabase
      .from("partner_store_inventory")
      .select("id, product_id, stock_quantity")
      .in("id", allocationIds)
      .eq("partner_store_id", input.partnerStoreId);

    if (allocError) throw allocError;
    const allocsById = new Map(allocations?.map((a) => [a.id, a]) ?? []);

    // ── Hitung ulang total di sisi server (security) ───────────────────────
    let serverSubtotal = 0;
    const lineItems: Array<{
      product_id: string;
      sku: string;
      name: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }> = [];

    for (const item of input.items) {
      const product = productsById.get(item.productId);
      if (!product)
        return { error: `Produk "${item.productName}" tidak ditemukan atau tidak aktif.` };

      const alloc = allocsById.get(item.allocationId);
      if (!alloc)
        return { error: `Alokasi stok untuk "${item.productName}" tidak ditemukan.` };
      if (alloc.product_id !== item.productId)
        return { error: `Data alokasi tidak cocok untuk "${item.productName}".` };
      if (alloc.stock_quantity < item.quantity)
        return {
          error: `Stok toko tidak cukup untuk "${item.productName}". Tersedia ${alloc.stock_quantity} unit.`,
        };

      const lineTotal = product.selling_price * item.quantity;
      serverSubtotal += lineTotal;
      lineItems.push({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        quantity: item.quantity,
        unit_price: product.selling_price,
        line_total: lineTotal,
      });
    }

    // ── INSERT sales_transaction ───────────────────────────────────────────
    const { data: transaction, error: insertError } = await supabase
      .from("sales_transactions")
      .insert({
        transaction_number: `MITRA-${crypto.randomUUID()}`,
        channel: "partner_store",
        partner_store_id: input.partnerStoreId,
        created_by: user.id,
        items: lineItems,
        subtotal: serverSubtotal,
        discount: 0,
        total: serverSubtotal,
        payment_method: input.paymentMethod,
        status: "completed",
        sold_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !transaction) {
      if (insertError) throw insertError;
      return { error: "Transaksi gagal disimpan." };
    }

    // ── Loop kurangi stok partner_store_inventory per item ─────────────────
    for (const item of input.items) {
      const alloc = allocsById.get(item.allocationId)!;
      const { error: updateError } = await supabase
        .from("partner_store_inventory")
        .update({
          stock_quantity: alloc.stock_quantity - item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", alloc.id);

      if (updateError) {
        // Rollback transaksi jika update stok gagal
        await supabase
          .from("sales_transactions")
          .delete()
          .eq("id", transaction.id);
        throw updateError;
      }
    }

    // ── Revalidate paths ───────────────────────────────────────────────────
    revalidatePath("/partner");
    revalidatePath("/partner/stok");
    revalidatePath("/partner/transaksi");
    revalidatePath("/");
    revalidatePath("/inventory");
    revalidatePath("/penjualan");

    return { transactionId: transaction.id };
  } catch (error) {
    console.error("Failed to record cart transaction:", error);
    return {
      error:
        error instanceof Error ? error.message : "Transaksi gagal dicatat.",
    };
  }
}
