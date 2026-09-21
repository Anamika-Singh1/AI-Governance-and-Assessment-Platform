import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, PasswordInput } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type AuthMode = "login" | "register" | "forgot" | "reset";

export function AuthPage() {
  const { user, login, register, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "login") await login(email, password);
      else if (mode === "register") {
        if (name.trim().length < 2) throw new Error("Full name must contain at least 2 characters.");
        await register(name.trim(), email.trim(), password);
      }
      else if (mode === "forgot") {
        const result = await api.forgotPassword(email);
        setNotice(result.resetToken ? `Reset token (development only): ${result.resetToken}` : result.message);
        if (result.resetToken) {
          setToken(result.resetToken);
          setMode("reset");
        }
      } else {
        await resetPassword(token, password);
        setNotice("Password reset. You are now signed in.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  const accountMode = mode === "login" || mode === "register";

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-100 dark:bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_20px_80px_-30px_rgb(15_23_42_/_0.25)] sm:p-10">
        <div className="mb-4 flex justify-end"><ThemeToggle /></div>
        <div className="mb-7 flex items-center gap-3">
          <div className="rounded-xl bg-brand-600 p-3 text-white"><ShieldCheck /></div>
          <div><h1 className="text-xl font-semibold tracking-tight">AI Governance</h1><p className="text-sm text-slate-500 dark:text-slate-400">Your responsible AI workspace</p></div>
        </div>
        {accountMode && <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
          <button type="button" className={`rounded-md py-2 text-sm font-medium ${mode === "login" ? "bg-white dark:bg-slate-900 shadow" : ""}`} onClick={() => setMode("login")}>Sign in</button>
          <button type="button" className={`rounded-md py-2 text-sm font-medium ${mode === "register" ? "bg-white dark:bg-slate-900 shadow" : ""}`} onClick={() => setMode("register")}>Create account</button>
        </div>}
        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && <div><Label>Full name</Label><Input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></div>}
          {mode !== "reset" && <div><Label>Email</Label><Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>}
          {mode === "reset" && <div><Label>Reset token</Label><Input required value={token} onChange={(event) => setToken(event.target.value)} /></div>}
          {mode !== "forgot" && <div><Label>Password</Label><PasswordInput required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">8–128 characters</p></div>}
          {error && <Alert variant="error" title="Unable to continue">{error}</Alert>}
          {notice && <Alert variant="info" title="Password reset">{notice}</Alert>}
          <Button className="w-full" size="lg" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset instructions" : "Set new password"}</Button>
        </form>
        {mode === "login" && <button type="button" className="mt-4 w-full text-sm text-brand-600 dark:text-brand-400 hover:underline" onClick={() => setMode("forgot")}>Forgot password?</button>}
        {!accountMode && <button type="button" className="mt-4 w-full text-sm text-slate-500 dark:text-slate-400 hover:underline" onClick={() => setMode("login")}>Back to sign in</button>}
      </div>
    </main>
  );
}
