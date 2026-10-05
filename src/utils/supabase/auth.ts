import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

export type AppRole = "pemilik" | "admin" | "mitra";

export function normalizeAppRole(role: string | null | undefined): AppRole | null {
  const normalized = role?.trim().toLowerCase();
  if (!normalized) return null;

  if (["pemilik", "owner", "pemilik_toko"].includes(normalized)) return "pemilik";
  if (["admin", "administrator"].includes(normalized)) return "admin";
  if (["mitra", "partner"].includes(normalized)) return "mitra";
  return null;
}

export async function getProfileRole(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`Gagal membaca role profil: ${error.message}`);
  return normalizeAppRole(data?.role);
}

export function getRoleHomePath(role: AppRole) {
  return role === "mitra" ? "/partner" : "/";
}