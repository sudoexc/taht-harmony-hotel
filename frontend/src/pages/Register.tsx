import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Gem, Building2, User, Mail, Lock, AlertCircle } from "lucide-react";

const Register = () => {
  const { t } = useLanguage();
  const { user, signUp, loading } = useAuth();
  const [hotelName, setHotelName] = useState("");
  const [fullName, setFullName] = useState("");
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
    if (password.length < 6) {
      setError(t.auth.passwordShort);
      return;
    }
    setSubmitting(true);
    const result = await signUp({ hotelName, fullName, email, password });
    if (!result.ok) {
      setError(result.status === 409 ? t.auth.emailTaken : t.auth.registerFailed);
    }
    setSubmitting(false);
  };

  const fieldClass =
    "pl-9 h-11 bg-muted/40 border-border/50 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary";
  const labelClass = "text-xs uppercase tracking-wider text-muted-foreground font-medium";

  const fields = [
    { label: t.auth.hotelName, Icon: Building2, type: "text", value: hotelName, set: setHotelName },
    { label: t.auth.fullName, Icon: User, type: "text", value: fullName, set: setFullName },
    { label: t.auth.email, Icon: Mail, type: "email", value: email, set: setEmail },
    { label: t.auth.password, Icon: Lock, type: "password", value: password, set: setPassword, minLength: 6 },
  ];

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
            <h1 className="text-2xl font-bold tracking-tight">{t.auth.registerTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t.auth.registerSubtitle}</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-lg glow-gold">
            <form onSubmit={handleSubmit} className="space-y-5">
              {fields.map(({ label, Icon, type, value, set, minLength }) => (
                <div key={label} className="space-y-2">
                  <Label className={labelClass}>{label}</Label>
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      type={type}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      required
                      minLength={minLength}
                      placeholder={label}
                      className={fieldClass}
                    />
                  </div>
                </div>
              ))}

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
                {submitting ? "..." : t.auth.register}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-5">
              {t.auth.haveAccount}{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                {t.auth.signIn}
              </Link>
            </p>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/40 mt-8 uppercase tracking-widest">
            Hotel Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
