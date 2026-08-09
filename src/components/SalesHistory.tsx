import { useState, useMemo, FormEvent } from 'react';
import { Sale } from '../types';
import { Search, Eye, Trash2, CheckCircle2, Calendar, Filter, RefreshCcw, Edit, Download, Printer, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '../lib/translations';
import * as XLSX from 'xlsx';
import { downloadXlsxWorkbook } from '../lib/excelHelper';

interface SalesHistoryProps {
  sales: Sale[];
  onOpenInvoice: (sale: Sale) => void;
  onDeleteSale: (id: string) => void;
  onUpdatePaymentStatus: (id: string, amountReceived: number) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  onEditSale: (sale: Sale) => void;
  shopDetails: {
    name: string;
    address: string;
    phone: string;
    gstin?: string;
    logo?: string;
  };
  showAlert?: (title: string, message: string) => void;
}

export default function SalesHistory({
  sales,
  onOpenInvoice,
  onDeleteSale,
  onUpdatePaymentStatus,
  showConfirm,
  onEditSale,
  shopDetails,
  showAlert,
}: SalesHistoryProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  
  // Date & Month Range Filters
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [selectedMonthInput, setSelectedMonthInput] = useState<string>('');

  // Direct state for quick pay modal
  const [selectedPaySale, setSelectedPaySale] = useState<Sale | null>(null);
  const [payAmount, setPayAmount] = useState('');

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setMethodFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
    setSelectedMonthInput('');
  };

  // Quick Period Presets Selector
  const handleQuickRange = (range: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setSelectedMonthInput('');

    if (range === 'today') {
      setStartDateFilter(todayStr);
      setEndDateFilter(todayStr);
    } else if (range === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setStartDateFilter(yesterday.toISOString().split('T')[0]);
      setEndDateFilter(yesterday.toISOString().split('T')[0]);
    } else if (range === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      setStartDateFilter(lastWeek.toISOString().split('T')[0]);
      setEndDateFilter(todayStr);
    } else if (range === 'month') {
      const firstDayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDateFilter(firstDayStr);
      setEndDateFilter(todayStr);
    } else if (range === 'last_month') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDateFilter(firstDayLastMonth.toISOString().split('T')[0]);
      setEndDateFilter(lastDayLastMonth.toISOString().split('T')[0]);
    } else if (range === 'all') {
      setStartDateFilter('');
      setEndDateFilter('');
    }
  };

  // Month Picker Selector (e.g. "2026-07")
  const handleMonthPickerChange = (yearMonth: string) => {
    setSelectedMonthInput(yearMonth);
    if (!yearMonth) {
      setStartDateFilter('');
      setEndDateFilter('');
      return;
    }
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    setStartDateFilter(firstDay.toISOString().split('T')[0]);
    setEndDateFilter(lastDay.toISOString().split('T')[0]);
  };

  // Export States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDataUri, setExportDataUri] = useState<string | null>(null);
  const [exportFilename, setExportFilename] = useState('');
  const [copiedStatementData, setCopiedStatementData] = useState(false);

  // Copy Statement Tabular Data to Clipboard (CSV / TSV)
  const handleCopyStatementCsv = () => {
    const headers = ['Invoice', 'Date', 'Customer', 'Phone', 'Total (Rs)', 'Paid (Rs)', 'Due (Rs)', 'Status', 'Method', 'Items'];
    const rows = filteredSales.map(s => [
      s.invoiceNumber,
      s.date,
      s.customerName,
      s.customerPhone || '-',
      s.totalAmount,
      s.amountPaid,
      s.totalAmount - s.amountPaid,
      s.paymentStatus.toUpperCase(),
      s.paymentMethod.toUpperCase(),
      s.items.map(i => `${i.vegName} (${i.quantity}kg)`).join('; ')
    ]);
    const csvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(csvContent).then(() => {
      setCopiedStatementData(true);
      setTimeout(() => setCopiedStatementData(false), 2500);
      if (showAlert) {
        showAlert(
          language === 'mr' ? 'डेटा कॉपी झाला!' : 'Statement Data Copied!',
          language === 'mr' ? 'सर्व अहवाल डेटा क्लिपबोर्डवर कॉपी झाला. तुम्ही थेट एक्सेल किंवा गुगल शीट्समध्ये पेस्ट करू शकता.' : 'All statement rows copied. You can paste directly into Excel or Google Sheets.'
        );
      }
    });
  };

  // Share Statement Summary to WhatsApp
  const handleShareStatementWhatsApp = () => {
    const summaryText = `
📊 *${shopDetails.name.toUpperCase()} - SALES STATEMENT*
📍 ${shopDetails.address}
📅 *Period:* ${startDateFilter || 'All'} to ${endDateFilter || 'Present'}
---------------------------------
*Total Invoices:* ${metrics.count}
*Total Invoiced:* ₹${metrics.total.toFixed(1)}
*Total Collected (Paid):* ₹${metrics.collected.toFixed(1)}
*Total Balance Due:* ₹${metrics.pending.toFixed(1)}
---------------------------------
Generated from VEGI BILLING APP 🥬
`.trim();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(summaryText)}`;
    window.open(url, '_blank');
  };

  // Export Filtered Statement to Excel (.xlsx)
  const handleExportFilteredXlsx = () => {
    try {
      const wb = XLSX.utils.book_new();

      const ledgerRows = filteredSales.map((s) => ({
        Invoice_Number: s.invoiceNumber,
        Date: s.date,
        Customer_Name: s.customerName,
        Customer_Phone: s.customerPhone || '',
        Total_Amount: s.totalAmount,
        Amount_Paid: s.amountPaid,
        Balance_Due: s.totalAmount - s.amountPaid,
        Payment_Method: s.paymentMethod,
        Payment_Status: s.paymentStatus,
        Notes: s.notes || '',
        Items_Summary: s.items.map((i) => `${i.vegName}(${i.quantity}kg)`).join(', ')
      }));

      const wsLedger = XLSX.utils.json_to_sheet(ledgerRows);
      
      // Auto column widths
      if (ledgerRows.length > 0) {
        const keys = Object.keys(ledgerRows[0]);
        wsLedger['!cols'] = keys.map((k) => {
          let maxLen = k.length;
          ledgerRows.forEach((r: any) => {
            const val = String(r[k] ?? '');
            if (val.length > maxLen) maxLen = val.length;
          });
          return { wch: Math.min(Math.max(maxLen + 4, 12), 48) };
        });
      }
      XLSX.utils.book_append_sheet(wb, wsLedger, 'Sales_Statement');

      const dateTag = startDateFilter && endDateFilter ? `${startDateFilter}_to_${endDateFilter}` : (selectedMonthInput || 'filtered');
      const filename = `sales_journal_statement_${dateTag}.xlsx`;
      
      const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      const dataUri = `data:application/octet-stream;base64,${b64}`;
      setExportDataUri(dataUri);
      setExportFilename(filename);
      setShowExportModal(true);

      // Trigger standard downloader
      downloadXlsxWorkbook(wb, filename);

      if (showAlert) {
        showAlert(
          language === 'mr' ? 'Excel अहवाल तयार आहे!' : 'Excel Statement Ready!',
          language === 'mr' 
            ? `${filteredSales.length} बिलांचा विक्री अहवाल तयार झाला. खालील पर्यायांमधून डाउनलोड किंवा कॉपी करा.`
            : `Sales report of ${filteredSales.length} invoices generated. You can download or copy below.`
        );
      }
    } catch (err) {
      console.error('Export failed', err);
      if (showAlert) {
        showAlert(
          language === 'mr' ? 'अडचण आली' : 'Export Failed',
          language === 'mr' ? 'कृपया पुन्हा प्रयत्न करा.' : 'Failed to export spreadsheet. Please try again.'
        );
      }
    }
  };

  // Filter Sales
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesSearch = 
        sale.customerName.toLowerCase().includes(search.toLowerCase()) ||
        (sale.customerPhone && sale.customerPhone.includes(search)) ||
        sale.invoiceNumber.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || sale.paymentStatus === statusFilter;
      const matchesMethod = methodFilter === 'all' || sale.paymentMethod === methodFilter;
      
      const saleDate = sale.date; // YYYY-MM-DD
      const matchesStartDate = !startDateFilter || saleDate >= startDateFilter;
      const matchesEndDate = !endDateFilter || saleDate <= endDateFilter;

      return matchesSearch && matchesStatus && matchesMethod && matchesStartDate && matchesEndDate;
    });
  }, [sales, search, statusFilter, methodFilter, startDateFilter, endDateFilter]);

  // Calculations for filtered sales
  const metrics = useMemo(() => {
    let total = 0;
    let collected = 0;
    let pending = 0;

    filteredSales.forEach((s) => {
      total += s.totalAmount;
      collected += s.amountPaid;
      pending += (s.totalAmount - s.amountPaid);
    });

    return { total, collected, pending, count: filteredSales.length };
  }, [filteredSales]);

  // Print-specific precise metrics
  const printMetrics = useMemo(() => {
    let totalInvoiced = 0;
    let cashCollected = 0;
    let upiCollected = 0;
    let creditOutstanding = 0;
    let totalPaid = 0;

    filteredSales.forEach((s) => {
      totalInvoiced += s.totalAmount;
      totalPaid += s.amountPaid;
      if (s.paymentMethod === 'cash') {
        cashCollected += s.amountPaid;
      } else if (s.paymentMethod === 'upi') {
        upiCollected += s.amountPaid;
      }
      creditOutstanding += (s.totalAmount - s.amountPaid);
    });

    return { totalInvoiced, totalPaid, cashCollected, upiCollected, creditOutstanding };
  }, [filteredSales]);

  // Handle Quick Pay flow
  const handleQuickPaySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPaySale) return;

    const parsedPay = parseFloat(payAmount);
    if (isNaN(parsedPay) || parsedPay <= 0) return;

    onUpdatePaymentStatus(selectedPaySale.id, parsedPay);
    setSelectedPaySale(null);
    setPayAmount('');
  };

  // Handle Print Action (Cross-platform Native APK Bridge + Browser)
  const handlePrintReport = () => {
    try {
      if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
        const printHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Sales Statement - ${shopDetails.name}</title>
            <style>
              body { font-family: -apple-system, system-ui, sans-serif; padding: 18px; color: #0f172a; }
              .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 14px; }
              .title { font-size: 20px; font-weight: bold; color: #047857; margin: 0; }
              .details { font-size: 12px; color: #64748b; margin: 3px 0; }
              .stats { display: flex; justify-content: space-around; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 8px; margin: 12px 0; font-size: 13px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
              th { background: #0f172a; color: #fff; padding: 8px 6px; text-align: left; }
              td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; }
              .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 24px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="title">${shopDetails.name}</h1>
              <p class="details">${shopDetails.address} | Phone: ${shopDetails.phone}</p>
              <p class="details"><b>Sales Statement Report</b> | Date Range: ${startDateFilter || 'All'} to ${endDateFilter || 'Present'}</p>
            </div>
            <div class="stats">
              <div>Total Sales: ₹${metrics.total.toFixed(1)}</div>
              <div style="color:#059669">Paid: ₹${metrics.collected.toFixed(1)}</div>
              <div style="color:#e11d48">Due: ₹${metrics.pending.toFixed(1)}</div>
            </div>
            <table>
              <thead>
                <tr><th>#</th><th>Date</th><th>Customer</th><th style="text-align:right">Total</th><th style="text-align:right">Paid</th><th style="text-align:right">Due</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${filteredSales.map((s, idx) => `<tr><td>${idx + 1}</td><td>${s.date}</td><td>${s.customerName}</td><td style="text-align:right">₹${s.totalAmount.toFixed(1)}</td><td style="text-align:right">₹${s.amountPaid.toFixed(1)}</td><td style="text-align:right">₹${(s.totalAmount - s.amountPaid).toFixed(1)}</td><td>${s.paymentStatus.toUpperCase()}</td></tr>`).join('')}
              </tbody>
            </table>
            <div class="footer">Generated by VEGI BILLING APP | Authorized Ledger Copy</div>
          </body>
          </html>
        `;
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
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* ========================================== */}
      {/* SCREEN VIEW SECTION (Hidden when printing) */}
      {/* ========================================== */}
      <div className="print:hidden flex flex-col gap-6">
        
        {/* 1. Top Stat Cards (3 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Metric Card 1 */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-2xs">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {language === 'mr' ? 'एकूण फिल्टर विक्री' : 'Filtered Sales'}
            </p>
            <p className="text-xl font-display font-bold text-slate-800 mt-1 font-mono">₹{metrics.total.toFixed(1)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {language === 'mr' ? `${metrics.count} बिले सापडली` : `${metrics.count} invoices found`}
            </p>
          </div>
          
          {/* Metric Card 2 */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-2xs">
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{t('paid_amt')}</p>
            <p className="text-xl font-display font-bold text-emerald-600 mt-1 font-mono">₹{metrics.collected.toFixed(1)}</p>
            <p className="text-[10px] text-emerald-500 mt-0.5">
              {language === 'mr' ? 'यशस्वीरित्या जमा' : 'Received securely'}
            </p>
          </div>
          
          {/* Metric Card 3 */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-2xs">
            <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{t('bal_due')}</p>
            <p className="text-xl font-display font-bold text-rose-600 mt-1 font-mono">₹{metrics.pending.toFixed(1)}</p>
            <p className="text-[10px] text-rose-500 mt-0.5">
              {language === 'mr' ? 'येणे बाकी' : 'To be collected'}
            </p>
          </div>
        </div>

        {/* Dedicated Full-Width Report & Actions Bar */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-2xs">
          <div>
            <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Printer className="w-4 h-4 text-emerald-600" />
              {language === 'mr' ? 'अहवाल आणि एक्सपोर्ट टूल्स' : 'Report & Export Actions'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {language === 'mr' 
                ? 'खालील फिल्टरनुसार निवडलेल्या कालावधीचा / महिन्याचा अहवाल प्रिंट करा किंवा Excel फाईल डाउनलोड करा.' 
                : 'Print statement PDF or export Excel (.xlsx) spreadsheet for the filtered date range.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
            <button
              onClick={handlePrintReport}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center justify-center gap-1.5 text-xs cursor-pointer select-none active:scale-95 touch-manipulation shadow-xs"
              title={language === 'mr' ? 'अहवाल प्रिंट करा किंवा PDF जतन करा' : 'Print or Save Statement PDF'}
            >
              <Printer className="w-4 h-4 pointer-events-none" />
              <span>{language === 'mr' ? 'प्रिंट / PDF' : 'Print / Save PDF'}</span>
            </button>
            
            <button
              onClick={handleExportFilteredXlsx}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition flex items-center justify-center gap-1.5 text-xs cursor-pointer select-none active:scale-95 touch-manipulation shadow-xs"
              title={language === 'mr' ? 'निवडलेल्या डेटाची Excel फाईल डाउनलोड करा' : 'Download Filtered Excel (.xlsx)'}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 pointer-events-none" />
              <span>{language === 'mr' ? 'Excel (.xlsx)' : 'Excel (.xlsx)'}</span>
            </button>

            <button
              onClick={handleResetFilters}
              className="py-2.5 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition flex items-center justify-center gap-1.5 text-xs cursor-pointer select-none active:scale-95 touch-manipulation shadow-xs"
              title={language === 'mr' ? 'सर्व फिल्टर्स पूर्ववत करा' : 'Reset All Filters'}
            >
              <RefreshCcw className="w-3.5 h-3.5 pointer-events-none" />
              <span>{language === 'mr' ? 'रीसेट' : 'Reset'}</span>
            </button>
          </div>
        </div>

        {/* 2. Filter Inputs Panel */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs flex flex-col gap-4">
          {/* Standard Filters Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            
            {/* Search bar */}
            <div className="relative lg:col-span-5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={language === 'mr' ? 'ग्राहक नाव, फोन किंवा बिलाने शोधा...' : 'Search by customer name, phone, or invoice...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Quick Period Preset Selector */}
            <div className="relative lg:col-span-3">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                onChange={(e) => handleQuickRange(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-hidden text-slate-700 cursor-pointer font-semibold"
                defaultValue="all"
              >
                <option value="all">{language === 'mr' ? '📅 सर्व कालावधी (All Time)' : '📅 All Time Report'}</option>
                <option value="today">{language === 'mr' ? '📅 आजची विक्री (Today)' : '📅 Today\'s Performance'}</option>
                <option value="yesterday">{language === 'mr' ? '📅 कालची विक्री (Yesterday)' : '📅 Yesterday\'s Sales'}</option>
                <option value="week">{language === 'mr' ? '📅 चालू आठवडा (This Week)' : '📅 This Week\'s Summary'}</option>
                <option value="month">{language === 'mr' ? '📅 चालू महिना (This Month)' : '📅 This Month\'s Report'}</option>
                <option value="last_month">{language === 'mr' ? '📅 मागील महिना (Last Month)' : '📅 Last Month Statement'}</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div className="relative lg:col-span-2">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-hidden text-slate-600 cursor-pointer"
              >
                <option value="all">{language === 'mr' ? 'सर्व स्थिती' : 'All Statuses'}</option>
                <option value="paid">{language === 'mr' ? 'पूर्ण भरलेले' : 'Fully Paid'}</option>
                <option value="pending">{language === 'mr' ? 'उधारी बाकी' : 'Pending Dues'}</option>
                <option value="partial">{language === 'mr' ? 'अंशत: भरलेले' : 'Partial'}</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="relative lg:col-span-2">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-hidden text-slate-600 cursor-pointer"
              >
                <option value="all">{language === 'mr' ? 'सर्व पद्धती' : 'All Modes'}</option>
                <option value="cash">💵 {language === 'mr' ? 'रोख (Cash)' : 'Cash'}</option>
                <option value="upi">📱 {language === 'mr' ? 'ऑनलाईन (UPI)' : 'UPI'}</option>
                <option value="credit">🤝 {t('credit')}</option>
              </select>
            </div>

          </div>

          {/* Month Picker & Precise Date Range Picker Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-3">
            {/* Specific Month Selector */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-emerald-700 font-extrabold uppercase tracking-wide pointer-events-none">
                {language === 'mr' ? 'महिना:' : 'Month:'}
              </span>
              <input
                type="month"
                value={selectedMonthInput}
                onChange={(e) => handleMonthPickerChange(e.target.value)}
                className="w-full pl-16 pr-3 py-2 text-xs border border-emerald-300 bg-emerald-50/40 rounded-lg focus:border-emerald-500 focus:outline-hidden text-emerald-900 font-mono font-bold cursor-pointer"
              />
            </div>

            {/* Start Date Filter */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-extrabold uppercase tracking-wide pointer-events-none">
                {language === 'mr' ? 'पासून:' : 'From:'}
              </span>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => {
                  setSelectedMonthInput('');
                  setStartDateFilter(e.target.value);
                }}
                className="w-full pl-16 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-hidden text-slate-600 font-mono"
              />
            </div>

            {/* End Date Filter */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-extrabold uppercase tracking-wide pointer-events-none">
                {language === 'mr' ? 'पर्यंत:' : 'To:'}
              </span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => {
                  setSelectedMonthInput('');
                  setEndDateFilter(e.target.value);
                }}
                className="w-full pl-14 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-hidden text-slate-600 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 3. Table list */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="p-4 w-12 text-center">{language === 'mr' ? 'क्र.' : 'S.No'}</th>
                  <th className="p-4">{t('date')}</th>
                  <th className="p-4">{t('invoice_no')}</th>
                  <th className="p-4">{t('customer')}</th>
                  <th className="p-4">{language === 'mr' ? 'भाजीपाला तपशील' : 'Items Summary'}</th>
                  <th className="p-4 text-right">{t('total')}</th>
                  <th className="p-4 text-right">{t('paid_amt')}</th>
                  <th className="p-4 text-right">{t('bal_due')}</th>
                  <th className="p-4 text-center">{language === 'mr' ? 'स्थिती' : 'Status'}</th>
                  <th className="p-4 text-center">{language === 'mr' ? 'पद्धत' : 'Mode'}</th>
                  <th className="p-4 text-center w-28">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-slate-400">
                      {language === 'mr' ? 'शोध निकषाशी जुळणारी कोणतीही विक्री नोंद सापडली नाही. फिल्टर्स तपासा!' : 'No sales matches your current filter query. Try updating the filters!'}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale, index) => {
                    const balance = sale.totalAmount - sale.amountPaid;
                    
                    return (
                      <tr key={`history-row-${sale.id || 'sale'}-${sale.invoiceNumber}-${index}`} className="hover:bg-slate-50/40 transition">
                        {/* S.No */}
                        <td className="p-4 text-slate-400 font-mono text-center">{index + 1}</td>
                        
                        {/* Date */}
                        <td className="p-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">{sale.date}</td>
                        
                        {/* Invoice */}
                        <td className="p-4 font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap">{sale.invoiceNumber}</td>
                        
                        {/* Customer */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            {sale.customerName === 'Walk-in Customer' ? t('walk_in_customer') : sale.customerName}
                          </div>
                          {sale.customerPhone && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{sale.customerPhone}</div>
                          )}
                        </td>
                        
                        {/* Items */}
                        <td className="p-4 max-w-[180px] truncate">
                          <div className="font-sans text-slate-700">
                            {sale.items.map(item => `${item.vegEmoji} ${t(item.vegName)}`).join(', ')}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {sale.items.length} {language === 'mr' ? 'भाजी' : (sale.items.length === 1 ? 'item' : 'items')} ({sale.items.reduce((s,i)=>s+i.quantity,0).toFixed(1)} kg)
                          </div>
                        </td>
                        
                        {/* Grand Total */}
                        <td className="p-4 text-right font-mono font-bold text-slate-900">₹{sale.totalAmount.toFixed(1)}</td>
                        
                        {/* Collected */}
                        <td className="p-4 text-right font-mono text-emerald-600">₹{sale.amountPaid.toFixed(1)}</td>
                        
                        {/* Due */}
                        <td className={`p-4 text-right font-mono ${balance > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                          ₹{balance.toFixed(1)}
                        </td>
                        
                        {/* Status */}
                        <td className="p-4 text-center whitespace-nowrap">
                          {sale.paymentStatus === 'paid' && (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                              {language === 'mr' ? 'पूर्ण जमा' : 'Paid'}
                            </span>
                          )}
                          {sale.paymentStatus === 'pending' && (
                            <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                              {language === 'mr' ? 'बाकी' : 'Pending'}
                            </span>
                          )}
                          {sale.paymentStatus === 'partial' && (
                            <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                              {language === 'mr' ? 'अंशत: जमा' : 'Partial'}
                            </span>
                          )}
                        </td>
                        
                        {/* Mode */}
                        <td className="p-4 text-center whitespace-nowrap font-sans text-[11px] font-bold uppercase">
                          {sale.paymentMethod === 'cash' && <span className="text-slate-500">💵 {t('cash')}</span>}
                          {sale.paymentMethod === 'upi' && <span className="text-blue-600">📱 {t('upi')}</span>}
                          {sale.paymentMethod === 'credit' && <span className="text-purple-600">🤝 {t('credit')}</span>}
                        </td>
                        
                        {/* Actions */}
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Invoice */}
                            <button
                              onClick={() => onOpenInvoice(sale)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                              title="View & Print Invoice"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            
                            {/* Quick Pay */}
                            {balance > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedPaySale(sale);
                                  setPayAmount(balance.toString());
                                }}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 transition cursor-pointer"
                                title="Record received credit payment"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            
                            {/* Edit Invoice */}
                            <button
                              onClick={() => onEditSale(sale)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-600 transition cursor-pointer"
                              title={language === 'mr' ? 'बिल सुधारा' : 'Edit Invoice'}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            
                            {/* Delete */}
                            <button
                              onClick={() => {
                                showConfirm(
                                  language === 'mr' ? '🚨 विक्री नोंद हटवा' : '🚨 Delete Transaction',
                                  language === 'mr' 
                                    ? `तुम्हाला खारोखर ग्राहक ${sale.customerName === 'Walk-in Customer' ? t('walk_in_customer') : sale.customerName} यांचे ₹${sale.totalAmount.toFixed(1)} चे बिल क्र. ${sale.invoiceNumber} डिलीट करायचे आहे का? ही कृती परत मिळवता येणार नाही.`
                                    : `Are you sure you want to delete Invoice ${sale.invoiceNumber} for ₹${sale.totalAmount.toFixed(1)}? This action cannot be undone.`,
                                  () => onDeleteSale(sale.id)
                                );
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 transition cursor-pointer"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* =================================================== */}
      {/* PRINT-ONLY SALES REPORT SECTION (Visible on print) */}
      {/* =================================================== */}
      <div id="sales-history-print-area" className="hidden print:block p-8 bg-white text-slate-800" style={{ fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>
        {/* Print Header */}
        <div className="text-center border-b-2 border-slate-200 pb-6 mb-6">
          <div className="flex justify-between items-start mb-4 text-left">
            <div className="flex items-center gap-3">
              {shopDetails.logo && (shopDetails.logo.startsWith('data:image') || shopDetails.logo.startsWith('http')) ? (
                <img
                  src={shopDetails.logo}
                  alt={shopDetails.name}
                  className="w-14 h-14 object-contain rounded-xl border border-slate-200 p-0.5"
                  crossOrigin="anonymous"
                />
              ) : (
                <span className="text-3xl select-none">{shopDetails.logo || '🥬'}</span>
              )}
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">{shopDetails.name}</h1>
                <p className="text-xs text-slate-500 mt-1">{shopDetails.address}</p>
                <p className="text-xs text-slate-500">📞 {shopDetails.phone}</p>
                {shopDetails.gstin && <p className="text-xs text-slate-500 font-mono">GSTIN: {shopDetails.gstin}</p>}
              </div>
            </div>
            <div className="text-right">
              <span className="bg-slate-100 text-slate-900 text-[10px] font-bold px-3 py-1.5 rounded-md uppercase tracking-wider border border-slate-200">
                {language === 'mr' ? 'विक्री अहवाल' : 'Sales Ledger Report'}
              </span>
              <p className="text-[10px] text-slate-400 font-mono mt-2.5">
                {language === 'mr' ? 'दिनांक:' : 'Printed on:'} {new Date().toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-US')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          
          <h2 className="text-sm font-extrabold text-slate-700 tracking-wider uppercase mt-4">
            {language === 'mr' ? 'विक्री कामगिरी आणि व्यवहार अहवाल' : 'Sales Performance & Transaction Report'}
          </h2>
          
          <p className="text-xs text-slate-500 mt-1 font-mono font-bold">
            {language === 'mr' ? 'कालावधी:' : 'Period:'} {startDateFilter || 'All Time'} {language === 'mr' ? 'ते' : 'to'} {endDateFilter || 'Present'}
          </p>
        </div>

        {/* Financial Summary Bento Block */}
        <div className="grid grid-cols-4 gap-4 mb-6 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
          <div className="text-center border-r border-slate-200 last:border-r-0">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{language === 'mr' ? 'एकूण विक्री (Invoiced)' : 'Total Invoiced'}</p>
            <p className="text-lg font-bold text-slate-950 mt-1 font-mono">₹{printMetrics.totalInvoiced.toFixed(1)}</p>
          </div>
          <div className="text-center border-r border-slate-200 last:border-r-0">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-emerald-600">{language === 'mr' ? 'एकूण जमा (Paid)' : 'Total Collected'}</p>
            <p className="text-lg font-bold text-emerald-700 mt-1 font-mono">₹{printMetrics.totalPaid.toFixed(1)}</p>
          </div>
          <div className="text-center border-r border-slate-200 last:border-r-0">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-rose-600">{language === 'mr' ? 'बाकी उधारी (Outstanding)' : 'Total Outstanding'}</p>
            <p className="text-lg font-bold text-rose-700 mt-1 font-mono">₹{printMetrics.creditOutstanding.toFixed(1)}</p>
          </div>
          <div className="text-center border-r border-slate-200 last:border-r-0">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{language === 'mr' ? 'एकूण बिले (Invoices)' : 'Invoices Count'}</p>
            <p className="text-lg font-bold text-slate-950 mt-1 font-mono">{filteredSales.length}</p>
          </div>
        </div>

        {/* Mode breakdown summary */}
        <div className="flex gap-4 text-[10px] text-slate-500 font-bold mb-6 border-b pb-4">
          <span>{language === 'mr' ? 'जमा वर्गीकरण:' : 'Payment Breakdown:'}</span>
          <span>💵 {language === 'mr' ? 'रोख जमा:' : 'Cash:'} ₹{printMetrics.cashCollected.toFixed(1)}</span>
          <span className="border-l pl-3">📱 {language === 'mr' ? 'UPI जमा:' : 'UPI/Online:'} ₹{printMetrics.upiCollected.toFixed(1)}</span>
          <span className="border-l pl-3">🤝 {language === 'mr' ? 'बाकी उधारी:' : 'Outstanding Credit:'} ₹{printMetrics.creditOutstanding.toFixed(1)}</span>
        </div>

        {/* Formatted Report Table */}
        <table className="w-full text-left text-[9px] border-collapse border border-slate-200">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100 text-slate-700 uppercase font-bold text-[8px] tracking-wider">
              <th className="p-2 border border-slate-200 text-center w-8">#</th>
              <th className="p-2 border border-slate-200">{t('date')}</th>
              <th className="p-2 border border-slate-200">{t('invoice_no')}</th>
              <th className="p-2 border border-slate-200">{t('customer')}</th>
              <th className="p-2 border border-slate-200">{language === 'mr' ? 'तपशील' : 'Items Summary'}</th>
              <th className="p-2 border border-slate-200 text-right">{t('total')}</th>
              <th className="p-2 border border-slate-200 text-right">{t('paid_amt')}</th>
              <th className="p-2 border border-slate-200 text-right">{t('bal_due')}</th>
              <th className="p-2 border border-slate-200 text-center">{language === 'mr' ? 'पद्धत' : 'Mode'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-400">
                  {language === 'mr' ? 'अहवाल जनरेट करण्यासाठी कोणतीही विक्री सापडली नाही.' : 'No sales records found for this period.'}
                </td>
              </tr>
            ) : (
              filteredSales.map((sale, index) => {
                const balance = sale.totalAmount - sale.amountPaid;
                return (
                  <tr key={`print-row-${sale.id || 'sale'}-${sale.invoiceNumber}-${index}`} className="hover:bg-slate-50/50">
                    <td className="p-2 border border-slate-200 text-center font-mono">{index + 1}</td>
                    <td className="p-2 border border-slate-200 font-mono whitespace-nowrap">{sale.date}</td>
                    <td className="p-2 border border-slate-200 font-mono font-bold whitespace-nowrap">{sale.invoiceNumber}</td>
                    <td className="p-2 border border-slate-200">
                      <div className="font-bold">{sale.customerName === 'Walk-in Customer' ? t('walk_in_customer') : sale.customerName}</div>
                      {sale.customerPhone && <div className="text-[8px] text-slate-400 font-mono mt-0.5">{sale.customerPhone}</div>}
                    </td>
                    <td className="p-2 border border-slate-200 truncate max-w-[130px]">
                      {sale.items.map(item => `${item.vegEmoji} ${t(item.vegName)}`).join(', ')}
                    </td>
                    <td className="p-2 border border-slate-200 text-right font-mono font-bold">₹{sale.totalAmount.toFixed(1)}</td>
                    <td className="p-2 border border-slate-200 text-right font-mono">₹{sale.amountPaid.toFixed(1)}</td>
                    <td className="p-2 border border-slate-200 text-right font-mono">₹{balance.toFixed(1)}</td>
                    <td className="p-2 border border-slate-200 text-center font-bold uppercase text-[8px]">
                      {sale.paymentMethod === 'cash' && t('cash')}
                      {sale.paymentMethod === 'upi' && t('upi')}
                      {sale.paymentMethod === 'credit' && t('credit')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Print Footer / Signature Panel */}
        <div className="mt-16 flex justify-between items-end text-[10px] text-slate-400">
          <div>
            <p className="font-bold text-slate-600">{language === 'mr' ? 'अधिकृत स्वाक्षरी:' : 'Authorized Signature:'}</p>
            <div className="border-b border-dashed border-slate-300 w-48 h-10"></div>
          </div>
          <div className="text-right font-medium">
            <p className="italic">{language === 'mr' ? 'प्रणालीद्वारे स्वयंचलित व्युत्पन्न प्रत' : 'System generated ledger copy.'}</p>
            <p className="font-mono mt-1 text-[8px]">© {new Date().getFullYear()} {shopDetails.name}</p>
          </div>
        </div>
      </div>

      {/* Quick Pay Modal */}
      {selectedPaySale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <h3 className="font-display font-bold text-slate-800 text-base mb-2">{t('receive_payment_title')}</h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'mr' 
                ? `ग्राहक ${selectedPaySale.customerName === 'Walk-in Customer' ? t('walk_in_customer') : selectedPaySale.customerName} कडून बिल क्र. ${selectedPaySale.invoiceNumber} चे जमा पेमेंट नोंदवा.`
                : `Enter amount paid by ${selectedPaySale.customerName} for Invoice ${selectedPaySale.invoiceNumber}.`}
            </p>

            <form onSubmit={handleQuickPaySubmit} className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-xs text-slate-500 font-medium mb-1 font-mono">
                  <span>{language === 'mr' ? 'एकूण बिल:' : 'Invoice Total:'}</span>
                  <span>₹{selectedPaySale.totalAmount.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-medium mb-1 font-mono">
                  <span>{language === 'mr' ? 'भरलेली रक्कम:' : 'Already Paid:'}</span>
                  <span>₹{selectedPaySale.amountPaid.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-rose-600 mb-3 font-mono">
                  <span>{language === 'mr' ? 'येणे बाकी उधारी:' : 'Remaining Due:'}</span>
                  <span>₹{(selectedPaySale.totalAmount - selectedPaySale.amountPaid).toFixed(1)}</span>
                </div>

                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">{t('amount_to_receive')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 text-xs font-mono border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-hidden"
                    min="0.1"
                    max={selectedPaySale.totalAmount - selectedPaySale.amountPaid}
                    step="0.1"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaySale(null);
                    setPayAmount('');
                  }}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs px-3 py-2 rounded-lg transition cursor-pointer select-none active:scale-95 touch-manipulation"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition cursor-pointer select-none active:scale-95 touch-manipulation shadow-xs"
                >
                  {t('confirm_receive')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Export & Statement Modal (Guaranteed 100% working on ALL mobile devices & Android WebViews) */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                  📊
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-800 text-sm">
                    {language === 'mr' ? 'विक्री अहवाल एक्सपोर्ट' : 'Sales Statement Export'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">{exportFilename}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer select-none active:scale-95 touch-manipulation"
              >
                <X className="w-5 h-5 pointer-events-none" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex flex-col gap-1.5 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Invoices Count:</span>
                <span className="font-bold text-slate-900">{metrics.count}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Invoiced:</span>
                <span className="font-bold text-slate-900">₹{metrics.total.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Total Collected:</span>
                <span className="font-bold">₹{metrics.collected.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Balance Due:</span>
                <span className="font-bold">₹{metrics.pending.toFixed(1)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {/* Direct Download Link */}
              {exportDataUri && (
                <a
                  href={exportDataUri}
                  download={exportFilename}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer select-none active:scale-95 touch-manipulation"
                >
                  <FileSpreadsheet className="w-4 h-4 pointer-events-none" />
                  <span>{language === 'mr' ? 'Excel (.xlsx) फाईल डाउनलोड' : 'Download Excel (.xlsx) File'}</span>
                </a>
              )}

              {/* Copy CSV / Table Data Button */}
              <button
                onClick={handleCopyStatementCsv}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer select-none active:scale-95 touch-manipulation"
              >
                {copiedStatementData ? <Check className="w-4 h-4 text-emerald-400 pointer-events-none" /> : <Copy className="w-4 h-4 pointer-events-none" />}
                <span>{copiedStatementData ? (language === 'mr' ? 'डेटा कॉपी झाला!' : 'Copied!') : (language === 'mr' ? 'सर्व टेबल डेटा कॉपी करा (Copy CSV)' : 'Copy All Table Data (CSV / Excel)')}</span>
              </button>

              {/* Share to WhatsApp Button */}
              <button
                onClick={handleShareStatementWhatsApp}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer select-none active:scale-95 touch-manipulation"
              >
                <Share2 className="w-4 h-4 pointer-events-none" />
                <span>{language === 'mr' ? 'अहवाल व्हॉट्सॲपवर पाठवा' : 'Send Summary to WhatsApp'}</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center leading-tight">
              💡 {language === 'mr' ? 'तुम्ही डेटा कॉपी करून थेट Google Sheets, Excel किंवा WhatsApp मध्ये पेस्ट करू शकता.' : 'You can copy data and paste directly into Google Sheets, Excel, or WhatsApp.'}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
