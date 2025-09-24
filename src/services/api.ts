// src/services/api.ts

// Si tu front y las Functions están en el mismo dominio Netlify,
// usa BASE = "" (rutas relativas).
const BASE = "";

// Vite expone variables que empiecen por VITE_ al cliente.
const PUBLIC_API_KEY =
  (import.meta as any).env?.VITE_API_KEY || ""; // para POST protegidos

// --- Tipos ---

export type Passenger = {
  id: string;
  full_name: string;
  document_id?: string | null;
  phone?: string | null;
  notes?: string | null;
  created_at: string;
};

export type Conductor = {
  id: string;
  full_name: string;
  license_id?: string | null;
  phone?: string | null;
  active: boolean;
  created_at: string;
};

export type Trip = {
  id: string;
  passenger_id: string;
  conductor_id: string;
  status: "started" | "finished";
  origin?: string | null;
  destination?: string | null;
  started_at: string;
  finished_at?: string | null;
};

export type ReportRow = {
  trip_id: string;
  status: "started" | "finished";
  origin?: string | null;
  destination?: string | null;
  started_at: string;
  finished_at?: string | null;
  passenger_id: string;
  passenger_name: string;
  passenger_doc?: string | null;
  passenger_phone?: string | null;
  conductor_id: string;
  conductor_name: string;
  conductor_license?: string | null;
  conductor_phone?: string | null;
};

// --- Helper de fetch ---

async function request<T>(
  path: string,
  options: RequestInit = {},
  { needsKey = false }: { needsKey?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (needsKey) headers["x-api-key"] = PUBLIC_API_KEY;

  const res = await fetch(`${BASE}/.netlify/functions${path}`, {
    ...options,
    headers,
  });

  let json: any = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Respuesta no-JSON en ${path}: ${text.slice(0, 200)}`);
  }

  if (!res.ok || json?.ok === false) {
    const msg = json?.error || res.statusText || "Error de red";
    throw new Error(msg);
  }
  // Algunos endpoints devuelven {ok:true,data}, otros objeto directo
  return (json.data ?? json) as T;
}

// --- Health / DB ---

export async function health(): Promise<{ ok: boolean; has_DATABASE_URL?: boolean }> {
  return request<{ ok: boolean; has_DATABASE_URL?: boolean }(`/health`, { method: "GET" });
}

export async function dbCheck(): Promise<{ ok: boolean; now: string }> {
  return request<{ ok: boolean; now: string }>(`/db-check`, { method: "GET" });
}

// --- Pasajeros ---

export async function createPassenger(input: {
  full_name: string;
  document_id?: string;
  phone?: string;
  notes?: string;
}): Promise<Passenger> {
  return request<Passenger>(`/passengers`, {
    method: "POST",
    body: JSON.stringify(input),
  }, { needsKey: true });
}

export async function getPassenger(id: string): Promise<Passenger> {
  const q = new URLSearchParams({ id }).toString();
  return request<Passenger>(`/passengers?${q}`, { method: "GET" });
}

// --- Conductores ---

export async function createConductor(input: {
  full_name: string;
  license_id?: string;
  phone?: string;
  active?: boolean;
}): Promise<Conductor> {
  return request<Conductor>(`/conductors`, {
    method: "POST",
    body: JSON.stringify(input),
  }, { needsKey: true });
}

export async function listConductors(): Promise<Conductor[]> {
  return request<Conductor[]>(`/conductors`, { method: "GET" });
}

// --- Viajes ---

export async function startTrip(input: {
  passenger_id: string;
  conductor_id: string;
  origin?: string;
  destination?: string;
}): Promise<Trip> {
  return request<Trip>(`/trips-start`, {
    method: "POST",
    body: JSON.stringify(input),
  }, { needsKey: true });
}

export async function finishTrip(trip_id: string): Promise<Trip> {
  return request<Trip>(`/trips-finish`, {
    method: "POST",
    body: JSON.stringify({ trip_id }),
  }, { needsKey: true });
}

// --- Reporte ---

export async function getReport(trip_id: string): Promise<ReportRow> {
  const q = new URLSearchParams({ trip_id }).toString();
  return request<ReportRow>(`/reports?${q}`, { method: "GET" });
}
