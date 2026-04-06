-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Businesses table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  gst_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'cashier')),
  username TEXT UNIQUE NOT NULL,
  pin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products/Menu Items
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- in paise
  is_veg BOOLEAN DEFAULT true,
  has_portions BOOLEAN DEFAULT false,
  portions JSONB, -- {half: 5000, full: 10000}
  stock_quantity INTEGER DEFAULT 0,
  hsn_code TEXT,
  gst_rate INTEGER DEFAULT 0, -- percentage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add-ons/Modifiers
CREATE TABLE addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- in paise
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  udhaar_balance INTEGER DEFAULT 0, -- in paise
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, phone)
);

-- Orders/Bills
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  table_number TEXT,
  items JSONB NOT NULL, -- [{product_id, name, qty, price, addons}]
  subtotal INTEGER NOT NULL, -- in paise
  cgst INTEGER DEFAULT 0,
  sgst INTEGER DEFAULT 0,
  igst INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  payment_mode TEXT, -- cash, upi, split, udhaar
  payment_details JSONB, -- {cash: 5000, upi: 5000}
  status TEXT DEFAULT 'completed', -- completed, voided
  voided_by UUID REFERENCES profiles(id),
  voided_at TIMESTAMPTZ,
  kot_printed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(business_id, bill_number)
);

-- Sync Queue (for offline-first)
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- insert, update, delete
  record_id UUID NOT NULL,
  payload JSONB,
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KOT/Tables
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  status TEXT DEFAULT 'available', -- available, occupied
  current_order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, table_number)
);

-- RLS Policies
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Businesses: Users can only see their business
CREATE POLICY "Users can view own business" ON businesses
  FOR SELECT USING (
    id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own business" ON businesses
  FOR UPDATE USING (
    id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

-- Categories: Business-scoped
CREATE POLICY "Users can view own business categories" ON categories
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage categories" ON categories
  FOR ALL USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

-- Products: Business-scoped
CREATE POLICY "Users can view own business products" ON products
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage products" ON products
  FOR ALL USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

-- Addons: Business-scoped
CREATE POLICY "Users can view own business addons" ON addons
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage addons" ON addons
  FOR ALL USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

-- Customers: Business-scoped
CREATE POLICY "Users can view own business customers" ON customers
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage customers" ON customers
  FOR ALL USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

-- Orders: Business-scoped
CREATE POLICY "Users can view own business orders" ON orders
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update orders" ON orders
  FOR UPDATE USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

-- Sync Queue: Business-scoped
CREATE POLICY "Users can view own business sync queue" ON sync_queue
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage sync queue" ON sync_queue
  FOR ALL USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

-- Tables: Business-scoped
CREATE POLICY "Users can view own business tables" ON tables
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage tables" ON tables
  FOR ALL USING (
    business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_orders_business ON orders(business_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_customers_business_phone ON customers(business_id, phone);
CREATE INDEX idx_sync_queue_synced ON sync_queue(synced, created_at);
