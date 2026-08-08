import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Share2, Check, Copy, AlertCircle, Camera, Download, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Sale } from '../types';
import { useState, useRef } from 'react';
import { useLanguage } from '../lib/translations';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';

interface InvoiceModalProps {
  sale: Sale | null;
  onClose: () => void;
  shopDetails?: {
    name: string;
    address: string;
    phone: string;
    gstin?: string;
    logo?: string;
  };
}

// Convert base64 dataUrl to Blob for reliable mobile download & sharing
const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export default function InvoiceModal({ 
  sale, 
  onClose,
  shopDetails = {
    name: 'Fresh Farms Vegetable Mart',
    address: 'Shop No. 4, Green Market, Sector 15, City - 400012',
    phone: '+91 98765 43210',
    gstin: '27AAAAA1111A1Z1'
  }
}: InvoiceModalProps) {
  const { t, language } = useLanguage();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState(() => {
    const cleaned = (sale ? (sale.customerPhone || '') : '').replace(/\D/g, '');
    return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
  });

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  // Robust, multi-engine screenshot capture
  const handleTakeScreenshot = async () => {
    const element = invoiceRef.current;
    if (!element) return;

    setCapturing(true);
    setCaptureError(null);
    setCapturedImage(null);

    try {
      // Small pause to allow layout & font rendering to settle
      await new Promise((resolve) => setTimeout(resolve, 120));

      let dataUrl: string | null = null;

      // Primary engine: html2canvas with optimal options (ignores cross-origin font bugs)
      try {
        const canvas = await html2canvas(element, {
          scale: 2, // High resolution crisp image
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: element.scrollWidth || 600,
          windowHeight: element.scrollHeight || 800,
        });
        dataUrl = canvas.toDataURL('image/png', 1.0);
      } catch (h2cError) {
        console.warn('html2canvas capture failed, trying toPng fallback:', h2cError);
      }

      // Secondary engine fallback: html-to-image toPng (with skipFonts to bypass CORS font errors)
      if (!dataUrl) {
        dataUrl = await toPng(element, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
          cacheBust: false,
        });
      }

      if (dataUrl) {
        setCapturedImage(dataUrl);
      } else {
        throw new Error('Screenshot engine produced empty image');
      }
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      setCaptureError(
        language === 'mr'
          ? 'स्क्रीनशॉट घेण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा किंवा प्रिंट/PDF वापरा.'
          : 'Failed to take screenshot. Please try again or use Print / PDF.'
      );
    } finally {
      setCapturing(false);
    }
  };

  // Cross-device mobile download handler using Blob
  const handleDownloadCapturedImage = () => {
    if (!capturedImage) return;
    try {
      const blob = dataUrlToBlob(capturedImage);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Invoice-${sale.invoiceNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      const a = document.createElement('a');
      a.href = capturedImage;
      a.download = `Invoice-${sale.invoiceNumber}.png`;
      a.click();
    }
  };

  // Direct clipboard copy of the PNG image
  const handleCopyImageToClipboard = async () => {
    if (!capturedImage) return;
    try {
      const blob = dataUrlToBlob(capturedImage);
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setImageCopied(true);
        setTimeout(() => setImageCopied(false), 2500);
        return;
      }
    } catch (err) {
      console.warn('Clipboard image write failed:', err);
    }
    // Fallback: copy text receipt if image copy is restricted
    copyToClipboard();
  };

  // Cross-device mobile share handler (Web Share API with fallback)
  const handleShareCapturedImage = async () => {
    if (!capturedImage) return;

    try {
      const blob = dataUrlToBlob(capturedImage);
      const file = new File([blob], `Invoice-${sale.invoiceNumber}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Invoice - ${sale.invoiceNumber}`,
          text: `Invoice ${sale.invoiceNumber} from ${shopDetails.name}`,
          files: [file],
        });
        return;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.log('Native image share failed or cancelled', err);
    }

    // Fallback to WhatsApp share
    const targetPhone = whatsappNumber ? `91${whatsappNumber}` : '';
    const text = getWhatsAppText();
    window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${text}`, '_blank');
  };

  const getWhatsAppText = () => {
    let text = `*${(shopDetails.name === 'Fresh Farms Vegetable Mart' ? t('app_title') : shopDetails.name).toUpperCase()}*\n`;
    text += `${shopDetails.address}\n`;
    text += `${t('phone')} ${shopDetails.phone}\n`;
    text += `------------------------------------\n`;
    text += `*${t('invoice_no')}:* ${sale.invoiceNumber}\n`;
    text += `*${t('date')}:* ${sale.date}\n`;
    text += `*${t('customer')}:* ${sale.customerName === 'Walk-in Customer' ? t('walk_in_customer') : sale.customerName}\n`;
    if (sale.customerPhone) {
      text += `*${t('phone')}:* ${sale.customerPhone}\n`;
    }
    text += `------------------------------------\n`;
    
    sale.items.forEach((item, index) => {
      text += `${index + 1}. ${item.vegEmoji} ${t(item.vegName)}: ${item.quantity} kg x ₹${item.pricePerKg} = ₹${item.total}\n`;
    });
    
    text += `------------------------------------\n`;
    text += `*${t('subtotal')}: ₹${sale.totalAmount}*\n`;
    text += `*${t('paid_amt')}: ₹${sale.amountPaid}*\n`;
    
    const balance = sale.totalAmount - sale.amountPaid;
    if (balance > 0) {
      text += `*${t('bal_due')}: ₹${balance}* (Credit/Pending)\n`;
    } else {
      text += `*${t('payment')}:* PAID ✅\n`;
    }
    
    text += `------------------------------------\n`;
    text += `${t('thank_you')} 🥬🥦🍅`;
    return encodeURIComponent(text);
  };

  const copyToClipboard = () => {
    const text = decodeURIComponent(getWhatsAppText());
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const balanceDue = sale.totalAmount - sale.amountPaid;

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
          {/* Header (Hidden during Print) */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50 no-print">
            <div>
              <h3 className="font-display font-semibold text-lg text-slate-800">
                {language === 'mr' ? 'ग्राहक बिल / बीजक' : 'Client Invoice'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">{sale.invoiceNumber}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Invoice container */}
          <div className="flex-1 p-4 sm:p-6 bg-slate-100/50">
            {/* Printable Area with generous internal padding and direct React ref */}
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
                        <td className="py-2.5 px-3 text-right text-slate-700">₹{item.pricePerKg.toFixed(1)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">{item.quantity.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-950">₹{item.total.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs flex flex-col gap-2 font-mono mb-4">
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>{t('subtotal') || 'Subtotal'}</span>
                  <span className="font-mono font-semibold">₹{sale.totalAmount.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>{language === 'mr' ? 'सवलत (सूट)' : 'Discount'}</span>
                  <span className="font-mono font-semibold">₹0.0</span>
                </div>
                <div className="flex justify-between font-bold text-slate-950 text-sm border-t border-slate-200/80 pt-2 font-sans">
                  <span>{language === 'mr' ? 'एकूण देय रक्कम (GRAND TOTAL)' : 'GRAND TOTAL'}</span>
                  <span className="font-mono text-base text-emerald-700">₹{sale.totalAmount.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium font-sans border-t border-slate-200/50 pt-1.5">
                  <span>{t('paid_amt') || 'Amount Paid'}</span>
                  <span className="font-mono font-semibold">₹{sale.amountPaid.toFixed(1)}</span>
                </div>
                
                {balanceDue > 0 ? (
                  <div className="flex justify-between text-rose-600 font-bold border-t border-rose-200/80 border-dashed pt-2 mt-1 font-sans">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      {t('bal_due') || 'Pending Balance'}
                    </span>
                    <span className="font-mono text-sm">₹{balanceDue.toFixed(1)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-emerald-700 font-bold border-t border-emerald-200/80 border-dashed pt-2 mt-1 font-sans items-center">
                    <span>{language === 'mr' ? 'पेमेंट स्थिती' : 'Payment Status'}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-bold">PAID</span>
                  </div>
                )}
              </div>

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
                
                {/* Footer Message */}
                <div className="text-center mt-6 text-slate-400 italic text-[11px] font-sans">
                  {language === 'mr' ? 'आमच्याकडून खरेदी केल्याबद्दल धन्यवाद! ताजी खा, निरोगी रहा!' : 'Thank you for shopping with us! Buy Fresh, Eat Healthy!'}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions (Hidden during Print) */}
          <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex flex-col gap-2.5 no-print">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-3 rounded-xl transition text-xs shadow-md cursor-pointer"
                title={language === 'mr' ? 'प्रिंट काढा किंवा पीडीएफ जतन करा' : 'Print or Save as PDF'}
              >
                <Printer className="w-4.5 h-4.5" />
                <span className="text-xs sm:text-sm">{language === 'mr' ? 'प्रिंट / PDF' : 'Print / Save PDF'}</span>
              </button>

              <button
                onClick={handleTakeScreenshot}
                disabled={capturing}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-3 rounded-xl transition text-xs shadow-md cursor-pointer"
                title={language === 'mr' ? 'बिलाचा स्क्रीनशॉट घ्या' : 'Take Screenshot of Bill'}
              >
                <Camera className="w-4.5 h-4.5" />
                <span className="text-xs sm:text-sm">
                  {capturing 
                    ? (language === 'mr' ? 'स्क्रीनशॉट...' : 'Capturing...') 
                    : (language === 'mr' ? 'स्क्रीनशॉट घ्या' : 'Take Screenshot')}
                </span>
              </button>
            </div>

            {captureError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-rose-600 text-[11px] font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{captureError}</span>
              </div>
            )}

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
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
                  title="Share invoice directly to WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{t('send_whatsapp')}</span>
                </a>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className={`flex-1 flex items-center justify-center gap-2 border font-medium py-2.5 px-4 rounded-xl transition text-xs cursor-pointer ${
                  copied 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-white border-gray-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Copy formatted invoice text for clipboard sharing"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('copied_msg') : t('copy_receipt_text')}
              </button>

              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl transition text-xs cursor-pointer"
                title="Close bill modal"
              >
                <X className="w-4 h-4 text-slate-500" />
                {t('close_bill')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Captured Image Screenshot Preview Overlay */}
      {capturedImage && (
        <div key="captured-image-overlay" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm no-print">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center gap-4"
          >
            {/* Top-Right 'X' Close Button */}
            <button
              onClick={() => setCapturedImage(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title={language === 'mr' ? 'बंद करा' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-2xl mt-1">
              📸
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-800 text-base flex items-center justify-center gap-1.5">
                <span>{language === 'mr' ? 'स्क्रीनशॉट तयार आहे!' : 'Screenshot Ready!'}</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {language === 'mr' 
                  ? 'इथून डाउनलोड करा, इमेज कॉपी करा किंवा थेट शेअर करा.'
                  : 'Download, copy image to clipboard, or share directly.'}
              </p>
            </div>
            
            {/* Captured preview img */}
            <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 max-h-64 overflow-y-auto w-full flex justify-center shadow-inner">
              <img 
                src={capturedImage} 
                alt="Captured Invoice" 
                className="max-w-full h-auto object-contain rounded-lg shadow-xs"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 w-full mt-1">
              <button
                onClick={handleDownloadCapturedImage}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-2.5 px-2 rounded-xl transition text-center flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xs"
                title={language === 'mr' ? 'बिल डाउनलोड करा' : 'Download Bill Image'}
              >
                <Download className="w-4 h-4" />
                <span>{language === 'mr' ? 'डाउनलोड' : 'Download'}</span>
              </button>
              
              <button
                onClick={handleCopyImageToClipboard}
                className={`border font-bold text-[11px] py-2.5 px-2 rounded-xl transition text-center flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xs ${
                  imageCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title={language === 'mr' ? 'इमेज क्लिपबोर्डवर कॉपी करा' : 'Copy Image to Clipboard'}
              >
                {imageCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <ImageIcon className="w-4 h-4" />}
                <span>{imageCopied ? (language === 'mr' ? 'कॉपी झाले!' : 'Copied!') : (language === 'mr' ? 'कॉपी इमेज' : 'Copy Image')}</span>
              </button>

              <button
                onClick={handleShareCapturedImage}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] py-2.5 px-2 rounded-xl transition text-center flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xs"
                title={language === 'mr' ? 'बिल शेअर करा' : 'Share Bill Image'}
              >
                <Share2 className="w-4 h-4" />
                <span>{language === 'mr' ? 'शेअर' : 'Share'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
