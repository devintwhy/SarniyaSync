"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
});

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  return (
    <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] text-sm sm:text-base font-bold text-white shadow-sm">
      {initials || "M"}
    </div>
  );
}

function AlertMessage({ error, success }: { error: string; success: string }) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm font-medium text-red-600"
      >
        <span aria-hidden="true">✕</span>
        <span>{error}</span>
      </div>
    );
  }
  if (success) {
    return (
      <div
        role="status"
        className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs sm:text-sm font-medium text-emerald-700"
      >
        <span aria-hidden="true">✓</span>
        <span>{success}</span>
      </div>
    );
  }
  return null;
}

export default function PartnerProfilePage() {
  const router = useRouter();

  // 1. Inisialisasi Supabase SSR Browser Client di dalam komponen
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Form field states
  const [formData, setFormData] = useState({
    namaLengkap: "",
    namaToko: "",
    alamatLengkap: "",
    phone: "",
  });

  const [email, setEmail] = useState("");
  const [storeStatus, setStoreStatus] = useState("pending");
  const [createdAtText, setCreatedAtText] = useState("—");

  // Feedback states untuk form profil
  const [profileState, setProfileState] = useState({ error: "", success: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordState, setPasswordState] = useState({ error: "", success: "" });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // ── Ambil Sesi & Data Awal Saat Mount ──────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        const user = session.user;

        const [profileRes, storeRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, phone, role, created_at")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("partner_stores")
            .select("id, name, address, phone, status, is_active, created_at")
            .eq("owner_id", user.id)
            .maybeSingle(),
        ]);

        if (!isMounted) return;

        setEmail(user.email ?? "");
        setFormData({
          namaLengkap: profileRes.data?.full_name ?? "",
          namaToko: storeRes.data?.name ?? "",
          alamatLengkap: storeRes.data?.address ?? "",
          phone: profileRes.data?.phone || storeRes.data?.phone || "",
        });

        setStoreStatus(
          storeRes.data?.status || (storeRes.data?.is_active ? "aktif" : "pending")
        );

        const rawCreatedAt =
          storeRes.data?.created_at ||
          profileRes.data?.created_at ||
          user.created_at;

        if (rawCreatedAt) {
          try {
            setCreatedAtText(dateFormatter.format(new Date(rawCreatedAt)));
          } catch {
            setCreatedAtText("—");
          }
        }
      } catch (err) {
        console.error("Gagal memuat data profil:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [supabase, router]);

  // ── 2 & 3. Fungsi handleSubmit Sesuai Format yang Diminta ──────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setProfileState({ error: "", success: "" });

    // 1. Ambil KTP / Sesi Pengguna
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.error("Gagal: Sesi tidak ditemukan. Request akan ditolak Supabase.");
      setProfileState({
        error: "Gagal: Sesi tidak ditemukan. Silakan login ulang.",
        success: "",
      });
      setIsSubmitting(false);
      return;
    }

    const trimmedName = formData.namaLengkap.trim();
    const trimmedStore = formData.namaToko.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setProfileState({
        error: "Nama lengkap pemilik minimal 2 karakter.",
        success: "",
      });
      setIsSubmitting(false);
      return;
    }

    if (!trimmedStore || trimmedStore.length < 2) {
      setProfileState({
        error: "Nama toko minimal 2 karakter.",
        success: "",
      });
      setIsSubmitting(false);
      return;
    }

    const nowIso = new Date().toISOString();

    // 2. Lakukan penyimpanan dengan membawa ID yang sah
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: session.user.id, // ID ini wajib dikirim agar lolos RLS
        full_name: trimmedName,
        phone: formData.phone.trim() || null,
        role: "mitra",
        updated_at: nowIso,
      })
      .eq("id", session.user.id);

    if (error) {
      console.error("Error dari Supabase:", error.message);
      // Coba fallback UPDATE eksplisit jika policy RLS hanya mengizinkan update
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: trimmedName,
          phone: formData.phone.trim() || null,
          updated_at: nowIso,
        })
        .eq("id", session.user.id);

      if (updateError) {
        setProfileState({
          error: `Error dari Supabase: ${error.message || updateError.message}`,
          success: "",
        });
        setIsSubmitting(false);
        return;
      }
    }

    // 3. Simpan / Perbarui partner_stores
    try {
      const { data: existingStore } = await supabase
        .from("partner_stores")
        .select("id")
        .eq("owner_id", session.user.id)
        .maybeSingle();

      if (existingStore) {
        await supabase
          .from("partner_stores")
          .update({
            name: trimmedStore,
            phone: formData.phone.trim() || null,
            address: formData.alamatLengkap.trim() || null,
            updated_at: nowIso,
          })
          .eq("id", existingStore.id)
          .eq("owner_id", session.user.id);
      } else {
        await supabase
          .from("partner_stores")
          .insert({
            owner_id: session.user.id,
            name: trimmedStore,
            phone: formData.phone.trim() || null,
            address: formData.alamatLengkap.trim() || null,
            status: "pending",
            is_active: false,
            created_at: nowIso,
            updated_at: nowIso,
          });
      }

      setProfileState({
        error: "",
        success: "Data profil pemilik dan toko Mitra berhasil disimpan!",
      });
    } catch (storeErr) {
      console.error("Error partner_stores:", storeErr);
      setProfileState({
        error: "",
        success: "Data profil berhasil disimpan!",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Handler Ubah Password ───────────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPassword(true);
    setPasswordState({ error: "", success: "" });

    if (!newPassword || newPassword.length < 8) {
      setPasswordState({
        error: "Password baru minimal 8 karakter.",
        success: "",
      });
      setIsSubmittingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordState({
        error: "Konfirmasi password baru tidak cocok.",
        success: "",
      });
      setIsSubmittingPassword(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setPasswordState({
        error: "Sesi tidak ditemukan. Silakan login kembali.",
        success: "",
      });
      setIsSubmittingPassword(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setPasswordState({
        error: `Gagal memperbarui password: ${updateError.message}`,
        success: "",
      });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordState({
        error: "",
        success: "Password akun Anda berhasil diperbarui!",
      });
    }
    setIsSubmittingPassword(false);
  };

  const statusBadge =
    storeStatus === "aktif"
      ? { text: "Mitra Aktif", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
      : storeStatus === "pending"
      ? { text: "Menunggu Persetujuan", className: "bg-amber-50 text-amber-700 border-amber-200" }
      : { text: "Nonaktif", className: "bg-red-50 text-red-700 border-red-200" };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3 sm:space-y-4">
      <header>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-[#f7e4d4] px-2.5 py-0.5 text-xs font-bold text-[#9d5c4c]">
            Pengaturan Akun
          </span>
          <span className="text-xs text-[#7a8394]">&bull; Portal Mitra</span>
        </div>
        <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#2d3440]">
          Profil Pemilik & Toko
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-[#6d7687]">
          Kelola data pendaftaran mandiri, informasi operasional toko, dan keamanan kata sandi Anda.
        </p>
      </header>

      <section
        aria-label="Informasi Akun"
        className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-sm shadow-[#2d3440]/5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={formData.namaLengkap || "Mitra"} />
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-[#2d3440]">
                  {isLoading ? "Memuat profil..." : formData.namaLengkap || "Mitra Sarniya"}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-bold ${statusBadge.className}`}
                >
                  {statusBadge.text}
                </span>
              </div>
              <p className="text-xs text-[#6d7687]">{isLoading ? "..." : email}</p>
              <p className="text-[11px] text-[#7a8394]">
                Toko:{" "}
                <span className="font-semibold text-[#2d3440]">
                  {isLoading ? "..." : formData.namaToko || "Belum ada nama toko"}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8394]">
              Terdaftar Sejak
            </p>
            <p className="text-xs font-bold text-[#2d3440]">
              {isLoading ? "..." : createdAtText}
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="Pembaruan Data Profil dan Toko"
        className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5"
      >
        <div className="border-b border-slate-100 px-4 py-2.5">
          <h2 className="text-sm sm:text-base font-bold text-[#2d3440]">
            Informasi Profil & Toko
          </h2>
          <p className="text-xs text-[#7a8394]">
            Perbarui data diri pemilik dan identitas toko yang Anda daftarkan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 p-3.5 sm:p-4">
          <AlertMessage
            error={profileState.error}
            success={profileState.success}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="namaLengkap"
                className="mb-1 block text-xs font-semibold text-[#2d3440]"
              >
                Nama Lengkap Pemilik <span className="text-[#a44d36]">*</span>
              </label>
              <input
                id="namaLengkap"
                name="namaLengkap"
                type="text"
                required
                value={formData.namaLengkap}
                onChange={(e) =>
                  setFormData({ ...formData, namaLengkap: e.target.value })
                }
                placeholder="cth. Budi Santoso"
                disabled={isLoading || isSubmitting}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25 disabled:bg-slate-50 disabled:opacity-70"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-xs font-semibold text-[#2d3440]"
              >
                Nomor Telepon / WhatsApp
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="cth. 081234567890"
                disabled={isLoading || isSubmitting}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25 disabled:bg-slate-50 disabled:opacity-70"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="namaToko"
              className="mb-1 block text-xs font-semibold text-[#2d3440]"
            >
              Nama Toko Mitra <span className="text-[#a44d36]">*</span>
            </label>
            <input
              id="namaToko"
              name="namaToko"
              type="text"
              required
              value={formData.namaToko}
              onChange={(e) =>
                setFormData({ ...formData, namaToko: e.target.value })
              }
              placeholder="cth. Toko Berkah Sarniya"
              disabled={isLoading || isSubmitting}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25 disabled:bg-slate-50 disabled:opacity-70"
            />
          </div>

          <div>
            <label
              htmlFor="alamatLengkap"
              className="mb-1 block text-xs font-semibold text-[#2d3440]"
            >
              Alamat Lengkap Toko
            </label>
            <textarea
              id="alamatLengkap"
              name="alamatLengkap"
              rows={2}
              value={formData.alamatLengkap}
              onChange={(e) =>
                setFormData({ ...formData, alamatLengkap: e.target.value })
              }
              placeholder="cth. Jl. Melati No. 12, Kelurahan Sukajadi, Kota Bandung"
              disabled={isLoading || isSubmitting}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs sm:text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25 disabled:bg-slate-50 disabled:opacity-70"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Menyimpan Perubahan..."
                : "Simpan Perubahan Profil"}
            </button>
          </div>
        </form>
      </section>

      <section
        aria-label="Keamanan dan Ubah Password"
        className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-[#2d3440]/5"
      >
        <div className="border-b border-slate-100 px-4 py-2.5">
          <h2 className="text-sm sm:text-base font-bold text-[#2d3440]">
            Keamanan & Ubah Password
          </h2>
          <p className="text-xs text-[#7a8394]">
            Gunakan password baru yang kuat minimal 8 karakter.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-3.5 p-3.5 sm:p-4">
          <AlertMessage
            error={passwordState.error}
            success={passwordState.success}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="newPassword"
                className="mb-1 block text-xs font-semibold text-[#2d3440]"
              >
                Password Baru <span className="text-[#a44d36]">*</span>
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                disabled={isSubmittingPassword}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25 disabled:bg-slate-50 disabled:opacity-70"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-xs font-semibold text-[#2d3440]"
              >
                Konfirmasi Password Baru <span className="text-[#a44d36]">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                disabled={isSubmittingPassword}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25 disabled:bg-slate-50 disabled:opacity-70"
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingPassword
                ? "Memperbarui Password..."
                : "Perbarui Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
