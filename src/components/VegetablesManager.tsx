import { useState, FormEvent, useEffect } from 'react';
import { Vegetable } from '../types';
import { Plus, Edit2, Trash2, Check, X, Search, RotateCcw, Share2, Copy, FileText, Upload, Sparkles, HelpCircle, AlertCircle } from 'lucide-react';
import { useLanguage, translations } from '../lib/translations';
import { motion, AnimatePresence } from 'motion/react';

interface ParsedRateItem {
  originalLine: string;
  matchedVeg: Vegetable | null;
  parsedName: string;
  parsedPrice: number;
  parsedEmoji?: string;
}

const POPULAR_VEG_EMOJIS = [
  '🍅', '🍆', '🥔', '🧅', '🥬', '🌿', '🥕', '🌽', '🥦', '🧄', '🌶️', '🍋', '🥒', '🍄', '🥑', '🍎', '🍐', '🍊', '🍌', '🍉', '🍇', '🍓', '🍍', '🥥'
];

// Cleaner helper for matching names across languages
function cleanNameForMatching(name: string): string {
  let cleaned = name.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, ''); // Emojis
  cleaned = cleaned.replace(/\([^)]*\)/g, ''); // Content in parentheses like (Methi)
  cleaned = cleaned.replace(/[₹$#*_\u2022]/g, ''); // Symbols
  return cleaned.trim().toLowerCase().replace(/\s+/g, '');
}

// Find matching vegetable from list
function findMatchingVegetable(parsedName: string, vegetablesList: Vegetable[]): Vegetable | null {
  const targetCleaned = cleanNameForMatching(parsedName);
  if (!targetCleaned) return null;

  for (const veg of vegetablesList) {
    // A. Direct match with veg.name
    const nameCleaned = veg.name.toLowerCase().replace(/\s+/g, '');
    if (nameCleaned === targetCleaned) return veg;

    // B. Match with English translation from dictionary if different
    const enTranslation = (translations.en as any)[veg.name];
    if (enTranslation) {
      const enCleaned = enTranslation.toLowerCase().replace(/\s+/g, '').replace(/\([^)]*\)/g, '');
      if (enCleaned === targetCleaned || targetCleaned.includes(enCleaned) || enCleaned.includes(targetCleaned)) {
        return veg;
      }
    }

    // C. Match with Marathi translation from dictionary (e.g. "टोमॅटो")
    const mrTranslation = (translations.mr as any)[veg.name];
    if (mrTranslation) {
      const mrCleaned = mrTranslation.toLowerCase().replace(/\s+/g, '').replace(/\([^)]*\)/g, '');
      if (mrCleaned === targetCleaned || targetCleaned.includes(mrCleaned) || mrCleaned.includes(targetCleaned)) {
        return veg;
      }
    }

    // D. Soft substring match as fallback
    if (nameCleaned.includes(targetCleaned) || targetCleaned.includes(nameCleaned)) {
      return veg;
    }
  }
  return null;
}

// Parse input text into structured items
function parseAndMatchRateList(text: string, vegetablesList: Vegetable[]): ParsedRateItem[] {
  const lines = text.split(/\r?\n/);
  const results: ParsedRateItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip typical header metadata
    const lowerLine = trimmed.toLowerCase();
    if (
      lowerLine.startsWith('date') ||
      lowerLine.startsWith('दिनांक') ||
      lowerLine.startsWith('phone') ||
      lowerLine.startsWith('फोन') ||
      lowerLine.startsWith('address') ||
      lowerLine.startsWith('पत्ता') ||
      lowerLine.startsWith('gstin') ||
      lowerLine.startsWith('जीएसटी') ||
      lowerLine.includes('sales report') ||
      lowerLine.includes('rate list') ||
      lowerLine.includes('दर पत्रक') ||
      lowerLine.includes('vegetable rate') ||
      lowerLine.includes('thank you') ||
      lowerLine.includes('धन्यवाद') ||
      lowerLine.startsWith('===') ||
      lowerLine.startsWith('---') ||
      lowerLine.startsWith('***')
    ) {
      continue;
    }

    let namePart = '';
    let pricePart = '';

    const separatorMatch = trimmed.match(/[:\-=\u2013\u2014]/); // colon, hyphen, en-dash, em-dash, equals
    if (separatorMatch && separatorMatch.index !== undefined) {
      namePart = trimmed.substring(0, separatorMatch.index);
      pricePart = trimmed.substring(separatorMatch.index + 1);
    } else {
      // Find first occurrence of a number
      const numberMatch = trimmed.match(/\d+(?:\.\d+)?/);
      if (numberMatch && numberMatch.index !== undefined) {
        namePart = trimmed.substring(0, numberMatch.index);
        pricePart = trimmed.substring(numberMatch.index);
      } else {
        continue; // No price found, skip
      }
    }

    // Extract emoji from namePart
    const emojiRegex = /[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g;
    const emojiMatch = namePart.match(emojiRegex);
    const emoji = emojiMatch ? emojiMatch[0] : undefined;

    // Clean name
    let cleanName = namePart.replace(emojiRegex, '');
    cleanName = cleanName.replace(/\([^)]*\)/g, ''); // remove parentheses like (Methi)
    cleanName = cleanName.replace(/[₹$#*_\u2022]/g, ''); // remove symbol fluff
    cleanName = cleanName.trim();

    if (!cleanName) continue;

    // Extract numeric price
    const priceMatch = pricePart.match(/\d+(?:\.\d+)?/);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[0]);
    if (isNaN(price) || price <= 0 || price > 10000) continue;

    const matchedVeg = findMatchingVegetable(cleanName, vegetablesList);

    results.push({
      originalLine: trimmed,
      matchedVeg,
      parsedName: cleanName,
      parsedPrice: price,
      parsedEmoji: emoji,
    });
  }

  return results;
}

// Generate rate list text for export
function generateRateListText(
  vegetables: Vegetable[],
  shopName: string,
  language: string
): string {
  const today = new Date();
  const dateStr = today.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  let text = '';
  if (language === 'mr') {
    text += `📋 *${shopName} - दर पत्रक*\n`;
    text += `📅 दिनांक: ${dateStr}\n`;
    text += `========================\n\n`;
    
    const sorted = [...vegetables].sort((a, b) => a.category.localeCompare(b.category));
    sorted.forEach((veg) => {
      const mrName = (translations.mr as any)[veg.name] || veg.name;
      text += `${veg.imageEmoji} ${mrName}: ₹${veg.defaultPrice.toFixed(0)}/kg\n`;
    });
    
    text += `\n========================\n`;
    text += `🙏 आमच्या दुकानला भेट दिल्याबद्दल धन्यवाद!`;
  } else {
    text += `📋 *${shopName} - Rate List*\n`;
    text += `📅 Date: ${dateStr}\n`;
    text += `========================\n\n`;
    
    const sorted = [...vegetables].sort((a, b) => a.category.localeCompare(b.category));
    sorted.forEach((veg) => {
      text += `${veg.imageEmoji} ${veg.name}: ₹${veg.defaultPrice.toFixed(0)}/kg\n`;
    });
    
    text += `\n========================\n`;
    text += `🙏 Thank you for your business!`;
  }

  return text;
}

interface VegetablesManagerProps {
  vegetables: Vegetable[];
  onAdd: (veg: Omit<Vegetable, 'id'>) => void;
  onUpdate: (veg: Vegetable) => void;
  onDelete: (id: string) => void;
  onResetToDefault: () => void;
  onBulkUpdate: (updatedList: Vegetable[]) => void;
  shopDetails: { name: string; address?: string; phone?: string; gstin?: string; logo?: string };
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export default function VegetablesManager({
  vegetables,
  onAdd,
  onUpdate,
  onDelete,
  onResetToDefault,
  onBulkUpdate,
  shopDetails,
  showConfirm,
}: VegetablesManagerProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Add new state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState<'leafy' | 'roots' | 'fleshy' | 'other'>('other');
  const [newEmoji, setNewEmoji] = useState('');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');

  // Rate list modal states
  const [isRateListOpen, setIsRateListOpen] = useState(false);
  const [activeRateTab, setActiveRateTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedRateItem[]>([]);
  const [includeNew, setIncludeNew] = useState(true);
  const [includeExisting, setIncludeExisting] = useState(true);
  const [copiedNotification, setCopiedNotification] = useState(false);

  useEffect(() => {
    if (activeRateTab === 'import' && importText.trim()) {
      const parsed = parseAndMatchRateList(importText, vegetables);
      setParsedItems(parsed);
    } else {
      setParsedItems([]);
    }
  }, [importText, activeRateTab, vegetables]);

  const handleCopyRateList = () => {
    const text = generateRateListText(vegetables, shopDetails.name, language);
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleApplyRates = () => {
    if (parsedItems.length === 0) return;

    let updatedList = [...vegetables];
    let addedCount = 0;
    let updatedCount = 0;

    parsedItems.forEach((item) => {
      if (item.matchedVeg) {
        if (includeExisting) {
          updatedList = updatedList.map((v) =>
            v.id === item.matchedVeg!.id
              ? { ...v, defaultPrice: item.parsedPrice }
              : v
          );
          updatedCount++;
        }
      } else {
        if (includeNew) {
          const newVeg: Vegetable = {
            id: `veg-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            name: item.parsedName,
            defaultPrice: item.parsedPrice,
            category: 'other',
            imageEmoji: item.parsedEmoji || '🥦'
          };
          updatedList.push(newVeg);
          addedCount++;
        }
      }
    });

    onBulkUpdate(updatedList);
    setIsRateListOpen(false);
    setImportText('');

    const successMsg = language === 'mr'
      ? `यशस्वीरित्या दर लागू केले! ${updatedCount} दर बदलले आणि ${addedCount} नवीन भाजीपाला जोडला.`
      : `Rates applied successfully! Updated ${updatedCount} items and added ${addedCount} new items.`;
    
    showConfirm(
      language === 'mr' ? 'यशस्वी झाले' : 'Success',
      successMsg,
      () => {}
    );
  };

  const categories = [
    { value: 'all', label: language === 'mr' ? 'सर्व भाजीपाला' : 'All Items' },
    { value: 'fleshy', label: `${t('fleshy') || 'Fleshy'} 🍅🍆` },
    { value: 'roots', label: `${t('roots') || 'Roots'} 🥔🧅` },
    { value: 'leafy', label: `${t('leafy') || 'Leafy'} 🥬🌿` },
    { value: 'other', label: `${t('other') || 'Other'} 🌶️🍋` },
  ];

  const handleAddNew = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice) return;

    onAdd({
      name: newName.trim(),
      defaultPrice: parseFloat(newPrice) || 0,
      category: newCategory,
      imageEmoji: newEmoji.trim()
    });

    // Reset Form
    setNewName('');
    setNewPrice('');
    setNewCategory('other');
    setNewEmoji('');
    setIsAdding(false);
  };

  const startEdit = (veg: Vegetable) => {
    setEditingId(veg.id);
    setEditPrice(veg.defaultPrice.toString());
    setEditName(veg.name);
    setEditEmoji(veg.imageEmoji || '🥦');
  };

  const handleSaveEdit = (veg: Vegetable) => {
    const updatedPrice = parseFloat(editPrice);
    if (isNaN(updatedPrice) || !editName.trim()) return;

    onUpdate({
      ...veg,
      name: editName.trim(),
      defaultPrice: updatedPrice,
      imageEmoji: editEmoji.trim() || veg.imageEmoji || '🥦'
    });
    setEditingId(null);
  };

  const filteredVegetables = vegetables.filter((veg) => {
    const matchesSearch = 
      veg.name.toLowerCase().includes(search.toLowerCase()) || 
      t(veg.name).toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || veg.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Top action bar */}
      <div className="p-6 border-b border-slate-50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-slate-50/50">
        <div>
          <h2 className="font-display font-bold text-slate-800 text-lg">
            {t('veg_catalog') || 'Vegetable Catalog'}
          </h2>
          <p className="text-slate-500 text-xs">
            {language === 'mr' 
              ? 'भाजीपाला सूची, प्रकार आणि मार्केटचे नियमित दर व्यवस्थापित करा' 
              : 'Manage current list of items, categories, and standard market prices'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-2 px-3.5 rounded-lg transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('add_new_veg') || 'Add Vegetable'}
          </button>
          <button
            onClick={() => setIsRateListOpen(true)}
            className="flex items-center gap-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 font-semibold text-xs py-2 px-3.5 rounded-lg transition cursor-pointer"
            title={t('rate_list')}
          >
            <Share2 className="w-3.5 h-3.5" />
            {t('rate_list')}
          </button>
          <button
            onClick={onResetToDefault}
            className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs py-2 px-3 rounded-lg transition cursor-pointer"
            title={t('reset_default') || 'Reset Catalog to Defaults'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('reset_default') || 'Reset Defaults'}
          </button>
        </div>
      </div>

      {/* Adding item form card */}
      {isAdding && (
        <div className="p-5 border-b border-slate-100 bg-emerald-50/30">
          <form onSubmit={handleAddNew} className="flex flex-col gap-3">
            <h3 className="font-display font-semibold text-xs text-emerald-800 uppercase tracking-wider">
              {language === 'mr' ? 'नवीन भाजीपाला जोडा' : 'New Vegetable Item'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Name */}
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">
                  {t('veg_name') || 'Item Name'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'mr' ? 'उदा. कोबी, भेंडी' : 'e.g. Cabbage'}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs border border-slate-200 focus:border-emerald-500 focus:outline-hidden bg-white p-2 rounded-lg"
                  required
                />
              </div>
              {/* Price */}
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">
                  {t('price_kg') || 'Price per kg (₹)'}
                </label>
                <input
                  type="number"
                  placeholder="₹/kg"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full text-xs border border-slate-200 focus:border-emerald-500 focus:outline-hidden bg-white p-2 rounded-lg"
                  min="0.1"
                  step="0.1"
                  required
                />
              </div>
              {/* Category */}
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">
                  {t('category') || 'Category'}
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 focus:border-emerald-500 focus:outline-hidden bg-white p-2 rounded-lg cursor-pointer font-medium"
                >
                  <option value="fleshy">{t('fleshy') || 'Fleshy'}</option>
                  <option value="roots">{t('roots') || 'Roots'}</option>
                  <option value="leafy">{t('leafy') || 'Leafy'}</option>
                  <option value="other">{t('other') || 'Other'}</option>
                </select>
              </div>
              {/* Emoji */}
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">
                  {t('emoji_icon') || 'Emoji Icon'}
                </label>
                <input
                  type="text"
                  placeholder="🥕"
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  className="w-full text-xs border border-slate-200 focus:border-emerald-500 focus:outline-hidden bg-white p-2 rounded-lg text-center"
                />
              </div>
            </div>

            {/* Quick Emoji Selection Box */}
            <div className="bg-white/85 p-3 rounded-xl border border-slate-100/80 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {language === 'mr' ? 'त्वरित इमोजी निवडा' : 'Quick Emoji Pick'}
                </span>
                {newEmoji && (
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold select-none">
                    {language === 'mr' ? 'निवडलेला:' : 'Selected:'} {newEmoji}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 p-2 bg-slate-50/50 rounded-lg">
                {POPULAR_VEG_EMOJIS.map((emoji) => (
                  <button
                    key={`new-emoji-${emoji}`}
                    type="button"
                    onClick={() => setNewEmoji(emoji)}
                    className={`text-lg p-2 rounded-lg transition hover:scale-125 hover:bg-white cursor-pointer flex items-center justify-center ${
                      newEmoji === emoji ? 'bg-emerald-100 border border-emerald-300 scale-110 shadow-xs' : 'border border-transparent'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4.5 py-1.5 rounded-lg transition cursor-pointer"
              >
                {language === 'mr' ? 'भाजीपाला जतन करा' : 'Save Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === 'mr' ? 'भाजीपाला शोधा...' : 'Search vegetables...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-hidden"
          />
        </div>
        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedCategory === cat.value
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog items Grid */}
      <div className="p-6">
        {filteredVegetables.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-medium">
            {language === 'mr' 
              ? 'तुमच्या शोधाशी जुळणारा कोणताही भाजीपाला सापडला नाही. वरील बटण वापरून नवीन जोडा!' 
              : 'No vegetables found matching your search. Add some using the button above!'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredVegetables.map((veg, index) => {
              const isEditing = editingId === veg.id;
              return (
                <div
                  key={`veg-card-${veg.id || 'veg'}-${veg.name}-${index}`}
                  className={`border rounded-xl p-3 flex flex-col justify-between transition-all group ${
                    isEditing 
                      ? 'border-emerald-300 bg-emerald-50/20' 
                      : 'border-slate-100 hover:border-emerald-200 hover:shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editEmoji}
                          onChange={(e) => setEditEmoji(e.target.value)}
                          className="w-10 text-center text-xs p-1 border border-slate-200 rounded-md focus:outline-hidden focus:border-emerald-500 bg-white"
                          maxLength={2}
                          title={language === 'mr' ? 'इमोजी' : 'Emoji'}
                        />
                      </div>
                    ) : (
                      <span className="text-2xl select-none" role="img" aria-label={veg.name}>
                        {veg.imageEmoji}
                      </span>
                    )}
                    
                    {/* Category Label */}
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 px-1.5 py-0.5 rounded-md">
                      {t(veg.category) || veg.category}
                    </span>
                  </div>

                  {/* Body Details */}
                  <div className="my-3">
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full text-xs font-semibold p-1.5 border border-slate-200 rounded-md focus:outline-hidden focus:border-emerald-500 bg-white font-medium"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded-md focus:outline-hidden focus:border-emerald-500 font-mono font-medium bg-white"
                            step="0.1"
                          />
                        </div>
                        
                        {/* Quick edit emoji pickers */}
                        <div className="flex flex-wrap gap-1 mt-1 p-1 bg-slate-50 rounded-md max-h-[50px] overflow-y-auto border border-slate-100">
                          {POPULAR_VEG_EMOJIS.map((emoji) => (
                            <button
                              key={`edit-emoji-${veg.id}-${emoji}`}
                              type="button"
                              onClick={() => setEditEmoji(emoji)}
                              className={`text-xs p-1 rounded-sm hover:bg-white cursor-pointer transition hover:scale-125 ${
                                editEmoji === emoji ? 'bg-emerald-100 scale-110 border border-emerald-200' : ''
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-semibold text-slate-800 text-sm truncate" title={t(veg.name)}>
                          {t(veg.name)}
                        </h4>
                        <p className="text-xs font-semibold text-emerald-600 mt-1 font-mono">
                          ₹{veg.defaultPrice.toFixed(1)} <span className="text-[10px] text-slate-400 font-sans font-normal">/ kg</span>
                        </p>
                      </>
                    )}
                  </div>

                  {/* Action buttons footer */}
                  <div className="flex items-center justify-end gap-1.5 border-t border-slate-50/80 pt-2 mt-1">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition cursor-pointer"
                          title={t('cancel') || 'Cancel'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(veg)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100 transition cursor-pointer"
                          title={language === 'mr' ? 'बदल जतन करा' : 'Save Changes'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(veg)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 opacity-100 md:opacity-45 md:group-hover:opacity-100 hover:!opacity-100 transition cursor-pointer"
                          title={language === 'mr' ? 'सुधारा' : 'Edit'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            showConfirm(
                              language === 'mr' ? 'भाजी काढा' : 'Delete Vegetable',
                              t('delete_veg_confirm') || 'Are you sure you want to delete this vegetable?',
                              () => onDelete(veg.id)
                            );
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 opacity-100 md:opacity-45 md:group-hover:opacity-100 hover:!opacity-100 transition cursor-pointer"
                          title={language === 'mr' ? 'यादीतून काढा' : 'Delete Vegetable'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rate List Import/Export Modal */}
      <AnimatePresence>
        {isRateListOpen && (
          <motion.div
            key="rate-list-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print"
          >
            <motion.div
              key="rate-list-modal-container"
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-800 text-sm md:text-base">
                      {t('rate_list')}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {t('rate_list_desc')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsRateListOpen(false);
                    setImportText('');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex border-b border-slate-100 bg-slate-50/20 p-2 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveRateTab('export')}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-lg transition cursor-pointer ${
                    activeRateTab === 'export'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {t('export_rates')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRateTab('import')}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-lg transition cursor-pointer ${
                    activeRateTab === 'import'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  {t('import_rates')}
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
                {activeRateTab === 'export' ? (
                  <div className="flex flex-col gap-4">
                    {/* Share Text Box */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {language === 'mr' ? 'कॉपी करण्यासाठी मजकूर' : 'Shareable Text'}
                      </label>
                      <textarea
                        readOnly
                        value={generateRateListText(vegetables, shopDetails.name, language)}
                        className="w-full h-64 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-hidden resize-none leading-relaxed text-slate-700"
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                        <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                          {language === 'mr'
                            ? 'हा मजकूर तुमच्या व्हाट्सएप ग्रुपवर शेअर करा. इतर विक्रेते हा संपूर्ण मजकूर त्यांच्या ॲपमध्ये पेस्ट करून तुमचे सर्व दर एका क्षणात सेट करू शकतात.'
                            : 'Copy this text and share it on WhatsApp. Other vendors can copy-paste the message directly into their app to import rates.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyRateList}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-4 rounded-lg transition shrink-0 cursor-pointer ${
                          copiedNotification
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {copiedNotification ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            {t('copied')}
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            {t('copy_text')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Paste Text Area */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {language === 'mr' ? 'येथे दर पत्रक पेस्ट करा' : 'Paste Rate List Text'}
                        </label>
                        <span className="text-[10px] font-medium text-slate-400">
                          {language === 'mr' ? 'उदा. टोमॅटो: ५०, पालक - २०' : 'e.g. Tomato: 40, Spinach: 20'}
                        </span>
                      </div>
                      <textarea
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder={t('paste_here')}
                        className="w-full h-40 text-xs border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:border-emerald-500 bg-white leading-relaxed resize-none"
                      />
                    </div>

                    {/* Parser Result Live Preview */}
                    {importText.trim() && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">
                            {t('parse_preview')}
                          </h4>
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                            {parsedItems.length} {language === 'mr' ? 'आयटम सापडले' : 'items found'}
                          </span>
                        </div>

                        {parsedItems.length === 0 ? (
                          <div className="p-4 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 flex items-start gap-2 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                            <p className="font-medium leading-relaxed">{t('no_items_parsed')}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {/* Checkbox Options */}
                            <div className="flex flex-wrap gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                              <label className="flex items-center gap-2 font-medium text-slate-600 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={includeExisting}
                                  onChange={(e) => setIncludeExisting(e.checked || e.target.checked)}
                                  className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                {t('update_veg_price')}
                              </label>
                              <label className="flex items-center gap-2 font-medium text-slate-600 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={includeNew}
                                  onChange={(e) => setIncludeNew(e.checked || e.target.checked)}
                                  className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                {t('new_veg_to_add')}
                              </label>
                            </div>

                            {/* Scrollable list */}
                            <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50 bg-white">
                              {parsedItems.map((item, idx) => {
                                const isNew = !item.matchedVeg;
                                const isIgnored = (isNew && !includeNew) || (!isNew && !includeExisting);

                                return (
                                  <div
                                    key={`parsed-item-${idx}`}
                                    className={`p-3 flex items-center justify-between text-xs transition ${
                                      isIgnored ? 'opacity-40 bg-slate-50/50' : 'hover:bg-slate-50/40'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-xl shrink-0 select-none">
                                        {item.parsedEmoji || item.matchedVeg?.imageEmoji || '🥦'}
                                      </span>
                                      <div>
                                        <p className="font-semibold text-slate-700">
                                          {item.matchedVeg ? t(item.matchedVeg.name) : item.parsedName}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[150px] sm:max-w-xs">
                                          {language === 'mr' ? 'मूळ ओळ:' : 'Line:'} "{item.originalLine}"
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {item.matchedVeg ? (
                                        <div className="text-right">
                                          <p className="text-slate-400 line-through text-[10px] font-medium font-mono">
                                            ₹{item.matchedVeg.defaultPrice.toFixed(0)}
                                          </p>
                                          <p className="text-emerald-600 font-bold font-mono">
                                            ₹{item.parsedPrice.toFixed(0)}/kg
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="text-indigo-600 font-bold font-mono text-right">
                                          ₹{item.parsedPrice.toFixed(0)}/kg
                                        </p>
                                      )}

                                      <span
                                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 select-none ${
                                          item.matchedVeg
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                        }`}
                                      >
                                        {item.matchedVeg
                                          ? (language === 'mr' ? 'बदला' : 'Update')
                                          : (language === 'mr' ? 'नवीन' : 'New')}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-50 flex items-center justify-end gap-2 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsRateListOpen(false);
                    setImportText('');
                  }}
                  className="border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs py-2 px-4 rounded-lg transition cursor-pointer"
                >
                  {t('close')}
                </button>
                {activeRateTab === 'import' && parsedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyRates}
                    disabled={(!includeNew && !includeExisting) || parsedItems.length === 0}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs py-2 px-4 rounded-lg transition cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('apply_rates')}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
