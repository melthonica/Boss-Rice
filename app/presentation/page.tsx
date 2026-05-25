'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronLeft, ChevronRight, Sparkles, Check, 
  Presentation, Play, Smartphone, BarChart3, Receipt, Settings
} from 'lucide-react';
import Link from 'next/link';

export default function PresentationPage() {
  const [pitchDeckSlide, setPitchDeckSlide] = useState(0);
  const [patronageRequested, setPatronageRequested] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        setPitchDeckSlide(prev => Math.min(prev + 1, 5));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPitchDeckSlide(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Simple click feedback effect
  const handleTactileClick = () => {
    if (typeof window !== 'undefined') {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime); // Crisp soft tick
        gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } catch (e) {
        // Safe fall-through
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-zinc-100 flex flex-col justify-between p-6 md:p-12 font-sans select-none overflow-y-auto relative">
      
      {/* LUXURY BACKGROUND ANCHORS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
        <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] rounded-full bg-gradient-to-br from-amber-500/10 to-transparent blur-[140px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-gradient-to-tr from-zinc-800/20 to-transparent blur-[140px]" />
      </div>

      {/* HEADER BAR */}
      <header className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-amber-600 to-amber-500 rounded-lg flex items-center justify-center font-serif font-black text-black text-xs tracking-tight shadow-md">
            BR
          </div>
          <div>
            <span className="font-display text-xs uppercase tracking-widest text-amber-500 font-bold block">Boss Rice Première</span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Operations Presentation · Luxury Standard 2026</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="hidden md:inline-block text-[10px] uppercase font-mono tracking-wider text-zinc-500 bg-zinc-900 border border-zinc-850 px-2.5 py-1 rounded">
            Press SPACE or ← / → to Navigate
          </span>
          <Link 
            href="/"
            className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 rounded-lg transition"
          >
            <span>Back to Live POS</span>
          </Link>
        </div>
      </header>

      {/* CORE PRESENTER CONTENT */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-6 my-auto min-h-[460px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={pitchDeckSlide}
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -25 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center"
          >
            {/* SLIDE 1: INTRO TITLE */}
            {pitchDeckSlide === 0 && (
              <>
                <div className="lg:col-span-7 space-y-6 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-amber-400">CLASS-LEADING POS ENVIRONMENT</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light text-zinc-100 tracking-tight leading-[1.15]">
                    Boss Rice <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-600 block italic font-semibold mt-1">Première POS</span>
                  </h1>
                  <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-xl font-light">
                    An elite point of sale ecosystem designed specifically for the fast-paced, high-volume counter dynamics of Filipino culinary concepts and boutique retail. Where lightning speed meets pristine operational integrity.
                  </p>
                  <div className="pt-4 flex flex-wrap gap-4 items-center border-t border-zinc-900">
                    <div>
                      <span className="text-[10px] text-amber-500 uppercase font-bold block tracking-wider">EASY ONBOARDING</span>
                      <span className="text-xs text-zinc-400 mt-0.5 block">Launch in under 10 minutes</span>
                    </div>
                    <div className="w-px h-8 bg-zinc-850" />
                    <div>
                      <span className="text-[10px] text-amber-500 uppercase font-bold block tracking-wider">IMMUTABLE OFFLINE</span>
                      <span className="text-xs text-zinc-400 mt-0.5 block">Completely resilient to network failures</span>
                    </div>
                    <div className="w-px h-8 bg-zinc-850" />
                    <div>
                      <span className="text-[10px] text-amber-500 uppercase font-bold block tracking-wider">LOCAL COHESION</span>
                      <span className="text-xs text-zinc-400 mt-0.5 block">Configured for native payment patterns</span>
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-5">
                  <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-850 relative overflow-hidden group hover:border-amber-500/30 transition duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
                    
                    <div className="space-y-4">
                      <span className="text-[9px] text-zinc-500 font-mono block uppercase tracking-widest">Interactive Terminal Mockup</span>
                      <div className="border border-zinc-850 rounded-xl bg-zinc-950 p-4 space-y-3 shadow-inner">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                          <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                            PRINCIPLE STATION ADMIN
                          </span>
                          <span className="text-[9px] font-mono text-emerald-500">● SECURED & ONLINE</span>
                        </div>
                        <div className="space-y-1.5 py-1">
                          <div className="h-2 w-2/3 bg-zinc-900 rounded" />
                          <div className="h-1.5 w-1/2 bg-zinc-950 border border-zinc-900 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div className="border border-zinc-900 p-2 rounded bg-zinc-900/30 text-center">
                            <span className="text-[8px] text-zinc-500 block uppercase">Weekly Gross Sales</span>
                            <span className="text-xs font-mono font-bold text-amber-500">₱450,230</span>
                          </div>
                          <div className="border border-zinc-900 p-2 rounded bg-zinc-900/30 text-center">
                            <span className="text-[8px] text-zinc-500 block uppercase">Net Reserve Balance</span>
                            <span className="text-xs font-mono font-bold text-emerald-400">₱412,400</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10.5px] text-zinc-500 leading-normal italic text-center">
                        *LIFESTYLE PERSPECTIVE INSTRUCTION: Imagine a gorgeous matte charcoal dual-screen register on an elegant solid acacia counter. Warm lighting reflecting metallic details.*
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* SLIDE 2: THE PROBLEM (CHAOS OF CONGLOMERATES) */}
            {pitchDeckSlide === 1 && (
              <>
                <div className="lg:col-span-6 space-y-6 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-red-400">THE CONVENTIONAL DISASTER</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif font-light text-zinc-100 tracking-tight leading-[1.2]">
                    The Clumsy Chaos of <span className="italic block text-zinc-400">Generic Imported POS Platforms</span>
                  </h2>
                  <p className="text-zinc-400 text-sm leading-relaxed font-light">
                    Imported legacy POS systems are designed for Western multi-billion supermarket giants. They force local Filipino operators to fight technical complexity, leading to lines stretching out the door and stressed cashiers.
                  </p>

                  <div className="space-y-4 pt-1">
                    <div className="flex gap-3">
                      <span className="text-amber-500 font-mono text-sm shrink-0">I.</span>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Unforgiving Interface Bloat</h4>
                        <p className="text-xs text-zinc-500 mt-0.5 font-light">Endless nested dropdowns and tiny dialog windows force cashiers to click 10 times just to handle a basic combo swap.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-amber-500 font-mono text-sm shrink-0">II.</span>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">The Blind Reconciliation Abyss</h4>
                        <p className="text-xs text-zinc-500 mt-0.5 font-light">Beginning registry cash inputs, actual grocery sales, and local petty cash expenses are manually tracked on loose papers, leaking revenue hourly.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-amber-500 font-mono text-sm shrink-0">III.</span>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Network Hostage</h4>
                        <p className="text-xs text-zinc-500 mt-0.5 font-light">Cloud-only setups completely lock up or reset during common local internet dips, pausing customer orders and failing queues.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="border border-zinc-850 bg-zinc-950 p-8 rounded-3xl space-y-6 text-center shadow-lg relative overflow-hidden">
                    <div className="h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent absolute top-0 left-0 right-0 animate-pulse" />
                    
                    <div className="p-4 bg-zinc-900/40 border border-zinc-900 rounded-2xl text-left space-y-3">
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[10px] font-mono uppercase tracking-widest">Legacy Server Disconnection</span>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono leading-relaxed bg-[#050505] p-3 rounded border border-zinc-900">
                        [FATAL SERVER TIMEOUT] Gateway Error 504.<br/>
                        Offline processing disallowed by remote administrator policy.<br/>
                        Stalled Queue Count: 14 guests...
                      </p>
                    </div>

                    <span className="text-[10px] text-zinc-500 font-display block uppercase leading-snug">
                      *EDITORIAL VISUAL BRIEF: A shadow-heavy depiction of a dusty manual receipts book, rusted cash box, and tangled thermal printer cables.*
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* SLIDE 3: THE ULTIMATE FILIPINO SOLUTION */}
            {pitchDeckSlide === 2 && (
              <>
                <div className="lg:col-span-7 space-y-6 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400">THE NOBLE FIT</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif font-light text-zinc-100 tracking-tight leading-[1.2]">
                    Premium Simplicity Tailored for the <span className="text-amber-500 block italic font-semibold mt-1">Filipino Business Landscape</span>
                  </h2>
                  <p className="text-zinc-400 text-sm leading-relaxed font-light">
                    Boss Rice Première was built directly inside local food stalls, busy cafe counters, and multi-location retail joints. We replaced confusing corporate matrices with fluid, hyper-focused actions.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="p-4 bg-zinc-900/30 border border-zinc-850/60 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Complete Offline Independence</span>
                      <p className="text-xs text-zinc-400 leading-relaxed font-light">
                        Allows continuous order taking without interruption. Auto-saves locally to browser database and pushes updates seamlessly to the cloud the moment the signal returns.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-zinc-900/30 border border-zinc-850/60 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Filipino Tender Integration</span>
                      <p className="text-xs text-zinc-400 leading-relaxed font-light">
                        Includes built-in Beginning Balance inputs, live Cashier switchouts, manual store Expenses logging with petty cash tracking, and easy GCash/Maya tags.
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-900/30 border border-zinc-850/60 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Multi-Branch Administration</span>
                      <p className="text-xs text-zinc-400 leading-relaxed font-light">
                        Compare bazaar stalls, flagship bistros, or franchise outposts in one single, responsive master ledger interface.
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-900/30 border border-zinc-850/60 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Tailored Modification Scope</span>
                      <p className="text-xs text-zinc-400 leading-relaxed font-light">
                        Easily change catalog layouts, rename items, run custom promos, and manage tax structures dynamically from the UI, with no coding needed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 rounded-3xl border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-500">Local Cache Ledger Status</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    </div>
                    <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-500">Offline Backlog:</span>
                        <span className="text-amber-500 font-bold">14 Slips Cached</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-500">Operational Sync:</span>
                        <span className="text-emerald-400">READY TO RECONNECT</span>
                      </div>
                      <div className="pt-2 border-t border-zinc-900 text-center font-display text-[9px] text-zinc-500">
                        *Guarantees zero database loss during outages*
                      </div>
                    </div>
                    <p className="text-[10.5px] text-zinc-500 leading-normal italic text-center">
                      *LIFESTYLE CAPTION BRIEF: A high contrast shot of a stylish Filipino barista in an upscale, minimalist coffee and food kiosk, smiling while handing a premium paper bag.*
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* SLIDE 4: SPECTRUM OF CORE FEATURES */}
            {pitchDeckSlide === 3 && (
              <>
                <div className="lg:col-span-12 space-y-8 text-center pt-2">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mx-auto">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-amber-400">THE COMPREHENSIVE LANDSCAPE</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-serif font-light text-zinc-100 tracking-tight leading-[1.2] max-w-2xl mx-auto">
                      Four Symmetrical Pillars Built to perform as <span className="italic">One Cohesive Body</span>
                    </h2>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl mx-auto font-light">
                      We eliminated the need to purchase multiple third-party software licenses. This POS combines customer service, cashier sheets, expenses, and analytics report exporting in one unified frame.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left pt-2">
                    <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-850 hover:border-amber-500/25 transition group">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 text-amber-400 mb-4 group-hover:scale-105 transition">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Fluid Tactile POS Interface</h4>
                      <p className="text-xs text-zinc-500 mt-2 font-light leading-relaxed">Lightning-fast cart building, multi-tier pricing filters, instant coupon/add-on modifiers, and responsive change calculation.</p>
                    </div>

                    <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-850 hover:border-amber-500/25 transition group">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 text-amber-400 mb-4 group-hover:scale-105 transition">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Elite Financial Intelligence</h4>
                      <p className="text-xs text-zinc-500 mt-2 font-light leading-relaxed">Filter gross velocity by branch, day, or hourly peak maps. Gives you full, accurate reporting of Beginning Balance vs Net Daily Revenues.</p>
                    </div>

                    <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-850 hover:border-amber-500/25 transition group">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 text-amber-400 mb-4 group-hover:scale-105 transition">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Integrated Cashier Expenses</h4>
                      <p className="text-xs text-zinc-500 mt-2 font-light leading-relaxed">Allow staff to log ice purchase, logistics, or water bills directly on the active register drawer, logging petty cash to ensure accurate reconciliations.</p>
                    </div>

                    <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-850 hover:border-amber-500/25 transition group">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 text-amber-400 mb-4 group-hover:scale-105 transition">
                        <Settings className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Flexible Catalog Adjustments</h4>
                      <p className="text-xs text-zinc-500 mt-2 font-light leading-relaxed">Adapt live menus instantly. Manage prices, disable out-of-stock items, or update specific cashier access parameters with simple toggles.</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-600 tracking-wider uppercase font-mono italic">
                    *MOCK BRIEF: Visual diagram detailing beautiful data grids, custom color cards, and structured, high-luxury POS interface blueprints.*
                  </p>
                </div>
              </>
            )}

            {/* SLIDE 5: CUSTOMER EXPERIENCE */}
            {pitchDeckSlide === 4 && (
              <>
                <div className="lg:col-span-6 space-y-6 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                    <span className="text-amber-400 font-mono text-[10px] uppercase tracking-wider">THE GUEST STANDARD</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif font-light text-zinc-100 tracking-tight leading-[1.2]">
                    High Hospitality Handover: <span className="text-amber-500 block italic font-semibold mt-1">Speed, Clarity and Absolute Trust</span>
                  </h2>
                  <p className="text-zinc-400 text-sm leading-relaxed font-light">
                    The highest tier of luxury is absolute fluidity. By keeping interface clicks to a minimum, cashiers deliver warm, focused hospitality instead of staring blankly at a frozen machine screen.
                  </p>
                  <p className="text-zinc-400 text-sm leading-relaxed font-light">
                    Guests receive transparent checkout steps: receipt lines are readable, discounts are immediately registered, and the exact change is displayed in Philippine Pesos. Real loyalty is built in the final 5 seconds of the checkout journey.
                  </p>

                  <div className="pt-2 grid grid-cols-3 gap-4 border-t border-zinc-900 text-center">
                    <div>
                      <span className="text-sm font-mono font-bold text-amber-500 block">₱0.00</span>
                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1 block">Tender Discrepancies</span>
                    </div>
                    <div>
                      <span className="text-sm font-mono font-bold text-amber-500 block">&lt; 3 Sec</span>
                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1 block">Register Handover Speed</span>
                    </div>
                    <div>
                      <span className="text-sm font-mono font-bold text-amber-500 block">100%</span>
                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1 block">Local Trust Assurance</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="border border-zinc-850 bg-zinc-950 p-6 rounded-3xl space-y-6">
                    <div className="p-4 bg-zinc-900/60 border border-zinc-850 text-left rounded-2xl relative overflow-hidden">
                      <span className="text-[8px] tracking-widest uppercase font-mono text-amber-500 block mb-3">Counter Transaction Receipt Layout</span>
                      
                      <div className="bg-black/40 border border-zinc-900 p-4 rounded-xl space-y-3 font-mono text-[10.5px] text-zinc-400">
                        <div className="text-center text-[11px] font-bold text-zinc-200">BOSS RICE PREMIUM REGISTER</div>
                        <div className="h-px border-t border-dashed border-zinc-800" />
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>2x Premium Garlic Beef Rice</span>
                            <span>₱360.00</span>
                          </div>
                          <div className="flex justify-between text-zinc-600">
                            <span>- Cashier: Station Staff A</span>
                            <span className="text-emerald-500/80">Main Branch</span>
                          </div>
                        </div>
                        <div className="h-px bg-zinc-900" />
                        <div className="flex justify-between text-amber-400 font-bold">
                          <span>AGGREGATE VAL:</span>
                          <span>₱360.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>AMOUNTS TENDERED:</span>
                          <span>₱500.00</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold text-[11px]">
                          <span>CHANGE VALUE:</span>
                          <span>₱140.00</span>
                        </div>
                        <div className="h-px border-t border-dashed border-zinc-800" />
                        <div className="text-center text-[9px] text-zinc-500 uppercase">Mabuhay! Thank you for dining with us.</div>
                      </div>
                    </div>

                    <p className="text-[10.5px] text-zinc-500 leading-normal italic text-center">
                      *METRIC CAPTION BRIEF: Sleek brass macro close-up of a contactless QR screen casting subtle premium amber shadows on a fine polished countertop.*
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* SLIDE 6: THE CLOSING DEPLOYMENT INVITATION */}
            {pitchDeckSlide === 5 && (
              <>
                <div className="lg:col-span-7 space-y-6 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                    <span className="text-amber-500 font-mono text-[10px] font-bold">✨ THE CUSTOM ARRANGEMENT</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl lg:text-5xl font-serif font-light text-zinc-100 tracking-tight leading-[1.15]">
                    Let&apos;s Set Up a <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200 italic font-semibold block mt-1">Bespoke Launch Blueprint</span>
                  </h2>
                  
                  <p className="text-zinc-400 text-sm leading-relaxed font-light">
                    Every instance of Boss Rice Première is uniquely customized. We map out your custom food catalog, brand identity colors, tax logic, petty cash policies, and specific outlet rosters.
                  </p>
                  <p className="text-zinc-400 text-sm leading-relaxed font-light">
                    We work with local Filipino food concepts to provide reliable pos solutions that scale flawlessly from a single pop-up stall to hundreds of chain locations nationwide with robust multi-branch syncing.
                  </p>

                  <div className="p-5 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950 border border-amber-500/30 rounded-2xl">
                    <h4 className="text-xs font-bold uppercase text-amber-500 tracking-widest mb-2 flex items-center gap-1.5">
                      ⭐️ CUSTOM COMMISSION INCLUDE LIST
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-light">
                      All custom deployments include full database configuration, responsive UI optimization for tablets/terminals, thermal printer layout design, and priority support.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="bg-[#111111] border-2 border-dashed border-amber-500/20 p-8 rounded-3xl relative overflow-hidden transition duration-300">
                    <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-amber-500/5 rounded-full blur-2xl" />
                    <div className="space-y-6 relative z-10 text-center">
                      <span className="text-[10px] font-medium text-amber-400 uppercase tracking-widest block">EXQUISITE BRIEFING OFFER</span>
                      
                      <h3 className="font-serif text-2xl text-zinc-100">
                        Boss Rice Première
                      </h3>
                      
                      <div className="space-y-2 text-xs font-mono text-zinc-400 border-t border-b border-zinc-900 py-4">
                        <p className="text-amber-500 font-bold uppercase tracking-widest text-[9px]">LAUNCH CONCIERGE</p>
                        <p className="text-zinc-300">concierge@bossricepos.com</p>
                        <p className="text-zinc-400">+63 (2) 8800 LLOYD</p>
                        <p className="text-zinc-550 text-[10px]">Fort Bonifacio Global City, Metro Manila</p>
                      </div>

                      {patronageRequested ? (
                        <div className="p-3 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300 font-bold font-mono text-xs">
                          ✓ BRIEFING REQUEST SAVED
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            handleTactileClick();
                            setPatronageRequested(true);
                          }}
                          className="w-full py-3 bg-[#be973d] hover:bg-amber-600 active:scale-95 text-black text-[10.5px] uppercase font-black tracking-widest rounded-xl transition duration-150 shadow-lg cursor-pointer"
                        >
                          Request Custom Demo Briefing
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FOOTER BAR NAVIGATION */}
      <footer className="relative z-10 pt-5 border-t border-zinc-900 flex flex-col md:flex-row gap-4 items-center justify-between text-zinc-500 text-[11px]">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Boss Rice Première System</span>
          <span className="mx-2 text-zinc-800">|</span>
          <span className="text-amber-500/80 uppercase tracking-wider font-mono">Slide {pitchDeckSlide + 1} of 6</span>
        </div>

        {/* DOTS & TITLES SLIDES TRIGGER */}
        <div className="flex gap-2 flex-wrap justify-center">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const labels = ["Intro", "The Dilution", "The Solution", "The Spectrum", "The Handover", "The Invitation"];
            return (
              <button
                key={idx}
                onClick={() => { handleTactileClick(); setPitchDeckSlide(idx); }}
                className={`px-3 py-1.5 text-[9px] uppercase tracking-wider rounded font-mono border transition ${
                  pitchDeckSlide === idx 
                    ? 'bg-amber-500 text-black border-amber-400 font-bold' 
                    : 'bg-zinc-950 text-zinc-600 hover:text-zinc-300 border-zinc-900 hover:border-zinc-800'
                }`}
              >
                {idx + 1}. {labels[idx]}
              </button>
            );
          })}
        </div>

        {/* CHEVRONS */}
        <div className="flex gap-2 shrink-0">
          <button
            disabled={pitchDeckSlide === 0}
            onClick={() => { handleTactileClick(); setPitchDeckSlide(prev => Math.max(prev - 1, 0)); }}
            className="p-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            disabled={pitchDeckSlide === 5}
            onClick={() => { handleTactileClick(); setPitchDeckSlide(prev => Math.min(prev + 1, 5)); }}
            className="p-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
          >
            <span className="text-[10px] uppercase font-bold shrink-0">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

    </div>
  );
}
