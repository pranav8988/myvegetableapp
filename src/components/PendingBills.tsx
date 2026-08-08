import { useState, useMemo, FormEvent } from 'react';
import { Sale, CustomerProfile } from '../types';
import { Search, Phone, Send, Receipt, CheckCircle, Clock, UserPlus, Plus, X, Calendar } from 'lucide-react';
import { useLanguage } from '../lib/translations';

interface PendingBillsProps {
  sales: Sale[];
  onUpdatePaymentStatus: (id: string, amountReceived: number) => void;
  customerProfiles?: CustomerProfile[];
  onAddSale?: (sale: Sale) => void;
}

interface CustomerDebt {
  customerName: string;
  customerPhone?: string;
  totalDebt: number;
  invoiceCount: number;
  oldestDate: string;
  newestDate: string;
  unpaidSales: Sale[];
}

export default function PendingBills({ 
  sales, 
  onUpdatePaymentStatus,
  customerProfiles = [],
  onAddSale
}: PendingBillsProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDebt | null>(null);
  const [settleAmount, setSettleAmount] = useState('');

  // Add Direct Credit Form states
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [newCreditName, setNewCreditName] = useState('');
  const [newCreditPhone, setNewCreditPhone] = useState('');
  const [newCreditAmount, setNewCreditAmount] = useState('');
  const [newCreditDate, setNewCreditDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newCreditNotes, setNewCreditNotes] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('manual');

  const handleProfileSelectInCredit = (profileId: string) => {
    setSelectedProfileId(profileId);
    if (profileId === 'manual') {
      setNewCreditName('');
      setNewCreditPhone('');
    } else {
      const profile = customerProfiles.find(p => p.id === profileId);
      if (profile) {
        setNewCreditName(profile.name);
        setNewCreditPhone(profile.phone || '');
      }
    }
  };

  const handleAddCreditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!onAddSale) return;

    const amountVal = parseFloat(newCreditAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    const nameToUse = newCreditName.trim();
    if (!nameToUse || nameToUse === 'Walk-in Customer') return;

    // Create a special SaleItem representing this direct credit balance entry
    const newItem = {
      id: `item-credit-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      vegName: language === 'mr' ? 'थेट उधारी नोंद (मागील येणे)' : 'Direct Credit Entry (Previous Dues)',
      vegEmoji: '📝',
      quantity: 1,
      pricePerKg: amountVal,
      total: amountVal,
    };

    const newSale: Sale = {
      id: `sale-credit-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      invoiceNumber: `CR-${Date.now().toString().slice(-6)}`,
      date: newCreditDate || new Date().toISOString().split('T')[0],
      customerName: nameToUse,
      customerPhone: newCreditPhone.trim() || undefined,
      items: [newItem],
      totalAmount: amountVal,
      amountPaid: 0,
      paymentMethod: 'credit',
      paymentStatus: 'pending',
      notes: newCreditNotes.trim() || (language === 'mr' ? 'थेट उधारी नोंद' : 'Direct Credit Book Entry'),
      createdAt: new Date().toISOString()
    };

    onAddSale(newSale);

    // Reset Form
    setNewCreditName('');
    setNewCreditPhone('');
    setNewCreditAmount('');
    setNewCreditNotes('');
    setNewCreditDate(new Date().toISOString().split('T')[0]);
    setSelectedProfileId('manual');
    setShowAddCreditModal(false);
  };

  // 1. Group unpaid/partially paid sales by customer
  const customerDebts = useMemo(() => {
    const map = new Map<string, CustomerDebt>();

    sales.forEach((sale) => {
      if (sale.paymentStatus === 'paid') return; // Ignore fully paid sales

      const balance = sale.totalAmount - sale.amountPaid;
      if (balance <= 0) return;

      // Unique key by Name + Phone to prevent merging different customers with same name
      const key = `${sale.customerName.trim().toLowerCase()}_${(sale.customerPhone || '').trim()}`;

      const existing = map.get(key);
      if (existing) {
        existing.totalDebt += balance;
        existing.invoiceCount += 1;
        existing.unpaidSales.push(sale);
        if (sale.date < existing.oldestDate) existing.oldestDate = sale.date;
        if (sale.date > existing.newestDate) existing.newestDate = sale.date;
      } else {
        map.set(key, {
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          totalDebt: balance,
          invoiceCount: 1,
          oldestDate: sale.date,
          newestDate: sale.date,
          unpaidSales: [sale]
        });
      }
    });

    // Sort unpaid sales in each customer record by date (oldest first) so we settle oldest first
    map.forEach((cust) => {
      cust.unpaidSales.sort((a, b) => a.date.localeCompare(b.date));
    });

    return Array.from(map.values()).sort((a, b) => b.totalDebt - a.totalDebt);
  }, [sales]);

  // Filter debts by search term
  const filteredDebts = useMemo(() => {
    return customerDebts.filter((debt) => {
      const matchesName = debt.customerName.toLowerCase().includes(search.toLowerCase());
      const matchesPhone = debt.customerPhone && debt.customerPhone.includes(search);
      return matchesName || matchesPhone;
    });
  }, [customerDebts, search]);

  const overallPendingDebt = useMemo(() => {
    return customerDebts.reduce((sum, item) => sum + item.totalDebt, 0);
  }, [customerDebts]);

  // Send WhatsApp payment reminder
  const handleSendReminder = (debt: CustomerDebt) => {
    const shopName = language === 'mr' ? t('app_title') : 'Fresh Farms Vegetable Mart';
    let msg = '';
    if (language === 'mr') {
      msg = `नमस्कार, *${shopName}* कडून!\n`;
      msg += `मा. ${debt.customerName},\n`;
      msg += `आपल्या भाजी खरेदीचे एकूण *₹${debt.totalDebt.toFixed(1)}* इतके बिल येणे बाकी आहे. (एकूण प्रलंबित बिले: ${debt.invoiceCount})\n`;
      msg += `सर्वात जुने प्रलंबित बिल तारीख: ${debt.oldestDate}\n\n`;
      msg += `कृपया आपली उधारी लवकरात लवकर यूपीआय (UPI) किंवा रोख रक्कमेत जमा करावी. धन्यवाद! 🥬🥦🍅`;
    } else {
      msg = `Greetings from *${shopName}*!\n`;
      msg += `Hello ${debt.customerName},\n`;
      msg += `This is a friendly reminder that you have a pending balance of *₹${debt.totalDebt.toFixed(1)}* for vegetables purchased on credit across ${debt.invoiceCount} invoices.\n`;
      msg += `Oldest unpaid bill from: ${debt.oldestDate}\n\n`;
      msg += `Kindly clear the outstanding dues via UPI or Cash at your earliest convenience. Thank you! 🥬🥦🍅`;
    }
    
    const encoded = encodeURIComponent(msg);
    const url = debt.customerPhone 
      ? `https://api.whatsapp.com/send?phone=91${debt.customerPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    
    window.open(url, '_blank');
  };

  // Open settlement dialog
  const handleOpenSettle = (debt: CustomerDebt) => {
    setSelectedCustomer(debt);
    setSettleAmount(debt.totalDebt.toString());
  };

  // Settle outstanding amount (distributes money from oldest invoice to newest)
  const handleSettleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    let payRemaining = parseFloat(settleAmount);
    if (isNaN(payRemaining) || payRemaining <= 0) return;

    // Distribute paid amount over customer's unpaid invoices, oldest first
    selectedCustomer.unpaidSales.forEach((sale) => {
      if (payRemaining <= 0) return;

      const saleDue = sale.totalAmount - sale.amountPaid;
      const paymentToApply = Math.min(payRemaining, saleDue);

      if (paymentToApply > 0) {
        onUpdatePaymentStatus(sale.id, paymentToApply);
        payRemaining -= paymentToApply;
      }
    });

    setSelectedCustomer(null);
    setSettleAmount('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      
      {/* LEFT: Debtors List (7 Columns) */}
      <div className="xl:col-span-7 flex flex-col gap-4">
        
        {/* Total stats */}
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
          <div>
            <p className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">{language === 'mr' ? 'एकूण थकबाकी (उधारी)' : 'Total Active Credit Book'}</p>
            <p className="text-2xl font-display font-bold text-rose-700 mt-1 font-mono">₹{overallPendingDebt.toFixed(1)}</p>
            <p className="text-xs text-rose-600/80 mt-1">
              {language === 'mr' ? `एकूण ${customerDebts.length} ग्राहकांचे येणे बाकी` : `Outstanding dues from ${customerDebts.length} customers`}
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-center">
            {onAddSale && (
              <button
                onClick={() => setShowAddCreditModal(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Add Customer/Debt Entry to Credit Book"
              >
                <UserPlus className="w-4 h-4" />
                <span>{language === 'mr' ? 'उधारी नोंद जोडा' : 'Add Credit Entry'}</span>
              </button>
            )}
            <span className="text-3xl filter saturate-75 hidden sm:inline">🤝</span>
          </div>
        </div>

        {/* Search & List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-50 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('search_debtors')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px]">
            {filteredDebts.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs px-4">
                {customerDebts.length === 0 
                  ? t('no_debtors_found') 
                  : (language === 'mr' ? 'शोध निकषाशी जुळणारे उधारी खाते सापडले नाही.' : 'No credit records match your search criteria.')}
              </div>
            ) : (
              filteredDebts.map((debt, idx) => (
                <div
                  key={`debt-item-${debt.customerName}-${debt.customerPhone || 'phone'}-${idx}`}
                  className="p-4 hover:bg-slate-50/50 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center font-display font-bold text-rose-700 text-sm">
                      {debt.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{debt.customerName}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-medium">
                        {debt.customerPhone ? (
                          <span className="flex items-center gap-0.5 font-mono">
                            <Phone className="w-2.5 h-2.5" />
                            {debt.customerPhone}
                          </span>
                        ) : (
                          <span>{language === 'mr' ? 'फोन नाही' : 'No Phone'}</span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {language === 'mr' ? 'पहिले बिल' : 'Oldest'}: {debt.oldestDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Debt display */}
                    <div className="text-right">
                      <p className="font-mono font-bold text-rose-600 text-sm">₹{debt.totalDebt.toFixed(1)}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                        {language === 'mr' ? `${debt.invoiceCount} प्रलंबित बिले` : `${debt.invoiceCount} pending bills`}
                      </p>
                    </div>

                    {/* Quick actions buttons */}
                    <div className="flex gap-1">
                      {/* Reminder */}
                      <button
                        onClick={() => handleSendReminder(debt)}
                        className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition cursor-pointer"
                        title="Send WhatsApp Reminder"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      
                      {/* Settle */}
                      <button
                        onClick={() => handleOpenSettle(debt)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] py-1 px-2.5 rounded-lg transition cursor-pointer"
                      >
                        {language === 'mr' ? 'जमा' : 'Settle'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* RIGHT: Detailed Customer Ledgers (5 Columns) */}
      <div className="xl:col-span-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-full flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-base mb-4 border-b border-slate-50 pb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              {t('credit_history')}
            </h3>

            {customerDebts.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
                <p>{language === 'mr' ? 'उधारी खाते रिकामे आहे.' : 'Outstanding ledger is empty.'}</p>
                <p className="text-[10px]">{language === 'mr' ? 'जेव्हा तुम्ही बिल उधारीवर कराल, तेव्हा ती नोंद येथे दिसेल.' : 'When you save sales as credit/pending, they show up here.'}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-slate-500 text-xs">
                  {language === 'mr' 
                    ? 'खालील उधारी तपशील तपासा. उधारी जमा करण्यासाठी डाव्या बाजूला संबंधित ग्राहकासमोर "जमा" निवडा.' 
                    : 'Review credit details below. To clear a balance, find the customer on the left and select the Settle action.'}
                </p>

                {/* mini summary scrollbox */}
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[360px] pr-1">
                  {customerDebts.map((debt, index) => (
                    <div key={`${debt.customerName}-${debt.customerPhone || ''}-${index}`} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-xs text-slate-800">{debt.customerName}</span>
                        <span className="font-mono font-bold text-xs text-rose-600">₹{debt.totalDebt.toFixed(1)}</span>
                      </div>
                      <div className="space-y-1.5">
                        {debt.unpaidSales.map((sale, sIdx) => {
                          const unpaidVal = sale.totalAmount - sale.amountPaid;
                          return (
                            <div key={`unpaid-bill-${sale.id || 'bill'}-${sale.invoiceNumber || 'inv'}-${sIdx}`} className="flex justify-between text-[10px] font-mono text-slate-500 border-t border-slate-100/60 pt-1.5">
                              <span>{sale.date} ({sale.invoiceNumber})</span>
                              <span>₹{unpaidVal.toFixed(1)} {language === 'mr' ? 'बाकी' : 'due'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mt-6 text-[11px] text-slate-500 italic">
            💡 <strong>Pro Tip:</strong> {language === 'mr' ? 'ग्राहकास व्हाट्सएपवर उधारीचे पेमेंट रिमाइंडर पाठवण्यासाठी "कागदी विमान (Send)" आयकॉनवर क्लिक करा.' : 'Click the Send button next to any customer to open WhatsApp with a ready-to-send payment reminder text.'}
          </div>
        </div>
      </div>

      {/* Settlement Dialog */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <h3 className="font-display font-bold text-slate-800 text-base mb-1">{t('receive_payment_title')}</h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'mr' 
                ? `ग्राहक ${selectedCustomer.customerName} कडून जमा पेमेंट. या रक्कमेद्वारे सर्वात जुने बिल प्रथम जमा केले जाईल.`
                : `Receiving payment from ${selectedCustomer.customerName}. Funds will automatically pay off their oldest bills first.`}
            </p>

            <form onSubmit={handleSettleSubmit} className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-xs text-slate-500 font-medium mb-1 font-mono">
                  <span>{language === 'mr' ? 'एकूण बाकी उधारी:' : 'Total Credit Dues:'}</span>
                  <span>₹{selectedCustomer.totalDebt.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-medium mb-3 font-mono">
                  <span>{language === 'mr' ? 'एकूण बिले:' : 'Total Bills:'}</span>
                  <span>{selectedCustomer.invoiceCount} {language === 'mr' ? 'प्रलंबित' : 'pending'}</span>
                </div>

                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">{t('amount_to_receive')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
                  <input
                    type="number"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 text-xs font-mono border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-hidden"
                    min="0.1"
                    max={selectedCustomer.totalDebt}
                    step="0.1"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setSettleAmount('');
                  }}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
                >
                  {language === 'mr' ? 'उधारी जमा करा' : 'Settle Debt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100/60">
              <h3 className="font-display font-bold text-slate-800 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-rose-600" />
                {language === 'mr' ? 'उधारी खाते जोडा (नवीन नोंद)' : 'Add Customer / Credit Entry'}
              </h3>
              <button 
                onClick={() => setShowAddCreditModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCreditSubmit} className="flex flex-col gap-4 text-left">
              
              {/* Profile selector if profiles exist */}
              {customerProfiles && customerProfiles.length > 0 && (
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                    {language === 'mr' ? 'ग्राहक प्रोफाइल निवडा (पर्यायी)' : 'Select Customer Profile (Optional)'}
                  </label>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => handleProfileSelectInCredit(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white focus:border-rose-500 focus:outline-hidden p-2.5 rounded-lg font-medium"
                  >
                    <option value="manual">-- {language === 'mr' ? 'नवीन ग्राहक किंवा हस्तलिखित नाव' : 'New Customer / Enter Manually'} --</option>
                    {customerProfiles.map((p, index) => (
                      <option key={`profile-${p.id || 'cust'}-${p.name}-${index}`} value={p.id}>
                        👤 {p.name} {p.phone ? `(${p.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer Name */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  {language === 'mr' ? 'ग्राहकाचे नाव *' : 'Customer Name *'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'mr' ? "उदा. रमेश पाटील" : "e.g. Ramesh Patil"}
                  value={newCreditName}
                  onChange={(e) => {
                    setNewCreditName(e.target.value);
                    if (selectedProfileId !== 'manual') setSelectedProfileId('manual');
                  }}
                  className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-lg focus:border-rose-500 focus:outline-hidden font-medium"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  {language === 'mr' ? 'फोन नंबर (व्हॉट्सॲपसाठी)' : 'Phone Number (for WhatsApp)'}
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newCreditPhone}
                  onChange={(e) => {
                    setNewCreditPhone(e.target.value);
                    if (selectedProfileId !== 'manual') setSelectedProfileId('manual');
                  }}
                  className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-lg focus:border-rose-500 focus:outline-hidden font-mono"
                  pattern="[0-9]{10}"
                  title={language === 'mr' ? "कृपया वैध १०-अंकी मोबाईल नंबर प्रविष्ट करा" : "Please enter a valid 10-digit mobile number"}
                />
              </div>

              {/* Credit Amount */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  {language === 'mr' ? 'उधारी रक्कम (₹) *' : 'Outstanding Credit Amount (₹) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
                  <input
                    type="number"
                    value={newCreditAmount}
                    onChange={(e) => setNewCreditAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2.5 text-xs font-mono border border-slate-200 rounded-lg focus:border-rose-500 focus:outline-hidden"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  {language === 'mr' ? 'तारीख' : 'Date'}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="date"
                    value={newCreditDate}
                    onChange={(e) => setNewCreditDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-lg focus:border-rose-500 focus:outline-hidden font-mono"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  {language === 'mr' ? 'तपशील / टीप (पर्यायी)' : 'Notes / Description (Optional)'}
                </label>
                <textarea
                  placeholder={language === 'mr' ? "उदा. मागील उधारी, भाजी उधारी इ." : "e.g. Previous balance, weekly veggies bill"}
                  value={newCreditNotes}
                  onChange={(e) => setNewCreditNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-rose-500 focus:outline-hidden h-16 resize-none font-medium"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCreditModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-xs cursor-pointer"
                >
                  {language === 'mr' ? 'उधारी नोंद जोडा' : 'Add to Credit Book'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
