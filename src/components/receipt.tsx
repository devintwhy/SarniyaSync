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
        <p className="text-[10px] text-gray-700">SarniyaSync POS System</p>
      </div>

      <div className="border-t border-b border-black border-dashed py-1.5 my-1.5 text-[10px]">
        <div className="flex justify-between">
          <span>Tgl:</span>
          <span>{data.date}</span>
        </div>
        <div className="flex justify-between font-mono">
          <span>No:</span>
          <span className="font-semibold">{data.transactionNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Bayar:</span>
          <span className="uppercase font-semibold">{data.paymentMethod}</span>
        </div>
      </div>

      <table className="w-full text-left my-2 border-collapse">
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} className="border-b border-gray-300 border-dotted">
              <td className="py-1">
                <div className="font-medium text-[11px] leading-tight break-words">
                  {item.name}
                </div>
                <div className="flex justify-between text-[10px] text-gray-800 mt-0.5">
                  <span>
                    {item.qty} x {currencyFormatter.format(item.price)}
                  </span>
                  <span className="font-semibold">{currencyFormatter.format(item.subtotal)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black border-dashed pt-1.5 mt-2 flex justify-between font-bold text-[12px]">
        <span>TOTAL:</span>
        <span>{currencyFormatter.format(data.grandTotal)}</span>
      </div>

      {isCash && data.cashReceived !== undefined && (
        <div className="border-t border-gray-300 border-dotted pt-1 mt-1 text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span>Diterima:</span>
            <span>{currencyFormatter.format(data.cashReceived)}</span>
          </div>
          <div className="flex justify-between font-bold text-[11px]">
            <span>Kembalian:</span>
            <span>{currencyFormatter.format(data.cashChange ?? 0)}</span>
          </div>
        </div>
      )}

      <div className="text-center text-[9px] mt-4 pt-2 border-t border-gray-400 border-dashed space-y-0.5">
        <p className="font-semibold">Terima Kasih Telah Berbelanja</p>
        <p>Barang yang dibeli tidak dapat ditukar</p>
        <p className="text-[8px] text-gray-500 mt-1">*** SARNIYASYNC POS ***</p>
      </div>
    </div>
  );

  return createPortal(content, document.body);
});

ThermalReceipt.displayName = "ThermalReceipt";

export default ThermalReceipt;
