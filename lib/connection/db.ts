import "server-only";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.POSTGRES_HOST, // *.supabase.com
  port: 5432,               // ← hardcoded
  database: "postgres",
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

export default pool;
