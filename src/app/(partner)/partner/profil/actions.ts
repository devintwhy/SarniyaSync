"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type ProfileFormState = {
  error: string;
  success: string;
};

// ── 1. Server Action: Perbarui Profil Pemilik & Toko Mitra ──────────────────
export async function updateMitraProfileAndStoreAction(
  prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const storeName = String(formData.get("storeName") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!fullName || fullName.length < 2) {
    return { error: "Nama lengkap pemilik minimal 2 karakter.", success: "" };
  }
  if (!storeName || storeName.length < 2) {
    return { error: "Nama toko minimal 2 karakter.", success: "" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Sesi tidak valid. Silakan login kembali.", success: "" };
    }

    const nowIso = new Date().toISOString();

    // Perbarui tabel profiles (Nama Lengkap Pemilik & Nomor HP)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        updated_at: nowIso,
      })
      .eq("id", user.id);

    if (profileError) {
      return {
        error: `Gagal memperbarui data pemilik: ${profileError.message}`,
        success: "",
      };
    }

    // Perbarui tabel partner_stores (Nama Toko, Alamat, dan Nomor HP Toko)
    const { error: storeError } = await supabase
      .from("partner_stores")
      .update({
        name: storeName,
        phone: phone || null,
        address: address || null,
        updated_at: nowIso,
      })
      .eq("owner_id", user.id);

    if (storeError) {
      return {
        error: `Gagal memperbarui data toko mitra: ${storeError.message}`,
        success: "",
      };
    }

    revalidatePath("/partner/profil");
    revalidatePath("/partner");
    revalidatePath("/dashboard-mitra");

    return {
      error: "",
      success: "Data profil pemilik dan toko Anda berhasil diperbarui.",
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Terjadi kesalahan pada sistem.",
      success: "",
    };
  }
}

// ── 2. Server Action: Perbarui Password Akun Mitra ──────────────────────────
export async function updateMitraPasswordAction(
  prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!newPassword || newPassword.length < 8) {
    return { error: "Password baru minimal 8 karakter.", success: "" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Konfirmasi password baru tidak cocok.", success: "" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Sesi tidak valid. Silakan login kembali.", success: "" };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return { error: `Gagal memperbarui password: ${error.message}`, success: "" };
    }

    return { error: "", success: "Password akun Anda berhasil diperbarui." };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui password.",
      success: "",
    };
  }
}
