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

  return (
    <main className="min-h-screen w-full bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-2xl bg-orange-50/60 border border-orange-100 p-2.5">
          <Image
            src="/logo-sarniya.png"
            alt="Sarniya Logo"
            width={80}
            height={80}
            className="h-full w-full object-contain"
            priority
          />
        </div>

        <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200/60 px-3.5 py-1 text-xs font-bold text-terracotta-clay">
          Status Verifikasi Toko
        </span>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
          {isPending ? "Akun Mitra Sedang Ditinjau" : "Akun Mitra Dinonaktifkan"}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-gray-500 max-w-md mx-auto">
          {store?.status_message?.trim() ||
            (isPending
              ? "Pendaftaran toko Mitra Anda berhasil diterima dan saat ini sedang dalam proses peninjauan & verifikasi oleh Administrator. Fitur Kasir (POS) akan otomatis aktif setelah toko Anda disetujui."
              : "Akun toko Mitra Anda saat ini berstatus nonaktif. Akses ke transaksi kasir dibatasi. Silakan hubungi tim Admin SarniyaSync untuk mengaktifkan kembali toko Anda.")}
        </p>

        {store && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
            <span className="font-semibold text-gray-500">Toko:</span>
            <span className="font-bold text-gray-900">{store.name}</span>
            <span className="text-gray-300">&bull;</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                isPending
                  ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                  : "bg-rose-50 text-rose-700 border border-rose-200/60"
              }`}
            >
              {status}
            </span>
          </div>
        )}

        <div className="mt-7 flex flex-col-reverse justify-center gap-2.5 sm:flex-row">
          <Link
            href="/dashboard-mitra"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-xs sm:text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
          >
            Dashboard Mitra
          </Link>
          <Link
            href="/partner/profil"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-terracotta-clay px-5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            Lihat Profil Saya
          </Link>
        </div>
      </div>
    </main>
  );
}
