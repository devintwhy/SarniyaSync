import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getProfileRole } from "@/utils/supabase/auth";
import { redirect } from "next/navigation";
import TabelManajemenMitra, { StoreItem } from "./tabel-manajemen-mitra";
import FormulirTokoMitra, { MitraOwner } from "./formulir-toko-mitra";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manajemen Mitra | SarniyaSync",
  description: "Kontrol status dan daftar toko mitra SarniyaSync.",
};

// Pengambilan Data Daftar Mitra dan Pemilik Toko
export default async function ManajemenMitraPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getProfileRole(supabase, user.id);
  if (role !== "admin" && role !== "pemilik") redirect("/");

  const [
    { data: storesData, error: storeError },
    { data: ownersData },
  ] = await Promise.all([
    supabase
      .from("partner_stores")
      .select("id, owner_id, name, address, phone, is_active, status, status_message")
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("role", "mitra")
      .order("full_name", { ascending: true }),
  ]);

  const owners: MitraOwner[] = (ownersData ?? []).map((o) => ({
    id: o.id,
    full_name: o.full_name || "Mitra",
    phone: o.phone,
  }));

  // Gunakan data ownersData yang sudah ada untuk membangun ownerMap — tidak perlu query kedua
  const ownerMap = new Map((ownersData ?? []).map((p) => [p.id, p.full_name ?? ""]));

  const stores: StoreItem[] = (storesData ?? []).map((s) => ({
    id: s.id,
    owner_id: s.owner_id,
    name: s.name,
    address: s.address,
    phone: s.phone,
    is_active: Boolean(s.is_active),
    status: s.status,
    status_message: s.status_message,
    owner: { full_name: ownerMap.get(s.owner_id) || "—" },
  }));

  const errorMessage = storeError?.message ?? "";

  return (
    <div className="w-full space-y-4 px-2 py-3 sm:px-4 sm:py-4">
      <header className="mb-2">
        <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-3 py-0.5 text-[11px] font-bold text-terracotta-clay">
          Area Pemilik / Administrator
        </span>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900">
          Manajemen Mitra
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
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
        <>
          <details className="overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm group">
            <summary className="flex items-center justify-between px-4 py-3 sm:px-5 cursor-pointer select-none font-semibold text-gray-800 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#cc9787]" />
                <span>Tambah Toko Mitra Baru</span>
              </div>
              <span className="text-xs text-gray-500 font-normal">Buka Formulir</span>
            </summary>
            <div className="border-t border-gray-100 bg-[#FAFAFA]">
              <FormulirTokoMitra owners={owners} />
            </div>
          </details>

          <section
            aria-label="Daftar mitra"
            className="overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm"
          >
            <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-gray-800">Daftar Toko Mitra</h2>
              <p className="mt-0.5 text-xs font-medium text-gray-500">
                {stores.length} toko mitra terdaftar dalam ekosistem SarniyaSync
              </p>
            </div>

            {!stores.length ? (
              <p className="px-4 py-8 text-center text-xs font-medium text-[#7a8394]">
                Belum ada toko mitra yang terdaftar.
              </p>
            ) : (
              <TabelManajemenMitra stores={stores} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
