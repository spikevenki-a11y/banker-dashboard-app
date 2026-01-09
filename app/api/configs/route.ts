// app/api/members/route.ts
import pool from "@/lib/connection/db";
import { NextResponse } from "next/server";

console.log("API Route: /api/members accessed");
export async function GET() {
    console.log("Fetching members from database...");
    try {
        const { rows } = await pool.query("SELECT * FROM nextnumber");
        console.log("Members fetched:", rows);
        return NextResponse.json(rows);
    } catch (error) {
        console.log("Error fetching members:", error);
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }
}
