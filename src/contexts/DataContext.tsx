import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Expense, Hotel, MonthClosing, Payment, Room, Stay, UserWithRole } from '@/types';
import { apiFetch } from '@/lib/api';
import { getDateOnly } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';

interface DataContextType {
  hotel: Hotel;
  setHotel: (hotel: Hotel) => Promise<void>;
  rooms: Room[];
  stays: Stay[];
  payments: Payment[];
  expenses: Expense[];
  monthClosings: MonthClosing[];
  users: UserWithRole[];
  loading: boolean;
  addRoom: (room: Room) => Promise<void>;
  updateRoom: (room: Room) => Promise<void>;
  removeRoom: (roomId: string) => Promise<void>;
  addStay: (stay: Stay) => Promise<void>;
  updateStay: (stay: Stay) => Promise<void>;
  removeStay: (stayId: string) => Promise<void>;
  addPayment: (payment: Payment) => Promise<void>;
  updatePayment: (payment: Payment) => Promise<void>;
  removePayment: (paymentId: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  removeExpense: (expenseId: string) => Promise<void>;
  addUser: (payload: { full_name: string; email: string; password: string; role: UserWithRole['role'] }) => Promise<void>;
  updateUserRole: (userId: string, role: UserWithRole['role']) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  closePreviousMonth: () => Promise<void>;
  reopenMonth: (month: string) => Promise<void>;
  isMonthClosed: (month: string) => boolean;
  refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const EMPTY_HOTEL: Hotel = {
  id: '',
  name: '',
  timezone: '',
  created_at: '',
};

const toNumber = (value: unknown) => (value === null || value === undefined ? 0 : Number(value));

const normalizeRoom = (room: Room): Room => ({
  ...room,
  floor: toNumber(room.floor),
  capacity: toNumber(room.capacity),
  base_price: toNumber(room.base_price),
});

const normalizeStay = (stay: Stay): Stay => ({
  ...stay,
  check_in_date: getDateOnly(stay.check_in_date),
  check_out_date: getDateOnly(stay.check_out_date),
  price_per_night: toNumber(stay.price_per_night),
  weekly_discount_amount: toNumber(stay.weekly_discount_amount),
  manual_adjustment_amount: toNumber(stay.manual_adjustment_amount),
  deposit_expected: toNumber(stay.deposit_expected),
});

const normalizePayment = (payment: Payment): Payment => ({
  ...payment,
  amount: toNumber(payment.amount),
});

const normalizeExpense = (expense: Expense): Expense => ({
  ...expense,
  amount: toNumber(expense.amount),
});

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [hotel, setHotelState] = useState<Hotel>(EMPTY_HOTEL);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthClosings, setMonthClosings] = useState<MonthClosing[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const usersPromise = role === 'ADMIN' ? apiFetch<UserWithRole[]>('/users') : Promise.resolve([]);
      const [hotelRes, roomsRes, staysRes, paymentsRes, expensesRes, closingsRes, usersRes] = await Promise.all([
        apiFetch<Hotel>('/hotels/me'),
        apiFetch<Room[]>('/rooms'),
        apiFetch<Stay[]>('/stays'),
        apiFetch<Payment[]>('/payments'),
        apiFetch<Expense[]>('/expenses'),
        apiFetch<MonthClosing[]>('/month-closings'),
        usersPromise,
      ]);

      setHotelState(hotelRes || EMPTY_HOTEL);
      setRooms((roomsRes || []).map(normalizeRoom));
      setStays((staysRes || []).map(normalizeStay));
      setPayments((paymentsRes || []).map(normalizePayment));
      setExpenses((expensesRes || []).map(normalizeExpense));
      setMonthClosings(closingsRes || []);
      setUsers(usersRes || []);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    if (!user) {
      setHotelState(EMPTY_HOTEL);
      setRooms([]);
      setStays([]);
      setPayments([]);
      setExpenses([]);
      setMonthClosings([]);
      setUsers([]);
      return;
    }

    refreshAll();
  }, [user, refreshAll]);

  const setHotel = async (nextHotel: Hotel) => {
    if (!nextHotel.id) return;
    const updated = await apiFetch<Hotel>('/hotels/me', {
      method: 'PATCH',
      body: JSON.stringify({ name: nextHotel.name, timezone: nextHotel.timezone }),
    });
    setHotelState(updated);
  };

  const addRoom = async (room: Room) => {
    const payload = {
      number: room.number,
      floor: room.floor,
      room_type: room.room_type,
      capacity: room.capacity,
      base_price: room.base_price,
      active: room.active,
      notes: room.notes,
    };
    const created = await apiFetch<Room>('/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setRooms((prev) => [normalizeRoom(created), ...prev]);
  };

  const updateRoom = async (room: Room) => {
    const payload = {
      number: room.number,
      floor: room.floor,
      room_type: room.room_type,
      capacity: room.capacity,
      base_price: room.base_price,
      active: room.active,
      notes: room.notes,
    };
    const updated = await apiFetch<Room>(`/rooms/${room.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setRooms((prev) => prev.map((r) => (r.id === room.id ? normalizeRoom(updated) : r)));
  };

  const removeRoom = async (roomId: string) => {
    await apiFetch(`/rooms/${roomId}`, { method: 'DELETE' });
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  const addStay = async (stay: Stay) => {
    const payload = {
      room_id: stay.room_id,
      guest_name: stay.guest_name,
      guest_phone: stay.guest_phone,
      check_in_date: stay.check_in_date,
      check_out_date: stay.check_out_date,
      status: stay.status,
      price_per_night: stay.price_per_night,
      weekly_discount_amount: stay.weekly_discount_amount,
      manual_adjustment_amount: stay.manual_adjustment_amount,
      deposit_expected: stay.deposit_expected,
      comment: stay.comment,
    };
    const created = await apiFetch<Stay>('/stays', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStays((prev) => [normalizeStay(created), ...prev]);
  };

  const removeStay = async (stayId: string) => {
    await apiFetch(`/stays/${stayId}`, { method: 'DELETE' });
    setStays((prev) => prev.filter((s) => s.id !== stayId));
    setPayments((prev) => prev.filter((p) => p.stay_id !== stayId));
  };

  const updateStay = async (stay: Stay) => {
    const payload = {
      room_id: stay.room_id,
      guest_name: stay.guest_name,
      guest_phone: stay.guest_phone,
      check_in_date: stay.check_in_date,
      check_out_date: stay.check_out_date,
      status: stay.status,
      price_per_night: stay.price_per_night,
      weekly_discount_amount: stay.weekly_discount_amount,
      manual_adjustment_amount: stay.manual_adjustment_amount,
      deposit_expected: stay.deposit_expected,
      comment: stay.comment,
    };
    const updated = await apiFetch<Stay>(`/stays/${stay.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setStays((prev) => prev.map((s) => (s.id === stay.id ? normalizeStay(updated) : s)));
  };

  const addPayment = async (payment: Payment) => {
    const payload = {
      stay_id: payment.stay_id,
      paid_at: payment.paid_at,
      method: payment.method,
      amount: payment.amount,
      comment: payment.comment,
    };
    const created = await apiFetch<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setPayments((prev) => [normalizePayment(created), ...prev]);
  };

  const updatePayment = async (payment: Payment) => {
    const payload = {
      paid_at: payment.paid_at,
      method: payment.method,
      amount: payment.amount,
      comment: payment.comment,
    };
    const updated = await apiFetch<Payment>(`/payments/${payment.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setPayments((prev) => prev.map((p) => (p.id === payment.id ? normalizePayment(updated) : p)));
  };

  const removePayment = async (paymentId: string) => {
    await apiFetch(`/payments/${paymentId}`, { method: 'DELETE' });
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  };

  const addExpense = async (expense: Expense) => {
    const payload = {
      spent_at: expense.spent_at,
      category: expense.category,
      method: expense.method,
      amount: expense.amount,
      comment: expense.comment,
    };
    const created = await apiFetch<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setExpenses((prev) => [normalizeExpense(created), ...prev]);
  };

  const updateExpense = async (expense: Expense) => {
    const payload = {
      spent_at: expense.spent_at,
      category: expense.category,
      method: expense.method,
      amount: expense.amount,
      comment: expense.comment,
    };
    const updated = await apiFetch<Expense>(`/expenses/${expense.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setExpenses((prev) => prev.map((e) => (e.id === expense.id ? normalizeExpense(updated) : e)));
  };

  const removeExpense = async (expenseId: string) => {
    await apiFetch(`/expenses/${expenseId}`, { method: 'DELETE' });
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  };

  const isMonthClosed = (month: string) => monthClosings.some((closing) => closing.month === month);

  const addUser = async (payload: { full_name: string; email: string; password: string; role: UserWithRole['role'] }) => {
    const created = await apiFetch<UserWithRole>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setUsers((prev) => [...prev, created]);
  };

  const updateUserRole = async (userId: string, role: UserWithRole['role']) => {
    const updated = await apiFetch<UserWithRole>(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
  };

  const removeUser = async (userId: string) => {
    await apiFetch(`/users/${userId}`, { method: 'DELETE' });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const closePreviousMonth = async () => {
    const closing = await apiFetch<MonthClosing>('/month-closings/close-previous', {
      method: 'POST',
    });
    setMonthClosings((prev) => {
      if (prev.some((c) => c.month === closing.month)) return prev;
      return [closing, ...prev];
    });
  };

  const reopenMonth = async (month: string) => {
    await apiFetch(`/month-closings/${month}`, { method: 'DELETE' });
    setMonthClosings((prev) => prev.filter((closing) => closing.month !== month));
  };

  return (
    <DataContext.Provider
      value={{
        hotel,
        setHotel,
        rooms,
        stays,
        payments,
        expenses,
        monthClosings,
        users,
        loading,
        addRoom,
        updateRoom,
        removeRoom,
        addStay,
        updateStay,
        removeStay,
    addPayment,
    updatePayment,
    removePayment,
    addExpense,
    updateExpense,
    removeExpense,
        addUser,
        updateUserRole,
        removeUser,
        closePreviousMonth,
        reopenMonth,
        isMonthClosed,
        refreshAll,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
