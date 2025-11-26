-- Add Google OAuth tokens to profiles
ALTER TABLE public.profiles
ADD COLUMN google_access_token TEXT,
ADD COLUMN google_refresh_token TEXT,
ADD COLUMN google_token_expiry TIMESTAMP WITH TIME ZONE;

-- Create calendar events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  google_event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  travel_time_seconds INTEGER,
  recommended_leave_time TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, google_event_id)
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
CREATE POLICY "Users can view own calendar events"
ON public.calendar_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events"
ON public.calendar_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events"
ON public.calendar_events
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events"
ON public.calendar_events
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for calendar_events
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create push subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for push_subscriptions
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create financial records table
CREATE TABLE public.financial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for financial_records
CREATE POLICY "Users can view own financial records"
ON public.financial_records
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own financial records"
ON public.financial_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own financial records"
ON public.financial_records
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own financial records"
ON public.financial_records
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for financial_records
CREATE TRIGGER update_financial_records_updated_at
BEFORE UPDATE ON public.financial_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create wishlist items table
CREATE TABLE public.wishlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 5),
  purchased BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wishlist_items
CREATE POLICY "Users can view own wishlist items"
ON public.wishlist_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist items"
ON public.wishlist_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishlist items"
ON public.wishlist_items
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist items"
ON public.wishlist_items
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for wishlist_items
CREATE TRIGGER update_wishlist_items_updated_at
BEFORE UPDATE ON public.wishlist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();