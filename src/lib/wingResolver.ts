import { SupaBaseFunction } from "./SupaBase";

export interface LoggedInWingProfile {
  WingCode: string;
  WingTitle: string;
  WingEmail?: string;
  WingUserId?: string;
  wing_logo?: string;
  Total_Points?: number;
  Total_Registrations?: number;
}

let inMemoryWingCache: LoggedInWingProfile | null = null;

/**
 * Resolves the logged-in wing profile reliably across email, WingCode, or localStorage
 */
export async function resolveWingProfile(paramIdentifier?: string): Promise<LoggedInWingProfile | null> {
  try {
    let cleanParam = paramIdentifier ? decodeURIComponent(paramIdentifier).trim() : "";

    // 1. Check in-memory cache if identifier matches
    if (
      inMemoryWingCache &&
      cleanParam &&
      (inMemoryWingCache.WingCode.toLowerCase() === cleanParam.toLowerCase() ||
       (inMemoryWingCache.WingEmail && inMemoryWingCache.WingEmail.toLowerCase() === cleanParam.toLowerCase()))
    ) {
      return inMemoryWingCache;
    }

    // 2. Try URL parameter
    if (cleanParam) {
      let query = SupaBaseFunction
        .from("Chs-WingS")
        .select("*");

      if (cleanParam.includes("@")) {
        query = query.or(`WingEmail.ilike.${cleanParam},WingUserId.ilike.${cleanParam}`);
      } else {
        query = query.eq("WingCode", cleanParam);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        cacheWingProfile(data);
        return data as LoggedInWingProfile;
      }
    }

    // 3. Fallback to localStorage "user"
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const email = parsed.UserEmail?.trim();
        if (email) {
          const { data } = await SupaBaseFunction
            .from("Chs-WingS")
            .select("*")
            .or(`WingEmail.ilike.${email},WingUserId.ilike.${email}`)
            .maybeSingle();

          if (data) {
            cacheWingProfile(data);
            return data as LoggedInWingProfile;
          }
        }
      } catch (e) {
        console.error("Error reading stored user:", e);
      }
    }

    // 4. Fallback to cached wing profile in localStorage
    const cached = localStorage.getItem("cached_wing_profile");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as LoggedInWingProfile;
        inMemoryWingCache = parsed;
        return parsed;
      } catch (e) {
        console.error("Error parsing cached wing profile:", e);
      }
    }

    return null;
  } catch (err) {
    console.error("Error resolving wing profile:", err);
    return null;
  }
}

export function cacheWingProfile(profile: any, shouldDispatch = false) {
  try {
    if (profile && profile.WingCode) {
      inMemoryWingCache = profile as LoggedInWingProfile;
      localStorage.setItem("cached_wing_profile", JSON.stringify(profile));
      if (shouldDispatch) {
        window.dispatchEvent(new CustomEvent("wing-profile-synced", { detail: profile }));
      }
    }
  } catch (e) {
    console.error("Error caching wing profile:", e);
  }
}
