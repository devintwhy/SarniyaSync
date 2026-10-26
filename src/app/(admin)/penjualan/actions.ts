"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@/utils/supabase/database.types";
import { getProfileRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type CancelResult = {
  error?: string;
};

type SaleItem = {
  productId: string;
  quantity: number;
};

function parseSaleItems(items: Json): SaleItem[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;

  const quantities = new Map<string, number>();
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const productId = "product_id" in item && typeof item.product_id === "string" ? item.product_id : "";
    const quantity = "quantity" in item ? Number(item.quantity) : NaN;
    if (!productId || !Number.isSafeInteger(quantity) || quantity < 1) return null;
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }

  return Array.from(quantities, ([productId, quantity]) => ({ productId, quantity }));
}

export async function cancelPartnerSale(transactionId: string): Promise<CancelResult> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(transactionId)) {
    return { error: "ID transaksi tidak valid." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Sesi login diperlukan." };

    const role = await getProfileRole(supabase, user.id);
    if (role !== "admin" && role !== "pemilik") {
      return { error: "Hanya Admin/Pemilik yang dapat membatalkan transaksi." };
    }

    const { data: transaction, error: transactionError } = await supabase
      .from("sales_transactions")
      .select("id, transaction_number, partner_store_id, items, status")
      .eq("id", transactionId)
      .maybeSingle();

    if (transactionError) throw transactionError;
    if (!transaction) return { error: "Transaksi tidak ditemukan." };

    if (transaction.status === "Batal" || transaction.status === "Dibatalkan") {
      return { error: "Transaksi ini sudah dibatalkan sebelumnya." };
    }

    const saleItems = parseSaleItems(transaction.items);
    if (!saleItems || saleItems.length === 0) {
      console.warn("Transaction has no valid product details; cancelling transaction without stock restoration:", transaction.id);
    }

    const productIds = (saleItems ?? []).map((item) => item.productId);
    const { data: allocations, error: allocationError } = productIds.length
      ? await supabase
          .from("partner_store_inventory")
          .select("id, product_id, stock_quantity")
          .eq("partner_store_id", transaction.partner_store_id)
          .in("product_id", productIds)
      : { data: [], error: null };

    if (allocationError) {
      console.warn("Allocation rows could not be read:", allocationError.message);
    }

    const allocationsByProduct = new Map((allocations ?? []).map((allocation) => [allocation.product_id, allocation]));

    // Rollback inventaris: pengembalian stok gerai mitra saat pembatalan
    for (const item of saleItems ?? []) {
      const allocation = allocationsByProduct.get(item.productId);
      if (!allocation) {
        const { error: insertError } = await supabase
          .from("partner_store_inventory")
          .insert({
            partner_store_id: transaction.partner_store_id,
            product_id: item.productId,
            stock_quantity: item.quantity,
          });

        if (insertError) {
          console.error("Gagal menambahkan inventaris baru mitra:", insertError.message);
        }
        continue;
      }

      const restoredStock = Number(allocation.stock_quantity || 0) + item.quantity;
      const { error: updateError } = await supabase
        .from("partner_store_inventory")
        .update({
          stock_quantity: restoredStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", allocation.id);

      if (updateError) {
        console.error("Gagal mengembalikan stok mitra:", updateError.message);
        throw new Error(`Gagal mengembalikan stok produk: ${updateError.message}`);
      }
    }

    const { data: updatedTransaction, error: updateTxError } = await supabase
      .from("sales_transactions")
      .update({
        status: "Batal",
      })
      .eq("id", transaction.id)
      .select("id, status")
      .maybeSingle();

    if (updateTxError || !updatedTransaction) {
      if (updateTxError) throw updateTxError;
      return { error: "Status transaksi gagal diperbarui." };
    }

    revalidatePath("/penjualan");
    revalidatePath("/riwayat-admin");
    revalidatePath("/partner/transaksi");
    revalidatePath("/partner/stok");
    revalidatePath("/partner");
    revalidatePath("/alokasi");
    revalidatePath("/dashboard");
    return {};
  } catch (error) {
    console.error("Failed to cancel partner sale:", error);
    return { error: error instanceof Error ? error.message : "Pembatalan transaksi gagal." };
  }
}