"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { siteConfig } from "@/lib/config";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No invite token provided. Please check your invite link.");
    }
  }, [token]);

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email || !password) {
      setMessage("Please fill in all fields");
      return;
    }

    setIsAccepting(true);
    setMessage("");

    try {
      // Step 1: Register auth identity
      const authResponse = await fetch(`${siteConfig.medusaBackendUrl}/auth/user/emailpass/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!authResponse.ok) {
        const error = await authResponse.text();
        throw new Error(`Auth registration failed: ${error}`);
      }

      const authData = await authResponse.json();

      // Step 2: Accept the invite
      const inviteResponse = await fetch(`${siteConfig.medusaBackendUrl}/admin/invites/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.token}`,
        },
        body: JSON.stringify({ token, email, password }),
      });

      if (!inviteResponse.ok) {
        const error = await inviteResponse.text();
        throw new Error(`Invite acceptance failed: ${error}`);
      }

      setStatus("success");
      setMessage("Account created successfully! Redirecting to login...");
      
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Failed to accept invite. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (status === "error" && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Invite</h1>
          <p className="text-gray-600 mb-4">{message}</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Accept Admin Invite</h1>
        <p className="text-gray-600 mb-6">Create your admin account for MAVIRE CODOIR</p>

        {status === "success" ? (
          <div className="text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <p className="text-green-600 font-medium">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            {message && (
              <div className={`p-3 rounded ${status === "error" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                {message}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@mavirecodoir.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>

            <button
              type="submit"
              disabled={isAccepting}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAccepting ? "Creating Account..." : "Accept Invite & Create Account"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/login")}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>}>
      <InviteContent />
    </Suspense>
  );
}
