"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { getProfileRole, getRoleHomePath } from "@/utils/supabase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isRightPanelActive, setIsRightPanelActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("registered") === "true") {
      setSuccessMessage(
        "Pendaftaran berhasil! Akun dan toko Mitra Anda sudah aktif. Silakan masuk.",
      );
    }
    if (params.get("error") === "profile") {
      setErrorMessage("Role akun belum terdaftar. Hubungi administrator.");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const supabase = createSupabaseBrowserClient();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const role = await getProfileRole(supabase, data.user.id);
      if (!role) {
        await supabase.auth.signOut();
        throw new Error("Role akun belum terdaftar. Hubungi administrator.");
      }

      // Pengecekan status akun khusus untuk role Mitra
      if (role === "mitra") {
        const { data: store, error: storeError } = await supabase
          .from("partner_stores")
          .select("status, status_message")
          .eq("owner_id", data.user.id)
          .maybeSingle();

        if (storeError) {
          console.error("Gagal memeriksa status toko:", storeError.message);
        }

        const storeStatus = store?.status ?? "pending";
        if (storeStatus === "nonaktif" || storeStatus === "pending") {
          await supabase.auth.signOut();
          const defaultMsg =
            storeStatus === "pending"
              ? "Akun Anda sedang ditinjau atau dinonaktifkan. Silakan hubungi Admin."
              : "Akun Anda sedang dinonaktifkan. Silakan hubungi Admin.";

          throw new Error(store?.status_message?.trim() || defaultMsg);
        }
      }

      // Penanganan redirect aman tanpa loop
      const nextPath = new URLSearchParams(window.location.search).get("next");
      const safeNextPath =
        nextPath?.startsWith("/") && !nextPath.startsWith("//") && nextPath !== "/"
          ? nextPath
          : null;
      const nextIsAdmin = Boolean(
        safeNextPath &&
          (safeNextPath.startsWith("/dashboard") ||
            safeNextPath.startsWith("/inventory") ||
            safeNextPath.startsWith("/mitra") ||
            safeNextPath.startsWith("/penjualan") ||
            safeNextPath.startsWith("/produk") ||
            safeNextPath.startsWith("/alokasi") ||
            safeNextPath.startsWith("/profil") ||
            safeNextPath.startsWith("/admin/") ||
            safeNextPath.startsWith("/api/products")),
      );
      const nextIsPartner = Boolean(
        safeNextPath &&
          (safeNextPath === "/partner" ||
            safeNextPath.startsWith("/partner/") ||
            safeNextPath === "/dashboard-mitra" ||
            safeNextPath.startsWith("/dashboard-mitra/") ||
            safeNextPath.startsWith("/store/") ||
            safeNextPath.startsWith("/api/partner/")),
      );
      const nextMatchesRole = role === "mitra" ? nextIsPartner : nextIsAdmin;
      const redirectPath =
        safeNextPath && nextMatchesRole ? safeNextPath : getRoleHomePath(role);

      router.replace(redirectPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Login gagal. Periksa email dan password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Neumorphism Box Shadow Presets
  const neuInputInset = {
    boxShadow:
      "inset 6px 6px 12px rgba(163, 177, 198, 0.7), inset -6px -6px 12px rgba(255, 255, 255, 0.85)",
  };

  const neuButtonRaised = {
    boxShadow:
      "8px 8px 18px rgba(163, 177, 198, 0.6), -8px -8px 18px rgba(255, 255, 255, 0.9)",
  };

  const neuTagRaised = {
    boxShadow:
      "4px 4px 10px rgba(163, 177, 198, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.8)",
  };

  return (
    <main className="relative flex h-screen min-h-screen w-screen overflow-hidden bg-[#e0e5ec]">
      {/* =========================================================================
          SISI KIRI (48% - 50% Layar): Area Form Sign In yang Luas & Lapang
         ========================================================================= */}
      <div className="flex h-full w-full lg:w-[48%] flex-col justify-between overflow-y-auto px-8 py-10 sm:px-14 lg:px-16 xl:px-24">
        {/* Header Branding Kiri */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex size-12 items-center justify-center rounded-2xl bg-[#e0e5ec] p-2"
              style={neuTagRaised}
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

          {/* Toggle Khusus Mobile (< lg) */}
          <button
            type="button"
            onClick={() => setIsRightPanelActive(!isRightPanelActive)}
            className="rounded-xl bg-[#e0e5ec] px-3.5 py-1.5 text-xs font-bold text-[#C89F91] lg:hidden"
            style={neuTagRaised}
          >
            {isRightPanelActive ? "Ke Form Sign In" : "Daftar Mitra"}
          </button>
        </div>

        {/* Form Area Utama */}
        <div className="my-auto py-8">
          <div className="mb-8">
            <span
              className="inline-block rounded-full bg-[#C89F91]/15 px-3.5 py-1 text-xs font-bold text-[#a46e5f]"
            >
              Otentikasi Pengguna
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight text-[#2d3440]">
              Masuk ke Akun
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#6d7687]">
              Kelola stok terpusat, operasional kasir toko, dan analisa transaksi penjualan Anda.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
            {/* Input Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#576071]"
              >
                Alamat Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="nama@tokomitra.com"
                style={neuInputInset}
                className="h-14 sm:h-16 w-full rounded-2xl border-none bg-[#e0e5ec] px-5 text-base text-[#2d3440] placeholder-[#8f98a8] outline-none transition-all focus:ring-2 focus:ring-[#C89F91]/50"
              />
            </div>

            {/* Input Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-[#576071]"
                >
                  Kata Sandi
                </label>
                <span className="text-xs text-[#8f98a8]">Min. 8 Karakter</span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                style={neuInputInset}
                className="h-14 sm:h-16 w-full rounded-2xl border-none bg-[#e0e5ec] px-5 text-base text-[#2d3440] placeholder-[#8f98a8] outline-none transition-all focus:ring-2 focus:ring-[#C89F91]/50"
              />
            </div>

            {/* Status Pesan */}
            {successMessage && (
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-50/90 p-4 text-xs sm:text-sm font-medium text-emerald-800 shadow-sm">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="rounded-2xl border border-rose-300 bg-rose-50/95 p-4 text-xs sm:text-sm font-medium text-rose-800 shadow-sm">
                {errorMessage}
              </div>
            )}

            {/* Tombol Submit Besar Timbul */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={neuButtonRaised}
              className="mt-4 inline-flex h-14 sm:h-16 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#C89F91] via-[#c09485] to-[#b38274] px-6 text-base sm:text-lg font-bold tracking-wide text-white transition-all duration-300 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Memverifikasi Kredensial..." : "Sign In ke SarniyaSync"}
            </button>
          </form>

          {/* Navigasi alternatif di mobile */}
          <div className="mt-8 text-xs sm:text-sm text-[#6d7687] lg:hidden">
            Belum memiliki toko Mitra?{" "}
            <Link
              href="/register"
              className="font-bold text-[#a46e5f] underline hover:text-[#2d3440]"
            >
              Daftar Mitra Mandiri
            </Link>
          </div>
        </div>

        {/* Footer Sisi Kiri */}
        <footer className="text-xs text-[#8f98a8]">
          &copy; {new Date().getFullYear()} SarniyaSync POS System. Seluruh hak cipta dilindungi.
        </footer>
      </div>

      {/* =========================================================================
          SISI KANAN (52% Layar di Desktop): Area Sign Up / Informasi Alternatif
          (Terletak di bawah Panel Geser saat tertutup)
         ========================================================================= */}
      <div className="hidden lg:flex h-full w-[52%] flex-col justify-between overflow-y-auto px-16 xl:px-24 py-12">
        <div className="flex justify-end">
          <span
            className="rounded-full bg-[#C89F91]/15 px-4 py-1.5 text-xs font-bold text-[#a46e5f]"
          >
            Portal Registrasi Mitra
          </span>
        </div>

        <div className="my-auto max-w-lg py-8 space-y-6">
          <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-[#2d3440]">
            Buka Peluang Bisnis Bersama Sarniya
          </h2>
          <p className="text-base text-[#6d7687] leading-relaxed">
            Daftarkan gerai toko Anda dalam jaringan resmi SarniyaSync untuk mendapatkan suplai stok langsung dari gudang pusat dan sistem kasir modern terintegrasi.
          </p>

          <div
            className="space-y-4 rounded-3xl bg-[#e0e5ec] p-6 text-sm text-[#525a6b]"
            style={neuInputInset}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-[#C89F91] text-xs font-bold text-white shadow-sm">
                1
              </span>
              <div>
                <p className="font-bold text-[#2d3440]">Formulir Mandiri</p>
                <p className="text-xs text-[#737c8e]">Lengkapi profil pemilik toko dan titik lokasi toko Anda.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-[#C89F91] text-xs font-bold text-white shadow-sm">
                2
              </span>
              <div>
                <p className="font-bold text-[#2d3440]">Verifikasi Administrator</p>
                <p className="text-xs text-[#737c8e]">Persetujuan akun dan penetapan alokasi inventaris barang.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-[#C89F91] text-xs font-bold text-white shadow-sm">
                3
              </span>
              <div>
                <p className="font-bold text-[#2d3440]">Mulai Operasional Kasir</p>
                <p className="text-xs text-[#737c8e]">Langsung gunakan kasir POS dan cetak struk nota belanja.</p>
              </div>
            </div>
          </div>

          <Link
            href="/register"
            style={neuButtonRaised}
            className="inline-flex h-14 sm:h-16 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#C89F91] via-[#c09485] to-[#b38274] px-6 text-base font-bold text-white tracking-wide transition-all duration-300 hover:brightness-105 active:scale-[0.99]"
          >
            Buka Halaman Pendaftaran Lengkap
          </Link>
        </div>

        <div className="text-right text-xs text-[#8f98a8]">
          Butuh bantuan pendaftaran? Hubungi Admin Support.
        </div>
      </div>

      {/* =========================================================================
          PANEL VISUAL ASIMETRIS RAKSASA (Sliding Overlay Panel)
          Desktop: Memenuhi 52% layar dengan kurva lengkungan sweeping dramatis
         ========================================================================= */}
      <aside
        aria-label="Panel Visual Asimetris Sarniya"
        className={`pointer-events-auto absolute top-0 hidden h-full w-[52%] flex-col items-center justify-center p-12 lg:p-16 xl:p-20 text-center text-white bg-gradient-to-br from-[#D8A899] via-[#C89F91] to-[#B08072] shadow-2xl transition-all duration-700 ease-in-out lg:flex z-30 ${
          isRightPanelActive
            ? "left-0 translate-x-0 rounded-r-[160px] xl:rounded-r-[220px] rounded-l-none"
            : "left-[48%] translate-x-0 rounded-l-[160px] xl:rounded-l-[220px] rounded-r-none"
        }`}
      >
        {/* Ornamen Lingkaran Ambient Latar Panel */}
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-black/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center max-w-md">
          {/* Logo Sarniya Ukuran Besar */}
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

          {!isRightPanelActive ? (
            <>
              {/* Tampilan Default: Mengajak Pengunjung Mendaftar */}
              <h2 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight drop-shadow-sm">
                Welcome Back!
              </h2>
              <p className="mt-5 text-base sm:text-lg text-white/95 leading-relaxed font-light">
                Selamat datang kembali di ekosistem operasional <strong>SarniyaSync</strong>. Akses kontrol stok terpadu dan kasir toko Anda dengan mudah.
              </p>

              <div className="mt-10 flex flex-col items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                  Belum Terdaftar Sebagai Mitra?
                </p>
                <button
                  type="button"
                  onClick={() => setIsRightPanelActive(true)}
                  className="rounded-full border-2 border-white/90 bg-white/10 px-10 py-4 text-sm font-bold uppercase tracking-wider text-white backdrop-blur-md transition-all duration-300 hover:bg-white hover:text-[#a46e5f] hover:shadow-2xl active:scale-95"
                >
                  Daftar Toko Mitra Baru
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Tampilan Aktif: Mengajak Kembali ke Sign In */}
              <h2 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight drop-shadow-sm">
                Halo, Rekan Mitra!
              </h2>
              <p className="mt-5 text-base sm:text-lg text-white/95 leading-relaxed font-light">
                Sudah memiliki akun toko yang terdaftar sebelumnya? Masuk kembali ke sistem untuk mulai melayani transaksi kasir.
              </p>

              <div className="mt-10 flex flex-col items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                  Sudah Memiliki Akun?
                </p>
                <button
                  type="button"
                  onClick={() => setIsRightPanelActive(false)}
                  className="rounded-full border-2 border-white/90 bg-white/10 px-10 py-4 text-sm font-bold uppercase tracking-wider text-white backdrop-blur-md transition-all duration-300 hover:bg-white hover:text-[#a46e5f] hover:shadow-2xl active:scale-95"
                >
                  Kembali ke Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </main>
  );
}
