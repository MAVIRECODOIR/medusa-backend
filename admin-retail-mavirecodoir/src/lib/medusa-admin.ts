import { siteConfig } from "./config";

export function createAdminClient(token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return {
    auth: {
      login: async (email: string, password: string) => {
        const res = await fetch(
          `${siteConfig.medusaBackendUrl}/auth/user/emailpass`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ email, password }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Authentication failed");
        }
        return res.json();
      },
    },
    users: {
      getMe: async () => {
        const res = await fetch(
          `${siteConfig.medusaBackendUrl}/admin/users/me`,
          { headers }
        );
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      },
    },
    admin: {
      orders: {
        list: async (params?: Record<string, string>) => {
          const qs = params ? "?" + new URLSearchParams(params).toString() : "";
          const res = await fetch(
            `${siteConfig.medusaBackendUrl}/admin/orders${qs}`,
            { headers }
          );
          if (!res.ok) throw new Error("Failed to fetch orders");
          return res.json();
        },
        retrieve: async (id: string) => {
          const res = await fetch(
            `${siteConfig.medusaBackendUrl}/admin/orders/${id}`,
            { headers }
          );
          if (!res.ok) throw new Error("Failed to fetch order");
          return res.json();
        },
      },
      customers: {
        list: async (params?: Record<string, string>) => {
          const qs = params ? "?" + new URLSearchParams(params).toString() : "";
          const res = await fetch(
            `${siteConfig.medusaBackendUrl}/admin/customers${qs}`,
            { headers }
          );
          if (!res.ok) throw new Error("Failed to fetch customers");
          return res.json();
        },
      },
      returns: {
        listPending: async () => {
          const res = await fetch(
            `${siteConfig.medusaBackendUrl}/custom/admin/returns`,
            {
              headers: {
                ...headers,
                "x-admin-secret": siteConfig.adminApiSecret,
              },
            }
          );
          if (!res.ok) throw new Error("Failed to fetch pending returns");
          return res.json();
        },
        handle: async (requestId: string, action: "approve" | "reject") => {
          const res = await fetch(
            `${siteConfig.medusaBackendUrl}/custom/admin/returns/${requestId}`,
            {
              method: "POST",
              headers: {
                ...headers,
                "x-admin-secret": siteConfig.adminApiSecret,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ action }),
            }
          );
          if (!res.ok) throw new Error("Failed to handle return");
          return res.json();
        },
      },
    },
  };
}
