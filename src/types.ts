export interface Vegetable {
  id: string;
  name: string;
  defaultPrice: number; // Price per kg
  category: 'leafy' | 'roots' | 'fleshy' | 'other';
  imageEmoji: string; // Emoji representing the vegetable
}

export interface SaleItem {
  id: string;
  vegName: string;
  vegEmoji: string;
  quantity: number; // In kg
  pricePerKg: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  totalAmount: number;
  amountPaid: number;
  paymentMethod: 'cash' | 'upi' | 'credit';
  paymentStatus: 'paid' | 'pending' | 'partial';
  notes?: string;
  createdAt: string; // ISO string
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export interface VegetableStats {
  todayTotal: number;
  todayCash: number;
  todayUpi: number;
  todayPending: number;
  pendingCount: number;
  topSelling: { name: string; quantity: number } | null;
}

export interface ShopDetails {
  name: string;
  address: string;
  phone: string;
  gstin?: string;
  logo?: string; // Image DataURL (Base64), image URL, or custom emoji
}

