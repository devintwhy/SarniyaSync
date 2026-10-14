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
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8">
        <span className="inline-block rounded-full bg-[#f7e4d4] px-3.5 py-1 text-xs font-bold text-[#9d5c4c]">
          Area Pemilik / Administrator
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-[#2d3440]">
          Manajemen Mitra
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[#6d7687]">
          Kelola status operasional toko mitra (Aktif, Pending, atau Nonaktif) secara langsung.
        </p>
      </header>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50/95 px-4 py-3 text-sm text-rose-800"
        >
          Data mitra gagal dimuat: {errorMessage}
        </p>
      ) : (
        <section
          aria-label="Daftar mitra"
          className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-bold text-[#2d3440]">Daftar Toko Mitra</h2>
            <p className="mt-1 text-sm text-[#7b877f]">
              {stores?.length ?? 0} toko mitra terdaftar dalam sistem
            </p>
          </div>

          {!stores?.length ? (
            <p className="px-5 py-8 text-center text-sm text-[#68756e]">
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
