-- ============================================================
-- PharmaVision AI — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  pharmacy_name TEXT,
  owner_name    TEXT,
  mobile        TEXT,
  billing_pin   TEXT DEFAULT '1234',
  avatar_url    TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- MEDICINES
CREATE TABLE IF NOT EXISTS public.medicines (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  medicine_name     TEXT NOT NULL,
  batch_number      TEXT,
  expiry_date       DATE,
  quantity          INTEGER DEFAULT 0,
  unit_price        DECIMAL(10,2) DEFAULT 0.00,
  manufacturer      TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- SCAN LOGS
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  raw_ocr_text        TEXT,
  cleaned_ocr_text    TEXT,
  gemini_json_response JSONB,
  confidence_scores   JSONB,
  processing_time_ms  INTEGER,
  validation_status   TEXT,
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- BILLING SESSIONS
CREATE TABLE IF NOT EXISTS public.billing_sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_name  TEXT DEFAULT 'Walk-in Patient',
  status        TEXT DEFAULT 'completed',
  subtotal      DECIMAL(10,2) DEFAULT 0.00,
  tax           DECIMAL(10,2) DEFAULT 0.00,
  discount      DECIMAL(10,2) DEFAULT 0.00,
  total         DECIMAL(10,2) DEFAULT 0.00,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- BILL ITEMS
CREATE TABLE IF NOT EXISTS public.bill_items (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id     UUID REFERENCES public.billing_sessions(id) ON DELETE CASCADE,
  medicine_id    UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
  medicine_name  TEXT,
  quantity       INTEGER,
  unit_price     DECIMAL(10,2),
  subtotal       DECIMAL(10,2),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT,
  type       TEXT DEFAULT 'info',
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profiles"   ON public.profiles          FOR ALL USING (auth.uid() = id);
CREATE POLICY "own_medicines"  ON public.medicines         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_scan_logs"  ON public.scan_logs         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_billing"    ON public.billing_sessions  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_notifs"     ON public.notifications     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_bill_items" ON public.bill_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.billing_sessions
    WHERE billing_sessions.id = bill_items.session_id
    AND   billing_sessions.user_id = auth.uid()
  )
);

-- ── Auto-create profile on signup ────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, pharmacy_name, owner_name, billing_pin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'pharmacy_name', 'My Pharmacy'),
    COALESCE(NEW.raw_user_meta_data->>'owner_name',    'Pharmacist'),
    '1234'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── Storage bucket for medicine images ───────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('medicine-images', 'medicine-images', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "medicine_images_all" ON storage.objects
  FOR ALL USING (bucket_id = 'medicine-images' AND auth.role() = 'authenticated');
