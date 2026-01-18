import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import next from "next"

export async function POST(req:Request) {
  const c = (await cookies()).get("banker_session")
  if(!c) return NextResponse.json({error:"Unauthorized"},{status:401})
  const u = JSON.parse(c.value)
    

  const { customer_code, member_type } = await req.json()

  // Permission check
  const { rowCount:perm } = await pool.query(`
      select 1 from users usr 
    JOIN role_permissions rp ON rp.role = usr.role
    JOIN permissions p ON p.permission_code = rp.permission_code
    where  usr.id = $1 AND p.permission_code = 'MEMBER_CREATE'
  `,[u.userId])
  if(!perm) return NextResponse.json({error:"No permission"},{status:403})

  // Customer exists?
  const { rows:[cust] } = await pool.query(`SELECT customer_code FROM customers WHERE customer_code=$1`,[customer_code])
  if(!cust) return NextResponse.json({error:"Customer not found"},{status:404})

  // Duplicate active membership?
  const { rowCount:dup } = await pool.query(`
    SELECT 1 FROM memberships WHERE customer_code=$1 AND branch_id=$2
  `,[cust.customer_code,u.branch])
  if(dup) return NextResponse.json({error:"Already member in this branch"},{status:409})

  // Branchwise member no
  let nextNo = '0' // Default member no
  let member_type_desc = 'A'
  console.log("Member type:", member_type)
  if(member_type === 'Associate') {
    member_type_desc = 'A'
    const { rows:[next] } = await pool.query(`SELECT LPAD(a_last_number::text, 5, '0') AS formatted_number from membership_sequences where branch_id =$1`,[u.branch])
    nextNo = '01' + next.formatted_number

  }else if(member_type === 'Nominal') {
    member_type_desc = 'B'
    const { rows:[next] } = await pool.query(`SELECT LPAD(b_last_number::text, 5, '0') AS formatted_number from membership_sequences where branch_id =$1`,[u.branch])
    nextNo = '02' + next.formatted_number
  }
  console.log("Branch-------------------- ID:", u.branch)

  console.log("Next member no:", nextNo)

  await pool.query(`
    INSERT INTO memberships(customer_code,branch_id,member_type,membership_class,membership_no,join_date)
    VALUES($1,$2,$3,$4,$5,now())
  `,[cust.customer_code,u.branch,'INDIVIDUAL',member_type_desc,u.branch+nextNo])

  return NextResponse.json({success:true,member_no:u.branch+nextNo})
}
