import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Gem, Mail, Lock, AlertCircle } from "lucide-react";

const Login = () => {
  const { t } = useLanguage();
  const { user, signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email, password);
    if (result.error) {
      setError(t.auth.invalid);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, hsl(38 72% 55%), transparent)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(ellipse, hsl(38 72% 55%), transparent)' }} />
      </div>

      {/* Language switcher */}
      <div className="absolute top-5 right-5 z-10">
        <LanguageSwitcher />
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center mb-4 glow-gold">
              <Gem className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t.auth.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t.auth.subtitle}</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-lg glow-gold">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  {t.auth.email}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@hotel.com"
                    className="pl-9 h-11 bg-muted/40 border-border/50 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  {t.auth.password}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="pl-9 h-11 bg-muted/40 border-border/50 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/8 rounded-lg px-3 py-2.5 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 gradient-gold text-white font-semibold tracking-wide border-0 hover:opacity-90 transition-opacity glow-gold-sm mt-2"
                disabled={submitting || loading}
              >
                {submitting ? "..." : t.auth.signIn}
              </Button>
            </form>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/40 mt-8 uppercase tracking-widest">
            Hotel Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
