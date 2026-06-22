"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LOGO_URL = "https://cdn.mavirecodoir.com/brand/logos/png/1771394628214-zkowej-Mavire%20Codoir%20-%20LOGO.webp";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid credentials");
      }

      const from = searchParams.get("from") || "/dashboard";
      router.push(from);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-dvh w-full bg-[#FAFAFA] p-8 gap-6 overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif", color: "#212D3B" }}>
      {/* Left panel - Login form */}
      <div className="w-[30%] min-w-[330px] self-center z-[2]">
        <div className="flex flex-col items-center w-full">
          {/* Logo */}
          <header className="flex items-center justify-between w-full max-w-[456px] mt-8 mb-4">
            <img src={LOGO_URL} alt="MAVIRE CODOIR" style={{ height: 40, width: "auto", objectFit: "contain" }} />
          </header>

          <div className="w-full max-w-[456px]">
            {/* Sign in heading */}
            <div className="mb-6">
              <h2 className="m-0 text-center" style={{ fontWeight: 500, fontSize: 22, lineHeight: "32px", letterSpacing: "0.275px", fontFamily: "'Poppins', sans-serif", color: "#212D3B" }}>
                Sign in
              </h2>
            </div>

            {/* Card */}
            <div style={{ padding: "32px 48px", backgroundColor: "#FFFFFF", borderRadius: 12 }}>
              {/* Admin panel badge */}
              <div className="flex items-center justify-center mb-8">
                <div style={{ backgroundColor: "#212D3B", padding: "8px 12px", color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8, borderRadius: 8, fontFamily: "'Poppins', sans-serif", fontSize: 14 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v16.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h6.9c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V3.6c0-.4-.2-.8-.5-1.1-.3-.3-.7-.5-1.1-.5Z" />
                    <path d="M9 7h6" /><path d="M9 11h6" /><path d="M9 15h4" />
                  </svg>
                  Admin panel
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{ marginBottom: 16, borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.08)", padding: "12px 16px", fontSize: 14, color: "#DC2626", fontFamily: "'Poppins', sans-serif" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ fontFamily: "'Poppins', sans-serif" }}>
                {/* Username */}
                <div style={{ position: "relative", marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 500, marginBottom: 12, fontSize: 14, lineHeight: "19px", color: "#212D3B", fontFamily: "'Poppins', sans-serif" }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Username"
                    required
                    autoComplete="email"
                    style={{ fontSize: 16, color: "#212D3B", border: "1px solid #E9EBF3", borderRadius: 8, display: "block", height: 58, fontWeight: 400, outline: "none", padding: 16, width: "100%", boxSizing: "border-box", fontFamily: "'Poppins', sans-serif", backgroundColor: "#FFFFFF" }}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontWeight: 500, marginBottom: 12, fontSize: 14, lineHeight: "19px", color: "#212D3B", fontFamily: "'Poppins', sans-serif" }}>
                    Password
                  </label>
                  <div style={{ width: "100%", position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      autoComplete="current-password"
                      style={{ fontSize: 16, color: "#212D3B", border: "1px solid #E9EBF3", borderRadius: 8, display: "block", height: 58, fontWeight: 400, outline: "none", padding: "16px 56px 16px 16px", width: "100%", boxSizing: "border-box", fontFamily: "'Poppins', sans-serif", backgroundColor: "#FFFFFF" }}
                    />
                    <div onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", cursor: "pointer", width: "3.5rem", height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "#212D3B" }}>
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                {/* Forgot Password */}
                <div style={{ marginBottom: 24, display: "inline-block" }}>
                  <a href="/access/forgot-password" style={{ color: "#222224", marginTop: 8, fontSize: 14, fontWeight: 400, textDecoration: "underline", fontFamily: "'Poppins', sans-serif" }}>
                    Forgot Password?
                  </a>
                </div>

                {/* Sign In button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ backgroundColor: "#212D3B", border: "1px solid transparent", color: "#FFFFFF", borderRadius: 8, padding: "2px 16px 0", minWidth: 100, height: 40, lineHeight: "14px", fontWeight: 400, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "'Poppins', sans-serif", fontSize: 14 }}
                >
                  {loading && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                  Sign In
                </button>

                {/* Or divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 12px", fontSize: 14, fontWeight: 400, fontFamily: "'Poppins', sans-serif", color: "#212D3B" }}>
                  Or
                </div>

                {/* SSO */}
                <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 12 }}>
                  <button
                    type="button"
                    style={{ backgroundColor: "#FFFFFF", color: "#222224", borderRadius: 8, padding: "2px 16px 0", minWidth: 100, height: 40, lineHeight: "14px", fontWeight: 400, border: "1px solid #212D3B", width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: 14 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="2" width="9" height="9" rx="1.5" fill="#F25022"/>
                      <rect x="13" y="2" width="9" height="9" rx="1.5" fill="#7FBA00"/>
                      <rect x="2" y="13" width="9" height="9" rx="1.5" fill="#FFB900"/>
                      <rect x="13" y="13" width="9" height="9" rx="1.5" fill="#00A4EF"/>
                    </svg>
                    MAVIRE CODOIR SSO
                  </button>
                </div>
              </form>
            </div>

            {/* Footer */}
            <p style={{ marginTop: 48, textAlign: "center", fontSize: 11, letterSpacing: "0.15em", color: "#9CA3AF", fontFamily: "'Poppins', sans-serif" }}>
              &copy; {new Date().getFullYear()} MAVIRE CODOIR. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - Brand image */}
      <div style={{ flex: 1, position: "relative", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ width: "100%", height: "100%", backgroundImage: 'url("https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop")', backgroundSize: "cover", backgroundPosition: "50% 50%", backgroundRepeat: "no-repeat", borderRadius: 12 }} />
      </div>
    </div>
  );
}
