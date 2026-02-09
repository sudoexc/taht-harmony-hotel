
-- Enums
CREATE TYPE public.room_type AS ENUM ('ECONOM', 'STANDARD');
CREATE TYPE public.stay_status AS ENUM ('BOOKED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');
CREATE TYPE public.payment_method AS ENUM ('CASH', 'CARD', 'PAYME', 'CLICK');
CREATE TYPE public.expense_category AS ENUM ('SALARY', 'INVENTORY', 'UTILITIES', 'REPAIR', 'MARKETING', 'OTHER');
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'MANAGER');

-- Hotels
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Tashkent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's hotel_id
CREATE OR REPLACE FUNCTION public.get_user_hotel_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hotel_id FROM public.profiles WHERE id = _user_id
$$;

-- Rooms
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  number TEXT NOT NULL,
  floor INT NOT NULL DEFAULT 1,
  room_type room_type NOT NULL DEFAULT 'STANDARD',
  capacity INT NOT NULL DEFAULT 2,
  base_price NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Stays
CREATE TABLE public.stays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  status stay_status NOT NULL DEFAULT 'BOOKED',
  price_per_night NUMERIC NOT NULL DEFAULT 0,
  weekly_discount_amount NUMERIC NOT NULL DEFAULT 0,
  manual_adjustment_amount NUMERIC NOT NULL DEFAULT 0,
  deposit_expected NUMERIC NOT NULL DEFAULT 0,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  stay_id UUID REFERENCES public.stays(id) ON DELETE CASCADE NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method payment_method NOT NULL DEFAULT 'CASH',
  amount NUMERIC NOT NULL DEFAULT 0,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  spent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  category expense_category NOT NULL DEFAULT 'OTHER',
  method payment_method NOT NULL DEFAULT 'CASH',
  amount NUMERIC NOT NULL DEFAULT 0,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Month Closings
CREATE TABLE public.month_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  totals_json JSONB,
  UNIQUE (hotel_id, month)
);
ALTER TABLE public.month_closings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Hotels: users can only see their hotel
CREATE POLICY "Users can view their hotel" ON public.hotels
  FOR SELECT TO authenticated
  USING (id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Admins can update their hotel" ON public.hotels
  FOR UPDATE TO authenticated
  USING (id = public.get_user_hotel_id(auth.uid()) AND public.has_role(auth.uid(), 'ADMIN'));

-- Profiles: users can view profiles in their hotel
CREATE POLICY "Users can view hotel profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- User Roles
CREATE POLICY "Users can view roles in hotel" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT p.id FROM public.profiles p WHERE p.hotel_id = public.get_user_hotel_id(auth.uid())));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- Rooms: hotel scoped
CREATE POLICY "Users can view hotel rooms" ON public.rooms
  FOR SELECT TO authenticated
  USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Admins can manage rooms" ON public.rooms
  FOR ALL TO authenticated
  USING (hotel_id = public.get_user_hotel_id(auth.uid()) AND public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Managers can manage rooms" ON public.rooms
  FOR ALL TO authenticated
  USING (hotel_id = public.get_user_hotel_id(auth.uid()) AND public.has_role(auth.uid(), 'MANAGER'));

-- Stays: hotel scoped
CREATE POLICY "Users can view hotel stays" ON public.stays
  FOR SELECT TO authenticated
  USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Users can manage stays" ON public.stays
  FOR ALL TO authenticated
  USING (hotel_id = public.get_user_hotel_id(auth.uid()));

-- Payments: hotel scoped
CREATE POLICY "Users can view hotel payments" ON public.payments
  FOR SELECT TO authenticated
  USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Users can manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (hotel_id = public.get_user_hotel_id(auth.uid()));

-- Expenses: hotel scoped
CREATE POLICY "Users can view hotel expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Users can manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (hotel_id = public.get_user_hotel_id(auth.uid()));

-- Month Closings: hotel scoped
CREATE POLICY "Users can view month closings" ON public.month_closings
  FOR SELECT TO authenticated
  USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Admins can manage month closings" ON public.month_closings
  FOR ALL TO authenticated
  USING (hotel_id = public.get_user_hotel_id(auth.uid()) AND public.has_role(auth.uid(), 'ADMIN'));

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, hotel_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'hotel_id')::UUID,
      (SELECT id FROM public.hotels LIMIT 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
