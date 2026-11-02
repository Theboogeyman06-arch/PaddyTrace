"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { ShieldCheck, UserCheck, ArrowRight, Loader2 } from "lucide-react";

export function LoginForm({ locale, from }: { locale: string; from?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("officer_sindhanur");
  const [password, setPassword] = useState("Karnataka@2026");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (selectedUser?: string, selectedRole?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: selectedUser || username,
          role: selectedRole || "OFFICER",
        }),
      });

      if (!res.ok) {
        throw new Error("Login failed");
      }

      router.push(from || (selectedRole === "ADMIN" ? "/admin" : "/officer/procure"));
      router.refresh();
    } catch {
      setError("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Quick Role Fillers for Demonstration */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-500 uppercase">
          {locale === "kn" ? "ತ್ವರಿತ ಡೆಮೊ ಲಾಗಿನ್ (Quick Demo Role)" : "Quick Demo Login Roles"}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleLogin("officer_sindhanur", "OFFICER")}
            className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition"
          >
            <div className="text-xs font-bold text-emerald-950">Procurement Officer</div>
            <div className="text-[10px] text-emerald-700 font-mono mt-0.5">officer_sindhanur</div>
          </button>

          <button
            type="button"
            onClick={() => handleLogin("rsk_raichur", "RSK_STAFF")}
            className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition"
          >
            <div className="text-xs font-bold text-amber-950">RSK Staff / Officer</div>
            <div className="text-[10px] text-amber-700 font-mono mt-0.5">rsk_raichur</div>
          </button>

          <button
            type="button"
            onClick={() => handleLogin("admin_karnataka", "ADMIN")}
            className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left transition"
          >
            <div className="text-xs font-bold text-blue-950">State Admin</div>
            <div className="text-[10px] text-blue-700 font-mono mt-0.5">admin_karnataka</div>
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-400">Or enter credentials</span>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            {locale === "kn" ? "ಬಳಕೆದಾರ ಹೆಸರು (Username)" : "Official Username"}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            {locale === "kn" ? "ಗುಪ್ತಪದ (Password)" : "Password"}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>{locale === "kn" ? "ಲಾಗಿನ್ ಮಾಡಿ" : "Sign In to Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

