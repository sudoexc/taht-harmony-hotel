import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserRole } from '@/types';
import { apiFetch } from '@/lib/api';

interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  hotel_id: string;
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  hotelId: string | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (username: string, password: string) => Promise<{ error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((res) => {
        if (!active) return;
        setUser(res.user);
        setRole(res.user.role);
        setHotelId(res.user.hotel_id);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setRole(null);
        setHotelId(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiFetch<{ user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      setUser(res.user);
      setRole(res.user.role);
      setHotelId(res.user.hotel_id);
      return {};
    } catch (error) {
      return { error: 'INVALID_CREDENTIALS' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
    setRole(null);
    setHotelId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        hotelId,
        loading,
        isAdmin: role === 'ADMIN',
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
