"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { SiteShell } from "../components/site-shell";

type Settings = { email: string; notificationsEnabled: boolean; college: string | null };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load settings.");
      setSettings(data.settings);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load settings."));
  }, []);

  const saveNotifications = async (enabled: boolean) => {
    setSavingPreference(true); setError(""); setMessage("");
    const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationsEnabled: enabled }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Could not save this preference.");
    else { setSettings((current) => current ? { ...current, notificationsEnabled: enabled } : current); setMessage("Notification preference saved."); }
    setSavingPreference(false);
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setMessage("");
    if (newPassword !== confirmPassword) { setError("The new passwords do not match."); return; }
    setSavingPassword(true);
    try {
      const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Could not change password."); return; }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setMessage("Password updated.");
    } catch { setError("Could not reach the settings service. Try again."); }
    finally { setSavingPassword(false); }
  };

  return (
    <SiteShell>
      <section className="page-hero"><p className="eyebrow">Account preferences</p><h1>Settings</h1><p className="page-copy">Manage your campus account, password, and notification preferences.</p></section>
      {error && <p className="form-message form-message-error" role="alert">{error}</p>}{message && <p className="form-message form-message-success" role="status">{message}</p>}
      <div className="settings-grid">
        <section className="settings-section"><div className="settings-section-heading"><span className="feature-icon"><ShieldCheck size={18} /></span><div><p className="eyebrow">Account</p><h2>Account information</h2></div></div><dl className="settings-details"><div><dt>College email</dt><dd>{settings?.email || "Loading..."}</dd></div><div><dt>College</dt><dd>{settings?.college || "Add your college in your profile"}</dd></div></dl></section>
        <section className="settings-section"><div className="settings-section-heading"><span className="feature-icon"><ShieldCheck size={18} /></span><div><p className="eyebrow">Privacy</p><h2>Notifications</h2></div></div><label className="toggle-row"><span><strong>Email and in-app alerts</strong><small>Updates about invitations, requests, tasks, and messages.</small></span><input type="checkbox" checked={settings?.notificationsEnabled ?? true} disabled={!settings || savingPreference} onChange={(event) => void saveNotifications(event.target.checked)} /><span className="toggle-track" aria-hidden="true" /></label></section>
        <section className="settings-section settings-password"><div className="settings-section-heading"><span className="feature-icon"><ShieldCheck size={18} /></span><div><p className="eyebrow">Security</p><h2>Change password</h2></div></div><form className="form-grid" onSubmit={changePassword}>
          <div className="field"><label htmlFor="current-password">Current password</label><div className="input-with-action"><input id="current-password" type={showPasswords ? "text" : "password"} autoComplete="current-password" required minLength={1} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><button className="input-action" type="button" aria-label={showPasswords ? "Hide passwords" : "Show passwords"} onClick={() => setShowPasswords((visible) => !visible)}>{showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
          <div className="field"><label htmlFor="new-password">New password</label><input id="new-password" type={showPasswords ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></div>
          <div className="field"><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type={showPasswords ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div>
          <div className="form-actions field-full"><button className="button button-primary" type="submit" disabled={savingPassword}>{savingPassword ? <LoaderCircle size={16} className="spin" /> : null}Update password</button></div>
        </form></section>
      </div>
    </SiteShell>
  );
}
