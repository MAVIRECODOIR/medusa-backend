// Role definitions for retail admin
export type UserRole = "admin" | "manager" | "staff" | "support"

export interface RolePermissions {
  canViewDashboard: boolean
  canViewOrders: boolean
  canEditOrders: boolean
  canCreateDraftOrders: boolean
  canViewProducts: boolean
  canEditProducts: boolean
  canViewCustomers: boolean
  canEditCustomers: boolean
  canViewReturns: boolean
  canProcessReturns: boolean
  canViewPromotions: boolean
  canCreatePromotions: boolean
  canViewInventory: boolean
  canEditInventory: boolean
  canViewPricing: boolean
  canEditPricing: boolean
  canViewSupport: boolean
  canManageSupport: boolean
  canViewBackInStock: boolean
  canManageBackInStock: boolean
  canViewPreOrders: boolean
  canManagePreOrders: boolean
  canViewSettings: boolean
  canEditSettings: boolean
  canViewCustomerGroups: boolean
  canEditCustomerGroups: boolean
  canViewSalesChannels: boolean
  canEditSalesChannels: boolean
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  admin: {
    canViewDashboard: true,
    canViewOrders: true,
    canEditOrders: true,
    canCreateDraftOrders: true,
    canViewProducts: true,
    canEditProducts: true,
    canViewCustomers: true,
    canEditCustomers: true,
    canViewReturns: true,
    canProcessReturns: true,
    canViewPromotions: true,
    canCreatePromotions: true,
    canViewInventory: true,
    canEditInventory: true,
    canViewPricing: true,
    canEditPricing: true,
    canViewSupport: true,
    canManageSupport: true,
    canViewBackInStock: true,
    canManageBackInStock: true,
    canViewPreOrders: true,
    canManagePreOrders: true,
    canViewSettings: true,
    canEditSettings: true,
    canViewCustomerGroups: true,
    canEditCustomerGroups: true,
    canViewSalesChannels: true,
    canEditSalesChannels: true,
  },
  manager: {
    canViewDashboard: true,
    canViewOrders: true,
    canEditOrders: true,
    canCreateDraftOrders: true,
    canViewProducts: true,
    canEditProducts: true,
    canViewCustomers: true,
    canEditCustomers: true,
    canViewReturns: true,
    canProcessReturns: true,
    canViewPromotions: true,
    canCreatePromotions: false,
    canViewInventory: true,
    canEditInventory: true,
    canViewPricing: true,
    canEditPricing: false,
    canViewSupport: true,
    canManageSupport: true,
    canViewBackInStock: true,
    canManageBackInStock: true,
    canViewPreOrders: true,
    canManagePreOrders: true,
    canViewSettings: true,
    canEditSettings: false,
    canViewCustomerGroups: true,
    canEditCustomerGroups: false,
    canViewSalesChannels: true,
    canEditSalesChannels: false,
  },
  staff: {
    canViewDashboard: true,
    canViewOrders: true,
    canEditOrders: true,
    canCreateDraftOrders: false,
    canViewProducts: true,
    canEditProducts: false,
    canViewCustomers: true,
    canEditCustomers: false,
    canViewReturns: true,
    canProcessReturns: true,
    canViewPromotions: false,
    canCreatePromotions: false,
    canViewInventory: true,
    canEditInventory: true,
    canViewPricing: false,
    canEditPricing: false,
    canViewSupport: false,
    canManageSupport: false,
    canViewBackInStock: true,
    canManageBackInStock: false,
    canViewPreOrders: true,
    canManagePreOrders: false,
    canViewSettings: false,
    canEditSettings: false,
    canViewCustomerGroups: false,
    canEditCustomerGroups: false,
    canViewSalesChannels: false,
    canEditSalesChannels: false,
  },
  support: {
    canViewDashboard: true,
    canViewOrders: true,
    canEditOrders: false,
    canCreateDraftOrders: false,
    canViewProducts: true,
    canEditProducts: false,
    canViewCustomers: true,
    canEditCustomers: true,
    canViewReturns: true,
    canProcessReturns: false,
    canViewPromotions: false,
    canCreatePromotions: false,
    canViewInventory: false,
    canEditInventory: false,
    canViewPricing: false,
    canEditPricing: false,
    canViewSupport: true,
    canManageSupport: true,
    canViewBackInStock: false,
    canManageBackInStock: false,
    canViewPreOrders: false,
    canManagePreOrders: false,
    canViewSettings: false,
    canEditSettings: false,
    canViewCustomerGroups: false,
    canEditCustomerGroups: false,
    canViewSalesChannels: false,
    canEditSalesChannels: false,
  },
}

export function getUserRole(): UserRole {
  // In production, this would come from the user's session/JWT
  // For now, default to admin
  if (typeof window !== "undefined") {
    const storedRole = localStorage.getItem("user_role") as UserRole
    if (storedRole && rolePermissions[storedRole]) {
      return storedRole
    }
  }
  return "admin"
}

export function setUserRole(role: UserRole) {
  if (typeof window !== "undefined") {
    localStorage.setItem("user_role", role)
  }
}

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return rolePermissions[role][permission]
}

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  support: "Support",
}
