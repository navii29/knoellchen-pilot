/**
 * Echoes.solutions GPS-Integration — STUB-Client.
 *
 * ⚠️  STATUS: Wir haben aktuell KEINE offizielle Echoes-API-Doku.
 *     Alle Funktionen liefern realistische Dummy-Daten zurück, damit
 *     UI und Workflow getestet werden können. Sobald die echte API-Doku
 *     vorliegt, müssen alle mit `// TODO: Replace with real Echoes API call`
 *     markierten Stellen ersetzt werden.
 *
 * Annahmen über die echte API (zu validieren):
 *   - REST/JSON über HTTPS
 *   - Auth via "Authorization: Bearer {api_key}" oder "X-Api-Key"
 *   - Account-Scope via Header oder Query-Param
 *   - Endpunkte vermutlich: /devices, /devices/{id}/position, /devices/{id}/history
 */

// Konfigurierbare Base-URL — sobald wir die echte API kennen, hier einsetzen.
export const ECHOES_BASE_URL =
  process.env.ECHOES_BASE_URL ?? "https://api.echoes.solutions/v1";

export type EchoesDevice = {
  id: string;
  label: string;
  plate: string | null;
  online: boolean;
  battery_pct: number | null;
};

export type EchoesPosition = {
  device_id: string;
  lat: number;
  lng: number;
  accuracy_m: number;
  speed_kmh: number;
  heading_deg: number | null;
  recorded_at: string; // ISO
};

export type EchoesTripPoint = {
  recorded_at: string;
  lat: number;
  lng: number;
  speed_kmh: number;
};

export class EchoesError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// =========================================================
// Deterministische Pseudo-Zufallszahlen aus String (für stabile Stub-Daten)
// =========================================================
const hashString = (s: string): number => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const seededRandom = (seed: number, max: number): number => {
  // Einfacher LCG, deterministisch
  const x = Math.sin(seed) * 10000;
  return (x - Math.floor(x)) * max;
};

// München als Default-Zentrum für Demo-Positionen
const MUNICH = { lat: 48.1371, lng: 11.5754 };

const stubPosition = (deviceId: string): EchoesPosition => {
  const h = hashString(deviceId);
  const latOffset = (seededRandom(h, 0.08) - 0.04); // ±0.04° ≈ ±4 km
  const lngOffset = (seededRandom(h + 1, 0.08) - 0.04);
  const minutesAgo = Math.floor(seededRandom(h + 2, 30)); // 0–29 Min alt
  return {
    device_id: deviceId,
    lat: Number((MUNICH.lat + latOffset).toFixed(7)),
    lng: Number((MUNICH.lng + lngOffset).toFixed(7)),
    accuracy_m: Math.floor(5 + seededRandom(h + 3, 20)),
    speed_kmh: Math.floor(seededRandom(h + 4, 60)),
    heading_deg: Math.floor(seededRandom(h + 5, 360)),
    recorded_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  };
};

// =========================================================
// Public API (Stubs)
// =========================================================

export const getDevices = async (
  apiKey: string,
  accountId: string
): Promise<EchoesDevice[]> => {
  // TODO: Replace with real Echoes API call
  // Erwartet: GET ${ECHOES_BASE_URL}/devices?account_id=${accountId}
  //          Authorization: Bearer ${apiKey}
  if (!apiKey) throw new EchoesError(401, "Echoes API-Key fehlt");
  if (!accountId) throw new EchoesError(400, "Echoes Account-ID fehlt");

  // Stub: 3 Beispiel-Tracker
  return [
    {
      id: "ECHO-DEMO-001",
      label: "Tracker A",
      plate: "M-AV 5678",
      online: true,
      battery_pct: 87,
    },
    {
      id: "ECHO-DEMO-002",
      label: "Tracker B",
      plate: "M-OL 1001",
      online: true,
      battery_pct: 64,
    },
    {
      id: "ECHO-DEMO-003",
      label: "Tracker C",
      plate: null,
      online: false,
      battery_pct: 12,
    },
  ];
};

export const getDevicePosition = async (
  apiKey: string,
  deviceId: string
): Promise<EchoesPosition> => {
  // TODO: Replace with real Echoes API call
  // Erwartet: GET ${ECHOES_BASE_URL}/devices/${deviceId}/position
  //          Authorization: Bearer ${apiKey}
  if (!apiKey) throw new EchoesError(401, "Echoes API-Key fehlt");
  if (!deviceId) throw new EchoesError(400, "Device-ID fehlt");

  // Stub: deterministisch aus deviceId
  return stubPosition(deviceId);
};

export const getDeviceHistory = async (
  apiKey: string,
  deviceId: string,
  from: string,
  to: string
): Promise<EchoesTripPoint[]> => {
  // TODO: Replace with real Echoes API call
  // Erwartet: GET ${ECHOES_BASE_URL}/devices/${deviceId}/history?from=${from}&to=${to}
  //          Authorization: Bearer ${apiKey}
  if (!apiKey) throw new EchoesError(401, "Echoes API-Key fehlt");
  if (!deviceId) throw new EchoesError(400, "Device-ID fehlt");

  // Stub: ~20 Punkte zwischen from und to entlang einer Pseudo-Route
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs < fromMs) {
    return [];
  }
  const center = stubPosition(deviceId);
  const steps = 20;
  const stepMs = Math.max(60_000, Math.floor((toMs - fromMs) / steps));
  const out: EchoesTripPoint[] = [];
  for (let i = 0; i < steps; i++) {
    const h = hashString(`${deviceId}-${i}`);
    out.push({
      recorded_at: new Date(fromMs + i * stepMs).toISOString(),
      lat: Number((center.lat + (seededRandom(h, 0.04) - 0.02)).toFixed(7)),
      lng: Number((center.lng + (seededRandom(h + 1, 0.04) - 0.02)).toFixed(7)),
      speed_kmh: Math.floor(seededRandom(h + 2, 80)),
    });
  }
  return out;
};
