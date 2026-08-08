import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'mr';

export const translations = {
  en: {
    // General
    app_title: "Fresh Farms Vegetable Mart",
    billing_counter: "Billing Counter (POS)",
    daily_sales: "Daily Sales Journal",
    credit_book: "Credit Book (Udhari)",
    veg_catalog: "Vegetable Catalog",
    backup_reports: "Backup & Reports",
    shop_settings: "Shop Settings",
    backup_data: "Backup Data",
    restore_data: "Restore Data",
    
    // Stats
    todays_sales: "Today's Total Sales",
    total_credit: "Total Credit Outstanding",
    new_credit_today: "New Credit Today",
    top_seller: "Today's Top Seller",
    cash: "Cash",
    upi: "UPI",
    credit: "Credit",
    owed_by: "Owed by",
    customers: "customers",
    pending_credit_desc: "Pending from today's credit sales",
    no_sales_today: "No sales logged today",
    waiting_sale: "Waiting for first sale...",
    total_sold: "Total Sold",
    
    // Billing Calculator
    add_veg_bill: "Add Vegetables to Bill",
    select_veg_placeholder: "Select a vegetable...",
    price_kg: "Price per kg (₹)",
    quantity_kg: "Quantity (kg)",
    add_to_cart: "Add to Cart",
    cart_items: "Cart Items",
    no_items_cart: "Your bill cart is empty. Add vegetables from the form above.",
    subtotal: "Subtotal",
    walk_in_customer: "Walk-in Customer",
    customer_details: "Customer Details",
    select_customer: "Select Customer Profile",
    customer_name: "Customer Name",
    customer_phone: "Customer Phone",
    payment_info: "Payment Information",
    payment_method: "Payment Method",
    amount_paid: "Amount Paid (₹)",
    notes: "Notes / Comments",
    notes_placeholder: "Any special instructions or details...",
    checkout_bill: "Checkout & Print Bill",
    remaining_balance: "Remaining Balance",
    
    // Sales Journal
    search_invoice: "Search invoice, customer, or phone...",
    sales_history: "Sales History Logs",
    no_sales_found: "No sales records found.",
    date: "Date",
    invoice_no: "Invoice No.",
    customer: "Customer",
    payment: "Payment",
    total: "Total",
    actions: "Actions",
    all_dates: "All Dates",
    
    // Credit Book
    search_debtors: "Search debtor name or phone...",
    credit_history: "Credit Debtors Ledger",
    no_debtors_found: "No pending credit accounts found.",
    debtor_name: "Debtor Name",
    outstanding: "Outstanding Amt",
    amount_paid_so_far: "Amount Paid",
    last_updated: "Last Updated",
    receive_payment: "Receive Payment",
    receive_payment_title: "Receive Outstanding Payment",
    amount_to_receive: "Amount to Receive (₹)",
    cancel: "Cancel",
    confirm_receive: "Confirm Payment",
    
    // Vegetable Catalog
    add_new_veg: "Add New Vegetable",
    add_new_customer: "Add New Customer",
    veg_name: "Vegetable Name",
    default_price: "Default Price / kg (₹)",
    category: "Category",
    emoji_icon: "Emoji Icon",
    leafy: "Leafy Greens",
    roots: "Roots & Tubers",
    fleshy: "Fleshy Vegetables",
    other: "Other / Herbs",
    reset_default: "Reset to System Defaults",
    delete_veg_confirm: "Are you sure you want to delete this vegetable from your list?",
    
    // Invoice
    receipt: "RECEIPT",
    receipt_no: "Receipt No:",
    phone: "Phone:",
    address: "Address:",
    gstin: "GSTIN:",
    qty_kg_header: "Qty (kg)",
    rate_header: "Rate/kg",
    amount_header: "Amount",
    net_total: "Net Total",
    paid_amt: "Paid Amount",
    bal_due: "Balance Due",
    thank_you: "Thank you for shopping with us!",
    share_receipt_whatsapp: "Share Receipt to WhatsApp",
    send_whatsapp: "Send",
    copy_receipt_text: "Copy Receipt Text",
    close_bill: "Close Bill",
    whatsapp_linked: "Customer Linked",
    copied_msg: "Copied!",
    
    // Rate List
    rate_list: "Rate List",
    rate_list_desc: "Export your current vegetable rates to share with others, or paste a rate list text to automatically set rates.",
    export_rates: "Export / Share Rate List",
    import_rates: "Import / Paste Rate List",
    copy_text: "Copy Rate List",
    copied: "Copied!",
    paste_here: "Paste Rate List text here (e.g., Tomato: 40, Spinach - 20)...",
    parse_preview: "Rate List Import Preview",
    no_items_parsed: "No vegetables or rates found. Please ensure format is like 'Tomato: 40' or 'Tomato - 40'.",
    apply_rates: "Apply All Parsed Rates",
    apply_success: "All rates updated successfully!",
    new_veg_to_add: "New Vegetables (To be Added)",
    update_veg_price: "Existing Vegetables (To be Updated)",
    close: "Close",
    
    // Settings panel
    shop_settings_title: "Configure Shop Details",
    shop_name_label: "Shop / Store Name",
    shop_address_label: "Shop Address",
    shop_phone_label: "Shop Phone / Contact",
    gstin_label: "GSTIN (Optional)",
    save_changes: "Save Settings",
    danger_zone: "Danger Zone",
    factory_reset: "Complete System Factory Reset",
    reset_app_desc: "This will permanently delete all sales ledger, customer profiles, custom vegetables, and restore settings.",
    
    // Messages/Alerts
    reset_success: "Reset Successful",
    reset_catalog_desc: "Are you sure you want to reset your vegetables list and pricing to default system settings? Any custom vegetables will be removed.",
    reset_catalog_success: "Vegetables list has been reset to defaults.",
    reset_app_warn_1: "Are you sure you want to completely reset the application? This will erase all sales history, pending bills, customer profiles, and reset the shop configurations/vegetable catalog. This action cannot be undone.",
    reset_app_warn_2: "THIS IS YOUR LAST WARNING: This will permanently wipe all sales ledger and customer data. Are you sure you want to proceed?",
    reset_app_success_title: "App Reset Successfully",
    reset_app_success_desc: "All application data has been cleared and reset to defaults.",
    restore_backup_title: "Restore Backup",
    restore_backup_desc: "Are you sure you want to restore this backup file? This will overwrite your current sales history, customer profiles, and vegetable catalog.",
    restore_success: "Data restored successfully!",
    invalid_backup: "Invalid backup file structure.",
    parse_error: "Failed to parse backup JSON file. Make sure it is a valid backup file.",
    add_profile_title: "Create New Customer Profile",
    add_profile_success: "Profile created successfully!",
    profile_exists_error: "A profile with this phone number or name already exists.",
    delete_sale_confirm: "Are you sure you want to delete this sale? This will undo the recorded payment history.",
    
    // Vegetables default
    Tomato: "Tomato",
    Potato: "Potato",
    Onion: "Onion",
    Spinach: "Spinach",
    Cauliflower: "Cauliflower",
    Carrot: "Carrot",
    Garlic: "Garlic",
    Ginger: "Ginger",
    "Green Chilli": "Green Chilli",
    Coriander: "Coriander",
    Lemon: "Lemon",
    Cabbage: "Cabbage",
    Fenugreek: "Fenugreek (Methi)",
    Eggplant: "Eggplant (Brinjal)",
    Okra: "Okra (Lady Finger)",
    "Bottle Gourd": "Bottle Gourd (Lauki)",
    "Ridge Gourd": "Ridge Gourd (Dodka)",
    "Bitter Gourd": "Bitter Gourd (Karela)",
    Cucumber: "Cucumber (Kakdi)",
    Capsicum: "Capsicum (Shimla Mirchi)",
    "Green Peas": "Green Peas (Matar)",
    Pumpkin: "Pumpkin (Bhopla)",
    Radish: "Radish (Mula)",
    Beetroot: "Beetroot",
    Drumstick: "Drumstick (Shevga)",
    "Sweet Potato": "Sweet Potato (Ratale)",
    Mint: "Mint (Pudina)",
    "Curry Leaves": "Curry Leaves (Kadipatta)",
    "Spring Onion": "Spring Onion (Kandyachi Pat)",
    "Cluster Beans": "Cluster Beans (Gavar)",
    "Sponge Gourd": "Sponge Gourd (Ghosale)",
    "Ivy Gourd": "Ivy Gourd (Tendli)",
    "French Beans": "French Beans (Ghevda)",
    "Dill Leaves": "Dill Leaves (Shepu)",
    "Colocasia Leaves": "Colocasia Leaves (Alu)",
    Amaranth: "Amaranth (Maath)",
  },
  mr: {
    // General
    app_title: "ताजा भाजीपाला केंद्र",
    billing_counter: "बिलिंग काउंटर (POS)",
    daily_sales: "दैनिक विक्री नोंद",
    credit_book: "उधारी नोंदवही",
    veg_catalog: "भाजीपाला यादी",
    backup_reports: "बॅकअप आणि रिपोर्ट",
    shop_settings: "दुकान सेटिंग्ज",
    backup_data: "डेटा बॅकअप",
    restore_data: "डेटा रिस्टोर",
    
    // Stats
    todays_sales: "आजची एकूण विक्री",
    total_credit: "एकूण येणे बाकी (उधारी)",
    new_credit_today: "आजची नवीन उधारी",
    top_seller: "आजची सर्वाधिक विक्री",
    cash: "रोख (Cash)",
    upi: "यूपीआय (UPI)",
    credit: "उधारी (Credit)",
    owed_by: "द्वारे देय",
    customers: "ग्राहक",
    pending_credit_desc: "आजच्या उधारी विक्रीतून प्रलंबित",
    no_sales_today: "आज कोणतीही विक्री झालेली नाही",
    waiting_sale: "पहिल्या विक्रीची प्रतीक्षा...",
    total_sold: "एकूण विक्री",
    
    // Billing Calculator
    add_veg_bill: "बिलामध्ये भाजीपाला जोडा",
    select_veg_placeholder: "भाजी निवडा...",
    price_kg: "दर प्रति किलो (₹)",
    quantity_kg: "वजन (किलो)",
    add_to_cart: "बिलात जोडा",
    cart_items: "बिलातील यादी (कार्ट)",
    no_items_cart: "तुमचे बिलाचे कार्ट रिकामे आहे. वरील फॉर्ममधून भाजीपाला जोडा.",
    subtotal: "एकूण रक्कम",
    walk_in_customer: "चालू ग्राहक (Walk-in)",
    customer_details: "ग्राहकाचा तपशील",
    select_customer: "ग्राहक प्रोफाइल निवडा",
    customer_name: "ग्राहकाचे नाव",
    customer_phone: "ग्राहकाचा फोन नंबर",
    payment_info: "पैसे भरल्याचा तपशील",
    payment_method: "पेमेंट पद्धत",
    amount_paid: "भरलेली रक्कम (₹)",
    notes: "टीप / इतर माहिती",
    notes_placeholder: "काही विशेष सूचना किंवा तपशील...",
    checkout_bill: "बिल पूर्ण करा आणि प्रिंट करा",
    remaining_balance: "उर्वरित शिल्लक",
    
    // Sales Journal
    search_invoice: "बिल क्रमांक, ग्राहक किंवा फोन शोधा...",
    sales_history: "दैनिक विक्री नोंदी",
    no_sales_found: "कोणत्याही विक्री नोंदी आढळल्या नाहीत.",
    date: "तारीख",
    invoice_no: "बिल क्र.",
    customer: "ग्राहक",
    payment: "पेमेंट पद्धत",
    total: "एकूण रक्कम",
    actions: "कृती",
    all_dates: "सर्व तारखा",
    
    // Credit Book
    search_debtors: "उधारी ग्राहक किंवा फोन शोधा...",
    credit_history: "उधारी खाते नोंदवही",
    no_debtors_found: "उधारी असलेले ग्राहक आढळले नाहीत.",
    debtor_name: "ग्राहकाचे नाव",
    outstanding: "शिल्लक उधारी रक्कम",
    amount_paid_so_far: "भरलेली रक्कम",
    last_updated: "शेवटचे अपडेट",
    receive_payment: "जमा करा",
    receive_payment_title: "थकबाकी पेमेंट जमा करा",
    amount_to_receive: "जमा करायची रक्कम (₹)",
    cancel: "रद्द करा",
    confirm_receive: "पेमेंट जमा करण्याची खात्री करा",
    
    // Vegetable Catalog
    add_new_veg: "नवीन भाजी जोडा",
    add_new_customer: "नवीन ग्राहक जोडा",
    veg_name: "भाजीचे नाव",
    default_price: "नियमित दर / किलो (₹)",
    category: "प्रकार",
    emoji_icon: "इमोजी आयकॉन",
    leafy: "पालेभाज्या",
    roots: "कंदमुळे",
    fleshy: "फळभाज्या",
    other: "इतर / मसाला कोथिंबीर",
    reset_default: "नियमित सेटिंग्जवर सेट करा",
    delete_veg_confirm: "तुम्हाला खरोखर ही भाजी यादीमधून काढून टाकायची आहे का?",
    
    // Invoice
    receipt: "पावती (RECEIPT)",
    receipt_no: "पावती क्रमांक:",
    phone: "फोन:",
    address: "पत्ता:",
    gstin: "जीएसटीआयएन (GSTIN):",
    qty_kg_header: "वजन (किलो)",
    rate_header: "दर/किलो",
    amount_header: "एकूण",
    net_total: "एकूण बिल",
    paid_amt: "भरलेली रक्कम",
    bal_due: "उर्वरित शिल्लक",
    thank_you: "आमच्याकडून खरेदी केल्याबद्दल धन्यवाद!",
    share_receipt_whatsapp: "व्हाट्सएपवर पावती शेअर करा",
    send_whatsapp: "पाठवा",
    copy_receipt_text: "पावतीचा मजकूर कॉपी करा",
    close_bill: "बिल बंद करा",
    whatsapp_linked: "ग्राहक जोडला आहे",
    copied_msg: "कॉपी केले!",
    
    // Rate List
    rate_list: "दर पत्रक",
    rate_list_desc: "इतर विक्रेत्यांना शेअर करण्यासाठी तुमचे चालू दर कॉपी करा किंवा इतरांनी पाठवलेले दर पत्रक पेस्ट करून एका क्लिकवर दर अपडेट करा.",
    export_rates: "दर पत्रक कॉपी/शेअर करा",
    import_rates: "दर पत्रक आयात/पेस्ट करा",
    copy_text: "दर पत्रक कॉपी करा",
    copied: "कॉपी केले!",
    paste_here: "येथे दर पत्रकाचा मजकूर पेस्ट करा (उदा. टोमॅटो: ४०, पालक - २०)...",
    parse_preview: "दर पत्रक आयात पूर्वावलोकन (Preview)",
    no_items_parsed: "भाजीपाला किंवा दर आढळले नाहीत. कृपया मजकूर 'भाजीचे नाव: दर' किंवा 'भाजीचे नाव - दर' या स्वरूपात असल्याची खात्री करा.",
    apply_rates: "सर्व दर लागू करा",
    apply_success: "सर्व दर यशस्वीरित्या अपडेट झाले आहेत!",
    new_veg_to_add: "नवीन भाजीपाला (जोडला जाईल)",
    update_veg_price: "उपलब्ध भाजीपाला (दर बदलला जाईल)",
    close: "बंद करा",
    
    // Settings panel
    shop_settings_title: "दुकान तपशील सेट करा",
    shop_name_label: "दुकान / केंद्राचे नाव",
    shop_address_label: "दुकानचा पत्ता",
    shop_phone_label: "दुकानचा फोन / संपर्क",
    gstin_label: "जीएसटीआयएन (GSTIN - ऐच्छिक)",
    save_changes: "बदल जतन करा",
    danger_zone: "धोकादायक क्षेत्र",
    factory_reset: "पूर्ण ॲप डेटा रीसेट करा (फॅक्टरी रीसेट)",
    reset_app_desc: "यामुळे तुमच्या विक्री नोंदी, ग्राहकांचे प्रोफाइल, जोडलेले भाजीपाले कायमचे डिलीट होतील.",
    
    // Messages/Alerts
    reset_success: "रीसेट यशस्वी",
    reset_catalog_desc: "तुम्हाला खरोखर भाजीपाला यादी आणि दर मूळ सेटिंग्जवर रीसेट करायचे आहेत का? तुमचे बदललेले भाजीपाले काढले जातील.",
    reset_catalog_success: "भाजीपाला यादी मूळ सेटिंग्जवर रीसेट झाली आहे.",
    reset_app_warn_1: "तुम्हाला खरोखर ॲप्लिकेशन पूर्णपणे रीसेट करायचे आहे का? यामुळे सर्व विक्री नोंदी, उधारी, ग्राहक प्रोफाईल आणि दुकानाचे तपशील डिलीट होतील. ही कृती परत मिळवता येणार नाही.",
    reset_app_warn_2: "ही शेवटची चेतावणी आहे: यामुळे सर्व विक्री आणि ग्राहकांचा डेटा कायमचा डिलीट होईल. पुढे जायचे का?",
    reset_app_success_title: "ॲप यशस्वीरित्या रीसेट झाले",
    reset_app_success_desc: "सर्व डेटा डिलीट करून ॲप मूळ स्थितीवर आणले गेले आहे.",
    restore_backup_title: "बॅकअप रिस्टोर करा",
    restore_backup_desc: "तुम्हाला खरोखर हा बॅकअप रिस्टोर करायचा आहे का? यामुळे तुमची सध्याची विक्री, ग्राहक आणि भाजीपाल्याची यादी बदलली जाईल.",
    restore_success: "डेटा यशस्वीरित्या रिस्टोर झाला!",
    invalid_backup: "अवैध बॅकअप फाईल रचना.",
    parse_error: "बॅकअप JSON फाईल वाचण्यात अडचण आली. कृपया योग्य फाईल निवडा.",
    add_profile_title: "नवीन ग्राहक प्रोफाईल बनवा",
    add_profile_success: "ग्राहकाची प्रोफाईल यशस्वीरित्या तयार केली!",
    profile_exists_error: "या फोन नंबर किंवा नावाचा ग्राहक आधीपासूनच उपलब्ध आहे.",
    delete_sale_confirm: "तुम्हाला खरोखर ही विक्री नोंद डिलीट करायची आहे का? यामुळे पेमेंट नोंदी देखील रद्द होतील.",
    
    // Vegetables default
    Tomato: "टोमॅटो",
    Potato: "बटाटा",
    Onion: "कांदा",
    Spinach: "पालक",
    Cauliflower: "फ्लॉवर",
    Carrot: "गाजर",
    Garlic: "लसूण",
    Ginger: "आले / अद्रक",
    "Green Chilli": "हिरवी मिरची",
    Coriander: "कोथिंबीर",
    Lemon: "लिंबू",
    Cabbage: "कोबी",
    Fenugreek: "मेथी (Methi)",
    Eggplant: "वांगी (Brinjal/Vangi)",
    Okra: "भेंडी (Okra/Bhendi)",
    "Bottle Gourd": "दुधी भोपळा (Dudhi)",
    "Ridge Gourd": "दोडका (Dodka)",
    "Bitter Gourd": "कारले (Karle)",
    Cucumber: "काकडी (Kakdi)",
    Capsicum: "ढोबळी मिरची (Capsicum)",
    "Green Peas": "हिरवा मटार (Matar)",
    Pumpkin: "लाल भोपळा (Bhopla)",
    Radish: "मुळा (Mula)",
    Beetroot: "बीट (Beetroot)",
    Drumstick: "शेवगा शेंग (Drumstick)",
    "Sweet Potato": "रताळे (Ratale)",
    Mint: "पुदिना (Mint)",
    "Curry Leaves": "कढीपत्ता (Kadipatta)",
    "Spring Onion": "कांद्याची पात (Spring Onion)",
    "Cluster Beans": "गवार (Gavar)",
    "Sponge Gourd": "घोसाळे (Ghosale)",
    "Ivy Gourd": "तोंडली (Tendli)",
    "French Beans": "घेवडा / फरसबी",
    "Dill Leaves": "शेपू (Shepu)",
    "Colocasia Leaves": "अळू पाने (Alu)",
    Amaranth: "लाल माठ (Amaranth)",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'mr' || saved === 'en') ? saved as Language : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string, fallback?: string): string => {
    // If exact key match exists in translation records, return it.
    const group = translations[language] as Record<string, string>;
    if (key in group) {
      return group[key];
    }
    
    // Otherwise fallback to English translation if available
    const enGroup = translations['en'] as Record<string, string>;
    if (key in enGroup && language !== 'en') {
      const mrGroup = translations['mr'] as Record<string, string>;
      if (key in mrGroup) {
         return mrGroup[key];
      }
    }
    
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
