// app/api/configs/route.ts
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

type SettingValue = string | number | boolean | object | null

export async function GET() {
  try {
    // 🔐 Basic auth check (UI-level protection)
    const session = (await cookies()).get("banker_session")
    if (!session) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    // 1️⃣ Fetch config sections (UI structure)
    const { rows: sections } = await pool.query(`
      SELECT
        id,
        title,
        description,
        icon,
        color,
        bg_color
      FROM config_sections
      ORDER BY id
    `)

    // 2️⃣ Fetch config settings (UI fields)
    const { rows: settings } = await pool.query(`
      SELECT
        section_id,
        setting_id,
        label,
        value,
        type
      FROM config_settings
      ORDER BY section_id, setting_id
    `)

    // 3️⃣ Group settings by section
    const settingsBySection: Record<string, any[]> = {}

    for (const s of settings) {
      let parsedValue: SettingValue = s.value

      switch (s.type) {
        case "boolean":
          parsedValue = s.value === "true"
          break
        case "number":
          parsedValue = Number(s.value)
          break
        case "json":
          try {
            parsedValue = JSON.parse(s.value)
          } catch {
            parsedValue = null
          }
          break
        default:
          parsedValue = s.value
      }

      if (!settingsBySection[s.section_id]) {
        settingsBySection[s.section_id] = []
      }

      settingsBySection[s.section_id].push({
        settingId: s.setting_id,
        label: s.label,
        value: parsedValue,
        type: s.type,
      })
      console.log("****************"+settingsBySection[s.section_id])
    }

    // 4️⃣ Build final UI response
    const data = sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      icon: section.icon,
      color: section.color,
      bgColor: section.bg_color,
      settings: settingsBySection[section.id] || [],
    }))
    console.log(Response.json("---------------+++++++++-----------"+data))
    return Response.json(
      data
    )
  } catch (error) {
    console.error("Config UI fetch error:", error)

    return Response.json(
      { success: false, message: "Failed to load configuration UI" },
      { status: 500 }
    )
  }
}
