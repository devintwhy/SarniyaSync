"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { registerMitraAction, type RegisterState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        boxShadow:
          "8px 8px 18px rgba(163, 177, 198, 0.6), -8px -8px 18px rgba(255, 255, 255, 0.9)",
      }}
      className="mt-4 inline-flex h-14 sm:h-16 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#C89F91] via-[#c09485] to-[#b38274] px-6 text-base sm:text-lg font-bold tracking-wide text-white transition-all duration-300 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Memproses Kredensial & Toko..." : "Daftar Sebagai Mitra"}
    </button>
  );
}

export default function RegisterForm() {
  const [state, formAction] = useFormState<RegisterState, FormData>(
    registerMitraAction,
    {},
  );

  const neuInputInset = {
    boxShadow:
      "inset 6px 6px 12px rgba(163, 177, 198, 0.7), inset -6px -6px 12px rgba(255, 255, 255, 0.85)",
  };

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50/95 p-4 text-xs sm:text-sm font-medium text-rose-800 shadow-sm"
        >
          {state.error}
        </div>
      )}

      {/* Seksi 1: Akun Login */}
      <div className="space-y-5">
        <div className="flex items-center gap-2.5 border-b border-[#cbd3df]/50 pb-2.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-[#C89F91] text-xs font-bold text-white shadow-sm">
            1
          </span>
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#a46e5f]">
            Informasi Akun Login
          </h2>
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#576071]"
          >
            Alamat Email <span className="text-[#a46e5f]">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@emailmitra.com"
            style={neuInputInset}
            className="h-14 sm:h-16 w-full rounded-2xl border-none bg-[#e0e5ec] px-5 text-base text-[#2d3440] placeholder-[#8f98a8] outline-none transition-all focus:ring-2 focus:ring-[#C89F91]/50"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-[#576071]"
            >
              Kata Sandi <span className="text-[#a46e5f]">*</span>
            </label>
            <span className="text-xs text-[#8f98a8]">Min. 8 Karakter</span>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••••••"
            style={neuInputInset}
            className="h-14 sm:h-16 w-full rounded-2xl border-none bg-[#e0e5ec] px-5 text-base text-[#2d3440] placeholder-[#8f98a8] outline-none transition-all focus:ring-2 focus:ring-[#C89F91]/50"
          />
        </div>
      </div>

      {/* Seksi 2: Data Pemilik & Toko */}
      <div className="space-y-5 pt-2">
        <div className="flex items-center gap-2.5 border-b border-[#cbd3df]/50 pb-2.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-[#C89F91] text-xs font-bold text-white shadow-sm">
            2
          </span>
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#a46e5f]">
            Identitas Pemilik & Toko Mitra
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#576071]"
            >
              Nama Lengkap Pemilik <span className="text-[#a46e5f]">*</span>
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="Nama pemilik toko"
              style={neuInputInset}
              className="h-14 sm:h-16 w-full rounded-2xl border-none bg-[#e0e5ec] px-5 text-base text-[#2d3440] placeholder-[#8f98a8] outline-none transition-all focus:ring-2 focus:ring-[#C89F91]/50"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#576071]"
            >
              No. WhatsApp / Telp
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              style={neuInputInset}
              className="h-14 sm:h-16 w-full rounded-2xl border-none bg-[#e0e5ec] px-5 text-base text-[#2d3440] placeholder-[#8f98a8] outline-none transition-all focus:ring-2 focus:ring-[#C89F91]/50"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="storeName"
            className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#576071]"
          >
            Nama Toko Mitra <span className="text-[#a46e5f]">*</span>
          </label>
          <input
            id="storeName"
            name="storeName"
            type="text"
            required
            placeholder="Contoh: Toko Sarniya Cabang Melati"
            style={neuInputInset}
            className="h-14 sm:h-16 w-full rounded-2xl border-none bg-[#e0e5ec] px-5 text-base text-[#2d3440] placeholder-[#8f98a8] outline-none transition-all focus:ring-2 focus:ring-[#C89F91]/50"
          />
        </div>

        <div>
          <label
            htmlFor="address"
            className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#576071]"
          >
            Alamat Lengkap Toko
          </label>
          <textarea
            id="address"
            name="address"
            rows={3}
            placeholder="Jl. Raya No. 123, Kelurahan, Kecamatan, Kota"
            style={neuInputInset}
            className="w-full resize-none rounded-2xl border-none bg-[#e0e5ec] p-5 text-base text-[#2d3440] placeholder-[#8f98a8] outline-none transition-all focus:ring-2 focus:ring-[#C89F91]/50"
          />
        </div>
      </div>

      {/* Tombol Submit Besar Timbul */}
      <div className="pt-2">
        <SubmitButton />
      </div>

      <div className="pt-2 text-center text-xs sm:text-sm text-[#6d7687]">
        Sudah memiliki akun Mitra?{" "}
        <Link
          href="/login"
          className="font-bold text-[#a46e5f] underline hover:text-[#2d3440] transition-colors"
        >
          Masuk ke akun Anda
        </Link>
      </div>
    </form>
  );
}
