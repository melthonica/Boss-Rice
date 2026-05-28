'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, Plus, Minus, Trash2, LogOut, Search, 
  Check, Wifi, WifiOff, X, Key, Settings, QrCode, 
  Coins, TrendingUp, Grid, RefreshCw, Smartphone, 
  User, Database, Calendar, Briefcase, PlusCircle,
  Edit, Save, Download, UserPlus, MapPin, AlertTriangle, FileSpreadsheet, Lock,
  ChevronLeft, ChevronRight, Sparkles, Package, Truck, Boxes, Palette, ToggleLeft, Clock
} from 'lucide-react';

// --- TYPES ---
interface Product {
  id: number;
  name: string;
  emoji: string;
  price: number;
  active: boolean;
  category?: string;
  cost?: number;
  variant?: string;
}

interface InventoryTransaction {
  id: string;
  itemName: string;
  qty: number;
  variant: string;
  cost: number;
  type: 'stock-in' | 'stock-out';
  status: 'pending-delivery' | 'completed';
  destinationBranch: string;
  deliveryDate: string;
  arrivalDate?: string;
  performedBy: string;
  reason?: string;
}

interface Order {
  id?: number;
  order_number: number;
  items: string[];
  total: number;
  payment_method: string;
  cash_received?: number;
  change_given?: number;
  cashier_role: string;
  created_at: string;
  cashier_name?: string;
  branch?: string;
}

interface PosUser {
  id?: number;
  username: string;
  password?: string;
  role: 'admin' | 'cashier';
  created_at?: string;
  branch?: string;
}

interface Shift {
  id?: number;
  cashier_name: string;
  branch: string;
  beginning_balance: number;
  total_sales: number;
  login_time: string;
  logout_time?: string;
  created_at?: string;
}

interface Expense {
  id?: number;
  product_name: string;
  cost: number;
  cashier_name: string;
  branch: string;
  created_at: string;
}

// --- SUBTLE HIGH-QUALITY AUDIO ENGINE ---
const playSound = (type: 'beep' | 'success' | 'click' | 'error' | 'bell') => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (type === 'beep') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'bell') {
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'click') {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.04);
    }
  } catch (e) {
    console.warn('Audio contexts not allowed yet by browser policies.');
  }
};

const isEmojiCharacter = (str: string): boolean => {
  if (!str) return false;
  return !/[a-zA-Z0-9]/.test(str);
};

const getCategoryEmoji = (category?: string, overrideEmoji?: string): string => {
  if (overrideEmoji && isEmojiCharacter(overrideEmoji)) {
    return overrideEmoji;
  }
  const cat = (category || '').toLowerCase();
  if (cat === 'all') return '🍽️';
  if (cat.includes('drink') || cat.includes('beverage') || cat.includes('beer') || cat.includes('soda') || cat.includes('softdrink')) return '🥤';
  if (cat.includes('add-on') || cat.includes('extra') || cat.includes('side')) return '🍟';
  if (cat.includes('meal') || cat.includes('rice') || cat.includes('dish') || cat.includes('food')) return '🍱';
  if (cat.includes('dessert') || cat.includes('sweet') || cat.includes('snack')) return '🍰';
  if (cat.includes('soup')) return '🥣';
  return '🏷️';
};

const mapLoadedProducts = (prods: Product[]): Product[] => {
  let savedCosts: { [key: string]: number } = {};
  let savedVariants: { [key: string]: string } = {};
  
  if (typeof window !== 'undefined') {
    try {
      const cStr = localStorage.getItem('br_product_costs_off');
      const vStr = localStorage.getItem('br_product_variants_off');
      if (cStr) savedCosts = JSON.parse(cStr);
      if (vStr) savedVariants = JSON.parse(vStr);
    } catch (e) {
      console.error(e);
    }
  }

  return prods.map(p => {
    let cat = p.category;
    if (!cat) {
      if (p.emoji && !isEmojiCharacter(p.emoji)) {
        cat = p.emoji;
      } else {
        // fallback auto tagger
        let autoCat = 'Meals';
        const nameLower = p.name.toLowerCase();
        if (nameLower.includes('add-on') || nameLower.includes('extra') || nameLower.includes('add on') || nameLower.includes('patty') || nameLower.includes('ginabot') && nameLower.includes('add')) {
          autoCat = 'Add-ons';
        } else if (nameLower.includes('drink') || nameLower.includes('col') || nameLower.includes('sakto') || nameLower.includes('water') || nameLower.includes('sprite') || nameLower.includes('coke') || nameLower.includes('juice')) {
          autoCat = 'Drinks';
        }
        cat = autoCat;
      }
    }
    
    // Set appropriate visual emoji
    let renderEmoji = p.emoji;
    if (!renderEmoji || !isEmojiCharacter(renderEmoji)) {
      renderEmoji = getCategoryEmoji(cat);
    }
    
    const cost = savedCosts[p.name] !== undefined ? savedCosts[p.name] : (p.cost || 0);
    const variant = savedVariants[p.name] !== undefined ? savedVariants[p.name] : (p.variant || 'Regular');

    return {
      ...p,
      category: cat,
      emoji: renderEmoji,
      cost,
      variant
    };
  });
};

const formatDatetimeLocal = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

export default function BossRicePOS() {
  // --- AUTH STATES ---
  const [currentRole, setCurrentRole] = useState<'admin' | 'cashier' | null>(null);
  const [currentUser, setCurrentUser] = useState<PosUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'cashier'>('admin');
  const [selectedUsername, setSelectedUsername] = useState<string>(''); // selected name from loaded users
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  
  // --- USER/AUTHENTICATION DIRECTORY ---
  const [users, setUsers] = useState<PosUser[]>([]);
  const [tempUser, setTempUser] = useState<PosUser | null>(null); // assigned during login but before shift setup
  const [myActiveShift, setMyActiveShift] = useState<Shift | null>(null);
  const [isShiftOverlayOpen, setIsShiftOverlayOpen] = useState(false);
  const [shiftBegBalance, setShiftBegBalance] = useState<string>('1000');
  const [shiftBranch, setShiftBranch] = useState<string>('Main Branch');
  const [customBranchText, setCustomBranchText] = useState<string>('');
  const [ordersTableName, setOrdersTableName] = useState<'orders' | 'pos_orders'>('pos_orders');

  // --- STAFFING MANAGEMENT ---
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'cashier'>('cashier');
  const [newStaffBranch, setNewStaffBranch] = useState('Main Branch');
  const [passwordChangeUser, setPasswordChangeUser] = useState('');
  const [passwordChangeNew, setPasswordChangeNew] = useState('');
  const [passwordChangeBranch, setPasswordChangeBranch] = useState('Main Branch');
  const [branches, setBranches] = useState<string[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [confirmingDeleteBranch, setConfirmingDeleteBranch] = useState<string | null>(null);
  const [confirmingClearTransactions, setConfirmingClearTransactions] = useState(false);
  const [confirmingDeleteTxId, setConfirmingDeleteTxId] = useState<string | null>(null);

  // --- DEVELOPER PANEL & SUBSCRIPTION ENGINE ---
  const [subStart, setSubStart] = useState<string>('2026-05-01');
  const [subEnd, setSubEnd] = useState<string>('2026-12-31');
  const [maxBranches, setMaxBranches] = useState<number>(5);
  const [maxDevices, setMaxDevices] = useState<number>(10);
  const [myDeviceId, setMyDeviceId] = useState<string>('');
  const [registeredDevices, setRegisteredDevices] = useState<string[]>([]);
  const [isDeveloperMode, setIsDeveloperMode] = useState<boolean>(false);
  const [isDeviceLimitBlocked, setIsDeviceLimitBlocked] = useState<boolean>(false);
  const [devLockPasscode, setDevLockPasscode] = useState<string>('');
  const [devLockError, setDevLockError] = useState<string>('');

  // --- OFFLINE SESSION RECOVERY STATE & ACCIDENT LOGOUT UTILITY ---
  const [recoveryStart, setRecoveryStart] = useState<string>(() => {
    const d = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return formatDatetimeLocal(d);
  });
  const [recoveryEnd, setRecoveryEnd] = useState<string>(() => formatDatetimeLocal(new Date()));
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const [recoveredCount, setRecoveredCount] = useState<number | null>(null);

  // Custom states added for licensing parameters requested by user
  const [posName, setPosName] = useState<string>('Boss Rice');
  const [currentTheme, setCurrentTheme] = useState<string>('classic-red');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('24h');
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0);
  const [maxProducts, setMaxProducts] = useState<number>(25);
  const [enabledTabs, setEnabledTabs] = useState<{
    inventory: boolean;
    expenses: boolean;
    shifts: boolean;
    reports: boolean;
    products: boolean;
  }>({
    inventory: true,
    expenses: true,
    shifts: true,
    reports: true,
    products: true
  });

  // --- BATCH STOCK TAGGING LIST STATES ---
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [batchItems, setBatchItems] = useState<{itemName: string, qty: number, variant: string, cost: number}[]>([]);
  const [batchItemSelect, setBatchItemSelect] = useState<string>('');
  const [batchItemQty, setBatchItemQty] = useState<string>('');
  const [batchItemVariant, setBatchItemVariant] = useState<string>('Regular');
  const [batchItemCost, setBatchItemCost] = useState<string>('');

  // New Stock Out custom note
  const [stockOutNote, setStockOutNote] = useState<string>('');

  // --- EDIT DISPATCH/STOCK TRANSACTION STATES ---
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editingTxItemName, setEditingTxItemName] = useState('');
  const [editingTxQty, setEditingTxQty] = useState('');
  const [editingTxVariant, setEditingTxVariant] = useState('');
  const [editingTxCost, setEditingTxCost] = useState('');
  const [editingTxDestBranch, setEditingTxDestBranch] = useState('');
  const [editingTxStatus, setEditingTxStatus] = useState<'pending-delivery' | 'completed'>('pending-delivery');
  const [editingTxDeliveryDate, setEditingTxDeliveryDate] = useState('');

  // --- EXPENSES SYSTEM ---
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseCost, setNewExpenseCost] = useState('');

  // --- GLOBAL SHIFTS & STATIONS LEDGER ---
  const [shifts, setShifts] = useState<Shift[]>([]);

  // --- DAILY REPORT RANGE EXPORTS (FROM & TO) ---
  const [startDateFilter, setStartDateFilter] = useState<string>(
    new Date().toLocaleDateString('sv').substring(0, 10) // local YYYY-MM-DD
  );
  const [endDateFilter, setEndDateFilter] = useState<string>(
    new Date().toLocaleDateString('sv').substring(0, 10) // local YYYY-MM-DD
  );

  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('All');
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>('All');

  // --- VOID ORDER AUTHORIZATION ---
  const [isVoidAuthOpen, setIsVoidAuthOpen] = useState(false);
  const [orderToVoid, setOrderToVoid] = useState<Order | null>(null);
  const [adminVoidPin, setAdminVoidPin] = useState<string>('');
  const [voidAuthError, setVoidAuthError] = useState<string>('');

  // --- PRODUCT IN-LINE EDITING (NAME & PRICE) ---
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingProductName, setEditingProductName] = useState<string>('');
  const [editingProductPrice, setEditingProductPrice] = useState<string>('');

  // --- Core POS STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ [id: number]: number }>({});
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  
  // --- SUBSCRIPTION STATUS COMPUTATION ---
  const isSubscriptionValid = useMemo(() => {
    if (!subStart || !subEnd) return true;
    const nowStr = new Date().toISOString().substring(0, 10);
    return nowStr >= subStart && nowStr <= subEnd;
  }, [subStart, subEnd]);

  // --- DYNAMIC FILTER OPTIONS FOR BRANCHES & CASHIERS ---
  const dynamicBranches = useMemo(() => {
    const list = new Set<string>();
    branches.forEach(b => { if (b) list.add(b); });
    allOrders.forEach(o => { if (o.branch) list.add(o.branch); });
    shifts.forEach(s => { if (s.branch) list.add(s.branch); });
    expenses.forEach(e => { if (e.branch) list.add(e.branch); });
    // Guarantee our typical default ones
    list.add('Main Branch');
    return Array.from(list).sort();
  }, [branches, allOrders, shifts, expenses]);

  const dynamicCashiers = useMemo(() => {
    const list = new Set<string>();
    allOrders.forEach(o => { if (o.cashier_name) list.add(o.cashier_name); });
    shifts.forEach(s => { if (s.cashier_name) list.add(s.cashier_name); });
    expenses.forEach(e => { if (e.cashier_name) list.add(e.cashier_name); });
    users.forEach(u => { if (u.username) list.add(u.username); });
    return Array.from(list).sort();
  }, [allOrders, shifts, expenses, users]);

  const dynamicCategories = useMemo(() => {
    const list = new Set<string>();
    list.add('Meals');
    list.add('Add-ons');
    list.add('Drinks');
    products.forEach(p => {
      if (p.category) {
        list.add(p.category);
      }
    });
    return Array.from(list);
  }, [products]);
  
  // --- SYNC LED STATE ---
  const [syncStatus, setSyncStatus] = useState<'online' | 'syncing' | 'offline'>('syncing');
  const [isInitializing, setIsInitializing] = useState(true);

  // --- ACTIVE VIEWS / TAB ---
  const [activeTab, setActiveTab] = useState<'pos' | 'reports' | 'products' | 'myshift' | 'staff' | 'shifts' | 'expenses' | 'inventory' | 'developer'>('pos');
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');

  // --- NOTIFICATION / TOAST ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- AUDIO SYSTEM TOGGLE ---
  const [audioEnabled, setAudioEnabled] = useState(true);

  // --- CHECKOUT FLOWS ---
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [gcashModalOpen, setGcashModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<any | null>(null);

  // --- CASH REGISTER DATA ---
  const [cashReceivedText, setCashReceivedText] = useState<string>('');

  // --- PRODUCT MANAGEMENT ---
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Meals');
  const [newProdCost, setNewProdCost] = useState('');
  const [newProdVariant, setNewProdVariant] = useState('Regular');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [editingProductCategory, setEditingProductCategory] = useState('');
  const [editingProductCost, setEditingProductCost] = useState('');
  const [editingProductVariant, setEditingProductVariant] = useState('');

  // --- INVENTORY MANAGEMENT STATES ---
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [activeInventoryTab, setActiveInventoryTab] = useState<'received' | 'stock-in' | 'stock-out'>('received');
  
  // New Stock In Form States
  const [newStockItem, setNewStockItem] = useState('');
  const [newStockQty, setNewStockQty] = useState('');
  const [newStockVariant, setNewStockVariant] = useState('Regular');
  const [newStockCost, setNewStockCost] = useState('');
  const [newStockDestBranch, setNewStockDestBranch] = useState('Main Branch');
  const [newStockDeliveryDate, setNewStockDeliveryDate] = useState(
    new Date().toLocaleDateString('sv').substring(0, 10)
  );

  // New Stock Out Form States
  const [selectedStockOutItemKey, setSelectedStockOutItemKey] = useState('');
  const [stockOutQty, setStockOutQty] = useState('');
  const [stockOutReason, setStockOutReason] = useState('Damaged');
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [inventoryBranchFilter, setInventoryBranchFilter] = useState('All');

  // --- CONFIRMATION MODAL STATE ---
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    msg: string;
    onConfirm: () => void;
  }>({ show: false, title: '', msg: '', onConfirm: () => {} });

  const [currentTime, setCurrentTime] = useState<string>('00:00:00');

  // --- THEME STYLE ACCENTS AND ACCENT MAP ---
  const tc = useMemo(() => {
    switch (currentTheme) {
      case 'ocean-blue':
        return {
          id: 'ocean-blue',
          name: 'Ocean Blue',
          text: 'text-cyan-400',
          textBtn: 'text-cyan-500',
          textMuted: 'text-cyan-600',
          border: 'border-cyan-500/30',
          borderMuted: 'border-cyan-900/40',
          bg: 'bg-cyan-600',
          bgHover: 'hover:bg-cyan-700',
          bgActive: 'bg-cyan-600',
          bgMuted: 'bg-cyan-950/20',
          gradient: 'from-cyan-500 to-blue-600',
          badge: 'bg-cyan-950/40 text-cyan-400 border-cyan-900/40',
          ring: 'focus:border-cyan-500',
          shadow: 'shadow-cyan-600/10',
          accentBg: 'bg-cyan-600',
          accentText: 'text-cyan-500',
          spinner: 'border-t-cyan-500',
          primaryBtn: 'bg-cyan-600 hover:bg-cyan-700 text-white',
          secBtn: 'border border-cyan-500/30 text-cyan-555 hover:bg-cyan-950/25',
          indicator: 'bg-cyan-500',
          alertBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
          priceBg: 'bg-cyan-950/20 border-cyan-500/20 text-cyan-400',
          dot: 'bg-cyan-550 border-cyan-550 shadow-cyan-550/40',
          textHover: 'hover:text-cyan-400 hover:border-cyan-500/50'
        };
      case 'emerald-zen':
        return {
          id: 'emerald-zen',
          name: 'Emerald Zen',
          text: 'text-emerald-400',
          textBtn: 'text-emerald-500',
          textMuted: 'text-emerald-600',
          border: 'border-emerald-500/30',
          borderMuted: 'border-emerald-900/40',
          bg: 'bg-emerald-600',
          bgHover: 'hover:bg-emerald-700',
          bgActive: 'bg-emerald-600',
          bgMuted: 'bg-emerald-950/20',
          gradient: 'from-emerald-500 to-teal-600',
          badge: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40',
          ring: 'focus:border-emerald-500',
          shadow: 'shadow-emerald-600/10',
          accentBg: 'bg-emerald-600',
          accentText: 'text-emerald-505',
          spinner: 'border-t-emerald-500',
          primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          secBtn: 'border border-emerald-505 text-emerald-505 hover:bg-emerald-950/25',
          indicator: 'bg-emerald-500',
          alertBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          priceBg: 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400',
          dot: 'bg-emerald-555 border-emerald-555 shadow-emerald-555/40',
          textHover: 'hover:text-emerald-400 hover:border-emerald-500/50'
        };
      case 'lux-gold':
        return {
          id: 'lux-gold',
          name: 'Lux Gold',
          text: 'text-amber-400',
          textBtn: 'text-amber-500',
          textMuted: 'text-amber-600',
          border: 'border-amber-500/30',
          borderMuted: 'border-amber-900/40',
          bg: 'bg-amber-600',
          bgHover: 'hover:bg-amber-700',
          bgActive: 'bg-amber-600',
          bgMuted: 'bg-amber-955/20',
          gradient: 'from-amber-500 to-yellow-600',
          badge: 'bg-amber-950/40 text-amber-400 border-amber-900/40',
          ring: 'focus:border-amber-500',
          shadow: 'shadow-amber-600/10',
          accentBg: 'bg-amber-600',
          accentText: 'text-amber-505',
          spinner: 'border-t-amber-500',
          primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
          secBtn: 'border border-amber-505 text-amber-505 hover:bg-amber-950/25',
          indicator: 'bg-amber-500',
          alertBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          priceBg: 'bg-amber-950/20 border-amber-500/20 text-amber-400',
          dot: 'bg-offset-gold border-amber-500 shadow-gold',
          textHover: 'hover:text-amber-400 hover:border-amber-505/50'
        };
      case 'cyber-purple':
        return {
          id: 'cyber-purple',
          name: 'Cyber Purple',
          text: 'text-fuchsia-400',
          textBtn: 'text-fuchsia-500',
          textMuted: 'text-fuchsia-600',
          border: 'border-fuchsia-500/30',
          borderMuted: 'border-fuchsia-900/40',
          bg: 'bg-fuchsia-650',
          bgHover: 'hover:bg-fuchsia-750',
          bgActive: 'bg-fuchsia-650',
          bgMuted: 'bg-fuchsia-950/20',
          gradient: 'from-fuchsia-600 to-violet-650',
          badge: 'bg-fuchsia-950/40 text-fuchsia-400 border-fuchsia-900/40',
          ring: 'focus:border-fuchsia-500',
          shadow: 'shadow-fuchsia-600/10',
          accentBg: 'bg-fuchsia-650',
          accentText: 'text-fuchsia-500',
          spinner: 'border-t-fuchsia-500',
          primaryBtn: 'bg-fuchsia-650 hover:bg-fuchsia-755 text-white',
          secBtn: 'border border-fuchsia-505 text-fuchsia-505 hover:bg-fuchsia-950/25',
          indicator: 'bg-fuchsia-500',
          alertBg: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400',
          priceBg: 'bg-fuchsia-950/20 border-fuchsia-500/20 text-fuchsia-400',
          dot: 'bg-fuchsia-505 border-fuchsia-505 shadow-fuchsia-555/40',
          textHover: 'hover:text-fuchsia-400 hover:border-fuchsia-505/50'
        };
      case 'classic-red':
      default:
        return {
          id: 'classic-red',
          name: 'Classic Red',
          text: 'text-red-500',
          textBtn: 'text-red-500',
          textMuted: 'text-red-650',
          border: 'border-red-500/30',
          borderMuted: 'border-red-900/40',
          bg: 'bg-red-650',
          bgHover: 'hover:bg-red-700',
          bgActive: 'bg-red-650',
          bgMuted: 'bg-red-950/20',
          gradient: 'from-red-600 to-amber-500',
          badge: 'bg-red-950/40 text-red-400 border-red-900/40',
          ring: 'focus:border-red-500',
          shadow: 'shadow-red-600/15',
          accentBg: 'bg-red-650',
          accentText: 'text-red-500',
          spinner: 'border-t-red-600',
          primaryBtn: 'bg-red-650 hover:bg-red-750 text-white',
          secBtn: 'border border-red-955 text-red-500 hover:bg-red-950/20',
          indicator: 'bg-red-550',
          alertBg: 'bg-red-500/10 border-red-500/20 text-red-400',
          priceBg: 'bg-red-950/20 border-red-955 text-red-400',
          dot: 'bg-red-500 border-red-500 scale-110 shadow-md shadow-red-500/40',
          textHover: 'hover:text-red-400 hover:border-red-500/50'
        };
    }
  }, [currentTheme]);

  // --- AUTO RE-LOAD REFS ---
  const syncTimeoutRef = useRef<any>(null);

  // --- TOAST SERVICE ---
  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // --- PHILIPPINES LOCAL CLOCK WITH CUSTOM RANGE & HOUR SLIDING SETTINGS ---
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      if (timeOffsetHours !== 0) {
        now.setHours(now.getHours() + timeOffsetHours);
      }
      setCurrentTime(
        now.toLocaleTimeString('en-PH', {
          hour12: timeFormat === '12h',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timeFormat, timeOffsetHours]);

  // --- DEFAULT FALLBACK PRODUCTS ---
  const defaultProducts: Product[] = useMemo(() => [
    { id: 101, name: 'Java Rice + Lumpia', emoji: '🥟', price: 55, active: true },
    { id: 102, name: 'Java Rice + Siomai', emoji: '🥟', price: 75, active: true },
    { id: 103, name: 'Java Rice + Ginabot', emoji: '🍖', price: 85, active: true },
    { id: 104, name: 'Java Rice + Burger Steak', emoji: '🍔', price: 75, active: true },
    { id: 105, name: 'Pork Belly (Soy Sauce)', emoji: '🥩', price: 95, active: true },
    { id: 106, name: 'Pork Belly (Garlic Gravy)', emoji: '🥩', price: 95, active: true },
    { id: 107, name: 'Add-on Burger Patty', emoji: '🍔', price: 25, active: true },
    { id: 108, name: 'Add-on Ginabot', emoji: '🍖', price: 50, active: true },
    { id: 109, name: 'Add-on Pork Belly', emoji: '🥩', price: 50, active: true },
    { id: 110, name: 'Softdrinks Sakto', emoji: '🥤', price: 15, active: true },
  ], []);

  // --- BOOTSTRAP DATA ---
  const bootstrapPOS = async () => {
    setSyncStatus('syncing');
    setIsInitializing(true);
    try {
      // Auto-detect whether 'pos_orders' or 'orders' table is available
      try {
        const { error: testErr } = await supabase.from('pos_orders').select('id').limit(1);
        if (!testErr) {
          setOrdersTableName('pos_orders');
          console.log('Using pos_orders as the active orders table');
        } else {
          setOrdersTableName('orders');
          console.log('pos_orders failed testing, using fallback orders table');
        }
      } catch (e) {
        setOrdersTableName('orders');
      }

      // Fetch products
      const { data: remoteProds, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('id', { ascending: true });

      if (prodErr) throw prodErr;

      let validProducts = remoteProds || [];
      if (validProducts.length === 0) {
        // Bootstrap Supabase with sample products if table is completely empty
        const bulkInsert = defaultProducts.map(({ id, ...p }) => p);
        const { data: inserted, error: insertErr } = await supabase
          .from('products')
          .insert(bulkInsert)
          .select();
        
        if (!insertErr && inserted) {
          validProducts = inserted;
        } else {
          validProducts = defaultProducts;
        }
      }

      const parsedProducts = mapLoadedProducts(validProducts);
      setProducts(parsedProducts);
      localStorage.setItem('br_menu_cached', JSON.stringify(parsedProducts));
      setSyncStatus('online');
    } catch (e) {
      console.warn('Sync failed, running local fallback: ', e);
      setSyncStatus('offline');
      // Load cached
      const cache = localStorage.getItem('br_menu_cached');
      if (cache) {
        setProducts(mapLoadedProducts(JSON.parse(cache)));
      } else {
        setProducts(mapLoadedProducts(defaultProducts));
      }
      showNotification('Running in Offline Mode / Local Cache');
    } finally {
      setIsInitializing(false);
    }
  };

  // --- FETCH HISTORIC ORDERS ---
  const syncOrders = async (period: 'daily' | 'weekly' | 'monthly' | 'custom') => {
    setSyncStatus('syncing');
    try {
      let start = new Date();
      let endISO: string | null = null;
      if (period === 'daily') {
        start.setHours(0, 0, 0, 0);
      } else if (period === 'weekly') {
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0,0,0,0);
      } else if (period === 'monthly') {
        start = new Date(start.getFullYear(), start.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
      } else if (period === 'custom') {
        start = new Date(startDateFilter + 'T00:00:00');
        const endDayObj = new Date(endDateFilter + 'T23:59:59');
        endISO = endDayObj.toISOString();
      }

      let qBuilder = supabase
        .from(ordersTableName)
        .select('*')
        .gte('created_at', start.toISOString());

      if (endISO) {
        qBuilder = qBuilder.lte('created_at', endISO);
      }

      const { data, error } = await qBuilder.order('created_at', { ascending: false });

      if (error) throw error;

      const rawItems = data || [];
      const mappedItems = rawItems.map((row: any) => ({
        ...row,
        order_number: isNaN(Number(row.order_number)) ? row.order_number : Number(row.order_number),
        cashier_role: row.cashier_role || `${row.cashier_name || 'cashier'} | ${row.branch || 'Main Branch'}`,
        cash_received: row.cash_received !== undefined ? row.cash_received : row.total,
        change_given: row.change_given !== undefined ? row.change_given : 0
      }));

      // Merge mapped items with any unsynced or extremely fresh local items not yet in the DB response
      setAllOrders(prev => {
        const merged = [...mappedItems];
        prev.forEach(pOrder => {
          const alreadyExists = merged.some(m => 
            (m.id && m.id === pOrder.id) || 
            (m.order_number === pOrder.order_number && m.created_at.substring(0, 16) === pOrder.created_at.substring(0, 16))
          );
          if (!alreadyExists && !pOrder.id) {
            // It is a very fresh local/unsynced order, preserve it
            merged.push(pOrder);
          }
        });
        // Re-sort descendants by date
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return merged;
      });

      localStorage.setItem(`br_orders_${period}`, JSON.stringify(mappedItems));

      // Proactively back up synced/loaded orders into the browser's persistent device-level archive
      try {
        const archive: Order[] = JSON.parse(localStorage.getItem('br_offline_order_archive_v1') || '[]');
        let modified = false;
        mappedItems.forEach((mo: Order) => {
          const alreadyExists = archive.some(a => 
            String(a.order_number) === String(mo.order_number) && 
            a.created_at === mo.created_at &&
            (a.cashier_name || '') === (mo.cashier_name || '')
          );
          if (!alreadyExists) {
            archive.push(mo);
            modified = true;
          }
        });
        if (modified) {
          // Keep to last 1000 records to respect localStorage limits safely
          if (archive.length > 1000) {
            archive.splice(0, archive.length - 1000);
          }
          localStorage.setItem('br_offline_order_archive_v1', JSON.stringify(archive));
        }
      } catch (e) {
        console.warn('Sync order archiving to persistent local store failed silently:', e);
      }

      setSyncStatus('online');
    } catch (err) {
      console.error('syncOrders error:', err);
      setSyncStatus('offline');
      const cache = localStorage.getItem(`br_orders_${period}`);
      if (cache) setAllOrders(JSON.parse(cache));
    }
  };

  // --- SYNC STAFF USERS DIRECTORY ---
  const syncUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_users')
        .select('*')
        .order('role', { ascending: true })
        .order('username', { ascending: true });

      if (error) throw error;
      const validUsers = data || [];
      if (validUsers.length === 0) {
        const fallbacks: PosUser[] = [
          { username: 'admin', password: '1234', role: 'admin' },
          { username: 'cashier', password: '5678', role: 'cashier' }
        ];
        setUsers(fallbacks);
        localStorage.setItem('br_users_cached', JSON.stringify(fallbacks));
      } else {
        setUsers(validUsers);
        localStorage.setItem('br_users_cached', JSON.stringify(validUsers));
      }
    } catch (e) {
      console.warn('Sync users failed, running offline fallback');
      const cached = localStorage.getItem('br_users_cached');
      if (cached) {
        setUsers(JSON.parse(cached));
      } else {
        setUsers([
          { username: 'admin', password: '1234', role: 'admin' },
          { username: 'cashier', password: '5678', role: 'cashier' }
        ]);
      }
    }
  };

  // --- SYNC GLOBAL SHIFTS LOGS ---
  const syncShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_shifts')
        .select('*')
        .order('login_time', { ascending: false });

      if (error) throw error;
      setShifts(data || []);
      localStorage.setItem('br_shifts_cached', JSON.stringify(data || []));
    } catch (e) {
      console.warn('Sync shifts failed, loading cache');
      const cached = localStorage.getItem('br_shifts_cached');
      if (cached) setShifts(JSON.parse(cached));
    }
  };

  // --- SYNC EXPENSE HISTORY LEDGER ---
  const syncExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
      localStorage.setItem('br_expenses_cached', JSON.stringify(data || []));
    } catch (e) {
      console.warn('Sync expenses failed, loading cache');
      const cached = localStorage.getItem('br_expenses_cached');
      if (cached) setExpenses(JSON.parse(cached));
    }
  };

  // --- RETRIEVE CACHED SESSION ON LOAD ---
  useEffect(() => {
    const initTask = () => {
      bootstrapPOS();
      syncUsers();
      syncShifts();
      syncExpenses();
      
      // Load inventory transactions
      const cachedInv = localStorage.getItem('br_inventory_transactions');
      const hasClearedAll = localStorage.getItem('br_inventory_cleared_all_v3');
      if (!hasClearedAll) {
        setInventoryTransactions([]);
        localStorage.setItem('br_inventory_transactions', JSON.stringify([]));
        localStorage.setItem('br_inventory_cleared_all_v3', 'true');
      } else if (cachedInv) {
        try {
          setInventoryTransactions(JSON.parse(cachedInv));
        } catch (e) {
          console.error(e);
        }
      } else {
        setInventoryTransactions([]);
        localStorage.setItem('br_inventory_transactions', JSON.stringify([]));
      }

      // Load branches
      const cachedBr = localStorage.getItem('br_branches_v2');
      if (cachedBr) {
        try {
          setBranches(JSON.parse(cachedBr));
        } catch (e) {
          const defaultBr = ['Main Branch', 'Mandaue City Station', 'Cebu CBD Terminal', 'Gaisano Branch', 'Sanciangko Branch'];
          setBranches(defaultBr);
          localStorage.setItem('br_branches_v2', JSON.stringify(defaultBr));
        }
      } else {
        const defaultBr = ['Main Branch', 'Mandaue City Station', 'Cebu CBD Terminal', 'Gaisano Branch', 'Sanciangko Branch'];
        setBranches(defaultBr);
        localStorage.setItem('br_branches_v2', JSON.stringify(defaultBr));
      }

      // Load Developer Subscription config from localStorage
      let sStart = localStorage.getItem('br_sub_start');
      let sEnd = localStorage.getItem('br_sub_end');
      let mBranchesStr = localStorage.getItem('br_sub_max_branches');
      let mDevicesStr = localStorage.getItem('br_sub_max_devices');
      let dId = localStorage.getItem('br_device_id');
      let dListStr = localStorage.getItem('br_device_list');

      if (!sStart) {
        sStart = '2026-05-01';
        localStorage.setItem('br_sub_start', sStart);
      }
      if (!sEnd) {
        sEnd = '2026-12-31';
        localStorage.setItem('br_sub_end', sEnd);
      }
      if (!mBranchesStr) {
        mBranchesStr = '5';
        localStorage.setItem('br_sub_max_branches', mBranchesStr);
      }
      if (!mDevicesStr) {
        mDevicesStr = '10';
        localStorage.setItem('br_sub_max_devices', mDevicesStr);
      }
      if (!dId) {
        dId = 'dev-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem('br_device_id', dId);
      }

      setSubStart(sStart);
      setSubEnd(sEnd);
      setMaxBranches(parseInt(mBranchesStr) || 5);
      setMaxDevices(parseInt(mDevicesStr) || 10);
      setMyDeviceId(dId);

      let dList: string[] = [];
      if (dListStr) {
        try {
          dList = JSON.parse(dListStr);
        } catch (e) {
          dList = [dId];
        }
      } else {
        dList = [dId];
      }

      const limitMaxDevices = parseInt(mDevicesStr || '10') || 10;
      if (!dList.includes(dId)) {
        if (dList.length < limitMaxDevices) {
          dList.push(dId);
          setIsDeviceLimitBlocked(false);
          localStorage.setItem('br_device_list', JSON.stringify(dList));
        } else {
          setIsDeviceLimitBlocked(true);
        }
      } else {
        setIsDeviceLimitBlocked(false);
      }
      setRegisteredDevices(dList);

      // Load custom properties requested by user
      const savedPosName = localStorage.getItem('br_pos_name');
      if (savedPosName) {
        setPosName(savedPosName);
      }
      const savedTheme = localStorage.getItem('br_theme');
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
      const savedTimeFormat = localStorage.getItem('br_time_format');
      if (savedTimeFormat) {
        setTimeFormat(savedTimeFormat as '12h' | '24h');
      }
      const savedTimeOffset = localStorage.getItem('br_time_offset');
      if (savedTimeOffset !== null) {
        setTimeOffsetHours(parseInt(savedTimeOffset) || 0);
      }
      const savedMaxProducts = localStorage.getItem('br_sub_max_products');
      if (savedMaxProducts !== null) {
        setMaxProducts(parseInt(savedMaxProducts) || 25);
      }
      const savedEnabledTabs = localStorage.getItem('br_enabled_tabs');
      if (savedEnabledTabs) {
        try {
          setEnabledTabs(JSON.parse(savedEnabledTabs));
        } catch (e) {
          console.error("Failed loading enabled tabs, using default", e);
        }
      }

      const session = localStorage.getItem('br_session_v1');
      if (session) {
        const parsed = JSON.parse(session);
        setCurrentRole(parsed.role);
        setCurrentUser(parsed.user || null);
        if (parsed.isDeveloper) {
          setIsDeveloperMode(true);
        }
        if (parsed.shift) {
          setMyActiveShift(parsed.shift);
        }
      }
    };
    setTimeout(initTask, 0);
  }, [defaultProducts]);

  // Sync historical orders/shifts on report views
  useEffect(() => {
    if (currentRole) {
      const syncTask = () => {
        syncOrders(reportPeriod);
        syncShifts();
        syncExpenses();
      };
      setTimeout(syncTask, 0);
    }
  }, [currentRole, reportPeriod]);

  // --- SEARCH & CATEGORY CLASSIFICATION ---
  const productsWithCategoriesAndFilters = useMemo(() => {
    return products.map(p => {
      if (p.category) return p;
      // Simple automated taggers to avoid database schemas edits
      let cat = 'Meals';
      const nameLower = p.name.toLowerCase();
      if (nameLower.includes('add-on') || nameLower.includes('extra') || nameLower.includes('add on') || nameLower.includes('patty') || nameLower.includes('ginabot') && nameLower.includes('add')) {
        cat = 'Add-ons';
      } else if (nameLower.includes('drink') || nameLower.includes('col') || nameLower.includes('sakto') || nameLower.includes('water') || nameLower.includes('sprite') || nameLower.includes('coke') || nameLower.includes('juice')) {
        cat = 'Drinks';
      }
      return { ...p, category: cat };
    }).filter(p => {
      const queryMatch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const categoryMatch = selectedCategory === 'All' || p.category === selectedCategory;
      return queryMatch && categoryMatch;
    });
  }, [products, searchQuery, selectedCategory]);

  // --- AUDIO CLICK UTILITY ---
  const handleTactileClick = () => {
    if (audioEnabled) playSound('click');
  };

  // --- AUTH HANDLERS ---
  const handlePinNumpad = (num: string) => {
    handleTactileClick();
    if (enteredPin.length < 6) {
      setEnteredPin(prev => prev + num);
    }
  };

  const handlePinDelete = () => {
    handleTactileClick();
    setEnteredPin(prev => prev.slice(0, -1));
  };

  const attemptLogin = () => {
    // Hidden Developer Pin Code Bypass
    if (selectedRole === 'admin' && enteredPin === '052791') {
      if (audioEnabled) playSound('success');
      setLoginError('');
      setEnteredPin('');
      setIsDeveloperMode(true);
      setCurrentUser({ id: 9999, username: 'SysDev', role: 'admin' });
      setCurrentRole('admin');
      setActiveTab('developer');
      localStorage.setItem('br_session_v1', JSON.stringify({
        role: 'admin',
        user: { id: 9999, username: 'SysDev', role: 'admin' },
        time: Date.now(),
        isDeveloper: true
      }));
      showNotification('🔐 Access Granted: Developer Administrative Mode Activated!');
      return;
    }

    // Authenticate user against dynamic loaded directory with smart fallback
    const matchedUser = users.find(u => {
      if (u.role !== selectedRole) return false;
      if (selectedUsername) {
        return u.username.toLowerCase() === selectedUsername.toLowerCase() && u.password === enteredPin;
      }
      // If default login is chosen, allow login if PIN matches this role's user
      return u.password === enteredPin;
    });

    if (matchedUser) {
      if (audioEnabled) playSound('success');
      setLoginError('');
      setEnteredPin('');

      if (matchedUser.role === 'cashier') {
        // Authenticate the cashier and enter the active POS workspace immediately
        setCurrentUser(matchedUser);
        setCurrentRole('cashier');
        setActiveTab('pos');
        setTempUser(matchedUser);

        // Reset recovery fields on fresh cashier sign in
        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        setRecoveryStart(formatDatetimeLocal(twelveHoursAgo));
        setRecoveryEnd(formatDatetimeLocal(now));
        setRecoveredCount(null);

        // Check if there is an active shift cached in localStorage
        const cachedActiveShift = localStorage.getItem('br_active_shift');
        if (cachedActiveShift) {
          try {
            const parsedShift = JSON.parse(cachedActiveShift);
            setMyActiveShift(parsedShift);
            setIsShiftOverlayOpen(false);
          } catch (e) {
            setMyActiveShift(null);
            setShiftBegBalance('1000');
            setShiftBranch(matchedUser.branch || 'Main Branch');
            setCustomBranchText('');
            setIsShiftOverlayOpen(true);
          }
        } else {
          setMyActiveShift(null);
          setShiftBegBalance('1000');
          setShiftBranch(matchedUser.branch || 'Main Branch');
          setCustomBranchText('');
          setIsShiftOverlayOpen(true);
        }

        localStorage.setItem('br_session_v1', JSON.stringify({ 
          role: 'cashier', 
          user: matchedUser, 
          shift: cachedActiveShift ? JSON.parse(cachedActiveShift) : null,
          time: Date.now() 
        }));
      } else {
        setCurrentUser(matchedUser);
        setCurrentRole('admin');
        localStorage.setItem('br_session_v1', JSON.stringify({ 
          role: 'admin', 
          user: matchedUser, 
          time: Date.now() 
        }));
        setActiveTab('pos');
      }
    } else {
      if (audioEnabled) playSound('error');
      setLoginError('Incorrect PIN / credentials. Please check your account PIN.');
      setEnteredPin('');
    }
  };

  const attemptLogout = async () => {
    handleTactileClick();
    
    if (myActiveShift) {
      const logoutTime = new Date().toISOString();
      const closedShift = {
        ...myActiveShift,
        logout_time: logoutTime
      };
      
      // Update local storage cached historical shifts
      const cached = localStorage.getItem('br_shifts_cached');
      let localShifts: Shift[] = cached ? JSON.parse(cached) : [];
      
      const existingIdx = localShifts.findIndex(
        s => s.id === closedShift.id || 
        (s.login_time === closedShift.login_time && s.cashier_name === closedShift.cashier_name)
      );
      if (existingIdx !== -1) {
        localShifts[existingIdx] = closedShift;
      } else {
        localShifts = [closedShift, ...localShifts];
      }
      setShifts(localShifts);
      localStorage.setItem('br_shifts_cached', JSON.stringify(localShifts));

      // Attempt Supabase updates to record the log-out time
      try {
        if (closedShift.id) {
          await supabase
            .from('pos_shifts')
            .update({ logout_time: logoutTime })
            .eq('id', closedShift.id);
        } else {
          await supabase
            .from('pos_shifts')
            .update({ logout_time: logoutTime })
            .match({ cashier_name: closedShift.cashier_name, login_time: closedShift.login_time });
        }
      } catch (err) {
        console.warn('Silent fallback: Supabase logout_time update deferred: ', err);
      }
    }

    localStorage.removeItem('br_session_v1');
    localStorage.removeItem('br_active_shift');
    setCurrentRole(null);
    setCurrentUser(null);
    setMyActiveShift(null);
    setTempUser(null);
    setIsDeveloperMode(false);
    setCart({});
  };

  // --- SHIFT CREATION ACTIVATOR ---
  const startShift = async () => {
    const activeStaff = tempUser || currentUser;
    if (!activeStaff) return;
    const begBal = parseFloat(shiftBegBalance || '0');
    if (isNaN(begBal) || begBal < 0) {
      showNotification('Please enter a valid beginning balance.');
      return;
    }

    const assignedBranch = shiftBranch === 'Custom...' ? customBranchText : shiftBranch;
    const finalBranch = assignedBranch.trim() || 'Main Branch';

    const newShiftRecord: Shift = {
      cashier_name: activeStaff.username,
      branch: finalBranch,
      beginning_balance: begBal,
      total_sales: 0,
      login_time: new Date().toISOString()
    };

    setSyncStatus('syncing');
    try {
      const { data, error } = await supabase
        .from('pos_shifts')
        .insert([newShiftRecord])
        .select()
        .single();

      if (error) throw error;
      const savedShift = data || newShiftRecord;
      setCurrentUser(activeStaff);
      setCurrentRole('cashier');
      setMyActiveShift(savedShift);
      setIsShiftOverlayOpen(false);
      setTempUser(null);

      localStorage.setItem('br_active_shift', JSON.stringify(savedShift));
      localStorage.setItem('br_session_v1', JSON.stringify({ 
        role: 'cashier', 
        user: activeStaff, 
        shift: savedShift,
        time: Date.now() 
      }));

      showNotification(`Shift register opened at ${finalBranch}!`);
      if (audioEnabled) playSound('success');
      syncShifts();
    } catch (e) {
      console.warn('DB Shift log failed, proceeding with local fallback: ', e);
      setCurrentUser(activeStaff);
      setCurrentRole('cashier');
      setMyActiveShift(newShiftRecord);
      setIsShiftOverlayOpen(false);
      setTempUser(null);

      localStorage.setItem('br_active_shift', JSON.stringify(newShiftRecord));
      localStorage.setItem('br_session_v1', JSON.stringify({ 
        role: 'cashier', 
        user: activeStaff, 
        shift: newShiftRecord,
        time: Date.now() 
      }));

      showNotification(`Opened local shift offline at ${finalBranch}`);
    }
  };

  // --- OFFLINE SESSION RECOVERY & RE-UPLOAD LOGIC ---
  const restoreAndSyncOfflineReceipts = async () => {
    const activeStaff = tempUser || currentUser;
    if (!activeStaff) return;
    setIsRecovering(true);
    setRecoveredCount(null);
    if (audioEnabled) playSound('click');

    try {
      // 1. Load the persistent global offline archive from localStorage
      const archive: Order[] = JSON.parse(localStorage.getItem('br_offline_order_archive_v1') || '[]');
      
      if (archive.length === 0) {
        showNotification('ℹ️ No cached orders found on this web browser/device.');
        setIsRecovering(false);
        return;
      }

      // 2. Filter by username and selected datetime range
      const startTime = new Date(recoveryStart).getTime();
      const endTime = new Date(recoveryEnd).getTime();

      const matchedOrders = archive.filter(order => {
        const orderTime = new Date(order.created_at).getTime();
        const matchesCashier = order.cashier_name === activeStaff.username;
        const matchesTime = orderTime >= startTime && orderTime <= endTime;
        return matchesCashier && matchesTime;
      });

      if (matchedOrders.length === 0) {
        showNotification(`ℹ️ No cached orders found for ${activeStaff.username} within that time range.`);
        setIsRecovering(false);
        return;
      }

      // 3. Verify existing remote database records, fetch any remote orders from Supabase 
      // for this timeframe, matching cashier_name.
      setSyncStatus('syncing');
      const { data: remoteOrders, error: fetchErr } = await supabase
        .from(ordersTableName)
        .select('order_number, created_at, cashier_name')
        .gte('created_at', new Date(recoveryStart).toISOString())
        .lte('created_at', new Date(recoveryEnd).toISOString());

      if (fetchErr) {
        console.warn('Could not verify existing remote orders, attempting batch inserts directly with caution:', fetchErr);
      }

      const existingOrdersList = remoteOrders || [];

      // Determine which items in matchedOrders do NOT exist in existingOrdersList
      const ordersToReupload = matchedOrders.filter(mo => {
        const existsRemotely = existingOrdersList.some((ro: any) => 
          String(ro.order_number) === String(mo.order_number) &&
          ro.cashier_name === mo.cashier_name
        );
        return !existsRemotely;
      });

      if (ordersToReupload.length === 0) {
        // All matching local records already loaded! Let's ensure they are set in the state anyway
        setAllOrders(prev => {
          const merged = [...prev];
          matchedOrders.forEach(mo => {
            const alreadyInState = merged.some(p => p.order_number === mo.order_number && p.created_at === mo.created_at);
            if (!alreadyInState) {
              merged.push(mo);
            }
          });
          merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          return merged;
        });

        // Store range cache for active daily/report displays
        localStorage.setItem(`br_orders_${reportPeriod}`, JSON.stringify(matchedOrders));

        showNotification(`✅ All ${matchedOrders.length} cached orders are already securely synced in the cloud db! Loaded in active memory UI.`);
        setRecoveredCount(0);
        setIsRecovering(false);
        if (audioEnabled) playSound('success');
        return;
      }

      // 4. Perform database insertion for the missing ones in a single batch
      const insertionPayloads = ordersToReupload.map(order => {
        return ordersTableName === 'pos_orders' ? {
          order_number: String(order.order_number),
          items: order.items,
          total: order.total,
          payment_method: order.payment_method,
          cashier_name: order.cashier_name,
          branch: order.branch || 'Main Branch',
          created_at: order.created_at
        } : order;
      });

      const { error: insertErr } = await supabase.from(ordersTableName).insert(insertionPayloads);
      
      if (insertErr) {
        throw insertErr;
      }

      const successCount = ordersToReupload.length;

      // 5. Update local state
      setAllOrders(prev => {
        const merged = [...prev];
        matchedOrders.forEach(mo => {
          const alreadyInState = merged.some(p => p.order_number === mo.order_number && p.created_at === mo.created_at);
          if (!alreadyInState) {
            merged.push(mo);
          }
        });
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return merged;
      });

      // Clear standard unsynced buffer for these specifically
      const activeUnsynced: Order[] = JSON.parse(localStorage.getItem('br_unsynced_orders') || '[]');
      const filteredUnsynced = activeUnsynced.filter(uo => {
        const isMatched = matchedOrders.some(mo => mo.order_number === uo.order_number && mo.created_at === uo.created_at);
        return !isMatched;
      });
      localStorage.setItem('br_unsynced_orders', JSON.stringify(filteredUnsynced));

      setSyncStatus('online');
      setRecoveredCount(successCount);
      showNotification(`🎉 Successfully recovered & re-uploaded ${successCount} offline orders to database!`);
      if (audioEnabled) playSound('success');
    } catch (restoreError) {
      console.error('Backup restoration failed:', restoreError);
      showNotification('❌ Recovery sync failed. Please check network connection / server log.');
      setSyncStatus('offline');
    } finally {
      setIsRecovering(false);
    }
  };

  // --- RECORD DELETE OPERATIONS ---
  const deleteOrder = async (orderId?: number, orderNum?: number) => {
    if (currentRole !== 'admin') {
      showNotification('Access Denied: Administrator access level required.');
      return;
    }
    if (!orderId) {
      showNotification('Unable to delete offline item draft.');
      return;
    }
    setConfirmDialog({
      show: true,
      title: '🗑️ Delete Order Record?',
      msg: `Are you absolutely certain you want to erase order #${orderNum} from historical reports? This action is permanent.`,
      onConfirm: async () => {
        setSyncStatus('syncing');
        try {
          const { error } = await supabase.from(ordersTableName).delete().eq('id', orderId);
          if (error) throw error;
          showNotification(`Order #${orderNum} deleted successfully.`);
          syncOrders(reportPeriod);
        } catch (e) {
          console.error(e);
          showNotification('Error deleting record in offline mode.');
          setAllOrders(prev => prev.filter(o => o.id !== orderId));
        }
        setConfirmDialog({ show: false, title: '', msg: '', onConfirm: () => {} });
      }
    });
  };

  // --- REPORT EXPORT ENGINE (CSV) ---
  const handleExportCSV = () => {
    const subset = allOrders.filter(o => {
      if (!o.created_at) return false;
      const oDateStr = o.created_at.substring(0, 10);
      const matchDate = oDateStr >= startDateFilter && oDateStr <= endDateFilter;
      if (!matchDate) return false;

      if (selectedBranchFilter !== 'All') {
        const bMatch = (o.branch || 'Main Branch').toLowerCase() === selectedBranchFilter.toLowerCase();
        if (!bMatch) return false;
      }

      if (selectedCashierFilter !== 'All') {
        const cMatch = (o.cashier_name || '').toLowerCase() === selectedCashierFilter.toLowerCase();
        if (!cMatch) return false;
      }

      return true;
    });

    if (subset.length === 0) {
      showNotification(`No completed orders logged matching current filters.`);
      return;
    }

    // Build standard high-quality CSV
    let csvStr = "\uFEFF"; // Byte-order mark for Excel compatibility
    csvStr += `"${posName.toUpperCase()} SALES REPORT"\n`;
    csvStr += `"Selected Date Range:","${startDateFilter} to ${endDateFilter}"\n`;
    csvStr += `"Branch Filter:","${selectedBranchFilter}"\n`;
    csvStr += `"Cashier Filter:","${selectedCashierFilter}"\n`;
    csvStr += `"Generated Time:","${new Date().toLocaleTimeString('en-PH')}"\n\n`;
    
    csvStr += `"Order No.","Timestamp","Completed Items","Branch Destination","Cashier","Total Revenue (PHP)","Estimated Total Cost (PHP)","Estimated Net Profit (PHP)","Item Breakdown & Costing","Payment Channel"\n`;
    
    let sumTotalSales = 0;
    let sumTotalCost = 0;
    subset.forEach(o => {
      let orderCost = 0;
      const breakdowns: string[] = [];

      o.items.forEach(itemStr => {
        const match = itemStr.match(/(.+)\s+x\s*(\d+)$/i);
        if (match) {
          const itemName = match[1].trim();
          const qty = parseInt(match[2], 10) || 0;
          const prod = products.find(p => p.name.toLowerCase() === itemName.toLowerCase());
          if (prod) {
            const unitCost = prod.cost || 0;
            const unitPrice = prod.price || 0;
            const lineCost = unitCost * qty;
            const linePrice = unitPrice * qty;
            const lineProfit = linePrice - lineCost;
            orderCost += lineCost;
            breakdowns.push(`${qty}x ${itemName} (Price: ₱${unitPrice} - Cost: ₱${unitCost} = Profit: ₱${unitPrice - unitCost} | Tot.Profit: ₱${lineProfit})`);
          } else {
            breakdowns.push(`${qty}x ${itemName} (Price: ? | Cost: 0)`);
          }
        } else {
          breakdowns.push(`${itemStr} (Unparsed)`);
        }
      });

      const orderProfit = o.total - orderCost;
      sumTotalCost += orderCost;

      const rawText = o.items.join('; ').replace(/"/g, '""');
      const breakdownText = breakdowns.join('; ').replace(/"/g, '""');
      const timeString = new Date(o.created_at).toLocaleString('en-PH', { hour12: false });
      csvStr += `${o.order_number},"${timeString}","${rawText}","${o.branch || 'Main Branch'}","${o.cashier_name || 'Unassigned'}",${o.total},${orderCost},${orderProfit},"${breakdownText}","${o.payment_method}"\n`;
      sumTotalSales += o.total;
    });

    csvStr += `\n"SUMMARY METRICS"\n`;
    csvStr += `"Total Volume Count:",${subset.length}\n`;
    csvStr += `"Gross Operational Revenues PHP:",${sumTotalSales}\n`;
    csvStr += `"Estimated Total Cost of Goods Sold PHP:",${sumTotalCost}\n`;
    csvStr += `"Estimated Total Sales Net Profit PHP:",${sumTotalSales - sumTotalCost}\n`;
    
    // Sum beginning balance of shifts within range & filters
    const sumBeginningBalance = shifts.reduce((acc, s) => {
      const dateStr = s.login_time ? s.login_time.substring(0, 10) : (s.created_at ? s.created_at.substring(0, 10) : '');
      if (dateStr && dateStr >= startDateFilter && dateStr <= endDateFilter) {
        if (selectedBranchFilter !== 'All') {
          const bMatch = (s.branch || 'Main Branch').toLowerCase() === selectedBranchFilter.toLowerCase();
          if (!bMatch) return acc;
        }
        if (selectedCashierFilter !== 'All') {
          const cMatch = (s.cashier_name || '').toLowerCase() === selectedCashierFilter.toLowerCase();
          if (!cMatch) return acc;
        }
        return acc + (s.beginning_balance || 0);
      }
      return acc;
    }, 0);

    // Sum expenses within range & filters
    const sumExpenses = expenses.reduce((acc, e) => {
      const dateStr = e.created_at ? e.created_at.substring(0, 10) : '';
      if (dateStr && dateStr >= startDateFilter && dateStr <= endDateFilter) {
        if (selectedBranchFilter !== 'All') {
          const bMatch = (e.branch || 'Main Branch').toLowerCase() === selectedBranchFilter.toLowerCase();
          if (!bMatch) return acc;
        }
        if (selectedCashierFilter !== 'All') {
          const cMatch = (e.cashier_name || '').toLowerCase() === selectedCashierFilter.toLowerCase();
          if (!cMatch) return acc;
        }
        return acc + (e.cost || 0);
      }
      return acc;
    }, 0);

    const netValue = sumTotalSales - sumExpenses;
    const finalNetIncomeAfterCOGSAndExpenses = sumTotalSales - sumTotalCost - sumExpenses;

    csvStr += `"Total Shift Beginning Balance PHP:",${sumBeginningBalance}\n`;
    csvStr += `"Total Operational Expenses PHP:",${sumExpenses}\n`;
    csvStr += `"Estimated Net Operating Revenue (Gross - Expenses) PHP:",${netValue}\n`;
    csvStr += `"Estimated Final Net Income (Gross - Cost of Goods - Expenses) PHP:",${finalNetIncomeAfterCOGSAndExpenses}\n`;

    // Dynamic click triggers browser downloader
    const blobObj = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const localUrl = URL.createObjectURL(blobObj);
    const hiddenLink = document.createElement("a");
    hiddenLink.setAttribute("href", localUrl);
    
    const sanitizedFileName = posName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    hiddenLink.setAttribute("download", `${sanitizedFileName}_Sales_Report_${startDateFilter}_to_${endDateFilter}.csv`);
    document.body.appendChild(hiddenLink);
    hiddenLink.click();
    document.body.removeChild(hiddenLink);

    showNotification(`Sales spreadsheet for ${startDateFilter} to ${endDateFilter} exported!`);
    if (audioEnabled) playSound('success');
  };

  // --- PRODUCT MANAGEMENT EDITOR (NAME & PRICE & CATEGORY) ---
  const handleUpdateProduct = async (pId: number) => {
    const trimmedName = editingProductName.trim();
    if (!trimmedName) {
      showNotification('Please enter a valid product name');
      return;
    }
    const rawVal = parseFloat(editingProductPrice);
    if (isNaN(rawVal) || rawVal <= 0) {
      showNotification('Please enter a valid price greater than ₱0');
      return;
    }
    const trimmedCat = editingProductCategory.trim() || 'Meals';
    const costVal = parseFloat(editingProductCost) || 0;
    const variantVal = editingProductVariant.trim() || 'Regular';

    // Find previous item name to remove old lookup if renamed
    const oldProd = products.find(p => p.id === pId);
    
    // Save extra properties locally
    const savedCostsStr = localStorage.getItem('br_product_costs_off') || '{}';
    const savedVariantsStr = localStorage.getItem('br_product_variants_off') || '{}';
    let savedCosts: any = {};
    let savedVariants: any = {};
    try {
      savedCosts = JSON.parse(savedCostsStr);
      savedVariants = JSON.parse(savedVariantsStr);
    } catch (e) {}
    
    if (oldProd && oldProd.name !== trimmedName) {
      delete savedCosts[oldProd.name];
      delete savedVariants[oldProd.name];
    }
    savedCosts[trimmedName] = costVal;
    savedVariants[trimmedName] = variantVal;
    localStorage.setItem('br_product_costs_off', JSON.stringify(savedCosts));
    localStorage.setItem('br_product_variants_off', JSON.stringify(savedVariants));

    setSyncStatus('syncing');
    try {
      const { error } = await supabase
        .from('products')
        .update({ name: trimmedName, price: rawVal, emoji: trimmedCat })
        .eq('id', pId);

      if (error) throw error;
      setProducts(prev => {
        const updated = prev.map(p => p.id === pId ? { ...p, name: trimmedName, price: rawVal, emoji: trimmedCat, category: trimmedCat, cost: costVal, variant: variantVal } : p);
        return mapLoadedProducts(updated);
      });
      setEditingProductId(null);
      setEditingProductName('');
      setEditingProductPrice('');
      setEditingProductCategory('');
      setEditingProductCost('');
      setEditingProductVariant('');
      setSyncStatus('online');
      showNotification('Product details saved successfully!');
      if (audioEnabled) playSound('success');
    } catch (e) {
      console.warn("DB product edit failed, applying locally: ", e);
      setProducts(prev => {
        const updated = prev.map(p => p.id === pId ? { ...p, name: trimmedName, price: rawVal, emoji: trimmedCat, category: trimmedCat, cost: costVal, variant: variantVal } : p);
        return mapLoadedProducts(updated);
      });
      setEditingProductId(null);
      setEditingProductName('');
      setEditingProductPrice('');
      setEditingProductCategory('');
      setEditingProductCost('');
      setEditingProductVariant('');
      setSyncStatus('offline');
      showNotification('Product details modified locally (offline)');
    }
  };

  // --- STAFF CREDENTIALS AND AUTH MANAGEMENT ---
  const handleAddStaffUser = async () => {
    const userVal = newStaffUsername.trim().toLowerCase();
    const pinVal = newStaffPassword.trim();
    if (!userVal || !pinVal) {
      showNotification('Please fill in both Staff Username and Login PIN.');
      return;
    }

    const payload: PosUser = {
      username: userVal,
      password: pinVal,
      role: newStaffRole,
      branch: newStaffBranch
    };

    setSyncStatus('syncing');
    try {
      const { data, error } = await supabase.from('pos_users').insert([payload]).select();
      if (error) throw error;
      showNotification(`Registered ${newStaffRole} account: "${userVal}" at ${newStaffBranch}`);
      setNewStaffUsername('');
      setNewStaffPassword('');
      syncUsers();
      if (audioEnabled) playSound('success');
    } catch (e) {
      console.error(e);
      // fallback locally
      const updatedLocalUsers = [...users, payload];
      setUsers(updatedLocalUsers);
      localStorage.setItem('br_users_cached', JSON.stringify(updatedLocalUsers));
      showNotification('Account updated locally (Offline fallback)');
      setNewStaffUsername('');
      setNewStaffPassword('');
    }
  };

  const handleChangeStaffPassword = async () => {
    const selUser = passwordChangeUser;
    const pinVal = passwordChangeNew.trim();
    const branchVal = passwordChangeBranch;
    if (!selUser || !pinVal) {
      showNotification('Please select user account and input a new PIN code');
      return;
    }

    setSyncStatus('syncing');
    try {
      const { error } = await supabase
        .from('pos_users')
        .update({ password: pinVal, branch: branchVal })
        .eq('username', selUser);

      if (error) throw error;
      showNotification(`PIN/Branch updated for "${selUser}"`);
      setPasswordChangeUser('');
      setPasswordChangeNew('');
      syncUsers();
      if (audioEnabled) playSound('success');
    } catch (e) {
      console.error(e);
      // update cached list locally
      const updatedLocalUsers = users.map(u => u.username === selUser ? { ...u, password: pinVal, branch: branchVal } : u);
      setUsers(updatedLocalUsers);
      localStorage.setItem('br_users_cached', JSON.stringify(updatedLocalUsers));
      showNotification('Updated password/branch caching offline');
      setPasswordChangeUser('');
      setPasswordChangeNew('');
    }
  };

  // --- MODULAR BRANCH MANAGEMENT ---
  const handleCreateBranch = () => {
    const name = newBranchName.trim();
    if (!name) {
      showNotification('Please key in a valid Branch name');
      return;
    }
    if (branches.length >= maxBranches) {
      showNotification(`Subscription Limit: Your current license allows a maximum of ${maxBranches} active branches. Upgrade inside the Developer Panel.`);
      return;
    }
    if (branches.some(b => b.toLowerCase() === name.toLowerCase())) {
      showNotification('Error - This branch name already exists!');
      return;
    }
    const updated = [...branches, name];
    setBranches(updated);
    localStorage.setItem('br_branches_v2', JSON.stringify(updated));
    showNotification(`New branch created successfully: "${name}"`);
    setNewBranchName('');
    if (audioEnabled) playSound('success');
  };

  const handleDeleteBranch = (branchToDelete: string) => {
    if (branchToDelete === 'Main Branch') {
      showNotification('Strict Restriction: Main Branch cannot be deleted.');
      setConfirmingDeleteBranch(null);
      return;
    }
    const updated = branches.filter(b => b !== branchToDelete);
    setBranches(updated);
    localStorage.setItem('br_branches_v2', JSON.stringify(updated));
    showNotification(`Branch deleted successfully: "${branchToDelete}"`);
    setConfirmingDeleteBranch(null);
    if (audioEnabled) playSound('success');
  };

  // --- EXPENSE REGISTER ACTION ---
  const handleAddExpense = async () => {
    const expItemName = newExpenseName.trim();
    const expCostValue = parseFloat(newExpenseCost);
    if (!expItemName || isNaN(expCostValue) || expCostValue <= 0) {
      showNotification('Please enter a valid product name and cost.');
      return;
    }

    const cashierName = currentUser?.username || 'cashier';
    const branchName = myActiveShift?.branch || 'Main Branch';

    const expensePayload: Expense = {
      product_name: expItemName,
      cost: expCostValue,
      cashier_name: cashierName,
      branch: branchName,
      created_at: new Date().toISOString()
    };

    setSyncStatus('syncing');
    try {
      const { data, error } = await supabase.from('pos_expenses').insert([expensePayload]).select();
      if (error) throw error;
      
      setNewExpenseName('');
      setNewExpenseCost('');
      showNotification(`Expense logged successfully: ₱${expCostValue}`);
      syncExpenses();
      if (audioEnabled) playSound('bell');
    } catch (e) {
      console.error("DB expense post failed, logging offline: ", e);
      const updatedExpenses = [expensePayload, ...expenses];
      setExpenses(updatedExpenses);
      localStorage.setItem('br_expenses_cached', JSON.stringify(updatedExpenses));
      setNewExpenseName('');
      setNewExpenseCost('');
      showNotification(`Expense logged locally (Offline mode)`);
    }
  };

  // --- ADATIVE ORDER VOID VERIFICATIONS ---
  const triggerVoidRequest = (ord: Order) => {
    setOrderToVoid(ord);
    setAdminVoidPin('');
    setVoidAuthError('');
    setIsVoidAuthOpen(true);
    handleTactileClick();
  };

  const handleAuthorizeVoid = async () => {
    if (!orderToVoid) return;
    const adminCheck = users.find(u => u.role === 'admin' && u.password === adminVoidPin);
    if (!adminCheck) {
      if (audioEnabled) playSound('error');
      setVoidAuthError('Authorization Failed: Invalid Admin PIN');
      setAdminVoidPin('');
      return;
    }

    // Auth succeeded! Execute void update sequence
    setSyncStatus('syncing');
    try {
      const isGcash = orderToVoid.payment_method?.toLowerCase().includes('gcash');
      const voidPaymentMethod = isGcash ? 'GCash (Voided)' : 'Cash (Voided)';

      if (orderToVoid.id) {
        const { error } = await supabase
          .from(ordersTableName)
          .update({ payment_method: voidPaymentMethod })
          .eq('id', orderToVoid.id);
        if (error) throw error;
      }

      // Readjust shift total subtractively (only if a fresh void)
      const isAlreadyVoided = orderToVoid.payment_method?.toLowerCase().includes('void');
      if (myActiveShift && !isAlreadyVoided) {
        const revisedSales = Math.max(0, (myActiveShift.total_sales || 0) - orderToVoid.total);
        const updatedShiftRecord = { ...myActiveShift, total_sales: revisedSales };
        setMyActiveShift(updatedShiftRecord);
        localStorage.setItem('br_active_shift', JSON.stringify(updatedShiftRecord));

        if (myActiveShift.id) {
          await supabase.from('pos_shifts').update({ total_sales: revisedSales }).eq('id', myActiveShift.id);
        }
      }

      showNotification(`Order #${orderToVoid.order_number} has been voided!`);
      if (audioEnabled) playSound('bell'); // trigger clear buzzer sound
      
      // Close popups
      setIsVoidAuthOpen(false);
      setOrderToVoid(null);
      setAdminVoidPin('');
      setVoidAuthError('');
      
      // Refetch
      syncOrders(reportPeriod);
      syncShifts();
    } catch (e) {
      console.warn('DB void operation failed, falling back to local action: ', e);
      // update offline state
      const isGcash = orderToVoid.payment_method?.toLowerCase().includes('gcash');
      const voidPaymentMethod = isGcash ? 'GCash (Voided)' : 'Cash (Voided)';
      setAllOrders(prev => prev.map(o => {
        if (o.order_number === orderToVoid.order_number && o.created_at === orderToVoid.created_at) {
          return { ...o, payment_method: voidPaymentMethod };
        }
        return o;
      }));
      setIsVoidAuthOpen(false);
      setOrderToVoid(null);
      setAdminVoidPin('');
      setVoidAuthError('');
      showNotification('Order voided locally (No sync)');
    }
  };

  // --- CART OPERATIONS ---
  const addToCart = (id: number) => {
    if (audioEnabled) playSound('beep');
    setCart(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  const decrementCart = (id: number) => {
    handleTactileClick();
    setCart(prev => {
      const updated = { ...prev };
      if (!updated[id]) return prev;
      updated[id]--;
      if (updated[id] <= 0) {
        delete updated[id];
      }
      return updated;
    });
  };

  const directRemoveFromCart = (id: number) => {
    handleTactileClick();
    setCart(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const clearEntireCart = () => {
    if (Object.keys(cart).length === 0) return;
    setConfirmDialog({
      show: true,
      title: 'Clear Running Order?',
      msg: 'Are you sure you want to delete all items currently placed in the basket?',
      onConfirm: () => {
        if (audioEnabled) playSound('bell');
        setCart({});
        setConfirmDialog(p => ({ ...p, show: false }));
        showNotification('Order cleared.');
      }
    });
  };

  const cartTotalAmount = useMemo(() => {
    return Object.entries(cart).reduce((sum, [idStr, quantity]) => {
      const pid = parseInt(idStr);
      const prod = products.find(p => p.id === pid);
      return sum + (prod ? prod.price * quantity : 0);
    }, 0);
  }, [cart, products]);

  const totalItemCount = useMemo(() => {
    return Object.values(cart).reduce((sum, val) => sum + val, 0);
  }, [cart]);

  // --- CHECKOUT FINALIZE ---
  const selectPaymentOption = (method: 'cash' | 'gcash') => {
    handleTactileClick();
    if (method === 'cash') {
      setCashReceivedText('');
      setCashModalOpen(true);
    } else {
      setGcashModalOpen(true);
    }
    setChargeModalOpen(false);
  };

  const submitCashCheckout = async () => {
    const receivedAmount = parseFloat(cashReceivedText || '0');
    if (receivedAmount < cartTotalAmount) {
      if (audioEnabled) playSound('error');
      return;
    }

    const changeDueValue = receivedAmount - cartTotalAmount;
    setCashModalOpen(false);
    await processOrderSave('Cash', receivedAmount, changeDueValue);
  };

  const submitGcashCheckout = async () => {
    setGcashModalOpen(false);
    await processOrderSave('GCash', cartTotalAmount, 0);
  };

  const processOrderSave = async (payMethod: string, cashInput: number, changeAmount: number) => {
    setSyncStatus('syncing');
    
    // Auto incremental order numbers local store
    let lastOrderNum = parseInt(localStorage.getItem('br_last_order_num') || '0');
    const assignedOrderNum = lastOrderNum + 1;
    localStorage.setItem('br_last_order_num', assignedOrderNum.toString());

    // Generate neat items array
    const orderedProductsSummaries = Object.entries(cart).map(([pIdStr, qty]) => {
      const prod = products.find(p => p.id === parseInt(pIdStr));
      return prod ? `${prod.name} x${qty}` : `Unknown Item x${qty}`;
    });

    const newOrderRecord: Order = {
      order_number: assignedOrderNum,
      items: orderedProductsSummaries,
      total: cartTotalAmount,
      payment_method: payMethod,
      cash_received: cashInput,
      change_given: changeAmount,
      cashier_role: `${currentUser?.username || 'cashier'} | ${myActiveShift?.branch || 'Main Branch'}${currentUser?.branch && currentUser.branch !== myActiveShift?.branch ? ` (Assigned: ${currentUser.branch})` : ''}`,
      cashier_name: currentUser?.username || 'cashier',
      branch: myActiveShift?.branch || 'Main Branch',
      created_at: new Date().toISOString()
    };

    // Archiving order persistently in local browser device cache for emergency shift recovery:
    try {
      const archive: Order[] = JSON.parse(localStorage.getItem('br_offline_order_archive_v1') || '[]');
      archive.push(newOrderRecord);
      if (archive.length > 1000) {
        archive.shift(); // maintain 1000 items ceiling for storage security
      }
      localStorage.setItem('br_offline_order_archive_v1', JSON.stringify(archive));
    } catch (e) {
      console.warn('Emergency order logging to browser archive failed:', e);
    }

    if (audioEnabled) playSound('success');

    // Dynamically increment shift cumulative sales balance
    if (myActiveShift) {
      const newTotalShiftSales = (myActiveShift.total_sales || 0) + cartTotalAmount;
      const updatedShiftObj = { ...myActiveShift, total_sales: newTotalShiftSales };
      setMyActiveShift(updatedShiftObj);
      localStorage.setItem('br_active_shift', JSON.stringify(updatedShiftObj));
      
      // Update session storage
      const rawSession = localStorage.getItem('br_session_v1');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        parsed.shift = updatedShiftObj;
        localStorage.setItem('br_session_v1', JSON.stringify(parsed));
      }

      if (myActiveShift.id) {
        supabase
          .from('pos_shifts')
          .update({ total_sales: newTotalShiftSales })
          .eq('id', myActiveShift.id)
          .then(({ error }) => {
            if (error) console.warn('Could not increment shift total sales remote db record:', error);
            syncShifts();
          });
      }
    }

    // Append the newly created order directly to client state for instant feedback without network roundtrip lag
    setAllOrders(prev => {
      if (prev.some(o => o.order_number === newOrderRecord.order_number && o.created_at === newOrderRecord.created_at)) {
        return prev;
      }
      return [newOrderRecord, ...prev];
    });

    const insertPayload = ordersTableName === 'pos_orders' ? {
      order_number: String(newOrderRecord.order_number),
      items: newOrderRecord.items,
      total: newOrderRecord.total,
      payment_method: newOrderRecord.payment_method,
      cashier_name: newOrderRecord.cashier_name,
      branch: newOrderRecord.branch,
      created_at: newOrderRecord.created_at
    } : newOrderRecord;

    try {
      const { error } = await supabase.from(ordersTableName).insert([insertPayload]);
      if (error) throw error;
      setSyncStatus('online');
    } catch (e) {
      console.warn('Network issue while writing order, saving to local retry stack.', e);
      setSyncStatus('offline');
      // Save locally to background buffer
      const unsynced = JSON.parse(localStorage.getItem('br_unsynced_orders') || '[]');
      unsynced.push(newOrderRecord);
      localStorage.setItem('br_unsynced_orders', JSON.stringify(unsynced));
    }

    // Trigger printed modal
    setActiveReceiptOrder(newOrderRecord);
    setReceiptModalOpen(true);
  };

  const closeReceiptAndAdvance = () => {
    handleTactileClick();
    setCart({});
    setReceiptModalOpen(false);
    setActiveReceiptOrder(null);
    syncOrders(reportPeriod);
  };

  // --- CASH NUMERIC KEYPAD KEYSTROKES ---
  const handleCashNumpadInput = (input: string) => {
    handleTactileClick();
    if (input === 'del') {
      setCashReceivedText(prev => prev.slice(0, -1));
    } else if (input === 'exact') {
      setCashReceivedText(cartTotalAmount.toString());
    } else {
      setCashReceivedText(prev => {
        if (prev === '0') return input;
        return prev + input;
      });
    }
  };

  const handleCashQuickAdd = (amount: number) => {
    handleTactileClick();
    const current = parseFloat(cashReceivedText || '0');
    setCashReceivedText((current + amount).toString());
  };

  // --- PRODUCT INVENTORY CONTROL ---
  const triggerAddProduct = async () => {
    if (products.length >= maxProducts) {
      if (audioEnabled) playSound('error');
      showNotification(`🚫 Subscription Limit Exceeded: You have reached the maximum allowance of ${maxProducts} products for this system license.`);
      return;
    }

    const priceNum = parseFloat(newProdPrice);
    if (!newProdName.trim() || isNaN(priceNum) || priceNum <= 0) {
      if (audioEnabled) playSound('error');
      showNotification('Please enter a valid product name and price.');
      return;
    }
    setSyncStatus('syncing');

    let finalCategory = newProdCategory;
    if (newProdCategory === '__add_custom__' || isAddingCustomCategory) {
      finalCategory = customCategoryName.trim() || 'Meals';
    }

    const freshProduct = {
      name: newProdName.trim(),
      emoji: finalCategory, // Store category string inside the DB's emoji field
      price: priceNum,
      active: true
    };

    const costNum = parseFloat(newProdCost) || 0;
    const variantStr = newProdVariant.trim() || 'Regular';

    try {
      // Save extra properties locally
      const savedCostsStr = localStorage.getItem('br_product_costs_off') || '{}';
      const savedVariantsStr = localStorage.getItem('br_product_variants_off') || '{}';
      let savedCosts: any = {};
      let savedVariants: any = {};
      try {
        savedCosts = JSON.parse(savedCostsStr);
        savedVariants = JSON.parse(savedVariantsStr);
      } catch (e) {}
      savedCosts[freshProduct.name] = costNum;
      savedVariants[freshProduct.name] = variantStr;
      localStorage.setItem('br_product_costs_off', JSON.stringify(savedCosts));
      localStorage.setItem('br_product_variants_off', JSON.stringify(savedVariants));

      const { data, error } = await supabase.from('products').insert([freshProduct]).select().single();
      if (error) throw error;
      const parsedData = mapLoadedProducts([data])[0];
      setProducts(prev => [...prev, parsedData]);
      setNewProdName('');
      setNewProdPrice('');
      setNewProdCategory('Meals');
      setNewProdCost('');
      setNewProdVariant('Regular');
      setCustomCategoryName('');
      setIsAddingCustomCategory(false);
      if (audioEnabled) playSound('bell');
      showNotification('Success! Inserted on live menus.');
      setSyncStatus('online');
    } catch (err: any) {
      setSyncStatus('offline');
      // Save extra properties locally
      const savedCostsStr = localStorage.getItem('br_product_costs_off') || '{}';
      const savedVariantsStr = localStorage.getItem('br_product_variants_off') || '{}';
      let savedCosts: any = {};
      let savedVariants: any = {};
      try {
        savedCosts = JSON.parse(savedCostsStr);
        savedVariants = JSON.parse(savedVariantsStr);
      } catch (e) {}
      savedCosts[freshProduct.name] = costNum;
      savedVariants[freshProduct.name] = variantStr;
      localStorage.setItem('br_product_costs_off', JSON.stringify(savedCosts));
      localStorage.setItem('br_product_variants_off', JSON.stringify(savedVariants));

      // Save offline simulated increment
      const localAlt: Product = {
        id: Date.now(),
        ...freshProduct
      };
      const parsedLocalAlt = mapLoadedProducts([localAlt])[0];
      setProducts(prev => [...prev, parsedLocalAlt]);
      localStorage.setItem('br_menu_cached', JSON.stringify(mapLoadedProducts([...products, parsedLocalAlt])));
      setNewProdName('');
      setNewProdPrice('');
      setNewProdCategory('Meals');
      setNewProdCost('');
      setNewProdVariant('Regular');
      setCustomCategoryName('');
      setIsAddingCustomCategory(false);
      showNotification('Saved locally (Offline mode)');
    }
  };

  const triggerDeactivateProduct = (p: Product) => {
    handleTactileClick();
    setConfirmDialog({
      show: true,
      title: `Deactivate ${p.name}?`,
      msg: 'This moves the product to inactive storage, hiding it from daily POS layouts immediately.',
      onConfirm: async () => {
        setSyncStatus('syncing');
        setConfirmDialog(prev => ({ ...prev, show: false }));
        try {
          const { error } = await supabase.from('products').update({ active: false }).eq('id', p.id);
          if (error) throw error;
          setProducts(prev => prev.filter(item => item.id !== p.id));
          showNotification('Product removed from active grids.');
          setSyncStatus('online');
        } catch (err) {
          setSyncStatus('offline');
          const left = products.filter(item => item.id !== p.id);
          setProducts(left);
          localStorage.setItem('br_menu_cached', JSON.stringify(left));
          showNotification('Removed locally from screen cache');
        }
      }
    });
  };

  // --- IN-MEMORY DATE FILTERING FOR HISTORICAL REPORTS ---
  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => {
      if (!o.created_at) return false;
      try {
        const oDateStr = o.created_at.substring(0, 10); // YYYY-MM-DD
        const matchDate = oDateStr >= startDateFilter && oDateStr <= endDateFilter;
        if (!matchDate) return false;

        if (selectedBranchFilter !== 'All') {
          const bMatch = (o.branch || 'Main Branch').toLowerCase() === selectedBranchFilter.toLowerCase();
          if (!bMatch) return false;
        }

        if (selectedCashierFilter !== 'All') {
          const cMatch = (o.cashier_name || '').toLowerCase() === selectedCashierFilter.toLowerCase();
          if (!cMatch) return false;
        }

        return true;
      } catch (err) {
        return true;
      }
    });
  }, [allOrders, startDateFilter, endDateFilter, selectedBranchFilter, selectedCashierFilter]);

  // --- STATS PARSING ---
  const analyticsData = useMemo(() => {
    const stats = {
      revenue: 0,
      totalOrders: 0,
      averageTicket: 0,
      cashRevenue: 0,
      gcashRevenue: 0,
      cashCount: 0,
      gcashCount: 0,
      voidedRevenue: 0,
      voidedCount: 0,
      allFilteredCount: filteredOrders.length,
      totalBeginningBalance: 0,
      totalExpenses: 0,
      netRevenue: 0,
      expectedRegisterCash: 0,
      totalCOGS: 0,     // Total Cost of Goods Sold
      grossProfit: 0,   // Gross Profit (revenue - COGS)
      netProfit: 0      // Net Profit (grossProfit - expenses)
    };

    // Calculate sum of beginning balances for selected date range
    shifts.forEach(s => {
      const dateStr = s.login_time ? s.login_time.substring(0, 10) : (s.created_at ? s.created_at.substring(0, 10) : '');
      if (dateStr && dateStr >= startDateFilter && dateStr <= endDateFilter) {
        if (selectedBranchFilter !== 'All') {
          const bMatch = (s.branch || 'Main Branch').toLowerCase() === selectedBranchFilter.toLowerCase();
          if (!bMatch) return;
        }
        if (selectedCashierFilter !== 'All') {
          const cMatch = (s.cashier_name || '').toLowerCase() === selectedCashierFilter.toLowerCase();
          if (!cMatch) return;
        }
        stats.totalBeginningBalance += s.beginning_balance || 0;
      }
    });

    // Calculate sum of expenses for selected date range
    expenses.forEach(e => {
      if (e.created_at) {
        const dateStr = e.created_at.substring(0, 10);
        if (dateStr && dateStr >= startDateFilter && dateStr <= endDateFilter) {
          if (selectedBranchFilter !== 'All') {
            const bMatch = (e.branch || 'Main Branch').toLowerCase() === selectedBranchFilter.toLowerCase();
            if (!bMatch) return;
          }
          if (selectedCashierFilter !== 'All') {
            const cMatch = (e.cashier_name || '').toLowerCase() === selectedCashierFilter.toLowerCase();
            if (!cMatch) return;
          }
          stats.totalExpenses += e.cost || 0;
        }
      }
    });

    filteredOrders.forEach(o => {
      const isVoid = o.payment_method?.toLowerCase().includes('void');
      if (isVoid) {
        stats.voidedRevenue += o.total;
        stats.voidedCount++;
        return; // skip adding to active sales totals
      }

      stats.revenue += o.total;
      stats.totalOrders++;

      // Recalculate cost per product sold
      if (Array.isArray(o.items)) {
        o.items.forEach(itemStr => {
          const itemMatch = itemStr.match(/(.+)\sx(\d+)/);
          let name = itemStr.trim();
          let itemQty = 1;
          if (itemMatch) {
            name = itemMatch[1].trim();
            itemQty = parseInt(itemMatch[2]) || 1;
          }
          const matchedProd = products.find(p => p.name.toLowerCase() === name.toLowerCase());
          const itemCost = matchedProd?.cost || 0;
          stats.totalCOGS += itemCost * itemQty;
        });
      }

      const isGcash = o.payment_method?.toLowerCase().includes('gcash');
      if (isGcash) {
        stats.gcashRevenue += o.total;
        stats.gcashCount++;
      } else {
        stats.cashRevenue += o.total;
        stats.cashCount++;
      }
    });

    stats.averageTicket = stats.totalOrders > 0 ? Math.round(stats.revenue / stats.totalOrders) : 0;
    stats.netRevenue = stats.revenue - stats.totalExpenses;
    stats.expectedRegisterCash = stats.cashRevenue + stats.totalBeginningBalance - stats.totalExpenses;
    
    // Profit margin recalculations per product sold
    stats.grossProfit = stats.revenue - stats.totalCOGS;
    stats.netProfit = stats.grossProfit - stats.totalExpenses;

    return stats;
  }, [filteredOrders, shifts, expenses, startDateFilter, endDateFilter, selectedBranchFilter, selectedCashierFilter, products]);

  // Leaders rankings parsing
  const bestSellersRankings = useMemo(() => {
    const scoreboard: { [name: string]: number } = {};
    filteredOrders.forEach(order => {
      const isVoid = order.payment_method?.toLowerCase().includes('void');
      if (isVoid) return; // skip voided dishes!

      if (Array.isArray(order.items)) {
        order.items.forEach(itemStr => {
          // Parse "Name xQuantity" or raw name
          const match = itemStr.match(/(.+)\sx(\d+)/);
          if (match) {
            const name = match[1].trim();
            const qty = parseInt(match[2]);
            scoreboard[name] = (scoreboard[name] || 0) + qty;
          } else {
            scoreboard[itemStr] = (scoreboard[itemStr] || 0) + 1;
          }
        });
      }
    });

    const list = Object.entries(scoreboard).map(([name, qty]) => ({ name, qty }));
    list.sort((a,b) => b.qty - a.qty);
    return list.slice(0, 5); // top 5
  }, [filteredOrders]);

  // --- DETAILED ADMIN DASHBOARD DETAILS ---
  const dashboardDetails = useMemo(() => {
    const branchSales: { [branch: string]: { revenue: number; count: number } } = {};
    const cashierSales: { [cashier: string]: { revenue: number; count: number } } = {};
    const hourlySales: { [hourRange: string]: number } = {};

    filteredOrders.forEach(o => {
      const isVoid = o.payment_method?.toLowerCase().includes('void');
      if (isVoid) return; // skip voided transactions from dashboard stats

      const bName = o.branch || 'Main Branch';
      const cName = o.cashier_name || 'Cashier (Unassigned)';

      // Branch aggregating
      if (!branchSales[bName]) {
        branchSales[bName] = { revenue: 0, count: 0 };
      }
      branchSales[bName].revenue += o.total;
      branchSales[bName].count += 1;

      // Cashier aggregating
      if (!cashierSales[cName]) {
        cashierSales[cName] = { revenue: 0, count: 0 };
      }
      cashierSales[cName].revenue += o.total;
      cashierSales[cName].count += 1;

      // Hourly distribution parsing
      try {
        const dObj = new Date(o.created_at);
        const hr = dObj.getHours();
        const hrStr = hr === 0 ? '12 AM' : hr === 12 ? '12 PM' : hr > 12 ? `${hr - 12} PM` : `${hr} AM`;
        hourlySales[hrStr] = (hourlySales[hrStr] || 0) + o.total;
      } catch (e) {}
    });

    return {
      branchSales: Object.entries(branchSales).map(([name, val]) => ({ name, ...val })),
      cashierSales: Object.entries(cashierSales).map(([name, val]) => ({ name, ...val })),
      hourlySales: Object.entries(hourlySales).map(([hourRange, revenue]) => ({ hourRange, revenue }))
    };
  }, [filteredOrders]);

  const maxBestSellerQty = useMemo(() => {
    if (bestSellersRankings.length === 0) return 1;
    return Math.max(...bestSellersRankings.map(b => b.qty));
  }, [bestSellersRankings]);

  // --- INVENTORY MANAGEMENT ACTION HANDLERS ---
  const handleStockIn = () => {
    if (!newStockItem.trim() || !newStockQty || parseFloat(newStockQty) <= 0) {
      showNotification('Please fill in Item Name and valid Quantity');
      return;
    }
    const freshTx: InventoryTransaction = {
      id: 'tx-' + Date.now(),
      itemName: newStockItem.trim(),
      qty: parseFloat(newStockQty),
      variant: newStockVariant.trim() || 'Regular',
      cost: parseFloat(newStockCost) || 0,
      type: 'stock-in',
      status: 'pending-delivery', // tagged from warehouse by admin
      destinationBranch: newStockDestBranch,
      deliveryDate: new Date(newStockDeliveryDate).toISOString(),
      performedBy: currentUser?.username || 'admin'
    };
    
    const updated = [freshTx, ...inventoryTransactions];
    setInventoryTransactions(updated);
    localStorage.setItem('br_inventory_transactions', JSON.stringify(updated));
    
    setNewStockItem('');
    setNewStockQty('');
    setNewStockCost('');
    setNewStockVariant('Regular');
    showNotification('Stock tagged from warehouse! Delivery pending cashier arrival confirmation.');
    if (audioEnabled) playSound('bell');
  };

  // --- BATCH STOCK DISPATCH DISPATCHERS ---
  const handleAddBatchItem = () => {
    if (!batchItemSelect.trim()) {
      showNotification('Please select a product first');
      return;
    }
    const qVal = parseFloat(batchItemQty);
    if (isNaN(qVal) || qVal <= 0) {
      showNotification('Please enter a valid quantity');
      return;
    }
    const cVal = parseFloat(batchItemCost) || 0;
    
    // Check if item already exists in the batch to avoid duplicates
    const duplicateIdx = batchItems.findIndex(
      b => b.itemName === batchItemSelect && b.variant === batchItemVariant
    );

    if (duplicateIdx !== -1) {
      // update quantity of duplicate item
      const updated = [...batchItems];
      updated[duplicateIdx].qty += qVal;
      setBatchItems(updated);
      showNotification(`Added ${qVal} more units to standard batch item ${batchItemSelect}`);
    } else {
      const newItem = {
        itemName: batchItemSelect.trim(),
        qty: qVal,
        variant: batchItemVariant.trim() || 'Regular',
        cost: cVal
      };
      setBatchItems(prev => [...prev, newItem]);
    }

    setBatchItemQty('');
    if (audioEnabled) playSound('click');
  };

  const handleRemoveBatchItem = (index: number) => {
    setBatchItems(prev => prev.filter((_, idx) => idx !== index));
    if (audioEnabled) playSound('click');
  };

  const handleDispatchBatch = () => {
    if (batchItems.length === 0) {
      showNotification('Batch tagging list is empty. Add items first!');
      return;
    }

    const timestamp = Date.now();
    const newTxs: InventoryTransaction[] = batchItems.map((item, idx) => ({
      id: `tx-${timestamp}-${idx}`,
      itemName: item.itemName,
      qty: item.qty,
      variant: item.variant,
      cost: item.cost,
      type: 'stock-in',
      status: 'pending-delivery',
      destinationBranch: newStockDestBranch,
      deliveryDate: newStockDeliveryDate ? new Date(newStockDeliveryDate).toISOString() : new Date().toISOString(),
      performedBy: currentUser?.username || 'admin'
    }));

    const updated = [...newTxs, ...inventoryTransactions];
    setInventoryTransactions(updated);
    localStorage.setItem('br_inventory_transactions', JSON.stringify(updated));

    setBatchItems([]);
    showNotification(`Success! Dispatched batch of ${newTxs.length} items to ${newStockDestBranch}.`);
    if (audioEnabled) playSound('bell');
  };

  const handleReceiveStock = (txId: string) => {
    const updated = inventoryTransactions.map(tx => {
      if (tx.id === txId) {
        return {
          ...tx,
          status: 'completed' as const,
          arrivalDate: new Date().toISOString()
        };
      }
      return tx;
    });
    setInventoryTransactions(updated);
    localStorage.setItem('br_inventory_transactions', JSON.stringify(updated));
    showNotification('Success! Arrived items tagged as branch store stock.');
    if (audioEnabled) playSound('success');
  };

  const startEditingTx = (tx: InventoryTransaction) => {
    setEditingTxId(tx.id);
    setEditingTxItemName(tx.itemName);
    setEditingTxQty(tx.qty.toString());
    setEditingTxVariant(tx.variant);
    setEditingTxCost(tx.cost.toString());
    setEditingTxDestBranch(tx.destinationBranch);
    setEditingTxStatus(tx.status);
    setEditingTxDeliveryDate(tx.deliveryDate ? tx.deliveryDate.substring(0, 16) : '');
  };

  // --- DEVELOPER PANEL ACTION HANDLERS ---
  const handleSaveSubDates = () => {
    localStorage.setItem('br_sub_start', subStart);
    localStorage.setItem('br_sub_end', subEnd);
    showNotification('🚨 Success: Subscription validity dates saved on local node!');
    if (audioEnabled) playSound('success');
  };

  const handleSaveRestrictions = () => {
    localStorage.setItem('br_sub_max_branches', maxBranches.toString());
    localStorage.setItem('br_sub_max_devices', maxDevices.toString());
    showNotification('🚨 Success: License scale restraints saved!');
    if (audioEnabled) playSound('success');
  };

  const handleResetDeviceDirectory = () => {
    const list = [myDeviceId];
    setRegisteredDevices(list);
    localStorage.setItem('br_device_list', JSON.stringify(list));
    setIsDeviceLimitBlocked(false);
    showNotification('🚨 Success: Browser device registries cleared.');
    if (audioEnabled) playSound('success');
  };

  const handleDevNukeDb = () => {
    localStorage.clear();
    showNotification('🚨 Purging Database Cache... Reloading POS Console...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleUpdateTx = (txId: string) => {
    const qtyNum = parseFloat(editingTxQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showNotification('Error - Please input a valid greater-than-zero quantity!');
      return;
    }
    const costNum = parseFloat(editingTxCost);
    if (isNaN(costNum) || costNum < 0) {
      showNotification('Error - Please input a valid cost!');
      return;
    }
    if (!editingTxDestBranch) {
      showNotification('Error - Destination branch cannot be empty!');
      return;
    }

    const updated = inventoryTransactions.map(tx => {
      if (tx.id === txId) {
        return {
          ...tx,
          itemName: editingTxItemName,
          qty: qtyNum,
          variant: editingTxVariant,
          cost: costNum,
          destinationBranch: editingTxDestBranch,
          status: editingTxStatus,
          deliveryDate: editingTxDeliveryDate ? new Date(editingTxDeliveryDate).toISOString() : tx.deliveryDate,
          // Clear arrival date if transitioning back to pending-delivery
          arrivalDate: editingTxStatus === 'pending-delivery' ? undefined : tx.arrivalDate || new Date().toISOString()
        };
      }
      return tx;
    });

    setInventoryTransactions(updated);
    localStorage.setItem('br_inventory_transactions', JSON.stringify(updated));
    showNotification('Stock dispatch details updated successfully!');
    setEditingTxId(null);
    if (audioEnabled) playSound('success');
  };

  const handleDeleteTx = (txId: string) => {
    const updated = inventoryTransactions.filter(tx => tx.id !== txId);
    setInventoryTransactions(updated);
    localStorage.setItem('br_inventory_transactions', JSON.stringify(updated));
    showNotification('Stock dispatch cancelled/deleted successfully!');
    setConfirmingDeleteTxId(null);
    if (audioEnabled) playSound('success');
  };

  const handleStockOut = () => {
    if (!selectedStockOutItemKey.trim() || !stockOutQty || parseFloat(stockOutQty) <= 0) {
      showNotification('Please select Stock Item and valid Quantity');
      return;
    }
    const matchingProduct = products.find(p => p.name === selectedStockOutItemKey);
    const costVal = matchingProduct?.cost || 0;
    const variantVal = matchingProduct?.variant || 'Regular';

    const finalReason = stockOutReason === 'Others' 
      ? `Others: ${stockOutNote.trim() || 'No custom note provided'}`
      : stockOutReason;

    const freshTx: InventoryTransaction = {
      id: 'tx-' + Date.now(),
      itemName: selectedStockOutItemKey,
      qty: parseFloat(stockOutQty),
      variant: variantVal,
      cost: costVal,
      type: 'stock-out',
      status: 'completed',
      destinationBranch: myActiveShift?.branch || 'Main Branch',
      deliveryDate: new Date().toISOString(),
      arrivalDate: new Date().toISOString(),
      performedBy: currentUser?.username || 'user',
      reason: finalReason
    };
    
    const updated = [freshTx, ...inventoryTransactions];
    setInventoryTransactions(updated);
    localStorage.setItem('br_inventory_transactions', JSON.stringify(updated));
    
    setSelectedStockOutItemKey('');
    setStockOutQty('');
    setStockOutNote('');
    showNotification('Stock out entry saved successfully.');
    if (audioEnabled) playSound('success');
  };

  const handleClearAllInventoryTransactions = () => {
    setInventoryTransactions([]);
    localStorage.setItem('br_inventory_transactions', JSON.stringify([]));
    showNotification('Success - All inventory transactions have been deleted.');
    setConfirmingClearTransactions(false);
    if (audioEnabled) playSound('success');
  };

  // --- COMPUTE DYNAMIC STOCK LEVEL PER ITEM AND VARIANT ---
  const stockLevels = useMemo(() => {
    const levels: { [key: string]: { qty: number; variant: string; cost: number; branch: string } } = {};
    
    // Seed with existing catalog products
    products.forEach(p => {
      const key = `${p.name}::${p.variant || 'Regular'}`;
      levels[key] = {
        qty: 0,
        variant: p.variant || 'Regular',
        cost: p.cost || 0,
        branch: 'Main Branch'
      };
    });

    // Run active completed stock transactions list
    inventoryTransactions.forEach(tx => {
      if (tx.status !== 'completed') return; // Skip pending deliveries from warehouse
      
      const key = `${tx.itemName}::${tx.variant}`;
      if (!levels[key]) {
        levels[key] = {
          qty: 0,
          variant: tx.variant,
          cost: tx.cost,
          branch: tx.destinationBranch || 'Main Branch'
        };
      }
      
      if (tx.type === 'stock-in') {
        levels[key].qty += tx.qty;
      } else if (tx.type === 'stock-out') {
        levels[key].qty = Math.max(0, levels[key].qty - tx.qty);
      }
    });

    return Object.entries(levels).map(([nVariant, info]) => {
      const [itemName] = nVariant.split('::');
      return {
        itemName,
        qty: info.qty,
        variant: info.variant,
        cost: info.cost,
        branch: info.branch
      };
    });
  }, [inventoryTransactions, products]);

  // --- COMPUTE CHANGE CASH ---
  const enteredReceivedValue = parseFloat(cashReceivedText || '0');
  const computedChangeDue = enteredReceivedValue - cartTotalAmount;
  const cashPayActive = enteredReceivedValue >= cartTotalAmount && cartTotalAmount > 0;

  return (
    <div className="flex flex-col min-h-screen text-zinc-100 bg-zinc-950 font-sans selection:bg-red-600/30">
      
      {/* ─── LICENSE AND SUBSCRIPTION LOCK SCREENS ─── */}
      {!isDeveloperMode && isDeviceLimitBlocked && (
        <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-center p-6 text-center select-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/20 via-zinc-950 to-zinc-950">
          <div className="w-16 h-16 bg-red-600/10 border border-red-500/40 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/5 text-red-500">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight max-w-md">
            🚫 Device License Limit Exceeded
          </h2>
          <p className="text-sm text-zinc-400 mt-3 max-w-md leading-relaxed">
            This registration station has exceeded the maximum devices permitted under your SaaS subscription license.
          </p>
          <div className="mt-8 p-4 bg-zinc-900 border border-zinc-850 rounded-2xl font-mono text-xs text-zinc-500 text-left w-full max-w-xs space-y-1">
            <div>• Registered Devices Count Limit: {maxDevices} max</div>
            <div>• Current Terminal UUID: {myDeviceId}</div>
            <div>• Status: Terminated/Suspended</div>
          </div>
          <p className="text-[10px] text-zinc-650 mt-6 uppercase tracking-widest font-display">
            Please contact the system developer to upgrade this license.
          </p>
        </div>
      )}

      {!isDeveloperMode && !isSubscriptionValid && (
        <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-center p-6 text-center select-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/20 via-zinc-950 to-zinc-950">
          <div className="w-16 h-16 bg-amber-600/10 border border-amber-500/40 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/5 text-amber-500">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight max-w-md">
            ⚠️ Subscription Term Limit Suspended
          </h2>
          <p className="text-sm text-zinc-400 mt-3 max-w-md leading-relaxed">
            Your application&apos;s paid subscription license elapsed on <strong className="text-amber-500">{subEnd}</strong>. Software access is suspended until renewal.
          </p>
          <div className="mt-8 p-4 bg-zinc-900 border border-zinc-850 rounded-2xl font-mono text-xs text-zinc-500 text-left w-full max-w-xs space-y-1">
            <div>• Subscription Range: {subStart} to {subEnd}</div>
            <div>• Current Station UTC Time: {currentTime}</div>
            <div>• Status: Sub-Expired Locked</div>
          </div>
          <p className="text-[10px] text-zinc-650 mt-6 uppercase tracking-widest font-display">
            Please contact the system developer to renew SaaS terminal access.
          </p>
        </div>
      )}

      {/* ─── TOAST NOTIFICATION ─── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 border border-amber-500/30 text-amber-400 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 font-display font-medium text-xs tracking-wider uppercase backdrop-blur"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CONFIRM OVERLAY ─── */}
      <AnimatePresence>
        {confirmDialog.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h4 className="text-lg font-display font-bold text-zinc-100 mb-2 uppercase tracking-wide">
                ⚠️ {confirmDialog.title}
              </h4>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                {confirmDialog.msg}
              </p>
              <div className="flex justify-end gap-3 font-display">
                <button 
                  onClick={() => { handleTactileClick(); setConfirmDialog(p => ({ ...p, show: false })); }}
                  className="px-4 py-2 text-xs rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => { handleTactileClick(); confirmDialog.onConfirm(); }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition shadow-lg shadow-red-600/20"
                >
                  Confirm Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── INITIALIZING LOADER ─── */}
      {isInitializing && currentRole && (
        <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-center gap-4">
          <div className={`w-12 h-12 rounded-full border-2 border-zinc-800 ${tc.spinner} animate-spin`} />
          <span className="text-xs font-display uppercase tracking-widest text-zinc-500 animate-pulse">Initializing {posName} System...</span>
        </div>
      )}

      {/* ─── 1. LOGIN SCREEN (If not authenticated) ─── */}
      {!currentRole ? (
        <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950">
          
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none`} />

          <section className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-md">
            
            <header className="text-center mb-8">
              <h1 className="text-5xl font-display font-black tracking-tight text-white m-0 leading-none">
                {(() => {
                  const words = posName.split(' ');
                  if (words.length > 1) {
                    const firstPart = words.slice(0, -1).join(' ').toUpperCase();
                    const lastPart = words[words.length - 1].toUpperCase();
                    return (
                      <>
                        {firstPart} <span className={tc.text}>{lastPart}</span>
                      </>
                    );
                  } else {
                    return posName.toUpperCase();
                  }
                })()}
              </h1>
              <p className="text-xs font-display font-semibold tracking-widest uppercase text-zinc-400 mt-2">
                Point Of Sale Terminal
              </p>
            </header>

            {/* TAB SELECTOR */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950/80 rounded-2xl mb-6 border border-zinc-800/50">
              <button 
                onClick={() => { setSelectedRole('admin'); setSelectedUsername(''); handleTactileClick(); }}
                className={`py-3 rounded-xl font-display text-xs uppercase tracking-wider font-semibold transition-all ${
                  selectedRole === 'admin' 
                    ? 'bg-zinc-800 text-amber-400 shadow-inner border-b border-amber-500/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                👑 Manager
              </button>
              <button 
                onClick={() => { setSelectedRole('cashier'); setSelectedUsername(''); handleTactileClick(); }}
                className={`py-3 rounded-xl font-display text-xs uppercase tracking-wider font-semibold transition-all ${
                  selectedRole === 'cashier' 
                    ? 'bg-zinc-800 text-red-400 shadow-inner border-b border-red-500/25' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                🧾 Cashier
              </button>
            </div>

            {/* SELECTION ACCOUNT SYSTEM */}
            <div className="mb-6 flex flex-col gap-1">
              <label className="text-[10px] uppercase font-display font-bold tracking-widest text-zinc-500 block mb-1">
                Select Active Profile
              </label>
              <select
                value={selectedUsername}
                onChange={(e) => { setSelectedUsername(e.target.value); handleTactileClick(); }}
                className="w-full bg-zinc-950 border border-zinc-850 p-3 rounded-xl text-xs font-display font-medium text-zinc-250 hover:border-zinc-800 outline-none transition cursor-pointer"
              >
                <option value="">Default {selectedRole === 'admin' ? 'Admin' : 'Cashier'} Login</option>
                {users.filter(u => u.role === selectedRole).map(u => (
                  <option key={u.username} value={u.username}>
                    👤 {u.username.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* PIN INPUT ELEMENT */}
            <div className="mb-6">
              <div className="flex items-center justify-center h-14 bg-zinc-950 rounded-2xl border border-zinc-800 text-center text-3xl font-mono tracking-[0.5em] text-white">
                {enteredPin ? '•'.repeat(enteredPin.length) : <span className="text-xs tracking-wider uppercase font-display text-zinc-600">Enter PIN</span>}
              </div>
              {loginError && (
                <p className="text-center text-xs text-red-500 font-medium mt-2">{loginError}</p>
              )}
            </div>

            {/* NUMPAD */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(val => (
                <button
                  key={val}
                  onClick={() => handlePinNumpad(val)}
                  className="h-14 rounded-xl bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-xl font-display font-medium text-white transition active:scale-95"
                >
                  {val}
                </button>
              ))}
              <button onClick={handlePinDelete} className="h-14 rounded-xl bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-xs uppercase font-display text-red-500 transition active:scale-95">⌫</button>
              <button onClick={() => handlePinNumpad('0')} className="h-14 rounded-xl bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-xl font-display font-medium text-white transition active:scale-95">0</button>
              <button 
                onClick={attemptLogin}
                className="h-14 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-display font-bold uppercase tracking-widest text-white transition active:scale-95 shadow-lg shadow-red-600/20"
              >
                Go
              </button>
            </div>

            <footer className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                Authorized Use Only · Pins: Admin (1234), Cashier (5678)
              </p>
            </footer>
          </section>
        </main>
      ) : (
        
        // ─── 2. SEAMLESS ACTIVE POS WORKSPACE ───
        <div className="flex flex-col h-screen overflow-hidden">
          
          {/* HEADER */}
          <header className="flex-none bg-zinc-900 border-b border-zinc-800 px-3 py-3 md:px-6 md:py-4 flex items-center justify-between shadow-md relative z-30">
            <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
              <div className={`w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr ${tc.gradient} rounded-lg md:rounded-xl flex items-center justify-center font-display font-extrabold text-white text-xs md:text-sm tracking-tight shadow-lg ${tc.shadow} shrink-0`}>
                {posName.split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase() || 'POS'}
              </div>
              <div className="min-w-0">
                <h1 className="text-base md:text-xl font-display font-black tracking-tight text-white leading-none animate-fade-in">
                  {(() => {
                    const words = posName.split(' ');
                    if (words.length > 1) {
                      const firstPart = words.slice(0, -1).join(' ').toUpperCase();
                      const lastPart = words[words.length - 1].toUpperCase();
                      return (
                        <>
                          {firstPart} <span className={tc.text}>{lastPart}</span>
                        </>
                      );
                    } else {
                      return posName.toUpperCase();
                    }
                  })()}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5 md:mt-1 min-w-0">
                  <p className="text-[9px] md:text-[10px] uppercase font-display tracking-widest text-zinc-500 flex items-center gap-1 shrink-0">
                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500" />
                    Terminal
                  </p>
                  {myActiveShift && currentRole === 'cashier' && (
                    <span className="text-[8px] md:text-[9px] uppercase font-mono bg-red-950/40 text-red-400 border border-red-900/30 px-1.5 py-0.5 rounded flex items-center gap-1 truncate max-w-[120px] xs:max-w-none">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
                      <span className="truncate">{myActiveShift.cashier_name} @ {myActiveShift.branch}</span>
                      <span className="hidden md:inline">· Beg: ₱{myActiveShift.beginning_balance}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
              {/* SYNC INDICATOR */}
              <div 
                onClick={() => bootstrapPOS()}
                title="Force refresh database sync"
                className="flex items-center gap-1 bg-zinc-950 border border-zinc-850 py-1 px-2 md:py-1.5 md:px-3 rounded-lg cursor-pointer hover:bg-zinc-850 transition"
              >
                {syncStatus === 'online' && (
                  <>
                    <Wifi className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-500 shrink-0" />
                    <span className="hidden sm:inline text-[9px] uppercase tracking-wider font-display text-emerald-500 font-semibold">Live Database</span>
                  </>
                )}
                {syncStatus === 'syncing' && (
                  <>
                    <RefreshCw className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-500 animate-spin shrink-0" />
                    <span className="hidden sm:inline text-[9px] uppercase tracking-wider font-display text-amber-500 font-semibold">Syncing</span>
                  </>
                )}
                {syncStatus === 'offline' && (
                  <>
                    <WifiOff className="w-3 h-3 md:w-3.5 md:h-3.5 text-zinc-500 animate-pulse shrink-0" />
                    <span className="hidden sm:inline text-[9px] uppercase tracking-wider font-display text-zinc-500 font-semibold">Offline (Local)</span>
                  </>
                )}
              </div>

              {/* CLOCK */}
              <div className="hidden sm:block text-xs font-mono font-medium tracking-widest bg-zinc-950 border border-zinc-850 py-1.5 px-3 rounded-lg text-zinc-400">
                {currentTime}
              </div>

              {/* ADAPTIVE ROLE TAB */}
              <div className={`text-[9px] md:text-[10px] font-display font-bold px-2 py-1 md:px-3 md:py-1.5 rounded-lg border uppercase tracking-wider flex items-center gap-0.5 md:gap-1 shrink-0 ${
                currentRole === 'admin' 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                <span>{currentRole === 'admin' ? '👑' : '🧾'}</span>
                <span className="hidden xs:inline">{currentRole}</span>
              </div>

              {/* LOGOUT */}
              <button 
                onClick={attemptLogout}
                title="Log out register"
                className="p-1.5 md:p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-500 transition hover:bg-red-500/10 active:scale-95 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
          </header>

          {/* MAIN SPACE split in 2 columns: left is menu structure, right is cart pane */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT: PRODUCTS GRID AREA */}
            <main className="flex-1 flex flex-col min-w-0 bg-zinc-950">
              
              {/* NAV PRESETS */}
              <section className="flex-none bg-zinc-900/50 border-b border-zinc-900/90 p-2.5 md:p-4 flex gap-1.5 overflow-x-auto select-none scrollbar-none">
                <button 
                  onClick={() => { handleTactileClick(); setActiveTab('pos'); }}
                  className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'pos' 
                      ? `${tc.bg} text-white ${tc.border} shadow-lg ${tc.shadow}` 
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <Grid className="w-3 md:w-3.5 h-3 md:h-3.5" /> Order Grid
                </button>

                {currentRole === 'admin' ? (
                  <>
                    {enabledTabs.reports && (
                      <button 
                        onClick={() => { handleTactileClick(); setActiveTab('reports'); }}
                        className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                          activeTab === 'reports' 
                            ? `${tc.bg} text-white ${tc.border} shadow-lg ${tc.shadow}` 
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        <TrendingUp className="w-3 md:w-3.5 h-3 md:h-3.5" /> Sales Reports
                      </button>
                    )}
                    {enabledTabs.products && (
                      <button 
                        onClick={() => { handleTactileClick(); setActiveTab('products'); }}
                        className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap relative ${
                          activeTab === 'products' 
                            ? `${tc.bg} text-white ${tc.border} shadow-lg ${tc.shadow}` 
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        <Settings className="w-3 md:w-3.5 h-3 md:h-3.5" /> Products Tab
                      </button>
                    )}
                    {enabledTabs.shifts && (
                      <button 
                        onClick={() => { handleTactileClick(); setActiveTab('shifts'); }}
                        className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap relative ${
                          activeTab === 'shifts' 
                            ? `${tc.bg} text-white ${tc.border} shadow-lg ${tc.shadow}` 
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        <MapPin className="w-3 md:w-3.5 h-3 md:h-3.5 text-amber-500" /> Shifts & Branches
                      </button>
                    )}
                    <button 
                      onClick={() => { handleTactileClick(); setActiveTab('staff'); }}
                      className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'staff' 
                          ? `${tc.bg} text-white ${tc.border} shadow-lg ${tc.shadow}` 
                          : 'bg-zinc-905 text-zinc-400 border-zinc-805 hover:text-zinc-200'
                      }`}
                    >
                      <UserPlus className="w-3 md:w-3.5 h-3 md:h-3.5 text-emerald-500" /> Staff
                    </button>
                    {enabledTabs.inventory && (
                      <button 
                        onClick={() => { handleTactileClick(); setActiveTab('inventory'); }}
                        className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                          activeTab === 'inventory' 
                            ? `${tc.bg} text-white ${tc.border} shadow-lg ${tc.shadow}` 
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        <Boxes className="w-3 md:w-3.5 h-3 md:h-3.5 text-amber-500" /> Stock & Delivery
                      </button>
                    )}
                    {enabledTabs.expenses && (
                      <button 
                        onClick={() => { handleTactileClick(); setActiveTab('expenses'); }}
                        className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                          activeTab === 'expenses' 
                            ? `${tc.bg} text-white ${tc.border} shadow-lg ${tc.shadow}` 
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        <Coins className="w-3 md:w-3.5 h-3 md:h-3.5 text-red-500" /> Expenses
                      </button>
                    )}
                    {isDeveloperMode && (
                      <button 
                        onClick={() => { handleTactileClick(); setActiveTab('developer'); }}
                        className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition border flex items-center gap-1.5 whitespace-nowrap bg-indigo-950/40 text-indigo-400 border-indigo-900/40 hover:text-indigo-200 ${
                          activeTab === 'developer' 
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' 
                            : ''
                        }`}
                      >
                        <Lock className="w-3 md:w-3.5 h-3 md:h-3.5 text-indigo-400 shrink-0" /> Dev Panel Mode
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => { handleTactileClick(); setActiveTab('myshift'); }}
                      className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'myshift' 
                          ? `${tc.bg} text-white ${tc.border} shadow-lg ${tc.shadow}` 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <Briefcase className="w-3 md:w-3.5 h-3 md:h-3.5" /> My Shift
                    </button>
                    {enabledTabs.inventory && (
                      <button 
                        onClick={() => { handleTactileClick(); setActiveTab('inventory'); }}
                        className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                          activeTab === 'inventory' 
                            ? `${tc.bg} text-white ${tc.border} shadow-lg ${tc.shadow}` 
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        <Boxes className="w-3 md:w-3.5 h-3 md:h-3.5 text-amber-500" /> Store Stock
                      </button>
                    )}
                    {enabledTabs.expenses && (
                      <button 
                        onClick={() => { handleTactileClick(); setActiveTab('expenses'); }}
                        className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                          activeTab === 'expenses' 
                            ? `${tc.bg} text-white ${tc.border} shadow-lg ${tc.shadow}` 
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        <Coins className="w-3 md:w-3.5 h-3 md:h-3.5 text-rose-500" /> Log Expenses
                      </button>
                    )}
                  </>
                )}

                {/* AUDIO TOGGLE */}
                <button
                  onClick={() => { setAudioEnabled(!audioEnabled); if (!audioEnabled) playSound('success'); }}
                  className={`ml-auto px-2.5 py-1.5 md:px-3.5 md:py-2 text-[11px] md:text-xs rounded-lg uppercase tracking-wider font-display font-semibold transition border flex items-center gap-1 whitespace-nowrap ${
                    audioEnabled ? 'bg-zinc-950 text-amber-500 border-amber-500/20' : 'bg-zinc-950 text-zinc-650 border-zinc-850'
                  }`}
                >
                  🔊 {audioEnabled ? 'Sound' : 'Mute'}
                </button>
              </section>

              {/* VIEW SWITCHER */}
              <div className="flex-1 overflow-y-auto p-3 md:p-6">
                
                {/* A. ordered grids */}
                {activeTab === 'pos' && (
                  <div className="flex flex-col gap-6">
                    
                    {/* FILTERS PANEL */}
                    <div className="bg-zinc-900/40 border border-zinc-900 p-3 md:p-4 rounded-2xl flex flex-col md:flex-row gap-3 md:gap-4 items-center justify-between">
                      {/* Search */}
                      <div className="relative w-full md:w-72">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                        <input 
                          type="text" 
                          placeholder="Search menu items..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs md:text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-red-600 transition"
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Categories list */}
                      <div className="flex gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-850 select-none overflow-x-auto w-full md:w-auto scrollbar-none">
                        {['All', ...dynamicCategories].map(cat => (
                          <button
                            key={cat}
                            onClick={() => { handleTactileClick(); setSelectedCategory(cat); }}
                            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[11px] md:text-xs font-display uppercase tracking-wider font-semibold transition-all shrink-0 ${
                              selectedCategory === cat 
                                ? 'bg-zinc-900 text-white border border-zinc-850' 
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            <span>{getCategoryEmoji(cat)} </span>
                            <span>{cat}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* MENUS bento grids */}
                    {productsWithCategoriesAndFilters.length === 0 ? (
                      <div className="text-center py-16 bg-zinc-900/10 rounded-3xl border border-dotted border-zinc-850">
                        <p className="text-zinc-500 text-sm font-display uppercase tracking-wide">No active meals match your query.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
                        {productsWithCategoriesAndFilters.map(p => {
                          const qty = cart[p.id] || 0;
                          return (
                            <motion.div
                              whileTap={{ scale: 0.97 }}
                              onClick={() => addToCart(p.id)}
                              key={p.id}
                              className={`bg-zinc-900 border text-left p-3 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition relative overflow-hidden flex flex-col justify-between h-30 sm:h-36 border-zinc-800 hover:border-zinc-700/80 hover:bg-zinc-850 ${
                                qty > 0 ? 'ring-2 ring-red-500/80 ring-offset-2 ring-offset-zinc-950 border-red-600/50' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <span className="text-xl sm:text-2xl filter drop-shadow bg-zinc-950 w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border border-zinc-850">{p.emoji}</span>
                                {qty > 0 && (
                                  <span className="bg-red-600 text-white text-[9px] sm:text-[10px] font-mono font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center animate-bounce shadow">
                                    {qty}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2.5 sm:mt-4">
                                <h4 className="text-[10px] xs:text-xs font-display font-bold line-clamp-2 leading-snug tracking-wide uppercase text-zinc-100">
                                  {p.name}
                                </h4>
                                <div className="flex items-center justify-between mt-1 min-w-0">
                                  <span className="text-xs xs:text-sm font-mono font-bold text-amber-500 shrink-0">₱{p.price}</span>
                                  <span className="text-[8px] xs:text-[9px] uppercase tracking-wider text-zinc-550 font-display font-medium truncate ml-1">
                                    {p.category}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* B. ADMIN: SALES ANALYSIS TAB */}
                {activeTab === 'reports' && currentRole === 'admin' && (
                  <div className="flex flex-col gap-6">
                    
                    {/* Header info */}
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                          Dashboard <span className="text-red-500">Analytics</span>
                        </h2>
                        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                          Real-time sales, personnel and branches aggregations
                        </p>
                      </div>

                      {/* Period Quick Presets */}
                      <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 w-fit">
                        {(['daily', 'weekly', 'monthly'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => {
                              handleTactileClick();
                              setReportPeriod(p);
                              const todayStr = new Date().toLocaleDateString('sv').substring(0, 10);
                              if (p === 'daily') {
                                setStartDateFilter(todayStr);
                                setEndDateFilter(todayStr);
                              } else if (p === 'weekly') {
                                const dObj = new Date();
                                const dNum = dObj.getDay();
                                const startObj = new Date(dObj.setDate(dObj.getDate() - dNum));
                                setStartDateFilter(startObj.toLocaleDateString('sv').substring(0, 10));
                                setEndDateFilter(todayStr);
                              } else if (p === 'monthly') {
                                const dObj = new Date();
                                const startObj = new Date(dObj.getFullYear(), dObj.getMonth(), 1);
                                setStartDateFilter(startObj.toLocaleDateString('sv').substring(0, 10));
                                setEndDateFilter(todayStr);
                              }
                            }}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-display uppercase tracking-widest font-bold transition-all cursor-pointer ${
                              reportPeriod === p ? 'bg-red-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {p === 'daily' ? 'Today' : p === 'weekly' ? 'Week' : 'Month'}
                          </button>
                        ))}
                        <button
                          onClick={() => { handleTactileClick(); setReportPeriod('custom'); }}
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-display uppercase tracking-widest font-bold transition-all cursor-pointer ${
                            reportPeriod === 'custom' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                    </header>

                    {/* Analytics grids */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      
                      <article className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 text-[9px] uppercase font-display font-bold tracking-widest block mb-1">💰 Gross Rev.</span>
                          <div className="text-xl font-mono font-bold text-amber-500">₱{analyticsData.revenue.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">Core Sales sum</p>
                      </article>

                      <article className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 text-[9px] uppercase font-display font-bold tracking-widest block mb-1">📦 Total COGS</span>
                          <div className="text-xl font-mono font-bold text-rose-500">₱{analyticsData.totalCOGS.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">Cost of sold dishes</p>
                      </article>

                      <article className="bg-zinc-900 border border-emerald-950/45 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-emerald-400 text-[9px] uppercase font-display font-bold tracking-widest block mb-1">📈 Sales Profit</span>
                          <div className="text-xl font-mono font-bold text-emerald-400">₱{analyticsData.grossProfit.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">Revenue minus COGS</p>
                      </article>

                      <article className="bg-zinc-900 border border-emerald-950/40 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-emerald-450 text-[9px] uppercase font-display font-bold tracking-widest block mb-1 text-emerald-450">💎 Net Profit</span>
                          <div className="text-xl font-mono font-bold text-glow text-emerald-400">₱{analyticsData.netProfit.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">Profit minus expenses</p>
                      </article>

                      <article className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 text-[9px] uppercase font-display font-bold tracking-widest block mb-1">🏁 Beg. Balance</span>
                          <div className="text-xl font-mono font-bold text-blue-400 font-semibold">₱{analyticsData.totalBeginningBalance.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">Initial register</p>
                      </article>

                      <article className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 text-[9px] uppercase font-display font-bold tracking-widest block mb-1">💵 Cash Sales</span>
                          <div className="text-xl font-mono font-bold text-emerald-500 font-semibold">₱{analyticsData.cashRevenue.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">{analyticsData.cashCount} cash bills</p>
                      </article>

                      <article className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 text-[9px] uppercase font-display font-bold tracking-widest block mb-1">📱 GCash Sales</span>
                          <div className="text-xl font-mono font-bold text-sky-400 font-semibold">₱{analyticsData.gcashRevenue.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">{analyticsData.gcashCount} QR scans</p>
                      </article>

                      <article className="bg-zinc-900 border border-zinc-805/85 border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 text-[9px] uppercase font-display font-bold tracking-widest block mb-1">💸 Exp. Outflow</span>
                          <div className="text-xl font-mono font-bold text-rose-450 text-rose-400">₱{analyticsData.totalExpenses.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">Logged expenses</p>
                      </article>

                      <article className="bg-zinc-900 border border-amber-950/40 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-amber-500 text-[9px] uppercase font-display font-bold tracking-widest block mb-1">🏦 Drawer Cash</span>
                          <div className="text-xl font-mono font-bold text-amber-500">₱{analyticsData.expectedRegisterCash.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">Expected register</p>
                      </article>

                      <article className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 text-[9px] uppercase font-display font-semibold tracking-widest block mb-1">🧾 Volumes</span>
                          <div className="text-xl font-mono font-bold text-white">{analyticsData.totalOrders}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">{analyticsData.voidedCount} voided slips</p>
                      </article>
                    </div>

                    {/* CORE ADMIN INTELLIGENCE DASHBOARD (SALES PER BRANCH, SALES PER CASHIER, HOURLY HEATMAP) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      
                      {/* BRANCH PERFORMANCE LEADERBOARD */}
                      <div className="bg-zinc-900 border border-zinc-805/85 border-zinc-800 p-5 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                          <span className="text-zinc-300 text-xs font-display uppercase tracking-widest font-extrabold flex items-center gap-1">🏢 Sales per Branch</span>
                          <span className="text-[8px] tracking-wider font-mono bg-zinc-950 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-semibold">Active Outlets</span>
                        </div>
                        {dashboardDetails.branchSales.length === 0 ? (
                          <div className="py-12 text-center text-xs text-zinc-500 uppercase tracking-widest font-display">No branch records logged.</div>
                        ) : (
                          <div className="flex flex-col gap-4 overflow-y-auto max-h-56 pr-0.5 animate-fadeIn">
                            {dashboardDetails.branchSales.map((b, idx) => {
                              const contributionPct = analyticsData.revenue > 0 ? (b.revenue / analyticsData.revenue) * 100 : 0;
                              return (
                                <div key={idx} className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-zinc-300 font-display">{b.name}</span>
                                    <div className="text-right">
                                      <span className="font-mono font-bold text-amber-500">₱{b.revenue.toLocaleString()}</span>
                                      <span className="text-[9px] text-zinc-500 block font-mono">({b.count} sales)</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-850">
                                    <div className="bg-gradient-to-r from-red-650 to-amber-500 bg-red-600 h-full rounded-full animate-pulse" style={{ width: `${contributionPct}%` }} />
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[9px] text-zinc-500 font-mono italic">{contributionPct.toFixed(1)}% revenue share</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* STAFF PERFORMANCE ACCOUNTABILITY */}
                      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                          <span className="text-zinc-300 text-xs font-display uppercase tracking-widest font-extrabold flex items-center gap-1">👤 Staff Sales Leaderboard</span>
                          <span className="text-[8px] tracking-wider font-mono bg-zinc-950 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-semibold">User Accounts</span>
                        </div>
                        {dashboardDetails.cashierSales.length === 0 ? (
                          <div className="py-12 text-center text-xs text-zinc-500 uppercase tracking-widest font-display">No cashier checkout logs found.</div>
                        ) : (
                          <div className="flex flex-col gap-4 overflow-y-auto max-h-56 pr-0.5">
                            {dashboardDetails.cashierSales.map((c, idx) => {
                              const contrPct = analyticsData.revenue > 0 ? (c.revenue / analyticsData.revenue) * 100 : 0;
                              return (
                                <div key={idx} className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-zinc-300 font-display uppercase">{c.name}</span>
                                    <div className="text-right">
                                      <span className="font-mono font-bold text-emerald-400">₱{c.revenue.toLocaleString()}</span>
                                      <span className="text-[9px] text-zinc-500 block font-mono">({c.count} transactions)</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-850">
                                    <div className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full" style={{ width: `${contrPct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* PEAK HOURS HEATMAPPED INTENSITY */}
                      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                          <span className="text-zinc-300 text-xs font-display uppercase tracking-widest font-extrabold flex items-center gap-1">⏰ Hourly Traffic Heatmap</span>
                          <span className="text-[8px] tracking-wider font-mono bg-zinc-950 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-semibold">Peak Hours</span>
                        </div>
                        {dashboardDetails.hourlySales.length === 0 ? (
                          <div className="py-12 text-center text-xs text-zinc-500 uppercase tracking-widest font-display">Gathering operational hourly metrics...</div>
                        ) : (
                          <div className="flex flex-col gap-3.5 overflow-y-auto max-h-56 pr-0.5">
                            {dashboardDetails.hourlySales.map((h, idx) => {
                              const maxRev = Math.max(...dashboardDetails.hourlySales.map(item => item.revenue), 1);
                              const barRatio = (h.revenue / maxRev) * 100;
                              return (
                                <div key={idx} className="flex items-center gap-3 text-xs">
                                  <span className="font-mono font-semibold text-zinc-400 w-16">{h.hourRange}</span>
                                  <div className="flex-1 bg-zinc-950 h-2.5 rounded border border-zinc-850 overflow-hidden">
                                    <div className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded" style={{ width: `${barRatio}%` }} />
                                  </div>
                                  <span className="font-mono font-bold text-amber-500 w-20 text-right">₱{h.revenue.toLocaleString()}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* LEADERBOARD */}
                      <div className="bg-zinc-900 border border-zinc-800/80 p-6 rounded-2xl col-span-1">
                        <h4 className="text-xs uppercase font-display font-bold tracking-widest text-zinc-300 border-b border-zinc-850 pb-3 mb-4">
                          🍱 Top Selling Products
                        </h4>
                        {bestSellersRankings.length === 0 ? (
                          <p className="text-xs text-zinc-500 py-12 text-center uppercase tracking-wider font-display">No transactions records found.</p>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {bestSellersRankings.map((b, idx) => {
                              const ratio = (b.qty / maxBestSellerQty) * 100;
                              return (
                                <div key={idx} className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-zinc-300 truncate w-4/5">#{idx+1} {b.name}</span>
                                    <span className="font-mono font-bold text-amber-500">{b.qty} sold</span>
                                  </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* HISTORY FEED */}
                      <div className="bg-zinc-900 border border-zinc-800/80 p-6 rounded-2xl col-span-1 lg:col-span-2">
                        <h4 className="text-xs uppercase font-display font-bold tracking-widest text-zinc-300 border-b border-zinc-850 pb-3 mb-4 flex items-center justify-between">
                          <span>📋 Shift Ledger History</span>
                          <span className="text-[9px] tracking-normal font-mono font-light text-zinc-550 lowercase italic">Order limits showing latest {analyticsData.totalOrders}</span>
                        </h4>

                        {/* FROM - TO SALES RANGE PICKERS PANEL */}
                        <div className="mb-4 bg-zinc-950 p-4 rounded-xl border border-zinc-850/80 flex flex-col xl:flex-row gap-4 items-center justify-between">
                          <div className="text-left">
                            <span className="text-[10px] font-display uppercase tracking-widest text-amber-500 font-bold block">Operational Calendar Filter</span>
                            <span className="text-[9px] text-zinc-500 block uppercase mt-0.5">Filter sales or export spreadsheets</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-display uppercase text-zinc-500 font-bold">From:</span>
                              <input 
                                type="date"
                                value={startDateFilter}
                                onChange={(e) => {
                                  setStartDateFilter(e.target.value);
                                  setReportPeriod('custom');
                                }}
                                className="bg-zinc-900 border border-zinc-800 text-xs font-mono px-2.5 py-1.5 rounded-lg outline-none focus:border-red-500 text-zinc-300"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-display uppercase text-zinc-500 font-bold">To:</span>
                              <input 
                                type="date"
                                value={endDateFilter}
                                onChange={(e) => {
                                  setEndDateFilter(e.target.value);
                                  setReportPeriod('custom');
                                }}
                                className="bg-zinc-900 border border-zinc-800 text-xs font-mono px-2.5 py-1.5 rounded-lg outline-none focus:border-red-500 text-zinc-300"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-display uppercase text-zinc-500 font-bold">Branch:</span>
                              <select 
                                value={selectedBranchFilter}
                                onChange={(e) => {
                                  handleTactileClick();
                                  setSelectedBranchFilter(e.target.value);
                                }}
                                className="bg-zinc-900 border border-zinc-800 text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-red-500 text-zinc-300 cursor-pointer min-w-[124px]"
                              >
                                <option value="All">All Branches</option>
                                {dynamicBranches.map(b => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-display uppercase text-zinc-500 font-bold">Cashier:</span>
                              <select 
                                value={selectedCashierFilter}
                                onChange={(e) => {
                                  handleTactileClick();
                                  setSelectedCashierFilter(e.target.value);
                                }}
                                className="bg-zinc-900 border border-zinc-800 text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-red-500 text-zinc-300 cursor-pointer min-w-[124px]"
                              >
                                <option value="All">All Staff</option>
                                {dynamicCashiers.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>

                            <button
                              onClick={() => handleExportCSV()}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-display font-semibold uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95 transition shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" /> CSV EXPORT
                            </button>
                          </div>
                        </div>

                        {filteredOrders.length === 0 ? (
                          <div className="py-12 text-center">
                            <p className="text-xs text-zinc-500 font-display uppercase tracking-wider">No completed orders parsed inside date parameters.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                            {filteredOrders.map((itm, i) => {
                              const orderDate = new Date(itm.created_at);
                              const orderTime = orderDate.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
                              const isVoided = itm.payment_method?.toLowerCase().includes('void');
                              return (
                                <div key={i} className={`bg-zinc-950 border p-3 rounded-xl flex items-center justify-between gap-4 transition ${isVoided ? 'border-red-550 border-red-500/10 bg-red-950/5' : 'border-zinc-850'}`}>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="text-white text-xs font-mono font-bold">#{itm.order_number}</span>
                                      {isVoided ? (
                                        <span className="text-[8px] uppercase tracking-wider font-mono bg-red-950/40 border border-red-900/30 px-1.5 py-0.5 text-red-500 rounded font-semibold flex items-center gap-1 shadow-sm leading-none">
                                          <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" /> VOIDED
                                        </span>
                                      ) : (
                                        <span className="text-[8px] uppercase tracking-wider font-mono bg-emerald-950/40 border border-emerald-950/20 px-1.5 py-0.5 text-emerald-400 rounded leading-none">
                                          ACTIVE
                                        </span>
                                      )}
                                      <span className="text-[9px] uppercase tracking-widest font-display text-zinc-650 font-bold">{itm.payment_method}</span>
                                      {itm.branch && (
                                        <span className="text-[8px] uppercase tracking-wide font-mono bg-zinc-905 border border-zinc-850 text-zinc-400 px-1 rounded">{itm.branch}</span>
                                      )}
                                      {itm.cashier_name && (
                                        <span className="text-[8.5px] uppercase tracking-wide font-mono text-zinc-550 font-semibold">by {itm.cashier_name}</span>
                                      )}
                                    </div>
                                    <p className={`text-[10px] font-display line-clamp-1 truncate uppercase ${isVoided ? 'line-through text-zinc-550 opacity-70' : 'text-zinc-500'}`}>
                                      {itm.items.join(', ')}
                                    </p>
                                  </div>
                                  <div className="text-right flex items-center gap-3">
                                    <div>
                                      <span className={`font-mono font-bold block text-xs ${isVoided ? 'line-through text-zinc-600' : 'text-amber-500'}`}>₱{itm.total}</span>
                                      <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">{orderTime}</span>
                                    </div>
                                    
                                    <button 
                                      onClick={() => deleteOrder(itm.id, itm.order_number)}
                                      title="Delete transaction record"
                                      className="p-1 px-1.5 bg-red-950/20 hover:bg-red-650 border border-red-910/30 hover:border-red-505 text-red-400 hover:text-white rounded-lg transition shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* C. INVENTORY MANAGEMENT TAB */}
                {activeTab === 'products' && currentRole === 'admin' && (
                  <div className="flex flex-col gap-6">
                    <header>
                      <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                        Product <span className="text-red-500">Manager</span>
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                        Instantly deploy, adjust, or deactivate meals registers
                      </p>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      
                      {/* ADD PRODUCT FORM */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                        <h4 className="text-xs font-display font-extrabold uppercase tracking-widest text-amber-500 border-b border-zinc-850 pb-2 mb-2">
                          ADD NEW DISH/DRINK
                        </h4>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Dish Title</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Java Rice + Lumpia Double" 
                            value={newProdName}
                            onChange={(e) => setNewProdName(e.target.value)}
                            className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-display text-zinc-200 placeholder-zinc-700 outline-none focus:border-amber-500 transition"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Unit Price (₱)</label>
                            <input 
                              type="number" 
                              placeholder="e.g. 110" 
                              value={newProdPrice}
                              onChange={(e) => setNewProdPrice(e.target.value)}
                              className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-mono text-zinc-200 placeholder-zinc-700 outline-none focus:border-amber-500 transition"
                            />
                          </div>
                          
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Category</label>
                            <select 
                              value={newProdCategory}
                              onChange={(e) => {
                                setNewProdCategory(e.target.value);
                                if (e.target.value === '__add_custom__') {
                                  setIsAddingCustomCategory(true);
                                } else {
                                  setIsAddingCustomCategory(false);
                                }
                              }}
                              className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-200 outline-none focus:border-amber-500 transition cursor-pointer"
                            >
                              {dynamicCategories.map(cat => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                              <option value="__add_custom__">
                                ➕ Custom Category...
                              </option>
                            </select>
                          </div>
                        </div>

                        {/* Animated input for custom category */}
                        {isAddingCustomCategory && (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-1.5 bg-zinc-950/40 border border-zinc-850 p-3 rounded-xl"
                          >
                            <label className="text-[9px] font-display uppercase tracking-wider text-amber-500 font-bold">New Category Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Desserts" 
                              value={customCategoryName}
                              onChange={(e) => setCustomCategoryName(e.target.value)}
                              className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-display text-zinc-200 placeholder-zinc-700 outline-none focus:border-amber-500 transition"
                            />
                          </motion.div>
                        )}

                        <button 
                          onClick={triggerAddProduct}
                          className="mt-2 w-full bg-red-600 hover:bg-red-700 text-xs font-display font-medium text-white p-3 rounded-xl transition uppercase tracking-wider font-bold shadow-lg shadow-red-600/15"
                        >
                          ➕ Add to active menu
                        </button>
                      </div>

                      {/* PRODUCTS LIST */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl col-span-1 lg:col-span-2 flex flex-col gap-3">
                        <h4 className="text-xs font-display font-bold uppercase tracking-widest text-zinc-300 border-b border-zinc-850 pb-2 mb-2 flex items-center justify-between">
                          <span>📋 Interactive Menu List</span>
                          <span className="text-[10px] font-mono font-medium text-zinc-600 uppercase">showing {products.length} active</span>
                        </h4>

                        <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                          {products.map(p => (
                            <div key={p.id} className="bg-zinc-950/70 border border-zinc-850/50 hover:border-zinc-800 p-3 rounded-xl flex items-center justify-between gap-4 transition">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="bg-zinc-900 w-10 h-10 rounded-lg flex items-center justify-center text-xl border border-zinc-850 shrink-0">{p.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  {editingProductId === p.id ? (
                                    <div className="flex flex-col gap-2 mt-0.5 w-full">
                                      <div className="flex items-center gap-1.5 w-full">
                                        <span className="text-[9px] uppercase font-bold text-zinc-500 w-12 shrink-0 font-display">Title:</span>
                                        <input 
                                          type="text"
                                          value={editingProductName}
                                          onChange={(e) => setEditingProductName(e.target.value)}
                                          className="bg-zinc-900 border border-zinc-800 p-1 px-2.5 rounded text-xs font-display text-white focus:outline-none focus:border-red-500 flex-1"
                                          placeholder="Product name"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1.5 w-full">
                                        <span className="text-[9px] uppercase font-bold text-zinc-500 w-12 shrink-0 font-display">Price:</span>
                                        <input 
                                          type="number"
                                          value={editingProductPrice}
                                          onChange={(e) => setEditingProductPrice(e.target.value)}
                                          className="bg-zinc-900 border border-zinc-800 p-1 px-2.5 rounded font-mono text-[11px] text-amber-500 focus:outline-none focus:border-red-500 w-24 shrink-0"
                                          placeholder="Price ₱"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1.5 w-full">
                                        <span className="text-[9px] uppercase font-bold text-zinc-500 w-12 shrink-0 font-display">Category:</span>
                                        <select 
                                          value={editingProductCategory}
                                          onChange={(e) => setEditingProductCategory(e.target.value)}
                                          className="bg-zinc-900 border border-zinc-800 p-1 px-2.5 rounded text-xs text-zinc-200 outline-none focus:outline-none focus:border-red-500 flex-1 cursor-pointer"
                                        >
                                          {dynamicCategories.map(cat => (
                                            <option key={cat} value={cat}>
                                              {cat}
                                            </option>
                                          ))}
                                        </select>
                                        <div className="flex gap-1.5 ml-auto shrink-0">
                                          <button 
                                            onClick={() => handleUpdateProduct(p.id)}
                                            title="Save updates"
                                            className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 hover:scale-105 active:scale-95 transition cursor-pointer"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button 
                                            onClick={() => setEditingProductId(null)}
                                            title="Cancel action"
                                            className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-750 hover:scale-105 active:scale-95 transition cursor-pointer"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <h6 className="text-xs font-display font-medium uppercase tracking-wide text-zinc-200">{p.name}</h6>
                                      <span className="text-[10px] font-mono text-zinc-550 block mt-0.5 flex items-center gap-2">
                                        <span className="text-amber-500 font-bold">₱{p.price}</span>
                                        <span className="text-[9px] font-display uppercase font-semibold text-zinc-500 bg-zinc-950/60 border border-zinc-850 px-1.5 py-0.5 rounded">
                                          {p.category}
                                        </span>
                                        <button 
                                          onClick={() => { 
                                            setEditingProductId(p.id); 
                                            setEditingProductName(p.name);
                                            setEditingProductPrice(p.price.toString()); 
                                            setEditingProductCategory(p.category || 'Meals');
                                          }}
                                          className="text-[9px] text-amber-500 hover:underline uppercase flex items-center gap-0.5 ml-1"
                                        >
                                          <Edit className="w-2.5 h-2.5" /> Edit
                                        </button>
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <button 
                                onClick={() => triggerDeactivateProduct(p)}
                                title="Deactivate/Erase product"
                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg border border-red-500/10 transition active:scale-95 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* D. CASHIER: PERSONAL SHIFT PROFILE */}
                {activeTab === 'myshift' && currentRole === 'cashier' && (
                  <div className="flex flex-col gap-6">
                    <header>
                      <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                        Cashier <span className="text-red-500">Shift</span>
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Session Active Since {new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })}
                      </p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <article className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 text-[10px] uppercase font-display font-bold tracking-widest block mb-1">💰 Today&apos;s Sales</span>
                          <div className="text-3xl font-mono font-bold text-amber-500">₱{analyticsData.revenue.toLocaleString()}</div>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-4 uppercase tracking-wider">Processed through your cashier credentials</p>
                      </article>

                      <article className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 text-[10px] uppercase font-display font-bold tracking-widest block mb-1">🧾 Transaction Count</span>
                          <div className="text-3xl font-mono font-bold text-white">{analyticsData.totalOrders}</div>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-4 uppercase tracking-wider">Orders finalized today</p>
                      </article>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                      <h4 className="text-xs uppercase font-display font-extrabold tracking-widest text-zinc-300 border-b border-zinc-850 pb-3 mb-4">
                        Shift Order Log (Today)
                      </h4>

                      {allOrders.length === 0 ? (
                        <p className="text-xs text-zinc-505 font-display uppercase tracking-wider text-center py-12">No sales logged during your shift today.</p>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                          {allOrders.map((ord, idx) => {
                            const dateObj = new Date(ord.created_at);
                            const tStr = dateObj.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={idx} className="bg-zinc-950 p-3.5 rounded-xl flex items-center justify-between border border-zinc-850 gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold text-xs text-white">#{ord.order_number}</span>
                                    <span className="text-[8px] uppercase tracking-wider font-mono bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 text-zinc-400 rounded">{ord.payment_method}</span>
                                    <span className="text-[8px] uppercase tracking-wider font-mono bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 text-emerald-400 rounded font-semibold flex items-center gap-1 shadow-sm leading-none">
                                      <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" /> PAID
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 mt-1 uppercase line-clamp-1">{ord.items.join(', ')}</p>
                                </div>
                                <div className="text-right flex items-center gap-3.5 flex-none">
                                  <div>
                                    <span className="font-mono font-bold text-amber-550 block text-xs">₱{ord.total}</span>
                                    <span className="text-[9px] font-mono text-zinc-600 mt-0.5 block">{tStr}</span>
                                  </div>
                                  <button
                                    onClick={() => triggerVoidRequest(ord)}
                                    title="Authorize Void for this Transaction"
                                    className="p-1.5 px-3 bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/60 text-zinc-400 hover:text-red-400 rounded-lg text-[9px] uppercase tracking-widest font-bold transition flex items-center gap-1 active:scale-95 duration-200"
                                  >
                                    <AlertTriangle className="w-3 h-3 text-zinc-500 hover:text-red-400" /> Void
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* E. ADMIN: CASHIER SHIFTS & BRANCHES */}
                {activeTab === 'shifts' && currentRole === 'admin' && (
                  <div className="flex flex-col gap-6">
                    <header>
                      <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                        Cashier <span className="text-red-500">Shifts</span> & Branches
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                        A list of shift records with beginning balances and branch assignments
                      </p>
                    </header>

                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                      <h4 className="text-xs uppercase font-display font-bold tracking-widest text-zinc-300 border-b border-zinc-850 pb-3 mb-4 flex justify-between items-center">
                        <span>📋 Shifts Historical Log</span>
                        <span className="text-[10px] font-mono text-zinc-650 uppercase">showing {shifts.length} registers entries</span>
                      </h4>

                      {shifts.length === 0 ? (
                        <p className="text-xs text-zinc-505 font-display uppercase tracking-wider text-center py-12">No historical cashier shifts logged.</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {shifts.map((sh, idx) => {
                            const loginStr = new Date(sh.login_time).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
                            const logoutStr = sh.logout_time 
                              ? new Date(sh.logout_time).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) 
                              : null;
                            return (
                              <div key={idx} className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">👤 {sh.cashier_name}</span>
                                    <span className="text-[9px] font-mono tracking-widest bg-red-950/40 text-red-400 border border-red-900/40 px-2 rounded-full uppercase">{sh.branch}</span>
                                    {sh.logout_time ? (
                                      <span className="text-[8px] font-mono tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-805 px-1.5 py-0.5 rounded uppercase">Logged Out</span>
                                    ) : (
                                      <span className="text-[8px] font-mono tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded uppercase font-bold animate-pulse">● Active Session</span>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1 font-mono text-[10px] text-zinc-400">
                                    <div>
                                      <span className="text-zinc-500 uppercase tracking-wide mr-1 font-semibold font-display">🕒 Logged In:</span>
                                      <span className="text-zinc-300 font-semibold">{loginStr}</span>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500 uppercase tracking-wide mr-1 font-semibold font-display">🚪 Logged Out:</span>
                                      {logoutStr ? (
                                        <span className="text-zinc-300 font-semibold">{logoutStr}</span>
                                      ) : (
                                        <span className="text-emerald-400 font-bold uppercase tracking-wider">Still Logged In / Terminal Active</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-right flex-none">
                                  <div>
                                    <span className="text-[9px] text-zinc-500 block uppercase font-bold font-display">Beginning Bal</span>
                                    <span className="text-xs font-mono font-bold text-zinc-300">₱{sh.beginning_balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-amber-500 block uppercase font-bold font-mono">Shift Sales</span>
                                    <span className="text-xs font-mono font-bold text-amber-500">₱{(sh.total_sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* F. ADMIN: STAFF SETTINGS ACCOUNT REGISTRAR */}
                {activeTab === 'staff' && currentRole === 'admin' && (
                  <div className="flex flex-col gap-6">
                    <header>
                      <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                        Staff <span className="text-red-500">Credentials</span> & Security
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                        Configure roles, add cashier registers, or update access PIN passwords
                      </p>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* ADD STAFF ACCOUNT WRAPPER */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                        <h4 className="text-xs font-display font-extrabold uppercase tracking-widest text-amber-500 border-b border-zinc-850 pb-2 mb-1">
                          REGISTER NEW STAFF ACCOUNT
                        </h4>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Staff Nickname / Username</label>
                          <input 
                            type="text" 
                            placeholder="e.g. maria" 
                            value={newStaffUsername}
                            onChange={(e) => setNewStaffUsername(e.target.value)}
                            className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-display text-zinc-200 placeholder-zinc-700 outline-none focus:border-red-500 transition"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Access PIN (Number)</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 5678" 
                              value={newStaffPassword}
                              onChange={(e) => setNewStaffPassword(e.target.value)}
                              className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-mono text-zinc-200 placeholder-zinc-700 outline-none focus:border-red-555 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Assigned Role</label>
                            <select
                              value={newStaffRole}
                              onChange={(e) => setNewStaffRole(e.target.value as 'cashier' | 'admin')}
                              className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-200 outline-none cursor-pointer"
                            >
                              <option value="cashier">CASHIER</option>
                              <option value="admin">MANAGER / ADMIN</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Assigned Branch</label>
                          <select
                            value={newStaffBranch}
                            onChange={(e) => { handleTactileClick(); setNewStaffBranch(e.target.value); }}
                            className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-200 outline-none cursor-pointer"
                          >
                            {branches.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>

                        <button 
                          onClick={handleAddStaffUser}
                          className="mt-2 w-full bg-red-650 hover:bg-red-700 text-xs font-display font-bold text-white p-3 rounded-xl transition uppercase tracking-wider shadow-lg shadow-red-600/10 active:scale-95 cursor-pointer"
                        >
                          ➕ Register Account Profile
                        </button>
                      </div>

                      {/* PASSWORD PIN CHANGER */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                        <h4 className="text-xs font-display font-extrabold uppercase tracking-widest text-amber-500 border-b border-zinc-850 pb-2 mb-1">
                          UPDATE STAFF PIN & BRANCH
                        </h4>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Select Account Profile</label>
                          <select
                            value={passwordChangeUser}
                            onChange={(e) => {
                              const username = e.target.value;
                              setPasswordChangeUser(username);
                              const found = users.find(u => u.username === username);
                              if (found) {
                                setPasswordChangeNew(found.password || '');
                                setPasswordChangeBranch(found.branch || 'Main Branch');
                              } else {
                                setPasswordChangeNew('');
                                setPasswordChangeBranch('Main Branch');
                              }
                            }}
                            className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-200 outline-none cursor-pointer"
                          >
                            <option value="">-- Choose Profile --</option>
                            {users.map(u => (
                              <option key={u.username} value={u.username}>
                                👤 {u.username.toUpperCase()} ({u.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">PIN Code</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 4321" 
                            value={passwordChangeNew}
                            onChange={(e) => setPasswordChangeNew(e.target.value)}
                            className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-mono text-zinc-200 placeholder-zinc-700 outline-none focus:border-red-500 transition"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Update Assigned Branch</label>
                          <select
                            value={passwordChangeBranch}
                            onChange={(e) => { handleTactileClick(); setPasswordChangeBranch(e.target.value); }}
                            className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-200 outline-none cursor-pointer"
                          >
                            {branches.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>

                        <button 
                          onClick={handleChangeStaffPassword}
                          className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-xs font-display font-bold text-white p-3 rounded-xl transition uppercase tracking-wider shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer"
                        >
                          🔐 Update Access Profile Settings
                        </button>
                      </div>

                      {/* BRANCH MANAGEMENT CARD */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                        <h4 className="text-xs font-display font-extrabold uppercase tracking-widest text-red-500 border-b border-zinc-850 pb-2 mb-1">
                          🏢 ACTIVE BRANCH STATIONS REGISTRY
                        </h4>
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wide">
                          Dynamically add or retire company branches. These populate shift setups & staff credentials config.
                        </p>

                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="e.g. Mambaling Outpost" 
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            className="flex-1 bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-display text-zinc-200 placeholder-zinc-700 outline-none focus:border-red-500 transition"
                          />
                          <button
                            onClick={() => { handleTactileClick(); handleCreateBranch(); }}
                            className="bg-red-650 hover:bg-red-700 text-[10px] font-display font-bold text-white px-4 rounded-xl transition uppercase tracking-wider cursor-pointer"
                          >
                            ➕ Add
                          </button>
                        </div>

                        <div className="flex flex-col gap-1.5 mt-2">
                          <label className="text-[10px] font-display uppercase tracking-wider text-zinc-550 font-semibold mb-1">Configured Outlet Branches ({branches.length})</label>
                          <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                            {branches.map(b => (
                              <div key={b} className="flex items-center justify-between bg-zinc-950 border border-zinc-850 px-3 py-2 rounded-xl">
                                <span className="text-xs text-zinc-300 font-display font-medium">🏢 {b}</span>
                                {b !== 'Main Branch' ? (
                                  <div className="flex items-center gap-1.5">
                                    {confirmingDeleteBranch === b ? (
                                      <>
                                        <button
                                          onClick={() => {
                                            handleTactileClick();
                                            handleDeleteBranch(b);
                                          }}
                                          className="p-1 px-2 text-[8px] font-display font-bold uppercase tracking-wider text-white bg-red-650 hover:bg-red-700 rounded-lg transition-all cursor-pointer"
                                        >
                                          Confirm Delete?
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleTactileClick();
                                            setConfirmingDeleteBranch(null);
                                          }}
                                          className="p-1 px-2 text-[8px] font-display font-semibold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition-all cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          handleTactileClick();
                                          setConfirmingDeleteBranch(b);
                                        }}
                                        className="p-1 px-2.5 text-[9px] font-display font-bold uppercase tracking-wider text-red-500 hover:text-white border border-red-955 hover:bg-red-950/40 rounded-lg transition-all cursor-pointer"
                                        title="Retire/Delete Branch Outlet"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-mono tracking-widest text-zinc-650 bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded">
                                    CORE SYSTEM
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* CURRENT REGISTERED STAFF SUMMARY PANEL */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl col-span-1 lg:col-span-2">
                        <h4 className="text-xs uppercase font-display font-extrabold tracking-widest text-zinc-300 border-b border-zinc-850 pb-3 mb-4">
                          Registered Staff Members Database List
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {users.map((item, idx) => (
                            <article key={idx} className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs">👤</span>
                                <div>
                                  <span className="text-xs font-bold text-white block uppercase tracking-wide">{item.username}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-550">{item.role}</span>
                                    <span className="text-[8px] uppercase tracking-wide font-mono bg-red-950/25 text-red-400 border border-red-900/40 px-1 rounded-sm">
                                      🏢 {item.branch || 'Main Branch'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono text-xs text-amber-500 bg-amber-950/20 px-2 py-0.5 border border-amber-900/30 rounded">PIN: {item.password}</span>
                            </article>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* G. EXPENSES LEDGER TRACKER */}
                {activeTab === 'expenses' && (
                  <div className="flex flex-col gap-6">
                    <header>
                      <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                        Expenses <span className="text-red-500">Ledger</span> Panel
                      </h2>
                      <p className="text-xs text-zinc-505 mt-1 uppercase tracking-wider">
                        Log ingredients, store purchases, repairs or utility costs incurred
                      </p>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      
                      {/* LOG EXPENSE FORM (Cashiers can log, admins can also check) */}
                      {currentRole === 'cashier' ? (
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                          <h4 className="text-xs font-display font-extrabold uppercase tracking-widest text-amber-500 border-b border-zinc-850 pb-2 mb-1 font-bold">
                            LOG CASHIER EXPENSE
                          </h4>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Expense Bought Item Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Rice Sacks, Cooking Oil" 
                              value={newExpenseName}
                              onChange={(e) => setNewExpenseName(e.target.value)}
                              className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-display text-zinc-200 placeholder-zinc-700 outline-none focus:border-red-550 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Amount Cost Price (₱)</label>
                            <input 
                              type="number" 
                              placeholder="e.g. 2500" 
                              value={newExpenseCost}
                              onChange={(e) => setNewExpenseCost(e.target.value)}
                              className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-mono text-zinc-200 placeholder-zinc-700 outline-none focus:border-red-550 transition"
                            />
                          </div>

                          <button 
                            onClick={handleAddExpense}
                            className="mt-2 w-full bg-red-650 hover:bg-red-700 text-xs font-display font-bold text-white p-3 rounded-xl transition uppercase tracking-wider shadow-lg shadow-red-600/10 active:scale-95 cursor-pointer"
                          >
                            ➕ Submit Expense Cost
                          </button>
                        </div>
                      ) : (
                        <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl flex flex-col gap-2 text-center py-10">
                          <span className="text-2xl">📊</span>
                          <span className="text-xs uppercase font-display font-bold text-zinc-300">ADMIN CONTROL</span>
                          <p className="text-[10px] uppercase text-zinc-500 max-w-[180px] leading-relaxed mx-auto font-light">Cashiers log active grocery costs directly inside cashier terminals</p>
                        </div>
                      )}

                      {/* DISPLAY EXPENSES LEDGER FEED */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl col-span-1 lg:col-span-2 flex flex-col gap-3">
                        <h4 className="text-xs uppercase font-display font-extrabold tracking-widest text-zinc-300 border-b border-zinc-850 pb-3 mb-2 flex justify-between items-center">
                          <span>📋 Shift Expenses History Ledger</span>
                          <span className="text-[10px] font-mono font-medium text-zinc-650 uppercase">Total Logged: {expenses.length} costs</span>
                        </h4>

                        {expenses.length === 0 ? (
                          <p className="text-xs text-zinc-505 font-display uppercase tracking-wider text-center py-12">No expenses logged yet in this period.</p>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                            {expenses.map((exp, idx) => {
                              const expDate = new Date(exp.created_at || new Date()).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' });
                              return (
                                <article key={idx} className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl flex items-center justify-between">
                                  <div>
                                    <span className="text-xs font-bold text-zinc-300 block uppercase tracking-wide">{exp.product_name}</span>
                                    <span className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase block">
                                      Logged by {exp.cashier_name} @ {exp.branch || 'Main Branch'} · {expDate}
                                    </span>
                                  </div>
                                  <span className="font-mono text-xs font-bold text-red-400 bg-red-950/20 border border-red-955 px-2.5 py-1 rounded">₱{exp.cost}</span>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* GLOBAL DEVELOPER CORE CONTROLS */}
                {activeTab === 'developer' && isDeveloperMode && (
                  <div className="flex flex-col gap-6 animate-fade-in text-zinc-100">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                      <div>
                        <h2 className="text-2xl font-display font-black uppercase text-indigo-400 tracking-tight flex items-center gap-2">
                          ⚙️ Developer <span className="text-white">Core Control</span> Center
                        </h2>
                        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-semibold">
                          Licensing, Scale Limits, Device Authentication and System Seeding Diagnostics Suite
                        </p>
                      </div>
                      <span className="text-[10px] font-mono tracking-widest bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-3 py-1.5 rounded-full uppercase font-bold animate-pulse">
                        ● Host Agent Secure Connected
                      </span>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* CARD 1: SaaS SUBSCRIPTION ACTIVATION RANGE */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                          <h3 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-400" /> SaaS Premium Subscription Dates
                          </h3>
                          {isSubscriptionValid ? (
                            <span className="text-[9px] font-mono tracking-wide bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2.5 py-0.5 rounded uppercase font-bold">
                              Paid License: Active
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono tracking-wide bg-red-950/40 text-red-500 border border-red-900/40 px-2.5 py-0.5 rounded uppercase font-bold animate-pulse">
                              Subscription Expired / Suspended
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-zinc-500 leading-relaxed font-display uppercase tracking-wide">
                          Configure the exact date bracket during which the client’s software is considered paid and operating under a legitimate license. Outside this bracket, the app will suspend operations gracefully.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Active Since (From)</label>
                            <input 
                              type="date" 
                              value={subStart}
                              onChange={(e) => setSubStart(e.target.value)}
                              className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl text-xs font-mono text-zinc-200 outline-none hover:border-zinc-800 transition focus:border-indigo-800 cursor-pointer"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Active Thru (To)</label>
                            <input 
                              type="date" 
                              value={subEnd}
                              onChange={(e) => setSubEnd(e.target.value)}
                              className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl text-xs font-mono text-zinc-200 outline-none hover:border-zinc-800 transition focus:border-indigo-800 cursor-pointer"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={handleSaveSubDates}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs font-display font-medium text-white p-3 rounded-xl transition uppercase tracking-wider font-bold shadow-lg shadow-indigo-600/10 cursor-pointer"
                        >
                          💾 Save Subscription Range Dates
                        </button>
                      </div>

                      {/* CARD 2: SCALE CONSTRAINT CONTROL */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                          <h3 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Grid className="w-4 h-4 text-indigo-400" /> License Scale Limits & Restrictions
                          </h3>
                        </div>

                        <p className="text-xs text-zinc-500 leading-relaxed font-display uppercase tracking-wide">
                          Limit how many branch outlets the subscriber is allowed to establish and how many devices/browsers can run the register software simultaneously under this tier.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Max Branches Allowed</label>
                            <input 
                              type="number" 
                              value={maxBranches}
                              onChange={(e) => setMaxBranches(parseInt(e.target.value) || 1)}
                              className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl text-xs font-mono text-zinc-200 outline-none hover:border-zinc-800 transition focus:border-indigo-800"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Max Devices Allowed</label>
                            <input 
                              type="number" 
                              value={maxDevices}
                              onChange={(e) => setMaxDevices(parseInt(e.target.value) || 1)}
                              className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl text-xs font-mono text-zinc-200 outline-none hover:border-zinc-800 transition focus:border-indigo-800"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={handleSaveRestrictions}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs font-display font-medium text-white p-3 rounded-xl transition uppercase tracking-wider font-bold shadow-lg shadow-indigo-600/10 cursor-pointer"
                        >
                          💾 Save Restrictions Config
                        </button>
                      </div>

                      {/* CARD 3: DEVICE DIRECTORY LISTENING */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                          <h3 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-indigo-400" /> Terminal Registry Directory ({registeredDevices.length} / {maxDevices})
                          </h3>
                        </div>

                        <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <span className="text-[8px] font-mono tracking-wider bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded uppercase font-sans font-bold mr-1.5">CURRENT REGISTER ID</span>
                            <span className="font-mono text-xs font-bold text-zinc-300">{myDeviceId}</span>
                          </div>
                          <span className="text-[10px] text-indigo-400 font-display font-semibold animate-pulse uppercase tracking-wider shrink-0 flex items-center gap-1">● Console Connected</span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-display uppercase tracking-wider text-zinc-550 font-semibold">Devices Database Registry Table</label>
                          <div className="max-h-28 overflow-y-auto bg-zinc-950 border border-zinc-850 rounded-xl divide-y divide-zinc-850 flex flex-col">
                            {registeredDevices.length === 0 ? (
                              <p className="text-xs text-zinc-550 p-3 text-center font-display">No authorized registers saved.</p>
                            ) : (
                              registeredDevices.map((dev, idx) => (
                                <div key={idx} className="p-2.5 flex items-center justify-between font-mono text-[10px]">
                                  <span className="text-zinc-300">📱 STATION-{idx+1}: {dev}</span>
                                  {dev === myDeviceId ? (
                                    <span className="text-[8px] text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 px-1.5 py-0.5 rounded uppercase font-sans font-semibold">Selected Station</span>
                                  ) : (
                                    <span className="text-[8px] text-zinc-500 uppercase font-sans">Remote Terminal Node</span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={handleResetDeviceDirectory}
                          className="w-full bg-red-950/15 hover:bg-red-900/15 text-xs font-display font-bold text-red-400 p-2.5 rounded-xl border border-red-900/30 transition uppercase tracking-wider font-bold cursor-pointer"
                        >
                          🔄 Purge Register Devices Registry
                        </button>
                      </div>

                      {/* CARD 5: CUSTOM BRANDING & SCALE LIMITS */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                          <h3 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Settings className="w-4 h-4 text-indigo-400" /> Custom Branding & Scale Limits
                          </h3>
                        </div>

                        <p className="text-xs text-zinc-500 leading-relaxed font-display uppercase tracking-wide">
                          Rebrand the Point of Sale with a custom name and enforce a maximum product limit allowed on menus.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Custom POS Brand Name</label>
                            <input 
                              type="text" 
                              value={posName}
                              onChange={(e) => {
                                const newName = e.target.value;
                                setPosName(newName);
                                localStorage.setItem('br_pos_name', newName);
                              }}
                              placeholder="e.g. Boss Rice"
                              className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl text-xs font-sans text-zinc-200 outline-none hover:border-zinc-800 transition focus:border-indigo-800"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Max Menu Items Allowed</label>
                            <input 
                              type="number" 
                              value={maxProducts}
                              onChange={(e) => {
                                const num = parseInt(e.target.value) || 1;
                                setMaxProducts(num);
                                localStorage.setItem('br_sub_max_products', num.toString());
                              }}
                              className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl text-xs font-mono text-zinc-200 outline-none hover:border-zinc-800 transition focus:border-indigo-800"
                            />
                          </div>
                        </div>
                      </div>

                      {/* CARD 6: VISUAL ENVIRONMENT THEME ACCENTS */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                          <h3 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Palette className="w-4 h-4 text-indigo-400" /> Visual Palette Theme Accent
                          </h3>
                        </div>

                        <p className="text-xs text-zinc-500 leading-relaxed font-display uppercase tracking-wide">
                          Select the default brand identity accent palette across both cashier and admin panels.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {[
                            { id: 'classic-red', name: 'Classic Red', bg: 'bg-red-600' },
                            { id: 'ocean-blue', name: 'Ocean Blue', bg: 'bg-cyan-500' },
                            { id: 'emerald-zen', name: 'Emerald Zen', bg: 'bg-emerald-500' },
                            { id: 'lux-gold', name: 'Lux Gold', bg: 'bg-amber-500' },
                            { id: 'cyber-purple', name: 'Cyber Purple', bg: 'bg-fuchsia-605' },
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setCurrentTheme(t.id);
                                localStorage.setItem('br_theme', t.id);
                                showNotification(`🎨 Theme switched to ${t.name}!`);
                                if (audioEnabled) playSound('click');
                              }}
                              className={`p-2.5 rounded-xl border font-display text-[10px] uppercase font-semibold tracking-wider flex items-center gap-2 transition-all ${
                                currentTheme === t.id
                                  ? 'bg-zinc-800 text-white border-indigo-500 shadow-md'
                                  : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:border-zinc-700'
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${t.bg} shrink-0`} />
                              <span className="truncate">{t.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* CARD 7: SYSTEM CLOCK FORMAT AND OFFSET */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                          <h3 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-400" /> Systems Time settings
                          </h3>
                        </div>

                        <p className="text-xs text-zinc-500 leading-relaxed font-display uppercase tracking-wide">
                          Configure shift register display format. Adjust UTC offset hours to align timezone timestamps.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Clock Format</label>
                            <select 
                              value={timeFormat}
                              onChange={(e) => {
                                const fmt = e.target.value as '12h' | '24h';
                                setTimeFormat(fmt);
                                localStorage.setItem('br_time_format', fmt);
                              }}
                              className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-sans text-zinc-200 outline-none hover:border-zinc-800 transition focus:border-indigo-800 cursor-pointer"
                            >
                              <option value="12h">12-Hour AM/PM</option>
                              <option value="24h">24-Hour Military</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Hour Shift Offset</label>
                            <input 
                              type="number" 
                              value={timeOffsetHours}
                              onChange={(e) => {
                                const offset = parseInt(e.target.value) || 0;
                                setTimeOffsetHours(offset);
                                localStorage.setItem('br_time_offset', offset.toString());
                              }}
                              className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-mono text-zinc-200 outline-none hover:border-zinc-800 transition focus:border-indigo-800"
                              placeholder="e.g. 0"
                            />
                          </div>
                        </div>

                        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between font-mono text-[10px]">
                          <span className="text-zinc-[500] font-display font-bold uppercase tracking-wider text-[8px]">Display Clock Preview:</span>
                          <span className="text-indigo-400 font-semibold animate-pulse">{currentTime}</span>
                        </div>
                      </div>

                      {/* CARD 8: LICENSE FEATURE MODULE GATE CONTROLS */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                          <h3 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <ToggleLeft className="w-4 h-4 text-indigo-400" /> Modular Subscribed Toggles
                          </h3>
                        </div>

                        <p className="text-xs text-zinc-500 leading-relaxed font-display uppercase tracking-wide">
                          Enable/disable core system modules. Gated features will be locked and hidden from both the cashier register and manager layouts.
                        </p>

                        <div className="flex flex-col gap-2">
                          {[
                            { key: 'inventory', name: 'Stock & Inventory Modules', desc: 'Hides/unhides Stock and delivery logistics' },
                            { key: 'expenses', name: 'Branch Expenses Ledger', desc: 'Hides/unhides cash drawer expense logs' },
                            { key: 'shifts', name: 'Shifts & Branches Logs', desc: 'Hides/unhides branch registrations' },
                            { key: 'reports', name: 'Sales Revenue analytics', desc: 'Hides/unhides spreadsheets and financial charts' },
                            { key: 'products', name: 'Products Menu Editor', desc: 'Hides/unhides managers product customizer' }
                          ].map((gate) => {
                            const isActive2 = enabledTabs[gate.key as keyof typeof enabledTabs];
                            return (
                              <div key={gate.key} className="flex items-center justify-between p-2 bg-zinc-950 border border-zinc-850 rounded-xl hover:border-zinc-800 transition">
                                <div>
                                  <span className="text-[10px] font-bold text-zinc-200 block uppercase tracking-wide leading-none">{gate.name}</span>
                                  <span className="text-[8px] text-zinc-500 block uppercase font-sans mt-0.5">{gate.desc}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = { ...enabledTabs, [gate.key]: !isActive2 };
                                    setEnabledTabs(next);
                                    localStorage.setItem('br_enabled_tabs', JSON.stringify(next));
                                    showNotification(`${isActive2 ? '🚫 Locked' : '✅ Unlocked'} Module: ${gate.name}`);
                                    if (audioEnabled) playSound('click');
                                  }}
                                  className={`p-1 px-3.5 text-[8px] uppercase tracking-wide font-extrabold rounded-lg border transition ${
                                    isActive2 
                                      ? 'bg-indigo-950/40 text-indigo-400 border-indigo-900/40 hover:bg-indigo-900/20' 
                                      : 'bg-zinc-900 text-zinc-500 border-zinc-850 hover:bg-zinc-800'
                                  }`}
                                >
                                  {isActive2 ? 'ACTIVE' : 'LOCKED'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* CARD 4: CORE DIAGNOSTICS & SYSTEM RESET */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                          <h3 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Database className="w-4 h-4 text-indigo-400" /> Diagnostics & Core Recovery Tools
                          </h3>
                        </div>

                        <p className="text-xs text-zinc-505 leading-relaxed font-display uppercase tracking-wide text-zinc-500">
                          Use these options to simulate a complete offline local storage recovery or to seed clean datasets for demo scenarios. Be extremely careful; this wipes existing sales cache completely.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => {
                              // Seeding sample transaction historical dataset
                              const sampleTxs: InventoryTransaction[] = [
                                {
                                  id: 'tx-sample1',
                                  itemName: 'Wagyu Beef Overload Rice',
                                  qty: 15,
                                  variant: 'Regular Pack',
                                  cost: 1500,
                                  type: 'stock-in',
                                  status: 'completed',
                                  destinationBranch: 'Main Branch',
                                  deliveryDate: new Date().toISOString(),
                                  arrivalDate: new Date().toISOString(),
                                  performedBy: 'SysDev'
                                },
                                {
                                  id: 'tx-sample2',
                                  itemName: 'Original Sisig Rice Meal',
                                  qty: 40,
                                  variant: 'Box Pack',
                                  cost: 2400,
                                  type: 'stock-out',
                                  status: 'completed',
                                  destinationBranch: 'Main Branch',
                                  deliveryDate: new Date().toISOString(),
                                  arrivalDate: new Date().toISOString(),
                                  performedBy: 'SysDev',
                                  reason: 'Ingredient Spoiled / Damaged'
                                }
                              ];
                              setInventoryTransactions(sampleTxs);
                              localStorage.setItem('br_inventory_transactions', JSON.stringify(sampleTxs));
                              showNotification('Success: Seeded demo stock-in and stock-out logs!');
                              if (audioEnabled) playSound('success');
                            }}
                            className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-display font-extrabold uppercase py-3 rounded-xl text-zinc-300 tracking-wider cursor-pointer transition active:scale-95 text-center"
                          >
                            ⭐ Seed Inventory Demo
                          </button>
                          
                          <button 
                            onClick={handleDevNukeDb}
                            className="bg-red-950/40 hover:bg-red-900/30 border border-red-900/30 text-[10px] font-display font-extrabold uppercase py-3 rounded-xl text-red-400 tracking-wider cursor-pointer transition active:scale-95 text-center"
                          >
                            💀 WIPE POS LOCALSTORAGE
                          </button>
                        </div>

                        <div className="flex-1 bg-zinc-950 border border-zinc-850 p-3 rounded-xl flex flex-col font-mono text-[9px] text-zinc-550 overflow-y-auto max-h-24 divide-y divide-zinc-900 gap-1 select-all">
                          <div className="pb-1">[DIAG]: Connected source terminal agent active.</div>
                          <div className="py-1">[DIAG]: Active Subscription validity: {subStart} to {subEnd}</div>
                          <div className="py-1">[DIAG]: Config constraints: max {maxBranches} branches, max {maxDevices} devices</div>
                          <div className="pt-1">[DIAG]: Terminal license key verification: OK.</div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* INVENTORY SYSTEM PANEL */}
                {activeTab === 'inventory' && (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                          Inventory <span className="text-red-500">System</span> Control
                        </h2>
                        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                          Admin logs warehouse deliveries & cashiers confirm arrival to tag branch stock
                        </p>
                      </div>

                      {/* Search and filter controls */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                          <input 
                            type="text" 
                            placeholder="Search stock..." 
                            value={inventorySearchQuery}
                            onChange={(e) => setInventorySearchQuery(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-200 placeholder-zinc-650 outline-none focus:border-red-500 transition"
                          />
                        </div>

                        <select
                          value={inventoryBranchFilter}
                          onChange={(e) => setInventoryBranchFilter(e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-zinc-300 outline-none focus:border-red-500 cursor-pointer"
                        >
                          <option value="All">All Branches</option>
                          {branches.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </header>

                    {/* SUB-TABS SELECTOR FOR INVENTORY */}
                    <div className="flex border-b border-zinc-850 gap-2 pb-px select-none">
                      {/* Received tab (Visible to both Cashier & Admin) */}
                      <button
                        onClick={() => { handleTactileClick(); setActiveInventoryTab('received'); }}
                        className={`px-4 py-2.5 text-xs font-display font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                          activeInventoryTab === 'received' 
                            ? 'border-red-600 text-white' 
                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        🚚 Received & Pending Stock ({inventoryTransactions.filter(tx => tx.type === 'stock-in').length})
                      </button>

                      {/* Stock-In tab (Admin ONLY) */}
                      {currentRole === 'admin' && (
                        <button
                          onClick={() => { handleTactileClick(); setActiveInventoryTab('stock-in'); }}
                          className={`px-4 py-2.5 text-xs font-display font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                            activeInventoryTab === 'stock-in' 
                              ? 'border-red-600 text-white' 
                              : 'border-transparent text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          📥 Tag Warehouse Stock (Admin Only)
                        </button>
                      )}

                      {/* Stock-Out tab (Both Role - as cashier only has a stock out tab in inventory menu) */}
                      <button
                        onClick={() => { handleTactileClick(); setActiveInventoryTab('stock-out'); }}
                        className={`px-4 py-2.5 text-xs font-display font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                          activeInventoryTab === 'stock-out' 
                            ? 'border-red-600 text-white' 
                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        📤 Stock Out Outflow Register
                      </button>
                    </div>

                    {/* MAIN INVENTORY SUB-VIEWS DISPLAY */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                      
                      {/* COLUMN 1 & 2: TABLES / TRANS LOGS */}
                      <div className="xl:col-span-2 flex flex-col gap-6">
                        
                        {/* A. ACTIVE INVENTORY BALANCE SUMMARY CARD */}
                        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                          <h4 className="text-xs uppercase font-display font-extrabold tracking-widest text-amber-500 border-b border-zinc-850 pb-3 mb-4 flex justify-between items-center font-bold">
                            <span>📦 Active Branch Store Stock Summary</span>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Items With stock markers</span>
                          </h4>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-zinc-400 select-none">
                              <thead>
                                <tr className="border-b border-zinc-850 text-zinc-500 text-[10px] uppercase font-display font-bold tracking-wider">
                                  <th className="pb-3 pl-2">Stock Item Name</th>
                                  <th className="pb-3">Type Variant</th>
                                  <th className="pb-3 text-center">In-Store Stock Level</th>
                                  <th className="pb-3 text-right">Unit cost</th>
                                  <th className="pb-3 text-right pr-2">Total Value (PHP)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stockLevels
                                  .filter(lvl => {
                                    if (inventorySearchQuery) {
                                      const sMatch = lvl.itemName.toLowerCase().includes(inventorySearchQuery.toLowerCase()) || 
                                                     lvl.variant.toLowerCase().includes(inventorySearchQuery.toLowerCase());
                                      if (!sMatch) return false;
                                    }
                                    if (inventoryBranchFilter !== 'All') {
                                      if (lvl.branch !== inventoryBranchFilter) return false;
                                    }
                                    return true;
                                  })
                                  .map((lvl, index) => {
                                    const totalStockValue = lvl.qty * lvl.cost;
                                    return (
                                      <tr key={index} className="border-b border-zinc-850/60 hover:bg-zinc-950/30 transition-all font-display">
                                        <td className="py-3 pl-2 text-zinc-200 font-bold">{lvl.itemName}</td>
                                        <td className="py-3 font-mono text-zinc-500">{lvl.variant}</td>
                                        <td className="py-3 text-center">
                                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                                            lvl.qty === 0 
                                              ? 'bg-zinc-950 border border-zinc-850/50 text-zinc-650' 
                                              : lvl.qty <= 5 
                                              ? 'bg-amber-950/20 text-amber-500 border border-amber-900/30' 
                                              : 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30'
                                          }`}>
                                            {lvl.qty} pcs / bags
                                          </span>
                                        </td>
                                        <td className="py-3 text-right font-mono text-zinc-450">₱{lvl.cost.toLocaleString()}</td>
                                        <td className="py-3 text-right font-mono font-bold text-amber-500 pr-2">₱{totalStockValue.toLocaleString()}</td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* B. TRANSACTION HISTORY LOGS PANEL */}
                        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                          <h4 className="text-xs uppercase font-display font-extrabold tracking-widest text-zinc-400 border-b border-zinc-850 pb-3 mb-4 flex justify-between items-center font-bold">
                            <span>📋 Raw Logged Delivery & Disposal Ledger</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-zinc-500 mr-2">Total Logged: {inventoryTransactions.length} items</span>
                              {inventoryTransactions.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  {confirmingClearTransactions ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          handleTactileClick();
                                          handleClearAllInventoryTransactions();
                                        }}
                                        className="px-2 py-1 text-[8px] font-display font-bold uppercase tracking-wider text-white bg-red-650 hover:bg-red-700 rounded-lg transition-all cursor-pointer"
                                      >
                                        Yes, Clear Logs
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleTactileClick();
                                          setConfirmingClearTransactions(false);
                                        }}
                                        className="px-2 py-1 text-[8px] font-display font-semibold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition-all cursor-pointer"
                                      >
                                        No
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        handleTactileClick();
                                        setConfirmingClearTransactions(true);
                                      }}
                                      className="px-2.5 py-1 text-[9px] font-display font-bold uppercase tracking-wider text-red-500 border border-red-950 hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                                    >
                                      Delete All
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </h4>

                          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                            {inventoryTransactions
                              .filter(tx => {
                                if (inventorySearchQuery) {
                                  return tx.itemName.toLowerCase().includes(inventorySearchQuery.toLowerCase());
                                }
                                if (inventoryBranchFilter !== 'All') {
                                  return tx.destinationBranch === inventoryBranchFilter;
                                }
                                return true;
                              })
                              .map((tx) => {
                                const formattedDeliveryDate = new Date(tx.deliveryDate).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' });
                                const isPending = tx.status === 'pending-delivery';
                                const parsedMyBranch = myActiveShift?.branch || 'Main Branch';
                                // Cashier should capture delivery to their branch
                                const belongsToCashierBranch = tx.destinationBranch.toLowerCase() === parsedMyBranch.toLowerCase();

                                if (editingTxId === tx.id) {
                                  return (
                                    <article key={tx.id} className="bg-zinc-900 border-2 border-amber-500 p-4 rounded-xl flex flex-col gap-3 font-display">
                                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                        <span className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">📝 Edit Dispatch/Transaction</span>
                                        <span className="text-[9px] font-mono text-zinc-500">ID: {tx.id.substring(0, 8)}...</span>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Item Name */}
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9.5px] font-semibold text-zinc-400 uppercase tracking-wide">Item Name</label>
                                          <select 
                                            value={editingTxItemName}
                                            onChange={(e) => {
                                              setEditingTxItemName(e.target.value);
                                              const prod = products.find(p => p.name === e.target.value);
                                              if (prod) {
                                                setEditingTxVariant(prod.variant || 'Regular');
                                                setEditingTxCost(prod.cost?.toString() || '0');
                                              }
                                            }}
                                            className="bg-zinc-950 border border-zinc-800 text-xs text-white p-2.5 rounded-lg outline-none cursor-pointer"
                                          >
                                            {products.map(p => (
                                              <option key={p.id} value={p.name}>{p.name}</option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Destination Branch */}
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9.5px] font-semibold text-zinc-400 uppercase tracking-wide">Target Tagged Branch</label>
                                          <select 
                                            value={editingTxDestBranch}
                                            onChange={(e) => setEditingTxDestBranch(e.target.value)}
                                            className="bg-zinc-950 border border-zinc-800 text-xs text-white p-2.5 rounded-lg outline-none cursor-pointer"
                                          >
                                            {branches.map(b => (
                                              <option key={b} value={b}>{b}</option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Qty & Specifier */}
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[9.5px] font-semibold text-zinc-400 uppercase tracking-wide">Qty</label>
                                            <input 
                                              type="number"
                                              value={editingTxQty}
                                              onChange={(e) => setEditingTxQty(e.target.value)}
                                              className="bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-200 p-2.5 rounded-lg outline-none"
                                            />
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[9.5px] font-semibold text-zinc-400 uppercase tracking-wide">Unit Specifier</label>
                                            <input 
                                              type="text"
                                              value={editingTxVariant}
                                              onChange={(e) => setEditingTxVariant(e.target.value)}
                                              className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none"
                                            />
                                          </div>
                                        </div>

                                        {/* Cost & Status */}
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[9.5px] font-semibold text-zinc-400 uppercase tracking-wide">Unit Cost (₱)</label>
                                            <input 
                                              type="number"
                                              value={editingTxCost}
                                              onChange={(e) => setEditingTxCost(e.target.value)}
                                              className="bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-200 p-2.5 rounded-lg outline-none"
                                            />
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[9.5px] font-semibold text-zinc-400 uppercase tracking-wide">Status</label>
                                            <select
                                              value={editingTxStatus}
                                              onChange={(e) => setEditingTxStatus(e.target.value as any)}
                                              className="bg-zinc-950 border border-zinc-800 text-xs text-white p-2.5 rounded-lg outline-none cursor-pointer"
                                            >
                                              <option value="pending-delivery">⌛ Pending Delivery</option>
                                              <option value="completed">✓ Store Stock Received</option>
                                            </select>
                                          </div>
                                        </div>

                                        {/* Scheduled/Delivered Date */}
                                        <div className="flex flex-col gap-1 md:col-span-2">
                                          <label className="text-[9.5px] font-semibold text-zinc-400 uppercase tracking-wide">Scheduled/Delivered Date</label>
                                          <input 
                                            type="datetime-local"
                                            value={editingTxDeliveryDate}
                                            onChange={(e) => setEditingTxDeliveryDate(e.target.value)}
                                            className="bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 p-2.5 rounded-lg outline-none"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 mt-2 justify-end border-t border-zinc-850 pt-3">
                                        <button
                                          onClick={() => { handleTactileClick(); setEditingTxId(null); }}
                                          className="px-3.5 py-2 text-[10px] font-display font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-750 transition rounded-xl cursor-pointer uppercase tracking-wider"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => { handleTactileClick(); handleUpdateTx(tx.id); }}
                                          className="px-4 py-2 text-[10px] font-display font-extrabold text-white bg-amber-500 hover:bg-amber-600 transition rounded-xl cursor-pointer uppercase tracking-wider shadow-lg shadow-amber-550/10"
                                        >
                                          Save Changes
                                        </button>
                                      </div>
                                    </article>
                                  );
                                }

                                return (
                                  <article key={tx.id} className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-display">
                                    <div className="flex items-start gap-4 flex-1">
                                      {tx.type === 'stock-in' ? (
                                        <span className="w-8 h-8 rounded-full bg-emerald-950/40 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">IN</span>
                                      ) : (
                                        <span className="w-8 h-8 rounded-full bg-rose-955 bg-rose-950/40 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">OUT</span>
                                      )}
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-zinc-200 block uppercase tracking-wide">{tx.itemName}</span>
                                          <span className="px-1.5 py-0.5 bg-zinc-900 text-[10px] font-mono rounded text-zinc-500 border border-zinc-850/60 uppercase">{tx.variant}</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block uppercase">
                                          Branch Destination: <span className="text-zinc-300 font-bold">{tx.destinationBranch}</span> · Perform: {tx.performedBy} · Scheduled Delivery: {formattedDeliveryDate}
                                        </span>
                                        
                                        {/* Tag Arrived helper */}
                                        {tx.arrivalDate && (
                                          <span className="text-[10px] text-emerald-400 font-bold mt-1 block uppercase">
                                            ✓ Store Stock Arrived confirmation on: {new Date(tx.arrivalDate).toLocaleString('en-PH')}
                                          </span>
                                        )}

                                        {tx.type === 'stock-out' && (
                                          <span className="text-[10px] text-rose-400 font-mono mt-1 block uppercase">
                                            ⚠ Stock Out reason: {tx.reason}
                                          </span>
                                        )}

                                        {/* ADMIN QUICK ACTIONS PANEL FOR INCORRECT ENTRIES / BRANCH TAG ERROR */}
                                        {currentRole === 'admin' && (
                                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-900/60">
                                            <button
                                              onClick={() => { handleTactileClick(); startEditingTx(tx); }}
                                              className="p-1 px-2 text-[9px] font-display font-bold uppercase tracking-wider text-amber-500 hover:text-white border border-amber-900/60 hover:bg-amber-950/20 rounded-md transition cursor-pointer"
                                              title="Edit dispatch transaction (adjust branch, item name, quantity, or variant specifier)"
                                            >
                                              ✏ Edit Tag / Details
                                            </button>
                                            {confirmingDeleteTxId === tx.id ? (
                                              <div className="flex items-center gap-1.5 bg-red-950/20 border border-red-900/40 p-1 px-2 rounded-lg">
                                                <span className="text-[9px] font-display font-semibold text-red-400">Confirm Delete?</span>
                                                <button
                                                  onClick={() => {
                                                    handleTactileClick();
                                                    handleDeleteTx(tx.id);
                                                  }}
                                                  className="px-2 py-0.5 text-[8.5px] font-display font-bold uppercase tracking-wider text-white bg-red-650 hover:bg-red-700 rounded transition-all cursor-pointer"
                                                >
                                                  Confirm
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    handleTactileClick();
                                                    setConfirmingDeleteTxId(null);
                                                  }}
                                                  className="px-2 py-0.5 text-[8.5px] font-display font-semibold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-800 rounded transition-all cursor-pointer"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                onClick={() => {
                                                  handleTactileClick();
                                                  setConfirmingDeleteTxId(tx.id);
                                                }}
                                                className="p-1 px-2 text-[9px] font-display font-bold uppercase tracking-wider text-red-500 hover:text-white border border-red-900/40 hover:bg-red-950/20 rounded-md transition cursor-pointer"
                                                title="Delete/Remove dispatch transaction log"
                                              >
                                                🗑 Delete Dispatch
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                                      <div className="text-right">
                                        <span className="text-xs font-mono font-bold text-zinc-400 block">Qty: {tx.qty} units</span>
                                        <span className="text-[10px] text-zinc-500 block uppercase">Unit Cost: ₱{tx.cost}</span>
                                      </div>
                                      
                                      {/* Status display or Action receive confirmation */}
                                      {isPending ? (
                                        currentRole === 'cashier' && belongsToCashierBranch ? (
                                          <motion.button 
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleReceiveStock(tx.id)}
                                            className="bg-red-650 bg-red-600 hover:bg-red-700 text-[10px] font-display font-semibold transition text-white px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-lg shadow-red-600/15 cursor-pointer"
                                          >
                                            Confirm Arrival Store Stock
                                          </motion.button>
                                        ) : (
                                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-500 bg-amber-955 bg-amber-950/20 px-2.5 py-1 border border-amber-900/30 rounded-lg">
                                            ⌛ Pending Delivery
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-400 bg-emerald-950/20 px-2.5 py-1 border border-emerald-900/30 rounded-lg">
                                          ✓ Store Stock Received
                                        </span>
                                      )}
                                    </div>
                                  </article>
                                );
                              })}
                          </div>
                        </div>

                      </div>

                      {/* COLUMN 3: FORMS ACTION SIDEBAR based on ACTIVE SUB-TAB */}
                      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                        
                        {/* VIEW 1: RECEIVED COMPLETED SCREEN OR BRIEF DETAILS */}
                        {activeInventoryTab === 'received' && (
                          <div className="flex flex-col gap-4">
                            <h4 className="text-xs uppercase font-display font-extrabold tracking-widest text-[#ebb213] border-b border-zinc-850 pb-2 mb-1 font-bold">
                              🚚 Delivery Summary Status
                            </h4>
                            <p className="text-xs text-zinc-500 uppercase leading-relaxed font-display">
                              This panel keeps a track record of all warehouse logistics movements. 
                              Admin initiates stock transfers. Cashiers verify physical cargo arrivals at branches 
                              and tag them as branch &quot;Store Stock&quot; to make them available inside kitchen operations.
                            </p>
                            
                            <div className="mt-2 p-3 bg-zinc-950/50 border border-zinc-850 rounded-xl flex items-center justify-between">
                              <span className="text-xs text-zinc-400 font-display">Active Warehouse Shipments:</span>
                              <span className="font-mono text-sm font-bold text-amber-500">
                                {inventoryTransactions.filter(tx => tx.status === 'pending-delivery').length} pending
                              </span>
                            </div>
                            
                            <div className="p-3 bg-zinc-950/50 border border-zinc-850 rounded-xl flex items-center justify-between">
                              <span className="text-xs text-zinc-400 font-display">Arrived store stock counts:</span>
                              <span className="font-mono text-sm font-bold text-emerald-400">
                                {inventoryTransactions.filter(tx => tx.status === 'completed' && tx.type === 'stock-in').length} received
                              </span>
                            </div>
                          </div>
                        )}

                        {/* VIEW 2: STOCK IN (ADMIN ONLY FORM) */}
                        {activeInventoryTab === 'stock-in' && currentRole === 'admin' && (
                          <div className="flex flex-col gap-4">
                            <h4 className="text-xs uppercase font-display font-extrabold tracking-widest text-amber-500 border-b border-zinc-850 pb-2 mb-1 font-bold">
                              📥 Form: Warehouse Stock Tagging
                            </h4>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Select stock item</label>
                              <select 
                                value={newStockItem}
                                onChange={(e) => {
                                  setNewStockItem(e.target.value);
                                  // populate preset cost and variant if available on product
                                  const prod = products.find(p => p.name === e.target.value);
                                  if (prod) {
                                    setNewStockVariant(prod.variant || 'Regular');
                                    setNewStockCost(prod.cost?.toString() || '0');
                                  }
                                }}
                                className="w-full bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-350 outline-none"
                              >
                                <option value="">-- Choose matching product --</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Stock Quantity (units)</label>
                              <input 
                                type="number" 
                                placeholder="e.g. 50" 
                                value={newStockQty}
                                onChange={(e) => setNewStockQty(e.target.value)}
                                className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-mono text-zinc-200 placeholder-zinc-700 outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Quantity Variant Specifier (e.g. 50kg Sack, 100pcs Box)</label>
                              <input 
                                type="text" 
                                placeholder="e.g. 50kg Sack / Regular Pack" 
                                value={newStockVariant}
                                onChange={(e) => setNewStockVariant(e.target.value)}
                                className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Item Unit Cost (PHP)</label>
                              <input 
                                type="number" 
                                placeholder="e.g. 2500" 
                                value={newStockCost}
                                onChange={(e) => setNewStockCost(e.target.value)}
                                className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-mono text-zinc-200 placeholder-zinc-700 outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Destination Branch Delivery Target</label>
                              <select 
                                value={newStockDestBranch}
                                onChange={(e) => setNewStockDestBranch(e.target.value)}
                                className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-350 outline-none cursor-pointer"
                              >
                                {branches.map(b => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Expected Shipment Date</label>
                              <input 
                                type="date" 
                                value={newStockDeliveryDate}
                                onChange={(e) => setNewStockDeliveryDate(e.target.value)}
                                className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-200 outline-none"
                              />
                            </div>

                            <button 
                              onClick={handleStockIn}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs font-display font-medium text-white p-3 rounded-xl transition uppercase tracking-wider font-bold shadow-lg shadow-emerald-600/15 cursor-pointer"
                            >
                              🚀 Tag and Dispatch Delivery
                            </button>
                          </div>
                        )}

                        {/* VIEW 3: STOCK OUT (BOTH ADMIN & CASHIER) */}
                        {activeInventoryTab === 'stock-out' && (
                          <div className="flex flex-col gap-4">
                            <h4 className="text-xs uppercase font-display font-extrabold tracking-widest text-red-500 border-b border-zinc-850 pb-2 mb-1 font-bold">
                              📤 Form: Register Stock Out Outflow
                            </h4>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Select stock item</label>
                              <select 
                                value={selectedStockOutItemKey}
                                onChange={(e) => setSelectedStockOutItemKey(e.target.value)}
                                className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-350 outline-none"
                              >
                                <option value="">-- Choose Stock Item --</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.name}>{p.name} ({p.variant || 'Regular'})</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Stock Quantity to write off (units)</label>
                              <input 
                                type="number" 
                                placeholder="e.g. 5" 
                                value={stockOutQty}
                                onChange={(e) => setStockOutQty(e.target.value)}
                                className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-mono text-zinc-200 placeholder-zinc-700 outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Write-off Reason Classification</label>
                              <select 
                                value={stockOutReason}
                                onChange={(e) => setStockOutReason(e.target.value)}
                                className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-350 outline-none"
                              >
                                <option value="Damaged">Ingredient Spoiled / Damaged</option>
                                <option value="Wasted">Kitchen Waste / Expired</option>
                                <option value="Shrinkage">Cargo Defect / Shrinkage</option>
                                <option value="Kitchen Consumption">Dispatched for kitchen cooking trials</option>
                                <option value="Theft / Lost">Theft / Discrepancy In Count</option>
                              </select>
                            </div>

                            <button 
                              onClick={handleStockOut}
                              className="w-full bg-red-650 bg-red-600 hover:bg-red-700 text-xs font-display font-medium text-white p-3 rounded-xl transition uppercase tracking-wider font-bold shadow-lg shadow-red-600/15 cursor-pointer"
                            >
                              📤 Record Stock Out Outflow
                            </button>
                          </div>
                        )}

                      </div>

                    </div>
                  </div>
                )}

              </div>
            </main>

            {/* FLOATING MOBILE CART BUTTON */}
            {activeTab === 'pos' && (
              <div className="fixed bottom-5 right-5 z-40 md:hidden">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { handleTactileClick(); setIsMobileCartOpen(true); }}
                  className="w-14 h-14 bg-red-600 hover:bg-red-700 border border-red-500 rounded-full flex items-center justify-center text-white shadow-2xl relative cursor-pointer"
                >
                  <ShoppingCart className="w-6 h-6 animate-pulse" />
                  {totalItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-zinc-950 font-mono text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-zinc-900">
                      {totalItemCount}
                    </span>
                  )}
                </motion.button>
              </div>
            )}

            {/* RIGHT SIDEBAR: CART CONTAINER */}
            <aside className={`${isMobileCartOpen ? 'fixed inset-0 z-45 bg-zinc-900 flex' : 'hidden'} md:relative md:flex w-full md:w-96 flex-none bg-zinc-900 border-l border-zinc-850 flex flex-col`}>
              
              {/* CART HEADER */}
              <header className="flex-none p-5 border-b border-zinc-850/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-display font-bold uppercase tracking-wider text-zinc-100">
                    Running Basket
                  </h3>
                  {totalItemCount > 0 && (
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                      {totalItemCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={clearEntireCart}
                    disabled={totalItemCount === 0}
                    className="text-[10px] font-display font-medium uppercase tracking-wider text-zinc-500 hover:text-red-500 transition disabled:opacity-30 disabled:hover:text-zinc-550 cursor-pointer"
                  >
                    Clear all
                  </button>
                  <button
                    onClick={() => setIsMobileCartOpen(false)}
                    className="md:hidden p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition shrink-0 cursor-pointer"
                    title="Close basket"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {/* ITEMS SCROLLER */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {totalItemCount === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                    <span className="text-4xl">🍱</span>
                    <h5 className="text-xs uppercase font-display font-bold tracking-widest text-zinc-500">BASKET EMPTY</h5>
                    <p className="text-[10px] text-zinc-650 max-w-[200px] leading-relaxed uppercase tracking-wide">
                      Select dishes from the menu to populate this register invoice
                    </p>
                  </div>
                ) : (
                  Object.entries(cart).map(([pIdStr, qty]) => {
                    const pid = parseInt(pIdStr);
                    const prod = products.find(p => p.id === pid);
                    if (!prod) return null;
                    return (
                      <div key={pid} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850/80 flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <span className="text-xl bg-zinc-900 w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-850">{prod.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-[11px] font-display font-bold uppercase text-zinc-200 line-clamp-1 tracking-wide leading-none">{prod.name}</h5>
                            <span className="text-[10px] font-mono text-zinc-500 mt-1 block">₱{prod.price}</span>
                          </div>
                          
                          <button 
                            onClick={() => directRemoveFromCart(pid)}
                            className="text-zinc-600 hover:text-red-500 transition p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-900/80 pt-2.5">
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => decrementCart(pid)}
                              className="w-7 h-7 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg flex items-center justify-center border border-zinc-850 transition cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-mono font-bold text-white">{qty}</span>
                            <button 
                              onClick={() => addToCart(pid)}
                              className="w-7 h-7 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg flex items-center justify-center border border-zinc-850 transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="font-mono font-bold text-amber-500 text-xs">₱{prod.price * qty}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ESTIMATE/PRICING SUMMARY */}
              <section className="flex-none p-5 bg-zinc-955 border-t border-zinc-850 flex flex-col gap-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase font-display tracking-widest text-zinc-500 font-semibold">Total Invoice</span>
                  <span className="text-3xl font-mono font-black text-amber-500">₱{cartTotalAmount.toLocaleString()}</span>
                </div>

                <button 
                  onClick={() => { handleTactileClick(); setChargeModalOpen(true); setIsMobileCartOpen(false); }}
                  disabled={totalItemCount === 0}
                  className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-display font-medium text-xs uppercase tracking-widest font-bold select-none transition-all cursor-pointer shadow-lg shadow-red-600/10 active:scale-[0.98]"
                >
                  💳 Charge Order (₱{cartTotalAmount})
                </button>
              </section>

            </aside>

          </div>

        </div>
      )}

      {/* ─── 3. OVERLAYS / CHECKOUT FLOW SUB MODALS ─── */}

      {/* A. CHARGE OPTION DRAWER */}
      <AnimatePresence>
        {chargeModalOpen && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setChargeModalOpen(false)} 
                className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-sm font-display font-extrabold uppercase tracking-widest text-zinc-300 mb-4 border-b border-zinc-800 pb-2">
                Checkout Method
              </h4>

              {/* Mini receipt summary */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850/80 mb-6 font-mono text-[11px] leading-relaxed">
                <div className="text-center font-display font-black text-amber-500 text-xs uppercase mb-3 tracking-widest border-b border-zinc-900 pb-2">Boss Rice Order</div>
                {Object.entries(cart).map(([pidStr, qty]) => {
                  const p = products.find(x => x.id === parseInt(pidStr));
                  if (!p) return null;
                  return (
                    <div key={pidStr} className="flex justify-between text-zinc-400 py-0.5">
                      <span className="truncate uppercase max-w-[200px]">{p.name} x{qty}</span>
                      <span>₱{p.price * qty}</span>
                    </div>
                  );
                })}
                <div className="border-t border-zinc-900 mt-3 pt-2.5 flex justify-between text-white font-bold text-xs uppercase">
                  <span>Total Due</span>
                  <span className="text-amber-500">₱{cartTotalAmount}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 font-display">
                <button 
                  onClick={() => selectPaymentOption('cash')}
                  className="w-full p-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                >
                  <Coins className="w-4 h-4" /> 💵 Cash Payment (₱{cartTotalAmount})
                </button>
                <button 
                  onClick={() => selectPaymentOption('gcash')}
                  className="w-full p-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" /> 📱 GCash Instapay QR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHIFT OVERLAY MODAL */}
      <AnimatePresence>
        {isShiftOverlayOpen && tempUser && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative flex flex-col gap-4 font-display"
            >
              <header className="text-center">
                <span className="text-3xl">🏧</span>
                <h3 className="text-xl font-display font-black text-white uppercase tracking-tight mt-2">
                  Open <span className="text-red-500">Shift</span> Register
                </h3>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                  Cashier Active Station Setup for {tempUser.username.toUpperCase()}
                </p>
              </header>

              <div className="flex flex-col gap-4 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-850/60">
                {/* BRANCH SELECTION */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    🏢 Select Assigned Branch / Station
                  </label>
                  <select
                    value={shiftBranch}
                    onChange={(e) => { handleTactileClick(); setShiftBranch(e.target.value); }}
                    className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-xs font-display text-zinc-200 outline-none cursor-pointer hover:border-zinc-700 transition"
                  >
                    {branches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="Custom...">Custom / Other Location...</option>
                  </select>
                </div>

                {/* CUSTOM BRANCH INPUT */}
                {shiftBranch === 'Custom...' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-1.5"
                  >
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Specify Custom Branch Name
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Lapu-Lapu Outlet"
                      value={customBranchText}
                      onChange={(e) => setCustomBranchText(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 outline-none focus:border-red-500 transition"
                    />
                  </motion.div>
                )}

                {/* BEGINNING BALANCE */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    💰 Beginning Drawer cash Balance (₱)
                  </label>
                  <input 
                    type="number"
                    placeholder="e.g. 1000"
                    value={shiftBegBalance}
                    onChange={(e) => setShiftBegBalance(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-sm font-mono text-zinc-200 placeholder-zinc-700 outline-none focus:border-red-500 transition"
                  />
                  <span className="text-[9px] text-zinc-650 uppercase tracking-widest leading-normal">
                    Typical beginning balance is ₱1,000.00 for change drawers.
                  </span>
                </div>

                {/* --- REGISTER TIMESTAMPS FOR ACCIDENTAL LOGOUT CACHE RECOVERY --- */}
                <div className="border-t border-dashed border-zinc-800 pt-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                      🔁 Cache Shift Recovery Sync
                    </span>
                    <span className="bg-amber-950/50 border border-amber-900/40 px-1.5 py-0.5 rounded text-[8px] font-mono text-amber-400">
                      {(() => {
                        try {
                          const archive = JSON.parse(localStorage.getItem('br_offline_order_archive_v1') || '[]');
                          return `${archive.length} saved`;
                        } catch (e) {
                          return '0 cached';
                        }
                      })()}
                    </span>
                  </div>
                  
                  <p className="text-[9px] text-zinc-500 leading-normal uppercase">
                    If you accidentally logged out while offline, select your work shift times below to re-upload cached orders.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">
                        Log-In Date/Time
                      </label>
                      <input 
                        type="datetime-local"
                        value={recoveryStart}
                        onChange={(e) => setRecoveryStart(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800/80 p-2 rounded-lg text-[9px] font-mono text-zinc-300 outline-none hover:border-zinc-700 focus:border-amber-600 transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">
                        Log-Out Date/Time
                      </label>
                      <input 
                        type="datetime-local"
                        value={recoveryEnd}
                        onChange={(e) => setRecoveryEnd(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800/80 p-2 rounded-lg text-[9px] font-mono text-zinc-300 outline-none hover:border-zinc-700 focus:border-amber-600 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={restoreAndSyncOfflineReceipts}
                    disabled={isRecovering}
                    className={`w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${
                      isRecovering 
                        ? 'bg-zinc-800 text-zinc-600 border border-zinc-850 cursor-not-allowed' 
                        : 'bg-amber-950/40 text-amber-400 border border-amber-900/40 hover:bg-amber-900/30'
                    } flex items-center justify-center gap-1.5`}
                  >
                    {isRecovering ? (
                      <>
                        <span className="w-2 h-2 rounded-full border border-t-transparent border-amber-400 animate-spin" />
                        Recovering Cache...
                      </>
                    ) : (
                      <>🔍 Restore & Re-upload Cached Orders</>
                    )}
                  </button>

                  {recoveredCount !== null && (
                    <div className="p-2 border border-emerald-950/20 bg-emerald-950/10 rounded-lg text-emerald-400 font-mono text-[9px] uppercase tracking-wide text-center">
                      {recoveredCount > 0 
                        ? `🎉 Sync Complete: Re-uploaded ${recoveredCount} orders!` 
                        : '✅ Device data is up-to-date and synced!'}
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => { 
                    handleTactileClick(); 
                    setIsShiftOverlayOpen(false); 
                    setTempUser(null); 
                    if (!myActiveShift) {
                      attemptLogout();
                    }
                  }}
                  className="flex-1 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition active:scale-95 cursor-pointer text-center"
                >
                  Cancel / Logout
                </button>
                <button
                  onClick={() => { handleTactileClick(); startShift(); }}
                  className="flex-[2] py-3 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition active:scale-95 shadow-lg shadow-red-600/15 cursor-pointer"
                >
                  Open Register ✓
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* B. GCASH HIGH FIDELITY SCAN FRAME MODAL */}
      <AnimatePresence>
        {gcashModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-center"
            >
              <button 
                onClick={() => setGcashModalOpen(false)} 
                className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-xs uppercase font-display font-extrabold tracking-widest text-blue-400 mb-4 flex items-center justify-center gap-1.5">
                <Smartphone className="w-4 h-4 animate-pulse" /> GCash Transfer Station
              </h4>

              {/* ─── NATIVE GCASH / INSTAPAY CARD FRAMING REDESIGNED ─── */}
              <div className="m-auto mb-6 max-w-sm rounded-[32px] overflow-hidden p-6 bg-[#005cee] shadow-2xl relative">
                
                {/* Top GCash Brand Logo */}
                <div className="w-full flex justify-center mb-5 select-none">
                  <svg viewBox="0 0 180 50" className="h-9 w-auto text-white fill-current" xmlns="http://www.w3.org/2000/svg">
                    <g>
                      {/* Circle with waves representing the G symbol */}
                      <circle cx="20" cy="25" r="11" fill="white" />
                      <path d="M20 5 A 20 20 0 0 1 38 34 A 20 20 0 0 1 23 45" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
                      <path d="M20 -3 A 28 28 0 0 1 45 37 A 28 28 0 0 1 20 53" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
                      {/* Clean font styling for GCash wordmark */}
                      <text x="56" y="34" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="28" letterSpacing="-0.5px">GCash</text>
                    </g>
                  </svg>
                </div>

                {/* White Container Frame */}
                <div className="bg-white rounded-[24px] p-6 pb-7 flex flex-col items-center select-none relative shadow-lg">
                  
                  {/* QR Image containing the dynamic code content from QRSERVER API */}
                  <div className="w-56 h-56 bg-white rounded-2xl relative flex items-center justify-center border border-zinc-200/60 p-2 overflow-hidden">
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=0&color=080808&bgcolor=ffffff&data=00020101021130630014ph.ppay.qrph01310014ph.ppay.qrph0215000000000000003520458125303608540555.005802PH5911BOSS%20RICE%206006MANILA62070703ABC6304CA12" 
                      alt="GCash Scan QR Code" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Floating Center Badge representing the logo "instaPay" as shown in the original image */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2.5 py-1.5 rounded-lg shadow-lg border border-zinc-200/80 flex flex-col items-center justify-center min-w-[55px]">
                      <span className="text-[7px] leading-none font-sans font-extrabold text-blue-700 tracking-tighter">insta</span>
                      <span className="text-[7px] leading-none font-sans font-extrabold text-red-600 tracking-tighter mt-0.5">Pay</span>
                      <div className="w-5 h-1.5 flex mt-1">
                        <span className="flex-1 bg-blue-600 rounded-l" />
                        <span className="flex-1 bg-red-600 rounded-r" />
                      </div>
                    </div>
                  </div>

                  {/* Footer fees warning */}
                  <p className="text-[10px] text-zinc-400 font-sans tracking-wide mt-5">
                    Transfer fees may apply.
                  </p>

                  {/* Account Name - exact matching letter spacing */}
                  <h3 className="text-[#005cee] font-sans font-extrabold text-lg tracking-[0.10em] uppercase mt-3 select-text leading-none">
                    ME****N G.
                  </h3>

                  {/* Mobile details (Philippine prefixes) */}
                  <div className="text-zinc-400 font-sans font-normal text-[11px] tracking-wide mt-2">
                    Mobile No.: <span className="font-semibold text-zinc-600 select-text">+63 992 422 ....</span>
                  </div>

                  {/* User Profile ID */}
                  <div className="text-zinc-300 font-sans font-normal text-[10px] tracking-wide mt-1">
                    User ID: <span className="font-medium text-zinc-500 select-text">..........5ENEEY</span>
                  </div>

                </div>
              </div>

              {/* Instructions list */}
              <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl text-left text-xs mb-6 max-w-sm m-auto text-zinc-400 space-y-2">
                <div className="flex gap-2"><span className="text-blue-500 font-bold">1.</span> <span>Launch the <strong>GCash Wallet application</strong> on customer&apos;s phone</span></div>
                <div className="flex gap-2"><span className="text-blue-500 font-bold">2.</span> <span>Select <strong>Scan QR</strong> and hover over the terminal register screen</span></div>
                <div className="flex gap-2"><span className="text-blue-500 font-bold">3.</span> <span>Send the exact amount: <strong className="text-amber-500 font-mono">₱{cartTotalAmount}</strong></span></div>
              </div>

              <div className="flex gap-3 justify-center max-w-sm m-auto font-display">
                <button 
                  onClick={() => setGcashModalOpen(false)} 
                  className="flex-1 py-3 text-xs uppercase font-medium bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitGcashCheckout}
                  className="flex-[2] py-3 text-xs uppercase font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-lg shadow-blue-600/20"
                >
                  Confirm QR Paid ✓
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* C. CASH REGISTER CHANGER MODAL */}
      <AnimatePresence>
        {cashModalOpen && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setCashModalOpen(false)} 
                className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-xs uppercase font-display font-extrabold tracking-widest text-emerald-500 mb-6 flex items-center gap-1">
                💵 CASHIER CHARGERS
              </h4>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-display font-bold">Invoice Due</label>
                  <p className="text-2xl font-mono font-bold text-white leading-none mt-1">₱{cartTotalAmount}</p>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-display font-bold">Entered cash</label>
                  <p className="text-2xl font-mono font-bold text-amber-500 leading-none mt-1">₱{cashReceivedText || '0'}</p>
                </div>
              </div>

              {/* CHANGE DUE PANEL BAR COLOR BASED ON SUFFICIENCY */}
              <div className={`p-4 rounded-xl text-center border mb-4 font-display transition-colors ${
                !cashReceivedText 
                  ? 'bg-zinc-950 border-zinc-850 text-zinc-650' 
                  : computedChangeDue < 0 
                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                    : computedChangeDue === 0 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                <span className="text-[9px] uppercase tracking-widest font-bold block mb-1">
                  {!cashReceivedText ? 'WAITING FOR CASH AMOUNT' : computedChangeDue < 0 ? 'SHORT BALANCE DUE' : computedChangeDue === 0 ? 'EXACT AMOUNT PROVIDED' : 'CHANGE DUE CUSTOMER'}
                </span>
                <span className="text-3xl font-mono font-black block leading-none">
                  {!cashReceivedText ? '—' : computedChangeDue < 0 ? `₱${Math.abs(computedChangeDue)}` : `₱${computedChangeDue}`}
                </span>
              </div>

              {/* CASH NUMERIC REGISTERS */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                  <button 
                    key={n} 
                    onClick={() => handleCashNumpadInput(n)}
                    className="py-3 rounded-lg bg-zinc-950 border border-zinc-850 hover:bg-zinc-800 font-mono text-base font-bold text-zinc-200 transition active:scale-95"
                  >
                    {n}
                  </button>
                ))}
                <button onClick={() => handleCashNumpadInput('del')} className="py-3 rounded-lg bg-zinc-950 border border-zinc-850 hover:bg-zinc-800 text-xs text-red-500 font-display font-semibold uppercase tracking-wider transition active:scale-95">⌫</button>
                <button onClick={() => handleCashNumpadInput('0')} className="py-3 rounded-lg bg-zinc-950 border border-zinc-850 hover:bg-zinc-800 font-mono text-base font-bold text-zinc-200 transition active:scale-95">0</button>
                <button onClick={() => handleCashNumpadInput('exact')} className="py-3 rounded-lg bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-xs text-amber-550 font-display font-semibold uppercase tracking-wider transition active:scale-95">Exact</button>
              </div>

              {/* QUICK NOMINAL PRESETS BILLS (Philippines currency typical weights) */}
              <div className="flex gap-1.5 mb-6 justify-between select-none font-mono">
                {[50, 100, 200, 500, 1000].map(bill => (
                  <button
                    key={bill}
                    onClick={() => handleCashQuickAdd(bill)}
                    className="flex-1 py-2 text-[10px] font-bold rounded-lg bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-white transition hover:bg-zinc-850 active:scale-95"
                  >
                    +{bill}
                  </button>
                ))}
              </div>

              <button 
                disabled={!cashPayActive}
                onClick={submitCashCheckout}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-display font-bold text-xs uppercase tracking-wider transition shadow-lg"
              >
                💵 Confirm Payment ✓
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* D. RECEIPT REPLICA THERMAL STYLE SHEET MODAL */}
      <AnimatePresence>
        {receiptModalOpen && activeReceiptOrder && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <h4 className="text-xs uppercase font-display font-extrabold tracking-widest text-emerald-500 text-center mb-4 flex items-center justify-center gap-1.5">
                <Check className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 w-4 h-4" /> Order Finalized
              </h4>

              {/* THERMAL PAPER BACKGROUND STYLE */}
              <div className="bg-white text-zinc-900 p-6 rounded-2xl shadow-inner font-mono text-[11px] leading-relaxed relative overflow-hidden flex flex-col mb-6">
                
                {/* Simulated edge cut lines */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-300 to-transparent bg-repeat-x flex" />

                <header className="text-center mb-4 pb-2 border-b-2 border-dashed border-zinc-300">
                  <h3 className="font-display font-black text-xl text-red-600 tracking-tight leading-none uppercase">BOSS RICE</h3>
                  <p className="text-[8px] font-sans text-zinc-500 tracking-wider uppercase m-0 mt-0.5">Original Garlic Java Comforts</p>
                  <p className="text-[8px] text-zinc-400 font-sans tracking-wide mt-1 leading-none">
                    {new Date(activeReceiptOrder.created_at).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </header>

                <div className="flex justify-between font-bold mb-2">
                  <span>TERM RES: #{activeReceiptOrder.order_number}</span>
                  <span className="uppercase text-right">{activeReceiptOrder.cashier_role}</span>
                </div>

                <div className="space-y-1 py-2 border-b border-dashed border-zinc-200">
                  {activeReceiptOrder.items.map((itemStr: string, index: number) => (
                    <div key={index} className="flex justify-between uppercase">
                      <span>{itemStr}</span>
                    </div>
                  ))}
                </div>

                <div className="py-2 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold font-sans uppercase">
                    <span>Invoice Total</span>
                    <span>₱{activeReceiptOrder.total}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 uppercase">
                    <span>Payment Method</span>
                    <span>{activeReceiptOrder.payment_method}</span>
                  </div>
                  {activeReceiptOrder.payment_method === 'Cash' && (
                    <>
                      <div className="flex justify-between text-zinc-500 uppercase">
                        <span>Paid Cash</span>
                        <span>₱{activeReceiptOrder.cash_received}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-bold uppercase">
                        <span>Change Returned</span>
                        <span>₱{activeReceiptOrder.change_given}</span>
                      </div>
                    </>
                  )}
                </div>

                <footer className="text-center mt-6 pt-3 border-t-2 border-dashed border-zinc-300">
                  <p className="m-0 text-[9px] uppercase font-sans font-bold text-zinc-500">Thank you for dining at Boss Rice! 🍱</p>
                  <p className="m-0 text-[8px] text-zinc-450 font-sans tracking-wider mt-1">Please come back again</p>
                </footer>
              </div>

              <button 
                onClick={closeReceiptAndAdvance}
                className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display font-bold text-xs uppercase tracking-widest transition"
              >
                ✓ Complete & New Order
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* E. ADMIN PIN AUTHORIZATION FOR VOIDING ORDERS */}
      <AnimatePresence>
        {isVoidAuthOpen && orderToVoid && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => {
                  setIsVoidAuthOpen(false);
                  setOrderToVoid(null);
                  setAdminVoidPin('');
                  setVoidAuthError('');
                  handleTactileClick();
                }} 
                className="absolute right-4 top-4 text-zinc-550 hover:text-zinc-350 transition active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-display font-extrabold tracking-widest text-red-500 uppercase">
                  SECURITY AUTHORIZATION
                </h4>
                <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mt-1">
                  ADMIN SECURITY PRIVILEGE REQUIRED
                </p>
              </div>

              {/* Order summary info inside keycard */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850 my-5 text-left">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                  <span className="font-mono text-xs font-bold text-white">Order #{orderToVoid.order_number}</span>
                  <span className="font-mono text-xs font-bold text-amber-550">₱{orderToVoid.total}</span>
                </div>
                <div className="pt-2 text-[10px] text-zinc-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Payment:</span>
                    <span className="uppercase text-zinc-400 font-semibold">{orderToVoid.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span className="truncate text-zinc-455">{orderToVoid.cashier_name || 'cashier'}</span>
                  </div>
                  <div className="text-[9px] uppercase tracking-wide text-zinc-650 font-sans line-clamp-1 truncate mt-1">
                    {orderToVoid.items.join(', ')}
                  </div>
                </div>
              </div>

              {/* Secure PIN feedback dots */}
              <div className="text-center mb-5">
                <div className="flex justify-center gap-3.5 mb-2.5">
                  {[0, 1, 2, 3].map((idx) => (
                    <div 
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-155 ${
                        adminVoidPin.length > idx 
                          ? 'bg-red-500 border-red-500 scale-110 shadow-md shadow-red-500/40' 
                          : 'bg-zinc-950 border-zinc-800'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-550">
                  {adminVoidPin.length === 0 ? 'ENTER 4-DIGIT PIN' : `${adminVoidPin.length} OF 4 DIGITS ENTERED`}
                </p>
              </div>

              {/* Error alerts */}
              {voidAuthError && (
                <div className="p-2.5 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center text-red-500 font-mono text-[10px] uppercase font-bold tracking-wide animate-pulse">
                  {voidAuthError}
                </div>
              )}

              {/* Admin PIN input numeric keypad */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                  <button 
                    key={n} 
                    onClick={() => {
                      handleTactileClick();
                      setVoidAuthError('');
                      setAdminVoidPin(prev => {
                        if (prev.length < 4) return prev + n;
                        return prev;
                      });
                    }}
                    className="py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-750 font-mono text-base font-bold text-zinc-200 transition active:scale-95 duration-100"
                  >
                    {n}
                  </button>
                ))}
                
                <button 
                  onClick={() => {
                    handleTactileClick();
                    setVoidAuthError('');
                    setAdminVoidPin('');
                  }} 
                  className="py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 text-[10px] font-display font-semibold text-zinc-500 hover:text-zinc-350 tracking-wider uppercase transition active:scale-95"
                >
                  Clear
                </button>
                
                <button 
                  key="0"
                  onClick={() => {
                    handleTactileClick();
                    setVoidAuthError('');
                    setAdminVoidPin(prev => {
                      if (prev.length < 4) return prev + '0';
                      return prev;
                    });
                  }}
                  className="py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-750 font-mono text-base font-bold text-zinc-200 transition active:scale-95 duration-100"
                >
                  0
                </button>
                
                <button 
                  onClick={() => {
                    handleTactileClick();
                    setVoidAuthError('');
                    setAdminVoidPin(prev => prev.slice(0, -1));
                  }} 
                  className="py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 hover:border-red-900/30 text-[11px] font-sans font-black text-red-400 hover:text-red-350 transition active:scale-95"
                  title="Delete/Backspace"
                >
                  ⌫
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsVoidAuthOpen(false);
                    setOrderToVoid(null);
                    setAdminVoidPin('');
                    setVoidAuthError('');
                    handleTactileClick();
                  }} 
                  className="flex-1 py-3 text-xs font-display font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  disabled={adminVoidPin.length !== 4}
                  onClick={handleAuthorizeVoid}
                  className="flex-1 py-3 text-xs font-display font-bold uppercase tracking-wider text-white bg-red-650 hover:bg-red-750 disabled:bg-zinc-800 disabled:text-zinc-650 rounded-xl transition shadow-lg shadow-red-955/20 active:scale-95"
                >
                  Confirm Void
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
