"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { bulkAllocatePartnerStock } from "./actions";

export type StoreOption = {
  id: string;
  name: string;
  city?: string | null;
};

export type WarehouseProduct = {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  stock_quantity: number;
};

export type ExistingAllocation = {
  id: string;
  partner_store_id: string;
  product_id: string;
  stock_quantity: number;
};

type BulkAllocationClientProps = {
  stores: StoreOption[];
  products: WarehouseProduct[];
  allocations: ExistingAllocation[];
};

const numberFormatter = new Intl.NumberFormat("id-ID");

export default function BulkAllocationClient({
  stores,
  products,
  allocations,
}: BulkAllocationClientProps) {
  const router = useRouter();

  // ── State Management ────────────────────────────────────────────────────────
  const [selectedProducts, setSelectedProducts] = useState<Array<{ product: WarehouseProduct; quantity: number }>>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filterAllocationStoreId, setFilterAllocationStoreId] = useState<string>("all");

  // Map stores & products for quick lookup
  const storesById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Set ID produk terpilih untuk pencarian instan
  const selectedProductIds = useMemo(
    () => new Set(selectedProducts.map((p) => p.product.id)),
    [selectedProducts],
  );

  // Total unit yang akan dialokasikan
  const totalUnits = useMemo(() => {
    return selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedProducts]);

  // Filtered Warehouse Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)),
    );
  }, [products, searchQuery]);

  // Check if all filtered products are selected
  const isAllSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every((p) => selectedProductIds.has(p.id));
  }, [filteredProducts, selectedProductIds]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectProduct = (product: WarehouseProduct) => {
    setSelectedProducts((prev) => {
      // Jika sudah ada, hapus (toggle off)
      if (prev.find((p) => p.product.id === product.id)) {
        return prev.filter((p) => p.product.id !== product.id);
      }
      // Jika belum ada, masukkan dengan qty awal 10
      return [...prev, { product, quantity: 10 }]; // <-- PASTIKAN BARIS INI BENAR
    });
    setErrorMessage("");
  };

  function handleSelectAll() {
    if (isAllSelected) {
      // Hapus semua produk terfilter dari keranjang
      const filteredIds = new Set(filteredProducts.map((p) => p.id));
      setSelectedProducts((prev) => prev.filter((p) => !filteredIds.has(p.product.id)));
    } else {
      // Masukkan semua produk terfilter dengan default 10 pcs
      setSelectedProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.product.id));
        const toAdd = filteredProducts
          .filter((p) => !existingIds.has(p.id))
          .map((product) => ({ product, quantity: 10 }));
        return [...prev, ...toAdd];
      });
    }
    setErrorMessage("");
  }

  const handleUpdateQuantity = (productId: string, operation: "increase" | "decrease") => {
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = Math.max(1, item.product.stock_quantity);
          if (operation === "increase") {
            return { ...item, quantity: Math.min(maxStock, item.quantity + 10) }; // Naik per 10
          } else if (operation === "decrease") {
            return { ...item, quantity: Math.max(1, item.quantity - 10) }; // Turun per 10, minimal 1
          }
        }
        return item;
      }),
    );
  };

  const handleDirectQuantityChange = (productId: string, value: number) => {
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = Math.max(1, item.product.stock_quantity);
          const clamped = Math.min(Math.max(1, value || 1), maxStock);
          return { ...item, quantity: clamped };
        }
        return item;
      }),
    );
  };

  function handleRemoveFromCart(productId: string) {
    setSelectedProducts((prev) => prev.filter((p) => p.product.id !== productId));
  }

  function handleResetSelection() {
    setSelectedProducts([]);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleBulkAllocationSubmit() {
    if (!selectedStoreId) {
      setErrorMessage("Silakan pilih Toko Mitra tujuan terlebih dahulu.");
      return;
    }

    if (selectedProducts.length === 0) {
      setErrorMessage("Silakan pilih minimal 1 produk pada tabel gudang.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const items = selectedProducts.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const result = await bulkAllocatePartnerStock({
        storeId: selectedStoreId,
        items,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setSuccessMessage(
        result.success || `Berhasil mengalokasikan ${items.length} produk ke toko mitra!`,
      );
      setSelectedProducts([]);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Alokasi massal gagal diproses.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filtered existing allocations table
  const displayedAllocations = useMemo(() => {
    if (filterAllocationStoreId === "all") return allocations;
    return allocations.filter((a) => a.partner_store_id === filterAllocationStoreId);
  }, [allocations, filterAllocationStoreId]);

  return (
    <div className="space-y-6">
      {/* ── Main Two-Column Layout (Warehouse Table + Allocation Cart) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── Left Column: Warehouse Inventory Table (Multi-Select) ──────── */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
          <div className="rounded-2xl bg-[#e0e5ec] p-4 shadow-neu-flat border border-white/40">
            {/* Header: Title & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#a3b1c6]/20">
              <div>
                <h2 className="text-base font-black text-[#2d3440] flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-terracotta-clay text-white text-xs shadow-neu-sm">
                    📦
                  </span>
                  Stok Gudang Pusat
                </h2>
                <p className="text-[11px] text-[#7a8394] mt-0.5">
                  Centang produk yang ingin dialokasikan ke toko mitra.
                </p>
              </div>

              {/* Search Box with Neumorphism Inset */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Cari SKU / nama produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 rounded-xl bg-[#e0e5ec] shadow-neu-inset-sm px-3.5 pl-8 text-xs font-semibold text-[#2d3440] placeholder:text-[#7a8394] outline-none transition-all focus:ring-1 focus:ring-terracotta-clay/40"
                />
                <svg
                  className="size-3.5 text-[#7a8394] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
            </div>

            {/* Selection Status Bar */}
            <div className="flex items-center justify-between py-2.5 px-1 text-xs">
              <span className="text-[11px] font-semibold text-[#7a8394]">
                Menampilkan <strong className="text-[#2d3440]">{filteredProducts.length}</strong> produk
                tersedia di gudang pusat
              </span>

              {selectedProducts.length > 0 && (
                <span className="text-[11px] font-bold text-terracotta-clay bg-almond-cream px-2.5 py-0.5 rounded-full shadow-neu-sm">
                  {selectedProducts.length} produk terpilih ({totalUnits} unit)
                </span>
              )}
            </div>

            {/* Warehouse Products Table */}
            <div className="overflow-x-auto rounded-xl border border-[#a3b1c6]/20 bg-[#e0e5ec]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#d7dde6] text-[11px] font-bold uppercase tracking-wider text-[#576071] border-b border-[#a3b1c6]/20">
                  <tr>
                    {/* Checkbox 'Pilih Semua' */}
                    <th scope="col" className="w-10 px-3 py-2.5 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          aria-label="Pilih semua produk"
                          className="sr-only"
                        />
                        <span
                          className={`size-4.5 rounded-md flex items-center justify-center transition-all ${
                            isAllSelected
                              ? "bg-terracotta-clay text-white shadow-neu-sm"
                              : "bg-[#e0e5ec] shadow-neu-inset-sm border border-[#a3b1c6]/30 text-transparent"
                          }`}
                        >
                          <svg
                            className="size-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      </label>
                    </th>
                    <th scope="col" className="px-3 py-2.5">Produk</th>
                    <th scope="col" className="px-3 py-2.5 hidden sm:table-cell">Kategori</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Stok Gudang</th>
                    <th scope="col" className="px-3 py-2.5 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a3b1c6]/15">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-[#7a8394]">
                        {searchQuery
                          ? `Tidak ada produk dengan kata kunci "${searchQuery}".`
                          : "Tidak ada stok produk yang tersedia di gudang pusat."}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const cartItem = selectedProducts.find((p) => p.product.id === product.id);
                      const isSelected = Boolean(cartItem);
                      const currentQty = cartItem?.quantity ?? 10;

                      return (
                        <tr
                          key={product.id}
                          onClick={() => handleSelectProduct(product)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-almond-cream/40"
                              : "hover:bg-almond-cream/15"
                          }`}
                        >
                          {/* Row Checkbox with Neumorphic Style */}
                          <td
                            className="px-3 py-2.5 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectProduct(product)}
                                aria-label={`Pilih ${product.name}`}
                                className="sr-only"
                              />
                              <span
                                className={`size-4.5 rounded-md flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "bg-terracotta-clay text-white shadow-neu-sm"
                                    : "bg-[#e0e5ec] shadow-neu-inset-sm border border-[#a3b1c6]/30 text-transparent hover:border-terracotta-clay/40"
                                }`}
                              >
                                <svg
                                  className="size-3"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </span>
                            </label>
                          </td>

                          {/* Product Info */}
                          <td className="px-3 py-2.5 min-w-0">
                            <p className="font-bold text-[#2d3440] truncate max-w-[200px] sm:max-w-xs" title={product.name}>
                              {product.name}
                            </p>
                            <span className="font-mono text-[10px] text-[#7a8394]">
                              {product.sku}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="px-3 py-2.5 hidden sm:table-cell whitespace-nowrap">
                            <span className="inline-block rounded-md bg-[#d7dde6] px-2 py-0.5 text-[10px] font-semibold text-[#576071]">
                              {product.category || "Umum"}
                            </span>
                          </td>

                          {/* Stock Quantity */}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex min-w-[2.5rem] justify-center rounded-lg px-2 py-0.5 text-xs font-black shadow-neu-sm ${
                                product.stock_quantity <= 5
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-almond-cream text-terracotta-clay"
                              }`}
                            >
                              {numberFormatter.format(product.stock_quantity)} pcs
                            </span>
                          </td>

                          {/* Quick Toggle Action Button */}
                          <td
                            className="px-3 py-2.5 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectProduct(product)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                isSelected
                                  ? "bg-terracotta-clay text-white shadow-neu-sm active:shadow-neu-inset-sm"
                                  : "bg-[#e0e5ec] text-[#576071] shadow-neu-sm hover:text-terracotta-clay active:shadow-neu-inset-sm"
                              }`}
                            >
                              {isSelected ? `${currentQty} pcs` : "+ Pilih"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Right Column: Panel Keranjang Alokasi (Sticky Sidebar) ─────── */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-4">
          <div className="rounded-2xl bg-[#e0e5ec] p-4 shadow-neu-flat border border-white/40 flex flex-col gap-3.5">
            {/* Header Keranjang Alokasi */}
            <div className="flex items-center justify-between pb-3 border-b border-[#a3b1c6]/20">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-terracotta-clay text-white shadow-neu-sm text-sm">
                  🛒
                </span>
                <div>
                  <h3 className="text-sm font-black text-[#2d3440]">Keranjang Alokasi</h3>
                  <p className="text-[10px] text-[#7a8394]">Alokasi massal ke gerai mitra</p>
                </div>
              </div>

              {selectedProducts.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetSelection}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Batal Semua
                </button>
              )}
            </div>

            {/* Dropdown Pemilihan Toko Mitra Tujuan */}
            <div>
              <label
                htmlFor="target-mitra-store"
                className="block text-[11px] font-black uppercase tracking-wider text-[#576071] mb-1.5"
              >
                Pilih Toko Mitra Tujuan
              </label>
              <div className="relative">
                <select
                  id="target-mitra-store"
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  disabled={stores.length === 0}
                  className="w-full h-10 rounded-xl bg-[#e0e5ec] shadow-neu-inset-sm px-3 text-xs font-bold text-[#2d3440] outline-none transition-all focus:ring-1 focus:ring-terracotta-clay/40 disabled:opacity-50"
                >
                  {stores.length ? (
                    stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.city ? `(${s.city})` : ""}
                      </option>
                    ))
                  ) : (
                    <option value="">Belum ada toko mitra aktif</option>
                  )}
                </select>
              </div>
            </div>

            {/* State: Keranjang Kosong vs Berisi Produk */}
            {selectedProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#a3b1c6]/40 p-6 text-center flex flex-col items-center justify-center gap-2">
                <span className="text-3xl opacity-60">📋</span>
                <p className="text-xs font-bold text-[#576071]">Belum Ada Produk Dipilih</p>
                <p className="text-[11px] text-[#7a8394] max-w-[220px]">
                  Beri tanda centang pada checkbox produk di tabel sebelah kiri untuk menambahkannya ke keranjang ini.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Scrollable list of selected products with quantity inputs */}
                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                  {selectedProducts.map(({ product: prod, quantity: qty }) => {
                    const maxStock = prod.stock_quantity;

                    return (
                      <div
                        key={prod.id}
                        className="rounded-xl bg-[#e0e5ec] p-2.5 shadow-neu-sm border border-white/60 flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#2d3440] truncate" title={prod.name}>
                              {prod.name}
                            </p>
                            <p className="text-[10px] text-[#7a8394] font-mono">
                              {prod.sku} · Gudang: <span className="font-bold text-terracotta-clay">{maxStock} pcs</span>
                            </p>
                          </div>

                          {/* Delete Item Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(prod.id)}
                            title="Hapus dari keranjang"
                            className="size-6 shrink-0 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-100/60 active:scale-95 transition-all"
                          >
                            <svg
                              className="size-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>

                        {/* Quantity Controls (Stepper + Number Input) */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#a3b1c6]/15">
                          <span className="text-[11px] font-semibold text-[#576071]">
                            Jumlah Alokasi:
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Decrease Button: Turun per 10, minimal 1 */}
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(prod.id, "decrease")}
                              disabled={qty <= 1}
                              title="Kurangi 10 unit (min. 1)"
                              className="size-7 rounded-lg bg-[#e0e5ec] shadow-neu-sm flex items-center justify-center text-xs font-black text-[#2d3440] hover:text-terracotta-clay active:shadow-neu-inset-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              -
                            </button>

                            {/* Direct Number Input with Inset Neumorphism */}
                            <input
                              type="number"
                              min="1"
                              max={maxStock}
                              value={qty}
                              onChange={(e) => handleDirectQuantityChange(prod.id, Number(e.target.value))}
                              className="w-16 h-7 rounded-lg bg-[#e0e5ec] shadow-neu-inset-sm text-center text-xs font-black text-[#2d3440] outline-none focus:ring-1 focus:ring-terracotta-clay"
                            />

                            {/* Increase Button: Naik per 10 */}
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(prod.id, "increase")}
                              disabled={qty >= maxStock}
                              title="Tambah 10 unit"
                              className="size-7 rounded-lg bg-[#e0e5ec] shadow-neu-sm flex items-center justify-center text-xs font-black text-[#2d3440] hover:text-terracotta-clay active:shadow-neu-inset-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Box */}
                <div className="rounded-xl bg-almond-cream/60 p-3 shadow-neu-inset-sm space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#576071]">
                    <span>Total Jenis Produk:</span>
                    <strong className="text-[#2d3440]">{selectedProducts.length} macam</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#576071]">
                    <span>Total Kuantitas Dialokasikan:</span>
                    <strong className="text-terracotta-clay text-sm font-black">
                      {numberFormatter.format(totalUnits)} pcs
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Error & Success Feedback */}
            {errorMessage && (
              <p
                role="alert"
                className="rounded-xl border border-rose-300 bg-rose-50/90 p-2.5 text-xs font-semibold text-rose-800"
              >
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p
                role="status"
                className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-2.5 text-xs font-semibold text-emerald-800"
              >
                {successMessage}
              </p>
            )}

            {/* Main Action Button (Bulk Upsert Trigger) */}
            <button
              type="button"
              onClick={handleBulkAllocationSubmit}
              disabled={isSubmitting || selectedProducts.length === 0 || !selectedStoreId}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-terracotta-clay to-[#804233] text-white text-xs font-black uppercase tracking-wider shadow-neu-sm transition-all duration-200 hover:brightness-110 active:shadow-neu-inset-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Menyimpan Alokasi Massal...</span>
                </>
              ) : (
                <span>
                  Alokasikan {selectedProducts.length > 0 ? `${selectedProducts.length} Produk (${numberFormatter.format(totalUnits)} Pcs)` : "Produk"} &rarr;
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Existing Stock at Partner Stores ─────────────── */}
      <section
        aria-label="Daftar alokasi stok"
        className="rounded-2xl bg-[#e0e5ec] shadow-neu-flat border border-white/40 p-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#a3b1c6]/20">
          <div>
            <h2 className="text-base font-black text-[#2d3440] flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-terracotta-clay text-white text-xs shadow-neu-sm">
                🏬
              </span>
              Stok Aktif di Toko Mitra
            </h2>
            <p className="text-[11px] text-[#7a8394] mt-0.5">
              Daftar stok yang telah dialokasikan dan tersedia di gerai mitra.
            </p>
          </div>

          {/* Filter Toko Mitra Dropdown */}
          <div className="w-full sm:w-60">
            <select
              value={filterAllocationStoreId}
              onChange={(e) => setFilterAllocationStoreId(e.target.value)}
              className="w-full h-8 rounded-xl bg-[#e0e5ec] shadow-neu-inset-sm px-3 text-xs font-bold text-[#2d3440] outline-none"
            >
              <option value="all">Semua Toko Mitra ({allocations.length} alokasi)</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {displayedAllocations.length === 0 ? (
          <p className="py-8 text-center text-xs text-[#7a8394]">
            Belum ada data stok yang dialokasikan untuk pilihan ini.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#a3b1c6]/20 bg-[#e0e5ec] mt-3">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#d7dde6] text-[11px] font-bold uppercase tracking-wider text-[#576071] border-b border-[#a3b1c6]/20">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5">Toko Mitra</th>
                  <th scope="col" className="px-3.5 py-2.5">SKU</th>
                  <th scope="col" className="px-3.5 py-2.5">Nama Produk</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right">Stok di Mitra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#a3b1c6]/15">
                {displayedAllocations.map((alloc) => {
                  const store = storesById.get(alloc.partner_store_id);
                  const prod = productsById.get(alloc.product_id);

                  return (
                    <tr key={alloc.id} className="hover:bg-almond-cream/20 transition-colors">
                      <td className="px-3.5 py-2 font-medium text-[#576071]">
                        {store ? store.name : "Toko tidak diketahui"}
                        {store?.city && (
                          <span className="text-[10px] text-[#7a8394] ml-1">· {store.city}</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 font-mono text-[11px] text-[#7a8394]">
                        {prod?.sku || "-"}
                      </td>
                      <td className="px-3.5 py-2 font-bold text-[#2d3440]">
                        {prod?.name || "Produk tidak ditemukan"}
                      </td>
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        <span className="inline-block rounded-md bg-almond-cream px-2 py-0.5 text-xs font-black text-terracotta-clay shadow-neu-sm">
                          {numberFormatter.format(alloc.stock_quantity)} pcs
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
