import { useState, useMemo, ChangeEvent } from 'react';
import { Vegetable, Sale, CustomerProfile } from '../types';
import { Download, Users, Calendar, FileText, CheckCircle, Database, Clock, ArrowRight, Share2, Copy, Check, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '../lib/translations';
import * as XLSX from 'xlsx';

interface BackupReportsProps {
  sales: Sale[];
  customerProfiles: CustomerProfile[];
  onBackupFull: () => void;
  onRestoreFull: (e: ChangeEvent<HTMLInputElement>) => void;
  vegetables: Vegetable[];
  shopDetails: { name: string; address?: string; phone?: string; gstin?: string };
  onRestoreDirect: (parsed: any) => boolean;
}

export default function BackupReports({
  sales,
  customerProfiles,
  onBackupFull,
  onRestoreFull,
  vegetables,
  shopDetails,
  onRestoreDirect,
}: BackupReportsProps) {
  const { t, language } = useLanguage();

  // Helper to calculate auto column widths for clean Excel layout
  const applyWorksheetLayout = (ws: XLSX.WorkSheet, data: any[]) => {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0]);
    const colWidths = keys.map((key) => {
      let maxLen = key.length;
      data.forEach((row) => {
        const val = row[key];
        if (val !== undefined && val !== null) {
          const str = String(val);
          if (str.length > maxLen) maxLen = str.length;
        }
      });
      return { wch: Math.min(Math.max(maxLen + 4, 12), 48) };
    });
    ws['!cols'] = colWidths;
  };

  // Full App XLSX Backup Handler
  const handleBackupFullXlsx = () => {
    try {
      const wb = XLSX.utils.book_new();

      const salesData = sales.map((s) => ({
        Invoice_Number: s.invoiceNumber,
        Date: s.date,
        Customer_Name: s.customerName,
        Customer_Phone: s.customerPhone || '',
        Total_Items: s.items.length,
        Total_Amount: s.totalAmount,
        Amount_Paid: s.amountPaid,
        Balance_Due: s.totalAmount - s.amountPaid,
        Payment_Method: s.paymentMethod,
        Payment_Status: s.paymentStatus,
        Notes: s.notes || '',
        Items_Summary: s.items.map((i) => `${i.vegName} (${i.quantity}kg)`).join(', ')
      }));
      const wsSales = XLSX.utils.json_to_sheet(salesData);
      applyWorksheetLayout(wsSales, salesData);
      XLSX.utils.book_append_sheet(wb, wsSales, 'Sales_Ledger');

      const itemsData: any[] = [];
      sales.forEach((s) => {
        s.items.forEach((item) => {
          itemsData.push({
            Invoice_Number: s.invoiceNumber,
            Date: s.date,
            Customer_Name: s.customerName,
            Vegetable_Name: item.vegName,
            Emoji: item.vegEmoji,
            Quantity_Kg: item.quantity,
            Price_Per_Kg: item.pricePerKg,
            Item_Total: item.total
          });
        });
      });
      const wsItems = XLSX.utils.json_to_sheet(itemsData);
      applyWorksheetLayout(wsItems, itemsData);
      XLSX.utils.book_append_sheet(wb, wsItems, 'Sale_Items_Detail');

      const vegData = vegetables.map((v) => ({
        Veg_ID: v.id,
        Vegetable_Name: v.name,
        Emoji: v.imageEmoji,
        Category: v.category,
        Default_Price_Per_Kg: v.defaultPrice
      }));
      const wsVeg = XLSX.utils.json_to_sheet(vegData);
      applyWorksheetLayout(wsVeg, vegData);
      XLSX.utils.book_append_sheet(wb, wsVeg, 'Vegetables_Catalog');

      const custData = customerProfiles.map((c) => ({
        Customer_ID: c.id,
        Customer_Name: c.name,
        Phone_Number: c.phone || '',
        Created_At: c.createdAt
      }));
      const wsCust = XLSX.utils.json_to_sheet(custData);
      applyWorksheetLayout(wsCust, custData);
      XLSX.utils.book_append_sheet(wb, wsCust, 'Customer_Profiles');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `backup_full_store_data_${dateStr}.xlsx`);
    } catch (err) {
      console.error('XLSX export failed', err);
    }
  };
  
  // Full Backup / Restore Copy-Paste States
  const [copiedFullBackup, setCopiedFullBackup] = useState(false);
  const [pasteBackupText, setPasteBackupText] = useState('');
  const [isPasteSectionOpen, setIsPasteSectionOpen] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const getFullBackupObject = () => {
    return {
      vegetables,
      sales,
      customerProfiles,
      shopDetails,
      backupDate: new Date().toISOString(),
      source: "Vegetable Store Manager"
    };
  };

  const handleCopyFullText = () => {
    try {
      const dataStr = JSON.stringify(getFullBackupObject());
      navigator.clipboard.writeText(dataStr);
      setCopiedFullBackup(true);
      setTimeout(() => setCopiedFullBackup(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleShareFullBackup = async () => {
    const dataStr = JSON.stringify(getFullBackupObject());
    const dateStr = new Date().toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-US');
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: language === 'mr' ? `${shopDetails.name} बॅकअप - ${dateStr}` : `${shopDetails.name} Backup - ${dateStr}`,
          text: dataStr,
        });
      } catch (err) {
        // user cancelled or failed, fallback to copy
        handleCopyFullText();
      }
    } else {
      handleCopyFullText();
    }
  };

  const handlePasteRestore = () => {
    setPasteError(null);
    const cleanedText = pasteBackupText.trim();
    if (!cleanedText) {
      setPasteError(language === 'mr' ? 'कृपया बॅकअप मजकूर पेस्ट करा.' : 'Please paste the backup text first.');
      return;
    }

    try {
      const parsed = JSON.parse(cleanedText);
      const success = onRestoreDirect(parsed);
      if (success) {
        setPasteBackupText('');
        setIsPasteSectionOpen(false);
      }
    } catch (err) {
      setPasteError(language === 'mr' ? 'अवैध बॅकअप स्वरूप! कृपया आपण संपूर्ण बॅकअप मजकूर कॉपी केला असल्याची खात्री करा.' : 'Invalid backup format! Please ensure you have copied the complete backup string.');
    }
  };

  // Customer Backup States
  const [selectedCustName, setSelectedCustName] = useState('');
  const [rangeType, setRangeType] = useState<'all' | 'last10' | 'last20' | 'month'>('all');
  const [selectedCustMonth, setSelectedCustMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Monthly Sales Backup States
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // 1. Customer specific sales filtering
  const customerSales = useMemo(() => {
    if (!selectedCustName) return [];
    
    // Find matching profile to check phone
    const profile = customerProfiles.find(p => p.name === selectedCustName);
    
    return sales.filter(s => {
      if (profile && profile.phone) {
        return s.customerName.toLowerCase() === profile.name.toLowerCase() && s.customerPhone === profile.phone;
      }
      return s.customerName.toLowerCase() === selectedCustName.toLowerCase();
    });
  }, [selectedCustName, sales, customerProfiles]);

  // Sliced / filtered sales for customer export
  const customerExportSales = useMemo(() => {
    let list = [...customerSales];
    
    // Sort chronologically (oldest to newest) or newest to oldest. Let's keep newest to oldest, or order by date
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (rangeType === 'last10') {
      return list.slice(0, 10);
    } else if (rangeType === 'last20') {
      return list.slice(0, 20);
    } else if (rangeType === 'month') {
      return list.filter(s => s.date.startsWith(selectedCustMonth));
    }
    return list;
  }, [customerSales, rangeType, selectedCustMonth]);

  // Summary Metrics for Customer Statement Selection
  const custMetrics = useMemo(() => {
    let totalPurchased = 0;
    let totalPaid = 0;
    let totalPending = 0;
    
    customerExportSales.forEach(s => {
      totalPurchased += s.totalAmount;
      totalPaid += s.amountPaid;
      totalPending += (s.totalAmount - s.amountPaid);
    });

    return {
      totalPurchased,
      totalPaid,
      totalPending,
      count: customerExportSales.length
    };
  }, [customerExportSales]);

  // 2. Month-wide sales filtering
  const monthlySales = useMemo(() => {
    if (!selectedMonth) return [];
    return sales.filter(s => s.date.startsWith(selectedMonth));
  }, [selectedMonth, sales]);

  // Monthly Summary metrics
  const monthlyMetrics = useMemo(() => {
    let totalSales = 0;
    let collected = 0;
    let pending = 0;
    let cashSales = 0;
    let upiSales = 0;
    let creditSales = 0;

    monthlySales.forEach(s => {
      totalSales += s.totalAmount;
      collected += s.amountPaid;
      pending += (s.totalAmount - s.amountPaid);
      if (s.paymentMethod === 'cash') cashSales += s.totalAmount;
      else if (s.paymentMethod === 'upi') upiSales += s.totalAmount;
      else if (s.paymentMethod === 'credit') creditSales += s.totalAmount;
    });

    return {
      totalSales,
      collected,
      pending,
      cashSales,
      upiSales,
      creditSales,
      count: monthlySales.length
    };
  }, [monthlySales]);

  // Download utilities
  const handleDownloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Customer Statement states
  const [copiedCustomerTxt, setCopiedCustomerTxt] = useState(false);
  const [copiedCustomerJson, setCopiedCustomerJson] = useState(false);

  // Monthly Sales states
  const [copiedMonthlyTxt, setCopiedMonthlyTxt] = useState(false);
  const [copiedMonthlyJson, setCopiedMonthlyJson] = useState(false);

  // Helper to build customer statement text
  const buildCustomerStatementText = () => {
    if (!selectedCustName) return '';
    
    let text = `==================================================\n`;
    text += language === 'mr' ? `       ग्राहक खाते विवरण आणि बॅकअप\n` : `       CUSTOMER ACCOUNT STATEMENT & BACKUP\n`;
    text += `==================================================\n`;
    text += `${language === 'mr' ? 'ग्राहकाचे नाव' : 'Customer Name'}: ${selectedCustName}\n`;
    const profile = customerProfiles.find(p => p.name === selectedCustName);
    if (profile?.phone) {
      text += `${language === 'mr' ? 'मोबाईल नंबर' : 'Phone Number'} : ${profile.phone}\n`;
    }
    const rangeStr = rangeType === 'all' 
      ? (language === 'mr' ? 'सर्व नोंदी (All Ledger)' : 'All Ledger') 
      : rangeType === 'last10' 
        ? (language === 'mr' ? 'शेवटची १० बिले' : 'Last 10 Bills') 
        : rangeType === 'last20' 
          ? (language === 'mr' ? 'शेवटची २० बिले' : 'Last 20 Bills') 
          : `${language === 'mr' ? 'महिना' : 'Month'}: ${selectedCustMonth}`;
    text += `${language === 'mr' ? 'कालावधी' : 'Export Range'} : ${rangeStr}\n`;
    text += `${language === 'mr' ? 'तारीख' : 'Exported At'}  : ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    text += `==================================================\n\n`;

    customerExportSales.forEach((s, idx) => {
      text += `${idx + 1}. ${language === 'mr' ? 'बिल क्र' : 'Invoice'}: ${s.invoiceNumber} | ${language === 'mr' ? 'दिनांक' : 'Date'}: ${s.date}\n`;
      text += `   ${language === 'mr' ? 'साहित्य' : 'Items'}:\n`;
      s.items.forEach(item => {
        text += `     - ${item.vegEmoji} ${item.vegName}: ${item.quantity.toFixed(2)} kg @ ₹${item.pricePerKg}/kg = ₹${item.total.toFixed(1)}\n`;
      });
      const statusLabel = s.paymentStatus === 'paid' 
        ? (language === 'mr' ? 'पूर्ण जमा' : 'PAID') 
        : s.paymentStatus === 'partial' 
          ? (language === 'mr' ? 'अंशत: जमा' : 'PARTIAL') 
          : (language === 'mr' ? 'उधारी' : 'CREDIT');
      text += `   ${language === 'mr' ? 'एकूण बिल' : 'Total Bill'}: ₹${s.totalAmount.toFixed(1)} | ${language === 'mr' ? 'जमा रक्कम' : 'Paid'}: ₹${s.amountPaid.toFixed(1)} | ${language === 'mr' ? 'शिल्लक' : 'Balance'}: ₹${(s.totalAmount - s.amountPaid).toFixed(1)} (${statusLabel})\n`;
      if (s.notes) {
        text += `   ${language === 'mr' ? 'टीप' : 'Notes'}: ${s.notes}\n`;
      }
      text += `--------------------------------------------------\n`;
    });

    text += `\n==================================================\n`;
    text += language === 'mr' ? `            खाते संक्षेप (SUMMARY)\n` : `            STATEMENT ACCOUNT SUMMARY\n`;
    text += `==================================================\n`;
    text += `${language === 'mr' ? 'एकूण बिले संख्या' : 'Total Bills Count'}  : ${custMetrics.count}\n`;
    text += `${language === 'mr' ? 'एकूण खरेदी रक्कम' : 'Total Purchase Vol'} : ₹${custMetrics.totalPurchased.toFixed(1)}\n`;
    text += `${language === 'mr' ? 'एकूण जमा रक्कम' : 'Total Amount Paid'}  : ₹${custMetrics.totalPaid.toFixed(1)}\n`;
    text += `${language === 'mr' ? 'शिल्लक उधारी' : 'Total Debt Owed'}    : ₹${custMetrics.totalPending.toFixed(1)}\n`;
    text += `==================================================\n`;
    text += language === 'mr' ? `            आमच्याकडून खरेदी केल्याबद्दल धन्यवाद!\n` : `            Thank You For Your Business!\n`;
    text += `==================================================\n`;

    return text;
  };

  // Helper to build monthly sales text
  const buildMonthlySalesText = () => {
    if (!selectedMonth) return '';

    let text = `==================================================\n`;
    text += language === 'mr' ? `          मासिक विक्री अहवाल (MONTHLY LEDGER)\n` : `          MONTHLY SALES STATEMENT LEDGER\n`;
    text += `==================================================\n`;
    text += `${language === 'mr' ? 'महिना' : 'Statement Month'}: ${selectedMonth}\n`;
    text += `${language === 'mr' ? 'दिनांक' : 'Exported At'}    : ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    text += `==================================================\n\n`;

    monthlySales.forEach((s, idx) => {
      text += `${idx + 1}. Inv: ${s.invoiceNumber} | ${language === 'mr' ? 'तारीख' : 'Date'}: ${s.date} | ${language === 'mr' ? 'ग्राहक' : 'Customer'}: ${s.customerName}\n`;
      const modeLabel = s.paymentMethod === 'cash' 
        ? (language === 'mr' ? 'रोख' : 'CASH') 
        : s.paymentMethod === 'upi' 
          ? 'UPI' 
          : (language === 'mr' ? 'उधारी' : 'CREDIT');
      text += `   ${language === 'mr' ? 'बिल रक्कम' : 'Bill Value'}: ₹${s.totalAmount.toFixed(1)} | ${language === 'mr' ? 'जमा' : 'Paid'}: ₹${s.amountPaid.toFixed(1)} | ${language === 'mr' ? 'शिल्लक' : 'Balance'}: ₹${(s.totalAmount - s.amountPaid).toFixed(1)} | ${language === 'mr' ? 'मार्ग' : 'Mode'}: ${modeLabel}\n`;
      text += `   ${language === 'mr' ? 'माल' : 'Items'}: ${s.items.map(item => `${item.vegEmoji}${item.vegName}(${item.quantity}kg)`).join(', ')}\n`;
      text += `--------------------------------------------------\n`;
    });

    text += `\n==================================================\n`;
    text += language === 'mr' ? `             मासिक एकूण संक्षेप (METRICS)\n` : `             MONTHLY CUMULATIVE METRICS\n`;
    text += `==================================================\n`;
    text += `${language === 'mr' ? 'एकूण दिलेली बिले' : 'Total Bills Issued'}  : ${monthlyMetrics.count}\n`;
    text += `${language === 'mr' ? 'एकूण विक्री रक्कम' : 'Total Sales Volume'}  : ₹${monthlyMetrics.totalSales.toFixed(1)}\n`;
    text += `${language === 'mr' ? 'रोख विक्री' : 'Total Cash Billings'} : ₹${monthlyMetrics.cashSales.toFixed(1)}\n`;
    text += `${language === 'mr' ? 'UPI विक्री' : 'Total UPI Billings'}  : ₹${monthlyMetrics.upiSales.toFixed(1)}\n`;
    text += `${language === 'mr' ? 'उधारी विक्री' : 'Total Credit Booked'} : ₹${monthlyMetrics.creditSales.toFixed(1)}\n`;
    text += `${language === 'mr' ? 'रोख जमा रक्कम' : 'Total Realized Cash'} : ₹${monthlyMetrics.collected.toFixed(1)}\n`;
    text += `${language === 'mr' ? 'शिल्लक येणे उधारी' : 'Total Debt Pending'}  : ₹${monthlyMetrics.pending.toFixed(1)}\n`;
    text += `==================================================\n`;

    return text;
  };

  // Generate and Download Customer Statement (JSON)
  const downloadCustomerJson = () => {
    if (!selectedCustName) return;
    const dataObj = {
      customerName: selectedCustName,
      exportRange: rangeType === 'month' ? `Month: ${selectedCustMonth}` : rangeType,
      exportedAt: new Date().toISOString(),
      metrics: {
        totalPurchaseVolume: custMetrics.totalPurchased,
        totalPaid: custMetrics.totalPaid,
        totalPending: custMetrics.totalPending,
        billsCount: custMetrics.count
      },
      sales: customerExportSales
    };
    const safeName = selectedCustName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    handleDownloadJson(dataObj, `backup_${safeName}_statement_${rangeType}.json`);
  };

  // Generate and Download Customer Statement (XLSX)
  const downloadCustomerXlsx = () => {
    if (!selectedCustName) return;
    try {
      const wb = XLSX.utils.book_new();

      const ledgerRows = customerExportSales.map((s) => ({
        Invoice_Number: s.invoiceNumber,
        Date: s.date,
        Customer_Name: s.customerName,
        Total_Amount: s.totalAmount,
        Amount_Paid: s.amountPaid,
        Balance_Due: s.totalAmount - s.amountPaid,
        Payment_Method: s.paymentMethod,
        Payment_Status: s.paymentStatus,
        Notes: s.notes || ''
      }));
      const wsLedger = XLSX.utils.json_to_sheet(ledgerRows);
      applyWorksheetLayout(wsLedger, ledgerRows);
      XLSX.utils.book_append_sheet(wb, wsLedger, 'Customer_Ledger');

      const itemRows: any[] = [];
      customerExportSales.forEach((s) => {
        s.items.forEach((item) => {
          itemRows.push({
            Invoice_Number: s.invoiceNumber,
            Date: s.date,
            Vegetable_Name: item.vegName,
            Emoji: item.vegEmoji,
            Quantity_Kg: item.quantity,
            Price_Per_Kg: item.pricePerKg,
            Item_Total: item.total
          });
        });
      });
      const wsItems = XLSX.utils.json_to_sheet(itemRows);
      applyWorksheetLayout(wsItems, itemRows);
      XLSX.utils.book_append_sheet(wb, wsItems, 'Purchased_Items');

      const safeName = selectedCustName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      XLSX.writeFile(wb, `statement_${safeName}.xlsx`);
    } catch (err) {
      console.error('Customer XLSX export failed', err);
    }
  };

  // Generate and Download Monthly Sales (XLSX)
  const downloadMonthlyXlsx = () => {
    if (!selectedMonth) return;
    try {
      const wb = XLSX.utils.book_new();

      const ledgerRows = monthlySales.map((s) => ({
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
      applyWorksheetLayout(wsLedger, ledgerRows);
      XLSX.utils.book_append_sheet(wb, wsLedger, 'Monthly_Sales');

      const itemRows: any[] = [];
      monthlySales.forEach((s) => {
        s.items.forEach((item) => {
          itemRows.push({
            Invoice_Number: s.invoiceNumber,
            Date: s.date,
            Customer_Name: s.customerName,
            Vegetable_Name: item.vegName,
            Emoji: item.vegEmoji,
            Quantity_Kg: item.quantity,
            Price_Per_Kg: item.pricePerKg,
            Item_Total: item.total
          });
        });
      });
      const wsItems = XLSX.utils.json_to_sheet(itemRows);
      applyWorksheetLayout(wsItems, itemRows);
      XLSX.utils.book_append_sheet(wb, wsItems, 'Monthly_Items');

      XLSX.writeFile(wb, `monthly_sales_${selectedMonth}.xlsx`);
    } catch (err) {
      console.error('Monthly XLSX export failed', err);
    }
  };

  // Generate and Download Customer Statement (TXT)
  const downloadCustomerTxt = () => {
    const text = buildCustomerStatementText();
    if (!text) return;
    const safeName = selectedCustName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    handleDownloadTxt(text, `receipt_ledger_${safeName}_${rangeType}.txt`);
  };

  const handleCopyCustomerTxt = () => {
    const text = buildCustomerStatementText();
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedCustomerTxt(true);
      setTimeout(() => setCopiedCustomerTxt(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareCustomerTxt = async () => {
    const text = buildCustomerStatementText();
    if (!text) return;
    const dateStr = new Date().toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-US');
    if (navigator.share) {
      try {
        await navigator.share({
          title: language === 'mr' ? `${selectedCustName} खाते विवरण - ${dateStr}` : `${selectedCustName} Statement - ${dateStr}`,
          text: text,
        });
      } catch (err) {
        handleCopyCustomerTxt();
      }
    } else {
      handleCopyCustomerTxt();
    }
  };

  const handleCopyCustomerJson = () => {
    if (!selectedCustName) return;
    const dataObj = {
      customerName: selectedCustName,
      exportRange: rangeType === 'month' ? `Month: ${selectedCustMonth}` : rangeType,
      exportedAt: new Date().toISOString(),
      metrics: {
        totalPurchaseVolume: custMetrics.totalPurchased,
        totalPaid: custMetrics.totalPaid,
        totalPending: custMetrics.totalPending,
        billsCount: custMetrics.count
      },
      sales: customerExportSales
    };
    try {
      navigator.clipboard.writeText(JSON.stringify(dataObj, null, 2));
      setCopiedCustomerJson(true);
      setTimeout(() => setCopiedCustomerJson(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Generate and Download Monthly Sales (JSON)
  const downloadMonthlyJson = () => {
    if (!selectedMonth) return;
    const dataObj = {
      month: selectedMonth,
      exportedAt: new Date().toISOString(),
      metrics: {
        totalSalesVolume: monthlyMetrics.totalSales,
        totalCollected: monthlyMetrics.collected,
        totalDebtOutstanding: monthlyMetrics.pending,
        cashSales: monthlyMetrics.cashSales,
        upiSales: monthlyMetrics.upiSales,
        creditSales: monthlyMetrics.creditSales,
        billsCount: monthlyMetrics.count
      },
      sales: monthlySales
    };
    handleDownloadJson(dataObj, `backup_monthly_sales_${selectedMonth}.json`);
  };

  // Generate and Download Monthly Sales (TXT)
  const downloadMonthlyTxt = () => {
    const text = buildMonthlySalesText();
    if (!text) return;
    handleDownloadTxt(text, `monthly_ledger_report_${selectedMonth}.txt`);
  };

  const handleCopyMonthlyTxt = () => {
    const text = buildMonthlySalesText();
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedMonthlyTxt(true);
      setTimeout(() => setCopiedMonthlyTxt(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareMonthlyTxt = async () => {
    const text = buildMonthlySalesText();
    if (!text) return;
    const dateStr = new Date().toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-US');
    if (navigator.share) {
      try {
        await navigator.share({
          title: language === 'mr' ? `मासिक विक्री अहवाल ${selectedMonth} - ${dateStr}` : `Monthly Sales Report ${selectedMonth} - ${dateStr}`,
          text: text,
        });
      } catch (err) {
        handleCopyMonthlyTxt();
      }
    } else {
      handleCopyMonthlyTxt();
    }
  };

  const handleCopyMonthlyJson = () => {
    if (!selectedMonth) return;
    const dataObj = {
      month: selectedMonth,
      exportedAt: new Date().toISOString(),
      metrics: {
        totalSalesVolume: monthlyMetrics.totalSales,
        totalCollected: monthlyMetrics.collected,
        totalDebtOutstanding: monthlyMetrics.pending,
        cashSales: monthlyMetrics.cashSales,
        upiSales: monthlyMetrics.upiSales,
        creditSales: monthlyMetrics.creditSales,
        billsCount: monthlyMetrics.count
      },
      sales: monthlySales
    };
    try {
      navigator.clipboard.writeText(JSON.stringify(dataObj, null, 2));
      setCopiedMonthlyJson(true);
      setTimeout(() => setCopiedMonthlyJson(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: GENERAL INFO & FULL SYSTEM BACKUPS (4 Columns) */}
      <div className="xl:col-span-4 flex flex-col gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          <h3 className="font-display font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            {language === 'mr' ? 'संपूर्ण बॅकअप केंद्र' : 'Full Backup Center'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            {language === 'mr'
              ? 'तुमचा संपूर्ण डेटा (भाजीपाला दर, विक्री नोंदी आणि ग्राहक खाती) सुरक्षित ठेवा. आपण फाईल डाउनलोड करू शकता किंवा मोबाईलसाठी सोयीस्कर कोड कॉपी-पेस्ट वापरू शकता!'
              : 'Maintain local security. Download a complete file of your entire database including vegetable catalog configurations, customers, and sale histories. Restore it anytime.'}
          </p>

          {/* Section A: Standard File Backups */}
          <div className="mb-6">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
              {language === 'mr' ? 'पर्याय १: फाईल बॅकअप (संगणकासाठी उत्तम)' : 'Option 1: File-based Backup (Best for PC)'}
            </h4>
            <div className="flex flex-col gap-2.5">
              {/* Primary Full Excel XLSX Backup */}
              <button
                onClick={handleBackupFullXlsx}
                className="w-full flex items-center justify-between bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-3.5 rounded-xl transition shadow-xs cursor-pointer"
                title="Download complete Excel spreadsheet backup (.xlsx)"
              >
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4" />
                  {language === 'mr' ? 'पूर्ण Excel बॅकअप (.xlsx) डाउनलोड करा' : 'Download Excel Backup (.xlsx)'}
                </span>
                <span className="bg-emerald-700/60 text-[10px] px-2 py-0.5 rounded-full font-mono font-medium">.xlsx</span>
              </button>

              {/* Primary Full JSON Backup */}
              <button
                onClick={onBackupFull}
                className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2.5 px-3.5 rounded-xl transition shadow-xs cursor-pointer"
                title="Download backup file of sales ledger and vegetable configurations"
              >
                <span className="flex items-center gap-1.5">
                  <Download className="w-4 h-4" />
                  {language === 'mr' ? 'पूर्ण बॅकअप फाइल डाउनलोड करा' : 'Download JSON Backup File'}
                </span>
                <span className="bg-slate-700/60 text-[10px] px-2 py-0.5 rounded-full font-mono font-medium">.json</span>
              </button>

              {/* Restore Full Ledger */}
              <label
                className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-2.5 px-3.5 rounded-xl transition cursor-pointer"
                title="Restore whole database from a .json backup file"
              >
                <span className="flex items-center gap-1.5">
                  <Download className="w-4 h-4 transform rotate-180" />
                  {language === 'mr' ? 'फाइलवरून पूर्ण डेटा रिस्टोर करा' : 'Restore from File'}
                </span>
                <span className="bg-slate-200 text-[10px] text-slate-600 px-2 py-0.5 rounded-full font-mono font-medium">Upload</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={onRestoreFull}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <hr className="border-slate-100 my-5" />

          {/* Section B: Mobile-Optimized Backup & Instant Sharing */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {language === 'mr' ? 'पर्याय २: मोबाईल बॅकअप आणि शेअरिंग' : 'Option 2: Mobile Backup & Sharing'}
              </h4>
              <span className="bg-amber-50 text-amber-700 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">
                {language === 'mr' ? 'मोबाईल' : 'Mobile'}
              </span>
            </div>
            
            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              {language === 'mr' 
                ? 'मोबाईलवर फायली शोधणे अवघड असते. खालील बटणे वापरून तुम्ही संपूर्ण डेटा एका सुरक्षित संदेशाच्या (मजकुराच्या) स्वरूपात व्हॉट्सॲपवर पाठवू शकता किंवा नोट्समध्ये लिहून ठेवू शकता.' 
                : 'Finding files on phones can be tricky. Use these instant tools to share your backup direct to WhatsApp/Gmail or copy it as a safe text code.'}
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Copy Backup text code */}
              <button
                type="button"
                onClick={handleCopyFullText}
                className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-3 rounded-xl transition cursor-pointer ${
                  copiedFullBackup 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-inner' 
                    : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs'
                }`}
                title="Copy entire database to clipboard as text"
              >
                {copiedFullBackup ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 animate-bounce" />
                    <span>{language === 'mr' ? 'कॉपी झाले!' : 'Copied Code!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>{language === 'mr' ? 'कोड कॉपी करा' : 'Copy Backup'}</span>
                  </>
                )}
              </button>

              {/* Native mobile sharing */}
              <button
                type="button"
                onClick={handleShareFullBackup}
                className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition cursor-pointer shadow-2xs"
                title="Share full database via WhatsApp, Telegram, Gmail, Keep Notes, etc."
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>{language === 'mr' ? 'शेअर करा' : 'Share Backup'}</span>
              </button>
            </div>

            {/* Expandable Manual Text Paste Restore Section */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsPasteSectionOpen(!isPasteSectionOpen);
                  setPasteError(null);
                }}
                className="w-full flex items-center justify-between text-[11px] text-emerald-600 font-bold hover:text-emerald-700 transition cursor-pointer p-2 bg-emerald-50/40 rounded-lg border border-emerald-100/50"
              >
                <span>
                  {isPasteSectionOpen 
                    ? (language === 'mr' ? '▲ पेस्ट बॉक्स बंद करा' : '▲ Close Paste Box') 
                    : (language === 'mr' ? '▼ मजकूर पेस्ट करून रिस्टोर करा' : '▼ Restore from Copied Text')}
                </span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full uppercase font-semibold">
                  {language === 'mr' ? 'पेस्ट' : 'Paste'}
                </span>
              </button>

              {isPasteSectionOpen && (
                <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3 animate-none">
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-500 leading-normal">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      {language === 'mr'
                        ? 'कृपया तुम्ही आधी कॉपी केलेला सुरक्षित बॅकअप कोड खालील रकान्यात पेस्ट करा आणि तपासणी करा.'
                        : 'Paste the secure backup text code you copied previously into the box below to restore the database.'}
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    value={pasteBackupText}
                    onChange={(e) => {
                      setPasteBackupText(e.target.value);
                      if (pasteError) setPasteError(null);
                    }}
                    placeholder={
                      language === 'mr' 
                        ? 'येथे बॅकअप कोड पेस्ट करा...' 
                        : 'Paste backup text code here...'
                    }
                    className="w-full text-[10px] font-mono border border-slate-200 focus:border-emerald-500 focus:outline-hidden p-2 bg-white rounded-lg resize-none min-h-[90px] shadow-2xs leading-normal"
                  />

                  {pasteError && (
                    <p className="text-[10px] text-rose-500 font-bold font-mono">
                      ⚠️ {pasteError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handlePasteRestore}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{language === 'mr' ? 'तपासा आणि रिस्टोर करा' : 'Verify & Restore'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4 text-[11px] text-slate-400 font-medium flex items-start gap-2">
            <Clock className="w-4 h-4 text-slate-300 shrink-0" />
            <span>
              {language === 'mr'
                ? 'माहिती सुरक्षित ठेवण्यासाठी प्रत्येक आठवड्याच्या शेवटी पूर्ण बॅकअप घेणे योग्य राहील.'
                : 'It is recommended to run a full backup at the end of each business week to secure records.'}
            </span>
          </div>
        </div>

        {/* STATS COUNT */}
        <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 font-display">
            {language === 'mr' ? 'सध्याची चालू आकडेवारी' : 'Current Active Stats'}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <span className="block text-[10px] text-slate-400 font-semibold">
                {language === 'mr' ? 'एकूण बिले संख्या' : 'Total Invoices'}
              </span>
              <span className="text-base font-display font-extrabold text-slate-800 font-mono mt-0.5 block">{sales.length}</span>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <span className="block text-[10px] text-slate-400 font-semibold">
                {language === 'mr' ? 'एकूण ग्राहक प्रोफाइल' : 'Customer Profiles'}
              </span>
              <span className="text-base font-display font-extrabold text-slate-800 font-mono mt-0.5 block">{customerProfiles.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE/RIGHT: CUSTOMER & MONTHLY STATEMENT BACKUPS (8 Columns) */}
      <div className="xl:col-span-8 flex flex-col gap-6">
        
        {/* Card 1: Specific Customer Statements Exporter */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          <h3 className="font-display font-bold text-slate-800 text-base mb-1.5 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            {language === 'mr' ? 'ग्राहक खाते विवरण आणि बॅकअप' : 'Customer Statement & Backup'}
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            {language === 'mr'
              ? 'निवडलेल्या ग्राहकासाठी खरेदी तपशील, दैनिक इतिहास आणि बिलांचा बॅकअप मिळवा.'
              : 'Download purchase statements, history logs, and billing backups for a chosen customer profile.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* Customer Dropdown */}
            <div>
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                {language === 'mr' ? 'ग्राहक प्रोफाइल निवडा' : 'Select Customer Profile'}
              </label>
              <select
                value={selectedCustName}
                onChange={(e) => setSelectedCustName(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-medium"
              >
                <option value="">{language === 'mr' ? '-- ग्राहक प्रोफाइल निवडा --' : '-- Choose Customer Profile --'}</option>
                {customerProfiles.map((p, index) => (
                  <option key={`profile-${p.id || 'cust'}-${p.name}-${index}`} value={p.name}>
                    👤 {p.name} {p.phone ? `(${p.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Range Type */}
            <div>
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                {language === 'mr' ? 'विवरणाचा कालावधी' : 'Statement Range'}
              </label>
              <select
                value={rangeType}
                onChange={(e) => setRangeType(e.target.value as any)}
                className="w-full text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-medium"
                disabled={!selectedCustName}
              >
                <option value="all">{language === 'mr' ? 'पूर्ण खरेदी इतिहास खाते (सर्व बिले)' : 'Full Purchase History Ledger (All Bills)'}</option>
                <option value="last10">{language === 'mr' ? 'शेवटची १० बिले' : 'Last 10 Bills'}</option>
                <option value="last20">{language === 'mr' ? 'शेवटची २० बिले' : 'Last 20 Bills'}</option>
                <option value="month">{language === 'mr' ? 'विशिष्ट महिन्यातील बिले' : 'Bills from Specific Month'}</option>
              </select>
            </div>
          </div>

          {/* Conditional Month Selector */}
          {rangeType === 'month' && selectedCustName && (
            <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl max-w-sm">
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                {language === 'mr' ? 'विवरणाचा महिना निवडा' : 'Choose Statement Month'}
              </label>
              <input
                type="month"
                value={selectedCustMonth}
                onChange={(e) => setSelectedCustMonth(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-white focus:border-emerald-500 focus:outline-hidden p-2 rounded-lg font-mono font-medium"
              />
            </div>
          )}

          {/* Active Statement Summary Preview */}
          {selectedCustName ? (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="text-xs">
                <p className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  {language === 'mr' 
                    ? `"${selectedCustName}" साठी ${custMetrics.count} बिले सापडली` 
                    : `Found ${custMetrics.count} invoices for "${selectedCustName}"`}
                </p>
                <p className="text-[11px] text-slate-500">
                  {language === 'mr' ? 'कालावधी' : 'Range'}: <span className="font-semibold text-slate-600">
                    {rangeType === 'month' 
                      ? `${selectedCustMonth}` 
                      : rangeType === 'all' 
                        ? (language === 'mr' ? 'सर्व नोंदी' : 'Entire Ledger') 
                        : (language === 'mr' ? `शेवटची ${rangeType === 'last10' ? '१०' : '२०'} बिले` : `Last ${rangeType === 'last10' ? '10' : '20'} invoices`)}
                  </span>
                </p>
              </div>

              {custMetrics.count > 0 && (
                <div className="grid grid-cols-3 gap-2 text-right">
                  <div className="bg-white border border-slate-100 px-3 py-1.5 rounded-lg">
                    <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-semibold">
                      {language === 'mr' ? 'एकूण खरेदी' : 'Purchased'}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-slate-800">₹{custMetrics.totalPurchased.toFixed(0)}</span>
                  </div>
                  <div className="bg-white border border-slate-100 px-3 py-1.5 rounded-lg">
                    <span className="block text-[8px] uppercase tracking-wider text-emerald-600 font-semibold">
                      {language === 'mr' ? 'जमा रक्कम' : 'Paid'}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-emerald-600">₹{custMetrics.totalPaid.toFixed(0)}</span>
                  </div>
                  <div className="bg-white border border-slate-100 px-3 py-1.5 rounded-lg">
                    <span className="block text-[8px] uppercase tracking-wider text-rose-600 font-semibold">
                      {language === 'mr' ? 'उर्वरित बाकी' : 'Owed'}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-rose-600">₹{custMetrics.totalPending.toFixed(0)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 mb-5 bg-slate-50/25">
              {language === 'mr'
                ? 'कृपया बॅकअप किंवा खाते विवरण तयार करण्यासाठी वर ग्राहक प्रोफाइल निवडा.'
                : 'Please select a customer profile above to prepare backup files or account statements.'}
            </div>
          )}

          {/* Action Buttons for Customer Statement */}
          {selectedCustName && custMetrics.count > 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                  {language === 'mr' ? 'पर्याय १: फाईल डाउनलोड (संगणक)' : 'Option 1: File Download (PC)'}
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={downloadCustomerXlsx}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer shadow-xs"
                    title="Download Excel statement file"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{language === 'mr' ? 'Excel विवरण (.xlsx)' : 'Download Excel (.xlsx)'}</span>
                  </button>
                  <button
                    onClick={downloadCustomerTxt}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer"
                    title="Download beautifully styled invoice statement report"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{language === 'mr' ? 'विवरण डाउनलोड करा (.txt)' : 'Download Statement (.txt)'}</span>
                  </button>
                  <button
                    onClick={downloadCustomerJson}
                    className="flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer"
                    title="Download raw statement JSON data for backup safety"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'mr' ? 'डेटा बॅकअप (.json)' : 'Download Backup (.json)'}</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {language === 'mr' ? 'पर्याय २: मोबाईलवर कॉपी किंवा शेअर करा' : 'Option 2: Copy or Share on Mobile'}
                  </h4>
                  <span className="bg-amber-50 text-amber-700 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">
                    {language === 'mr' ? 'मोबाईल' : 'Mobile'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyCustomerTxt}
                    className={`flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer ${
                      copiedCustomerTxt
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-inner'
                        : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                    title="Copy statement text to paste in WhatsApp"
                  >
                    {copiedCustomerTxt ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600 animate-bounce" />
                        <span>{language === 'mr' ? 'मजकूर कॉपी झाला!' : 'Copied Text!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>{language === 'mr' ? 'मजकूर कॉपी करा (WhatsApp)' : 'Copy Text (WhatsApp)'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleShareCustomerTxt}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer shadow-xs"
                    title="Share statement directly via WhatsApp or other apps"
                  >
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'mr' ? 'थेट शेअर करा' : 'Share Direct'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCustomerJson}
                    className={`flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer ${
                      copiedCustomerJson
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-inner'
                        : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                    title="Copy statement raw backup code"
                  >
                    {copiedCustomerJson ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>{language === 'mr' ? 'कोड कॉपी झाला!' : 'Copied JSON!'}</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 text-slate-400" />
                        <span>{language === 'mr' ? 'बॅकअप कोड कॉपी करा' : 'Copy Backup Code'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedCustName && custMetrics.count === 0 && (
            <p className="text-xs text-rose-500 font-medium font-mono">
              {language === 'mr'
                ? '⚠️ निवडलेल्या कालावधीत या ग्राहकासाठी कोणतीही खरेदी नोंद सापडली नाही.'
                : '⚠️ No purchase records match this customer name under the selected range.'}
            </p>
          )}
        </div>

        {/* Card 2: Monthly Sales Backup & Exporter */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          <h3 className="font-display font-bold text-slate-800 text-base mb-1.5 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            {language === 'mr' ? 'मासिक विक्री बॅकअप आणि लेजर' : 'Monthly Sales Backup & Ledgers'}
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            {language === 'mr'
              ? 'विशिष्ट कॅलेंडर महिन्यातील सर्व विक्रीचे सविस्तर लेजर आणि आर्थिक अहवाल डाउनलोड करा.'
              : 'Download comprehensive ledgers and financial performance reports grouped for all sales in a specific calendar month.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end mb-5">
            <div>
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                {language === 'mr' ? 'महिना निवडा' : 'Select Month'}
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-mono font-medium"
              />
            </div>

            {/* Empty space for grid alignment */}
            <div></div>
          </div>

          {/* Active Month Statement Preview */}
          {selectedMonth && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="text-xs">
                <p className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  {language === 'mr' 
                    ? `${selectedMonth} मध्ये एकूण ${monthlyMetrics.count} बिले सापडली` 
                    : `Found ${monthlyMetrics.count} invoices in ${selectedMonth}`}
                </p>
                <p className="text-[11px] text-slate-500">
                  {language === 'mr' 
                    ? 'हिशोबासाठी सविस्तर ऑडिट ट्रेल बॅकअप प्रदान करते.' 
                    : 'Provides full audit trail backups for accounting.'}
                </p>
              </div>

              {monthlyMetrics.count > 0 && (
                <div className="grid grid-cols-3 gap-2 text-right">
                  <div className="bg-white border border-slate-100 px-3 py-1.5 rounded-lg">
                    <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-semibold">
                      {language === 'mr' ? 'एकूण विक्री' : 'Total Sales'}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-slate-800">₹{monthlyMetrics.totalSales.toFixed(0)}</span>
                  </div>
                  <div className="bg-white border border-slate-100 px-3 py-1.5 rounded-lg">
                    <span className="block text-[8px] uppercase tracking-wider text-emerald-600 font-semibold">
                      {language === 'mr' ? 'एकूण जमा' : 'Collected'}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-emerald-600">₹{monthlyMetrics.collected.toFixed(0)}</span>
                  </div>
                  <div className="bg-white border border-slate-100 px-3 py-1.5 rounded-lg">
                    <span className="block text-[8px] uppercase tracking-wider text-rose-600 font-semibold">
                      {language === 'mr' ? 'शिल्लक येणे' : 'Balance Due'}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-rose-600">₹{monthlyMetrics.pending.toFixed(0)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons for Monthly Statement */}
          {selectedMonth && monthlyMetrics.count > 0 ? (
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                  {language === 'mr' ? 'पर्याय १: फाईल डाउनलोड (संगणक)' : 'Option 1: File Download (PC)'}
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={downloadMonthlyXlsx}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer shadow-xs"
                    title="Download Excel monthly report"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{language === 'mr' ? 'Excel अहवाल (.xlsx)' : 'Download Excel (.xlsx)'}</span>
                  </button>
                  <button
                    onClick={downloadMonthlyTxt}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer"
                    title="Download monthly sales ledger summary in text form"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{language === 'mr' ? 'अहवाल डाउनलोड करा (.txt)' : 'Download Ledger (.txt)'}</span>
                  </button>
                  <button
                    onClick={downloadMonthlyJson}
                    className="flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer"
                    title="Download raw monthly transactions backup"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'mr' ? 'डेटा बॅकअप (.json)' : 'Download Backup (.json)'}</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {language === 'mr' ? 'पर्याय २: मोबाईलवर कॉपी किंवा शेअर करा' : 'Option 2: Copy or Share on Mobile'}
                  </h4>
                  <span className="bg-amber-50 text-amber-700 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">
                    {language === 'mr' ? 'मोबाईल' : 'Mobile'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyMonthlyTxt}
                    className={`flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer ${
                      copiedMonthlyTxt
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-inner'
                        : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                    title="Copy monthly ledger text"
                  >
                    {copiedMonthlyTxt ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600 animate-bounce" />
                        <span>{language === 'mr' ? 'अहवाल कॉपी झाला!' : 'Copied Report!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>{language === 'mr' ? 'अहवाल कॉपी करा (WhatsApp)' : 'Copy Report (WhatsApp)'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleShareMonthlyTxt}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer shadow-xs"
                    title="Share monthly report directly via WhatsApp or other apps"
                  >
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'mr' ? 'थेट शेअर करा' : 'Share Direct'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMonthlyJson}
                    className={`flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-xl transition cursor-pointer ${
                      copiedMonthlyJson
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-inner'
                        : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                    title="Copy monthly raw backup code"
                  >
                    {copiedMonthlyJson ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>{language === 'mr' ? 'कोड कॉपी झाला!' : 'Copied JSON!'}</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 text-slate-400" />
                        <span>{language === 'mr' ? 'बॅकअप कोड कॉपी करा' : 'Copy Backup Code'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-rose-500 font-medium font-mono">
              {language === 'mr' 
                ? '⚠️ निवडलेल्या महिन्यात तुमच्या लेजरमध्ये कोणतीही विक्री नोंद उपलब्ध नाही.' 
                : '⚠️ No purchase records exist in your ledger matching the selected month.'}
            </p>
          )}
        </div>

      </div>

    </div>
  );
}
