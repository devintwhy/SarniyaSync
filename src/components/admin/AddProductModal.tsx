"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addProduct, type ProductActionResult } from "@/app/actions/productActions";

export type AddProductModalProps = {
  triggerText?: string;
  triggerClassName?: string;
  showTrigger?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  action?: (formData: FormData) => Promise<ProductActionResult>;
};

export default function AddProductModal({
  triggerText = "Tambah Produk",
  triggerClassName,
  showTrigger = true,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onSuccess,
  action = addProduct,
}: AddProductModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  function handleOpen() {
    setErrorMessage("");
    setSuccessMessage("");
    setSelectedFileName("");
    formRef.current?.reset();
    setInternalIsOpen(true);
  }

  function handleClose() {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
    setErrorMessage("");
    setSuccessMessage("");
    setSelectedFileName("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        setSuccessMessage("Produk berhasil ditambahkan ke katalog.");
        formElement.reset();
        setSelectedFileName("");
        if (onSuccess) {
          onSuccess();
        }
        setTimeout(() => {
          handleClose();
        }, 900);
      }
    });
  }

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={handleOpen}
          className={
            triggerClassName ||
            "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.99]"
          }
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>{triggerText}</span>
        </button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-product-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) {
              handleClose();
            }
          }}
        >
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <h2 id="modal-add-product-title" className="text-lg font-semibold text-gray-800">
                  Tambah Produk Baru
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Isi informasi spesifikasi produk dan stok pusat.
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup modal"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
              <div>
                <label htmlFor="produk-name" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-600">
                  Nama Produk <span className="text-red-500">*</span>
                </label>
                <input
                  id="produk-name"
                  name="name"
                  type="text"
                  required
                  maxLength={160}
                  autoComplete="off"
                  placeholder="Contoh: Pashmina Silk Premium"
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9d5c4c] focus:ring-2 focus:ring-[#9d5c4c]/20"
                />
              </div>

              <div>
                <label htmlFor="produk-sku" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-600">
                  SKU / Kode Produk <span className="text-[11px] font-normal normal-case text-gray-400">(opsional, dibuat otomatis jika kosong)</span>
                </label>
                <input
                  id="produk-sku"
                  name="sku"
                  type="text"
                  maxLength={80}
                  placeholder="Contoh: PSH-SLK-01"
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9d5c4c] focus:ring-2 focus:ring-[#9d5c4c]/20"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="produk-category" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-600">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="produk-category"
                    name="category"
                    required
                    defaultValue=""
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9d5c4c] focus:ring-2 focus:ring-[#9d5c4c]/20"
                  >
                    <option value="" disabled>Pilih kategori</option>
                    <option value="Bergo">Bergo</option>
                    <option value="Pashmina">Pashmina</option>
                    <option value="Segi empat">Segi empat</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="produk-stock" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-600">
                    Stok Awal (pcs) <span className="text-red-500">*</span>
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
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9d5c4c] focus:ring-2 focus:ring-[#9d5c4c]/20"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="produk-color" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-600">
                    Warna <span className="text-[11px] font-normal normal-case text-gray-400">(opsional)</span>
                  </label>
                  <input
                    id="produk-color"
                    name="color"
                    type="text"
                    maxLength={80}
                    placeholder="Contoh: Maroon, Mocca"
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9d5c4c] focus:ring-2 focus:ring-[#9d5c4c]/20"
                  />
                </div>
                <div>
                  <label htmlFor="produk-size" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-600">
                    Ukuran <span className="text-[11px] font-normal normal-case text-gray-400">(opsional)</span>
                  </label>
                  <input
                    id="produk-size"
                    name="size"
                    type="text"
                    maxLength={80}
                    placeholder="Contoh: All Size, 180x75 cm"
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9d5c4c] focus:ring-2 focus:ring-[#9d5c4c]/20"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="produk-cost-price" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-600">
                    Harga Modal (Rp) <span className="text-red-500">*</span>
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
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9d5c4c] focus:ring-2 focus:ring-[#9d5c4c]/20"
                  />
                </div>
                <div>
                  <label htmlFor="produk-selling-price" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-600">
                    Harga Jual (Rp) <span className="text-red-500">*</span>
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
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9d5c4c] focus:ring-2 focus:ring-[#9d5c4c]/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="produk-description" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-600">
                  Deskripsi <span className="text-[11px] font-normal normal-case text-gray-400">(opsional)</span>
                </label>
                <textarea
                  id="produk-description"
                  name="description"
                  rows={2}
                  maxLength={500}
                  placeholder="Keterangan bahan, detail spesifikasi produk..."
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none transition focus:border-[#9d5c4c] focus:ring-2 focus:ring-[#9d5c4c]/20"
                />
              </div>

              <div>
                <label htmlFor="produk-image" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-600">
                  Foto Produk <span className="text-[11px] font-normal normal-case text-gray-400">(opsional, maks. 5 MB)</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="produk-image"
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setSelectedFileName(e.target.files?.[0]?.name || "")}
                    className="block w-full rounded-lg border border-gray-300 bg-white text-xs text-gray-600 file:mr-3 file:rounded-l-md file:border-0 file:bg-gray-100 file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {selectedFileName && (
                    <span className="absolute right-3 text-xs text-gray-500 pointer-events-none truncate max-w-[150px]">
                      {selectedFileName}
                    </span>
                  )}
                </div>
              </div>

              {errorMessage && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                  {successMessage}
                </div>
              )}

              <div className="mt-2 flex flex-col-reverse gap-2.5 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-xs sm:text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

