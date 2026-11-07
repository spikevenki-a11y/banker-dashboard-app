"use client"

import { useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Search, Trash2, UserPlus } from "lucide-react"
import { MemberSearchDialog } from "@/components/member-search-dialog"
import { calculateAge } from "@/lib/member-age"
import { isValidNomineePhone, normaliseNomineePhone } from "@/lib/savings-nominees"

// Nominee list + entry form — same behaviour as Savings Management → Open Savings
// Account → Nominee Details (Is Member lookup, auto-filled member details, manual
// entry for non-members, percentage that must total 100%). The list is saved by the
// caller's API with cleanNominees() / saveSavingsNominees() from lib/savings-nominees.

export const MAX_NOMINEES = 4

export type NomineeEntry = {
  name: string
  relation: string
  is_member: boolean
  membership_id: string | null
  dob: string | null
  gender: string | null
  age: number | null
  address: string | null
  phone: string | null
  percentage: number | null
}

const RELATIONS = ["Father", "Mother", "Spouse", "Son", "Daughter", "Brother", "Sister", "Other"]

const formatNomineeAddress = (p: any) =>
  [p?.house_no, p?.street, p?.village, p?.thaluk, p?.district, p?.state, p?.pincode]
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter(Boolean)
    .join(", ")

/** Total percentage check — exactly 100% whenever any nominee is added. */
export function nomineeTotals(nominees: NomineeEntry[]) {
  const hundredths = nominees.reduce((s, n) => s + Math.round((n.percentage || 0) * 100), 0)
  return {
    total: hundredths / 100,
    ok: nominees.length === 0 || hundredths === 10000,
    diff: Math.abs(10000 - hundredths) / 100,
    under: hundredths < 10000,
  }
}

export function NomineeEditor({
  nominees,
  onChange,
  asOfDate,
  excludeMembershipNo,
  excludeMessage = "The applicant cannot be their own nominee.",
  disabled = false,
  showMemberSearch = false,
}: {
  nominees: NomineeEntry[]
  onChange: (next: NomineeEntry[]) => void
  /** Date used to work out ages (business date); defaults to today */
  asOfDate?: string
  /** Membership number that may not be a nominee (e.g. the account holder) */
  excludeMembershipNo?: string | null
  excludeMessage?: string
  disabled?: boolean
  /** Show a Search Member button (member search popup) next to Membership ID */
  showMemberSearch?: boolean
}) {
  const [draftNomineeName, setDraftNomineeName] = useState("")
  const [draftNomineeRelation, setDraftNomineeRelation] = useState("")
  const [draftIsMember, setDraftIsMember] = useState(false)
  const [draftMembershipId, setDraftMembershipId] = useState("")
  const [draftDob, setDraftDob] = useState("")
  const [draftGender, setDraftGender] = useState("")
  const [draftAge, setDraftAge] = useState("")
  const [draftAddress, setDraftAddress] = useState("")
  const [draftPhone, setDraftPhone] = useState("") // editable; filled from the member record for a member nominee
  const [draftPercentage, setDraftPercentage] = useState("")
  const [draftMemberLoaded, setDraftMemberLoaded] = useState(false) // member details filled from lookup
  const [draftMemberLoading, setDraftMemberLoading] = useState(false)
  const [draftMemberNotFound, setDraftMemberNotFound] = useState(false) // lookup found no member: manual entry allowed
  const [draftNomineeError, setDraftNomineeError] = useState("")
  // Membership ID last looked up, so leaving the field again does not re-fetch it
  const [draftLookedUpNo, setDraftLookedUpNo] = useState("")
  // Bumped whenever the Membership ID changes, so a slower earlier lookup is ignored
  const nomineeLookupSeq = useRef(0)
  const [memberSearchOpen, setMemberSearchOpen] = useState(false)
  // Unique ids so several editors can be on one page
  const uid = useId()
  const fid = (name: string) => `nominee-${name}-${uid}`

  const asOf = asOfDate || new Date()
  const canAddNominee = nominees.length < MAX_NOMINEES

  // Forget the current lookup (and ignore any still in flight)
  const cancelNomineeLookup = () => {
    nomineeLookupSeq.current++
    setDraftLookedUpNo("")
    setDraftMemberLoading(false)
  }

  const clearDraftPersonal = () => {
    setDraftNomineeName("")
    setDraftDob("")
    setDraftGender("")
    setDraftAge("")
    setDraftAddress("")
    setDraftPhone("")
    setDraftMemberLoaded(false)
    setDraftMemberNotFound(false)
  }

  const resetDraftNominee = () => {
    clearDraftPersonal()
    setDraftNomineeRelation("")
    setDraftPercentage("")
    setDraftIsMember(false)
    setDraftMembershipId("")
    setDraftNomineeError("")
    cancelNomineeLookup()
  }

  const handleDraftIsMemberChange = (checked: boolean) => {
    setDraftIsMember(checked)
    setDraftMembershipId("")
    setDraftNomineeError("")
    clearDraftPersonal()
    cancelNomineeLookup()
  }

  // Manual entry: derive age from date of birth
  const handleDraftDobChange = (value: string) => {
    setDraftDob(value)
    const age = value ? calculateAge(value, asOf) : null
    setDraftAge(age !== null && age >= 0 ? String(age) : "")
  }

  // Load a member's details into the nominee draft
  const loadNomineeMember = async (memberNo: string) => {
    const no = memberNo.trim()
    if (!no) return
    const seq = ++nomineeLookupSeq.current
    setDraftLookedUpNo(no)
    setDraftNomineeError("")
    clearDraftPersonal()
    setDraftMembershipId(no)

    if (excludeMembershipNo && String(excludeMembershipNo) === no) {
      setDraftNomineeError(excludeMessage)
      return
    }
    if (nominees.some((n) => n.is_member && n.membership_id === no)) {
      setDraftNomineeError("This member is already added as a nominee.")
      return
    }

    setDraftMemberLoading(true)
    try {
      const res = await fetch(`/api/members/profile?membership_no=${encodeURIComponent(no)}`, { credentials: "include" })
      const data = await res.json()
      if (seq !== nomineeLookupSeq.current) return // Membership ID changed meanwhile
      if (!res.ok || !data.found) {
        setDraftNomineeError("No member found with this membership number.")
        setDraftMemberNotFound(true)
        return
      }
      const p = data.profile
      if (String(p.status || "").toUpperCase() !== "ACTIVE") {
        setDraftNomineeError("Only active members can be selected as a member nominee.")
        return
      }
      const age = p.date_of_birth ? calculateAge(p.date_of_birth, asOf) : null
      setDraftNomineeName(p.full_name || "")
      setDraftDob(p.date_of_birth || "")
      // Match the gender options (Male / Female / Other) so an editable gender select shows it
      const g = String(p.gender || "").trim()
      setDraftGender(["Male", "Female", "Other"].find((o) => o.toLowerCase() === g.toLowerCase()) || g)
      setDraftAge(age !== null && age >= 0 ? String(age) : "")
      setDraftAddress(formatNomineeAddress(p))
      setDraftPhone(p.mobile_no ? String(p.mobile_no).trim() : "")
      setDraftMemberLoaded(true)
    } catch {
      if (seq === nomineeLookupSeq.current) setDraftNomineeError("Failed to load member details. Please try again.")
    } finally {
      if (seq === nomineeLookupSeq.current) setDraftMemberLoading(false)
    }
  }

  // Membership ID field left (or Enter pressed): look the member up once per value
  const handleNomineeMembershipBlur = () => {
    const no = draftMembershipId.trim()
    if (!draftIsMember || !no || no === draftLookedUpNo) return
    loadNomineeMember(no)
  }

  // Nominee percentage: greater than 0 and not more than 100
  const draftPctNum = draftPercentage.trim() === "" ? NaN : Number(draftPercentage)
  const draftPctError =
    draftPercentage.trim() === ""
      ? ""
      : !Number.isFinite(draftPctNum) || draftPctNum <= 0 || draftPctNum > 100
        ? "Percentage must be greater than 0 and not more than 100."
        : ""
  const draftPctValid = draftPercentage.trim() !== "" && !draftPctError

  // Nominee phone (optional): 10 digits when given
  const draftPhoneValue = normaliseNomineePhone(draftPhone)
  const draftPhoneError =
    draftPhoneValue && !isValidNomineePhone(draftPhoneValue) ? "Phone number must be 10 digits." : ""

  // Member nominee: once a member is loaded, name, DOB, gender, age and address come
  // from the member record and are read-only (phone and relationship stay editable).
  // With Is Member ticked but no member loaded, the details stay locked while a
  // Membership ID is pending, and open for manual entry when the ID is cleared or no
  // member was found — such a nominee is saved as a non-member nominee.
  const draftAsMember = draftIsMember && draftMemberLoaded
  const detailsLocked = draftIsMember && !(draftMembershipId.trim() === "" || draftMemberNotFound)

  const draftReady =
    !disabled &&
    draftPctValid &&
    !draftPhoneError &&
    !!draftNomineeRelation &&
    (draftAsMember || (!detailsLocked && !!draftNomineeName.trim()))

  const totals = nomineeTotals(nominees)

  const handleAddNominee = () => {
    if (!draftReady) return
    const age = draftAge === "" ? null : Number(draftAge)
    if (!draftAsMember && age !== null && (!Number.isInteger(age) || age < 0 || age > 150)) {
      setDraftNomineeError("Age must be a whole number between 0 and 150.")
      return
    }
    onChange([
      ...nominees,
      {
        name: draftNomineeName.trim(),
        relation: draftNomineeRelation,
        is_member: draftAsMember,
        membership_id: draftAsMember ? draftMembershipId.trim() : null,
        dob: draftDob || null,
        gender: draftGender || null,
        age,
        address: draftAddress.trim() || null,
        phone: draftPhoneValue || null,
        percentage: Math.round(draftPctNum * 100) / 100,
      },
    ])
    resetDraftNominee()
  }

  const handleRemoveNominee = (idx: number) => onChange(nominees.filter((_, i) => i !== idx))

  return (
    <div className={`space-y-4 ${disabled ? "pointer-events-none opacity-50" : ""}`} aria-disabled={disabled}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Add up to {MAX_NOMINEES} nominees</p>
        <span className="text-xs text-muted-foreground tabular-nums">
          {nominees.length} / {MAX_NOMINEES} added
        </span>
      </div>

      {/* Added nominees list */}
      {nominees.length > 0 && (
        <div className="rounded-lg border divide-y">
          {nominees.map((n, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {n.name}
                    {n.is_member && (
                      <Badge variant="outline" className="border-amber-300 px-1.5 py-0 text-[10px] text-amber-700">
                        Member {n.membership_id}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      n.relation,
                      n.gender,
                      n.age !== null && n.age !== undefined ? `${n.age} yrs` : null,
                      n.dob,
                      n.phone ? `Ph ${n.phone}` : null,
                      n.percentage ? `${n.percentage}%` : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                  {n.address && <p className="break-words text-xs text-muted-foreground">{n.address}</p>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                onClick={() => handleRemoveNominee(idx)}
                aria-label={`Remove nominee ${idx + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Total nominee percentage */}
      {nominees.length > 0 && (
        <div
          className={`flex flex-wrap items-center justify-between gap-1 rounded-lg border px-3 py-2 text-sm ${
            totals.ok
              ? "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
          }`}
        >
          <span className="font-medium">Total Percentage: {totals.total}%</span>
          <span className="text-xs">
            {totals.ok
              ? "Total is 100%"
              : totals.under
                ? `${totals.diff}% remaining — total must be exactly 100%`
                : `${totals.diff}% excess — total must be exactly 100%`}
          </span>
        </div>
      )}

      {/* Add nominee entry form */}
      {canAddNominee && (
        <div className="space-y-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/30 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <UserPlus className="h-3.5 w-3.5" />
            Add Nominee
          </p>
          {/* Is Member */}
          <div className="flex items-center gap-2">
            <Checkbox
              id={fid("is-member")}
              checked={draftIsMember}
              onCheckedChange={(c) => handleDraftIsMemberChange(c === true)}
            />
            <Label htmlFor={fid("is-member")} className="cursor-pointer text-xs">
              Is Member
            </Label>
          </div>

          {/* Membership ID — enabled only for a member nominee */}
          <div className="space-y-1.5">
            <Label htmlFor={fid("membership")} className="text-xs">Membership ID</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id={fid("membership")}
                  placeholder={draftIsMember ? "Enter membership number" : "Tick Is Member to enable"}
                  value={draftMembershipId}
                  disabled={!draftIsMember}
                  className={draftMemberLoading ? "pr-9" : undefined}
                  onChange={(e) => {
                    // A changed or cleared ID drops the previously loaded member
                    setDraftMembershipId(e.target.value)
                    clearDraftPersonal()
                    setDraftNomineeError("")
                    cancelNomineeLookup()
                  }}
                  onBlur={handleNomineeMembershipBlur}
                  onKeyDown={(e) => e.key === "Enter" && handleNomineeMembershipBlur()}
                />
                {draftMemberLoading && (
                  <Loader2
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                    aria-label="Loading member"
                  />
                )}
              </div>
              {showMemberSearch && (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-1.5 bg-white"
                  disabled={!draftIsMember}
                  onClick={() => setMemberSearchOpen(true)}
                >
                  <Search className="h-4 w-4" />
                  Search Member
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={fid("name")} className="text-xs">Nominee Name</Label>
              <Input
                id={fid("name")}
                placeholder={detailsLocked ? "Filled from member record" : "Enter nominee name"}
                value={draftNomineeName}
                disabled={detailsLocked}
                onChange={(e) => setDraftNomineeName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNominee()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={fid("relation")} className="text-xs">Relationship</Label>
              <Select value={draftNomineeRelation} onValueChange={setDraftNomineeRelation}>
                <SelectTrigger id={fid("relation")} className="w-full">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={fid("dob")} className="text-xs">Date of Birth</Label>
              <Input
                id={fid("dob")}
                type="date"
                value={draftDob}
                disabled={detailsLocked}
                max={asOfDate || undefined}
                onChange={(e) => handleDraftDobChange(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={fid("gender")} className="text-xs">Gender</Label>
                {detailsLocked ? (
                  <Input id={fid("gender")} value={draftGender} disabled placeholder="—" />
                ) : (
                  <Select value={draftGender} onValueChange={setDraftGender}>
                    <SelectTrigger id={fid("gender")} className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fid("age")} className="text-xs">Age</Label>
                <Input
                  id={fid("age")}
                  type="number"
                  min="0"
                  max="150"
                  step="1"
                  value={draftAge}
                  disabled={detailsLocked || !!draftDob}
                  onChange={(e) => setDraftAge(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={fid("percentage")} className="text-xs">Nominee Percentage (%) *</Label>
              <Input
                id={fid("percentage")}
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                placeholder="e.g. 50"
                value={draftPercentage}
                onChange={(e) => setDraftPercentage(e.target.value)}
              />
              {draftPctError && <p className="text-xs text-red-600">{draftPctError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={fid("phone")} className="text-xs">Phone Number</Label>
              <Input
                id={fid("phone")}
                type="tel"
                inputMode="numeric"
                maxLength={15}
                placeholder={draftAsMember ? "Filled from member record" : "Enter 10-digit phone number"}
                value={draftPhone}
                onChange={(e) => setDraftPhone(e.target.value)}
              />
              {draftPhoneError && <p className="text-xs text-red-600">{draftPhoneError}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={fid("address")} className="text-xs">Address</Label>
              <Input
                id={fid("address")}
                placeholder={detailsLocked ? "Filled from member record" : "Enter nominee address"}
                value={draftAddress}
                disabled={detailsLocked}
                onChange={(e) => setDraftAddress(e.target.value)}
              />
            </div>
          </div>
          {draftNomineeError && <p className="text-xs text-red-600">{draftNomineeError}</p>}
          {draftIsMember && draftMemberNotFound && (
            <p className="text-xs text-muted-foreground">
              Enter the nominee&apos;s details manually — they will be saved as a non-member nominee.
            </p>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddNominee}
            disabled={!draftReady}
            className="gap-1.5 border-amber-300 bg-white text-amber-700 hover:bg-amber-50 hover:text-amber-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Nominee
          </Button>
        </div>
      )}

      {showMemberSearch && (
        <MemberSearchDialog
          open={memberSearchOpen}
          onOpenChange={setMemberSearchOpen}
          excludeMembershipNo={excludeMembershipNo ? String(excludeMembershipNo) : undefined}
          // Picked member goes through the same lookup and checks as a typed Membership ID
          onSelect={(member) => loadNomineeMember(String(member.membership_no))}
        />
      )}
    </div>
  )
}
