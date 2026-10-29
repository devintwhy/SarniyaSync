"use client";

import { useState, useTransition } from "react";
import { submitStockAdjustment } from "@/app/actions/stockAction";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
}

interface StockAdjustmentFormProps {
  products: ProductOption[];
  mitraId: string;
}

const REASON_OPTIONS = [
  { value: "Rusak Fisik / Kotor", label: "Rusak Fisik / Kotor" },
  { value: "Cacat Pabrik (Defect)", label: "Cacat Pabrik (Defect)" },
  { value: "Hilang / Selisih Hitung", label: "Hilang / Selisih Hitung" },
];

export default function StockAdjustmentForm({
  products,
  mitraId,
}: StockAdjustmentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState(REASON_OPTIONS[0].value);
  const [notes, setNotes] = useState("");

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback({ type: null, message: "" });

    const formData = new FormData();
    formData.append("productId", selectedProductId);
    formData.append("mitraId", mitraId);
    formData.append("quantity", quantity);
    formData.append("reason", reason);
    formData.append("notes", notes);

    startTransition(async () => {
      const res = await submitStockAdjustment(formData);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        setQuantity("");
        setNotes("");
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    });
  }

  return (
    <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 border-b border-gray-100 pb-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Formulir Stock Opname
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Catat pengurangan stok fisik akibat barang rusak, hilang, atau
          kedaluwarsa.
        </p>
      </div>

      {feedback.type && (
        <div
          role="alert"
          className={`mb-5 rounded-lg border px-4 py-3 text-xs font-medium ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="product_select"
            className="block text-xs font-semibold text-gray-700"
          >
            Pilih Produk <span className="text-rose-500">*</span>
          </label>
          <select
            id="product_select"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            required
            disabled={isPending}
            className="mt-1.5 block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9D5C4C] focus:ring-1 focus:ring-[#9D5C4C] disabled:bg-gray-100"
          >
            <option value="" disabled>
              -- Pilih Produk Terdaftar --
            </option>
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.sku}) - Stok Sistem: {item.currentStock}
              </option>
            ))}
          </select>
          {selectedProduct && (
            <p className="mt-1 text-[11px] text-gray-500">
              Sisa stok tercatat saat ini:{" "}
              <span className="font-semibold text-gray-800">
                {selectedProduct.currentStock} unit
              </span>
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="quantity_input"
            className="block text-xs font-semibold text-gray-700"
          >
            Jumlah Barang Hilang / Rusak <span className="text-rose-500">*</span>
          </label>
          <input
            id="quantity_input"
            type="number"
            min="1"
            max={selectedProduct ? selectedProduct.currentStock : undefined}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Masukkan kuantitas fisik (misal: 2)"
            required
            disabled={isPending}
            className="mt-1.5 block h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-[#9D5C4C] focus:ring-1 focus:ring-[#9D5C4C] disabled:bg-gray-100"
          />
        </div>

        <div>
          <label
            htmlFor="reason_select"
            className="block text-xs font-semibold text-gray-700"
          >
            Alasan Penyesuaian <span className="text-rose-500">*</span>
          </label>
          <select
            id="reason_select"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            disabled={isPending}
            className="mt-1.5 block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#9D5C4C] focus:ring-1 focus:ring-[#9D5C4C] disabled:bg-gray-100"
          >
            {REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="notes_input"
            className="block text-xs font-semibold text-gray-700"
          >
            Catatan Tambahan
          </label>
          <textarea
            id="notes_input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tuliskan keterangan detail kondisi barang atau bukti fisik..."
            disabled={isPending}
            className="mt-1.5 block w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 outline-none transition focus:border-[#9D5C4C] focus:ring-1 focus:ring-[#9D5C4C] disabled:bg-gray-100"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || !selectedProductId || !quantity}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#9D5C4C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#864c3e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Menyimpan Data..." : "Simpan Penyesuaian Stok"}
        </button>
      </form>
    </div>
  );
}

