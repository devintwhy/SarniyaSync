"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getProfileRole } from "@/utils/supabase/auth";

export type MitraStatus = "aktif" | "nonaktif" | "pending";

export async function updateMitraStatus(
  storeId: string,
  newStatus: string,
  statusMessage?: string,
) {
  if (!["aktif", "nonaktif", "pending"].includes(newStatus)) {
    return { error: "Status tidak valid. Pilihan: aktif, nonaktif, atau pending." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Sesi login berakhir. Silakan login kembali." };
    }

    const role = await getProfileRole(supabase, user.id);
    if (role !== "admin" && role !== "pemilik") {
      return { error: "Hanya Admin/Pemilik yang memiliki izin mengubah status mitra." };
    }

    const updatePayload: {
      status: string;
      is_active: boolean;
      updated_at: string;
      status_message?: string | null;
    } = {
      status: newStatus,
      is_active: newStatus === "aktif",
      updated_at: new Date().toISOString(),
    };

    if (typeof statusMessage === "string") {
      updatePayload.status_message = statusMessage.trim() || null;
    }

    const { error: updateError } = await supabase
      .from("partner_stores")
      .update(updatePayload)
      .eq("id", storeId);

    if (updateError) {
      return { error: `Gagal memperbarui status toko: ${updateError.message}` };
    }

    revalidatePath("/mitra");
    revalidatePath("/partner");
    revalidatePath("/partner/kasir");
    revalidatePath("/(partner)", "layout");

    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Terjadi kesalahan sistem saat memperbarui status.",
    };
  }
}
