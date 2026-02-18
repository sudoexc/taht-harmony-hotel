export type RoomType = 'ECONOM' | 'STANDARD';
export type StayStatus = 'BOOKED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CARD' | 'PAYME' | 'CLICK' | 'OTHER';
export type ExpenseCategory = 'SALARY' | 'INVENTORY' | 'UTILITIES' | 'REPAIR' | 'MARKETING' | 'OTHER';
export type UserRole = 'ADMIN' | 'MANAGER';

export type RevenueByMethod = Record<PaymentMethod, number>;
export type ExpensesByCategory = Record<ExpenseCategory, number>;

export interface TotalsSnapshot {
  revenue_by_method: RevenueByMethod;
  expenses_by_category: ExpensesByCategory;
  profit: number;
  occupancy_rate: number;
  adr: number;
  revpar: number;
  sold_nights: number;
  available_nights: number;
  total_room_revenue: number;
}

export interface Hotel {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
}

export interface Room {
  id: string;
  hotel_id: string;
  number: string;
  floor: number;
  room_type: RoomType;
  capacity: number;
  base_price: number;
  active: boolean;
  notes: string | null;
}

export interface Stay {
  id: string;
  hotel_id: string;
  room_id: string;
  guest_name: string;
  guest_phone: string;
  check_in_date: string;
  check_out_date: string;
  status: StayStatus;
  price_per_night: number;
  weekly_discount_amount: number;
  manual_adjustment_amount: number;
  deposit_expected: number;
  comment: string;
}

export interface CustomPaymentMethod {
  id: string;
  name: string;
  created_at: string;
}

export interface Payment {
  id: string;
  hotel_id: string;
  stay_id: string;
  paid_at: string;
  method: PaymentMethod;
  custom_method_label: string | null;
  amount: number;
  comment: string;
}

export interface Expense {
  id: string;
  hotel_id: string;
  spent_at: string;
  category: ExpenseCategory;
  method: PaymentMethod;
  custom_method_label: string | null;
  amount: number;
  comment: string;
}

export interface Profile {
  id: string;
  hotel_id: string;
  role: UserRole;
  full_name: string;
}

export interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export interface MonthClosing {
  id: string;
  hotel_id: string;
  month: string; // YYYY-MM
  closed_at: string;
  totals_json: TotalsSnapshot | null;
}
