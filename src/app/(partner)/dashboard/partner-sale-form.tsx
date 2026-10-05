"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { recordPartnerSale } from "../partner/actions";

type PartnerStoreOption = {
  id: string;
  name: string;
};

type PartnerStockOption = {
  storeId: string;
  productId: string;
  sku: string;
  name: string;
  stock: number;
};

type PartnerSaleFormProps = {
  stores: PartnerStoreOption[];
  inventory: PartnerStockOption[];
};

export default function PartnerSaleForm({ stores, inventory }: PartnerSaleFormProps) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [productId, setProductId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const availableProducts = inventory.filter((item) => item.storeId === storeId && item.stock > 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await recordPartnerSale({
        partnerStoreId: storeId,
        productId,
        quantity: Number(formData.get("quantity")),
        paymentMethod: String(formData.get("payment_method") ?? "cash"),
      });

      if (result.error) throw new Error(result.error);

      setSuccessMessage("Penjualan berhasil dicatat dan stok toko telah diperbarui.");
      form.reset();
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Penjualan gagal dicatat.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (stores.length === 0) {
    return <p className="px-5 py-6 text-sm text-[#68756e]">Belum ada toko aktif yang terhubung ke akun ini.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      <div>
        <label htmlFor="sale-store" className="mb-1.5 block text-sm font-medium text-[#293a32]">Toko</label>
        <select
          id="sale-store"
          value={storeId}
          onChange={(event) => {
            setStoreId(event.target.value);
            setProductId("");
          }}
          required
          className="min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
        >
          {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="sale-product" className="mb-1.5 block text-sm font-medium text-[#293a32]">Produk</label>
        <select
          id="sale-product"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          required
          disabled={availableProducts.length === 0}
          className="min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20 disabled:bg-[#f7f9f6]"
        >
          <option value="">{availableProducts.length ? "Pilih produk" : "Tidak ada stok tersedia"}</option>
          {availableProducts.map((product) => (
            <option key={product.productId} value={product.productId}>
              {product.sku} · {product.name} · sisa {product.stock}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sale-quantity" className="mb-1.5 block text-sm font-medium text-[#293a32]">Jumlah Terjual</label>
          <input
            id="sale-quantity"
            name="quantity"
            type="number"
            min="1"
            step="1"
            required
            inputMode="numeric"
            className="min-h-11 w-full rounded-md border border-[#d9e1d9] px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
          />
        </div>
        <div>
          <label htmlFor="sale-payment" className="mb-1.5 block text-sm font-medium text-[#293a32]">Pembayaran</label>
          <select
            id="sale-payment"
            name="payment_method"
            defaultValue="cash"
            className="min-h-11 w-full rounded-md border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
          >
            <option value="cash">Tunai</option>
            <option value="transfer">Transfer</option>
            <option value="qris">QRIS</option>
          </select>
        </div>
      </div>

      {errorMessage && <p role="alert" className="rounded-md border border-[#f0d4cc] bg-[#fff5f1] px-3 py-2.5 text-sm text-[#9b4936]">{errorMessage}</p>}
      {successMessage && <p role="status" className="rounded-md border border-[#cfe2d0] bg-[#edf5e8] px-3 py-2.5 text-sm text-[#315d3e]">{successMessage}</p>}

      <button
        type="submit"
        disabled={isSubmitting || availableProducts.length === 0}
        className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#285b46] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1f4938] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Menyimpan transaksi..." : "Catat Penjualan"}
      </button>
    </form>
  );
}