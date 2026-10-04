"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const supabase = createSupabaseBrowserClient();

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const nextPath = new URLSearchParams(window.location.search).get("next");
      const redirectPath = nextPath?.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : "/";
      router.replace(redirectPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Login gagal. Periksa email dan password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f4] px-5 py-10">
      <section className="w-full max-w-md rounded-md border border-[#e1e7e0] bg-white p-6 shadow-sm shadow-[#173b32]/5 sm:p-8">
        <header className="mb-7">
          <p className="mb-2 text-sm font-medium text-[#557b64]">SarniyaSync</p>
          <h1 className="text-2xl font-semibold text-[#173b32]">Masuk ke akun</h1>
          <p className="mt-2 text-sm text-[#68756e]">Gunakan email dan password admin Anda.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#293a32]">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="min-h-11 w-full rounded-md border border-[#d9e1d9] px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#293a32]">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="min-h-11 w-full rounded-md border border-[#d9e1d9] px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
            />
          </div>

          {errorMessage && (
            <p role="alert" className="rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-3 py-2.5 text-sm text-[#9b4936]">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#285b46] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1f4938] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Memeriksa..." : "Masuk"}
          </button>
        </form>
      </section>
    </main>
  );
}