// app/api/debug-db/route.js

import pool from "@/lib/connection/db";

export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    console.log("Database connection credentials:",process.env.POSTGRES_HOST, process.env.POSTGRES_USER);
    
    return Response.json({
      success: true,
      time: result.rows[0].now,
      host: process.env.POSTGRES_HOST,
      user: process.env.POSTGRES_USER,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return Response.json({
      success: false,
      error: errorMessage,
      host: process.env.POSTGRES_HOST,
      stack: errorStack,
    }, { status: 500 });
  }
}