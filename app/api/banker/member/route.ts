import { NextRequest, NextResponse } from 'next/server';
import { Members } from '@/lib/types';
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"

export async function GET(request: NextRequest) {
    try {
        // TODO: Replace with your actual data source (database, external API, etc.)

        
        const [members, setMembers] = useState<Members[]>([])
        
        const supabase = createClient()
        const { user } = useAuth()
        let query = supabase.from("members").select("*")

        if (user?.role !== "admin" && user?.branch) {
          const branchId = typeof user.branch === "string" ? Number.parseInt(user.branch) : user.branch
          if (!isNaN(branchId)) {
            query = query.eq("branch_id", branchId)
          }
        }

        const { data, error } = await query

        if (error) {
          console.error("[v0] Error loading members:", error)
        } else {
          console.log("[v0] Fetched members:", data)
          setMembers(data || [])
        }

        return NextResponse.json(members, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch members' },
            { status: 500 }
        );
    }
}