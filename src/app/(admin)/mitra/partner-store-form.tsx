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
          <label htmlFor="store-owner" className="mb-1.5 block text-sm font-medium text-[#293a32]">Pemilik Akun Mitra</label>
          <select
            id="store-owner"
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
            required
            disabled={owners.length === 0}
            className="min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20 disabled:bg-[#f7f9f6]"
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
          <label htmlFor="store-name" className="mb-1.5 block text-sm font-medium text-[#293a32]">Nama Toko</label>
          <input
            id="store-name"
            name="name"
            type="text"
            required
            maxLength={160}
            className="min-h-11 w-full rounded-md border border-[#d9e1d9] px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="store-address" className="mb-1.5 block text-sm font-medium text-[#293a32]">Alamat</label>
          <input id="store-address" name="address" type="text" className="min-h-11 w-full rounded-md border border-[#d9e1d9] px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20" />
        </div>
        <div>
          <label htmlFor="store-city" className="mb-1.5 block text-sm font-medium text-[#293a32]">Kota</label>
          <input id="store-city" name="city" type="text" className="min-h-11 w-full rounded-md border border-[#d9e1d9] px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20" />
        </div>
        <div>
          <label htmlFor="store-phone" className="mb-1.5 block text-sm font-medium text-[#293a32]">Nomor Telepon</label>
          <input id="store-phone" name="phone" type="tel" autoComplete="tel" className="min-h-11 w-full rounded-md border border-[#d9e1d9] px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20" />
        </div>
      </div>

      {errorMessage && <p role="alert" className="rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-3 py-2.5 text-sm text-[#9b4936]">{errorMessage}</p>}
      {successMessage && <p role="status" className="rounded-md border border-[#cfe2d0] bg-[#edf5e8] px-3 py-2.5 text-sm text-[#315d3e]">{successMessage}</p>}

      <button
        type="submit"
        disabled={isSubmitting || owners.length === 0}
        className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#285b46] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1f4938] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Menyimpan..." : "Tambah Toko Mitra"}
      </button>
    </form>
  );
}