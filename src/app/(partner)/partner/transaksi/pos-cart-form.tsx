"use client";

import { useState, useTransition, useId, useRef } from "react";
import { recordCartTransaction, type CartItemInput } from "../cart-actions";
import ThermalReceipt, { type ReceiptData } from "@/components/receipt";

// ── Tipe lokal ─────────────────────────────────────────────────────────────────
type StoreOption = { id: string; name: string };

type InventoryOption = {
  storeId: string;
  allocationId: string;
  productId: string;
  sku: string;
  name: string;
  sellingPrice: number;
  stock: number;
};

type CartRow = CartItemInput & {
  rowId: string; // kunci unik per baris keranjang
  productName: string;
  price: number;
  subtotal: number;
};

type PosCartFormProps = {
  stores: StoreOption[];
  inventory: InventoryOption[];
};

// ── Helper format Rupiah ───────────────────────────────────────────────────────
const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

// ── Komponen Utama ─────────────────────────────────────────────────────────────
export default function PosCartForm({ stores, inventory }: PosCartFormProps) {
  const uid = useId();

  // ── State form pemilihan produk ────────────────────────────────────────────
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [selectedAllocId, setSelectedAllocId] = useState("");
  const [qty, setQty] = useState(1);

  // ── State keranjang belanja ────────────────────────────────────────────────
  const [cart, setCart] = useState<CartRow[]>([]);

  // ── State metode pembayaran ────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // ── State feedback & Receipt ────────────────────────────────────────────────
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Produk tersedia untuk toko yang dipilih ────────────────────────────────
  const availableForStore = inventory.filter(
    (item) => item.storeId === storeId && item.stock > 0,
  );

  const selectedItem = availableForStore.find(
    (item) => item.allocationId === selectedAllocId,
  );

  // Stok sisa = stok DB dikurangi qty yang sudah ada di keranjang
  const stockInCart = cart
    .filter((row) => row.allocationId === selectedAllocId)
    .reduce((sum, row) => sum + row.quantity, 0);
  const availableQty = (selectedItem?.stock ?? 0) - stockInCart;

  // ── Grand total ────────────────────────────────────────────────────────────
  const grandTotal = cart.reduce((sum, row) => sum + row.subtotal, 0);

  // ── Handler: ganti toko → reset keranjang ─────────────────────────────────
  function handleStoreChange(newStoreId: string) {
    setStoreId(newStoreId);
    setSelectedAllocId("");
    setQty(1);
    setCart([]);
    setErrorMessage("");
    setSuccessMessage("");
    setLastReceipt(null);
  }

  // ── Handler: Tambah ke keranjang ──────────────────────────────────────────
  function handleAddToCart() {
    if (!selectedItem) return;
    if (qty < 1 || !Number.isFinite(qty)) return;
    if (qty > availableQty) {
      setErrorMessage(
        `Stok tidak cukup untuk "${selectedItem.name}". Tersedia ${availableQty} unit.`,
      );
      return;
    }
    setErrorMessage("");

    const existing = cart.findIndex(
      (row) => row.allocationId === selectedItem.allocationId,
    );

    if (existing !== -1) {
      // Update qty baris yang sudah ada
      setCart((prev) =>
        prev.map((row, i) =>
          i === existing
            ? {
                ...row,
                quantity: row.quantity + qty,
                subtotal: (row.quantity + qty) * row.price,
              }
            : row,
        ),
      );
    } else {
      const newRow: CartRow = {
        rowId: `${selectedItem.allocationId}-${Date.now()}`,
        allocationId: selectedItem.allocationId,
        productId: selectedItem.productId,
        productName: selectedItem.name,
        price: selectedItem.sellingPrice,
        quantity: qty,
        subtotal: qty * selectedItem.sellingPrice,
      };
      setCart((prev) => [...prev, newRow]);
    }

    // Reset input produk & jumlah
    setSelectedAllocId("");
    setQty(1);
  }

  // ── Handler: Hapus baris dari keranjang ───────────────────────────────────
  function handleRemoveRow(rowId: string) {
    setCart((prev) => prev.filter((row) => row.rowId !== rowId));
  }

  // ── Handler: Update jumlah langsung di tabel keranjang ────────────────────
  function handleQtyChange(rowId: string, newQty: number) {
    setCart((prev) =>
      prev.flatMap((row) => {
        if (row.rowId !== rowId) return [row];
        if (newQty < 1) return []; // hapus baris jika qty = 0
        // Hitung stok tersedia untuk baris ini
        const otherInCart = cart
          .filter((r) => r.allocationId === row.allocationId && r.rowId !== rowId)
          .reduce((sum, r) => sum + r.quantity, 0);
        const dbStock =
          inventory.find((inv) => inv.allocationId === row.allocationId)?.stock ?? 0;
        const maxQty = dbStock - otherInCart;
        const clampedQty = Math.min(newQty, maxQty);
        return [{ ...row, quantity: clampedQty, subtotal: clampedQty * row.price }];
      }),
    );
  }

  // ── Handler: Proses Transaksi ──────────────────────────────────────────────
  function handleSubmit() {
    if (cart.length === 0) return;
    setErrorMessage("");
    setSuccessMessage("");
    setLastReceipt(null);

    // Siapkan data untuk receipt jika sukses
    const storeName = stores.find((s) => s.id === storeId)?.name ?? "Toko Mitra";
    const receiptItems = cart.map((r) => ({
      name: r.productName,
      qty: r.quantity,
      price: r.price,
      subtotal: r.subtotal,
    }));
    const total = grandTotal;
    const payment = paymentMethod;

    startTransition(async () => {
      const result = await recordCartTransaction({
        partnerStoreId: storeId,
        paymentMethod,
        items: cart.map((row) => ({
          allocationId: row.allocationId,
          productId: row.productId,
          productName: row.productName,
          price: row.price,
          quantity: row.quantity,
        })),
      });

      if (result.error) {
        setErrorMessage(result.error);
      } else {
        const txId = result.transactionId?.slice(0, 8).toUpperCase() ?? "UNKNOWN";
        setSuccessMessage(
          `Transaksi berhasil! ID: ${txId} — Stok toko telah diperbarui.`,
        );
        
        setLastReceipt({
          storeName,
          transactionNumber: txId,
          date: new Date().toLocaleString("id-ID"),
          paymentMethod: payment,
          items: receiptItems,
          grandTotal: total,
        });

        setCart([]);
        setSelectedAllocId("");
        setQty(1);
      }
    });
  }

  if (stores.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-[#68756e]">
        Belum ada toko aktif yang terhubung ke akun ini.
      </p>
    );
  }

  // =========================================================================
  return (
    <div className="divide-y divide-[#edf0ec]">
      {/* ── Bagian 1: Pilih Toko ─────────────────────────────────────────── */}
      <div className="p-5">
        <label
          htmlFor={`${uid}-store`}
          className="mb-1.5 block text-sm font-medium text-[#293a32]"
        >
          Toko
        </label>
        <select
          id={`${uid}-store`}
          value={storeId}
          onChange={(e) => handleStoreChange(e.target.value)}
          disabled={isPending}
          className="min-h-10 w-full max-w-sm rounded-lg border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
        >
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Bagian 2: Form Tambah Item ───────────────────────────────────── */}
      <div className="bg-[#fafbf9] p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#557b64]">
          Tambah Item ke Keranjang
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* Dropdown Produk */}
          <div className="min-w-0 flex-1">
            <label
              htmlFor={`${uid}-product`}
              className="mb-1.5 block text-sm font-medium text-[#293a32]"
            >
              Produk
            </label>
            <select
              id={`${uid}-product`}
              value={selectedAllocId}
              onChange={(e) => {
                setSelectedAllocId(e.target.value);
                setQty(1);
                setErrorMessage("");
              }}
              disabled={availableForStore.length === 0 || isPending}
              className="min-h-10 w-full rounded-lg border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20 disabled:bg-[#f0f3f1]"
            >
              <option value="">
                {availableForStore.length
                  ? "Pilih produk..."
                  : "Tidak ada stok tersedia"}
              </option>
              {availableForStore.map((item) => {
                const inCart = cart
                  .filter((r) => r.allocationId === item.allocationId)
                  .reduce((s, r) => s + r.quantity, 0);
                const sisa = item.stock - inCart;
                return (
                  <option
                    key={item.allocationId}
                    value={item.allocationId}
                    disabled={sisa <= 0}
                  >
                    {item.sku} · {item.name} · sisa {sisa} · {idr.format(item.sellingPrice)}
                  </option>
                );
              })}
            </select>
            {selectedItem && (
              <p className="mt-1 text-xs text-[#557b64]">
                Stok tersedia: <strong>{availableQty}</strong> unit ·{" "}
                {idr.format(selectedItem.sellingPrice)} / pcs
              </p>
            )}
          </div>

          {/* Input Jumlah */}
          <div className="sm:w-28">
            <label
              htmlFor={`${uid}-qty`}
              className="mb-1.5 block text-sm font-medium text-[#293a32]"
            >
              Jumlah
            </label>
            <input
              id={`${uid}-qty`}
              type="number"
              min={1}
              max={availableQty || 1}
              step={1}
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              disabled={!selectedItem || isPending}
              className="min-h-10 w-full rounded-lg border border-[#d9e1d9] px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20 disabled:bg-[#f0f3f1]"
            />
          </div>

          {/* Tombol Tambah */}
          <button
            type="button"
            id={`${uid}-add-btn`}
            onClick={handleAddToCart}
            disabled={!selectedItem || qty < 1 || availableQty < 1 || isPending}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-[#285b46] bg-[#285b46] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1f4938] disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M7 2v10M2 7h10"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
            Tambah
          </button>
        </div>
      </div>

      {/* ── Bagian 3: Tabel Keranjang ────────────────────────────────────── */}
      <div>
        <div className="border-b border-[#edf0ec] px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#557b64]">
            Keranjang Belanja
            {cart.length > 0 && (
              <span className="ml-2 rounded-full bg-[#285b46] px-2 py-0.5 text-xs font-bold text-white">
                {cart.length}
              </span>
            )}
          </p>
        </div>

        {cart.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-[#7b877f]">
              Keranjang masih kosong. Tambahkan produk di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-[#f7f9f6] text-xs uppercase tracking-wide text-[#68756e]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Produk
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Harga Satuan
                  </th>
                  <th scope="col" className="px-5 py-3 text-center font-medium">
                    Jumlah
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Subtotal
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    <span className="sr-only">Hapus</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ec]">
                {cart.map((row) => (
                  <tr key={row.rowId} className="transition-colors hover:bg-[#fafbf9]">
                    {/* Nama Produk */}
                    <td className="px-5 py-3.5 font-medium text-[#293a32]">
                      {row.productName}
                    </td>

                    {/* Harga Satuan */}
                    <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-[#52645a]">
                      {idr.format(row.price)}
                    </td>

                    {/* Input Jumlah inline */}
                    <td className="px-5 py-3.5 text-center">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={row.quantity}
                        onChange={(e) =>
                          handleQtyChange(row.rowId, Number(e.target.value))
                        }
                        disabled={isPending}
                        aria-label={`Jumlah ${row.productName}`}
                        className="w-16 rounded-md border border-[#d9e1d9] px-2 py-1 text-center text-sm tabular-nums text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
                      />
                    </td>

                    {/* Subtotal */}
                    <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums font-semibold text-[#293a32]">
                      {idr.format(row.subtotal)}
                    </td>

                    {/* Hapus */}
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.rowId)}
                        disabled={isPending}
                        aria-label={`Hapus ${row.productName} dari keranjang`}
                        className="rounded-md p-1 text-[#9b4936] opacity-60 transition-opacity hover:opacity-100 disabled:cursor-not-allowed"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 4h10M6 4V3h4v1M5 4l.5 8.5h5L11 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Ringkasan Total ──────────────────────────────────────────── */}
        {cart.length > 0 && (
          <div className="border-t border-[#edf0ec] bg-[#f7f9f6] px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#52645a]">
                {cart.reduce((s, r) => s + r.quantity, 0)} item
              </span>
              <div className="text-right">
                <p className="text-xs text-[#7b877f]">Grand Total</p>
                <p className="text-xl font-bold tabular-nums text-[#173b32]">
                  {idr.format(grandTotal)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bagian 4: Metode Pembayaran & Submit ─────────────────────────── */}
      <div className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {/* Metode Pembayaran */}
          <div className="sm:w-56">
            <label
              htmlFor={`${uid}-payment`}
              className="mb-1.5 block text-sm font-medium text-[#293a32]"
            >
              Metode Pembayaran
            </label>
            <select
              id={`${uid}-payment`}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={isPending}
              className="min-h-10 w-full rounded-lg border border-[#d9e1d9] bg-white px-3 text-sm text-[#293a32] outline-none focus:border-[#6e9a75] focus:ring-2 focus:ring-[#6e9a75]/20"
            >
              <option value="cash">Tunai</option>
              <option value="transfer">Transfer</option>
              <option value="qris">QRIS</option>
            </select>
          </div>

          {/* Tombol Proses */}
          <button
            type="button"
            id={`${uid}-submit-btn`}
            onClick={handleSubmit}
            disabled={cart.length === 0 || isPending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#285b46] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1f4938] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Memproses...
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 8l4 4 8-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Proses Transaksi
                {cart.length > 0 && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    {idr.format(grandTotal)}
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* Pesan Error */}
        {errorMessage && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-[#f0d4cc] bg-[#fff5f1] px-4 py-3 text-sm text-[#9b4936]"
          >
            {errorMessage}
          </p>
        )}
      </div>

      {/* ── 5. Modal Keberhasilan & Struk ──────────────────────────────────── */}
      {successMessage && lastReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#173b32]/40 backdrop-blur-sm print:hidden">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-[#cfe2d0] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[#edf5e8]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#315d3e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#173b32]">Transaksi Berhasil!</h3>
            <p className="text-sm text-[#52645a]">{successMessage}</p>
            
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#285b46] px-4 font-semibold text-white transition hover:bg-[#1f4938]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Cetak Struk
              </button>
              <button
                type="button"
                onClick={() => setSuccessMessage("")}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d9e1d9] px-4 font-medium text-[#52645a] transition hover:bg-[#f7f9f6]"
              >
                Tutup & Lanjut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Komponen Struk Kasir (Khusus Print) */}
      <ThermalReceipt data={lastReceipt} />
    </div>
  );
}
