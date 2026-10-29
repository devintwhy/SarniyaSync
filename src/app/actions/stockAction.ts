"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type StockAdjustmentResponse = {
  success: boolean;
  message: string;
};

export async function submitStockAdjustment(
  formData: FormData
): Promise<StockAdjustmentResponse> {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: "Sesi login tidak valid. Silakan login kembali.",
      };
    }

    const productId = formData.get("productId")?.toString().trim();
    const mitraId = formData.get("mitraId")?.toString().trim() || user.id;
    const rawQuantity = formData.get("quantity")?.toString().trim();
    const reason = formData.get("reason")?.toString().trim();
    const notes = formData.get("notes")?.toString().trim() || null;

    if (!productId || !mitraId || !rawQuantity || !reason) {
      return {
        success: false,
        message: "Mohon lengkapi seluruh field yang wajib diisi.",
      };
    }

    const parsedQty = parseInt(rawQuantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return {
        success: false,
        message: "Jumlah barang harus berupa angka bulat positif lebih dari 0.",
      };
    }

    // Konversi nilai kuantitas menjadi negatif sebelum dikirim ke database
    const negativeQty = -Math.abs(parsedQty);

    const { error } = await supabase.rpc("adjust_physical_stock", {
      p_mitra_id: mitraId,
      p_product_id: productId,
      p_qty_changed: negativeQty,
      p_reason: reason,
      p_notes: notes,
    });

    if (error) {
      return {
        success: false,
        message: error.message || "Gagal memproses penyesuaian stok fisik.",
      };
    }

    revalidatePath("/partner/stok");
    revalidatePath("/stock-opname");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Penyesuaian stok opname berhasil dicatat ke sistem.",
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan internal pada server.",
    };
  }
}

