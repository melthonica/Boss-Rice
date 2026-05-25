-- =========================================================================
--  BOSS RICE POINT OF SALE (POS) - SUPABASE DATABASE MIGRATION SCRIPT
-- =========================================================================
-- Purpose: Execute this script in your Supabase SQL Editor to provision
--          the dynamic columns and secure schemas required for staff login,
--          multiple branch cashiers tracking, beginning shift balances, and costs ledger.
-- =========================================================================

-- 1. STAFF USERS TABLE
CREATE TABLE IF NOT EXISTS public.pos_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- Access PIN number
    role TEXT NOT NULL DEFAULT 'cashier', -- 'admin' or 'cashier'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Initial Baseline Users (Matched with Boss Rice authentic credentials)
INSERT INTO public.pos_users (username, password, role)
VALUES 
    ('admin', '1234', 'admin'),
    ('cashier', '5678', 'cashier')
ON CONFLICT (username) DO NOTHING;


-- 2. CASHIER SHIFTS & ASSIGNED BRANCHES REGISTER
CREATE TABLE IF NOT EXISTS public.pos_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_name TEXT NOT NULL,
    branch TEXT NOT NULL, -- e.g. 'Mandaue City', 'Cebu City CBD'
    beginning_balance NUMERIC NOT NULL DEFAULT 0,
    total_sales NUMERIC NOT NULL DEFAULT 0,
    login_time TIMESTAMPTZ DEFAULT now(),
    logout_time TIMESTAMPTZ,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- 3. EXPENSES LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.pos_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL, -- Name or name description of items bought
    cost NUMERIC NOT NULL DEFAULT 0, -- Amount spent for materials
    cashier_name TEXT NOT NULL,
    branch TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- 4. ENSURE CORE TRANSACTION REGISTER TABLE (pos_orders)
--    If you already have a table for records, make sure it has the following columns:
CREATE TABLE IF NOT EXISTS public.pos_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL,
    items TEXT[] NOT NULL DEFAULT '{}',
    total NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'Cash', -- 'Cash' or 'GCash'
    cashier_name TEXT,
    branch TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- 5. ENABLE ROW LEVEL SECURITY (RLS) FOR HIGH-INTEGRITY PROTECTION
ALTER TABLE public.pos_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;


-- 6. GENERATE PUBLIC READ/WRITE POLICIES FOR SIMPLE CLOUD SYNC
--    (Adjust according to your corporate access policies in Supabase settings if desired)

CREATE POLICY "Allow public read of pos_users" ON public.pos_users 
    FOR SELECT USING (true);
CREATE POLICY "Allow public write of pos_users" ON public.pos_users 
    FOR ALL USING (true);

CREATE POLICY "Allow public read of pos_shifts" ON public.pos_shifts 
    FOR SELECT USING (true);
CREATE POLICY "Allow public write of pos_shifts" ON public.pos_shifts 
    FOR ALL USING (true);

CREATE POLICY "Allow public read of pos_expenses" ON public.pos_expenses 
    FOR SELECT USING (true);
CREATE POLICY "Allow public write of pos_expenses" ON public.pos_expenses 
    FOR ALL USING (true);

CREATE POLICY "Allow public read of pos_orders" ON public.pos_orders 
    FOR SELECT USING (true);
CREATE POLICY "Allow public write of pos_orders" ON public.pos_orders 
    FOR ALL USING (true);
