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

  const content = (
    <div
      ref={ref}
      id="printable-receipt"
      className="hidden print:block"
    >
      <div className="text-center mb-3">
        <h1 className="font-bold text-lg mb-1">{data.storeName}</h1>
        <p className="text-[10px]">Portal Mitra SarniyaSync</p>
      </div>

      <div className="border-t border-b border-black border-dashed py-1.5 mb-2 text-[10px]">
        <div className="flex justify-between">
          <span>Tgl:</span>
          <span>{data.date}</span>
        </div>
        <div className="flex justify-between">
          <span>No:</span>
          <span>{data.transactionNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Bayar:</span>
          <span className="uppercase">{data.paymentMethod}</span>
        </div>
      </div>

      <table className="w-full text-left mb-2">
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} className="align-top">
              <td className="py-1">
                <div className="mb-0.5 max-w-[40mm] break-words leading-tight">
                  {item.name}
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>{item.qty} x {currencyFormatter.format(item.price)}</span>
                  <span>{currencyFormatter.format(item.subtotal)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black border-dashed pt-1 mb-4 flex justify-between font-bold text-[12px]">
        <span>Total:</span>
        <span>{currencyFormatter.format(data.grandTotal)}</span>
      </div>

      <div className="text-center text-[10px]">
        <p>Terima kasih telah berbelanja!</p>
        <p>Barang yang sudah dibeli tidak dapat ditukar.</p>
      </div>
      
      {/* Page break trick to ensure receipt prints cleanly and stops */}
      <div className="break-after-page"></div>
    </div>
  );

  return createPortal(content, document.body);
});

ThermalReceipt.displayName = "ThermalReceipt";

export default ThermalReceipt;
