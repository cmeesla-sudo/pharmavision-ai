-- SQL Migration for PharmaVision AI Billing System

-- 1. Create billing_sessions table with requested schema
CREATE TABLE IF NOT EXISTS public.billing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    transaction_id TEXT NOT NULL,
    medicine_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    total_amount NUMERIC NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'paid',
    cashier_name TEXT NOT NULL,
    customer_name TEXT,
    user_id UUID REFERENCES auth.users(id) -- Added to ensure data isolation
);

-- 2. Add RLS policies
ALTER TABLE public.billing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own billing sessions"
ON public.billing_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own billing sessions"
ON public.billing_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Ensure medicines table is consistent with stock reduction
-- (Assuming medicines table already exists from previous steps)
