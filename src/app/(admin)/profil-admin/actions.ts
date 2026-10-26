"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export async function updateProfileAction(
  prevState: { error: string; success: string },
  formData: FormData
) {
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!fullName || fullName.length < 2) {
    return { error: "Nama lengkap minimal 2 karakter.", success: "" };
  }
  if (fullName.length > 100) {
    return { error: "Nama lengkap maksimal 100 karakter.", success: "" };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Sesi tidak valid. Silakan login ulang.", success: "" };
    }

    const nowIso = new Date().toISOString();

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = existingProfile?.role || "admin";

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
        role: role,
        updated_at: nowIso,
      });

    if (upsertError) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          updated_at: nowIso,
        })
        .eq("id", user.id);

      if (updateError) {
        return {
          error: `Gagal memperbarui profil: ${upsertError.message || updateError.message}`,
          success: "",
        };
      }
    }

    revalidatePath("/profil-admin");
    revalidatePath("/profil-mitra");
    revalidatePath("/partner/profil");
    return { error: "", success: "Nama profil berhasil diperbarui." };
  } catch (err) {
    return { error: `Terjadi kesalahan: ${String(err)}`, success: "" };
  }
}

export const updateProfile = updateProfileAction;

export async function updatePasswordAction(
  prevState: { error: string; success: string },
  formData: FormData
) {
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!newPassword || newPassword.length < 8) {
    return { error: "Password baru minimal 8 karakter.", success: "" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Konfirmasi password tidak cocok.", success: "" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Sesi tidak valid. Silakan login ulang.", success: "" };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { error: `Gagal memperbarui password: ${error.message}`, success: "" };
    }

    return { error: "", success: "Password berhasil diperbarui." };
  } catch (err) {
    return { error: `Terjadi kesalahan: ${String(err)}`, success: "" };
  }
}
