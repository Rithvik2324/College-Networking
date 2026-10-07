"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { SiteShell } from "../components/site-shell";

const stepLabels = ["Your campus", "Your direction", "Your profile"];
const intentOptions = ["Project-Building", "Hackathon-Ready", "Startup Exploration", "Learning-Only"];
const skillOptions = ["Frontend", "Backend", "AI/ML", "UI/UX", "Blockchain", "Marketing"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    college: "",
    department: "",
    degree: "",
    specialization: "",
    graduationYear: "",
    yearOfStudy: "",
    avatarUrl: "",
    intent: "Project-Building",
    skill: "Frontend",
    skills: "Frontend",
    interests: "",
    availability: "8",
    bio: "",
    headline: "",
    careerInterests: "",
    lookingFor: "",
    profileVisibility: "public",
    emailVisibility: "false",
  });

  useEffect(() => {
    fetch("/api/profile")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Sign in to complete onboarding.");
        const user = data.user;
        setForm({
          name: user.name || "",
          email: user.email || "",
          college: user.college || "",
          department: user.department || "",
          degree: user.degree || "",
          specialization: user.specialization || "",
          graduationYear: user.graduationYear ? String(user.graduationYear) : "",
          yearOfStudy: user.yearOfStudy ? String(user.yearOfStudy) : "",
          avatarUrl: user.avatarUrl || "",
          intent: user.intent || "Project-Building",
          skill: user.skill || "Frontend",
          skills: user.skills?.length ? user.skills.join(", ") : user.skill || "Frontend",
          interests: user.interests?.join(", ") || "",
          availability: String(user.availability || 8),
          bio: user.bio || "",
          headline: user.headline || "",
          careerInterests: user.careerInterests?.join(", ") || "",
          lookingFor: user.lookingFor?.join(", ") || "",
          profileVisibility: user.profileVisibility || "public",
          emailVisibility: String(user.emailVisibility ?? false),
        });
        setStep(user.onboardingStep || 1);
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : "Could not load your profile.");
        if (reason instanceof Error && reason.message.includes("Sign in")) router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const continueOnboarding = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (step === 1 && (!form.college.trim() || !form.department.trim() || !form.yearOfStudy || !form.degree.trim())) {
      setError("Add your college, degree, department, and year to continue.");
      return;
    }
    if (step === 2 && (!form.skill || !form.interests.trim())) {
      setError("Choose a primary skill and add at least one interest.");
      return;
    }
    if (step === 3 && (!form.bio.trim() || !form.availability)) {
      setError("Add a short introduction and your weekly availability.");
      return;
    }

    const isFinalStep = step === stepLabels.length;
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          college: form.college,
          department: form.department,
          degree: form.degree,
          specialization: form.specialization,
          graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
          yearOfStudy: Number(form.yearOfStudy),
          avatarUrl: form.avatarUrl.trim() || null,
          intent: form.intent,
          skill: form.skill,
          skills: form.skills.split(",").map((entry) => entry.trim()).filter(Boolean),
          interests: form.interests.split(",").map((entry) => entry.trim()).filter(Boolean),
          availability: Number(form.availability),
          bio: form.bio,
          headline: form.headline,
          careerInterests: form.careerInterests.split(",").map((entry) => entry.trim()).filter(Boolean),
          lookingFor: form.lookingFor.split(",").map((entry) => entry.trim()).filter(Boolean),
          profileVisibility: form.profileVisibility,
          emailVisibility: form.emailVisibility === "true",
          onboardingStep: isFinalStep ? step : step + 1,
          completeOnboarding: isFinalStep,
        }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Could not save your profile."); return; }
      if (isFinalStep) { router.replace("/workspace"); return; }
      setStep((current) => current + 1);
    } catch {
      setError("Could not save your progress. Check your connection and retry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteShell>
      <section className="onboarding-layout">
        <div className="onboarding-main">
          <div className="onboarding-topline"><span>Student onboarding</span><span>Step {step} of {stepLabels.length}</span></div>
          <div className="onboarding-progress" role="progressbar" aria-label="Onboarding progress" aria-valuemin={1} aria-valuemax={stepLabels.length} aria-valuenow={step}><span style={{ width: `${(step / stepLabels.length) * 100}%` }} /></div>
          <div className="onboarding-steps" aria-label="Onboarding steps">{stepLabels.map((label, index) => <span className={index + 1 <= step ? "onboarding-step active" : "onboarding-step"} key={label}><i>{index + 1 < step ? <Check size={12} /> : index + 1}</i>{label}</span>)}</div>

          {loading ? <div className="loading-state" role="status">Loading your profile...</div> : <form onSubmit={continueOnboarding} className="onboarding-form">
            {step === 1 && <div className="onboarding-step-content"><p className="eyebrow">01 · Campus details</p><h1>Start with where you are.</h1><p className="page-copy">Your campus and department help students find people nearby in their field.</p>
              <div className="field"><label htmlFor="full-name">Full name</label><input id="full-name" autoComplete="name" required minLength={2} maxLength={80} value={form.name} onChange={(event) => update("name", event.target.value)} /></div>
              <div className="field"><label htmlFor="college-email">College email</label><input id="college-email" type="email" value={form.email} readOnly aria-readonly="true" /><span className="field-hint">Email is tied to your account and cannot be changed here.</span></div>
              <div className="field"><label htmlFor="college">College or university</label><input id="college" required maxLength={120} placeholder="Your university or college" value={form.college} onChange={(event) => update("college", event.target.value)} /></div>
              <div className="onboarding-two-col"><div className="field"><label htmlFor="degree">Degree or program</label><input id="degree" required maxLength={100} placeholder="e.g. B.Com, MBBS, B.Des, Diploma" value={form.degree} onChange={(event) => update("degree", event.target.value)} /></div><div className="field"><label htmlFor="department">Department / field</label><input id="department" required maxLength={120} placeholder="e.g. Commerce, Medicine, Arts" value={form.department} onChange={(event) => update("department", event.target.value)} /></div></div>
              <div className="onboarding-two-col"><div className="field"><label htmlFor="specialization">Specialization <span className="optional-label">Optional</span></label><input id="specialization" maxLength={120} placeholder="Your focus area" value={form.specialization} onChange={(event) => update("specialization", event.target.value)} /></div><div className="field"><label htmlFor="year">Current year</label><select id="year" required value={form.yearOfStudy} onChange={(event) => update("yearOfStudy", event.target.value)}><option value="">Select year</option><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option><option value="5">Year 5+</option></select></div></div>
              <div className="field"><label htmlFor="graduation">Expected graduation year <span className="optional-label">Optional</span></label><input id="graduation" type="number" min="2000" max="2100" placeholder="2028" value={form.graduationYear} onChange={(event) => update("graduationYear", event.target.value)} /></div>
              <div className="field"><label htmlFor="avatar">Profile image URL <span className="optional-label">Optional</span></label><input id="avatar" type="url" placeholder="https://..." value={form.avatarUrl} onChange={(event) => update("avatarUrl", event.target.value)} /></div>
            </div>}

            {step === 2 && <div className="onboarding-step-content"><p className="eyebrow">02 · Your direction</p><h1>What do you want to do?</h1><p className="page-copy">Intent helps us make recommendations relevant to what you’re ready for now.</p>
              <fieldset className="intent-options"><legend>Current intent</legend>{intentOptions.map((intent) => <label className={form.intent === intent ? "intent-option selected" : "intent-option"} key={intent}><input type="radio" name="intent" value={intent} checked={form.intent === intent} onChange={() => update("intent", intent)} /><span className="intent-option-mark" />{intent}</label>)}</fieldset>
              <div className="field"><label htmlFor="headline">Profile headline <span className="optional-label">Optional</span></label><input id="headline" maxLength={120} placeholder="e.g. Design student exploring accessible products" value={form.headline} onChange={(event) => update("headline", event.target.value)} /></div>
              <div className="field"><label htmlFor="primary-skill">Primary skill</label><input id="primary-skill" list="skill-suggestions" maxLength={60} value={form.skill} onChange={(event) => update("skill", event.target.value)} /><datalist id="skill-suggestions">{skillOptions.concat(["Python", "Java", "React", "Research", "Writing", "Finance", "Photography", "Public Speaking", "Medicine", "Graphic Design", "Marketing", "Cybersecurity", "Music", "Dance"]).map((skill) => <option key={skill} value={skill} />)}</datalist></div>
              <div className="field"><label htmlFor="skills">Skills <span className="optional-label">Add any skills, comma separated</span></label><input id="skills" placeholder="Research, prototyping, writing, patient care" value={form.skills} onChange={(event) => update("skills", event.target.value)} /><span className="field-hint">Use your own terms. You can include skills from any academic background.</span></div>
              <div className="field"><label htmlFor="interests">Interests</label><input id="interests" required placeholder="Climate, accessibility, startups" value={form.interests} onChange={(event) => update("interests", event.target.value)} /><span className="field-hint">Add a few topics you’d be happy to work on.</span></div>
            </div>}

            {step === 3 && <div className="onboarding-step-content"><p className="eyebrow">03 · Working together</p><h1>Make it easy to work with you.</h1><p className="page-copy">A short introduction and realistic availability help teams start with clear expectations.</p>
              <div className="field"><label htmlFor="career-interests">Career interests <span className="optional-label">Optional · comma separated</span></label><input id="career-interests" placeholder="Research, entrepreneurship, public health" value={form.careerInterests} onChange={(event) => update("careerInterests", event.target.value)} /></div>
              <div className="field"><label htmlFor="looking-for">What are you looking for? <span className="optional-label">Optional · comma separated</span></label><input id="looking-for" placeholder="Project collaborators, internships, communities" value={form.lookingFor} onChange={(event) => update("lookingFor", event.target.value)} /></div>
              <div className="field"><label htmlFor="availability">Weekly availability</label><div className="availability-input"><input id="availability" type="number" required min={1} max={40} value={form.availability} onChange={(event) => update("availability", event.target.value)} /><span>hours / week</span></div></div>
              <div className="field"><label htmlFor="bio">Short introduction</label><textarea id="bio" rows={5} required maxLength={400} placeholder="What are you curious about? What do you enjoy building?" value={form.bio} onChange={(event) => update("bio", event.target.value)} /><span className="field-hint">{form.bio.length}/400 characters</span></div>
              <div className="onboarding-two-col"><div className="field"><label htmlFor="visibility">Profile visibility</label><select id="visibility" value={form.profileVisibility} onChange={(event) => update("profileVisibility", event.target.value)}><option value="public">Public to IntentLink</option><option value="college">College only</option><option value="connections">Connections only</option><option value="private">Private</option></select></div><div className="field"><label htmlFor="email-visibility">Show email on profile</label><select id="email-visibility" value={form.emailVisibility} onChange={(event) => update("emailVisibility", event.target.value)}><option value="false">Keep private</option><option value="true">Show email</option></select></div></div>
            </div>}

            {error && <p className="form-message form-message-error" role="alert">{error}</p>}
            <div className="onboarding-actions">{step > 1 ? <button className="button button-secondary" type="button" onClick={() => { setError(""); setStep((current) => current - 1); }}><ArrowLeft size={15} /> Back</button> : <span className="field-hint">Progress saves as you continue.</span>}<button className="button button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : null}{step === stepLabels.length ? "Finish profile" : "Save and continue"}<ArrowRight size={15} /></button></div>
          </form>}
        </div>

        <aside className="onboarding-aside"><div className="onboarding-preview-avatar">{form.name ? form.name.slice(0, 1).toUpperCase() : "?"}</div><span className="tag">Your profile</span><h2>{form.name || "Your name"}</h2><p>{form.department || "Your department"}{form.yearOfStudy ? ` · Year ${form.yearOfStudy}` : ""}</p><div className="preview-divider" /><span className="preview-kicker">CURRENT INTENT</span><span className="status-badge">{form.intent}</span><p className="onboarding-preview-bio">{form.bio || "Your introduction will help potential teammates get to know you."}</p><div className="tag-row">{form.skills.split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 4).map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div></aside>
      </section>
    </SiteShell>
  );
}
