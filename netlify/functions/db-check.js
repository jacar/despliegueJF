export async function handler() {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ok: true,
      has_DATABASE_URL: !!process.env.DATABASE_URL
    })
  };
}
