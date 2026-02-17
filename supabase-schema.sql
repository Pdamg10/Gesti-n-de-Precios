-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    "productType" TEXT, -- e.g. sku or similar identifier
    type TEXT NOT NULL, -- 'cauchos', 'baterias', etc.
    medida TEXT NOT NULL,
    "precioListaBs" NUMERIC DEFAULT 0,
    "precioListaUsd" NUMERIC DEFAULT 0,
    "adjustmentCashea" NUMERIC DEFAULT 0,
    "adjustmentTransferencia" NUMERIC DEFAULT 0,
    "adjustmentDivisas" NUMERIC DEFAULT 0,
    "adjustmentCustom" NUMERIC DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT NOW (),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW ()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    "settingKey" TEXT UNIQUE NOT NULL,
    "settingValue" TEXT,
    "taxRate" NUMERIC,
    "globalCashea" NUMERIC,
    "globalTransferencia" NUMERIC,
    "globalDivisas" NUMERIC,
    "globalCustom" NUMERIC
);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow ANONYMOUS access (Public Read/Write)
-- WARNING: This is for development/internal use where Supabase Auth is not used.
-- Since the app manages its own simple auth (admin/worker passwords) and runs
-- mostly client-side or without service role in some places, we need this open
-- for the app to function with just the Anon Key.

CREATE POLICY "Allow Anonymous Select" ON products FOR
SELECT USING (true);

CREATE POLICY "Allow Anonymous Insert" ON products FOR INSERT
WITH
    CHECK (true);

CREATE POLICY "Allow Anonymous Update" ON products FOR
UPDATE USING (true);

CREATE POLICY "Allow Anonymous Delete" ON products FOR DELETE USING (true);

CREATE POLICY "Allow Anonymous Select" ON settings FOR
SELECT USING (true);

CREATE POLICY "Allow Anonymous Insert" ON settings FOR INSERT
WITH
    CHECK (true);

CREATE POLICY "Allow Anonymous Update" ON settings FOR
UPDATE USING (true);

CREATE POLICY "Allow Anonymous Delete" ON settings FOR DELETE USING (true);