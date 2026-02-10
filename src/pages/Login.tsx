import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-muted/30">
      <div className="flex items-center justify-end w-full max-w-md">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle>{t.auth.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{t.auth.subtitle}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t.auth.email}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t.auth.password}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button type="submit" className="w-full" disabled={submitting || loading}>
              {t.auth.signIn}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
