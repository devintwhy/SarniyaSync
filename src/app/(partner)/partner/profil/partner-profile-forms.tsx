"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updateMitraProfileAndStoreAction,
  updateMitraPasswordAction,
  ProfileFormState,
} from "./actions";

type PartnerProfileFormsProps = {
  initialFullName: string;
  initialPhone: string;
  initialStoreName: string;
  initialAddress: string;
  email: string;
  storeStatus: string;
  createdAtText: string;
};

const initialFormState: ProfileFormState = { error: "", success: "" };

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  return (
    <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] text-xl font-bold text-white shadow-md shadow-[#9d5c4c]/20">
      {initials || "M"}
    </div>
  );
}

function AlertFeedback({ state }: { state: ProfileFormState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
      >
        <span aria-hidden="true">✕</span>
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.success) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
      >
        <span aria-hidden="true">✓</span>
        <span>{state.success}</span>
      </div>
    );
  }
  return null;
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-6 text-sm font-bold text-white shadow-md shadow-[#9d5c4c]/20 transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function PartnerProfileForms({
  initialFullName,
  initialPhone,
  initialStoreName,
  initialAddress,
  email,
  storeStatus,
  createdAtText,
}: PartnerProfileFormsProps) {
  const [profileState, profileAction] = useFormState(
    updateMitraProfileAndStoreAction,
    initialFormState
  );
  const [passwordState, passwordAction] = useFormState(
    updateMitraPasswordAction,
    initialFormState
  );

  const statusBadge =
    storeStatus === "aktif"
      ? { text: "Mitra Aktif", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
      : storeStatus === "pending"
      ? { text: "Menunggu Persetujuan", className: "bg-amber-50 text-amber-700 border-amber-200" }
      : { text: "Nonaktif", className: "bg-red-50 text-red-700 border-red-200" };

  return (
    <div className="space-y-8">
      {/* ── Ringkasan Akun & Tanggal Input ──────────────────────────────── */}
      <section
        aria-label="Informasi Akun"
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-[#2d3440]/5"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={initialFullName} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-[#2d3440]">{initialFullName}</h2>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadge.className}`}
                >
                  {statusBadge.text}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-[#6d7687]">{email}</p>
              <p className="mt-1 text-xs text-[#7a8394]">
                Toko: <span className="font-semibold text-[#2d3440]">{initialStoreName || "Belum ada nama toko"}</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7a8394]">Terdaftar Sejak</p>
            <p className="mt-0.5 text-sm font-bold text-[#2d3440]">{createdAtText}</p>
          </div>
        </div>
      </section>

      {/* ── Bagian 1: Form Profil Pemilik & Toko ─────────────────────────── */}
      <section
        aria-label="Pembaruan Data Profil dan Toko"
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5"
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold text-[#2d3440]">Informasi Profil & Toko</h2>
          <p className="mt-1 text-sm text-[#7a8394]">
            Perbarui data diri pemilik dan identitas toko yang Anda daftarkan.
          </p>
        </div>

        <form action={profileAction} className="space-y-5 p-6">
          <AlertFeedback state={profileState} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="fullName"
                className="mb-1.5 block text-sm font-medium text-[#2d3440]"
              >
                Nama Lengkap Pemilik <span className="text-[#a44d36]">*</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                defaultValue={initialFullName}
                placeholder="cth. Budi Santoso"
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-[#2d3440]"
              >
                Nomor Telepon / WhatsApp
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={initialPhone}
                placeholder="cth. 081234567890"
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="storeName"
              className="mb-1.5 block text-sm font-medium text-[#2d3440]"
            >
              Nama Toko Mitra <span className="text-[#a44d36]">*</span>
            </label>
            <input
              id="storeName"
              name="storeName"
              type="text"
              required
              defaultValue={initialStoreName}
              placeholder="cth. Toko Berkah Sarniya"
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
            />
          </div>

          <div>
            <label
              htmlFor="address"
              className="mb-1.5 block text-sm font-medium text-[#2d3440]"
            >
              Alamat Lengkap Toko
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              defaultValue={initialAddress}
              placeholder="cth. Jl. Melati No. 12, Kelurahan Sukajadi, Kota Bandung"
              className="w-full rounded-lg border border-slate-200 bg-white p-3.5 text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
            />
          </div>

          <div className="pt-2">
            <SubmitButton
              label="Simpan Perubahan Profil"
              pendingLabel="Menyimpan Perubahan..."
            />
          </div>
        </form>
      </section>

      {/* ── Bagian 2: Form Keamanan / Ubah Password ─────────────────────── */}
      <section
        aria-label="Keamanan dan Ubah Password"
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5"
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold text-[#2d3440]">Keamanan & Ubah Password</h2>
          <p className="mt-1 text-sm text-[#7a8394]">
            Gunakan password baru yang kuat minimal 8 karakter.
          </p>
        </div>

        <form action={passwordAction} className="space-y-5 p-6">
          <AlertFeedback state={passwordState} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="newPassword"
                className="mb-1.5 block text-sm font-medium text-[#2d3440]"
              >
                Password Baru <span className="text-[#a44d36]">*</span>
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-[#2d3440]"
              >
                Konfirmasi Password Baru <span className="text-[#a44d36]">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
              />
            </div>
          </div>

          <div className="pt-2">
            <SubmitButton
              label="Perbarui Password"
              pendingLabel="Memperbarui Password..."
            />
          </div>
        </form>
      </section>
    </div>
  );
}
