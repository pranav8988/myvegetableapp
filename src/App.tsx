import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Vegetable, Sale, CustomerProfile } from './types';
import { DEFAULT_VEGETABLES, SAMPLE_SALES } from './data';
import StatCards from './components/StatCards';
import NewSaleForm from './components/NewSaleForm';
import SalesHistory from './components/SalesHistory';
import PendingBills from './components/PendingBills';
import VegetablesManager from './components/VegetablesManager';
import InvoiceModal from './components/InvoiceModal';
import BackupReports from './components/BackupReports';
import { ShoppingCart, FileText, Users, Sliders, Info, Download, Upload, Clock, Database, Menu, X } from 'lucide-react';
import { useLanguage } from './lib/translations.tsx';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { language, setLanguage, t } = useLanguage();

  // --- 1. Global States ---
  const [activeTab, setActiveTab] = useState<'billing' | 'sales' | 'credit' | 'vegetables' | 'backup_reports'>('billing');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [vegetables, setVegetables] = useState<Vegetable[]>(() => {
    const saved = localStorage.getItem('vegetable_catalog');
    const upgraded = localStorage.getItem('vegetables_upgraded_v2');
    
    if (saved && !upgraded) {
      try {
        const existing: Vegetable[] = JSON.parse(saved);
        const existingNames = new Set(existing.map(v => v.name.toLowerCase()));
        const newDefaultsToAdd = DEFAULT_VEGETABLES.filter(v => !existingNames.has(v.name.toLowerCase()));
        
        const merged = [...existing, ...newDefaultsToAdd];
        localStorage.setItem('vegetables_upgraded_v2', 'true');
        localStorage.setItem('vegetable_catalog', JSON.stringify(merged));
        return merged;
      } catch (e) {
        console.error('Error upgrading vegetable catalog', e);
      }
    }
    
    if (!saved) {
      localStorage.setItem('vegetables_upgraded_v2', 'true');
    }
    
    return saved ? JSON.parse(saved) : DEFAULT_VEGETABLES;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('vegetables_sales_ledger');
    return saved ? JSON.parse(saved) : SAMPLE_SALES;
  });

  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>(() => {
    const saved = localStorage.getItem('vegetables_customer_profiles');
    if (saved) return JSON.parse(saved);
    // extract unique profiles from SAMPLE_SALES
    const list: CustomerProfile[] = [];
    const seen = new Set<string>();
    SAMPLE_SALES.forEach((s) => {
      const name = s.customerName.trim();
      if (name && name !== 'Walk-in Customer') {
        const phone = s.customerPhone || '';
        const key = `${name.toLowerCase()}_${phone}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: `cust-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            name,
            phone: s.customerPhone,
            createdAt: s.createdAt || new Date().toISOString()
          });
        }
      }
    });
    return list;
  });

  const [shopDetails, setShopDetails] = useState(() => {
    const saved = localStorage.getItem('shop_details_config');
    return saved ? JSON.parse(saved) : {
      name: 'Fresh Farms Vegetable Mart',
      address: 'Shop No. 4, Green Market, Sector 15, City - 400012',
      phone: '+91 98765 43210',
      gstin: '27AAAAA1111A1Z1'
    };
  });

  // Modal invoice state
  const [activeInvoiceSale, setActiveInvoiceSale] = useState<Sale | null>(null);

  // Settings Configuration panel states
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configName, setConfigName] = useState(shopDetails.name);
  const [configAddress, setConfigAddress] = useState(shopDetails.address);
  const [configPhone, setConfigPhone] = useState(shopDetails.phone);
  const [configGstin, setConfigGstin] = useState(shopDetails.gstin || '');
  const [configLogo, setConfigLogo] = useState(shopDetails.logo || '');

  // Live Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- 1b. Custom Dialog System (replaces native blockable alert/confirm) ---
  const [customDialog, setCustomDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const showAlert = (title: string, message: string) => {
    setCustomDialog({
      isOpen: true,
      title,
      message,
      type: 'alert'
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomDialog({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm
    });
  };

  // --- 2. Local Storage Sync ---
  useEffect(() => {
    localStorage.setItem('vegetable_catalog', JSON.stringify(vegetables));
  }, [vegetables]);

  useEffect(() => {
    localStorage.setItem('vegetables_sales_ledger', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('vegetables_customer_profiles', JSON.stringify(customerProfiles));
  }, [customerProfiles]);

  useEffect(() => {
    localStorage.setItem('shop_details_config', JSON.stringify(shopDetails));
  }, [shopDetails]);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 3. Sale Operations & Customer Profiles ---
  const handleAddCustomerProfile = (name: string, phone?: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === 'Walk-in Customer') return;

    setCustomerProfiles((prev) => {
      const exists = prev.some(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase() && (phone ? p.phone === phone.trim() : true)
      );
      if (exists) return prev;

      const newProfile: CustomerProfile = {
        id: `cust-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        name: trimmedName,
        phone: phone?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      return [...prev, newProfile];
    });
  };

  const handleAddSale = (newSale: Sale, consolidatedIds?: string[]) => {
    setSales((prev) => {
      let updatedSales = [...prev];
      if (consolidatedIds && consolidatedIds.length > 0) {
        updatedSales = updatedSales.map((s) => {
          if (consolidatedIds.includes(s.id)) {
            return {
              ...s,
              amountPaid: s.totalAmount,
              paymentStatus: 'paid' as const,
              notes: s.notes 
                ? `${s.notes} (Consolidated into ${newSale.invoiceNumber})` 
                : `Consolidated into ${newSale.invoiceNumber}`
            };
          }
          return s;
        });
      }
      return [newSale, ...updatedSales];
    });

    // Auto profile generation for same customer (re-occurring or first-time)
    const name = newSale.customerName.trim();
    if (name && name !== 'Walk-in Customer') {
      handleAddCustomerProfile(name, newSale.customerPhone);
    }
  };

  const handleUpdateSale = (updatedSale: Sale) => {
    setSales((prev) => prev.map((s) => (s.id === updatedSale.id ? updatedSale : s)));
    setEditingSale(null);
    setActiveInvoiceSale(updatedSale);
  };

  const handleStartEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setActiveTab('billing');
  };

  const handleDeleteSale = (saleId: string) => {
    setSales((prev) => prev.filter((s) => s.id !== saleId));
  };

  const handleUpdatePaymentStatus = (saleId: string, amountReceivedNow: number) => {
    setSales((prevSales) => {
      return prevSales.map((sale) => {
        if (sale.id !== saleId) return sale;

        const updatedPaid = sale.amountPaid + amountReceivedNow;
        let newStatus: 'paid' | 'pending' | 'partial' = 'paid';

        if (updatedPaid === 0) {
          newStatus = 'pending';
        } else if (updatedPaid < sale.totalAmount) {
          newStatus = 'partial';
        } else {
          newStatus = 'paid';
        }

        return {
          ...sale,
          amountPaid: Math.min(updatedPaid, sale.totalAmount),
          paymentStatus: newStatus,
          notes: sale.notes ? `${sale.notes} (Recv +₹${amountReceivedNow})` : `Recv +₹${amountReceivedNow}`
        };
      });
    });
  };

  // --- 4. Vegetable Catalog Operations ---
  const handleAddVegetable = (newVeg: Omit<Vegetable, 'id'>) => {
    const vegWithId: Vegetable = {
      ...newVeg,
      id: `veg-${Date.now()}-${Math.floor(Math.random() * 100000)}`
    };
    setVegetables((prev) => [...prev, vegWithId]);
    return vegWithId;
  };

  const handleUpdateVegetable = (updatedVeg: Vegetable) => {
    setVegetables((prev) => prev.map((v) => (v.id === updatedVeg.id ? updatedVeg : v)));
  };

  const handleDeleteVegetable = (vegId: string) => {
    setVegetables((prev) => prev.filter((v) => v.id !== vegId));
  };

  const handleResetCatalogToDefault = () => {
    showConfirm(
      'Reset Vegetable Catalog',
      'Are you sure you want to reset your vegetables list and pricing to default system settings? Any custom vegetables will be removed.',
      () => {
        setVegetables(DEFAULT_VEGETABLES);
        showAlert('Reset Successful', 'Vegetables list has been reset to defaults.');
      }
    );
  };

  // --- 5. Shop Config & Logo Handlers ---
  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert('Invalid Image', 'Please select a valid image file (PNG, JPG, WebP, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Auto compress to max 280x280 for fast storage & crisp rendering
        const maxDim = 280;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png', 0.95);
          setConfigLogo(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveConfig = (e: FormEvent) => {
    e.preventDefault();
    setShopDetails({
      name: configName.trim() || 'Fresh Farms Vegetable Mart',
      address: configAddress.trim() || 'Sector 15, City - 400012',
      phone: configPhone.trim() || '+91 98765 43210',
      gstin: configGstin.trim() || undefined,
      logo: configLogo.trim() || undefined,
    });
    setIsConfigOpen(false);
  };

  const handleResetAllAppData = () => {
    showConfirm(
      '⚠️ Reset Application Data',
      'Are you sure you want to completely reset the application? This will erase all sales history, pending bills, customer profiles, and reset the shop configurations/vegetable catalog. This action cannot be undone.',
      () => {
        // Double confirm with custom dialog
        showConfirm(
          '🚨 Confirm Full Deletion',
          'THIS IS YOUR LAST WARNING: This will permanently wipe all sales ledger and customer data. Are you sure you want to proceed?',
          () => {
            // 1. Reset States
            setVegetables(DEFAULT_VEGETABLES);
            setSales([]);
            setCustomerProfiles([]);
            const defaultShop = {
              name: 'Fresh Farms Vegetable Mart',
              address: 'Shop No. 4, Green Market, Sector 15, City - 400012',
              phone: '+91 98765 43210',
              gstin: '27AAAAA1111A1Z1',
              logo: undefined
            };
            setShopDetails(defaultShop);
            setConfigName(defaultShop.name);
            setConfigAddress(defaultShop.address);
            setConfigPhone(defaultShop.phone);
            setConfigGstin(defaultShop.gstin);
            setConfigLogo('');

            // 2. Clear Local Storage
            localStorage.removeItem('vegetable_catalog');
            localStorage.removeItem('vegetables_sales_ledger');
            localStorage.removeItem('vegetables_customer_profiles');
            localStorage.removeItem('shop_details_config');

            // 3. UI Helpers
            setIsConfigOpen(false);
            setActiveTab('billing');
            showAlert('App Reset Successfully', 'All application data has been cleared and reset to defaults.');
          }
        );
      }
    );
  };

  // --- 6. Backup and Restore Data ---
  const handleBackupData = () => {
    const dataObj = {
      vegetables,
      sales,
      customerProfiles,
      shopDetails,
      backupDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vegetable_shop_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreDirect = (parsed: any): boolean => {
    if (parsed && parsed.vegetables && parsed.sales && parsed.shopDetails) {
      showConfirm(
        t('restore_backup_title') || 'Restore Backup',
        t('restore_backup_desc') || 'Are you sure you want to restore this backup file? This will overwrite your current sales history, customer profiles, and vegetable catalog.',
        () => {
          setVegetables(parsed.vegetables);
          setSales(parsed.sales);
          if (parsed.customerProfiles) {
            setCustomerProfiles(parsed.customerProfiles);
          }
          setShopDetails(parsed.shopDetails);
          setConfigName(parsed.shopDetails.name);
          setConfigAddress(parsed.shopDetails.address || '');
          setConfigPhone(parsed.shopDetails.phone || '');
          setConfigGstin(parsed.shopDetails.gstin || '');
          setConfigLogo(parsed.shopDetails.logo || '');
          showAlert(
            language === 'mr' ? 'यशस्वी झाले' : 'Success',
            t('restore_success') || 'Data restored successfully!'
          );
        }
      );
      return true;
    } else {
      showAlert(
        language === 'mr' ? 'अवैध बॅकअप' : 'Invalid Backup',
        language === 'mr' ? 'अवैध बॅकअप रचना! कृपया योग्य फाईल किंवा मजकूर निवडा.' : 'Invalid backup structure. Please make sure the file/text contains the required fields.'
      );
      return false;
    }
  };

  const handleRestoreData = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        handleRestoreDirect(parsed);
      } catch (err) {
        showAlert(
          language === 'mr' ? 'त्रुटी' : 'Error',
          language === 'mr' ? 'फाइल वाचताना त्रुटी आली!' : 'Failed to parse backup JSON file. Make sure it is a valid JSON file.'
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row animate-none">
      
      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col justify-between w-72 bg-white border-r border-slate-100 h-screen sticky top-0 shrink-0 z-20 print:hidden">
        <div className="flex flex-col overflow-y-auto">
          {/* Logo & Brand Header */}
          <div className="p-6 border-b border-slate-50 flex items-center gap-3">
            {shopDetails.logo && (shopDetails.logo.startsWith('data:image') || shopDetails.logo.startsWith('http')) ? (
              <img
                src={shopDetails.logo}
                alt="Shop Logo"
                className="w-10 h-10 rounded-xl object-contain shadow-xs border border-slate-200 bg-white shrink-0 p-0.5"
              />
            ) : (
              <span className="text-3.5xl select-none leading-none shrink-0">{shopDetails.logo || '🥬'}</span>
            )}
            <div className="overflow-hidden">
              <h1 className="font-display font-extrabold text-slate-800 text-sm tracking-tight truncate">
                {shopDetails.name === 'Fresh Farms Vegetable Mart' ? t('app_title') : shopDetails.name}
              </h1>
              <p className="text-[10px] text-slate-400 mt-1 truncate font-medium">
                {shopDetails.address}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 flex flex-col gap-1.5">
            <button
              onClick={() => { setActiveTab('billing'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'billing'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('billing_counter')}</span>
            </button>

            <button
              onClick={() => { setActiveTab('sales'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'sales'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('daily_sales')}</span>
            </button>

            <button
              onClick={() => { setActiveTab('credit'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'credit'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('credit_book')}</span>
            </button>

            <button
              onClick={() => { setActiveTab('vegetables'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'vegetables'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-base leading-none select-none shrink-0">🍅</span>
              <span className="truncate">{t('veg_catalog')}</span>
            </button>

            <button
              onClick={() => { setActiveTab('backup_reports'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'backup_reports'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Database className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="truncate">{t('backup_reports')}</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex flex-col gap-3">
          {/* Live Clock Display */}
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium font-mono px-2 py-1.5 bg-white rounded-lg border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>

          {/* Language Switcher */}
          <div className="flex bg-white p-1 rounded-lg border border-slate-100">
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('mr')}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                language === 'mr'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              मराठी
            </button>
          </div>

          {/* Shop Config Button */}
          <button
            onClick={() => setIsConfigOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-100 font-semibold text-[10px] py-2 px-3 rounded-lg transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('shop_settings')}</span>
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER SECTION */}
      <header className="md:hidden bg-white border-b border-slate-100 sticky top-0 z-30 shadow-xs px-4 py-3 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {shopDetails.logo && (shopDetails.logo.startsWith('data:image') || shopDetails.logo.startsWith('http')) ? (
            <img
              src={shopDetails.logo}
              alt="Shop Logo"
              className="w-7 h-7 rounded-lg object-contain shadow-xs border border-slate-200 bg-white shrink-0 p-0.5"
            />
          ) : (
            <span className="text-xl select-none leading-none shrink-0">{shopDetails.logo || '🥬'}</span>
          )}
          <div>
            <h1 className="font-display font-extrabold text-slate-800 text-xs tracking-tight truncate max-w-[170px]">
              {shopDetails.name === 'Fresh Farms Vegetable Mart' ? t('app_title') : shopDetails.name}
            </h1>
            <p className="text-[9px] text-slate-400 font-medium truncate max-w-[170px]">
              {shopDetails.address}
            </p>
          </div>
        </div>

        {/* Quick Language Toggle */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
          className="text-[10px] font-extrabold bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200/50 hover:bg-slate-200 transition cursor-pointer"
        >
          {language === 'en' ? 'मराठी' : 'EN'}
        </button>
      </header>

      {/* MOBILE SLIDING MENU OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden animate-none"
            />

            {/* Sidebar drawer */}
            <motion.div
              key="mobile-menu-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl flex flex-col justify-between md:hidden animate-none"
            >
              <div className="flex flex-col animate-none">
                <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🥬</span>
                    <h2 className="font-display font-bold text-slate-800 text-sm">{t('app_title')}</h2>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="p-4 flex flex-col gap-1.5">
                  <button
                    onClick={() => { setActiveTab('billing'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'billing'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 shrink-0" />
                    <span>{t('billing_counter')}</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('sales'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'sales'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>{t('daily_sales')}</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('credit'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'credit'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>{t('credit_book')}</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('vegetables'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'vegetables'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-base leading-none select-none shrink-0">🍅</span>
                    <span>{t('veg_catalog')}</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('backup_reports'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'backup_reports'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Database className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{t('backup_reports')}</span>
                  </button>
                </nav>
              </div>

              <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium font-mono px-2 py-1 bg-white rounded-lg border border-slate-100">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>{currentTime.toLocaleTimeString()}</span>
                </div>

                <button
                  onClick={() => { setIsConfigOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-100 font-semibold text-xs py-2 px-3 rounded-xl transition cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t('shop_settings')}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DESKTOP/MOBILE CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* DASHBOARD CONTENT CONTAINER */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 w-full pb-24 md:pb-8">
          
          {/* STATS OVERVIEW CARDS - ONLY RENDERS ON THE DAILY SALES TAB NOW */}
          {activeTab === 'sales' && <StatCards sales={sales} />}

          {/* ACTIVE SCREEN RENDERING */}
          <div className="flex-1">
            <div className={activeTab === 'billing' ? '' : 'hidden'}>
              <NewSaleForm
                vegetables={vegetables}
                customerProfiles={customerProfiles}
                onAddCustomerProfile={handleAddCustomerProfile}
                onAddSale={handleAddSale}
                onOpenInvoice={(sale) => setActiveInvoiceSale(sale)}
                sales={sales}
                editingSale={editingSale}
                onCancelEdit={() => setEditingSale(null)}
                onUpdateSale={handleUpdateSale}
                onAddVegetable={handleAddVegetable}
                showConfirm={showConfirm}
              />
            </div>

            {activeTab === 'sales' && (
              <SalesHistory
                sales={sales}
                onOpenInvoice={(sale) => setActiveInvoiceSale(sale)}
                onDeleteSale={handleDeleteSale}
                onUpdatePaymentStatus={handleUpdatePaymentStatus}
                showConfirm={showConfirm}
                onEditSale={handleStartEditSale}
                shopDetails={shopDetails}
              />
            )}

            {activeTab === 'credit' && (
              <PendingBills
                sales={sales}
                onUpdatePaymentStatus={handleUpdatePaymentStatus}
                customerProfiles={customerProfiles}
                onAddSale={handleAddSale}
              />
            )}

            {activeTab === 'vegetables' && (
              <VegetablesManager
                vegetables={vegetables}
                onAdd={handleAddVegetable}
                onUpdate={handleUpdateVegetable}
                onDelete={handleDeleteVegetable}
                onResetToDefault={handleResetCatalogToDefault}
                onBulkUpdate={setVegetables}
                shopDetails={shopDetails}
                showConfirm={showConfirm}
              />
            )}

            {activeTab === 'backup_reports' && (
              <BackupReports
                sales={sales}
                customerProfiles={customerProfiles}
                onBackupFull={handleBackupData}
                onRestoreFull={handleRestoreData}
                vegetables={vegetables}
                shopDetails={shopDetails}
                onRestoreDirect={handleRestoreDirect}
              />
            )}
          </div>

        </main>

        {/* FOOTER & DATA SECURITY */}
        <footer className="bg-white border-t border-slate-100 py-6 mt-auto print:hidden">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <Info className="w-4 h-4 text-slate-300" />
              <span>Store Manager operates locally on your browser. Settle accounts safely.</span>
            </div>
            
            {/* Backup restore buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleBackupData}
                className="flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer"
                title="Download backup file of sales ledger and vegetable configurations"
              >
                <Download className="w-3.5 h-3.5" />
                Backup Data
              </button>
              <label
                className="flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer"
                title="Restore sales ledger and vegetable configurations from a backup file"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restore Data</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreData}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </footer>

      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-xl md:hidden flex justify-around items-center py-2 px-1 print:hidden safe-bottom">
        <button
          onClick={() => { setActiveTab('billing'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all text-center cursor-pointer ${
            activeTab === 'billing' ? 'text-emerald-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ShoppingCart className="w-4.5 h-4.5" />
          <span className="text-[9px] tracking-tight truncate max-w-[64px]">{language === 'mr' ? 'बिलिंग' : 'Billing'}</span>
        </button>

        <button
          onClick={() => { setActiveTab('sales'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all text-center cursor-pointer ${
            activeTab === 'sales' ? 'text-emerald-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText className="w-4.5 h-4.5" />
          <span className="text-[9px] tracking-tight truncate max-w-[64px]">{language === 'mr' ? 'विक्री' : 'Sales'}</span>
        </button>

        <button
          onClick={() => { setActiveTab('credit'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all text-center cursor-pointer ${
            activeTab === 'credit' ? 'text-emerald-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-4.5 h-4.5" />
          <span className="text-[9px] tracking-tight truncate max-w-[64px]">{language === 'mr' ? 'उधारी' : 'Credit'}</span>
        </button>

        <button
          onClick={() => { setActiveTab('vegetables'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all text-center cursor-pointer ${
            activeTab === 'vegetables' ? 'text-emerald-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="text-base leading-none select-none">🍅</span>
          <span className="text-[9px] tracking-tight truncate max-w-[64px]">{language === 'mr' ? 'कॅटलॉग' : 'Catalog'}</span>
        </button>

        <button
          onClick={() => { setActiveTab('backup_reports'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all text-center cursor-pointer ${
            activeTab === 'backup_reports' ? 'text-emerald-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Database className="w-4.5 h-4.5 text-emerald-500" />
          <span className="text-[9px] tracking-tight truncate max-w-[64px]">{language === 'mr' ? 'बॅकअप' : 'Backup'}</span>
        </button>
      </nav>

      {/* INVOICE MODAL VIEWER */}
      <AnimatePresence>
        {activeInvoiceSale && (
          <InvoiceModal
            sale={activeInvoiceSale}
            onClose={() => setActiveInvoiceSale(null)}
            shopDetails={shopDetails}
          />
        )}
      </AnimatePresence>

      {/* SHOP CONFIG MODAL DIALOG */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <h3 className="font-display font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              Configure Shop Information
            </h3>
            
            <form onSubmit={handleSaveConfig} className="flex flex-col gap-4">
              
              {/* Logo & Profile Picture Upload / Avatar Selector */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2.5">
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {language === 'mr' ? 'दुकान लोगो / प्रोफाईल फोटो' : 'Shop Logo / Profile Picture'}
                </label>
                
                <div className="flex items-center gap-3.5">
                  {/* Live Preview */}
                  <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                    {configLogo && (configLogo.startsWith('data:image') || configLogo.startsWith('http')) ? (
                      <img src={configLogo} alt="Preview" className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-3xl select-none">{configLogo || '🥬'}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition cursor-pointer inline-flex items-center gap-1 shadow-xs">
                        <span>{language === 'mr' ? 'फोटो निवडा (PNG/JPG)' : 'Upload Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>

                      {configLogo && (
                        <button
                          type="button"
                          onClick={() => setConfigLogo('')}
                          className="text-[10px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          {language === 'mr' ? 'काढून टाका' : 'Remove'}
                        </button>
                      )}
                    </div>

                    <p className="text-[9px] text-slate-400">
                      {language === 'mr' 
                        ? 'हा लोगो बिलावर, स्क्रीनशॉटवर आणि अहवालावर दिसेल.' 
                        : 'Appears on customer bills, generated screenshots & reports.'}
                    </p>
                  </div>
                </div>

                {/* Quick Preset Avatars */}
                <div>
                  <p className="text-[9px] text-slate-400 font-semibold mb-1">
                    {language === 'mr' ? 'किंवा आयकॉन निवडा:' : 'Or pick standard icon:'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['🥬', '🍅', '🥦', '🏪', '🛒', '🥕', '🌽', '🌶️', '👨‍🌾', '🌿'].map((icon) => (
                      <button
                        key={`preset-logo-${icon}`}
                        type="button"
                        onClick={() => setConfigLogo(icon)}
                        className={`w-7 h-7 rounded-lg border text-sm flex items-center justify-center transition cursor-pointer ${
                          configLogo === icon ? 'bg-emerald-100 border-emerald-500 scale-110 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shop Name */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Shop Name</label>
                <input
                  type="text"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  className="w-full text-xs border border-slate-200 focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-semibold bg-slate-50 focus:bg-white"
                  placeholder="e.g. Fresh Farms Vegetable Mart"
                  required
                />
              </div>

              {/* Shop Address */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Address</label>
                <input
                  type="text"
                  value={configAddress}
                  onChange={(e) => setConfigAddress(e.target.value)}
                  className="w-full text-xs border border-slate-200 focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg bg-slate-50 focus:bg-white"
                  placeholder="e.g. Sector 15, City - 400012"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Contact Phone */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Mobile / Phone</label>
                  <input
                    type="text"
                    value={configPhone}
                    onChange={(e) => setConfigPhone(e.target.value)}
                    className="w-full text-xs border border-slate-200 focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-mono bg-slate-50 focus:bg-white"
                    placeholder="e.g. +91 98765 43210"
                    required
                  />
                </div>

                {/* GSTIN */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    value={configGstin}
                    onChange={(e) => setConfigGstin(e.target.value)}
                    className="w-full text-xs border border-slate-200 focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-mono bg-slate-50 focus:bg-white"
                    placeholder="e.g. 27AAAAA1111A1Z1"
                  />
                </div>
              </div>

              {/* Danger Zone */}
              <div className="mt-2 pt-3 border-t border-rose-100 bg-rose-50/50 rounded-xl p-3 border border-dashed">
                <h4 className="text-[10px] text-rose-800 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  ⚠️ Danger Zone
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed mb-2.5">
                  This will permanently delete all sales, customer ledger, and reset the shop parameters & vegetables catalog.
                </p>
                <button
                  type="button"
                  onClick={handleResetAllAppData}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] py-2 px-3 rounded-lg transition text-center cursor-pointer uppercase tracking-wider shadow-xs"
                >
                  Reset App & Erase All Data
                </button>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsConfigOpen(false);
                    // Reset fields
                    setConfigName(shopDetails.name);
                    setConfigAddress(shopDetails.address);
                    setConfigPhone(shopDetails.phone);
                    setConfigGstin(shopDetails.gstin || '');
                  }}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs px-4 py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition"
                >
                  Save Configuration
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* GLOBAL CUSTOM CONFIRM / ALERT MODAL */}
      {customDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <h3 className="font-display font-bold text-slate-800 text-base mb-2">
              {customDialog.title}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 whitespace-pre-line">
              {customDialog.message}
            </p>

            <div className="flex gap-2.5 justify-end">
              {customDialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => setCustomDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCustomDialog(prev => ({ ...prev, isOpen: false }));
                  if (customDialog.type === 'confirm' && customDialog.onConfirm) {
                    customDialog.onConfirm();
                  }
                }}
                className={`px-5 py-2 text-white rounded-lg text-xs font-semibold transition shadow-xs ${
                  customDialog.title.includes('Reset') || customDialog.title.includes('Delete') || customDialog.title.includes('Danger') || customDialog.title.includes('⚠️') || customDialog.title.includes('🚨')
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {customDialog.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
