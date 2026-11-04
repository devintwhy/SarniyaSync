"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getProfileRole } from "@/utils/supabase/auth";

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

// Proses Penyimpanan Penyesuaian Stok
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

    const role = await getProfileRole(supabase, user.id);
    if (!role) {
      return {
        success: false,
        message: "Role pengguna tidak valid atau tidak ditemukan.",
      };
    }

    let mitraId = "";
    let productId = "";
    let rawQuantity: string | number = 0;
    let reason = "";
    let notes: string | null = null;

    if (input instanceof FormData) {
      productId = input.get("productId")?.toString().trim() || "";
      mitraId = input.get("mitraId")?.toString().trim() || "";
      rawQuantity = input.get("quantity")?.toString().trim() || "0";
      reason = input.get("reason")?.toString().trim() || "";
      notes = input.get("notes")?.toString().trim() || null;
    } else {
      productId = input.productId?.trim() || "";
      mitraId = input.mitraId?.trim() || "";
      rawQuantity = input.quantity;
      reason = input.reason?.trim() || "";
      notes = input.notes?.trim() || null;
    }

    let targetStoreId = "";
    if (role === "mitra") {
      const { data: userStores, error: storeError } = await supabase
        .from("partner_stores")
        .select("id")
        .eq("owner_id", user.id)
        .eq("is_active", true);

      if (storeError || !userStores || userStores.length === 0) {
        return {
          success: false,
          message: "Toko mitra Anda tidak ditemukan atau sedang nonaktif.",
        };
      }

      const activeStoreIds = userStores.map((s) => s.id);
      if (mitraId && !activeStoreIds.includes(mitraId)) {
        return {
          success: false,
          message: "Akses ditolak: Anda tidak memiliki izin memodifikasi toko ini.",
        };
      }
      targetStoreId = mitraId && activeStoreIds.includes(mitraId) ? mitraId : activeStoreIds[0];
    } else if (role === "admin" || role === "pemilik") {
      targetStoreId = mitraId || user.id;
    } else {
      return {
        success: false,
        message: "Role Anda tidak memiliki izin melakukan penyesuaian stok.",
      };
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

    const { data: rpcData, error: rpcError } = await supabase.rpc("adjust_physical_stock", {
      p_mitra_id: targetStoreId,
      p_product_id: String(productId).trim(),
      p_qty_changed: negativeQty,
      p_reason: String(reason).trim(),
      p_notes: notes ? String(notes).trim() : "",
    });

    if (rpcError) {
      return {
        success: false,
        message: "Gagal memperbarui stok fisik di sistem database.",
      };
    }

    const rpcResult = rpcData as { success?: boolean; message?: string; error?: string } | null;
    if (!rpcResult || !rpcResult.success) {
      return {
        success: false,
        message: rpcResult?.error || "Gagal memperbarui stok fisik di sistem database.",
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
  } catch {
    return {
      success: false,
      message: "Terjadi kesalahan internal pada server saat memproses penyesuaian stok.",
    };
  }
}