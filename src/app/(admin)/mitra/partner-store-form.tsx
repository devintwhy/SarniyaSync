"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type MitraOwner = {
  id: string;
  full_name: string;
  phone: string | null;
};

type PartnerStoreFormProps = {
  owners: MitraOwner[];
};

type CreateStoreResponse = {
  error?: string;
};

export default function PartnerStoreForm({ owners }: PartnerStoreFormProps) {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/partner-stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: ownerId,
          name: formData.get("name"),
          address: formData.get("address"),
          city: formData.get("city"),
          phone: formData.get("phone"),
        }),
      });
      const result = (await response.json()) as CreateStoreResponse;

      if (!response.ok) throw new Error(result.error ?? "Toko gagal ditambahkan.");

      setSuccessMessage("Toko mitra berhasil ditambahkan.");
      form.reset();
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Toko gagal ditambahkan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="store-owner" className="mb-1.5 block text-sm font-medium text-[#2d3440]">Pemilik Akun Mitra</label>
          <select
            id="store-owner"
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
            required
            disabled={owners.length === 0}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#2d3440] outline-none transition-all focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25 disabled:bg-slate-50"
          >
            {owners.length === 0 ? (
              <option value="">Belum ada profil ber-role Mitra</option>
            ) : owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.full_name}{owner.phone ? ` · ${owner.phone}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="store-name" className="mb-1.5 block text-sm font-medium text-[#2d3440]">Nama Toko</label>
          <input
            id="store-name"
            name="name"
            type="text"
            required
            maxLength={160}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#2d3440] outline-none transition-all focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="store-address" className="mb-1.5 block text-sm font-medium text-[#2d3440]">Alamat</label>
          <input id="store-address" name="address" type="text" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#2d3440] outline-none transition-all focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25" />
        </div>
        <div>
          <label htmlFor="store-city" className="mb-1.5 block text-sm font-medium text-[#2d3440]">Kota</label>
          <input id="store-city" name="city" type="text" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#2d3440] outline-none transition-all focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25" />
        </div>
        <div>
          <label htmlFor="store-phone" className="mb-1.5 block text-sm font-medium text-[#2d3440]">Nomor Telepon</label>
          <input id="store-phone" name="phone" type="tel" autoComplete="tel" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#2d3440] outline-none transition-all focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25" />
        </div>
      </div>

      {errorMessage && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{errorMessage}</p>}
      {successMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{successMessage}</p>}

      <button
        type="submit"
        disabled={isSubmitting || owners.length === 0}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-5 text-sm font-bold text-white shadow-md shadow-[#9d5c4c]/20 transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Menyimpan..." : "Tambah Toko Mitra"}
      </button>
    </form>
  );
}