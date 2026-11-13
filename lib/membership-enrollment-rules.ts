import type { PoolClient } from "pg"

// Membership types accepted by POST /api/memberships/create
// ("member" → Class A Member, "associate" → Class B Nominal Member)
export const MEMBER_TYPE_MEMBER = "member"
export const MEMBER_TYPE_NOMINAL = "associate"

export const MEMBER_TYPE_LABELS: Record<string, string> = {
  [MEMBER_TYPE_MEMBER]: "Member",
  [MEMBER_TYPE_NOMINAL]: "Nominal Member",
}

// Branches at this hierarchy level (branchparameters.hierarchy_level = 2, District LDB)
// may enroll Nominal Members only.
export const NOMINAL_ONLY_HIERARCHY_LEVEL = 2

export type EnrollmentRules = {
  hierarchy_level: number | null
  nominal_only: boolean
  allowed_member_types: string[]
}

export function getEnrollmentRules(hierarchyLevel: number | null): EnrollmentRules {
  const nominalOnly = hierarchyLevel === NOMINAL_ONLY_HIERARCHY_LEVEL
  return {
    hierarchy_level: hierarchyLevel,
    nominal_only: nominalOnly,
    allowed_member_types: nominalOnly ? [MEMBER_TYPE_NOMINAL] : [MEMBER_TYPE_MEMBER, MEMBER_TYPE_NOMINAL],
  }
}

export const NOMINAL_ONLY_MESSAGE =
  "Only Nominal Member enrollment is allowed for this branch (hierarchy level 2). Select Nominal Member as the account type."

// Error message when the membership type is not allowed for the branch, otherwise "".
// Branches that are not nominal-only keep the existing enrollment rules unchanged.
export function getMemberTypeError(rules: EnrollmentRules, memberType: unknown): string {
  if (!rules.nominal_only) return ""
  return memberType === MEMBER_TYPE_NOMINAL ? "" : NOMINAL_ONLY_MESSAGE
}

// Reads the logged-in branch's hierarchy level from the branch configuration.
export async function loadBranchEnrollmentRules(
  db: Pick<PoolClient, "query">,
  branchId: number | string
): Promise<EnrollmentRules> {
  const { rows } = await db.query(
    `SELECT hierarchy_level FROM branchparameters WHERE branch_id = $1`,
    [branchId]
  )
  const level = rows[0]?.hierarchy_level
  return getEnrollmentRules(level === null || level === undefined ? null : Number(level))
}
