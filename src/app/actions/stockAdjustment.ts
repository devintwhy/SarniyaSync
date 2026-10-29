"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type StockAdjustmentPayload = {
  mitraId?: string;
  productId: string;
  quantity: number | string;
  reason: string;
  notes?: string | null;
};

export type StockAdjustmentResponse = {
  success: boolean;
  message: string;
};

export async function submitStockAdjustment(
  input: FormData | StockAdjustmentPayload
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
        message: "Sesi login tidak valid atau telah berakhir. Silakan login kembali.",
      };
    }

    let mitraId = "";
    let productId = "";
    let rawQuantity: string | number = 0;
    let reason = "";
    let notes: string | null = null;

    if (input instanceof FormData) {
      productId = input.get("productId")?.toString().trim() || "";
      mitraId = input.get("mitraId")?.toString().trim() || user.id;
      rawQuantity = input.get("quantity")?.toString().trim() || "0";
      reason = input.get("reason")?.toString().trim() || "";
      notes = input.get("notes")?.toString().trim() || null;
    } else {
      productId = input.productId?.trim() || "";
      mitraId = input.mitraId?.trim() || user.id;
      rawQuantity = input.quantity;
      reason = input.reason?.trim() || "";
      notes = input.notes?.trim() || null;
    }

    if (!productId || !reason) {
      return {
        success: false,
        message: "Produk dan alasan penyesuaian wajib diisi.",
      };
    }

    const parsedQty = typeof rawQuantity === "number" ? rawQuantity : parseInt(rawQuantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return {
        success: false,
        message: "Jumlah unit barang harus berupa angka positif lebih dari 0.",
      };
    }

    // Nilai penyesuaian wajib berupa integer negatif untuk mencatat penyusutan fisik
    const negativeQty = -Math.abs(Math.trunc(parsedQty));

    const { error: rpcError } = await supabase.rpc("adjust_physical_stock", {
      p_mitra_id: String(mitraId).trim(),
      p_product_id: String(productId).trim(),
      p_qty_changed: negativeQty,
      p_reason: String(reason).trim(),
      p_notes: notes ? String(notes).trim() : "",
    });

    if (rpcError) {
      return {
        success: false,
        message: rpcError.message || "Gagal memperbarui stok fisik di sistem database.",
      };
    }

    revalidatePath("/partner/stock-opname", "page");
    revalidatePath("/stock-opname", "page");
    revalidatePath("/partner/stock-opname");
    revalidatePath("/stock-opname");
    revalidatePath("/partner/stok");
    revalidatePath("/laporan-penyesuaian");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard-mitra");
    revalidatePath("/(partner)", "layout");

    return {
      success: true,
      message: "Penyesuaian stok fisik berhasil dicatat ke dalam sistem.",
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Terjadi kesalahan internal pada server.",
    };
  }
}

