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
      .select("id, partner_store_id, items")
      .eq("id", transactionId)
      .maybeSingle();

    if (transactionError) throw transactionError;
    if (!transaction) return { error: "Transaksi tidak ditemukan." };

    const saleItems = parseSaleItems(transaction.items);
    if (!saleItems) {
      console.warn("Transaction has no valid product details; deleting without stock restoration:", transaction.id);
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
      console.warn("Allocation rows could not be read; transaction will still be deleted:", allocationError.message);
    }

    const allocationsByProduct = new Map((allocations ?? []).map((allocation) => [allocation.product_id, allocation]));
    const restorations: Array<{ id: string; previous: number; restored: number }> = [];

    for (const item of saleItems ?? []) {
      const allocation = allocationsByProduct.get(item.productId);
      if (!allocation) {
        console.warn("Allocation row not found; skipping stock restoration:", {
          transactionId: transaction.id,
          productId: item.productId,
          storeId: transaction.partner_store_id,
        });
        continue;
      }

      const restoredStock = allocation.stock_quantity + item.quantity;
      const { data, error } = await supabase
        .from("partner_store_inventory")
        .update({ stock_quantity: restoredStock, updated_at: new Date().toISOString() })
        .eq("id", allocation.id)
        .eq("stock_quantity", allocation.stock_quantity)
        .select("id")
        .maybeSingle();

      if (error || !data) {
        console.warn("Allocation stock could not be restored; transaction will still be deleted:", {
          transactionId: transaction.id,
          productId: item.productId,
          error: error?.message,
        });
        continue;
      }

      restorations.push({ id: allocation.id, previous: allocation.stock_quantity, restored: restoredStock });
    }

    const { data: deletedTransaction, error: deleteError } = await supabase
      .from("sales_transactions")
      .delete()
      .eq("id", transaction.id)
      .select("id")
      .maybeSingle();

    if (deleteError || !deletedTransaction) {
      for (const restoration of restorations.reverse()) {
        const { error: rollbackError } = await supabase
          .from("partner_store_inventory")
          .update({ stock_quantity: restoration.previous, updated_at: new Date().toISOString() })
          .eq("id", restoration.id)
          .eq("stock_quantity", restoration.restored);
        if (rollbackError) console.error("Failed to roll back stock after transaction delete failure:", rollbackError.message);
      }
      if (deleteError) throw deleteError;
      return { error: "Transaksi tidak terhapus; stok dialokasikan telah dipulihkan kembali." };
    }

    revalidatePath("/penjualan");
    revalidatePath("/partner/transaksi");
    revalidatePath("/partner/stok");
    revalidatePath("/partner");
    revalidatePath("/alokasi");
    return {};
  } catch (error) {
    console.error("Failed to cancel partner sale:", error);
    return { error: error instanceof Error ? error.message : "Pembatalan transaksi gagal." };
  }
}