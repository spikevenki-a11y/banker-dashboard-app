import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch
    const url = new URL(req.url)
    const search        = url.searchParams.get("search")  || ""
    const typeFilter    = url.searchParams.get("type")    || ""
    const statusFilter  = url.searchParams.get("status")  || ""
    const floorFilter   = url.searchParams.get("floor")   || ""
    const sectionFilter = url.searchParams.get("section") || ""

    const params: (string | number)[] = [branchId]
    const conditions: string[] = ["l.branch_id = $1"]

    if (typeFilter) {
      params.push(Number(typeFilter))
      conditions.push(`l.locker_type_id = $${params.length}`)
    }
    if (statusFilter) {
      params.push(statusFilter.toUpperCase())
      conditions.push(`l.status = $${params.length}`)
    }
    if (floorFilter) {
      params.push(floorFilter)
      conditions.push(`COALESCE(l.floor_no, 'G') = $${params.length}`)
    }
    if (sectionFilter) {
      params.push(sectionFilter)
      conditions.push(`COALESCE(l.section, 'Main') = $${params.length}`)
    }
    if (search) {
      params.push(`%${search.trim()}%`)
      const idx = params.length
      conditions.push(
        `(l.locker_no ILIKE $${idx} OR COALESCE(c.full_name,'') ILIKE $${idx} OR la.membership_no::text ILIKE $${idx})`
      )
    }

    const whereClause = conditions.join(" AND ")

    const { rows: lockers } = await pool.query(
      `SELECT
         l.id,
         l.locker_no,
         l.status,
         COALESCE(l.floor_no, 'G')    AS floor_no,
         COALESCE(l.section,  'Main') AS section,
         l.row_no,
         l.cabinet_no,
         l.remarks,
         lt.locker_type_id            AS type_id,
         lt.type_name,
         lt.dimensions,
         lt.annual_rent,
         lt.no_of_rows,
         lt.no_of_cabinets,
         la.id                        AS assignment_id,
         la.membership_no,
         TO_CHAR(la.assigned_date, 'YYYY-MM-DD') AS assigned_date,
         TO_CHAR(la.expiry_date,   'YYYY-MM-DD') AS expiry_date,
         la.deposit_amount,
         c.full_name                  AS member_name
       FROM lockers l
       JOIN locker_types lt
         ON lt.locker_type_id = l.locker_type_id
       LEFT JOIN locker_assignments la
         ON la.locker_id = l.id AND la.status = 'ACTIVE'
       LEFT JOIN memberships m
         ON m.membership_no = la.membership_no AND m.branch_id = l.branch_id
       LEFT JOIN customers c
         ON c.customer_code = m.customer_code
       WHERE ${whereClause}
       ORDER BY
         lt.type_name,
         COALESCE(l.row_no, 9999),
         COALESCE(l.cabinet_no, 9999),
         l.locker_no`,
      params
    )

    const { rows: statsRows } = await pool.query(
      `SELECT
         COUNT(*)                                                    AS total,
         COUNT(*) FILTER (WHERE status = 'AVAILABLE')               AS available,
         COUNT(*) FILTER (WHERE status = 'ALLOCATED')               AS allocated,
         COUNT(*) FILTER (WHERE status = 'RESERVED')                AS reserved,
         COUNT(*) FILTER (WHERE status IN ('MAINTENANCE','BLOCKED')) AS maintenance
       FROM lockers WHERE branch_id = $1`,
      [branchId]
    )

    const { rows: typeRows } = await pool.query(
      `SELECT locker_type_id AS id, type_name, no_of_rows, no_of_cabinets
       FROM locker_types WHERE branch_id = $1 ORDER BY type_name`,
      [branchId]
    )

    const { rows: floorRows } = await pool.query(
      `SELECT DISTINCT COALESCE(floor_no,'G') AS floor_no
       FROM lockers WHERE branch_id = $1 ORDER BY 1`,
      [branchId]
    )

    const { rows: sectionRows } = await pool.query(
      `SELECT DISTINCT COALESCE(section,'Main') AS section
       FROM lockers WHERE branch_id = $1 ORDER BY 1`,
      [branchId]
    )

    return NextResponse.json({
      success: true,
      lockers,
      stats: statsRows[0],
      types: typeRows,
      floors: floorRows.map((r) => r.floor_no),
      sections: sectionRows.map((r) => r.section),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
