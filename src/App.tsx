import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Rooms from "./pages/Rooms";
import Stays from "./pages/Stays";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

const queryClient = new QueryClient();
const baseUrl = import.meta.env.BASE_URL || "/";
const basename = baseUrl !== "/" && baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <DataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter basename={basename}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route element={<ProtectedLayout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/rooms" element={<Rooms />} />
                    <Route path="/stays" element={<Stays />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </DataProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
