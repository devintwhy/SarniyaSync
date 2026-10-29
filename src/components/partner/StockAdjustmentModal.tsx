"use client";

import { useState, useTransition } from "react";
import { X, AlertCircle } from "lucide-react";
import { submitStockAdjustment } from "@/app/actions/stockAdjustment";

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  stock: number;
}

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductOption[];
  onSuccess?: () => void;
}

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  products,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Rusak Fisik / Kotor");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  function resetForm() {
    setSelectedProductId("");
    setQuantity("");
    setReason("Rusak Fisik / Kotor");
    setNotes("");
    setErrorMessage("");
  }

  function handleClose() {
    if (isPending) return;
    resetForm();
    onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    const parsedQty = parseInt(quantity, 10);
    if (!selectedProductId) {
      setErrorMessage("Silakan pilih produk yang akan disesuaikan.");
      return;
    }
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMessage("Jumlah barang harus lebih dari 0.");
      return;
    }
    if (selectedProduct && parsedQty > selectedProduct.stock) {
      setErrorMessage(
        `Jumlah melebihi stok yang tersedia (${selectedProduct.stock} unit).`
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await submitStockAdjustment({
          productId: selectedProductId,
          quantity: parsedQty,
          reason,
          notes,
        });

        if (!res.success) {
          setErrorMessage(res.message);
          return;
        }

        resetForm();
        onClose();
        if (onSuccess) onSuccess();
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Gagal menyimpan penyesuaian stok."
        );
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Formulir Penyesuaian Stok Fisik
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Pencatatan barang rusak, cacat produksi, atau selisih stok toko.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"
          >
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="modal_product"
              className="block text-xs font-semibold text-gray-700"
            >
              Pilih Produk <span className="text-rose-500">*</span>
            </label>
            <select
              id="modal_product"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
              disabled={isPending}
              className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9D5C4C] focus:ring-1 focus:ring-[#9D5C4C] disabled:bg-gray-50"
            >
              <option value="" disabled>
                -- Pilih Produk dari Inventaris --
              </option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku}) - Sisa Stok: {item.stock}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="modal_quantity"
              className="block text-xs font-semibold text-gray-700"
            >
              Jumlah Barang Berkurang <span className="text-rose-500">*</span>
            </label>
            <input
              id="modal_quantity"
              type="number"
              min="1"
              max={selectedProduct ? selectedProduct.stock : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Contoh: 3"
              required
              disabled={isPending}
              className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9D5C4C] focus:ring-1 focus:ring-[#9D5C4C] disabled:bg-gray-50"
            />
            {selectedProduct && (
              <p className="mt-1 text-[11px] text-gray-500">
                Maksimal pengurangan: {selectedProduct.stock} unit.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="modal_reason"
              className="block text-xs font-semibold text-gray-700"
            >
              Alasan Penyesuaian <span className="text-rose-500">*</span>
            </label>
            <select
              id="modal_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              disabled={isPending}
              className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9D5C4C] focus:ring-1 focus:ring-[#9D5C4C] disabled:bg-gray-50"
            >
              <option value="Rusak Fisik / Kotor">Rusak Fisik / Kotor</option>
              <option value="Cacat Pabrik (Defect)">Cacat Pabrik (Defect)</option>
              <option value="Hilang / Selisih Hitung">Hilang / Selisih Hitung</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="modal_notes"
              className="block text-xs font-semibold text-gray-700"
            >
              Catatan / Keterangan
            </label>
            <textarea
              id="modal_notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Berikan detail kondisi barang, noda, letak sobek, atau temuan audit..."
              disabled={isPending}
              className="mt-1.5 w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none transition focus:border-[#9D5C4C] focus:ring-1 focus:ring-[#9D5C4C] disabled:bg-gray-50"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="h-10 rounded-md border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending || !selectedProductId || !quantity}
              className="h-10 rounded-md bg-[#9D5C4C] px-5 text-xs font-semibold text-white transition hover:bg-[#864c3e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Menyimpan..." : "Simpan Penyesuaian"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
