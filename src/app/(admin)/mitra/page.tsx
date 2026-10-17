import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getProfileRole } from "@/utils/supabase/auth";
import { redirect } from "next/navigation";
import MitraTableClient from "./mitra-table-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manajemen Mitra | SarniyaSync",
  description: "Kontrol status dan daftar toko mitra SarniyaSync.",
};

export default async function PartnerManagementPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getProfileRole(supabase, user.id);
  if (role !== "admin" && role !== "pemilik") redirect("/");

  const { data: stores, error: storeError } = await supabase
    .from("partner_stores")
    .select(
      "id, owner_id, name, address, city, phone, is_active, status, status_message, owner:profiles!owner_id(full_name)",
    )
    .order("name", { ascending: true });

  const errorMessage = storeError?.message ?? "";

  return (
    <div className="mx-auto max-w-7xl px-2 py-3 sm:px-4 sm:py-4">
      <header className="mb-4">
        <span className="inline-block rounded-full bg-almond-cream px-3 py-0.5 text-[11px] font-bold text-terracotta-clay shadow-neu-sm">
          Area Pemilik / Administrator
        </span>
        <h1 className="mt-1.5 text-xl sm:text-2xl font-black tracking-tight text-[#2d3440]">
          Manajemen Mitra
        </h1>
        <p className="mt-0.5 text-xs text-[#6d7687]">
          Kelola status operasional toko mitra (Aktif, Pending, atau Nonaktif) secara langsung dengan kendali terpadu.
        </p>
      </header>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50/95 p-3.5 text-xs font-semibold text-rose-800 shadow-neu-sm"
        >
          Data mitra gagal dimuat: {errorMessage}
        </div>
      ) : (
        <section
          aria-label="Daftar mitra"
          className="overflow-hidden rounded-2xl bg-[#e0e5ec] shadow-neu-flat"
        >
          <div className="border-b border-[#a3b1c6]/25 px-4 py-3 sm:px-5">
            <h2 className="text-base font-black text-[#2d3440]">Daftar Toko Mitra</h2>
            <p className="mt-0.5 text-xs font-medium text-[#7a8394]">
              {stores?.length ?? 0} toko mitra terdaftar dalam ekosistem SarniyaSync
            </p>
          </div>

          {!stores?.length ? (
            <p className="px-4 py-8 text-center text-xs font-medium text-[#7a8394]">
              Belum ada toko mitra yang terdaftar.
            </p>
          ) : (
            <MitraTableClient stores={stores as any} />
          )}
        </section>
      )}
    </div>
  );
}
