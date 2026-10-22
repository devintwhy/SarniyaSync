import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Status Akun Mitra | SarniyaSync",
  description: "Status verifikasi dan peninjauan akun toko mitra Anda.",
};

export default async function PartnerStatusPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores } = await supabase
    .from("partner_stores")
    .select("id, name, status, is_active, status_message")
    .eq("owner_id", user.id);

  const store = stores?.[0];
  const status = store?.status || (store?.is_active ? "aktif" : "pending");

  if (status === "aktif") {
    redirect("/partner/kasir");
  }

  const isPending = status === "pending";

  const neuCardRaised = {
    boxShadow:
      "9px 9px 20px rgba(163, 177, 198, 0.6), -9px -9px 20px rgba(255, 255, 255, 0.6)",
  };

  const neuLogoRaised = {
    boxShadow:
      "6px 6px 14px rgba(163, 177, 198, 0.55), -6px -6px 14px rgba(255, 255, 255, 0.85)",
  };

  const neuInset = {
    boxShadow:
      "inset 6px 6px 12px rgba(163, 177, 198, 0.7), inset -6px -6px 12px rgba(255, 255, 255, 0.85)",
  };

  const neuButtonRaised = {
    boxShadow:
      "8px 8px 18px rgba(163, 177, 198, 0.6), -8px -8px 18px rgba(255, 255, 255, 0.9)",
  };

  return (
    <main className="min-h-screen w-full bg-[#e0e5ec] flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12">
      <div
        className="w-full max-w-xl rounded-[32px] bg-[#e0e5ec] p-8 sm:p-12 text-center transition-all duration-300"
        style={neuCardRaised}
      >
        <div
          className="mx-auto mb-6 flex size-24 items-center justify-center rounded-3xl bg-[#e0e5ec] p-3"
          style={neuLogoRaised}
        >
          <Image
            src="/logo-sarniya.png"
            alt="Sarniya Logo"
            width={80}
            height={80}
            className="h-full w-full object-contain drop-shadow"
            priority
          />
        </div>

        <span className="inline-block rounded-full bg-[#f7e4d4] px-4 py-1 text-xs font-bold text-[#9d5c4c]">
          Status Verifikasi Toko
        </span>

        <h1 className="mt-4 text-2xl sm:text-3xl font-black text-[#2d3440]">
          {isPending ? "Akun Mitra Sedang Ditinjau" : "Akun Mitra Dinonaktifkan"}
        </h1>

        <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#6d7687]">
          {store?.status_message?.trim() ||
            (isPending
              ? "Pendaftaran toko Mitra Anda berhasil diterima dan saat ini sedang dalam proses peninjauan & verifikasi oleh Administrator. Fitur Kasir (POS) akan otomatis aktif setelah toko Anda disetujui."
              : "Akun toko Mitra Anda saat ini berstatus nonaktif. Akses ke transaksi kasir dibatasi. Silakan hubungi tim Admin SarniyaSync untuk mengaktifkan kembali toko Anda.")}
        </p>

        {store && (
          <div
            className="mt-6 inline-flex items-center gap-2.5 rounded-2xl bg-[#e0e5ec] px-5 py-3 text-xs sm:text-sm text-[#2d3440]"
            style={neuInset}
          >
            <span className="font-bold">Toko:</span> {store.name} —{" "}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                isPending
                  ? "bg-[#faecc2] text-[#926004]"
                  : "bg-[#f0d4cc] text-[#9b4936]"
              }`}
            >
              {status}
            </span>
          </div>
        )}

        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/dashboard-mitra"
            style={neuButtonRaised}
            className="inline-flex h-14 items-center justify-center rounded-2xl bg-[#e0e5ec] px-6 text-sm sm:text-base font-bold text-[#576071] transition-all hover:text-[#2d3440] active:scale-95"
          >
            Dashboard Mitra
          </Link>
          <Link
            href="/partner/profil"
            style={neuButtonRaised}
            className="inline-flex h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-6 text-sm sm:text-base font-bold text-white transition-all hover:brightness-105 active:scale-95"
          >
            Lihat Profil Saya
          </Link>
        </div>
      </div>
    </main>
  );
}
