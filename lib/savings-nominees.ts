import type { PoolClient } from "pg"
import { calculateAge } from "@/lib/member-age"

// Savings account nominees are stored in nominee_details (scripts/070_nominee_details.sql).
// Each row is linked to the savings account by (branch_id, account_number).
// is_member / member_id: when the nominee is an existing member, member_id holds the
// nominee's membership number and the personal details are taken from that member's record.

export const MAX_SAVINGS_NOMINEES = 4

// Deposit (Term / RD / Pigmy) nominees share nominee_details with savings accounts.
// Deposit account numbers can be identical to savings account numbers in the same
// branch, so deposit rows are keyed with a "DEP" prefix to keep them separate.
export const DEPOSIT_NOMINEE_PREFIX = "DEP"
export const depositNomineeAccountKey = (accountNumber: string | number) =>
  `${DEPOSIT_NOMINEE_PREFIX}${String(accountNumber).trim()}`

export type SavingsNomineeInput = {
  name: string
  relation: string
  is_member: boolean
  membership_id: string | null
  dob: string | null
  gender: string | null
  age: number | null
  address: string | null
  percentage: number | null // share of the nominee, > 0 and <= 100
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim())

// Normalises the request list: drops empty rows and caps it at MAX_SAVINGS_NOMINEES.
// Accepts the older { name, relation } shape as a non-member nominee.
export function cleanNominees(nominees: unknown): SavingsNomineeInput[] {
  if (!Array.isArray(nominees)) return []
  return nominees
    .map((n: any) => {
      const isMember = n?.is_member === true
      const ageRaw = n?.age
      const age = ageRaw === "" || ageRaw == null ? null : Number(ageRaw)
      const pctRaw = n?.percentage
      // 0 / blank = not set (nominees saved before the percentage field existed)
      const pct = pctRaw === "" || pctRaw == null || Number(pctRaw) === 0 ? null : Number(pctRaw)
      return {
        name: str(n?.name),
        relation: str(n?.relation),
        is_member: isMember,
        membership_id: isMember ? str(n?.membership_id) || null : null,
        dob: str(n?.dob) || null,
        gender: str(n?.gender) || null,
        age: age !== null && Number.isFinite(age) ? age : null,
        address: str(n?.address) || null,
        percentage: pct,
      }
    })
    .filter((n) => n.relation && (n.is_member ? n.membership_id : n.name))
    .slice(0, MAX_SAVINGS_NOMINEES)
}

// Builds a one-line address from customer_address columns
export function formatMemberAddress(a: Record<string, any>): string {
  return [a.house_no, a.street, a.village, a.thaluk, a.district, a.state, a.pincode]
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter(Boolean)
    .join(", ")
}

// Replaces the account's nominees. Must run inside the caller's transaction.
// Returns an error message (caller rolls back and responds 400) or null on success.
export async function saveSavingsNominees(
  client: PoolClient,
  opts: {
    branchId: number | string
    accountNumber: string
    holderMembershipNo: number | string | null
    businessDate: string
    nominees: SavingsNomineeInput[]
    requirePercentage?: boolean // new accounts must give every nominee a percentage
    requireTotal100?: boolean // when nominees are given, their percentages must total exactly 100
  }
): Promise<string | null> {
  const branchId = String(opts.branchId)
  const accountNumber = String(opts.accountNumber)
  const holderNo = opts.holderMembershipNo != null ? String(opts.holderMembershipNo) : ""
  const asOf = String(opts.businessDate || new Date().toISOString()).slice(0, 10)

  // Resolve and validate every nominee before writing anything
  const rows: {
    is_member: boolean; member_id: string | null; name: string; relation: string
    dob: string | null; gender: string | null; age: number; address: string | null
    percentage: number
  }[] = []
  const seenMembers = new Set<string>()

  for (const [idx, n] of opts.nominees.entries()) {
    const label = `Nominee ${idx + 1}`

    let percentage = 0
    if (n.percentage === null) {
      if (opts.requirePercentage) return `${label}: nominee percentage is required`
    } else {
      if (!Number.isFinite(n.percentage) || n.percentage <= 0 || n.percentage > 100) {
        return `${label}: nominee percentage must be greater than 0 and not more than 100`
      }
      percentage = Math.round(n.percentage * 100) / 100
    }

    if (n.is_member) {
      const memberId = String(n.membership_id)
      if (memberId === holderNo) return `${label}: the account holder cannot be their own nominee`
      if (seenMembers.has(memberId)) return `${label}: member ${memberId} is already added as a nominee`
      seenMembers.add(memberId)

      const { rows: found } = await client.query(
        `SELECT c.full_name, c.gender, TO_CHAR(c.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
                ca.house_no, ca.street, ca.village, ca.thaluk, ca.district, ca.state, ca.pincode
         FROM memberships m
         JOIN customers c ON c.customer_code = m.customer_code
         LEFT JOIN customer_address ca ON ca.customer_code = m.customer_code
         WHERE CAST(m.membership_no AS VARCHAR) = $1 AND m.branch_id = $2
         LIMIT 1`,
        [memberId, opts.branchId]
      )
      if (found.length === 0) return `${label}: member ${memberId} not found in this branch`

      const m = found[0]
      const age = calculateAge(m.date_of_birth, asOf)
      rows.push({
        is_member: true,
        member_id: memberId,
        name: String(m.full_name || "").trim() || n.name,
        relation: n.relation,
        dob: m.date_of_birth || null,
        gender: m.gender || null,
        age: age !== null && age >= 0 ? age : 0,
        address: formatMemberAddress(m) || null,
        percentage,
      })
    } else {
      if (!n.name) return `${label}: nominee name is required`
      let age = n.age
      if (n.dob) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(n.dob) || isNaN(new Date(n.dob).getTime())) {
          return `${label}: invalid date of birth`
        }
        const computed = calculateAge(n.dob, asOf)
        if (computed === null || computed < 0) return `${label}: date of birth cannot be in the future`
        age = computed
      }
      if (age !== null && (!Number.isInteger(age) || age < 0 || age > 150)) {
        return `${label}: age must be a whole number between 0 and 150`
      }
      rows.push({
        is_member: false,
        member_id: null,
        name: n.name,
        relation: n.relation,
        dob: n.dob,
        gender: n.gender,
        age: age ?? 0,
        address: n.address,
        percentage,
      })
    }
  }

  // Compare in paise-style hundredths to avoid floating point drift
  if (opts.requireTotal100 && rows.length > 0) {
    const totalHundredths = rows.reduce((s, r) => s + Math.round(r.percentage * 100), 0)
    if (totalHundredths !== 10000) {
      const total = totalHundredths / 100
      const diff = Math.abs(100 - total)
      return `Nominee percentages total ${total}%. They must add up to exactly 100% (${
        total < 100 ? `${diff}% remaining` : `${diff}% excess`
      }).`
    }
  }

  await client.query(
    `DELETE FROM nominee_details WHERE branch_id = $1 AND account_number = $2`,
    [branchId, accountNumber]
  )

  for (const r of rows) {
    // clock_timestamp() (not NOW()) so rows inserted in one transaction keep their entry order
    await client.query(
      `INSERT INTO nominee_details (
         branch_id, account_number, is_member, member_id,
         nominee_name, nominee_relation, nominee_dob, nominee_gender,
         nominee_age, nominee_address, nominee_percentage, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, clock_timestamp(), clock_timestamp())`,
      [
        branchId, accountNumber, r.is_member, r.member_id ? r.member_id.slice(0, 20) : null,
        r.name.slice(0, 100), r.relation.slice(0, 50), r.dob, r.gender ? r.gender.slice(0, 10) : null,
        r.age, r.address, r.percentage,
      ]
    )
  }

  return null
}
