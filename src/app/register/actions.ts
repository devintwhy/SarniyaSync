"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type RegisterState = {
  error?: string;
};

export async function registerMitraAction(
  prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const storeName = String(formData.get("storeName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!email || !password || !fullName || !storeName) {
    return { error: "Email, password, nama lengkap pemilik, dan nama toko wajib diisi." };
  }
  if (password.length < 8) {
    return { error: "Password baru minimal 8 karakter." };
  }

  let shouldRedirect = false;

  try {
    const supabase = await createSupabaseServerClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
        },
      },
    });

    if (authError || !authData.user) {
      return {
        error: authError?.message ?? "Pendaftaran gagal. Silakan periksa kembali data Anda.",
      };
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      phone: phone || null,
      role: "mitra",
    });

    if (profileError) {
      return {
        error: `Gagal menyimpan profil Mitra: ${profileError.message}`,
      };
    }

    const { error: storeError } = await supabase.from("partner_stores").insert({
      owner_id: userId,
      name: storeName,
      address: address || null,
      phone: phone || null,
      is_active: false,
      status: "pending",
      status_message: "Akun Anda sedang ditinjau atau dinonaktifkan. Silakan hubungi Admin.",
    });

    if (storeError) {
      return {
        error: `Gagal mendaftarkan data toko Mitra: ${storeError.message}`,
      };
    }

    shouldRedirect = true;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Terjadi kesalahan sistem saat registrasi.",
    };
  }

  if (shouldRedirect) {
    redirect("/login?registered=true");
  }

  return {};
}