import { useMemo } from 'react';
import { Sale } from '../types';
import { TrendingUp, CreditCard, Clock, Activity } from 'lucide-react';
import { useLanguage } from '../lib/translations';

interface StatCardsProps {
  sales: Sale[];
}

export default function StatCards({ sales }: StatCardsProps) {
  const { t } = useLanguage();

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter((s) => s.date === todayStr);

    let todayTotal = 0;
    let todayCash = 0;
    let todayUpi = 0;
    let todayPending = 0;

    // Calculate today's payments and sales
    todaySales.forEach((s) => {
      todayTotal += s.totalAmount;
      if (s.paymentMethod === 'cash') {
        todayCash += s.amountPaid;
      } else if (s.paymentMethod === 'upi') {
        todayUpi += s.amountPaid;
      }
      
      const balance = s.totalAmount - s.amountPaid;
      if (balance > 0) {
        todayPending += balance;
      }
    });

    // Calculate overall outstanding debt
    let totalPendingDebt = 0;
    let totalDebtorsCount = 0;
    const debtorSet = new Set<string>();

    sales.forEach((s) => {
      const balance = s.totalAmount - s.amountPaid;
      if (balance > 0) {
        totalPendingDebt += balance;
        const key = `${s.customerName.trim().toLowerCase()}_${(s.customerPhone || '').trim()}`;
        debtorSet.add(key);
      }
    });
    totalDebtorsCount = debtorSet.size;

    // Calculate top selling vegetable today by quantity
    const vegQtyMap = new Map<string, { qty: number; emoji: string }>();
    todaySales.forEach((s) => {
      s.items.forEach((item) => {
        const existing = vegQtyMap.get(item.vegName);
        if (existing) {
          existing.qty += item.quantity;
        } else {
          vegQtyMap.set(item.vegName, { qty: item.quantity, emoji: item.vegEmoji });
        }
      });
    });

    let topVeg: { name: string; qty: number; emoji: string } | null = null;
    vegQtyMap.forEach((val, key) => {
      if (!topVeg || val.qty > topVeg.qty) {
        topVeg = { name: key, qty: val.qty, emoji: val.emoji };
      }
    });

    return {
      todayTotal,
      todayCash,
      todayUpi,
      todayPending,
      totalPendingDebt,
      totalDebtorsCount,
      topVeg,
    };
  }, [sales]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Today's Sales Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-xs transition flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('todays_sales')}</p>
          <p className="text-2xl font-display font-bold text-slate-800 mt-1 font-mono">₹{stats.todayTotal.toFixed(1)}</p>
          <p className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-1 items-center">
            <span className="text-emerald-500 font-bold">💵 {t('cash')}: ₹{stats.todayCash.toFixed(1)}</span>
            <span>|</span>
            <span className="text-blue-500 font-bold">📱 {t('upi')}: ₹{stats.todayUpi.toFixed(1)}</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>

      {/* Credit Ledger Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-xs transition flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('total_credit')}</p>
          <p className="text-2xl font-display font-bold text-rose-600 mt-1 font-mono">₹{stats.totalPendingDebt.toFixed(1)}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {t('owed_by')} <strong className="text-rose-700">{stats.totalDebtorsCount} {t('customers')}</strong>
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* Today's Credit Dues Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-xs transition flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('new_credit_today')}</p>
          <p className="text-2xl font-display font-bold text-amber-600 mt-1 font-mono">₹{stats.todayPending.toFixed(1)}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {t('pending_credit_desc')}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-50/70 text-amber-600 flex items-center justify-center">
          <CreditCard className="w-5 h-5" />
        </div>
      </div>

      {/* Top Vegetable Sold Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-xs transition flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('top_seller')}</p>
          {stats.topVeg ? (
            <>
              <p className="text-lg font-display font-bold text-slate-800 mt-1.5 flex items-center gap-1.5 leading-tight">
                <span>{stats.topVeg.emoji}</span>
                <span>{t(stats.topVeg.name)}</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                {t('total_sold')}: <strong className="text-emerald-600">{stats.topVeg.qty.toFixed(2)} kg</strong>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-400 mt-2">{t('no_sales_today')}</p>
              <p className="text-[10px] text-slate-400 mt-1">{t('waiting_sale')}</p>
            </>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
          <Activity className="w-5 h-5" />
        </div>
      </div>

    </div>
  );
}
