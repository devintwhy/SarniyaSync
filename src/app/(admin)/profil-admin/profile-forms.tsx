"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

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

// ── Submit Button ──────────────────────────────────────────────────────────
function ActionButton({
  label,
  pendingLabel,
  isPending,
}: {
  label: string;
  pendingLabel: string;
  isPending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-4 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}

export default function ProfileForms({ initialName, email, role }: ProfileFormProps) {
  const router = useRouter();
  const [profileState, setProfileState] = useState(emptyState);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  const [passwordState, setPasswordState] = useState(emptyState);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const [displayedName, setDisplayedName] = useState(initialName);

  const roleLabel: Record<string, string> = {
    pemilik: "Pemilik",
    admin: "Admin",
    mitra: "Mitra",
  };

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingProfile(true);
    setProfileState(emptyState);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();

    if (!fullName || fullName.length < 2) {
      setProfileState({ error: "Nama lengkap minimal 2 karakter.", success: "" });
      setIsSubmittingProfile(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sesi tidak valid. Silakan login kembali.");
      }

      const nowIso = new Date().toISOString();

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
          role: role || "admin",
          updated_at: nowIso,
        });

      if (upsertError) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            updated_at: nowIso,
          })
          .eq("id", user.id);

        if (updateError) {
          throw new Error(`Gagal menyimpan profil: ${upsertError.message || updateError.message}`);
        }
      }

      setDisplayedName(fullName);
      setProfileState({ error: "", success: "Nama profil berhasil diperbarui!" });
      router.refresh();
    } catch (err) {
      setProfileState({
        error: err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui profil.",
        success: "",
      });
    } finally {
      setIsSubmittingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingPassword(true);
    setPasswordState(emptyState);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!newPassword || newPassword.length < 8) {
      setPasswordState({ error: "Password minimal 8 karakter.", success: "" });
      setIsSubmittingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordState({ error: "Konfirmasi password tidak cocok.", success: "" });
      setIsSubmittingPassword(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sesi tidak valid. Silakan login kembali.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(`Gagal memperbarui password: ${updateError.message}`);
      }

      form.reset();
      setPasswordState({ error: "", success: "Password berhasil diperbarui!" });
    } catch (err) {
      setPasswordState({
        error: err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui password.",
        success: "",
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  return (
    <div className="space-y-3.5 sm:space-y-4">
      <div className="flex items-center gap-3.5 rounded-xl border border-[#e1e7e0] bg-white p-3.5 sm:p-4 shadow-sm">
        <Avatar name={displayedName} />
        <div>
          <p className="text-sm sm:text-base font-bold text-[#9d5c4c]">{displayedName}</p>
          <p className="text-xs text-[#68756e]">{email}</p>
          <span className="mt-1 inline-flex rounded-full bg-[#edf5e8] px-2 py-0.5 text-[10px] font-bold text-[#315d3e]">
            {roleLabel[role] ?? role}
          </span>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#e1e7e0] bg-white shadow-sm">
        <div className="border-b border-[#edf0ec] px-4 py-2.5">
          <h2 className="text-sm sm:text-base font-bold text-[#9d5c4c]">Ubah Profil</h2>
          <p className="text-xs text-[#7b877f]">Perbarui nama tampilan akun Anda.</p>
        </div>
        <form onSubmit={handleProfileSubmit} className="space-y-3 px-4 py-3 sm:py-3.5">
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
          <ActionButton label="Simpan Perubahan" pendingLabel="Menyimpan..." isPending={isSubmittingProfile} />
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#e1e7e0] bg-white shadow-sm">
        <div className="border-b border-[#edf0ec] px-4 py-2.5">
          <h2 className="text-sm sm:text-base font-bold text-[#9d5c4c]">Ubah Password</h2>
          <p className="text-xs text-[#7b877f]">Gunakan password yang kuat dan belum pernah dipakai sebelumnya.</p>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-3 px-4 py-3 sm:py-3.5">
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
          <ActionButton label="Perbarui Password" pendingLabel="Memperbarui..." isPending={isSubmittingPassword} />
        </form>
      </section>
    </div>
  );
}