"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { SiteShell } from "../components/site-shell";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (!/^[^\s@]+@[^\s@]+\.(edu|ac\.in|edu\.in)$/i.test(email.trim())) {
        setError("Use your .edu or .ac.in college email address.");
        return;
      }
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Registration failed."); return; }
      router.push("/onboarding");
    } catch {
      setError("Could not connect to the registration service. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteShell>
      <section className="panel page-hero">
        <p className="eyebrow">Create account</p>
        <h1>Register as a student builder.</h1>
        <p className="page-copy">Use a valid college email to join the collaboration network.</p>
      </section>

      <section className="section-card">
        <form onSubmit={handleSubmit} className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="email">College email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-with-action"><input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} /><button className="input-action" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            <span className="field-hint">At least 8 characters. Use your .edu or .ac.in address.</span>
          </div>

          {error && <p className="form-message form-message-error" role="alert">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={submitting}>{submitting ? <LoaderCircle size={16} className="spin" /> : null}Create account</button>
            <Link href="/login" className="button button-secondary">
              Log in
            </Link>
          </div>
        </form>
      </section>
    </SiteShell>
  );
}
