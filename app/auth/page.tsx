"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "forgot-password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        setSuccessMsg("Reset link sent — check your email.");
      } else if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setSuccessMsg("Account created! Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
    setEmail("");
    setPassword("");
    setFullName("");
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <div className="w-full flex h-full">

        {/* ── Left Panel ── */}
        <div className="hidden lg:flex relative w-[45%] flex-shrink-0 flex-col justify-between p-10 bg-[#0c1426] overflow-hidden h-full">
          {/* Background texture */}
          <div className="absolute inset-0 bg-[url('/logo.png')] bg-center bg-no-repeat opacity-[0.03]" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c1426] via-[#0d1f3c] to-[#080d1a]" />

          {/* Decorative grid */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "linear-gradient(rgba(99,149,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,149,237,1) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* Centre glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-blue-500/10 blur-[80px]" />

          {/* Logo */}
          <div className="relative flex items-center gap-2.5 z-10">
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image src="/logo.png" alt="Insolvency" fill className="object-contain" />
            </div>
            <span className="text-[15px] font-semibold text-[#f0ede6] tracking-tight">Insolvency</span>
          </div>

          {/* Centre content */}
          <div className="relative z-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <div className="relative w-8 h-8">
                <Image src="/logo.png" alt="" fill className="object-contain opacity-80" />
              </div>
            </div>
            <div>
              <p className="text-xl font-semibold text-[#f0ede6] leading-snug tracking-tight">
                Manage files.<br />Stay in control.
              </p>
              <p className="text-sm text-[#f0ede6]/40 mt-2 leading-relaxed">
                A secure registry for tracking,<br />movement, and reporting.
              </p>
            </div>
          </div>

          {/* Bottom dots */}
          <div className="relative z-10 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${i === 2 ? "w-6 bg-blue-400" : "w-2 bg-white/20"}`}
              />
            ))}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex-1 flex flex-col justify-center px-10 py-10 bg-[#0f1929] sm:px-16 overflow-y-auto">

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-3xl font-bold text-[#f0ede6] tracking-tight">
              {mode === "sign-in"
                ? "Welcome back"
                : mode === "sign-up"
                ? "Create an account"
                : "Reset password"}
            </h1>
            <p className="text-sm text-[#f0ede6]/40 mt-1.5">
              {mode === "sign-in" ? (
                <>
                  Don't have an account?{" "}
                  <button onClick={() => switchMode("sign-up")} className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors">
                    Sign up
                  </button>
                </>
              ) : mode === "sign-up" ? (
                <>
                  Already have an account?{" "}
                  <button onClick={() => switchMode("sign-in")} className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors">
                    Log in
                  </button>
                </>
              ) : (
                <>
                  Remember it?{" "}
                  <button onClick={() => switchMode("sign-in")} className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-3">
            {mode === "sign-up" && (
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl bg-[#f0ede6]/6 border border-[#f0ede6]/10 px-4 py-3 text-sm text-[#f0ede6] placeholder:text-[#f0ede6]/30 outline-none focus:border-blue-500/50 focus:bg-[#f0ede6]/8 transition-all"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full rounded-xl bg-[#f0ede6]/6 border border-[#f0ede6]/10 px-4 py-3 text-sm text-[#f0ede6] placeholder:text-[#f0ede6]/30 outline-none focus:border-blue-500/50 focus:bg-[#f0ede6]/8 transition-all"
            />

            {mode !== "forgot-password" && (
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="w-full rounded-xl bg-[#f0ede6]/6 border border-[#f0ede6]/10 px-4 py-3 pr-11 text-sm text-[#f0ede6] placeholder:text-[#f0ede6]/30 outline-none focus:border-blue-500/50 focus:bg-[#f0ede6]/8 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#f0ede6]/30 hover:text-[#f0ede6]/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {mode === "sign-in" && (
              <div className="flex justify-end -mt-1">
                <button
                  onClick={() => switchMode("forgot-password")}
                  className="text-xs text-[#f0ede6]/35 hover:text-[#f0ede6]/60 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}
            {successMsg && (
              <p className="text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5">
                {successMsg}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-colors flex items-center justify-center min-h-[46px]"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : mode === "sign-in" ? (
                "Sign in"
              ) : mode === "sign-up" ? (
                "Create account"
              ) : (
                "Send reset link"
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}