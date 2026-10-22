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
    <div className="w-full px-2 py-3 sm:px-4 sm:py-4">
      <header className="mb-4">
        <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-3 py-0.5 text-[11px] font-bold text-terracotta-clay">
          Area Pemilik / Administrator
        </span>
        <h1 className="mt-1.5 text-xl sm:text-2xl font-black tracking-tight text-gray-900">
          Manajemen Mitra
        </h1>
        <p className="mt-0.5 text-xs text-gray-500">
          Kelola status operasional toko mitra (Aktif, Pending, atau Nonaktif) secara langsung dengan kendali terpadu.
        </p>
      </header>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50/95 p-3.5 text-xs font-semibold text-rose-800"
        >
          Data mitra gagal dimuat: {errorMessage}
        </div>
      ) : (
        <section
          aria-label="Daftar mitra"
          className="overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm"
        >
          <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
            <h2 className="text-base font-black text-gray-900">Daftar Toko Mitra</h2>
            <p className="mt-0.5 text-xs font-medium text-gray-500">
              {stores?.length ?? 0} toko mitra terdaftar dalam ekosistem SarniyaSync
            </p>
          </div>

          {!stores?.length ? (
            <p className="px-4 py-8 text-center text-xs font-medium text-[#7a8394]">
              Belum ada toko mitra yang terdaftar.
            </p>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <MitraTableClient stores={stores as any} />
          )}
        </section>
      )}
    </div>
  );
}
