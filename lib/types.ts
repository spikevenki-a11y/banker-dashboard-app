export interface User {
  id: string
  name: string
  email: string
  role: "staff" | "manager" | "admin" | "role1"
  branch: string
  initials: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => Promise<void>
}
