'use client';

import { formatDate } from '@/lib/utils';

export type ReceiptData = {
  bill_serial_number: number;
  created_at: string;
  header_text: string;
  footer_text: string;
  logo_url: string | null;
  show_gst_breakdown: boolean;
  items: Array<{
    item_name: string;
    quantity: number;
    unit_price: string;
    gst_rate: string;
    gst_amount: string;
    line_total: string;
  }>;
  subtotal: string;
  gst_total: string;
  grand_total: string;
};

export function ReceiptPrint({ data }: { data: ReceiptData }) {
  // Group GST by rate for breakdown
  const gstSlabs = data.items.reduce((acc, item) => {
    const rate = Number(item.gst_rate).toFixed(2);
    if (!acc[rate]) {
      acc[rate] = { base: 0, gst: 0 };
    }
    acc[rate].base += Number(item.unit_price) * item.quantity;
    acc[rate].gst += Number(item.gst_amount);
    return acc;
  }, {} as Record<string, { base: number; gst: number }>);

  return (
    <div className="receipt-print-content bg-white p-4 font-mono text-[12px] leading-relaxed text-black max-w-[400px] mx-auto print:p-0 print:m-0 print:max-w-none print:block print:w-full print:static">
      <style jsx global>{`
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden;
          }
          /* Show the receipt content specifically */
          .receipt-print-content,
          .receipt-print-content * {
            visibility: visible !important;
          }
          /* Position the receipt at the top left */
          .receipt-print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          /* Hide the dashboard and other containers specifically to be sure */
          .print\\:hidden, 
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      {data.logo_url && (
        <div className="flex justify-center mb-4">
          <img src={data.logo_url} alt="Logo" className="max-h-20 object-contain grayscale" />
        </div>
      )}

      <div className="text-center whitespace-pre-line mb-4 border-b border-dashed border-black pb-4">
        {data.header_text}
      </div>

      <div className="flex flex-col gap-1 font-bold mb-4 border-b border-dashed border-black pb-2 text-[14px]">
        <div className="flex justify-between">
          <span>BILL NO:</span>
          <span>#{data.bill_serial_number}</span>
        </div>
        <div className="flex justify-between">
          <span>DATE & TIME:</span>
          <span>{formatDate(data.created_at)}</span>
        </div>
      </div>

      <table className="w-full mb-4">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="text-left py-2 font-bold">ITEM</th>
            <th className="text-center py-2 font-bold">QTY</th>
            <th className="text-right py-2 font-bold">PRICE</th>
            <th className="text-right py-2 font-bold">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx} className="border-b border-dotted border-black/30">
              <td className="py-2">
                <div className="font-medium">{item.item_name}</div>
                <div className="text-[10px] text-black/70 italic">GST: {Number(item.gst_rate).toFixed(2)}%</div>
              </td>
              <td className="text-center py-2">{item.quantity}</td>
              <td className="text-right py-2">{Number(item.unit_price).toFixed(2)}</td>
              <td className="text-right py-2 font-bold">{Number(item.line_total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 mb-4 text-[14px]">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>Rs {Number(data.subtotal).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>GST Total</span>
          <span>Rs {Number(data.gst_total).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold border-t border-dashed border-black pt-2 text-[16px]">
          <span>GRAND TOTAL</span>
          <span>Rs {Number(data.grand_total).toFixed(2)}</span>
        </div>
      </div>

      {data.show_gst_breakdown && (
        <div className="text-[10px] border-t border-dashed border-black pt-4 mb-4">
          <p className="font-bold mb-2 underline uppercase">GST Breakdown Summary</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-dotted border-black">
                <th className="text-left">GST RATE</th>
                <th className="text-right">TAXABLE AMT</th>
                <th className="text-right">GST AMT</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(gstSlabs).map(([rate, vals]) => (
                <tr key={rate}>
                  <td>{rate}%</td>
                  <td className="text-right">{vals.base.toFixed(2)}</td>
                  <td className="text-right">{vals.gst.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-center whitespace-pre-line border-t border-dashed border-black pt-4 mb-8 text-[11px]">
        {data.footer_text}
      </div>

      <div className="text-center text-[9px] text-black/60 italic border-t border-black/10 pt-2">
        Software by RestroManager
      </div>
    </div>
  );
}
