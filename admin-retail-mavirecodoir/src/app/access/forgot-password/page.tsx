"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/lib/config";

const LOGO_URL = "https://cdn.mavirecodoir.com/brand/logos/png/1771394628214-zkowej-Mavire%20Codoir%20-%20LOGO.webp";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${siteConfig.medusaBackendUrl}/auth/user/emailpass/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to send reset email");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
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
                Forgot Password
              </h2>
              <p style={{ marginTop: 8, textAlign: "center", fontSize: 14, color: "#6B7280", fontFamily: "'Poppins', sans-serif" }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <div style={{ padding: "32px 48px", backgroundColor: "#FFFFFF", borderRadius: 12 }}>
              {success ? (
                <div>
                  <div style={{ marginBottom: 16, borderRadius: 8, border: "1px solid rgba(34,197,94,0.2)", backgroundColor: "rgba(34,197,94,0.08)", padding: "16px", fontSize: 14, color: "#16A34A", fontFamily: "'Poppins', sans-serif" }}>
                    Check your email. If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.
                  </div>
                  <button
                    onClick={() => router.push("/login")}
                    style={{ backgroundColor: "#212D3B", border: "1px solid transparent", color: "#FFFFFF", borderRadius: 8, padding: "2px 16px 0", minWidth: 100, height: 40, lineHeight: "14px", fontWeight: 400, width: "100%", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: 14 }}
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {error && (
                    <div style={{ marginBottom: 16, borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.08)", padding: "12px 16px", fontSize: 14, color: "#DC2626", fontFamily: "'Poppins', sans-serif" }}>
                      {error}
                    </div>
                  )}

                  <div style={{ position: "relative", marginBottom: 24 }}>
                    <label style={{ display: "block", fontWeight: 500, marginBottom: 12, fontSize: 14, lineHeight: "19px", color: "#212D3B", fontFamily: "'Poppins', sans-serif" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@mavirecodoir.com"
                      required
                      autoComplete="email"
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
                    Send Reset Link
                  </button>

                  <div style={{ marginTop: 16, textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      style={{ background: "none", border: "none", color: "#212D3B", fontSize: 14, fontWeight: 400, textDecoration: "underline", cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}
                    >
                      Back to Login
                    </button>
                  </div>
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
