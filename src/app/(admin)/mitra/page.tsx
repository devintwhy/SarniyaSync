import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getProfileRole } from "@/utils/supabase/auth";
import { redirect } from "next/navigation";
import PartnerStoreForm from "./partner-store-form";

export const dynamic = "force-dynamic";

export default async function PartnerManagementPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await getProfileRole(supabase, user.id);
  if (role !== "admin" && role !== "pemilik") redirect("/");

  const [{ data: stores, error: storeError }, { data: profiles, error: profileError }] = await Promise.all([
    supabase
      .from("partner_stores")
      .select("id, owner_id, name, address, city, phone, is_active")
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, phone, role")
      .eq("role", "mitra")
      .order("full_name", { ascending: true }),
  ]);

  const owners = (profiles ?? []).map(({ id, full_name, phone }) => ({ id, full_name, phone }));
  const ownerIds = Array.from(new Set((stores ?? []).map((store) => store.owner_id)));
  const ownersById = new Map((profiles ?? []).filter((profile) => ownerIds.includes(profile.id)).map((profile) => [profile.id, profile]));
  const errorMessage = storeError?.message ?? profileError?.message ?? "";

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#557b64]">Area Pemilik/Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">Manajemen Mitra</h1>
        <p className="mt-2 text-sm text-[#68756e]">Daftar toko mitra dan pemilik akun yang terhubung.</p>
      </header>

      <section aria-label="Tambah toko mitra" className="mb-6 overflow-hidden rounded-md border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5">
        <div className="border-b border-[#edf0ec] px-5 py-4">
          <h2 className="font-semibold text-[#173b32]">Tambah Toko Mitra</h2>
          <p className="mt-1 text-sm text-[#7b877f]">Pilih profil Mitra yang menjadi pemilik toko.</p>
        </div>
        <PartnerStoreForm owners={owners} />
      </section>

      {errorMessage ? (
        <p role="alert" className="rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-4 py-3 text-sm text-[#9b4936]">
          Data mitra gagal dimuat: {errorMessage}
        </p>
      ) : (
        <section aria-label="Daftar mitra" className="overflow-hidden rounded-md border border-[#e1e7e0] bg-white shadow-sm shadow-[#173b32]/5">
          <div className="border-b border-[#edf0ec] px-5 py-4">
            <h2 className="font-semibold text-[#173b32]">Toko Mitra</h2>
            <p className="mt-1 text-sm text-[#7b877f]">{stores?.length ?? 0} toko terdaftar</p>
          </div>
          {!stores?.length ? (
            <p className="px-5 py-8 text-center text-sm text-[#68756e]">Belum ada toko mitra.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#f7f9f6] text-xs uppercase text-[#68756e]">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">Nama Toko</th>
                    <th scope="col" className="px-5 py-3 font-medium">Pemilik</th>
                    <th scope="col" className="px-5 py-3 font-medium">Kontak</th>
                    <th scope="col" className="px-5 py-3 font-medium">Lokasi</th>
                    <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0ec]">
                  {stores.map((store) => {
                    const owner = ownersById.get(store.owner_id);

                    return (
                      <tr key={store.id} className="hover:bg-[#fafbf9]">
                        <th scope="row" className="px-5 py-4 font-medium text-[#293a32]">{store.name}</th>
                        <td className="px-5 py-4 text-[#68756e]">{owner?.full_name ?? "-"}</td>
                        <td className="px-5 py-4 text-[#68756e]">{store.phone ?? owner?.phone ?? "-"}</td>
                        <td className="px-5 py-4 text-[#68756e]">
                          {[store.address, store.city].filter(Boolean).join(", ") || "-"}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-sm px-2 py-1 text-xs font-medium ${store.is_active ? "bg-[#edf5e8] text-[#557b46]" : "bg-[#f0f3f1] text-[#68756e]"}`}>
                            {store.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}