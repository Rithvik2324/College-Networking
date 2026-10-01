"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { SiteShell } from "../components/site-shell";

export default function ProfilePage() {
  const router = useRouter();
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [intent, setIntent] = useState("Project-Building");
  const [skill, setSkill] = useState("Frontend");
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState(8);
  const [interests, setInterests] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => {
        if (!res.ok) return router.push("/login");
        return res.json();
      })
      .then((data) => {
        setName(data.user.name);
        setCollege(data.user.college || "");
        setDepartment(data.user.department || "");
        setYearOfStudy(data.user.yearOfStudy ? String(data.user.yearOfStudy) : "");
        setAvatarUrl(data.user.avatarUrl || "");
        setBio(data.user.bio || "");
        setIntent(data.user.intent || "Project-Building");
        setSkill(data.user.skill || "Frontend");
        setSkills((data.user.skills || []).join(", "));
        setAvailability(data.user.availability || 8);
        setInterests((data.user.interests || []).join(", "));
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          college,
          department,
          yearOfStudy: yearOfStudy ? Number(yearOfStudy) : undefined,
          avatarUrl: avatarUrl.trim() || null,
          bio,
          intent,
          skill,
          skills: skills.split(",").map((entry) => entry.trim()).filter(Boolean),
          availability,
          interests: interests.split(",").map((entry) => entry.trim()).filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) { setStatus(data.error || "Failed to update profile."); return; }
      setStatus("Profile updated successfully.");
    } catch {
      setStatus("Could not save your profile. Check your connection and retry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteShell>
      <section className="page-hero">
        <p className="eyebrow">Profile</p>
        <h1>Edit your student profile.</h1>
        <p className="page-copy">Keep your current intent, skills, and interests aligned with what you want to build.</p>
      </section>

      <section className="section-card">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="profile-name">Name</label>
            <input id="profile-name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="profile-college">College</label>
            <input id="profile-college" maxLength={120} value={college} onChange={(e) => setCollege(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="profile-department">Department</label>
            <input id="profile-department" maxLength={120} value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="profile-year">Year of study</label>
            <select id="profile-year" value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)}>
              <option value="">Not set</option><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option><option value="5">Year 5+</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="profile-avatar">Profile image URL</label>
            <input id="profile-avatar" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="profile-intent">Current intent</label>
            <select id="profile-intent" value={intent} onChange={(e) => setIntent(e.target.value)}>
              <option>Hackathon-Ready</option>
              <option>Project-Building</option>
              <option>Startup Exploration</option>
              <option>Learning-Only</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="profile-skill">Primary skill</label>
            <select id="profile-skill" value={skill} onChange={(e) => setSkill(e.target.value)}>
              <option>Frontend</option>
              <option>Backend</option>
              <option>AI/ML</option>
              <option>UI/UX</option>
              <option>Blockchain</option>
              <option>Marketing</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="profile-availability">Availability (hrs/week)</label>
            <input id="profile-availability" type="number" min={1} max={40} value={availability} onChange={(e) => setAvailability(Number(e.target.value))} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="profile-skills">Skills</label>
            <input id="profile-skills" value={skills} onChange={(e) => setSkills(e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="profile-interests">Interests</label>
            <input id="profile-interests" value={interests} onChange={(e) => setInterests(e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="profile-bio">Bio</label>
            <textarea id="profile-bio" rows={4} maxLength={400} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </div>

        <div className="form-actions">
          <button className="button button-primary" onClick={handleSave} disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : null}Save profile</button>
        </div>

        {status && <p className={status.includes("success") ? "form-message form-message-success" : "form-message form-message-error"} role="status">{status}</p>}
      </section>
    </SiteShell>
  );
}
