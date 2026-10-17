"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateProfileAction, updatePasswordAction } from "./actions";

type ProfileFormProps = {
  userId?: string;
  initialName: string;
  email: string;
  role: string;
};

const emptyState = { error: "", success: "" };

// ── Avatar Inisial ─────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  return (
    <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] text-sm sm:text-base font-bold text-white shadow-sm">
      {initials || "?"}
    </div>
  );
}

// ── Alert Feedback ─────────────────────────────────────────────────────────
function Alert({ type, message }: { type: "success" | "error"; message: string }) {
  if (!message) return null;
  const styles =
    type === "success"
      ? "border-[#cfe2d0] bg-[#edf5e8] text-[#315d3e]"
      : "border-[#f0d4cc] bg-[#fff5f1] text-[#9b4936]";
  const icon = type === "success" ? "✓" : "✕";
  return (
    <p role={type === "error" ? "alert" : "status"} className={`mt-2 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs sm:text-sm font-medium ${styles}`}>
      <span aria-hidden="true">{icon}</span>
      {message}
    </p>
  );
}

// ── Submit Button dengan useFormStatus (React 18) ──────────────────────────
function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-4 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function ProfileForms({ initialName, email, role }: ProfileFormProps) {
  const [profileState, profileAction] = useFormState(updateProfileAction, emptyState);
  const [passwordState, passwordAction] = useFormState(updatePasswordAction, emptyState);

  const roleLabel: Record<string, string> = {
    pemilik: "Pemilik",
    admin: "Admin",
    mitra: "Mitra",
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* ── Info Identitas ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3.5 rounded-xl border border-[#e1e7e0] bg-white p-3.5 sm:p-4 shadow-sm">
        <Avatar name={initialName} />
        <div>
          <p className="text-sm sm:text-base font-bold text-[#9d5c4c]">{initialName}</p>
          <p className="text-xs text-[#68756e]">{email}</p>
          <span className="mt-1 inline-flex rounded-full bg-[#edf5e8] px-2 py-0.5 text-[10px] font-bold text-[#315d3e]">
            {roleLabel[role] ?? role}
          </span>
        </div>
      </div>

      {/* ── Form 1: Ubah Nama Profil ─────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-[#e1e7e0] bg-white shadow-sm">
        <div className="border-b border-[#edf0ec] px-4 py-2.5">
          <h2 className="text-sm sm:text-base font-bold text-[#9d5c4c]">Ubah Profil</h2>
          <p className="text-xs text-[#7b877f]">Perbarui nama tampilan akun Anda.</p>
        </div>
        <form action={profileAction} className="space-y-3 px-4 py-3 sm:py-3.5">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-xs font-semibold text-[#2d3440]">
              Nama Lengkap
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              minLength={2}
              maxLength={100}
              defaultValue={initialName}
              className="h-9 w-full max-w-md rounded-lg border border-slate-200 px-3 text-xs sm:text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
            />
          </div>
          <Alert type={profileState.error ? "error" : "success"} message={profileState.error || profileState.success} />
          <SubmitButton label="Simpan Perubahan" pendingLabel="Menyimpan..." />
        </form>
      </section>

      {/* ── Form 2: Ubah Password ────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-[#e1e7e0] bg-white shadow-sm">
        <div className="border-b border-[#edf0ec] px-4 py-2.5">
          <h2 className="text-sm sm:text-base font-bold text-[#9d5c4c]">Ubah Password</h2>
          <p className="text-xs text-[#7b877f]">Gunakan password yang kuat dan belum pernah dipakai sebelumnya.</p>
        </div>
        <form action={passwordAction} className="space-y-3 px-4 py-3 sm:py-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="newPassword" className="mb-1 block text-xs font-semibold text-[#2d3440]">
                Password Baru
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs sm:text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-xs font-semibold text-[#2d3440]">
                Konfirmasi Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Ulangi password baru"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs sm:text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
              />
            </div>
          </div>
          <Alert type={passwordState.error ? "error" : "success"} message={passwordState.error || passwordState.success} />
          <SubmitButton label="Perbarui Password" pendingLabel="Memperbarui..." />
        </form>
      </section>
    </div>
  );
}