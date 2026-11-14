"use client";

import { forwardRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ReceiptData = {
  storeName: string;
  transactionNumber: string;
  date: string;
  paymentMethod: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    subtotal: number;
  }>;
  grandTotal: number;
  cashReceived?: number;
  cashChange?: number;
};

type ReceiptProps = {
  data: ReceiptData | null;
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const ThermalReceipt = forwardRef<HTMLDivElement, ReceiptProps>(({ data }, ref) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!data || !mounted) return null;

  const isCash = data.paymentMethod.toLowerCase() === "cash" || data.paymentMethod.toLowerCase() === "tunai";

  const content = (
    <div
      ref={ref}
      id="printable-receipt"
      className="hidden print:block"
    >
      <div className="text-center mb-2">
        <h1 className="font-bold text-sm tracking-wide uppercase mb-0.5">{data.storeName}</h1>
        <p className="text-[10px] text-gray-500">SarniyaSync Mitra Store</p>
      </div>

      <div className="border-b border-dashed border-gray-400 my-2" />

      <div className="text-[10px] space-y-0.5 mb-2">
        <div className="flex justify-between">
          <span className="text-gray-500">No. Transaksi:</span>
          <span className="font-mono font-medium">{data.transactionNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Waktu:</span>
          <span>{data.date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Metode Bayar:</span>
          <span className="uppercase font-semibold">{data.paymentMethod}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-gray-400 my-2" />

      <div className="text-[10px] space-y-1.5 my-2">
        {data.items.map((item, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="font-semibold text-gray-800 line-clamp-1">{item.name}</span>
            <div className="flex justify-between text-gray-600 pl-2">
              <span>{item.qty} x {currencyFormatter.format(item.price)}</span>
              <span className="font-medium text-gray-900">{currencyFormatter.format(item.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-b border-dashed border-gray-400 my-2" />

      <div className="text-[10px] space-y-1 my-2">
        <div className="flex justify-between font-bold text-xs">
          <span>TOTAL:</span>
          <span>{currencyFormatter.format(data.grandTotal)}</span>
        </div>

        {isCash && data.cashReceived !== undefined && (
          <>
            <div className="flex justify-between text-gray-600">
              <span>Tunai Diterima:</span>
              <span>{currencyFormatter.format(data.cashReceived)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Kembalian:</span>
              <span>{currencyFormatter.format(data.cashChange ?? 0)}</span>
            </div>
          </>
        )}
      </div>

      <div className="border-b border-dashed border-gray-400 my-2" />

      <div className="text-center text-[9px] text-gray-500 space-y-0.5 mt-3">
        <p className="font-medium">Terima kasih atas kunjungan Anda!</p>
        <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
        <p className="font-mono text-[8px] text-gray-400 mt-1">Powered by SarniyaSync</p>
      </div>
    </div>
  );

  return createPortal(content, document.body);
});

ThermalReceipt.displayName = "ThermalReceipt";

export default ThermalReceipt;
