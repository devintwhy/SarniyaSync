import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import RegisterForm from "./register-form";

export const metadata: Metadata = {
  title: "Pendaftaran Mitra Baru | SarniyaSync",
  description: "Daftarkan akun dan toko Mitra baru di sistem SarniyaSync secara mandiri.",
};

export default function RegisterPage() {
  return (
    <main className="relative flex h-screen min-h-screen w-screen overflow-hidden bg-gray-50">
      <div className="flex h-full w-full lg:w-[50%] flex-col justify-between overflow-y-auto px-8 py-10 sm:px-14 lg:px-16 xl:px-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex size-12 items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm p-2"
            >
              <Image
                src="/logo-sarniya.png"
                alt="Sarniya Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-[#2d3440]">
                SarniyaSync
              </span>
              <p className="text-[11px] font-medium text-[#7a8394]">
                Enterprise POS & Supply Chain
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-2 text-xs font-bold text-[#576071] transition-all hover:text-[#2d3440] active:scale-95"
          >
            <span>&larr;</span> Ke Form Sign In
          </Link>
        </div>

        <div className="my-auto py-8 max-w-xl">
          <div className="mb-8">
            <span className="inline-block rounded-full bg-[#C89F91]/15 px-3.5 py-1 text-xs font-bold text-[#a46e5f]">
              Pendaftaran Mitra Mandiri
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
              Daftar Mitra Baru
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Lengkapi informasi akun pemilik dan profil toko Anda untuk mulai mengelola stok serta kasir POS.
            </p>
          </div>

          <RegisterForm />
        </div>

        <footer className="text-xs text-[#8f98a8]">
          &copy; {new Date().getFullYear()} SarniyaSync POS System. Seluruh hak cipta dilindungi.
        </footer>
      </div>

      <aside
        aria-label="Panel Visual Asimetris Sarniya"
        className="pointer-events-auto relative hidden h-full w-[50%] flex-col items-center justify-center p-12 lg:p-16 xl:p-20 text-center text-white bg-gradient-to-br from-[#D8A899] via-[#C89F91] to-[#B08072] shadow-2xl lg:flex z-30 rounded-l-[160px] xl:rounded-l-[220px] rounded-r-none"
      >
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-black/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center max-w-md">
          <div className="mb-8 flex size-28 items-center justify-center rounded-3xl bg-white/20 p-4 shadow-2xl backdrop-blur-md border border-white/30">
            <Image
              alt="Sarniya Logo"
              src="/logo-sarniya.png"
              width={96}
              height={96}
              className="h-full w-full object-contain drop-shadow-lg"
              priority
            />
          </div>

          <h2 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight drop-shadow-sm">
            Gabung Bersama!
          </h2>
          <p className="mt-5 text-base sm:text-lg text-white/95 leading-relaxed font-light">
            Jadilah bagian dari jaringan ritel resmi <strong>SarniyaSync</strong>. Nikmati pasokan inventaris produk terjamin dan kemudahan cetak struk kasir otomatis.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
              Sudah Memiliki Akun Terdaftar?
            </p>
            <Link
              href="/login"
              className="rounded-full border-2 border-white/90 bg-white/10 px-10 py-4 text-sm font-bold uppercase tracking-wider text-white backdrop-blur-md transition-all duration-300 hover:bg-white hover:text-[#a46e5f] hover:shadow-2xl active:scale-95"
            >
              Sign In ke Akun Anda
            </Link>
          </div>
        </div>
      </aside>
    </main>
  );
}
