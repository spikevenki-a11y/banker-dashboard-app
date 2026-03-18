import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const body = await req.json()
    const aadhaar_number = body.aadhaar_number
    const phone_number = body.phone_number
    const father_name = body.father_name
    const ledger_folio_number = body.ledger_folio_number
    const member_name = body.member_name

  try {
  
    const session = JSON.parse(c.value)
    const branchId = session.branch  

    // Lookup customer by Aadhaar
    console.log("Membership lookup with body:", body)
    const { rows2 } = await pool.query(
      `
      select 
            m.customer_code,
            m.membership_class,
            m.member_type,
            m.membership_no,
            m.ledger_folio_number ,
            m.board_resolution_number,
            
            TO_CHAR(m.join_date, 'YYYY-MM-DD') AS boardResolutionDate ,
            m.status,

            c.full_name ,
            c.father_name,
            c.gender,
            TO_CHAR(c.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
            c.customer_type,
            c.spouse_name,
            c.mobile_no,
            c.email,

            -- Address
            ca.house_no,
            ca.street,
            ca.village,
            ca.thaluk,
            ca.district,
            ca.state,
            ca.pincode,
            ca.email,
            ca.phone_no,

            -- KYC
            ck.aadhaar_no,
            ck.pan_no,
            ck.ration_no,
            ck.driving_license_no




        from memberships m 

        left join customers c 
            on c.customer_code = m.customer_code

        left join customer_address ca
            on ca.customer_code = m.customer_code
            
        left join customer_kycdetails ck
            on ck.customer_code = m.customer_code

        where m.branch_id = 23108001
            and  m.status = 'ACTIVE'
            and (
                ck.aadhaar_no like '%' || $1 || '%'
                and ca.phone_no like '%' || $2 || '%'
                and c.father_name like '%' || $3 || '%'
                and m.ledger_folio_number like '%' || $4 || '%'
                and c.full_name like '%' || $5 || '%'
            )

    `,
      [body.aadhaar_number, body.phone_number, body.father_name, body.ledger_folio_number, body.member_name],
    )

    let query = 
      `
      select 
            m.customer_code,
            m.membership_class,
            m.member_type,
            m.membership_no,
            m.ledger_folio_number ,
            m.board_resolution_number,
            
            TO_CHAR(m.join_date, 'YYYY-MM-DD') AS boardResolutionDate ,
            m.status,

            c.full_name ,
            c.father_name,
            c.gender,
            TO_CHAR(c.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
            c.customer_type,
            c.spouse_name,
            c.mobile_no,
            c.email,

            -- Address
            ca.house_no,
            ca.street,
            ca.village,
            ca.thaluk,
            ca.district,
            ca.state,
            ca.pincode,
            ca.email,
            ca.phone_no,

            -- KYC
            ck.aadhaar_no,
            ck.pan_no,
            ck.ration_no,
            ck.driving_license_no




        from memberships m 

        left join customers c 
            on c.customer_code = m.customer_code

        left join customer_address ca
            on ca.customer_code = m.customer_code
            
        left join customer_kycdetails ck
            on ck.customer_code = m.customer_code

        where m.branch_id = $1
            and  m.status = 'ACTIVE'

    `
    const params: any[] = [branchId]
    
    if (member_name) {
      params.push(member_name)
      query += ` AND c.full_name ilike'%' || $${params.length} || '%'`
    }
    if (aadhaar_number) {
      params.push(aadhaar_number)
      query += ` AND ck.aadhaar_no ilike '%' || $${params.length} || '%'`
    }
    if (phone_number) {
      params.push(phone_number)
      query += ` AND ca.phone_no ilike '%' || $${params.length} || '%'`
    }
    if (father_name) {
      params.push(father_name)
      query += ` AND c.father_name ilike '%' || $${params.length} || '%'`
    }
    if (ledger_folio_number) {
      params.push(ledger_folio_number)
      query += ` AND m.ledger_folio_number ilike '%' || $${params.length} || '%'`
    }
    const { rows } = await pool.query(query, params)

    if (rows.length === 0) {
      return NextResponse.json({ found: false }, { status: 404 })
    }
    return NextResponse.json({ found: true, memberData: rows })
  } catch (error: any) {
    console.error("[v0] Customer lookup error:", error)
    return NextResponse.json({ error: "Failed to lookup customer" }, { status: 500 })
  }
}
