"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { SiteShell } from "../components/site-shell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session").then((res) => res.json()).then((data) => {
      if (active && data.user) router.replace(data.user.onboardingComplete ? "/workspace" : "/onboarding");
    }).catch(() => undefined);
    return () => { active = false; };
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Login failed."); return; }
      router.push(data.user.onboardingComplete ? "/workspace" : "/onboarding");
    } catch {
      setError("Could not connect to the sign-in service. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteShell>
      <section className="panel page-hero">
        <p className="eyebrow">Access portal</p>
        <h1>Login to your college collaboration workspace.</h1>
        <p className="page-copy">Sign in with your IntentLink account.</p>
      </section>

      <section className="section-card">
        <form onSubmit={handleSubmit} className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="field">
            <label htmlFor="email">College email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-with-action"><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /><button className="input-action" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          </div>

          {error && <p className="form-message form-message-error" role="alert">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={submitting}>{submitting ? <LoaderCircle size={16} className="spin" /> : null}Log in</button>
            <Link href="/register" className="button button-secondary">
              Create account
            </Link>
          </div>
        </form>
      </section>
    </SiteShell>
  );
}
