import { Room, Stay, Payment, Expense, Hotel, MonthClosing, Profile } from '@/types';
import { dateStr, addDays } from '@/lib/format';

const HOTEL_ID = 'taht-hotel-001';
const today = new Date();
const td = dateStr(today);

export const mockHotel: Hotel = {
  id: HOTEL_ID,
  name: 'Taht',
  timezone: 'Asia/Tashkent',
  created_at: today.toISOString(),
};

export const mockRooms: Room[] = [
  { id: 'room-1', hotel_id: HOTEL_ID, number: '1', floor: 1, room_type: 'STANDARD', capacity: 3, base_price: 450000, active: true, notes: 'Own bathroom' },
  { id: 'room-2', hotel_id: HOTEL_ID, number: '2', floor: 1, room_type: 'ECONOM', capacity: 2, base_price: 300000, active: true, notes: 'Shared bathroom, double bed' },
  { id: 'room-3', hotel_id: HOTEL_ID, number: '3', floor: 1, room_type: 'ECONOM', capacity: 2, base_price: 300000, active: true, notes: 'Shared bathroom, separate beds' },
  { id: 'room-4', hotel_id: HOTEL_ID, number: '4', floor: 2, room_type: 'STANDARD', capacity: 1, base_price: 300000, active: true, notes: 'Own bathroom' },
  { id: 'room-5', hotel_id: HOTEL_ID, number: '5', floor: 2, room_type: 'STANDARD', capacity: 2, base_price: 400000, active: true, notes: 'Own bathroom' },
  { id: 'room-6', hotel_id: HOTEL_ID, number: '6', floor: 2, room_type: 'ECONOM', capacity: 1, base_price: 250000, active: true, notes: 'Shared bathroom' },
  { id: 'room-7', hotel_id: HOTEL_ID, number: '7', floor: 2, room_type: 'ECONOM', capacity: 2, base_price: 300000, active: true, notes: 'Shared bathroom, double bed' },
  { id: 'room-8', hotel_id: HOTEL_ID, number: '8', floor: 2, room_type: 'ECONOM', capacity: 2, base_price: 300000, active: true, notes: 'Shared bathroom, separate beds' },
];

export const mockStays: Stay[] = [
  { id: 'stay-1', hotel_id: HOTEL_ID, room_id: 'room-1', guest_name: 'Иванов Петр', guest_phone: '+998901234567', check_in_date: dateStr(addDays(today, -3)), check_out_date: dateStr(addDays(today, 2)), status: 'CHECKED_IN', price_per_night: 450000, weekly_discount_amount: 0, manual_adjustment_amount: 0, deposit_expected: 450000, comment: '' },
  { id: 'stay-2', hotel_id: HOTEL_ID, room_id: 'room-2', guest_name: 'Каримов Алишер', guest_phone: '+998901234568', check_in_date: dateStr(addDays(today, -2)), check_out_date: td, status: 'CHECKED_IN', price_per_night: 300000, weekly_discount_amount: 0, manual_adjustment_amount: 0, deposit_expected: 0, comment: '' },
  { id: 'stay-3', hotel_id: HOTEL_ID, room_id: 'room-3', guest_name: 'Смирнова Анна', guest_phone: '+998901234569', check_in_date: td, check_out_date: dateStr(addDays(today, 3)), status: 'BOOKED', price_per_night: 300000, weekly_discount_amount: 0, manual_adjustment_amount: 0, deposit_expected: 300000, comment: '' },
  { id: 'stay-4', hotel_id: HOTEL_ID, room_id: 'room-5', guest_name: 'Рахимов Бобур', guest_phone: '+998901234570', check_in_date: dateStr(addDays(today, -5)), check_out_date: dateStr(addDays(today, 5)), status: 'CHECKED_IN', price_per_night: 400000, weekly_discount_amount: 200000, manual_adjustment_amount: 0, deposit_expected: 400000, comment: 'VIP' },
  { id: 'stay-5', hotel_id: HOTEL_ID, room_id: 'room-7', guest_name: 'Козлов Дмитрий', guest_phone: '', check_in_date: td, check_out_date: dateStr(addDays(today, 1)), status: 'BOOKED', price_per_night: 300000, weekly_discount_amount: 0, manual_adjustment_amount: 0, deposit_expected: 0, comment: '' },
  { id: 'stay-6', hotel_id: HOTEL_ID, room_id: 'room-4', guest_name: 'Ахмедова Нигора', guest_phone: '+998901234571', check_in_date: dateStr(addDays(today, -4)), check_out_date: dateStr(addDays(today, -1)), status: 'CHECKED_OUT', price_per_night: 300000, weekly_discount_amount: 0, manual_adjustment_amount: 50000, deposit_expected: 0, comment: '' },
];

export const mockPayments: Payment[] = [
  { id: 'pay-1', hotel_id: HOTEL_ID, stay_id: 'stay-1', paid_at: addDays(today, -3).toISOString(), method: 'CASH', amount: 450000, comment: 'Deposit' },
  { id: 'pay-2', hotel_id: HOTEL_ID, stay_id: 'stay-1', paid_at: addDays(today, -1).toISOString(), method: 'CARD', amount: 900000, comment: '' },
  { id: 'pay-3', hotel_id: HOTEL_ID, stay_id: 'stay-2', paid_at: addDays(today, -2).toISOString(), method: 'CARD', amount: 600000, comment: '' },
  { id: 'pay-4', hotel_id: HOTEL_ID, stay_id: 'stay-4', paid_at: addDays(today, -5).toISOString(), method: 'PAYME', amount: 2000000, comment: 'Prepayment' },
  { id: 'pay-5', hotel_id: HOTEL_ID, stay_id: 'stay-6', paid_at: addDays(today, -4).toISOString(), method: 'CLICK', amount: 950000, comment: '' },
  { id: 'pay-6', hotel_id: HOTEL_ID, stay_id: 'stay-3', paid_at: today.toISOString(), method: 'CASH', amount: 300000, comment: 'Deposit' },
];

export const mockExpenses: Expense[] = [
  { id: 'exp-1', hotel_id: HOTEL_ID, spent_at: addDays(today, -2).toISOString(), category: 'UTILITIES', method: 'CARD', amount: 500000, comment: 'Electricity' },
  { id: 'exp-2', hotel_id: HOTEL_ID, spent_at: addDays(today, -1).toISOString(), category: 'INVENTORY', method: 'CASH', amount: 200000, comment: 'Towels' },
  { id: 'exp-3', hotel_id: HOTEL_ID, spent_at: addDays(today, -5).toISOString(), category: 'SALARY', method: 'CARD', amount: 3000000, comment: 'Staff salary' },
  { id: 'exp-4', hotel_id: HOTEL_ID, spent_at: today.toISOString(), category: 'REPAIR', method: 'CASH', amount: 150000, comment: 'Plumbing fix' },
];

export const mockMonthClosings: MonthClosing[] = [];

export const mockProfiles: Profile[] = [
  { id: 'user-admin', hotel_id: HOTEL_ID, role: 'ADMIN', full_name: 'Admin User' },
  { id: 'user-manager', hotel_id: HOTEL_ID, role: 'MANAGER', full_name: 'Manager User' },
];
