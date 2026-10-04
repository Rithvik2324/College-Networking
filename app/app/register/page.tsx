"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { SiteShell } from "../components/site-shell";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { createFirebaseProfile } from "@/lib/firebase/profile";

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
      const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim().toLowerCase(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await createFirebaseProfile(credential.user, name);
      router.push("/onboarding");
    } catch (cause) {
      const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
      setError(code === "auth/email-already-in-use" ? "This email is already registered." : code === "auth/weak-password" ? "Choose a stronger password." : "Could not create your account. Check your Firebase setup and try again.");
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
