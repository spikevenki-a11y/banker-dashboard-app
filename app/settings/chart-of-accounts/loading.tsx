import { Loader2 } from "lucide-react"

export default function ChartOfAccountsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-slate-600">Loading Chart of Accounts...</p>
      </div>
    </div>
  )
}
