import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF-Schutz: prüft, ob eine User-gelieferte URL gefahrlos vom Server
 * gefetcht werden darf. Blockt andere Protokolle als http(s) und Ziele in
 * privaten / Loopback / Link-Local / metadata-Bereichen (z.B. 169.254.169.254).
 *
 * Gibt eine Fehlermeldung zurück oder null wenn die URL ok ist.
 */
export async function checkFetchUrl(raw: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "Ungültige URL.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Nur http/https-URLs sind erlaubt.";
  }

  const host = parsed.hostname;
  // Direkte IP in der URL?
  if (isIP(host)) {
    if (isBlockedIp(host)) return "Interne/private IP-Adressen sind nicht erlaubt.";
    return null;
  }

  // Hostname → IPs auflösen und ALLE prüfen (DNS-Rebinding-resistent genug
  // für unseren Zweck: ein Hostname, der auf eine interne IP zeigt, fliegt raus).
  try {
    const records = await lookup(host, { all: true });
    if (records.length === 0) return "Hostname konnte nicht aufgelöst werden.";
    for (const r of records) {
      if (isBlockedIp(r.address)) return "Ziel zeigt auf eine interne/private IP-Adresse.";
    }
  } catch {
    return "Hostname konnte nicht aufgelöst werden.";
  }
  return null;
}

function isBlockedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return isBlockedV4(ip);
  if (v === 6) return isBlockedV6(ip);
  return true; // unbekanntes Format → blocken
}

function isBlockedV4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = p as [number, number, number, number];
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // privat
  if (a === 127) return true; // Loopback
  if (a === 169 && b === 254) return true; // Link-Local + Cloud-Metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // privat
  if (a === 192 && b === 168) return true; // privat
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // Multicast/Reserved
  return false;
}

function isBlockedV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // Loopback / unspecified
  if (lower.startsWith("fe80")) return true; // Link-Local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // Unique-Local
  // IPv4-mapped (::ffff:a.b.c.d) auf die v4-Regeln zurückführen
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedV4(mapped[1]!);
  return false;
}
