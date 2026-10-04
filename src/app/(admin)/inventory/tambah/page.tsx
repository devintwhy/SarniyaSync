"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadProductImage } from "@/utils/supabase/upload-product-image";

type CreateProductResponse = {
  error?: string;
};

export default function AddProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const image = formData.get("image");
    formData.delete("image");
    const payload = Object.fromEntries(formData.entries()) as Record<string, string>;

    try {
      if (image instanceof File && image.size > 0) {
        setIsUploading(true);
        payload.image_url = await uploadProductImage(image);
        setIsUploading(false);
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as CreateProductResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Produk gagal disimpan.");
      }

      window.sessionStorage.setItem("inventory-product-added", "true");
      router.push("/inventory");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan produk.",
      );
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="mb-8">
        <Link
          href="/inventory"
          className="mb-5 inline-flex text-sm font-medium text-[#557b64] hover:text-[#285b46]"
        >
          &larr; Kembali ke inventaris
        </Link>
        <p className="mb-2 text-sm font-medium text-[#557b64]">Area Owner</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#173b32]">Tambah Produk</h1>
        <p className="mt-2 text-sm text-[#68756e]">Masukkan detail produk baru ke katalog.</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-md border border-[#e1e7e0] bg-white p-5 shadow-sm shadow-[#173b32]/5 sm:p-7"
      >
        <div>
          <label htmlFor="sku" className="mb-2 block text-sm font-medium text-[#293a32]">
            SKU <span className="font-normal text-[#7b877f]">(opsional)</span>
          </label>
          <input
            id="sku"
            name="sku"
            type="text"
            maxLength={80}
            placeholder="Kosongkan untuk dibuat otomatis"
            className="min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
          />
          <p className="mt-1.5 text-xs text-[#7b877f]">Anda juga dapat mengisi SKU sendiri.</p>
        </div>

        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-[#293a32]">
            Nama Produk
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={160}
            autoComplete="off"
            className="min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="mb-2 block text-sm font-medium text-[#293a32]">
              Kategori
            </label>
            <select
              id="category"
              name="category"
              required
              defaultValue=""
              className="min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
            >
              <option value="" disabled>Pilih kategori</option>
              <option value="Pashmina">Pashmina</option>
              <option value="Segi empat">Segi empat</option>
              <option value="Bergo">Bergo</option>
            </select>
          </div>

          <div>
            <label htmlFor="stock_quantity" className="mb-2 block text-sm font-medium text-[#293a32]">
              Stok
            </label>
            <input
              id="stock_quantity"
              name="stock_quantity"
              type="number"
              required
              min="0"
              step="1"
              inputMode="numeric"
              className="min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="cost_price" className="mb-2 block text-sm font-medium text-[#293a32]">
              Harga Modal (Rp)
            </label>
            <input
              id="cost_price"
              name="cost_price"
              type="number"
              required
              min="0"
              step="1"
              inputMode="numeric"
              className="min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
            />
          </div>
          <div>
            <label htmlFor="selling_price" className="mb-2 block text-sm font-medium text-[#293a32]">
              Harga Jual (Rp)
            </label>
            <input
              id="selling_price"
              name="selling_price"
              type="number"
              required
              min="0"
              step="1"
              inputMode="numeric"
              className="min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="image" className="mb-2 block text-sm font-medium text-[#293a32]">
            Foto Produk <span className="font-normal text-[#7b877f]">(opsional, maks. 5 MB)</span>
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setSelectedImageName(event.target.files?.[0]?.name ?? "")}
            className="block min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white text-sm text-[#52645a] file:mr-4 file:min-h-10 file:border-0 file:border-r file:border-[#d9e1d9] file:bg-[#f7f9f6] file:px-3 file:text-sm file:font-medium file:text-[#315d3e]"
          />
          {selectedImageName && <p className="mt-1.5 text-xs text-[#68756e]">{selectedImageName}</p>}
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-3 py-2.5 text-sm text-[#9b4936]">
            {errorMessage}
          </p>
        )}
        {isUploading && (
          <p role="status" className="text-sm text-[#557b64]">Mengunggah foto produk ke Storage...</p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-[#edf0ec] pt-5 sm:flex-row sm:justify-end">
          <Link
            href="/inventory"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#d9e1d9] px-4 text-sm font-medium text-[#52645a] transition-colors hover:bg-[#f7f9f6]"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#285b46] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1f4938] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Mengunggah foto..." : isSubmitting ? "Menyimpan..." : "Simpan Produk"}
          </button>
        </div>
      </form>
    </div>
  );
}