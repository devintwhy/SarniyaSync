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
      className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#C89F91] via-[#c09485] to-[#b38274] px-6 text-sm font-semibold tracking-wide text-white shadow-sm transition-all duration-300 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50/95 p-4 text-xs sm:text-sm font-medium text-rose-800 shadow-sm"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2.5 border-b border-gray-200 pb-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-[#C89F91] text-xs font-bold text-white shadow-sm">
            1
          </span>
          <h2 className="text-sm font-semibold text-gray-800">
            Informasi Akun Login
          </h2>
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-600"
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
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 outline-none shadow-sm transition-all focus:ring-2 focus:ring-[#C89F91]/50 focus:border-[#C89F91]"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-xs font-medium uppercase tracking-wider text-gray-600"
            >
              Kata Sandi <span className="text-[#a46e5f]">*</span>
            </label>
            <span className="text-xs text-gray-500">Min. 8 Karakter</span>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••••••"
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 outline-none shadow-sm transition-all focus:ring-2 focus:ring-[#C89F91]/50 focus:border-[#C89F91]"
          />
        </div>
      </div>

      <div className="space-y-4 pt-1">
        <div className="flex items-center gap-2.5 border-b border-gray-200 pb-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-[#C89F91] text-xs font-bold text-white shadow-sm">
            2
          </span>
          <h2 className="text-sm font-semibold text-gray-800">
            Identitas Pemilik & Toko Mitra
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="fullName"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-600"
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
              className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 outline-none shadow-sm transition-all focus:ring-2 focus:ring-[#C89F91]/50 focus:border-[#C89F91]"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-600"
            >
              No. WhatsApp / Telp
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 outline-none shadow-sm transition-all focus:ring-2 focus:ring-[#C89F91]/50 focus:border-[#C89F91]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="storeName"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-600"
          >
            Nama Toko Mitra <span className="text-[#a46e5f]">*</span>
          </label>
          <input
            id="storeName"
            name="storeName"
            type="text"
            required
            placeholder="Contoh: Toko Sarniya Cabang Melati"
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 outline-none shadow-sm transition-all focus:ring-2 focus:ring-[#C89F91]/50 focus:border-[#C89F91]"
          />
        </div>

        <div>
          <label
            htmlFor="address"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-600"
          >
            Alamat Lengkap Toko
          </label>
          <textarea
            id="address"
            name="address"
            rows={3}
            placeholder="Jl. Raya No. 123, Kelurahan, Kecamatan, Kota"
            className="w-full resize-none rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800 placeholder-gray-400 outline-none shadow-sm transition-all focus:ring-2 focus:ring-[#C89F91]/50 focus:border-[#C89F91]"
          />
        </div>
      </div>

      <div className="pt-2">
        <SubmitButton />
      </div>

      <div className="pt-1 text-center text-xs text-gray-500">
        Sudah memiliki akun Mitra?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#a46e5f] underline hover:text-gray-900 transition-colors"
        >
          Masuk ke akun Anda
        </Link>
      </div>
    </form>
  );
}
