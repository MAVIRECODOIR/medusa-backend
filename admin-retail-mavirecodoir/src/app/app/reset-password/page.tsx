"use client";

import { useState, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { siteConfig } from "@/lib/config";

const LOGO_URL = "https://cdn.mavirecodoir.com/brand/logos/png/1771394628214-zkowej-Mavire%20Codoir%20-%20LOGO.webp";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${siteConfig.medusaBackendUrl}/auth/user/emailpass/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to reset password");
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex h-dvh w-full bg-[#FAFAFA] p-8 gap-6 overflow-hidden items-center justify-center" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ padding: "32px 48px", backgroundColor: "#FFFFFF", borderRadius: 12, maxWidth: 456, width: "100%" }}>
          <div style={{ borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.08)", padding: "16px", fontSize: 14, color: "#DC2626", fontFamily: "'Poppins', sans-serif" }}>
            Invalid reset link. The token is missing or expired.
          </div>
          <button
            onClick={() => router.push("/login")}
            style={{ marginTop: 16, backgroundColor: "#212D3B", border: "1px solid transparent", color: "#FFFFFF", borderRadius: 8, padding: "2px 16px 0", minWidth: 100, height: 40, lineHeight: "14px", fontWeight: 400, width: "100%", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: 14 }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full bg-[#FAFAFA] p-8 gap-6 overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif", color: "#212D3B" }}>
      <div className="w-[30%] min-w-[330px] self-center z-[2]">
        <div className="flex flex-col items-center w-full">
          <header className="flex items-center justify-between w-full max-w-[456px] mt-8 mb-4">
            <img src={LOGO_URL} alt="MAVIRE CODOIR" style={{ height: 40, width: "auto", objectFit: "contain" }} />
          </header>

          <div className="w-full max-w-[456px]">
            <div className="mb-6">
              <h2 className="m-0 text-center" style={{ fontWeight: 500, fontSize: 22, lineHeight: "32px", letterSpacing: "0.275px", fontFamily: "'Poppins', sans-serif", color: "#212D3B" }}>
                Reset Password
              </h2>
              <p style={{ marginTop: 8, textAlign: "center", fontSize: 14, color: "#6B7280", fontFamily: "'Poppins', sans-serif" }}>
                {email ? `Set a new password for ${email}` : "Enter a new password for your account."}
              </p>
            </div>

            <div style={{ padding: "32px 48px", backgroundColor: "#FFFFFF", borderRadius: 12 }}>
              {success ? (
                <div>
                  <div style={{ marginBottom: 16, borderRadius: 8, border: "1px solid rgba(34,197,94,0.2)", backgroundColor: "rgba(34,197,94,0.08)", padding: "16px", fontSize: 14, color: "#16A34A", fontFamily: "'Poppins', sans-serif" }}>
                    Password reset successful! Redirecting to login...
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {error && (
                    <div style={{ marginBottom: 16, borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.08)", padding: "12px 16px", fontSize: 14, color: "#DC2626", fontFamily: "'Poppins', sans-serif" }}>
                      {error}
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontWeight: 500, marginBottom: 12, fontSize: 14, lineHeight: "19px", color: "#212D3B", fontFamily: "'Poppins', sans-serif" }}>
                      New Password
                    </label>
                    <div style={{ width: "100%", position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="New password"
                        required
                        minLength={8}
                        autoComplete="new-password"
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
                    <p style={{ marginTop: 4, fontSize: 12, color: "#9CA3AF", fontFamily: "'Poppins', sans-serif" }}>Minimum 8 characters</p>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", fontWeight: 500, marginBottom: 12, fontSize: 14, lineHeight: "19px", color: "#212D3B", fontFamily: "'Poppins', sans-serif" }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      style={{ fontSize: 16, color: "#212D3B", border: "1px solid #E9EBF3", borderRadius: 8, display: "block", height: 58, fontWeight: 400, outline: "none", padding: 16, width: "100%", boxSizing: "border-box", fontFamily: "'Poppins', sans-serif", backgroundColor: "#FFFFFF" }}
                    />
                  </div>

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
                    Reset Password
                  </button>
                </form>
              )}
            </div>

            <p style={{ marginTop: 48, textAlign: "center", fontSize: 11, letterSpacing: "0.15em", color: "#9CA3AF", fontFamily: "'Poppins', sans-serif" }}>
              &copy; {new Date().getFullYear()} MAVIRE CODOIR. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, position: "relative", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ width: "100%", height: "100%", backgroundImage: 'url("https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop")', backgroundSize: "cover", backgroundPosition: "50% 50%", backgroundRepeat: "no-repeat", borderRadius: 12 }} />
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex h-dvh w-full bg-[#FAFAFA] items-center justify-center" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <p style={{ color: "#6B7280", fontSize: 14 }}>Loading...</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
