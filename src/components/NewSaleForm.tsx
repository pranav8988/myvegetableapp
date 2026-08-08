import { useState, useMemo, FormEvent, useEffect } from 'react';
import { Vegetable, Sale, SaleItem, CustomerProfile } from '../types';
import { Plus, Trash2, ShoppingCart, Check, User, Phone, FileText, Users, X, Clock, RefreshCw, Sparkles, Calendar } from 'lucide-react';
import { useLanguage } from '../lib/translations';

interface NewSaleFormProps {
  vegetables: Vegetable[];
  customerProfiles: CustomerProfile[];
  onAddCustomerProfile: (name: string, phone?: string) => void;
  onAddSale: (sale: Sale, consolidatedIds?: string[]) => void;
  onOpenInvoice: (sale: Sale) => void;
  sales: Sale[];
  editingSale?: Sale | null;
  onCancelEdit?: () => void;
  onUpdateSale?: (updatedSale: Sale) => void;
  onAddVegetable: (veg: Omit<Vegetable, 'id'>) => Vegetable;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export default function NewSaleForm({
  vegetables,
  customerProfiles,
  onAddCustomerProfile,
  onAddSale,
  onOpenInvoice,
  sales,
  editingSale,
  onCancelEdit,
  onUpdateSale,
  onAddVegetable,
  showConfirm,
}: NewSaleFormProps) {
  const { t, language } = useLanguage();
  
  // Cart Items State
  const [cartItems, setCartItems] = useState<Omit<SaleItem, 'id'>[]>([]);

  // Track previous outstanding dues consolidation
  const [consolidatedIds, setConsolidatedIds] = useState<string[]>([]);

  // Item form states
  const [selectedVegId, setSelectedVegId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [quantity, setQuantity] = useState('');

  // Sale/Customer states
  const [saleDate, setSaleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedProfileId, setSelectedProfileId] = useState('manual');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'credit'>('cash');
  const [customAmountPaid, setCustomAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  // Custom Add Profile Modal states
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePhone, setNewProfilePhone] = useState('');
  const [newProfileError, setNewProfileError] = useState('');

  // Quick Add Vegetable Modal states
  const [showAddVegModal, setShowAddVegModal] = useState(false);
  const [newVegName, setNewVegName] = useState('');
  const [newVegPrice, setNewVegPrice] = useState('');
  const [newVegCategory, setNewVegCategory] = useState<'leafy' | 'roots' | 'fleshy' | 'other'>('fleshy');
  const [newVegEmoji, setNewVegEmoji] = useState('');
  const [newVegError, setNewVegError] = useState('');

  // Draft saving tracking state
  const [lastSavedTime, setLastSavedTime] = useState('');

  // Editable previous pending bill input state
  const [previousPendingInput, setPreviousPendingInput] = useState('0');

  const POPULAR_VEG_EMOJIS = ['🍅', '🥔', '🧅', '🥦', '🥕', '🥬', '🌶️', '🫑', '🧄', '🌽', '🍆', '🥑', '🥒', '🍉', '🍌', '🍎', '🍐', '🥭', '🍋', '🍇'];

  // Check if we are in edit mode and load sale details OR load draft if editing is null
  useEffect(() => {
    if (editingSale) {
      const mappedItems = editingSale.items.map(item => ({
        vegName: item.vegName,
        vegEmoji: item.vegEmoji,
        quantity: item.quantity,
        pricePerKg: item.pricePerKg,
        total: item.total
      }));
      setCartItems(mappedItems);
      setSaleDate(editingSale.date || new Date().toISOString().split('T')[0]);
      setCustomerName(editingSale.customerName);
      setCustomerPhone(editingSale.customerPhone || '');
      setPaymentMethod(editingSale.paymentMethod);
      setCustomAmountPaid(editingSale.paymentMethod === 'credit' ? editingSale.amountPaid.toString() : '');
      setNotes(editingSale.notes || '');
      
      const profile = customerProfiles.find(p => p.name.toLowerCase() === editingSale.customerName.toLowerCase());
      if (profile) {
        setSelectedProfileId(profile.id);
      } else {
        setSelectedProfileId('manual');
      }
    } else {
      // Load billing draft if it exists
      const savedDraft = localStorage.getItem('billing_draft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setCartItems(draft.cartItems || []);
          setSaleDate(draft.saleDate || new Date().toISOString().split('T')[0]);
          setCustomerName(draft.customerName || 'Walk-in Customer');
          setCustomerPhone(draft.customerPhone || '');
          setPaymentMethod(draft.paymentMethod || 'cash');
          setCustomAmountPaid(draft.customAmountPaid || '');
          setNotes(draft.notes || '');
          setSelectedProfileId(draft.selectedProfileId || 'manual');
          setConsolidatedIds(draft.consolidatedIds || []);
          setPreviousPendingInput(draft.previousPendingInput || '0');
          setLastSavedTime(draft.savedAt || '');
        } catch (e) {
          console.error('Error loading billing draft', e);
        }
      } else {
        setCartItems([]);
        setSaleDate(new Date().toISOString().split('T')[0]);
        setSelectedProfileId('manual');
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setPaymentMethod('cash');
        setCustomAmountPaid('');
        setNotes('');
        setPreviousPendingInput('0');
        setLastSavedTime('');
      }
    }
  }, [editingSale, customerProfiles]);

  // Save billing draft automatically on field change (except when editing an existing sale)
  useEffect(() => {
    if (editingSale) return;

    const isDefaultState = 
      cartItems.length === 0 &&
      customerName === 'Walk-in Customer' &&
      customerPhone === '' &&
      paymentMethod === 'cash' &&
      customAmountPaid === '' &&
      notes === '' &&
      (previousPendingInput === '0' || previousPendingInput === '');

    if (isDefaultState) {
      localStorage.removeItem('billing_draft');
      setLastSavedTime('');
      return;
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const draft = {
      cartItems,
      saleDate,
      customerName,
      customerPhone,
      paymentMethod,
      customAmountPaid,
      notes,
      selectedProfileId,
      consolidatedIds,
      previousPendingInput,
      savedAt: timeString,
    };
    localStorage.setItem('billing_draft', JSON.stringify(draft));
    setLastSavedTime(timeString);
  }, [cartItems, saleDate, customerName, customerPhone, paymentMethod, customAmountPaid, notes, selectedProfileId, consolidatedIds, previousPendingInput, editingSale]);

  // Calculate previous unpaid outstanding balance for the customer
  const previousUnpaidSales = useMemo(() => {
    if (!customerName || customerName === 'Walk-in Customer') return [];
    return sales.filter((s) => {
      if (editingSale && s.id === editingSale.id) return false;
      const matchesName = s.customerName.trim().toLowerCase() === customerName.trim().toLowerCase();
      const matchesPhone = customerPhone ? s.customerPhone === customerPhone : true;
      return matchesName && matchesPhone && (s.paymentStatus === 'pending' || s.paymentStatus === 'partial');
    });
  }, [sales, customerName, customerPhone, editingSale]);

  const totalPreviousDues = useMemo(() => {
    return previousUnpaidSales.reduce((sum, s) => sum + (s.totalAmount - s.amountPaid), 0);
  }, [previousUnpaidSales]);

  // Auto-fetch outstanding dues when total previous dues changes (customer selection/name matches)
  useEffect(() => {
    if (totalPreviousDues > 0) {
      setPreviousPendingInput(totalPreviousDues.toString());
    } else {
      setPreviousPendingInput('0');
    }
  }, [totalPreviousDues]);

  const handleInsertPreviousDues = () => {
    const amount = parseFloat(previousPendingInput);
    if (isNaN(amount) || amount <= 0) return;

    const duesName = language === 'mr' ? 'मागील येणे बाकी' : 'Previous Outstanding Balance';
    const existingIndex = cartItems.findIndex(item => item.vegName === duesName);
    
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        pricePerKg: amount,
        total: amount
      };
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          vegName: duesName,
          vegEmoji: '🤝',
          quantity: 1,
          pricePerKg: amount,
          total: amount
        }
      ]);
    }
    setConsolidatedIds(previousUnpaidSales.map(s => s.id));
  };

  const handleClearBill = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    // If the cart is empty and other fields are default, reset instantly without prompt
    if (cartItems.length === 0 && customerName === 'Walk-in Customer' && customerPhone === '' && notes === '') {
      setCartItems([]);
      setSaleDate(todayStr);
      setSelectedProfileId('manual');
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setPaymentMethod('cash');
      setCustomAmountPaid('');
      setNotes('');
      setConsolidatedIds([]);
      setPreviousPendingInput('0');
      localStorage.removeItem('billing_draft');
      setLastSavedTime('');
      return;
    }

    showConfirm(
      language === 'mr' ? 'बिल साफ करा' : 'Clear Current Bill',
      language === 'mr' 
        ? 'तुम्हाला खरोखर बिलामधील सर्व वस्तू काढून टाकायच्या आहेत आणि ग्राहक तपशील रीसेट करायचा आहे का?'
        : 'Are you sure you want to remove all items from the cart and reset all customer details?',
      () => {
        setCartItems([]);
        setSaleDate(todayStr);
        setSelectedProfileId('manual');
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setPaymentMethod('cash');
        setCustomAmountPaid('');
        setNotes('');
        setConsolidatedIds([]);
        setPreviousPendingInput('0');
        localStorage.removeItem('billing_draft');
        setLastSavedTime('');
      }
    );
  };

  // Profile select handlers
  const handleProfileSelectChange = (id: string) => {
    setSelectedProfileId(id);
    if (id === 'manual') {
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
    } else {
      const profile = customerProfiles.find((p) => p.id === id);
      if (profile) {
        setCustomerName(profile.name);
        setCustomerPhone(profile.phone || '');
      }
    }
  };

  const handleNameChange = (name: string) => {
    setCustomerName(name);
    if (selectedProfileId !== 'manual') {
      const profile = customerProfiles.find((p) => p.id === selectedProfileId);
      if (profile && profile.name !== name) {
        setSelectedProfileId('manual');
      }
    }
  };

  const handlePhoneChange = (phone: string) => {
    setCustomerPhone(phone);
    if (selectedProfileId !== 'manual') {
      const profile = customerProfiles.find((p) => p.id === selectedProfileId);
      if (profile && (profile.phone || '') !== phone) {
        setSelectedProfileId('manual');
      }
    }
  };

  // Selected vegetable data helper
  const selectedVeg = useMemo(() => {
    return vegetables.find((v) => v.id === selectedVegId);
  }, [selectedVegId, vegetables]);

  // Adjust custom price when selected vegetable changes
  const handleVegChange = (id: string) => {
    setSelectedVegId(id);
    const veg = vegetables.find((v) => v.id === id);
    if (veg) {
      setCustomPrice(veg.defaultPrice.toString());
    } else {
      setCustomPrice('');
    }
  };

  // Add Item to Cart
  const handleAddItem = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedVeg || !quantity || parseFloat(quantity) <= 0) return;

    const price = parseFloat(customPrice) || selectedVeg.defaultPrice;
    const qty = parseFloat(quantity);
    const total = price * qty;

    // Check if item already exists in cart, then merge
    const existingIndex = cartItems.findIndex((item) => item.vegName === selectedVeg.name);
    if (existingIndex > -1) {
      const updatedCart = [...cartItems];
      const existingItem = updatedCart[existingIndex];
      const newQty = existingItem.quantity + qty;
      updatedCart[existingIndex] = {
        ...existingItem,
        quantity: newQty,
        total: existingItem.pricePerKg * newQty
      };
      setCartItems(updatedCart);
    } else {
      setCartItems([
        ...cartItems,
        {
          vegName: selectedVeg.name,
          vegEmoji: selectedVeg.imageEmoji,
          quantity: qty,
          pricePerKg: price,
          total: total,
        },
      ]);
    }

    // Reset item input form
    setSelectedVegId('');
    setCustomPrice('');
    setQuantity('');
  };

  // Remove Item from Cart
  const handleRemoveItem = (index: number) => {
    const itemToRemove = cartItems[index];
    const duesNameEn = 'Previous Outstanding Balance';
    const duesNameMr = 'मागील येणे बाकी';
    if (itemToRemove.vegName === duesNameEn || itemToRemove.vegName === duesNameMr) {
      setConsolidatedIds([]);
    }
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Dynamic calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

  // Default paid amount based on payment method
  const amountPaidDefault = useMemo(() => {
    if (paymentMethod === 'credit') {
      return customAmountPaid ? parseFloat(customAmountPaid) : 0;
    }
    return subtotal;
  }, [paymentMethod, customAmountPaid, subtotal]);

  // Handle final checkout submit
  const handleCheckoutSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    const finalPaid = paymentMethod === 'credit' 
      ? (customAmountPaid ? parseFloat(customAmountPaid) : 0)
      : subtotal;

    let paymentStatus: 'paid' | 'pending' | 'partial' = 'paid';
    if (paymentMethod === 'credit') {
      if (finalPaid === 0) {
        paymentStatus = 'pending';
      } else if (finalPaid < subtotal) {
        paymentStatus = 'partial';
      } else {
        paymentStatus = 'paid';
      }
    }

    if (editingSale) {
      const updatedSale: Sale = {
        ...editingSale,
        date: saleDate || editingSale.date,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        items: cartItems.map((item, idx) => ({
          ...item,
          id: (item as any).id || `item-${Date.now()}-${idx}`
        })) as SaleItem[],
        totalAmount: subtotal,
        amountPaid: finalPaid,
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        notes: notes.trim() || undefined,
      };
      
      if (onUpdateSale) {
        onUpdateSale(updatedSale);
      }
      onOpenInvoice(updatedSale);
    } else {
      const newSaleId = `sale-${Date.now()}`;
      const sequenceStr = String(sales.length + 1).padStart(4, '0');
      const currentYear = new Date().getFullYear();
      
      const slug = customerName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 10) || 'CUST';
        
      const invoiceNum = `INV-${currentYear}-${slug}-${sequenceStr}`;

      const newSale: Sale = {
        id: newSaleId,
        invoiceNumber: invoiceNum,
        date: saleDate || new Date().toISOString().split('T')[0],
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        items: cartItems.map((item, idx) => ({
          ...item,
          id: `item-${Date.now()}-${idx}`
        })),
        totalAmount: subtotal,
        amountPaid: finalPaid,
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      onAddSale(newSale, consolidatedIds);
      onOpenInvoice(newSale);
    }

    // Reset whole form completely so all fields are blank for the next order
    setCartItems([]);
    setSaleDate(new Date().toISOString().split('T')[0]);
    setSelectedVegId('');
    setCustomPrice('');
    setQuantity('');
    setSelectedProfileId('manual');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setPaymentMethod('cash');
    setCustomAmountPaid('');
    setNotes('');
    setConsolidatedIds([]);
    setPreviousPendingInput('0');
    localStorage.removeItem('billing_draft');
    setLastSavedTime('');
    if (editingSale && onCancelEdit) {
      onCancelEdit();
    }
  };

  const remainingBalance = subtotal - amountPaidDefault;

  return (
    <>
      {editingSale && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="animate-pulse bg-blue-500 text-white font-bold text-[10px] uppercase px-1.5 py-0.5 rounded-sm">
              Edit Mode
            </span>
            <span className="text-xs font-semibold">
              {language === 'mr' 
                ? `दुरुस्ती सुरू आहे: बिल क्र. ${editingSale.invoiceNumber} (ग्राहक: ${editingSale.customerName})`
                : `Editing Invoice: ${editingSale.invoiceNumber} (Customer: ${editingSale.customerName})`}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs bg-white hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold px-3 py-1 rounded-lg transition"
          >
            {language === 'mr' ? 'रद्द करा' : 'Cancel Edit'}
          </button>
        </div>
      )}

      {lastSavedTime && !editingSale && (
        <div className="flex justify-end mb-4 -mt-2">
          <div className="flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-100/50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-mono font-bold shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {language === 'mr' 
                ? `मसुदा स्वयंचलित जतन: ${lastSavedTime}` 
                : `Draft Autosaved: ${lastSavedTime}`}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT: Billing Calculator / Cart Builder (7 Columns) */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          
          {/* Step 1: Add Item Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-display font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 p-1 rounded-md text-xs">01</span>
              {t('add_veg_bill')}
            </h3>

          <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            
            {/* Select Vegetable */}
            <div className="sm:col-span-5">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{t('veg_name')}</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewVegName('');
                    setNewVegPrice('');
                    setNewVegCategory('fleshy');
                    setNewVegEmoji('');
                    setNewVegError('');
                    setShowAddVegModal(true);
                  }}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5 transition cursor-pointer"
                  title="Add new vegetable to catalog"
                >
                  + {language === 'mr' ? 'नवीन भाजी' : 'Quick Add'}
                </button>
              </div>
              <select
                value={selectedVegId}
                onChange={(e) => handleVegChange(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg"
                required
              >
                <option value="">-- {t('select_veg_placeholder')} --</option>
                {vegetables.map((v, index) => (
                  <option key={`veg-${v.id || 'veg'}-${v.name}-${index}`} value={v.id}>
                    {v.imageEmoji} {t(v.name)} (₹{v.defaultPrice}/kg)
                  </option>
                ))}
              </select>
            </div>

            {/* Price (bargaining custom price) */}
            <div className="sm:col-span-3">
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">{t('price_kg')}</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                <input
                  type="number"
                  placeholder="Price"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full pl-6 pr-2.5 py-2.5 text-xs font-mono border border-slate-200 focus:border-emerald-500 focus:outline-hidden rounded-lg bg-slate-50 focus:bg-white"
                  min="0"
                  step="0.1"
                  required
                  disabled={!selectedVegId}
                />
              </div>
            </div>

            {/* Quantity */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">{t('quantity_kg')}</label>
              <input
                type="number"
                placeholder="kg"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full text-center py-2.5 text-xs font-mono border border-slate-200 focus:border-emerald-500 focus:outline-hidden rounded-lg bg-slate-50 focus:bg-white"
                min="0.01"
                step="0.01"
                required
                disabled={!selectedVegId}
              />
            </div>

            {/* Add Button */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={!selectedVegId || !quantity}
                className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-semibold py-2.5 rounded-lg transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {t('add_to_cart')}
              </button>
            </div>
          </form>
        </div>

        {/* Step 2: Cart Items List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex-1 min-h-[300px] flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-base mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="bg-emerald-50 text-emerald-700 p-1 rounded-md text-xs">02</span>
                {t('cart_items')}
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                {cartItems.length} {language === 'mr' ? 'भाजी' : (cartItems.length === 1 ? 'item' : 'items')}
              </span>
            </h3>

            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <ShoppingCart className="w-10 h-10 stroke-1.25 mb-2 text-slate-300" />
                <p className="text-xs">{t('no_items_cart')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold text-[10px] tracking-wider pb-2">
                      <th className="pb-2 w-8">#</th>
                      <th className="pb-2">{t('veg_name')}</th>
                      <th className="pb-2 text-right">{t('rate_header')}</th>
                      <th className="pb-2 text-right">{t('qty_kg_header')}</th>
                      <th className="pb-2 text-right">{t('amount_header')}</th>
                      <th className="pb-2 text-center w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                    {cartItems.map((item, index) => (
                      <tr key={`cart-item-${item.vegName}-${index}`} className="hover:bg-slate-50/50">
                        <td className="py-2.5 text-slate-400">{index + 1}</td>
                        <td className="py-2.5 font-sans font-medium text-slate-900">
                          <span className="mr-1.5">{item.vegEmoji}</span>
                          {t(item.vegName)}
                        </td>
                        <td className="py-2.5 text-right">₹{item.pricePerKg.toFixed(1)}</td>
                        <td className="py-2.5 text-right font-semibold">{item.quantity.toFixed(2)}</td>
                        <td className="py-2.5 text-right font-bold text-slate-950">₹{item.total.toFixed(1)}</td>
                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between items-center bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
              <span className="text-xs font-semibold text-slate-500 uppercase">{t('subtotal')}:</span>
              <span className="text-xl font-display font-bold text-slate-800 font-mono">₹{subtotal.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Customer & Checkout Info (5 Columns) */}
      <div className="xl:col-span-5">
        <form onSubmit={handleCheckoutSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-full flex flex-col justify-between">
          <div>
            {/* Step 3 Header */}
            <h3 className="font-display font-bold text-slate-800 text-base mb-5 flex items-center gap-2 border-b border-slate-50 pb-3">
              <span className="bg-emerald-50 text-emerald-700 p-1 rounded-md text-xs">03</span>
              {t('customer_details')}
            </h3>

            {/* Editable Invoice Date */}
            <div className="mb-4 bg-slate-50 border border-slate-100 rounded-xl p-3">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  {language === 'mr' ? 'बिलाची तारीख (Invoice Date)' : 'Invoice Date'}
                </label>
                {saleDate !== new Date().toISOString().split('T')[0] ? (
                  <button
                    type="button"
                    onClick={() => setSaleDate(new Date().toISOString().split('T')[0])}
                    className="text-[9px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide transition cursor-pointer flex items-center gap-1"
                    title={language === 'mr' ? 'आजच्या तारखेवर रिसेट करा' : 'Reset to Today'}
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    {language === 'mr' ? 'आजची तारीख' : 'Set to Today'}
                  </button>
                ) : (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                    {language === 'mr' ? 'आजची तारीख' : 'Today'}
                  </span>
                )}
              </div>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-white focus:border-emerald-500 focus:outline-hidden p-2 rounded-lg font-mono font-bold text-slate-800 cursor-pointer"
                required
              />
            </div>

            {/* Customer Profile Selector */}
            <div className="mb-4 bg-slate-50 border border-slate-100 rounded-xl p-3">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  {t('select_customer')}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setNewProfileName('');
                    setNewProfilePhone('');
                    setNewProfileError('');
                    setShowAddProfileModal(true);
                  }}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-extrabold flex items-center gap-0.5 transition cursor-pointer"
                  title="Create a new Customer Profile"
                >
                  + {t('add_new_customer')}
                </button>
              </div>
              <select
                value={selectedProfileId}
                onChange={(e) => handleProfileSelectChange(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-white focus:border-emerald-500 focus:outline-hidden p-2 rounded-lg font-medium animate-none"
              >
                <option value="manual">-- {t('walk_in_customer')} --</option>
                {customerProfiles.map((p, index) => (
                  <option key={`profile-${p.id || 'cust'}-${p.name}-${index}`} value={p.id}>
                    👤 {p.name} {p.phone ? `(${p.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Name */}
            <div className="mb-4">
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                {t('customer_name')} {selectedProfileId !== 'manual' && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded-full font-bold">{t('whatsapp_linked')}</span>}
              </label>
              <input
                type="text"
                placeholder={t('walk_in_customer')}
                value={customerName === 'Walk-in Customer' ? t('walk_in_customer') : customerName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-medium"
              />
            </div>

            {/* Customer Phone */}
            <div className="mb-4">
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {t('customer_phone')} {language === 'mr' ? '(उधारीसाठी आवश्यक)' : '(Required for Credit)'}
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-mono"
                required={paymentMethod === 'credit'}
              />
            </div>

            {/* Previous Pending Balance Integration */}
            <div className={`mb-4 p-4 rounded-xl border transition-all ${
              totalPreviousDues > 0 
                ? 'bg-amber-50/60 border-amber-200 shadow-2xs' 
                : 'bg-slate-50/55 border-slate-200'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${totalPreviousDues > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
                  {language === 'mr' ? 'मागील प्रलंबित उधारी (₹)' : 'Previous Pending Dues (₹)'}
                </label>
                {totalPreviousDues > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                    {language === 'mr' ? 'स्वयंचलित फेच' : 'Auto-fetched'}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={previousPendingInput === '0' ? '' : previousPendingInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPreviousPendingInput(val === '' ? '0' : val);
                    }}
                    className={`w-full pl-6 pr-2.5 py-2 text-xs font-mono border rounded-lg focus:outline-hidden transition ${
                      totalPreviousDues > 0 
                        ? 'border-amber-300 bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-amber-950 font-bold' 
                        : 'border-slate-200 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                    }`}
                    min="0"
                    step="0.1"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleInsertPreviousDues}
                  disabled={parseFloat(previousPendingInput) <= 0 || isNaN(parseFloat(previousPendingInput))}
                  className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    cartItems.some(item => item.vegName === (language === 'mr' ? 'मागील येणे बाकी' : 'Previous Outstanding Balance'))
                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      : totalPreviousDues > 0
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {cartItems.some(item => item.vegName === (language === 'mr' ? 'मागील येणे बाकी' : 'Previous Outstanding Balance'))
                      ? (language === 'mr' ? 'बदला' : 'Update')
                      : (language === 'mr' ? 'बिलात जोडा' : 'Add to Bill')}
                  </span>
                </button>
              </div>

              {/* Reset to Fetched helper button when user customizes the fetched value */}
              {totalPreviousDues > 0 && previousPendingInput !== totalPreviousDues.toString() && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-amber-700/80 italic">
                    {language === 'mr' 
                      ? `मूळ येणे बाकी: ₹${totalPreviousDues.toFixed(1)}` 
                      : `Original: ₹${totalPreviousDues.toFixed(1)}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviousPendingInput(totalPreviousDues.toString())}
                    className="text-[10px] text-amber-800 hover:text-amber-900 font-bold underline cursor-pointer"
                  >
                    {language === 'mr' ? 'मूळ रक्कम आणा' : 'Restore Auto-fetched'}
                  </button>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">{t('payment_method')}</label>
              <div className="grid grid-cols-3 gap-2">
                {/* Cash */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`text-xs py-2.5 px-3 rounded-lg border font-medium transition text-center cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'border-emerald-500 bg-emerald-50/40 text-emerald-700 font-bold'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  💵 {t('cash')}
                </button>
                {/* UPI */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`text-xs py-2.5 px-3 rounded-lg border font-medium transition text-center cursor-pointer ${
                    paymentMethod === 'upi'
                      ? 'border-emerald-500 bg-emerald-50/40 text-emerald-700 font-bold'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  📱 {t('upi')}
                </button>
                {/* Credit */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`text-xs py-2.5 px-3 rounded-lg border font-medium transition text-center cursor-pointer ${
                    paymentMethod === 'credit'
                      ? 'border-rose-500 bg-rose-50/30 text-rose-700 font-bold'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  🤝 {t('credit')}
                </button>
              </div>
            </div>

            {/* Conditional: Amount Paid (For Credit/Udhari) */}
            {paymentMethod === 'credit' && (
              <div className="mb-4 p-3 bg-rose-50/25 border border-rose-100 rounded-xl">
                <label className="block text-[10px] text-rose-700 font-semibold uppercase tracking-wider mb-1.5">
                  {t('amount_paid')}
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-500 text-xs">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 50 (Leave empty for ₹0)"
                    value={customAmountPaid}
                    onChange={(e) => setCustomAmountPaid(e.target.value)}
                    className="w-full pl-6 pr-2.5 py-2 text-xs font-mono border border-rose-200 focus:border-rose-400 focus:outline-hidden bg-white rounded-lg text-rose-900"
                    min="0"
                    max={subtotal || undefined}
                    step="0.1"
                  />
                </div>
                <div className="flex justify-between items-center mt-2.5 text-[11px] font-mono font-medium text-rose-800">
                  <span>{t('bal_due')}:</span>
                  <span>₹{remainingBalance.toFixed(1)}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                {t('notes')}
              </label>
              <textarea
                placeholder={t('notes_placeholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg h-20 resize-none"
              />
            </div>
          </div>

          {/* Checkout Totals Summary Card */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-4 mb-4 text-xs font-mono flex flex-col gap-2">
              <div className="flex justify-between text-slate-500 font-semibold">
                <span>{t('subtotal')}</span>
                <span>₹{subtotal.toFixed(1)}</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-600">
                <span>{t('paid_amt')}</span>
                <span>₹{amountPaidDefault.toFixed(1)}</span>
              </div>
              {paymentMethod === 'credit' && remainingBalance > 0 && (
                <div className="flex justify-between font-bold text-rose-600 border-t border-dashed border-rose-100 pt-2 mt-1">
                  <span>{t('bal_due')}</span>
                  <span>₹{remainingBalance.toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleClearBill}
                className="px-4 py-3 border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                title={language === 'mr' ? 'बिल साफ करा' : 'Clear entire bill'}
              >
                <Trash2 className="w-4 h-4" />
                <span>{language === 'mr' ? 'क्लिअर' : 'Clear'}</span>
              </button>

              <button
                type="submit"
                disabled={cartItems.length === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold py-3 px-4 rounded-xl transition shadow-xs text-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {editingSale 
                    ? (language === 'mr' ? 'बिल सुधारा आणि जतन करा' : 'Update & Save Invoice')
                    : t('checkout_bill')}
                </span>
              </button>
            </div>
          </div>

        </form>
      </div>

      {/* Custom Add Customer Profile Modal */}
      {showAddProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800 text-base flex items-center gap-1.5">
                <Users className="w-5 h-5 text-emerald-600" />
                {t('add_profile_title')}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  {t('customer_name')} *
                </label>
                <input
                  type="text"
                  placeholder="Rajesh Patil"
                  value={newProfileName}
                  onChange={(e) => {
                    setNewProfileName(e.target.value);
                    setNewProfileError('');
                  }}
                  className="w-full text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  {t('customer_phone')} ({language === 'mr' ? 'ऐच्छिक' : 'Optional'})
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newProfilePhone}
                  onChange={(e) => setNewProfilePhone(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-mono font-medium"
                />
              </div>

              {newProfileError && (
                <p className="text-[11px] text-rose-600 font-medium bg-rose-50 px-2.5 py-1.5 rounded-lg">
                  ⚠️ {newProfileError}
                </p>
              )}

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProfileModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = newProfileName.trim();
                    if (!name) {
                      setNewProfileError('Please enter a customer name.');
                      return;
                    }
                    if (name === 'Walk-in Customer') {
                      setNewProfileError('Cannot create a profile with the reserved "Walk-in Customer" name.');
                      return;
                    }
                    // Save and link
                    onAddCustomerProfile(name, newProfilePhone.trim() || undefined);
                    setCustomerName(name);
                    setCustomerPhone(newProfilePhone.trim() || '');
                    setSelectedProfileId('manual'); // select manual custom inputs so edited fields stay active
                    setShowAddProfileModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  {language === 'mr' ? 'प्रोफाईल जतन करा' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Add Vegetable Modal */}
      {showAddVegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800 text-base flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                {language === 'mr' ? 'नवीन भाजी जोडा' : 'Quick Add Vegetable'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddVegModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  {language === 'mr' ? 'भाजीचे नाव *' : 'Vegetable Name *'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'mr' ? 'उदा. भेंडी, गवार' : 'e.g. Okra, Broccoli'}
                  value={newVegName}
                  onChange={(e) => {
                    setNewVegName(e.target.value);
                    setNewVegError('');
                  }}
                  className="w-full text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    {language === 'mr' ? 'नियमित दर / किलो (₹) *' : 'Default Rate/kg (₹) *'}
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 60"
                    min="1"
                    step="0.5"
                    value={newVegPrice}
                    onChange={(e) => {
                      setNewVegPrice(e.target.value);
                      setNewVegError('');
                    }}
                    className="w-full text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    {t('category')}
                  </label>
                  <select
                    value={newVegCategory}
                    onChange={(e) => setNewVegCategory(e.target.value as any)}
                    className="w-full text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden p-2.5 rounded-lg font-medium"
                  >
                    <option value="fleshy">{t('fleshy')}</option>
                    <option value="leafy">{t('leafy')}</option>
                    <option value="roots">{t('roots')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  {language === 'mr' ? 'इमोजी आयकॉन निवडा' : 'Select Emoji Icon'}
                </label>
                <div className="grid grid-cols-5 gap-2 p-2 bg-slate-50 border border-slate-100 rounded-xl max-h-32 overflow-y-auto">
                  {POPULAR_VEG_EMOJIS.map((emoji, index) => (
                    <button
                      type="button"
                      key={`pop-emoji-${emoji}-${index}`}
                      onClick={() => setNewVegEmoji(emoji)}
                      className={`text-lg p-1.5 rounded-lg transition hover:bg-white flex items-center justify-center cursor-pointer ${
                        newVegEmoji === emoji ? 'bg-white border border-emerald-500 scale-110 shadow-xs' : 'border border-transparent'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-400">{language === 'mr' ? 'किंवा टाईप करा:' : 'Or type custom:'}</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={newVegEmoji}
                    onChange={(e) => setNewVegEmoji(e.target.value)}
                    className="w-10 text-center border border-slate-200 focus:border-emerald-500 focus:outline-hidden p-1 rounded-lg text-sm bg-white animate-none"
                  />
                </div>
              </div>

              {newVegError && (
                <p className="text-[11px] text-rose-600 font-medium bg-rose-50 px-2.5 py-1.5 rounded-lg">
                  ⚠️ {newVegError}
                </p>
              )}

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVegModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = newVegName.trim();
                    const price = parseFloat(newVegPrice);
                    if (!name) {
                      setNewVegError(language === 'mr' ? 'कृपया भाजीचे नाव टाका.' : 'Please enter a vegetable name.');
                      return;
                    }
                    if (isNaN(price) || price <= 0) {
                      setNewVegError(language === 'mr' ? 'कृपया योग्य किंमत टाका.' : 'Please enter a valid rate greater than 0.');
                      return;
                    }

                    // Check if name already exists in catalog (case insensitive)
                    const exists = vegetables.some(v => v.name.toLowerCase() === name.toLowerCase());
                    if (exists) {
                      setNewVegError(language === 'mr' ? 'ही भाजी आधीपासूनच कॅटलॉगमध्ये आहे.' : 'This vegetable is already in the catalog.');
                      return;
                    }

                    // Save and immediately link/select
                    const createdVeg = onAddVegetable({
                      name,
                      defaultPrice: price,
                      category: newVegCategory,
                      imageEmoji: newVegEmoji.trim()
                    });

                    // Set select values
                    setSelectedVegId(createdVeg.id);
                    setCustomPrice(createdVeg.defaultPrice.toString());
                    
                    // Close modal
                    setShowAddVegModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  {language === 'mr' ? 'कॅटलॉगमध्ये जोडा' : 'Add to Catalog'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
}
