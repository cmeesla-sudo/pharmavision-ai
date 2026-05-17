-- Final Production-Ready SQL for PharmaVision AI Billing

-- 1. Create billing_transactions table
CREATE TABLE IF NOT EXISTS public.billing_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID NOT NULL REFERENCES public.medicines(id),
    medicine_name TEXT NOT NULL, -- Cached for history clarity
    quantity_sold INTEGER NOT NULL,
    total_amount NUMERIC NOT NULL,
    sold_by UUID NOT NULL REFERENCES auth.users(id),
    transaction_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable RLS
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for billing_transactions
CREATE POLICY "Users can view their own transactions"
ON public.billing_transactions FOR SELECT
USING (auth.uid() = sold_by);

CREATE POLICY "Users can insert their own transactions"
ON public.billing_transactions FOR INSERT
WITH CHECK (auth.uid() = sold_by);

-- 4. RLS Policies for medicines
-- Ensure users can select and update stock
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.medicines;
CREATE POLICY "Allow authenticated access to medicines"
ON public.medicines FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 5. RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can manage their own notifications"
ON public.notifications FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_sold_by ON public.billing_transactions(sold_by);
CREATE INDEX IF NOT EXISTS idx_transactions_time ON public.billing_transactions(transaction_time);
