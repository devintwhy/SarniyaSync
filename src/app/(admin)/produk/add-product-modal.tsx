"use client";

import { useRef, useState, useTransition } from "react";

type AddProductModalProps = {
  action: (formData: FormData) => Promise<{ error?: string }>;
};

export default function AddProductModal({ action }: AddProductModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function openModal() {
    setErrorMessage("");
    setSuccessMessage("");
    formRef.current?.reset();
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setErrorMessage("");

    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        setSuccessMessage("Produk berhasil ditambahkan.");
        formRef.current?.reset();
        // Tutup modal setelah 1.2 detik agar pesan sukses terlihat
        setTimeout(() => {
          closeModal();
          setSuccessMessage("");
        }, 1200);
      }
    });
  }

  return (
    <>
      {/* ── Tombol Tambah ───────────────────────────────────────────────────── */}
      <button
        type="button"
        id="btn-tambah-produk"
        onClick={openModal}
        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md bg-[#285b46] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f4938] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e9a75] focus-visible:ring-offset-2"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0"
        >
          <path
            d="M8 3.5v9M3.5 8h9"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
        Tambah Produk
      </button>

      {/* ── Dialog Modal ────────────────────────────────────────────────────── */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialogRef}
        id="modal-tambah-produk"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => {
          // Tutup jika klik backdrop
          if (e.target === dialogRef.current) closeModal();
        }}
        className="m-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#e1e7e0] bg-white p-0 shadow-2xl shadow-[#173b32]/20 backdrop:bg-[#173b32]/40 backdrop:backdrop-blur-sm open:flex open:flex-col"
        style={{ maxWidth: "38rem" }}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#edf0ec] px-6 py-5">
          <div>
            <h2
              id="modal-title"
              className="text-lg font-semibold text-[#173b32]"
            >
              Tambah Produk Baru
            </h2>
            <p className="mt-0.5 text-sm text-[#7b877f]">
              Isi detail produk untuk ditambahkan ke katalog.
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup modal"
            onClick={closeModal}
            className="rounded-md p-1.5 text-[#7b877f] transition-colors hover:bg-[#f7f9f6] hover:text-[#293a32]"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          id="form-tambah-produk"
          className="flex flex-col gap-5 px-6 py-6"
        >
          {/* Nama Produk */}
          <div>
            <label
              htmlFor="produk-name"
              className="mb-1.5 block text-sm font-medium text-[#293a32]"
            >
              Nama Produk <span className="text-[#9b4936]">*</span>
            </label>
            <input
              id="produk-name"
              name="name"
              type="text"
              required
              maxLength={160}
              autoComplete="off"
              placeholder="Contoh: Pashmina Voal Premium"
              className="min-h-10 w-full rounded-lg border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label
              htmlFor="produk-description"
              className="mb-1.5 block text-sm font-medium text-[#293a32]"
            >
              Deskripsi{" "}
              <span className="font-normal text-[#7b877f]">(opsional)</span>
            </label>
            <textarea
              id="produk-description"
              name="description"
              rows={3}
              maxLength={500}
              placeholder="Deskripsi singkat produk..."
              className="w-full resize-none rounded-lg border border-[#d9e1d9] bg-white px-3 py-2 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
            />
          </div>

          {/* Kategori + Warna */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="produk-category"
                className="mb-1.5 block text-sm font-medium text-[#293a32]"
              >
                Kategori <span className="text-[#9b4936]">*</span>
              </label>
              <select
                id="produk-category"
                name="category"
                required
                defaultValue=""
                className="min-h-10 w-full rounded-lg border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
              >
                <option value="" disabled>
                  Pilih kategori
                </option>
                <option value="Bergo">Bergo</option>
                <option value="Pashmina">Pashmina</option>
                <option value="Segi empat">Segi empat</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="produk-color"
                className="mb-1.5 block text-sm font-medium text-[#293a32]"
              >
                Warna{" "}
                <span className="font-normal text-[#7b877f]">(opsional)</span>
              </label>
              <input
                id="produk-color"
                name="color"
                type="text"
                maxLength={80}
                placeholder="Contoh: Hitam, Navy"
                className="min-h-10 w-full rounded-lg border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
              />
            </div>
          </div>

          {/* Ukuran */}
          <div>
            <label
              htmlFor="produk-size"
              className="mb-1.5 block text-sm font-medium text-[#293a32]"
            >
              Ukuran{" "}
              <span className="font-normal text-[#7b877f]">(opsional)</span>
            </label>
            <input
              id="produk-size"
              name="size"
              type="text"
              maxLength={80}
              placeholder="Contoh: All Size, 115x115 cm"
              className="min-h-10 w-full rounded-lg border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
            />
          </div>

          {/* Harga Modal + Harga Jual */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="produk-cost-price"
                className="mb-1.5 block text-sm font-medium text-[#293a32]"
              >
                Harga Modal (Rp) <span className="text-[#9b4936]">*</span>
              </label>
              <input
                id="produk-cost-price"
                name="cost_price"
                type="number"
                required
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                className="min-h-10 w-full rounded-lg border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
              />
            </div>
            <div>
              <label
                htmlFor="produk-selling-price"
                className="mb-1.5 block text-sm font-medium text-[#293a32]"
              >
                Harga Jual (Rp) <span className="text-[#9b4936]">*</span>
              </label>
              <input
                id="produk-selling-price"
                name="selling_price"
                type="number"
                required
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                className="min-h-10 w-full rounded-lg border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
              />
            </div>
          </div>

          {/* Stok Awal */}
          <div>
            <label
              htmlFor="produk-stock"
              className="mb-1.5 block text-sm font-medium text-[#293a32]"
            >
              Stok Awal (pcs) <span className="text-[#9b4936]">*</span>
            </label>
            <input
              id="produk-stock"
              name="stock_quantity"
              type="number"
              required
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="0"
              className="min-h-10 w-full rounded-lg border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none transition focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
            />
          </div>

          {/* Pesan error / sukses */}
          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg border border-[#f0d4cc] bg-[#fff5f1] px-3 py-2.5 text-sm text-[#9b4936]"
            >
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p
              role="status"
              className="rounded-lg border border-[#cfe2d0] bg-[#edf5e8] px-3 py-2.5 text-sm text-[#315d3e]"
            >
              {successMessage}
            </p>
          )}

          {/* Footer Aksi */}
          <div className="flex flex-col-reverse gap-3 border-t border-[#edf0ec] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeModal}
              disabled={isPending}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#d9e1d9] px-4 text-sm font-medium text-[#52645a] transition-colors hover:bg-[#f7f9f6] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#285b46] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1f4938] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Menyimpan..." : "Simpan Produk"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
