"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { allocatePartnerStock } from "./actions";

type AllocationOption = {
  id: string;
  name: string;
};

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  stock_quantity: number;
};

type AllocationFormProps = {
  stores: AllocationOption[];
  products: ProductOption[];
};

export default function AllocationForm({ stores, products }: AllocationFormProps) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [productId, setProductId] = useState("");
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
      const result = await allocatePartnerStock({
        storeId,
        productId,
        quantity: Number(formData.get("quantity")),
      });

      if (result.error) throw new Error(result.error);

      setSuccessMessage("Stok berhasil dialokasikan ke toko mitra.");
      setProductId("");
      form.reset();
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Alokasi stok gagal.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="allocation-store" className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#576071]">
            Pilih Toko Mitra
          </label>
          <select
            id="allocation-store"
            value={storeId}
            onChange={(event) => setStoreId(event.target.value)}
            required
            disabled={!stores.length}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm font-medium text-[#2d3440] outline-none transition-all focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25 disabled:bg-slate-50"
          >
            {stores.length ? stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            )) : <option value="">Belum ada toko mitra aktif</option>}
          </select>
        </div>

        <div>
          <label htmlFor="allocation-product" className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#576071]">
            Pilih Produk
          </label>
          <select
            id="allocation-product"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            required
            disabled={!products.length}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm font-medium text-[#2d3440] outline-none transition-all focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25 disabled:bg-slate-50"
          >
            <option value="">{products.length ? "Pilih produk" : "Tidak ada stok pusat tersedia"}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.sku} · {product.name} · tersedia {product.stock_quantity}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-w-xs">
        <label htmlFor="allocation-quantity" className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#576071]">
          Jumlah yang Dikirim/Dialokasikan
        </label>
        <input
          id="allocation-quantity"
          name="quantity"
          type="number"
          min="1"
          step="1"
          required
          inputMode="numeric"
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm font-medium text-[#2d3440] outline-none transition-all focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
        />
      </div>

      {errorMessage && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-600">{errorMessage}</p>}
      {successMessage && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs sm:text-sm text-emerald-700">{successMessage}</p>}

      <button
        type="submit"
        disabled={isSubmitting || stores.length === 0 || products.length === 0}
        className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Mengalokasikan..." : "Alokasikan Stok"}
      </button>
    </form>
  );
}