"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type UpdatePartnerProfileInput = {
  namaLengkap: string;
  namaToko: string;
  alamatLengkap: string;
  phone: string;
};

export type UpdatePartnerProfileResult = {
  error?: string;
  success?: string;
};

export async function updatePartnerProfileAction(
  input: UpdatePartnerProfileInput
): Promise<UpdatePartnerProfileResult> {
  const trimmedName = (input.namaLengkap ?? "").trim();
  const trimmedStore = (input.namaToko ?? "").trim();
  const trimmedAddress = (input.alamatLengkap ?? "").trim();
  const trimmedPhone = (input.phone ?? "").trim();

  if (!trimmedName || trimmedName.length < 2) {
    return { error: "Nama lengkap pemilik minimal 2 karakter." };
  }

  if (!trimmedStore || trimmedStore.length < 2) {
    return { error: "Nama toko minimal 2 karakter." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Sesi tidak valid atau telah berakhir. Silakan login kembali." };
    }

    const nowIso = new Date().toISOString();

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: trimmedName,
        phone: trimmedPhone || null,
        role: "mitra",
        updated_at: nowIso,
      });

    if (profileError) {
      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          full_name: trimmedName,
          phone: trimmedPhone || null,
          updated_at: nowIso,
        })
        .eq("id", user.id);

      if (updateProfileError) {
        return { error: `Gagal memperbarui data profil: ${updateProfileError.message}` };
      }
    }

    const { data: existingStore, error: fetchStoreError } = await supabase
      .from("partner_stores")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (fetchStoreError) {
      return { error: `Gagal memuat data toko: ${fetchStoreError.message}` };
    }

    if (existingStore) {
      const { error: updateStoreError } = await supabase
        .from("partner_stores")
        .update({
          name: trimmedStore,
          phone: trimmedPhone || null,
          address: trimmedAddress || null,
          updated_at: nowIso,
        })
        .eq("id", existingStore.id)
        .eq("owner_id", user.id);

      if (updateStoreError) {
        return { error: `Gagal memperbarui alamat dan data toko: ${updateStoreError.message}` };
      }
    } else {
      const { error: insertStoreError } = await supabase
        .from("partner_stores")
        .insert({
          owner_id: user.id,
          name: trimmedStore,
          phone: trimmedPhone || null,
          address: trimmedAddress || null,
          status: "pending",
          is_active: false,
          created_at: nowIso,
          updated_at: nowIso,
        });

      if (insertStoreError) {
        return { error: `Gagal mendaftarkan data toko: ${insertStoreError.message}` };
      }
    }

    revalidatePath("/partner/profil");
    revalidatePath("/profil-mitra");
    revalidatePath("/dashboard-mitra");
    revalidatePath("/mitra");
    revalidatePath("/(admin)/mitra");
    revalidatePath("/(partner)", "layout");
    revalidatePath("/(admin)", "layout");

    return { success: "Data profil pemilik dan toko Mitra berhasil disimpan!" };
  } catch (err) {
    return {
      error: `Terjadi kesalahan tak terduga: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
