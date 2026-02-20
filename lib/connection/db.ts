import "server-only";
import { Pool } from "pg"
import dns from "dns/promises"
import dotenv from "dotenv"

dotenv.config()

// Force Node to resolve IPv4 first
dns.setDefaultResultOrder("ipv4first")
const dbUrl = new URL(process.env.POSTGRES_URL!)

  // Resolve hostname to IPv4
const ipv4Address = (await dns.lookup(dbUrl.hostname, { family: 4 })).address
const pool = new Pool({
    host: ipv4Address,
    port: Number(dbUrl.port) || 5432,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1), // remove leading '/'
    max: 10,
    idleTimeoutMillis: 30000,
});

export default pool;
