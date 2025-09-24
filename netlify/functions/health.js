export async function handler() {
  const hasDbUrl = !!process.env.DATABASE_URL;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ok: true,
      has_DATABASE_URL: hasDbUrl
    })
  };
}
