"use client";

import { useState, useTransition, useId, useMemo } from "react";
import Image from "next/image";
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
  imageUrl?: string | null;
};

type CartRow = CartItemInput & {
  rowId: string; // Kunci unik per baris
  productName: string;
  sku: string;
  price: number;
  subtotal: number;
  imageUrl?: string | null;
  maxStock: number;
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

export default function PosCartForm({ stores, inventory }: PosCartFormProps) {
  const uid = useId();

  // ── State Toko Aktif ────────────────────────────────────────────────────────
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");

  // ── State Pencarian Produk & Filter ─────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── State Keranjang Belanja ────────────────────────────────────────────────
  const [cart, setCart] = useState<CartRow[]>([]);

  // ── State Metode Pembayaran & Tunai ────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "qris">("cash");
  const [cashReceivedInput, setCashReceivedInput] = useState<string>("");

  // ── State Interaksi Klik Kartu (Animasi Inset Neumorphism) ──────────────────
  const [pressedCardId, setPressedCardId] = useState<string | null>(null);

  // ── State Feedback & Receipt Modal ──────────────────────────────────────────
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [isPending, startTransition] = useTransition();

  // Neumorphism Box Shadow Presets dari halaman Login
  const neuInputInset = {
    boxShadow:
      "inset 5px 5px 10px rgba(163, 177, 198, 0.7), inset -5px -5px 10px rgba(255, 255, 255, 0.85)",
  };

  const neuButtonRaised = {
    boxShadow:
      "8px 8px 18px rgba(163, 177, 198, 0.6), -8px -8px 18px rgba(255, 255, 255, 0.9)",
  };

  const neuTagRaised = {
    boxShadow:
      "4px 4px 10px rgba(163, 177, 198, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.8)",
  };

  const neuPressed = {
    boxShadow:
      "inset 4px 4px 8px rgba(163, 177, 198, 0.7), inset -4px -4px 8px rgba(255, 255, 255, 0.85)",
  };

  // ── Produk untuk toko yang dipilih ─────────────────────────────────────────
  const availableForStore = useMemo(() => {
    return inventory.filter((item) => item.storeId === storeId);
  }, [inventory, storeId]);

  // ── Filter pencarian nama/sku ──────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return availableForStore;
    return availableForStore.filter(
      (item) =>
        item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q),
    );
  }, [availableForStore, searchQuery]);

  // ── Perhitungan Grand Total & Qty ──────────────────────────────────────────
  const grandTotal = useMemo(() => {
    return cart.reduce((sum, row) => sum + row.subtotal, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, row) => sum + row.quantity, 0);
  }, [cart]);

  // ── Perhitungan Tunai & Kembalian ───────────────────────────────────────────
  const parsedCashReceived = Number(cashReceivedInput.replace(/\D/g, "")) || 0;
  const cashChange = parsedCashReceived - grandTotal;
  const isCashInsufficient = paymentMethod === "cash" && parsedCashReceived < grandTotal;

  // ── Handler Ganti Toko ─────────────────────────────────────────────────────
  function handleStoreChange(newStoreId: string) {
    setStoreId(newStoreId);
    setCart([]);
    setErrorMessage("");
    setSuccessMessage("");
    setLastReceipt(null);
    setCashReceivedInput("");
  }

  // ── Handler: Klik Kartu Produk (Tambah / Increment) ────────────────────────
  function handleCardClick(product: InventoryOption) {
    // Efek Neumorphism inset shadow selama 180ms
    setPressedCardId(product.allocationId);
    setTimeout(() => {
      setPressedCardId((prev) => (prev === product.allocationId ? null : prev));
    }, 180);

    const existingIndex = cart.findIndex(
      (row) => row.allocationId === product.allocationId,
    );

    if (existingIndex !== -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.stock) {
        setErrorMessage(
          `Batas stok tercapai. Stok toko "${product.name}" hanya tersedia ${product.stock} unit.`,
        );
        return;
      }
      setErrorMessage("");
      setCart((prev) =>
        prev.map((row, i) =>
          i === existingIndex
            ? {
                ...row,
                quantity: row.quantity + 1,
                subtotal: (row.quantity + 1) * row.price,
              }
            : row,
        ),
      );
    } else {
      if (product.stock <= 0) {
        setErrorMessage(`Stok untuk "${product.name}" sedang habis.`);
        return;
      }
      setErrorMessage("");
      const newRow: CartRow = {
        rowId: `${product.allocationId}-${Date.now()}`,
        allocationId: product.allocationId,
        productId: product.productId,
        productName: product.name,
        sku: product.sku,
        price: product.sellingPrice,
        quantity: 1,
        subtotal: product.sellingPrice,
        imageUrl: product.imageUrl,
        maxStock: product.stock,
      };
      setCart((prev) => [...prev, newRow]);
    }
  }

  // ── Handler: Ubah Jumlah Qty di Panel Kanan ────────────────────────────────
  function handleUpdateQty(allocationId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((row) => {
          if (row.allocationId !== allocationId) return row;
          const nextQty = row.quantity + delta;
          if (nextQty <= 0) return null; // Akan difilter di bawah
          if (nextQty > row.maxStock) {
            setErrorMessage(`Maksimal stok tersedia hanya ${row.maxStock} unit.`);
            return row;
          }
          setErrorMessage("");
          return {
            ...row,
            quantity: nextQty,
            subtotal: nextQty * row.price,
          };
        })
        .filter((r): r is CartRow => r !== null),
    );
  }

  // ── Handler: Hapus Item dari Keranjang ─────────────────────────────────────
  function handleRemoveItem(allocationId: string) {
    setCart((prev) => prev.filter((r) => r.allocationId !== allocationId));
  }

  // ── Handler: Reset Keranjang ───────────────────────────────────────────────
  function handleClearCart() {
    setCart([]);
    setCashReceivedInput("");
    setErrorMessage("");
  }

  // ── Handler: Preset Uang Cepat (Quick Cash) ────────────────────────────────
  function handleQuickCash(nominal: number) {
    setCashReceivedInput(String(nominal));
  }

  // ── Handler: Submit Transaksi ke Supabase ──────────────────────────────────
  function handleSubmit() {
    if (cart.length === 0) return;
    if (isCashInsufficient) {
      setErrorMessage("Nominal uang yang diterima kurang dari total belanja.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setLastReceipt(null);

    const storeName = stores.find((s) => s.id === storeId)?.name ?? "Toko Mitra";
    const receiptItems = cart.map((r) => ({
      name: r.productName,
      qty: r.quantity,
      price: r.price,
      subtotal: r.subtotal,
    }));
    const total = grandTotal;
    const currentPayment = paymentMethod;
    const currentCashReceived = paymentMethod === "cash" ? parsedCashReceived : undefined;
    const currentCashChange = paymentMethod === "cash" ? Math.max(0, cashChange) : undefined;

    startTransition(async () => {
      const result = await recordCartTransaction({
        partnerStoreId: storeId,
        paymentMethod: currentPayment,
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
        const txId = result.transactionId?.slice(0, 8).toUpperCase() ?? "TX-SARNIYA";
        setSuccessMessage(
          `Transaksi berhasil disimpan! ID: ${txId}. Stok toko telah berkurang secara otomatis.`,
        );

        setLastReceipt({
          storeName,
          transactionNumber: txId,
          date: new Date().toLocaleString("id-ID"),
          paymentMethod: currentPayment,
          items: receiptItems,
          grandTotal: total,
          cashReceived: currentCashReceived,
          cashChange: currentCashChange,
        });

        setCart([]);
        setCashReceivedInput("");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2.7fr_1.3fr] gap-4 items-start">
      {/* =========================================================================
          AREA KIRI: Grid Katalog Produk Ultra-Compact (2.7fr)
         ========================================================================= */}
      <section
        aria-label="Katalog Produk Kasir"
        className="min-w-0 rounded-2xl bg-almond-cream/40 p-3 sm:p-3.5 shadow-neu-sm border border-[#a3b1c6]/20 flex flex-col gap-3"
      >
        {/* Toolbar Katalog: Pemilihan Toko & Pencarian Cepat */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Toko Selector */}
          <div className="flex items-center gap-2">
            <label
              htmlFor={`${uid}-store-selector`}
              className="text-[10px] font-bold uppercase tracking-wider text-[#576071]"
            >
              Toko:
            </label>
            <select
              id={`${uid}-store-selector`}
              value={storeId}
              onChange={(e) => handleStoreChange(e.target.value)}
              disabled={isPending}
              className="h-8.5 rounded-xl border-none bg-[#e0e5ec] px-2.5 text-xs font-bold text-[#2d3440] shadow-neu-sm outline-none transition-all focus:ring-1 focus:ring-dusty-rose/40 cursor-pointer"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#e0e5ec] text-[#2d3440]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kolom Pencarian Produk Neumorphism Inset */}
          <div className="relative flex-1 max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#7a8394]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk / SKU..."
              style={neuInputInset}
              className="h-8.5 w-full rounded-xl border-none bg-[#e0e5ec] pl-8 pr-7 text-xs font-medium text-[#2d3440] placeholder:text-[#8f98a8] outline-none transition-all focus:ring-1 focus:ring-dusty-rose/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2 text-xs font-bold text-[#7a8394] hover:text-terracotta-clay"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Status Produk */}
        <div className="flex items-center justify-between text-[10px] text-[#7a8394]">
          <p className="font-medium">
            Tersedia <strong className="text-terracotta-clay">{filteredProducts.length}</strong> produk di rak
          </p>
          <span className="hidden sm:inline-block text-[9px] text-[#7a8394]">
            *Klik kartu untuk langsung masukkan ke keranjang
          </span>
        </div>

        {/* Grid Kartu Produk (Pasti 4 Kolom) */}
        {filteredProducts.length === 0 ? (
          <div
            className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl bg-[#e0e5ec] p-6 text-center"
            style={neuInputInset}
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#e0e5ec] p-2 text-terracotta-clay shadow-neu-sm mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="font-bold text-xs text-[#2d3440]">Tidak Ada Produk Ditemukan</p>
            <p className="mt-0.5 text-[10px] text-[#7a8394] max-w-xs">
              {searchQuery
                ? `Tidak ada produk dengan kata kunci "${searchQuery}".`
                : "Belum ada alokasi stok produk aktif untuk toko ini."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {filteredProducts.map((item) => {
              const inCartQty =
                cart.find((r) => r.allocationId === item.allocationId)?.quantity ?? 0;
              const isOutOfStock = item.stock <= 0;
              const isLimitReached = inCartQty >= item.stock;
              const isPressed = pressedCardId === item.allocationId;

              return (
                <div
                  key={item.allocationId}
                  role="button"
                  tabIndex={0}
                  onClick={() => !isOutOfStock && handleCardClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (!isOutOfStock) handleCardClick(item);
                    }
                  }}
                  style={isPressed ? neuPressed : neuButtonRaised}
                  className={`group relative flex flex-col justify-between rounded-xl bg-[#e0e5ec] p-2 sm:p-2.5 text-left transition-all duration-150 select-none ${
                    isOutOfStock
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:brightness-105 active:scale-[0.98]"
                  }`}
                >
                  {/* Bagian Atas: Gambar Produk & Badge Stok */}
                  <div>
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#e0e5ec] p-1 flex items-center justify-center border border-[#a3b1c6]/20">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 25vw, 20vw"
                          className="object-contain p-0.5 transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-lg bg-almond-cream/60 p-1 text-terracotta-clay shadow-neu-sm">
                          <Image
                            src="/logo-sarniya.png"
                            alt="Sarniya"
                            width={22}
                            height={22}
                            className="object-contain opacity-80"
                          />
                        </div>
                      )}

                      {/* Badge Sisa Stok */}
                      <span
                        className={`absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black tracking-wide ${
                          isOutOfStock
                            ? "bg-rose-100 text-rose-800"
                            : item.stock <= 5
                            ? "bg-amber-100 text-amber-800"
                            : "bg-almond-cream text-terracotta-clay shadow-neu-sm"
                        }`}
                      >
                        {isOutOfStock ? "Habis" : `${item.stock}`}
                      </span>

                      {/* Badge Indikator Jumlah di Keranjang */}
                      {inCartQty > 0 && (
                        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-full bg-terracotta-clay px-1.5 py-0.2 text-[8px] sm:text-[9px] font-bold text-white shadow-md">
                          <span>{inCartQty} di cart</span>
                        </span>
                      )}
                    </div>

                    {/* Info Nama & SKU */}
                    <div className="mt-2">
                      <p className="text-[9px] font-mono text-[#7a8394] truncate">
                        {item.sku}
                      </p>
                      <h3 className="mt-0.5 line-clamp-2 text-[11px] sm:text-xs font-bold text-[#2d3440] leading-tight min-h-[1.75rem] group-hover:text-terracotta-clay transition-colors" title={item.name}>
                        {item.name}
                      </h3>
                    </div>
                  </div>

                  {/* Bagian Bawah: Harga & Aksi Cepat */}
                  <div className="mt-2 flex items-center justify-between border-t border-[#a3b1c6]/20 pt-1.5">
                    <div className="min-w-0 pr-1">
                      <p className="text-[8px] text-[#7a8394]">Harga</p>
                      <p className="text-[11px] sm:text-xs font-black text-terracotta-clay truncate">
                        {idr.format(item.sellingPrice)}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isOutOfStock || isLimitReached}
                      aria-label={`Tambah ${item.name}`}
                      className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-terracotta-clay text-white shadow-neu-sm transition-transform active:scale-90 disabled:opacity-40"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 4v16m8-8H4"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          AREA KANAN: Panel Keranjang & Pembayaran Ultra-Compact (1.3fr)
         ========================================================================= */}
      <aside
        aria-label="Panel Keranjang dan Pembayaran"
        className="w-full rounded-2xl bg-[#e0e5ec] p-3 sm:p-3.5 shadow-neu-flat flex flex-col justify-between"
      >
        <div>
          {/* Header Panel Keranjang */}
          <div className="flex items-center justify-between border-b border-[#a3b1c6]/25 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-xl bg-almond-cream text-terracotta-clay shadow-neu-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black tracking-tight text-[#2d3440]">
                  Keranjang Kasir
                </h2>
                <p className="text-[10px] font-medium text-[#7a8394]">
                  {totalItemsCount} item dipilih
                </p>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="rounded-lg px-2 py-0.5 text-[11px] font-bold text-[#7a8394] transition hover:text-rose-600 hover:bg-rose-50"
              >
                Reset
              </button>
            )}
          </div>

          {/* Error Message jika ada */}
          {errorMessage && (
            <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50/95 p-2.5 text-xs font-bold text-rose-800 shadow-sm">
              {errorMessage}
            </div>
          )}

          {/* Area Daftar Produk di Keranjang (Neumorphism Inset) */}
          <div
            className="mt-3 flex flex-col gap-2 rounded-xl bg-[#e0e5ec] p-2.5 max-h-[260px] sm:max-h-[300px] overflow-y-auto"
            style={neuInputInset}
          >
            {cart.length === 0 ? (
              <div className="flex min-h-[130px] flex-col items-center justify-center text-center p-3">
                <p className="text-xs font-bold text-[#576071]">Keranjang Kosong</p>
                <p className="mt-0.5 text-[10px] text-[#8f98a8] leading-relaxed">
                  Pilih produk pada kartu di sebelah kiri untuk menambah pesanan.
                </p>
              </div>
            ) : (
              cart.map((row) => (
                <div
                  key={row.rowId}
                  className="flex items-center justify-between gap-2.5 rounded-xl bg-[#e0e5ec] p-2.5 shadow-neu-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#2d3440]">
                      {row.productName}
                    </p>
                    <p className="text-[10px] font-medium text-[#7a8394]">
                      {idr.format(row.price)}
                    </p>
                    <p className="text-xs font-black text-terracotta-clay mt-0.5">
                      {idr.format(row.subtotal)}
                    </p>
                  </div>

                  {/* Kontrol Qty (+ / -) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(row.allocationId, -1)}
                      className="flex size-6 items-center justify-center rounded-lg bg-[#e0e5ec] text-xs font-black text-terracotta-clay shadow-neu-sm transition active:shadow-neu-inset-sm"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-black text-[#2d3440]">
                      {row.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(row.allocationId, 1)}
                      className="flex size-6 items-center justify-center rounded-lg bg-[#e0e5ec] text-xs font-black text-terracotta-clay shadow-neu-sm transition active:shadow-neu-inset-sm"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(row.allocationId)}
                      aria-label="Hapus produk"
                      className="ml-0.5 p-1 text-[#7a8394] hover:text-rose-600 transition"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Ringkasan Subtotal / Grand Total */}
          <div className="mt-3.5 border-t border-[#a3b1c6]/25 pt-2.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#576071]">
              <span>Total Item ({totalItemsCount} pcs)</span>
              <span>{idr.format(grandTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2d3440]">Grand Total</span>
              <span className="text-lg sm:text-xl font-black text-terracotta-clay">
                {idr.format(grandTotal)}
              </span>
            </div>
          </div>

          {/* ── 3 Tombol Metode Pembayaran Berjejer ─────────────────────────── */}
          <div className="mt-3.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#576071] mb-1.5">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["cash", "transfer", "qris"] as const).map((method) => {
                const isSelected = paymentMethod === method;
                const labels = { cash: "Tunai", transfer: "Transfer", qris: "QRIS" };

                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method);
                      setErrorMessage("");
                    }}
                    style={isSelected ? neuPressed : neuTagRaised}
                    className={`h-9 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-terracotta-clay text-white"
                        : "bg-[#e0e5ec] text-[#576071] hover:bg-almond-cream/50"
                    }`}
                  >
                    {labels[method]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Logika Khusus Pembayaran Tunai ─────────────────────────────── */}
          {paymentMethod === "cash" && (
            <div className="mt-3 space-y-2 rounded-xl bg-almond-cream/30 p-3 border border-[#a3b1c6]/20">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`${uid}-cash-input`}
                  className="text-[11px] font-bold uppercase tracking-wider text-[#576071]"
                >
                  Uang Diterima
                </label>
                {grandTotal > 0 && (
                  <button
                    type="button"
                    onClick={() => handleQuickCash(grandTotal)}
                    className="text-[10px] font-bold text-terracotta-clay underline hover:text-[#2d3440]"
                  >
                    Uang Pas
                  </button>
                )}
              </div>

              {/* Input Uang Diterima (Neumorphic Inset) */}
              <input
                id={`${uid}-cash-input`}
                type="text"
                inputMode="numeric"
                value={cashReceivedInput ? idr.format(parsedCashReceived) : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setCashReceivedInput(raw);
                }}
                placeholder="Rp 0"
                style={neuInputInset}
                className="h-9 w-full rounded-xl border-none bg-[#e0e5ec] px-3 text-sm font-black text-[#2d3440] placeholder:text-[#8f98a8] outline-none transition-all focus:ring-1 focus:ring-dusty-rose/40"
              />

              {/* Tombol Pecahan Uang Cepat */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {[50000, 100000, 200000].map((nominal) => (
                  <button
                    key={nominal}
                    type="button"
                    onClick={() => handleQuickCash(nominal)}
                    className="rounded-lg bg-[#e0e5ec] px-2 py-0.5 text-[10px] font-bold text-[#576071] shadow-neu-sm hover:bg-almond-cream/60 transition"
                  >
                    {idr.format(nominal)}
                  </button>
                ))}
              </div>

              {/* Baris Selisih / Kembalian */}
              <div className="border-t border-[#a3b1c6]/20 pt-1.5 flex items-center justify-between text-xs">
                <span className="font-bold text-[#576071]">Kembalian:</span>
                <span
                  className={`text-xs sm:text-sm font-black ${
                    parsedCashReceived === 0
                      ? "text-[#7a8394]"
                      : isCashInsufficient
                      ? "text-rose-600"
                      : "text-emerald-700"
                  }`}
                >
                  {parsedCashReceived === 0
                    ? idr.format(0)
                    : isCashInsufficient
                    ? `Kurang ${idr.format(Math.abs(cashChange))}`
                    : idr.format(cashChange)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Tombol Besar Proses Transaksi di Paling Bawah ─────────────────── */}
        <div className="mt-4 pt-3 border-t border-[#a3b1c6]/25">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={cart.length === 0 || isPending || isCashInsufficient}
            style={neuButtonRaised}
            className="flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-dusty-rose via-[#c09485] to-terracotta-clay text-sm sm:text-base font-black text-white tracking-wide transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5 text-xs">
                <svg className="animate-spin size-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Memproses...
              </span>
            ) : (
              <span>Proses Transaksi {cart.length > 0 ? `· ${idr.format(grandTotal)}` : ""}</span>
            )}
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MODAL KEBERHASILAN TRANSAKSI & CETAK STRUK THERMAL
         ========================================================================= */}
      {successMessage && lastReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2d3440]/50 p-4 backdrop-blur-sm print:hidden">
          <div
            style={neuButtonRaised}
            className="w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-3xl bg-[#e0e5ec] p-6 shadow-2xl border border-white/60"
          >
            {/* Header Modal */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-neu-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-[#2d3440]">Transaksi Berhasil!</h3>
                <p className="text-xs text-[#7a8394]">Struk siap dicetak ke printer kasir.</p>
              </div>
            </div>

            {/* Pratinjau Kertas Struk Kasir */}
            <div
              style={neuInputInset}
              className="my-4 rounded-2xl bg-[#e0e5ec] p-4 font-mono text-xs text-[#2d3440]"
            >
              <div className="text-center pb-2.5 border-b border-dashed border-[#a3b1c6]/50">
                <p className="font-black text-sm uppercase text-[#2d3440]">{lastReceipt.storeName}</p>
                <p className="text-[10px] text-[#7a8394]">SarniyaSync POS System</p>
                <p className="text-[10px] text-[#7a8394] mt-0.5">{lastReceipt.date}</p>
                <p className="text-[10px] font-bold text-terracotta-clay mt-1">
                  No: {lastReceipt.transactionNumber}
                </p>
              </div>

              <div className="py-2.5 border-b border-dashed border-[#a3b1c6]/50 space-y-1.5 max-h-44 overflow-y-auto">
                {lastReceipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px]">
                    <div className="truncate pr-2">
                      <p className="font-bold text-[#2d3440] truncate">{it.name}</p>
                      <p className="text-[10px] text-[#7a8394]">
                        {it.qty} x {idr.format(it.price)}
                      </p>
                    </div>
                    <span className="font-black text-[#2d3440] shrink-0">
                      {idr.format(it.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2.5 space-y-1">
                <div className="flex justify-between font-black text-xs">
                  <span>TOTAL ({lastReceipt.paymentMethod.toUpperCase()}):</span>
                  <span className="text-terracotta-clay font-black">
                    {idr.format(lastReceipt.grandTotal)}
                  </span>
                </div>

                {/* Baris Informasi Khusus Tunai */}
                {lastReceipt.paymentMethod.toLowerCase() === "cash" &&
                  lastReceipt.cashReceived !== undefined && (
                    <div className="pt-1.5 border-t border-dashed border-[#a3b1c6]/40 text-[11px] space-y-0.5">
                      <div className="flex justify-between text-[#576071]">
                        <span>Diterima:</span>
                        <span>{idr.format(lastReceipt.cashReceived)}</span>
                      </div>
                      <div className="flex justify-between font-black text-emerald-800">
                        <span>Kembalian:</span>
                        <span>{idr.format(lastReceipt.cashChange ?? 0)}</span>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Aksi Tombol Cetak & Tutup */}
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                style={neuButtonRaised}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-dusty-rose to-terracotta-clay px-4 text-xs font-black uppercase tracking-wider text-white transition hover:brightness-105 active:scale-95"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Cetak Struk Thermal
              </button>

              <button
                type="button"
                onClick={() => {
                  setSuccessMessage("");
                  setLastReceipt(null);
                }}
                className="h-10 w-full rounded-2xl bg-[#e0e5ec] text-xs font-bold text-[#576071] shadow-neu-sm transition hover:bg-almond-cream/50 active:shadow-neu-inset-sm"
              >
                Tutup &amp; Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Komponen Cetak Kertas Thermal 58/80mm */}
      <ThermalReceipt data={lastReceipt} />
    </div>
  );
}
