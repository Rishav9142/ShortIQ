/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { auth, googleAuthProvider } from "./lib/firebase.ts";
import {
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import Dashboard from "./components/Dashboard.tsx";
import { Loader2 } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("====================================");
      console.log("AUTH STATE CHANGED");
      console.log(currentUser);
      console.log("====================================");

      setUser(currentUser);

      if (currentUser) {
        try {
          console.log("Getting Firebase ID Token...");

          const token = await currentUser.getIdToken();

          console.log("Token received");

          const response = await fetch("/api/auth/sync", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          console.log("Sync Status:", response.status);

          const body = await response.text();

          console.log("Sync Response:", body);

          if (!response.ok) {
            throw new Error(body);
          }

          console.log("User synced successfully.");
        } catch (error) {
          console.error("Failed to sync user:", error);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      console.log("====================================");
      console.log("GOOGLE LOGIN STARTED");
      console.log("====================================");

      const result = await signInWithPopup(auth, googleAuthProvider);

      console.log("Google Popup Success");
      console.log(result.user);

      const token = await result.user.getIdToken();

      console.log("Firebase Token:");
      console.log(token);

      console.log("Google Login Completed");
    } catch (error: any) {
      console.error("Google Login Failed");
      console.error(error);

      console.log("Error Code:", error.code);
      console.log("Error Message:", error.message);

      if (error.customData) {
        console.log("Custom Data:", error.customData);
      }

      alert(`${error.code}\n\n${error.message}`);
    }
  };

  const handleGuestLogin = async () => {
    try {
      console.log("====================================");
      console.log("GUEST LOGIN STARTED");
      console.log("====================================");

      const result = await signInAnonymously(auth);

      console.log("Guest Login Success");
      console.log(result.user);
    } catch (error: any) {
      console.error("Guest Login Failed");
      console.error(error);

      console.log("Error Code:", error.code);
      console.log("Error Message:", error.message);

      alert(`${error.code}\n\n${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
        <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-6 font-sans">
        <div className="bg-white p-8 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            ShortIQ
          </h1>

          <p className="text-sm font-bold text-slate-500 mb-8 uppercase tracking-widest">
            Link Scale & Analytics
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleLogin}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none transition-all"
            >
              Continue with Google
            </button>

            <button
              onClick={handleGuestLogin}
              className="w-full bg-white text-slate-900 border-2 border-slate-900 font-bold py-3 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none transition-all hover:bg-slate-50"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard user={user} />;
}