import { neon } from "@neondatabase/serverless";

export async function handler() {
  try {
    // Verificamos que la variable exista
    if (!process.env.DATABASE_URL) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: "DATABASE_URL not set" })
      };
    }

    // Conectar a Neon
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT now() as now`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, now: rows[0].now })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: String(err.message || err) })
    };
  }
}
