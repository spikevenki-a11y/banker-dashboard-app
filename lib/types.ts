export interface User {
  id: string
  name: string
  email: string
  role: "staff" | "manager" | "admin" | "role1"
  branch: string
  branch_id?: number
  initials: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => Promise<void>
}
export interface Members {
  id: string
  member_id: string
  full_name: string
  email: string
  phone: string
  address: string
  account_type: string
  account_balance: number
  status: string
  joined_date: string
  branch_id: number
} 