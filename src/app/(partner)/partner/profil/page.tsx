import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import PartnerProfileForms from "./partner-profile-forms";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pembaruan Akun & Profil Mitra | SarniyaSync",
  description: "Kelola profil pemilik, data toko, dan keamanan akun Mitra Anda.",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
});

export default async function PartnerProfilePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 1. Ambil data profil pemilik
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  // 2. Ambil data toko mitra yang dimiliki akun ini
  const { data: store } = await supabase
    .from("partner_stores")
    .select("id, name, address, phone, status, is_active, created_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  // 3. Tentukan timestamp tanggal pembuatan / pendaftaran akun/toko
  const rawCreatedAt =
    store?.created_at || profile?.created_at || user.created_at || new Date().toISOString();
  let createdAtText = "—";
  try {
    createdAtText = dateFormatter.format(new Date(rawCreatedAt));
  } catch {
    createdAtText = "—";
  }

  const initialFullName = profile?.full_name ?? "";
  const initialPhone = profile?.phone || store?.phone || "";
  const initialStoreName = store?.name ?? "";
  const initialAddress = store?.address ?? "";
  const storeStatus = store?.status || (store?.is_active ? "aktif" : "pending");
  const email = user.email ?? "";

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3 sm:space-y-4">
      <header>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-[#f7e4d4] px-2.5 py-0.5 text-xs font-bold text-[#9d5c4c]">
            Pengaturan Akun
          </span>
          <span className="text-xs text-[#7a8394]">&bull; Portal Mitra</span>
        </div>
        <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#2d3440]">
          Profil Pemilik & Toko
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-[#6d7687]">
          Kelola data pendaftaran mandiri, informasi operasional toko, dan keamanan kata sandi Anda.
        </p>
      </header>

      <PartnerProfileForms
        initialFullName={initialFullName}
        initialPhone={initialPhone}
        initialStoreName={initialStoreName}
        initialAddress={initialAddress}
        email={email}
        storeStatus={storeStatus}
        createdAtText={createdAtText}
      />
    </div>
  );
}
