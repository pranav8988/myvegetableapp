import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Share2, Check, Copy, AlertCircle, Camera } from 'lucide-react';
import { Sale } from '../types';
import { useState } from 'react';
import { useLanguage } from '../lib/translations';
import { toPng } from 'html-to-image';

interface InvoiceModalProps {
  sale: Sale | null;
  onClose: () => void;
  shopDetails?: {
    name: string;
    address: string;
    phone: string;
    gstin?: string;
  };
}

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
  const [copied, setCopied] = useState(false);
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

  const handleTakeScreenshot = async () => {
    const element = document.getElementById('print-area');
    if (!element) return;

    setCapturing(true);
    setCaptureError(null);
    setCapturedImage(null);

    try {
      // Small delay to let rendering settle
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(element, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      setCapturedImage(dataUrl);
      setCapturing(false);
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      setCaptureError(
        language === 'mr'
          ? 'स्क्रीनशॉट घेण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा.'
          : 'Failed to take screenshot. Please try again.'
      );
      setCapturing(false);
    }
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
              <h3 className="font-display font-semibold text-lg text-slate-800">Client Invoice</h3>
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
          <div className="flex-1 p-6">
            {/* Printable Area */}
            <div id="print-area" className="bg-white text-slate-900 font-sans p-2">
              {/* Receipt Header */}
              <div className="text-center pb-6 border-b border-dashed border-gray-300">
                <span className="inline-flex text-3xl mb-1">🥬</span>
                <h1 className="font-display font-bold text-xl text-slate-800 tracking-tight">{shopDetails.name}</h1>
                <p className="text-xs text-slate-500 mt-1">{shopDetails.address}</p>
                <p className="text-xs text-slate-500">Mob: {shopDetails.phone}</p>
                {shopDetails.gstin && (
                  <p className="text-xs text-slate-400 font-mono mt-0.5">GSTIN: {shopDetails.gstin}</p>
                )}
              </div>

              {/* Meta information */}
              <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-dashed border-gray-200">
                <div>
                  <p className="text-gray-400 font-medium">{language === 'mr' ? 'ग्राहक:' : 'INVOICE TO:'}</p>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5">{sale.customerName}</p>
                  {sale.customerPhone && (
                    <p className="text-slate-500 font-mono">{sale.customerPhone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-gray-400 font-medium">{language === 'mr' ? 'बिल तपशील:' : 'INVOICE DETAILS:'}</p>
                  <p className="font-semibold text-slate-800 mt-0.5 font-mono">{sale.invoiceNumber}</p>
                  <p className="text-slate-500 font-mono">{language === 'mr' ? 'तारीख:' : 'Date:'} {sale.date}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 uppercase font-semibold">
                      <th className="pb-2 w-8">#</th>
                      <th className="pb-2">{t('veg_name') || 'Vegetable'}</th>
                      <th className="pb-2 text-right">{t('rate_header') || 'Price/kg'}</th>
                      <th className="pb-2 text-right w-16">{t('qty_kg_header') || 'Qty (kg)'}</th>
                      <th className="pb-2 text-right">{t('amount_header') || 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono text-slate-700">
                    {sale.items.map((item, index) => (
                      <tr key={`invoice-item-${item.id || 'item'}-${item.vegName || ''}-${index}`} className="align-middle">
                        <td className="py-2.5 text-slate-400">{index + 1}</td>
                        <td className="py-2.5 font-sans font-medium text-slate-950">
                          <span className="mr-1">{item.vegEmoji}</span>
                          {t(item.vegName)}
                        </td>
                        <td className="py-2.5 text-right">₹{item.pricePerKg.toFixed(1)}</td>
                        <td className="py-2.5 text-right">{item.quantity.toFixed(2)}</td>
                        <td className="py-2.5 text-right font-semibold text-slate-900">₹{item.total.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation */}
              <div className="border-t border-dashed border-gray-300 pt-4 text-xs flex flex-col gap-1.5 font-mono">
                <div className="flex justify-between text-gray-500">
                  <span>{t('subtotal') || 'Subtotal'}</span>
                  <span>₹{sale.totalAmount.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>{language === 'mr' ? 'सवलत (सूट)' : 'Discount'}</span>
                  <span>₹0.0</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-950 text-sm border-t border-gray-100 pt-1.5">
                  <span>{language === 'mr' ? 'एकूण देय रक्कम (GRAND TOTAL)' : 'GRAND TOTAL'}</span>
                  <span>₹{sale.totalAmount.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>{t('paid_amt') || 'Amount Paid'}</span>
                  <span>₹{sale.amountPaid.toFixed(1)}</span>
                </div>
                
                {balanceDue > 0 ? (
                  <div className="flex justify-between text-rose-500 font-semibold border-t border-red-50 border-dashed pt-1 mt-1">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {t('bal_due') || 'Pending Balance'}
                    </span>
                    <span>₹{balanceDue.toFixed(1)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-emerald-600 font-semibold border-t border-emerald-50 border-dashed pt-1 mt-1">
                    <span>{language === 'mr' ? 'पेमेंट स्थिती' : 'Payment Status'}</span>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-sm text-[10px] tracking-wider uppercase">PAID</span>
                  </div>
                )}
              </div>

              {/* Method and Notes */}
              <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-500">
                <p>
                  <span className="font-semibold text-slate-700">{language === 'mr' ? 'पेमेंट मोड:' : 'Payment Mode:'}</span>{' '}
                  <span className="uppercase font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                    {sale.paymentMethod === 'cash' ? (language === 'mr' ? 'रोख (CASH)' : 'cash') : sale.paymentMethod === 'upi' ? 'UPI' : (language === 'mr' ? 'उधारी (CREDIT)' : 'credit')}
                  </span>
                </p>
                {sale.notes && (
                  <p className="mt-2 bg-amber-50/50 p-2 rounded text-amber-800">
                    <span className="font-semibold">{t('notes') || 'Notes:'}</span> {sale.notes}
                  </p>
                )}
                
                {/* Footer Message */}
                <div className="text-center mt-8 text-gray-400 italic text-[10px]">
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

      {/* Captured Image Preview Overlay */}
      {capturedImage && (
        <div key="captured-image-overlay" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm no-print">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-2xl">
              📸
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-800 text-base">
                {language === 'mr' ? 'स्क्रीनशॉट तयार आहे!' : 'Screenshot Ready!'}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {language === 'mr' 
                  ? 'सुरक्षा कारणांमुळे ऑटो-डाउनलोड न झाल्यास, खालील प्रतिमेवर जास्त वेळ दाबून ठेवा (मोबाईल) किंवा उजवे-क्लिक (माउस) करून जतन करा.'
                  : 'If the automatic download did not trigger, you can long-press (mobile) or right-click (desktop) the image below to save it.'}
              </p>
            </div>
            
            {/* Captured preview img */}
            <div className="border border-slate-100 rounded-lg p-2 bg-slate-50 max-h-64 overflow-y-auto w-full flex justify-center">
              <img 
                src={capturedImage} 
                alt="Captured Invoice" 
                className="max-w-full h-auto object-contain rounded shadow-xs"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex gap-2 w-full mt-2">
              <a
                href={capturedImage}
                download={`Invoice-${sale.invoiceNumber}.png`}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>💾 {language === 'mr' ? 'डाउनलोड करा' : 'Download Now'}</span>
              </a>
              <button
                onClick={() => setCapturedImage(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-3 rounded-xl transition cursor-pointer"
              >
                {language === 'mr' ? 'बंद करा' : 'Close'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
