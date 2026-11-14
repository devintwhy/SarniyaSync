import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Halaman Tidak Ditemukan | SarniyaSync",
  description: "Halaman yang Anda tuju tidak ditemukan pada sistem SarniyaSync.",
};

// Tampilan Halaman Tidak Ditemukan (404)
export default function NotFoundPage() {
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
          Galat 404
        </span>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
          Halaman Tidak Ditemukan
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-gray-500 max-w-md mx-auto">
          Tautan yang Anda tuju tidak tersedia, alamat URL salah diketik, atau halaman telah dipindahkan.
        </p>

        <div className="mt-7 flex flex-col-reverse justify-center gap-2.5 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-xs sm:text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
          >
            Ke Halaman Masuk
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-terracotta-clay px-5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
