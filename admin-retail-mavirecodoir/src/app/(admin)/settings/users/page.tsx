"use client";

import { useEffect, useState } from "react";
import { Plus, Search, User, Shield, Edit, Trash2, MoreVertical } from "lucide-react";
import { getUserRole, type UserRole, roleLabels } from "@/lib/roles";

export default function UsersManagementPage() {
  const currentUserRole = getUserRole();
  
  // Only admins can access this page
  if (currentUserRole !== "admin") {
    return (
      <div className="card-bordered p-12 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Access Denied</h2>
        <p className="text-sm text-muted-foreground">Only administrators can manage users.</p>
      </div>
    );
  }

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "staff" as UserRole,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
      const method = editingUser ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setShowCreateModal(false);
      setEditingUser(null);
      setFormData({ email: "", first_name: "", last_name: "", role: "staff" });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      role: user.role || "staff",
    });
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingUser(null);
    setFormData({ email: "", first_name: "", last_name: "", role: "staff" });
    setError(null);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage admin user accounts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-foreground text-foreground-foreground px-3 py-2 text-xs font-medium hover:bg-foreground/90 transition-colors"
        >
          <Plus size={14} />
          Add User
        </button>
      </div>

      {error && (
        <div className="card-bordered p-4 bg-destructive/10 border-destructive">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
        />
      </div>

      {loading ? (
        <div className="card-bordered p-12 text-center">
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card-bordered p-12 text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "No users found matching your search" : "No users yet"}
          </p>
        </div>
      ) : (
        <div className="card-bordered overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User size={14} className="text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {user.first_name} {user.last_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                      user.role === "admin" 
                        ? "bg-destructive/10 text-destructive" 
                        : user.role === "manager"
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <Shield size={10} />
                      {roleLabels[user.role as UserRole] || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit user"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card-bordered w-full max-w-md bg-background p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {editingUser ? "Edit User" : "Add New User"}
            </h2>
            
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                  placeholder="user@example.com"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">
                  Role *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                >
                  <option value="admin">Admin - Full access</option>
                  <option value="manager">Manager - Can manage operations</option>
                  <option value="staff">Staff - Can process orders</option>
                  <option value="support">Support - Customer service only</option>
                </select>
              </div>
              {!editingUser && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    A password reset link will be sent to the user's email address after creation.
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 h-9 rounded-lg border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-9 rounded-lg bg-foreground text-foreground-foreground text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Saving..." : editingUser ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
