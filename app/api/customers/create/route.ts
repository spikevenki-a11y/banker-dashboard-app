import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = JSON.parse(c.value)
  console.log("User:", u.userId)

  const body = await req.json()

  // Permission check
  const { rowCount } = await pool.query(`
    select 1 from users usr 
    JOIN role_permissions rp ON rp.role = usr.role
    JOIN permissions p ON p.permission_code = rp.permission_code
    where  usr.id = $1 AND p.permission_code = 'MEMBER_CREATE'
  `,[u.userId])

  if (!rowCount) return NextResponse.json({ error:"No permission" }, { status:403 })
   console.log("Permission granted")

  try {
    // Auto customer code (8 digits)
    const { rows:[code] } = await pool.query(`SELECT LPAD(nextval('customer_code_seq')::text,8,'0') AS code`) 
    await pool.query(`
      INSERT INTO customers(
        customer_code,full_name,father_name,gender,date_of_birth,
        aadhaar_no,pan_no,mobile_no,email,address_line1,address_line2,
        village,taluk,district,state
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    `,[
      code.code, body.full_name, body.father_name, body.gender, body.dob,
      body.aadhar_id, body.pan_card_number, body.phone, body.email,
      body.address1, body.address2, body.village, body.taluk, body.district, body.state
    ])

    return NextResponse.json({ success:true, customer_code: code.code })
  } catch(e:any) {
    if (e.code === '23505') return NextResponse.json({ error:"Duplicate Aadhaar or PAN" },{status:409})
    throw e
  }
}
