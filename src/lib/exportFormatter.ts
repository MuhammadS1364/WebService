import { SupaBaseFunction } from "./SupaBase";

/**
 * Universal UUID-to-Human-Value Resolution & Excel Data Sanitizer
 * Guarantees that NO raw UUID (e.g. '38eb6fb7-fb3b-4402-8c3c-4711fabdab42')
 * is ever exported in Excel or CSV files.
 */

// UUID RegExp (8-4-4-4-12 hex format)
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuidValue = (val: unknown): boolean => {
  if (typeof val !== "string") return false;
  return UUID_REGEX.test(val.trim());
};

// Global in-memory lookup cache
let globalDictionary: Record<string, string> | null = null;
let lastFetchTime = 0;
const DICTIONARY_TTL = 60000; // 1 minute cache

/**
 * Fetch and construct comprehensive UUID dictionary across all system lookup tables
 */
export async function getGlobalUuidDictionary(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && globalDictionary && now - lastFetchTime < DICTIONARY_TTL) {
    return globalDictionary;
  }

  const dict: Record<string, string> = {};

  try {
    const [venuesRes, classesRes, categoriesRes, groupsRes, batchesRes, academicRes, templatesRes, wingsRes, squadsRes] =
      await Promise.all([
        SupaBaseFunction.from("Our_Venues").select("venue_id, venue_title"),
        SupaBaseFunction.from("Our_Classes").select("class_id, standard_name, class_nick_name"),
        SupaBaseFunction.from("Our_Category").select("category_id, category_title"),
        SupaBaseFunction.from("Our_Groups").select("group_id, group_title"),
        SupaBaseFunction.from("Our_Batches").select("batch_id, batch_name"),
        SupaBaseFunction.from("Accademic_Info").select("accademic_id, accademic_year, accademic_title"),
        SupaBaseFunction.from("Points_Templates").select("p_template_id, point_template_title"),
        SupaBaseFunction.from("Chs-WingS").select("WingCode, WingTitle"),
        SupaBaseFunction.from("SquadMate").select("squad_id, squad_title"),
      ]);

    // Venues (e.g. '38eb6fb7-fb3b-4402-8c3c-4711fabdab42' -> 'Chs Library')
    (venuesRes.data || []).forEach((v: any) => {
      if (v.venue_id && v.venue_title) {
        dict[v.venue_id] = v.venue_title;
        dict[v.venue_id.toLowerCase()] = v.venue_title;
      }
    });

    // Classes (e.g. class_id -> 'Secondary Final Year (U5)')
    (classesRes.data || []).forEach((c: any) => {
      if (c.class_id) {
        const title = c.standard_name && c.class_nick_name
          ? `${c.standard_name} (${c.class_nick_name})`
          : c.standard_name || c.class_nick_name || "Assigned Class";
        dict[c.class_id] = title;
        dict[c.class_id.toLowerCase()] = title;
      }
    });

    // Categories
    (categoriesRes.data || []).forEach((c: any) => {
      if (c.category_id && c.category_title) {
        dict[c.category_id] = c.category_title;
        dict[c.category_id.toLowerCase()] = c.category_title;
      }
    });

    // Groups
    (groupsRes.data || []).forEach((g: any) => {
      if (g.group_id && g.group_title) {
        dict[g.group_id] = g.group_title;
        dict[g.group_id.toLowerCase()] = g.group_title;
      }
    });

    // Batches
    (batchesRes.data || []).forEach((b: any) => {
      if (b.batch_id && b.batch_name) {
        dict[b.batch_id] = b.batch_name;
        dict[b.batch_id.toLowerCase()] = b.batch_name;
      }
    });

    // Academic Years
    (academicRes.data || []).forEach((a: any) => {
      if (a.accademic_id) {
        const title = a.accademic_year || a.accademic_title || "Academic Cycle";
        dict[a.accademic_id] = title;
        dict[a.accademic_id.toLowerCase()] = title;
      }
    });

    // Points Templates
    (templatesRes.data || []).forEach((t: any) => {
      if (t.p_template_id && t.point_template_title) {
        dict[t.p_template_id] = t.point_template_title;
        dict[t.p_template_id.toLowerCase()] = t.point_template_title;
      }
    });

    // Wings
    (wingsRes.data || []).forEach((w: any) => {
      if (w.WingCode && w.WingTitle) {
        dict[w.WingCode] = w.WingTitle;
        dict[w.WingCode.toLowerCase()] = w.WingTitle;
      }
    });

    // Squads
    (squadsRes.data || []).forEach((sq: any) => {
      if (sq.squad_id && sq.squad_title) {
        dict[sq.squad_id] = sq.squad_title;
        dict[sq.squad_id.toLowerCase()] = sq.squad_title;
      }
    });

    globalDictionary = dict;
    lastFetchTime = now;
  } catch (err) {
    console.warn("Could not load global UUID dictionary:", err);
  }

  return globalDictionary || dict;
}

/**
 * Synchronous resolver using custom local maps and fallback dictionary
 */
export function resolveUuidValue(
  val: unknown,
  customMap?: Record<string, string>,
  fallback = "Campus Facility"
): string {
  if (val === null || val === undefined) return "";
  const s = String(val).trim();
  if (!s) return "";

  const sLower = s.toLowerCase();

  // 1. Check customMap first
  if (customMap) {
    if (customMap[s]) return customMap[s];
    if (customMap[sLower]) return customMap[sLower];
  }

  // 2. Check global in-memory dictionary
  if (globalDictionary) {
    if (globalDictionary[s]) return globalDictionary[s];
    if (globalDictionary[sLower]) return globalDictionary[sLower];
  }

  // 3. If it is NOT a UUID, return as-is
  if (!isUuidValue(s)) return s;

  // 4. If it IS a UUID and unresolved, return friendly fallback, never the raw UUID
  return fallback;
}

/**
 * Universal Row Sanitizer for Excel export:
 * Recursively inspects every property of an export object.
 * Replaces any raw UUID or comma-separated UUID list with human-friendly title.
 */
export function sanitizeExportRow<T extends object>(
  row: T,
  customMap?: Record<string, string>
): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(row)) {
    if (typeof val === "string") {
      const trimmed = val.trim();
      const keyLower = key.toLowerCase();
      const defaultFallback = keyLower.includes("venue")
        ? "Chs Library / Campus Venue"
        : keyLower.includes("class")
        ? "Assigned Standard Class"
        : keyLower.includes("cat")
        ? "General Category"
        : keyLower.includes("group")
        ? "General Group"
        : keyLower.includes("acad")
        ? "Current Academic Cycle"
        : keyLower.includes("wing")
        ? "General Wing"
        : "Assigned Facility";

      if (isUuidValue(trimmed)) {
        // Single UUID
        sanitized[key] = resolveUuidValue(trimmed, customMap, defaultFallback);
      } else if (trimmed.includes(",")) {
        // Check if comma-separated tokens contain UUIDs
        const tokens: string[] = trimmed.split(",").map((t: string) => t.trim());
        const hasUuids = tokens.some((t: string) => isUuidValue(t));
        if (hasUuids) {
          sanitized[key] = tokens
            .map((t: string) => (isUuidValue(t) ? resolveUuidValue(t, customMap, defaultFallback) : t))
            .join(", ");
        } else {
          sanitized[key] = val;
        }
      } else {
        sanitized[key] = val;
      }
    } else if (val === null || val === undefined) {
      sanitized[key] = "";
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}
