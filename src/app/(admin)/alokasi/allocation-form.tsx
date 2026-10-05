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
    <form onSubmit={handleSubmit} className="space-y-5 p-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="allocation-store" className="mb-1.5 block text-sm font-medium text-[#293a32]">Pilih Toko Mitra</label>
          <select
            id="allocation-store"
            value={storeId}
            onChange={(event) => setStoreId(event.target.value)}
            required
            disabled={!stores.length}
            className="min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20 disabled:bg-[#f7f9f6]"
          >
            {stores.length ? stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            )) : <option value="">Belum ada toko mitra aktif</option>}
          </select>
        </div>

        <div>
          <label htmlFor="allocation-product" className="mb-1.5 block text-sm font-medium text-[#293a32]">Pilih Produk</label>
          <select
            id="allocation-product"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            required
            disabled={!products.length}
            className="min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20 disabled:bg-[#f7f9f6]"
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
        <label htmlFor="allocation-quantity" className="mb-1.5 block text-sm font-medium text-[#293a32]">
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
          className="min-h-11 w-full rounded-md border border-[#d9e1d9] px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
        />
      </div>

      {errorMessage && <p role="alert" className="rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-3 py-2.5 text-sm text-[#9b4936]">{errorMessage}</p>}
      {successMessage && <p role="status" className="rounded-md border border-[#cfe2d0] bg-[#edf5e8] px-3 py-2.5 text-sm text-[#315d3e]">{successMessage}</p>}

      <button
        type="submit"
        disabled={isSubmitting || stores.length === 0 || products.length === 0}
        className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#285b46] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1f4938] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Mengalokasikan..." : "Alokasikan Stok"}
      </button>
    </form>
  );
}