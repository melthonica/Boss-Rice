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
  ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';

// --- TYPES ---
interface Product {
  id: number;
  name: string;
  emoji: string;
  price: number;
  active: boolean;
  category?: string;
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
    
    return {
      ...p,
      category: cat,
      emoji: renderEmoji
    };
  });
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
  const [passwordChangeUser, setPasswordChangeUser] = useState('');
  const [passwordChangeNew, setPasswordChangeNew] = useState('');

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  
  // --- DYNAMIC FILTER OPTIONS FOR BRANCHES & CASHIERS ---
  const dynamicBranches = useMemo(() => {
    const list = new Set<string>();
    allOrders.forEach(o => { if (o.branch) list.add(o.branch); });
    shifts.forEach(s => { if (s.branch) list.add(s.branch); });
    expenses.forEach(e => { if (e.branch) list.add(e.branch); });
    // Guarantee our typical default ones
    list.add('Main Branch');
    return Array.from(list).sort();
  }, [allOrders, shifts, expenses]);

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
  const [activeTab, setActiveTab] = useState<'pos' | 'reports' | 'products' | 'myshift' | 'staff' | 'shifts' | 'expenses'>('pos');
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
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [editingProductCategory, setEditingProductCategory] = useState('');

  // --- CONFIRMATION MODAL STATE ---
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    msg: string;
    onConfirm: () => void;
  }>({ show: false, title: '', msg: '', onConfirm: () => {} });

  const [currentTime, setCurrentTime] = useState<string>('00:00:00');

  // --- AUTO RE-LOAD REFS ---
  const syncTimeoutRef = useRef<any>(null);

  // --- TOAST SERVICE ---
  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // --- PHILIPPINES LOCAL CLOCK ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-PH', { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
      const session = localStorage.getItem('br_session_v1');
      if (session) {
        const parsed = JSON.parse(session);
        setCurrentRole(parsed.role);
        setCurrentUser(parsed.user || null);
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
            setShiftBranch('Main Branch');
            setCustomBranchText('');
            setIsShiftOverlayOpen(true);
          }
        } else {
          setMyActiveShift(null);
          setShiftBegBalance('1000');
          setShiftBranch('Main Branch');
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

  const attemptLogout = () => {
    handleTactileClick();
    localStorage.removeItem('br_session_v1');
    localStorage.removeItem('br_active_shift');
    setCurrentRole(null);
    setCurrentUser(null);
    setMyActiveShift(null);
    setTempUser(null);
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
    csvStr += `"BOSS RICE SALES REPORT"\n`;
    csvStr += `"Selected Date Range:","${startDateFilter} to ${endDateFilter}"\n`;
    csvStr += `"Branch Filter:","${selectedBranchFilter}"\n`;
    csvStr += `"Cashier Filter:","${selectedCashierFilter}"\n`;
    csvStr += `"Generated Time:","${new Date().toLocaleTimeString('en-PH')}"\n\n`;
    
    csvStr += `"Order No.","Timestamp","Completed Items","Branch Destination","Cashier","Total Val (PHP)","Cash Received","Change Returned","Payment Channel"\n`;
    
    let sumTotalSales = 0;
    subset.forEach(o => {
      const rawText = o.items.join('; ').replace(/"/g, '""');
      const timeString = new Date(o.created_at).toLocaleString('en-PH', { hour12: false });
      csvStr += `${o.order_number},"${timeString}","${rawText}","${o.branch || 'Main Branch'}","${o.cashier_name || 'Unassigned'}",${o.total},${o.cash_received || 0},${o.change_given || 0},"${o.payment_method}"\n`;
      sumTotalSales += o.total;
    });

    csvStr += `\n"SUMMARY METRICS"\n`;
    csvStr += `"Total Volume Count:",${subset.length}\n`;
    csvStr += `"Gross Operational Revenues PHP:",${sumTotalSales}\n`;
    
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

    csvStr += `"Total Shift Beginning Balance PHP:",${sumBeginningBalance}\n`;
    csvStr += `"Total Operational Expenses PHP:",${sumExpenses}\n`;
    csvStr += `"Total Net Revenue (Gross - Expenses) PHP:",${netValue}\n`;

    // Dynamic click triggers browser downloader
    const blobObj = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const localUrl = URL.createObjectURL(blobObj);
    const hiddenLink = document.createElement("a");
    hiddenLink.setAttribute("href", localUrl);
    hiddenLink.setAttribute("download", `Boss_Rice_Sales_Report_${startDateFilter}_to_${endDateFilter}.csv`);
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

    setSyncStatus('syncing');
    try {
      const { error } = await supabase
        .from('products')
        .update({ name: trimmedName, price: rawVal, emoji: trimmedCat })
        .eq('id', pId);

      if (error) throw error;
      setProducts(prev => {
        const updated = prev.map(p => p.id === pId ? { ...p, name: trimmedName, price: rawVal, emoji: trimmedCat, category: trimmedCat } : p);
        return mapLoadedProducts(updated);
      });
      setEditingProductId(null);
      setEditingProductName('');
      setEditingProductPrice('');
      setEditingProductCategory('');
      setSyncStatus('online');
      showNotification('Product details saved successfully!');
      if (audioEnabled) playSound('success');
    } catch (e) {
      console.warn("DB product edit failed, applying locally: ", e);
      setProducts(prev => {
        const updated = prev.map(p => p.id === pId ? { ...p, name: trimmedName, price: rawVal, emoji: trimmedCat, category: trimmedCat } : p);
        return mapLoadedProducts(updated);
      });
      setEditingProductId(null);
      setEditingProductName('');
      setEditingProductPrice('');
      setEditingProductCategory('');
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
      role: newStaffRole
    };

    setSyncStatus('syncing');
    try {
      const { data, error } = await supabase.from('pos_users').insert([payload]).select();
      if (error) throw error;
      showNotification(`Registered ${newStaffRole} account: "${userVal}"`);
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
    if (!selUser || !pinVal) {
      showNotification('Please select user account and input a new PIN code');
      return;
    }

    setSyncStatus('syncing');
    try {
      const { error } = await supabase
        .from('pos_users')
        .update({ password: pinVal })
        .eq('username', selUser);

      if (error) throw error;
      showNotification(`PIN updated for "${selUser}"`);
      setPasswordChangeUser('');
      setPasswordChangeNew('');
      syncUsers();
      if (audioEnabled) playSound('success');
    } catch (e) {
      console.error(e);
      // update cached list locally
      const updatedLocalUsers = users.map(u => u.username === selUser ? { ...u, password: pinVal } : u);
      setUsers(updatedLocalUsers);
      localStorage.setItem('br_users_cached', JSON.stringify(updatedLocalUsers));
      showNotification('Updated password caching offline');
      setPasswordChangeUser('');
      setPasswordChangeNew('');
    }
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
      cashier_role: `${currentUser?.username || 'cashier'} | ${myActiveShift?.branch || 'Main Branch'}`,
      cashier_name: currentUser?.username || 'cashier',
      branch: myActiveShift?.branch || 'Main Branch',
      created_at: new Date().toISOString()
    };

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

    try {
      const { data, error } = await supabase.from('products').insert([freshProduct]).select().single();
      if (error) throw error;
      const parsedData = mapLoadedProducts([data])[0];
      setProducts(prev => [...prev, parsedData]);
      setNewProdName('');
      setNewProdPrice('');
      setNewProdCategory('Meals');
      setCustomCategoryName('');
      setIsAddingCustomCategory(false);
      if (audioEnabled) playSound('bell');
      showNotification('Success! Inserted on live menus.');
      setSyncStatus('online');
    } catch (err: any) {
      setSyncStatus('offline');
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
      expectedRegisterCash: 0
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
    return stats;
  }, [filteredOrders, shifts, expenses, startDateFilter, endDateFilter, selectedBranchFilter, selectedCashierFilter]);

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

  // --- COMPUTE CHANGE CASH ---
  const enteredReceivedValue = parseFloat(cashReceivedText || '0');
  const computedChangeDue = enteredReceivedValue - cartTotalAmount;
  const cashPayActive = enteredReceivedValue >= cartTotalAmount && cartTotalAmount > 0;

  return (
    <div className="flex flex-col min-h-screen text-zinc-100 bg-zinc-950 font-sans selection:bg-red-600/30">
      
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
          <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-red-600 animate-spin" />
          <span className="text-xs font-display uppercase tracking-widest text-zinc-500 animate-pulse">Initializing Boss Rice System...</span>
        </div>
      )}

      {/* ─── 1. LOGIN SCREEN (If not authenticated) ─── */}
      {!currentRole ? (
        <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-zinc-950 to-zinc-950">
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />

          <section className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-md">
            
            <header className="text-center mb-8">
              <h1 className="text-5xl font-display font-black tracking-tight text-white m-0 leading-none">
                BOSS <span className="text-red-500">RICE</span>
              </h1>
              <p className="text-xs font-display font-semibold tracking-widest uppercase text-amber-500 mt-2">
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
          <header className="flex-none bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between shadow-md relative z-30">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-tr from-red-600 to-amber-500 rounded-xl flex items-center justify-center font-display font-extrabold text-white text-sm tracking-tight shadow-lg shadow-red-500/10">
                BR
              </div>
              <div>
                <h1 className="text-xl font-display font-black tracking-tight text-white leading-none">
                  BOSS <span className="text-red-500">RICE</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] uppercase font-display tracking-widest text-zinc-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Terminal Station
                  </p>
                  {myActiveShift && currentRole === 'cashier' && (
                    <span className="text-[9px] uppercase font-mono bg-red-950/40 text-red-400 border border-red-900/30 px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                      {myActiveShift.cashier_name} · {myActiveShift.branch} · Beg: ₱{myActiveShift.beginning_balance}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* SYNC INDICATOR */}
              <div 
                onClick={() => bootstrapPOS()}
                title="Force refresh database sync"
                className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-850 py-1.5 px-3 rounded-lg cursor-pointer hover:bg-zinc-850 transition"
              >
                {syncStatus === 'online' && (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[9px] uppercase tracking-wider font-display text-emerald-500 font-semibold">Live Database</span>
                  </>
                )}
                {syncStatus === 'syncing' && (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                    <span className="text-[9px] uppercase tracking-wider font-display text-amber-500 font-semibold">Syncing</span>
                  </>
                )}
                {syncStatus === 'offline' && (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-zinc-500 animate-pulse" />
                    <span className="text-[9px] uppercase tracking-wider font-display text-zinc-500 font-semibold">Offline (Local)</span>
                  </>
                )}
              </div>

              {/* CLOCK */}
              <div className="text-xs font-mono font-medium tracking-widest bg-zinc-950 border border-zinc-850 py-1.5 px-3 rounded-lg text-zinc-400">
                {currentTime}
              </div>

              {/* ADAPTIVE ROLE TAB */}
              <div className={`text-[10px] font-display font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider flex items-center gap-1 ${
                currentRole === 'admin' 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                <span>{currentRole === 'admin' ? '👑' : '🧾'}</span>
                <span>{currentRole}</span>
              </div>

              {/* LOGOUT */}
              <button 
                onClick={attemptLogout}
                title="Log out register"
                className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-500 transition hover:bg-red-500/10 active:scale-95"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* MAIN SPACE split in 2 columns: left is menu structure, right is cart pane */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT: PRODUCTS GRID AREA */}
            <main className="flex-1 flex flex-col min-w-0 bg-zinc-950">
              
              {/* NAV PRESETS */}
              <section className="flex-none bg-zinc-900/50 border-b border-zinc-900/90 p-4 flex gap-2 overflow-x-auto select-none">
                <button 
                  onClick={() => { handleTactileClick(); setActiveTab('pos'); }}
                  className={`px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'pos' 
                      ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/10' 
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" /> Order Grid
                </button>

                {currentRole === 'admin' ? (
                  <>
                    <button 
                      onClick={() => { handleTactileClick(); setActiveTab('reports'); }}
                      className={`px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'reports' 
                          ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/10' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Sales Reports
                    </button>
                    <button 
                      onClick={() => { handleTactileClick(); setActiveTab('products'); }}
                      className={`px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap relative ${
                        activeTab === 'products' 
                          ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/10' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5" /> Products Tab
                    </button>
                    <button 
                      onClick={() => { handleTactileClick(); setActiveTab('shifts'); }}
                      className={`px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap relative ${
                        activeTab === 'shifts' 
                          ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/10' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-500" /> Cashier Shifts & Branches
                    </button>
                    <button 
                      onClick={() => { handleTactileClick(); setActiveTab('staff'); }}
                      className={`px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'staff' 
                          ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/10' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-500" /> Staff Settings
                    </button>
                    <button 
                      onClick={() => { handleTactileClick(); setActiveTab('expenses'); }}
                      className={`px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'expenses' 
                          ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/10' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5 text-red-500" /> Expenses Ledger
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => { handleTactileClick(); setActiveTab('myshift'); }}
                      className={`px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'myshift' 
                          ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/10' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" /> My Cashier Shift
                    </button>
                    <button 
                      onClick={() => { handleTactileClick(); setActiveTab('expenses'); }}
                      className={`px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'expenses' 
                          ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/10' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5 text-rose-500" /> Log Expenses
                    </button>
                  </>
                )}

                {/* AUDIO TOGGLE */}
                <button
                  onClick={() => { setAudioEnabled(!audioEnabled); if (!audioEnabled) playSound('success'); }}
                  className={`ml-auto px-3.5 py-2 text-xs rounded-lg uppercase tracking-wider font-display font-semibold transition border flex items-center gap-1 ${
                    audioEnabled ? 'bg-zinc-950 text-amber-500 border-amber-500/20' : 'bg-zinc-950 text-zinc-650 border-zinc-850'
                  }`}
                >
                  🔊 {audioEnabled ? 'Sound On' : 'Silent'}
                </button>
              </section>

              {/* VIEW SWITCHER */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {/* A. ordered grids */}
                {activeTab === 'pos' && (
                  <div className="flex flex-col gap-6">
                    
                    {/* FILTERS PANEL */}
                    <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
                      {/* Search */}
                      <div className="relative w-full md:w-72">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                        <input 
                          type="text" 
                          placeholder="Search menu items..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-600 transition"
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Categories list */}
                      <div className="flex gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-850 select-none overflow-x-auto w-full md:w-auto">
                        {['All', ...dynamicCategories].map(cat => (
                          <button
                            key={cat}
                            onClick={() => { handleTactileClick(); setSelectedCategory(cat); }}
                            className={`px-4 py-2 rounded-lg text-xs font-display uppercase tracking-wider font-semibold transition-all shrink-0 ${
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
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {productsWithCategoriesAndFilters.map(p => {
                          const qty = cart[p.id] || 0;
                          return (
                            <motion.div
                              whileTap={{ scale: 0.97 }}
                              onClick={() => addToCart(p.id)}
                              key={p.id}
                              className={`bg-zinc-900 border text-left p-4 rounded-2xl cursor-pointer transition relative overflow-hidden flex flex-col justify-between h-36 border-zinc-800 hover:border-zinc-700/80 hover:bg-zinc-850 ${
                                qty > 0 ? 'ring-2 ring-red-500/80 ring-offset-2 ring-offset-zinc-950border-red-600/50' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <span className="text-3xl filter drop-shadow bg-zinc-950 w-11 h-11 rounded-xl flex items-center justify-center border border-zinc-850">{p.emoji}</span>
                                {qty > 0 && (
                                  <span className="bg-red-600 text-white text-[10px] font-mono font-bold w-6 h-6 rounded-lg flex items-center justify-center animate-bounce shadow">
                                    {qty}
                                  </span>
                                )}
                              </div>
                              <div className="mt-4">
                                <h4 className="text-xs font-display font-bold line-clamp-2 leading-snug tracking-wide uppercase text-zinc-100">
                                  {p.name}
                                </h4>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-sm font-mono font-bold text-amber-500">₱{p.price}</span>
                                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-display font-medium">
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
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
                      
                      <article className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 text-[9px] uppercase font-display font-bold tracking-widest block mb-1">💰 Gross Rev.</span>
                          <div className="text-xl font-mono font-bold text-amber-500">₱{analyticsData.revenue.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">Core Sales sum</p>
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

                      <article className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 text-[9px] uppercase font-display font-bold tracking-widest block mb-1">💸 Exp. Outflow</span>
                          <div className="text-xl font-mono font-bold text-rose-500 font-semibold">₱{analyticsData.totalExpenses.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">Logged expenses</p>
                      </article>

                      <article className="bg-zinc-900 border border-amber-950/40 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-amber-500 text-[9px] uppercase font-display font-bold tracking-widest block mb-1">🏦 Drawer Cash</span>
                          <div className="text-xl font-mono font-bold text-amber-500">₱{analyticsData.expectedRegisterCash.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">Expected cash in drawer</p>
                      </article>

                      <article className="bg-zinc-900 border border-emerald-950/40 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-emerald-400 text-[9px] uppercase font-display font-bold tracking-widest block mb-1">💎 Net Revenue</span>
                          <div className="text-xl font-mono font-bold text-emerald-400 text-glow">₱{analyticsData.netRevenue.toLocaleString()}</div>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-display mt-2 uppercase">Gross minus expenses</p>
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
                            const dateStr = new Date(sh.login_time).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
                            return (
                              <div key={idx} className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">👤 {sh.cashier_name}</span>
                                    <span className="text-[9px] font-mono tracking-widest bg-red-950/40 text-red-400 border border-red-900/40 px-2 rounded-full uppercase">{sh.branch}</span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 font-display font-light">Shift session active since {dateStr}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-right flex-none">
                                  <div>
                                    <span className="text-[9px] text-zinc-500 block uppercase font-bold">Beginning Balance</span>
                                    <span className="text-xs font-mono font-bold text-zinc-300">₱{sh.beginning_balance}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-amber-500 block uppercase font-bold font-mono">Shift Sales</span>
                                    <span className="text-xs font-mono font-bold text-amber-500">₱{sh.total_sales || 0}</span>
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
                              className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-mono text-zinc-200 placeholder-zinc-700 outline-none focus:border-red-550 transition"
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
                          UPDATE STAFF PIN PASSWORD
                        </h4>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Select Account Profile</label>
                          <select
                            value={passwordChangeUser}
                            onChange={(e) => setPasswordChangeUser(e.target.value)}
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
                          <label className="text-[10px] font-display uppercase tracking-wider text-zinc-500 font-semibold">Fresh New PIN Code</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 4321" 
                            value={passwordChangeNew}
                            onChange={(e) => setPasswordChangeNew(e.target.value)}
                            className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-mono text-zinc-200 placeholder-zinc-700 outline-none focus:border-red-500 transition"
                          />
                        </div>

                        <button 
                          onClick={handleChangeStaffPassword}
                          className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-xs font-display font-bold text-white p-3 rounded-xl transition uppercase tracking-wider shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer"
                        >
                          🔐 Change PIN Code Password
                        </button>
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
                                  <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-550 block mt-0.5">{item.role}</span>
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

              </div>
            </main>

            {/* RIGHT SIDEBAR: CART CONTAINER */}
            <aside className="w-96 flex-none bg-zinc-900 border-l border-zinc-850 flex flex-col">
              
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

                <button 
                  onClick={clearEntireCart}
                  disabled={totalItemCount === 0}
                  className="text-[10px] font-display font-medium uppercase tracking-wider text-zinc-500 hover:text-red-500 transition disabled:opacity-30 disabled:hover:text-zinc-550 cursor-pointer"
                >
                  Clear all
                </button>
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
                  onClick={() => { handleTactileClick(); setChargeModalOpen(true); }}
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
                    <option value="Main Branch">Main Branch</option>
                    <option value="Mandaue City Station">Mandaue City Station</option>
                    <option value="Cebu CBD Terminal">Cebu CBD Terminal</option>
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
