import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Share2, Check, Copy, AlertCircle, Camera, Download, Image as ImageIcon, Sparkles, Send, Zap, QrCode } from 'lucide-react';
import { Sale } from '../types';
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../lib/translations';
import { renderInvoiceToCanvas } from '../lib/invoiceCanvasRenderer';
import QRCode from 'qrcode';

interface InvoiceModalProps {
  sale: Sale | null;
  onClose: () => void;
  shopDetails?: {
    name: string;
    address: string;
    phone: string;
    gstin?: string;
    logo?: string;
    upiId?: string;
    upiName?: string;
  };
  showAlert?: (title: string, message: string) => void;
}

// Convert base64 dataUrl to Blob for reliable mobile download & sharing
const dataUrlToBlob = (dataUrl: string): Blob => {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    return new Blob([], { type: 'image/png' });
  }
};

export default function InvoiceModal({ 
  sale, 
  onClose,
  shopDetails = {
    name: 'Fresh Farms Vegetable Mart',
    address: 'Shop No. 4, Green Market, Sector 15, City - 400012',
    phone: '+91 98765 43210',
    gstin: '27AAAAA1111A1Z1'
  },
  showAlert
}: InvoiceModalProps) {
  const { t, language } = useLanguage();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [upiCopied, setUpiCopied] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(() => {
    const cleaned = (sale ? (sale.customerPhone || '') : '').replace(/\D/g, '');
    return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
  });

  if (!sale) return null;

  const balanceDue = Number(sale.totalAmount || 0) - Number(sale.amountPaid || 0);
  const payableAmount = balanceDue > 0 ? balanceDue : Number(sale.totalAmount || 0);
  const upiId = shopDetails.upiId?.trim() || '';
  const upiPayeeName = shopDetails.upiName?.trim() || shopDetails.name || 'Merchant';

  // Generate UPI QR Code Data URL on-the-fly
  useEffect(() => {
    if (!upiId) {
      setQrCodeDataUrl('');
      return;
    }
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiPayeeName)}&am=${payableAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Bill ' + (sale.invoiceNumber || 'INV'))}`;
    QRCode.toDataURL(upiUri, {
      width: 240,
      margin: 1,
      color: { dark: '#064e3b', light: '#ffffff' }
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.warn('QR code generation error:', err));
  }, [upiId, upiPayeeName, payableAmount, sale.invoiceNumber]);

  // Helper to generate canvas image on-the-fly
  const getOrGenerateImage = async (): Promise<string> => {
    if (capturedImage && capturedImage.startsWith('data:image/png')) {
      return capturedImage;
    }
    const canvasPng = await renderInvoiceToCanvas(sale, shopDetails, language);
    if (canvasPng) {
      setCapturedImage(canvasPng);
    }
    return canvasPng;
  };

  // Cross-platform Print Handler (Native APK Print Manager + Browser Print)
  const handlePrint = () => {
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${sale.invoiceNumber}</title>
        <style>
          body { font-family: -apple-system, system-ui, sans-serif; padding: 20px; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 22px; font-weight: bold; color: #047857; margin: 0; }
          .details { font-size: 13px; color: #64748b; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
          th { background: #0f172a; color: #fff; padding: 8px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          .total-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 14px; }
          .total-row { display: flex; justify-content: space-between; margin: 4px 0; }
          .grand { font-size: 18px; font-weight: bold; color: #047857; }
          .upi-box { text-align: center; border: 1.5px dashed #059669; background: #f0fdf4; border-radius: 8px; padding: 12px; margin-top: 16px; }
          .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${shopDetails.name}</h1>
          <p class="details">${shopDetails.address} | Phone: ${shopDetails.phone}</p>
          <p class="details"><b>Invoice:</b> ${sale.invoiceNumber} | <b>Date:</b> ${sale.date}</p>
          <p class="details"><b>Customer:</b> ${sale.customerName}</p>
        </div>
        <table>
          <thead>
            <tr><th>Item</th><th style="text-align:right">Qty (kg)</th><th style="text-align:right">Rate (₹)</th><th style="text-align:right">Total (₹)</th></tr>
          </thead>
          <tbody>
            ${sale.items.map((i, idx) => `<tr><td>${idx + 1}. ${i.vegName}</td><td style="text-align:right">${Number(i.quantity).toFixed(2)}</td><td style="text-align:right">₹${Number(i.pricePerKg).toFixed(1)}</td><td style="text-align:right">₹${Number(i.total).toFixed(1)}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="total-box">
          <div class="total-row grand"><span>GRAND TOTAL:</span><span>₹${Number(sale.totalAmount).toFixed(1)}</span></div>
          <div class="total-row"><span>Amount Paid:</span><span>₹${Number(sale.amountPaid).toFixed(1)}</span></div>
          ${balanceDue > 0 ? `<div class="total-row" style="color:#e11d48;font-weight:bold"><span>Balance Due:</span><span>₹${balanceDue.toFixed(1)}</span></div>` : `<div class="total-row" style="color:#047857;font-weight:bold"><span>Status:</span><span>PAID IN FULL</span></div>`}
        </div>
        ${upiId && qrCodeDataUrl ? `
          <div class="upi-box">
            <p style="font-size: 12px; font-weight: bold; color: #047857; margin: 0 0 6px 0; text-transform: uppercase;">⚡ Scan & Pay via UPI (₹${payableAmount.toFixed(1)})</p>
            <img src="${qrCodeDataUrl}" alt="UPI QR" style="width: 125px; height: 125px; background: #fff; padding: 4px; border: 1px solid #cbd5e1; border-radius: 6px;" />
            <p style="font-size: 11px; font-weight: 600; color: #334155; margin: 4px 0 0 0; font-family: monospace;">UPI ID: ${upiId}</p>
            <p style="font-size: 9px; color: #64748b; margin: 2px 0 0 0;">Accepts Google Pay, PhonePe, Paytm, BHIM</p>
          </div>
        ` : ''}
        <div class="footer">Thank you for your purchase! Buy Fresh, Eat Healthy!</div>
      </body>
      </html>
    `;


    // 1. Android APK Native Print Bridge Hook
    try {
      if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'PRINT',
            html: printHtml,
          })
        );
        return;
      }
    } catch (err) {
      console.warn('Native print bridge error:', err);
    }

    // 2. Browser Print Popup / window.print
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
        return;
      }
    } catch (e) {
      console.warn('Print popup blocked, falling back to window.print():', e);
    }

    window.print();
  };

  // Instant 1-Tap Screenshot Generator & Preview
  const handleTakeScreenshot = async () => {
    setCapturing(true);
    setCaptureError(null);

    try {
      const canvasPng = await renderInvoiceToCanvas(sale, shopDetails, language);
      if (canvasPng && canvasPng.startsWith('data:image/png')) {
        setCapturedImage(canvasPng);
      } else {
        throw new Error('Canvas render failed');
      }
    } catch (err) {
      console.error('Screenshot generation failed:', err);
      setCaptureError(
        language === 'mr'
          ? 'स्क्रीनशॉट घेण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा.'
          : 'Failed to take screenshot. Please try again.'
      );
    } finally {
      setCapturing(false);
    }
  };

  // Share Image directly via Native Mobile Share Sheet / WhatsApp
  const handleDirectShareImage = async () => {
    try {
      const imgData = await getOrGenerateImage();
      if (!imgData) return;

      const filename = `Invoice-${sale.invoiceNumber}.png`;

      // 1. Android APK Native Bridge Hook
      if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'SHARE_FILE',
            dataUrl: imgData,
            filename: filename,
            title: `Invoice ${sale.invoiceNumber}`,
          })
        );
        return;
      }

      // 2. Mobile Browser Web Share API
      const blob = dataUrlToBlob(imgData);
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${sale.invoiceNumber}`,
        });
        return;
      }

      // 3. Fallback: Copy image to clipboard and open WhatsApp
      await handleCopyImageToClipboard();
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber ? `91${whatsappNumber}` : ''}&text=${getWhatsAppText()}`;
      window.open(whatsappUrl, '_blank');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Share error:', err);
      }
    }
  };

  // Copy Image to Clipboard
  const handleCopyImageToClipboard = async () => {
    try {
      const imgData = await getOrGenerateImage();
      if (!imgData) return;

      const blob = dataUrlToBlob(imgData);
      if (navigator.clipboard && (window as any).ClipboardItem) {
        const item = new (window as any).ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setImageCopied(true);
        setTimeout(() => setImageCopied(false), 2500);
        if (showAlert) {
          showAlert(
            language === 'mr' ? 'इमेज कॉपी झाली!' : 'Image Copied!',
            language === 'mr' ? 'बिल इमेज क्लिपबोर्डवर कॉपी झाली. तुम्ही थेट व्हॉट्सॲपवर पेस्ट करू शकता.' : 'Invoice image copied to clipboard. You can paste it directly into WhatsApp.'
          );
        }
      }
    } catch (err) {
      console.warn('Clipboard write image failed:', err);
    }
  };

  // Copy Formatted Text to Clipboard
  const copyToClipboard = () => {
    const itemsText = sale.items
      .map((item, idx) => `${idx + 1}. ${item.vegName} - ${item.quantity}kg @ ₹${item.pricePerKg}/kg = ₹${item.total}`)
      .join('\n');

    const invoiceText = `
🧾 *${shopDetails.name.toUpperCase()}*
📍 ${shopDetails.address}
📞 ${shopDetails.phone}
---------------------------------
*Invoice:* ${sale.invoiceNumber}
*Date:* ${sale.date}
*Customer:* ${sale.customerName}
---------------------------------
*Items:*
${itemsText}
---------------------------------
*Grand Total:* ₹${sale.totalAmount}
*Amount Paid:* ₹${sale.amountPaid}
${balanceDue > 0 ? `*Balance Due:* ₹${balanceDue}` : '*Status:* PAID IN FULL ✅'}
*Payment Mode:* ${(sale.paymentMethod || 'cash').toUpperCase()}
${shopDetails.upiId ? `---------------------------------\n📲 *Pay via UPI:* ${shopDetails.upiId}\n*Amount Payable:* ₹${payableAmount.toFixed(1)}` : ''}
---------------------------------
Thank you for your purchase! 🍅🥬
`.trim();

    navigator.clipboard.writeText(invoiceText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      if (showAlert) {
        showAlert(
          language === 'mr' ? 'मजकूर कॉपी झाला!' : 'Text Copied!',
          language === 'mr' ? 'बिल तपशील क्लिपबोर्डवर कॉपी झाले.' : 'Bill summary copied to clipboard.'
        );
      }
    });
  };

  const getWhatsAppText = () => {
    const itemsText = sale.items
      .map((item, idx) => `${idx + 1}. ${item.vegName} - ${item.quantity}kg @ ₹${item.pricePerKg}/kg = ₹${item.total}`)
      .join('%0A');

    const upiText = shopDetails.upiId 
      ? `%0A---------------------------------%0A📲 *Pay via UPI:* ${encodeURIComponent(shopDetails.upiId)}%0A⚡ *Pay Amount:* ₹${payableAmount.toFixed(1)}`
      : '';

    return `🧾 *${encodeURIComponent(shopDetails.name.toUpperCase())}*%0A📍 ${encodeURIComponent(shopDetails.address)}%0A📞 ${encodeURIComponent(shopDetails.phone)}%0A---------------------------------%0A*Invoice:* ${sale.invoiceNumber}%0A*Date:* ${sale.date}%0A*Customer:* ${encodeURIComponent(sale.customerName)}%0A---------------------------------%0A*Items:*%0A${itemsText}%0A---------------------------------%0A*Grand Total:* ₹${sale.totalAmount}%0A*Amount Paid:* ₹${sale.amountPaid}%0A${balanceDue > 0 ? `*Balance Due:* ₹${balanceDue}` : '*Status:* PAID IN FULL ✅'}%0A*Payment Mode:* ${(sale.paymentMethod || 'cash').toUpperCase()}${upiText}%0A---------------------------------%0AThank you for your purchase! 🍅🥬`;
  };

  return (
    <>
      <motion.div
        key="invoice-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/60 backdrop-blur-xs flex items-start justify-center"
      >
        {/* Animated Card Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-4 sm:my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50 no-print">
            <div>
              <h3 className="font-display font-semibold text-lg text-slate-800">
                {language === 'mr' ? 'ग्राहक बिल / बीजक' : 'Client Invoice'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">{sale.invoiceNumber}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-200 text-slate-400 hover:text-slate-600 transition cursor-pointer select-none active:scale-95 touch-manipulation"
              title="Close"
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>
          </div>

          {/* Invoice container */}
          <div className="flex-1 p-4 sm:p-6 bg-slate-100/50">
            <div 
              ref={invoiceRef}
              id="invoice-print-area" 
              className="bg-white text-slate-900 font-sans p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto printable-invoice"
            >
              {/* Receipt Header Box */}
              <div className="text-center p-4 rounded-xl bg-slate-50/90 border border-slate-200 mb-4">
                {shopDetails.logo && (shopDetails.logo.startsWith('data:image') || shopDetails.logo.startsWith('http')) ? (
                  <div className="flex justify-center mb-2.5">
                    <img
                      src={shopDetails.logo}
                      alt={shopDetails.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl shadow-xs bg-white p-1 border border-slate-200"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <span className="inline-flex text-3xl mb-1 select-none">{shopDetails.logo || '🥬'}</span>
                )}
                <h1 className="font-display font-bold text-xl text-slate-900 tracking-tight">{shopDetails.name}</h1>
                <p className="text-xs text-slate-600 mt-1">{shopDetails.address}</p>
                <p className="text-xs text-slate-600 font-medium mt-0.5">Mob: {shopDetails.phone}</p>
                {shopDetails.gstin && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">GSTIN: {shopDetails.gstin}</p>
                )}
              </div>

              {/* Meta information Card */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-dashed border-slate-300 bg-white mb-4 text-xs">
                <div className="pr-2">
                  <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    {language === 'mr' ? 'ग्राहक:' : 'INVOICE TO:'}
                  </p>
                  <p className="font-bold text-slate-900 text-sm mt-1 leading-snug">{sale.customerName}</p>
                  {sale.customerPhone && (
                    <p className="text-slate-600 font-mono text-xs mt-0.5">{sale.customerPhone}</p>
                  )}
                </div>
                <div className="text-right pl-2 border-l border-slate-100">
                  <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    {language === 'mr' ? 'बिल तपशील:' : 'INVOICE DETAILS:'}
                  </p>
                  <p className="font-bold text-slate-900 mt-1 font-mono text-xs tracking-tight">{sale.invoiceNumber}</p>
                  <p className="text-slate-600 font-mono text-xs mt-0.5">
                    {language === 'mr' ? 'तारीख:' : 'Date:'} {sale.date}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-4 rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 uppercase font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-7 text-center">#</th>
                      <th className="py-2.5 px-3">{t('veg_name') || 'Vegetable'}</th>
                      <th className="py-2.5 px-3 text-right">{t('rate_header') || 'Price/kg'}</th>
                      <th className="py-2.5 px-3 text-right w-16">{t('qty_kg_header') || 'Qty (kg)'}</th>
                      <th className="py-2.5 px-3 text-right">{t('amount_header') || 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-800 bg-white">
                    {sale.items.map((item, index) => (
                      <tr key={`invoice-item-${item.id || 'item'}-${item.vegName || ''}-${index}`} className="align-middle">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-sans text-xs">{index + 1}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                          <span className="mr-1.5">{item.vegEmoji}</span>
                          {t(item.vegName)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">₹{Number(item.pricePerKg).toFixed(1)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">{Number(item.quantity).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-950">₹{Number(item.total).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs flex flex-col gap-2 font-mono mb-4">
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>{t('subtotal') || 'Subtotal'}</span>
                  <span className="font-mono font-semibold">₹{Number(sale.totalAmount).toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>{language === 'mr' ? 'सवलत (सूट)' : 'Discount'}</span>
                  <span className="font-mono font-semibold">₹0.0</span>
                </div>
                <div className="flex justify-between font-bold text-slate-950 text-sm border-t border-slate-200/80 pt-2 font-sans">
                  <span>{language === 'mr' ? 'एकूण देय रक्कम (GRAND TOTAL)' : 'GRAND TOTAL'}</span>
                  <span className="font-mono text-base text-emerald-700">₹{Number(sale.totalAmount).toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium font-sans border-t border-slate-200/50 pt-1.5">
                  <span>{t('paid_amt') || 'Amount Paid'}</span>
                  <span className="font-mono font-semibold">₹{Number(sale.amountPaid).toFixed(1)}</span>
                </div>
                
                {balanceDue > 0 ? (
                  <div className="flex justify-between text-rose-600 font-bold border-t border-rose-200/80 border-dashed pt-2 mt-1 font-sans">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      {t('bal_due') || 'Pending Balance'}
                    </span>
                    <span className="font-mono text-sm">₹${balanceDue.toFixed(1)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-emerald-700 font-bold border-t border-emerald-200/80 border-dashed pt-2 mt-1 font-sans items-center">
                    <span>{language === 'mr' ? 'पेमेंट स्थिती' : 'Payment Status'}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-bold">PAID</span>
                  </div>
                )}
              </div>

              {/* UPI QR Payment Card (if UPI ID is configured in settings) */}
              {upiId && qrCodeDataUrl && (
                <div className="p-4 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/70 text-center mb-4 flex flex-col items-center shadow-xs">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
                    <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600 animate-pulse" />
                    <span>{language === 'mr' ? '⚡ स्कॅन करून UPI द्वारे पैसे भरा' : '⚡ Scan & Pay via UPI'}</span>
                  </div>

                  {/* QR Image Container */}
                  <div className="p-2.5 bg-white rounded-xl shadow-xs border border-emerald-200 mb-2">
                    <img
                      src={qrCodeDataUrl}
                      alt="UPI Payment QR Code"
                      className="w-36 h-36 sm:w-40 sm:h-40 object-contain mx-auto"
                    />
                  </div>

                  {/* Amount Badge */}
                  <div className="inline-flex items-center gap-1 bg-emerald-700 text-white font-mono font-bold text-xs px-3 py-1 rounded-full shadow-xs mb-1.5">
                    <span>{language === 'mr' ? 'देय रक्कम:' : 'Pay Amount:'}</span>
                    <span>₹{payableAmount.toFixed(1)}</span>
                  </div>

                  {/* Payee Info & Quick Copy */}
                  <div className="flex items-center justify-center gap-1.5 text-slate-700 font-mono text-[11px] font-semibold mt-1">
                    <span>UPI: {upiId}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (upiId) {
                          navigator.clipboard.writeText(upiId);
                          setUpiCopied(true);
                          setTimeout(() => setUpiCopied(false), 2000);
                        }
                      }}
                      className="text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer flex items-center gap-0.5"
                      title="Copy UPI ID"
                    >
                      {upiCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span className="font-sans text-[9px]">{upiCopied ? (language === 'mr' ? 'कॉपी!' : 'Copied!') : (language === 'mr' ? 'कॉपी' : 'Copy')}</span>
                    </button>
                  </div>

                  {shopDetails.upiName && (
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                      Payee: {shopDetails.upiName}
                    </p>
                  )}

                  {/* Supported UPI Apps Badges */}
                  <div className="mt-2.5 pt-2 border-t border-emerald-200/80 w-full flex items-center justify-center flex-wrap gap-1.5 text-[9px] text-emerald-900 font-bold">
                    <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">Google Pay</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">PhonePe</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">Paytm</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">BHIM</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">Cred</span>
                  </div>
                </div>
              )}

              {/* Method and Notes Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800">{language === 'mr' ? 'पेमेंट मोड:' : 'Payment Mode:'}</span>
                  <span className="uppercase font-mono font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md text-xs border border-slate-200">
                    {sale.paymentMethod === 'cash' ? (language === 'mr' ? 'रोख (CASH)' : 'CASH') : sale.paymentMethod === 'upi' ? 'UPI' : (language === 'mr' ? 'उधारी (CREDIT)' : 'CREDIT')}
                  </span>
                </div>
                {sale.notes && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900">
                    <span className="font-bold">{t('notes') || 'Notes:'}</span> {sale.notes}
                  </div>
                )}
                
                <div className="text-center mt-6 text-slate-400 italic text-[11px] font-sans">
                  {language === 'mr' ? 'आमच्याकडून खरेदी केल्याबद्दल धन्यवाद! ताजी खा, निरोगी रहा!' : 'Thank you for shopping with us! Buy Fresh, Eat Healthy!'}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions (Direct 1-Tap Mobile Actions) */}
          <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex flex-col gap-2.5 no-print">
            
            {/* Primary Action Buttons (Print, Screenshot) */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-3 rounded-xl transition text-xs shadow-md cursor-pointer select-none active:scale-95 touch-manipulation"
                title="Print or Save as PDF"
              >
                <Printer className="w-4 h-4 pointer-events-none" />
                <span className="text-xs leading-tight">{language === 'mr' ? 'प्रिंट / PDF' : 'Print / PDF'}</span>
              </button>

              <button
                onClick={handleTakeScreenshot}
                disabled={capturing}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3 px-3 rounded-xl transition text-xs shadow-md cursor-pointer select-none active:scale-95 touch-manipulation"
                title="Preview & Screenshot Bill"
              >
                <Camera className="w-4 h-4 pointer-events-none" />
                <span className="text-xs leading-tight">
                  {capturing 
                    ? (language === 'mr' ? 'तयार करत आहे...' : 'Loading...') 
                    : (language === 'mr' ? 'स्क्रीनशॉट' : 'Screenshot')}
                </span>
              </button>
            </div>

            {captureError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-rose-600 text-[11px] font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{captureError}</span>
              </div>
            )}

            {/* WhatsApp Share Banner */}
            <div className="bg-emerald-50/55 border border-emerald-100 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  {t('share_receipt_whatsapp')}
                </span>
                {sale.customerPhone && (
                  <span className="text-[9px] bg-emerald-100/80 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full">
                    {t('whatsapp_linked')}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-mono font-bold">+91</span>
                  <input
                    type="tel"
                    placeholder={language === 'mr' ? 'व्हाट्सएप नंबर टाका' : 'Enter WhatsApp Number'}
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full text-xs font-mono border border-slate-200 focus:border-emerald-500 focus:outline-hidden pl-10 pr-2 py-2 bg-white rounded-lg font-semibold text-slate-700"
                  />
                </div>
                
                <a
                  href={`https://api.whatsapp.com/send?phone=${whatsappNumber ? `91${whatsappNumber}` : ''}&text=${getWhatsAppText()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition cursor-pointer select-none active:scale-95 touch-manipulation shadow-xs"
                  title="Share invoice directly to WhatsApp"
                >
                  <Send className="w-3.5 h-3.5 pointer-events-none" />
                  <span>{t('send_whatsapp')}</span>
                </a>
              </div>
            </div>

            {/* Bottom Utility Buttons */}
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className={`flex-1 flex items-center justify-center gap-1.5 border font-semibold py-2.5 px-3 rounded-xl transition text-xs cursor-pointer select-none active:scale-95 touch-manipulation ${
                  copied 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-white border-gray-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Copy formatted invoice text"
              >
                {copied ? <Check className="w-4 h-4 pointer-events-none" /> : <Copy className="w-4 h-4 pointer-events-none" />}
                <span>{copied ? t('copied_msg') : t('copy_receipt_text')}</span>
              </button>

              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl transition text-xs cursor-pointer select-none active:scale-95 touch-manipulation"
                title="Close bill modal"
              >
                <X className="w-4 h-4 text-slate-500 pointer-events-none" />
                <span>{t('close_bill')}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Captured Image Screenshot Preview Overlay (Guaranteed to work in ALL Android WebViews) */}
      {capturedImage && (
        <div key="captured-image-overlay" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm no-print">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 flex flex-col items-center text-center gap-3.5"
          >
            {/* Top-Right 'X' Close Button */}
            <button
              onClick={() => setCapturedImage(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer select-none active:scale-95 touch-manipulation"
              title={language === 'mr' ? 'बंद करा' : 'Close'}
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>

            <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-2xl mt-1">
              📸
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-800 text-base flex items-center justify-center gap-1.5">
                <span>{language === 'mr' ? 'स्क्रीनशॉट तयार आहे!' : 'Bill Image Ready!'}</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                {language === 'mr' 
                  ? 'फोटो सेव्ह करण्यासाठी खालील इमेज दाबून धरा (Long Press).'
                  : 'Tap below to copy, or tap & hold (long press) image to save to gallery.'}
              </p>
            </div>
            
            {/* Captured preview img - LONG PRESS TO SAVE */}
            <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 max-h-60 overflow-y-auto w-full flex justify-center shadow-inner">
              <img 
                src={capturedImage} 
                alt="Captured Invoice - Long Press to Save" 
                className="max-w-full h-auto object-contain rounded-lg shadow-xs"
              />
            </div>

            {/* Instruction Banner */}
            <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-2 text-[10.5px] text-amber-900 font-medium flex items-center justify-center gap-1.5">
              <span>👆</span>
              <span>
                {language === 'mr' 
                  ? 'फोनमध्ये सेव्ह करण्यासाठी फोटोवर बोट दाबून धरा (Long Press)' 
                  : 'Long-press on image to Save to Phone Photos / Gallery'}
              </span>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 w-full mt-1">
              {/* Direct Anchor Download Link for Browsers that support it */}
              <a
                href={capturedImage}
                download={`Invoice-${sale.invoiceNumber}.png`}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-2.5 px-2 rounded-xl transition text-center flex flex-col items-center justify-center gap-1 cursor-pointer select-none active:scale-95 touch-manipulation shadow-xs"
                title="Download Bill Image"
              >
                <Download className="w-4 h-4 pointer-events-none" />
                <span>{language === 'mr' ? 'डाउनलोड' : 'Download'}</span>
              </a>
              
              <button
                onClick={handleCopyImageToClipboard}
                className={`border font-bold text-[11px] py-2.5 px-2 rounded-xl transition text-center flex flex-col items-center justify-center gap-1 cursor-pointer select-none active:scale-95 touch-manipulation shadow-xs ${
                  imageCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Copy Image to Clipboard"
              >
                {imageCopied ? <Check className="w-4 h-4 text-emerald-600 pointer-events-none" /> : <ImageIcon className="w-4 h-4 pointer-events-none" />}
                <span>{imageCopied ? (language === 'mr' ? 'कॉपी!' : 'Copied!') : (language === 'mr' ? 'कॉपी इमेज' : 'Copy Image')}</span>
              </button>

              <button
                onClick={handleDirectShareImage}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] py-2.5 px-2 rounded-xl transition text-center flex flex-col items-center justify-center gap-1 cursor-pointer select-none active:scale-95 touch-manipulation shadow-xs"
                title="Share Bill Image"
              >
                <Share2 className="w-4 h-4 pointer-events-none" />
                <span>{language === 'mr' ? 'शेअर' : 'Share'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
