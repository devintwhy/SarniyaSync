"use server";

import { revalidatePath } from "next/cache";
import { getProfileRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type CancelTransferResult = {
  error?: string;
  success?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function cancelStockTransfer(transferId: string): Promise<CancelTransferResult> {
  if (!uuidPattern.test(transferId)) {
    return { error: "ID pengiriman tidak valid." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Sesi login diperlukan." };
    }

    const role = await getProfileRole(supabase, user.id);
    if (role !== "admin" && role !== "pemilik") {
      return { error: "Akses ditolak. Hanya Admin yang berhak membatalkan pengiriman stok." };
    }

    const { data: transfer, error: transferError } = await supabase
      .from("stock_transfers")
      .select("id, product_id, quantity, status, partner_store_id")
      .eq("id", transferId)
      .maybeSingle();

    if (transferError || !transfer) {
      return { error: "Data pengiriman tidak ditemukan." };
    }

    if (transfer.status === "DITERIMA") {
      return { error: "Pengiriman tidak dapat dibatalkan karena paket sudah diterima oleh toko mitra." };
    }

    if (transfer.status === "DIBATALKAN" || transfer.status === "BATAL") {
      return { error: "Pengiriman ini sudah dibatalkan sebelumnya." };
    }

    if (transfer.status !== "DIKIRIM") {
      return { error: `Pengiriman dengan status "${transfer.status}" tidak dapat dibatalkan.` };
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, stock_quantity")
      .eq("id", transfer.product_id)
      .maybeSingle();

    if (productError || !product) {
      return { error: "Data produk pusat tidak ditemukan." };
    }

    const restoredStock = product.stock_quantity + transfer.quantity;
    const { error: updateProductError } = await supabase
      .from("products")
      .update({
        stock_quantity: restoredStock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (updateProductError) {
      return { error: `Gagal mengembalikan stok ke gudang pusat: ${updateProductError.message}` };
    }

    const { error: updateTransferError } = await supabase
      .from("stock_transfers")
      .update({
        status: "DIBATALKAN",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transfer.id);

    if (updateTransferError) {
      await supabase
        .from("products")
        .update({
          stock_quantity: product.stock_quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      return { error: `Gagal memperbarui status pengiriman: ${updateTransferError.message}` };
    }

    revalidatePath("/pengiriman");
    revalidatePath("/alokasi");
    revalidatePath("/katalog");
    revalidatePath("/produk");
    revalidatePath("/partner/penerimaan");
    revalidatePath("/dashboard");

    return {
      success: `Pengiriman berhasil dibatalkan. Sebanyak ${transfer.quantity} unit produk "${product.name}" telah dikembalikan ke Gudang Pusat.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan saat membatalkan pengiriman.";
    return { error: message };
  }
}