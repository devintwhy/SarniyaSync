"use server";

import { revalidatePath } from "next/cache";
import { getProfileRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type SaleInput = {
  partnerStoreId: string;
  productId: string;
  quantity: number;
  paymentMethod: string;
};

type SaleResult = {
  transactionId?: string;
  error?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const paymentMethods = new Set(["cash", "transfer", "qris"]);

export async function recordPartnerSale(input: SaleInput): Promise<SaleResult> {
  try {
    if (
      !uuidPattern.test(input.partnerStoreId) ||
      !uuidPattern.test(input.productId) ||
      !Number.isSafeInteger(input.quantity) ||
      input.quantity < 1 ||
      !paymentMethods.has(input.paymentMethod)
    ) {
      return { error: "Periksa kembali produk, jumlah, dan metode pembayaran." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Sesi login diperlukan. Silakan masuk kembali." };

    if (await getProfileRole(supabase, user.id) !== "mitra") {
      return { error: "Hanya akun Mitra yang dapat mencatat penjualan." };
    }

    const { data: store, error: storeError } = await supabase
      .from("partner_stores")
      .select("id")
      .eq("id", input.partnerStoreId)
      .eq("owner_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (storeError) throw storeError;
    if (!store) return { error: "Toko tidak ditemukan atau tidak aktif." };

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, sku, name, selling_price")
      .eq("id", input.productId)
      .eq("is_active", true)
      .maybeSingle();

    if (productError) throw productError;
    if (!product) return { error: "Produk tidak ditemukan atau tidak aktif." };

    const { data: allocation, error: allocationError } = await supabase
      .from("partner_store_inventory")
      .select("id, stock_quantity")
      .eq("partner_store_id", store.id)
      .eq("product_id", product.id)
      .maybeSingle();

    if (allocationError) throw allocationError;
    if (!allocation) return { error: "Produk ini belum dialokasikan ke toko tersebut." };
    if (allocation.stock_quantity < input.quantity) {
      return { error: `Stok toko tidak cukup. Tersedia ${allocation.stock_quantity} unit.` };
    }

    const lineTotal = product.selling_price * input.quantity;
    const { data: transaction, error: insertError } = await supabase
      .from("sales_transactions")
      .insert({
        transaction_number: `MITRA-${crypto.randomUUID()}`,
        channel: "partner_store",
        partner_store_id: input.partnerStoreId,
        created_by: user.id,
        items: [{
          product_id: product.id,
          sku: product.sku,
          name: product.name,
          quantity: input.quantity,
          unit_price: product.selling_price,
          line_total: lineTotal,
        }],
        subtotal: lineTotal,
        discount: 0,
        total: lineTotal,
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

    const { error: updateError } = await supabase
      .from("partner_store_inventory")
      .update({
        stock_quantity: allocation.stock_quantity - input.quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", allocation.id);

    if (updateError) {
      const { error: rollbackError } = await supabase
        .from("sales_transactions")
        .delete()
        .eq("id", transaction.id);
      if (rollbackError) console.error("Could not roll back sale after stock update error:", rollbackError.message);
      throw updateError;
    }

    revalidatePath("/partner");
    revalidatePath("/partner/stok");
    revalidatePath("/partner/transaksi");
    revalidatePath("/");
    revalidatePath("/inventory");
    revalidatePath("/penjualan");

    return { transactionId: transaction.id };
  } catch (error) {
    console.error("Failed to record partner sale:", error);
    return { error: error instanceof Error ? error.message : "Penjualan gagal dicatat." };
  }
}