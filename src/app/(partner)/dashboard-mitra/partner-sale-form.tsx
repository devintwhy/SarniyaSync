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
    return <p className="px-5 py-6 text-sm text-gray-500">Belum ada toko aktif yang terhubung ke akun ini.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      <div>
        <label htmlFor="sale-store" className="mb-1.5 block text-xs sm:text-sm font-semibold text-gray-900">Toko</label>
        <select
          id="sale-store"
          value={storeId}
          onChange={(event) => {
            setStoreId(event.target.value);
            setProductId("");
          }}
          required
          className="min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs sm:text-sm text-gray-900 outline-none focus:border-terracotta-clay focus:ring-2 focus:ring-terracotta-clay/20"
        >
          {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="sale-product" className="mb-1.5 block text-xs sm:text-sm font-semibold text-gray-900">Produk</label>
        <select
          id="sale-product"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          required
          disabled={availableProducts.length === 0}
          className="min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs sm:text-sm text-gray-900 outline-none focus:border-terracotta-clay focus:ring-2 focus:ring-terracotta-clay/20 disabled:bg-gray-50"
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
          <label htmlFor="sale-quantity" className="mb-1.5 block text-xs sm:text-sm font-semibold text-gray-900">Jumlah Terjual</label>
          <input
            id="sale-quantity"
            name="quantity"
            type="number"
            min="1"
            step="1"
            required
            inputMode="numeric"
            className="min-h-10 w-full rounded-lg border border-gray-200 px-3 text-xs sm:text-sm text-gray-900 outline-none focus:border-terracotta-clay focus:ring-2 focus:ring-terracotta-clay/20"
          />
        </div>
        <div>
          <label htmlFor="sale-payment" className="mb-1.5 block text-xs sm:text-sm font-semibold text-gray-900">Pembayaran</label>
          <select
            id="sale-payment"
            name="payment_method"
            defaultValue="cash"
            className="min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs sm:text-sm text-gray-900 outline-none focus:border-terracotta-clay focus:ring-2 focus:ring-terracotta-clay/20"
          >
            <option value="cash">Tunai</option>
            <option value="transfer">Transfer</option>
            <option value="qris">QRIS</option>
          </select>
        </div>
      </div>

      {errorMessage && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs sm:text-sm text-rose-800">{errorMessage}</p>}
      {successMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs sm:text-sm text-emerald-800">{successMessage}</p>}

      <button
        type="submit"
        disabled={isSubmitting || availableProducts.length === 0}
        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-terracotta-clay px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Menyimpan transaksi..." : "Catat Penjualan"}
      </button>
    </form>
  );
}
