import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb } from "./client";

export type FirebaseProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  college: string;
  department: string;
  yearOfStudy: number | null;
  avatarUrl: string | null;
  intent: string;
  skill: string;
  skills: string[];
  interests: string[];
  availability: number;
  bio: string;
  onboardingComplete: boolean;
  onboardingStep: number;
  notificationsEnabled: boolean;
};

export async function createFirebaseProfile(user: User, name: string) {
  const profile: FirebaseProfile = {
    id: user.uid,
    name: name.trim(),
    email: (user.email ?? "").toLowerCase(),
    role: "student",
    college: "",
    department: "",
    yearOfStudy: null,
    avatarUrl: user.photoURL,
    intent: "Project-Building",
    skill: "Frontend",
    skills: ["Frontend"],
    interests: [],
    availability: 8,
    bio: "",
    onboardingComplete: false,
    onboardingStep: 1,
    notificationsEnabled: true,
  };
  await setDoc(doc(getFirebaseDb(), "users", user.uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return profile;
}

export async function getFirebaseProfile(uid: string) {
  const snapshot = await getDoc(doc(getFirebaseDb(), "users", uid));
  return snapshot.exists() ? (snapshot.data() as FirebaseProfile) : null;
}
