import { SupaBaseFunction } from "./SupaBase";

export interface LoggedInControllerProfile {
  controller_uuid: string;
  controller_fullName: string;
  controller_email: string;
  controller_id: string;
  category_uuid: string | null;
  category_title?: string;
  controller_img?: string | null;
  is_active?: boolean;
  controller_user_id?: string | null;
  created_at?: string;
}

let inMemoryControllerCache: LoggedInControllerProfile | null = null;

export const cacheControllerProfile = (profile: LoggedInControllerProfile) => {
  inMemoryControllerCache = profile;
  try {
    localStorage.setItem("cached_controller_profile", JSON.stringify(profile));
  } catch (err) {
    console.warn("Could not cache controller profile in localStorage:", err);
  }
};

/**
 * Resolves the logged-in Category Controller profile reliably across email, controller_id, or localStorage.
 */
export async function resolveControllerProfile(
  paramIdentifier?: string
): Promise<LoggedInControllerProfile | null> {
  try {
    const cleanParam = paramIdentifier ? decodeURIComponent(paramIdentifier).trim() : "";

    // 1. Check in-memory cache if identifier matches
    if (
      inMemoryControllerCache &&
      cleanParam &&
      (inMemoryControllerCache.controller_email.toLowerCase() === cleanParam.toLowerCase() ||
        inMemoryControllerCache.controller_id.toLowerCase() === cleanParam.toLowerCase() ||
        inMemoryControllerCache.controller_uuid === cleanParam)
    ) {
      return inMemoryControllerCache;
    }

    // 2. Try URL parameter or explicitly provided identifier
    if (cleanParam) {
      let query = SupaBaseFunction.from("Category_Controller").select("*");

      if (cleanParam.includes("@")) {
        query = query.or(
          `controller_email.ilike.${cleanParam},controller_user_id.ilike.${cleanParam}`
        );
      } else {
        query = query.or(
          `controller_id.ilike.${cleanParam},controller_uuid.eq.${cleanParam}`
        );
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        // Resolve category title
        let categoryTitle = "General Category";
        if (data.category_uuid) {
          const { data: catData } = await SupaBaseFunction
            .from("Our_Category")
            .select("category_title")
            .eq("category_id", data.category_uuid)
            .maybeSingle();
          if (catData?.category_title) {
            categoryTitle = catData.category_title;
          }
        }

        const fullProfile: LoggedInControllerProfile = {
          ...data,
          category_title: categoryTitle,
        };
        cacheControllerProfile(fullProfile);
        return fullProfile;
      }
    }

    // 3. Fallback to localStorage "user"
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const email = parsed.UserEmail?.trim();
        if (email) {
          const { data, error } = await SupaBaseFunction
            .from("Category_Controller")
            .select("*")
            .or(`controller_email.ilike.${email},controller_user_id.ilike.${email}`)
            .maybeSingle();

          if (!error && data) {
            let categoryTitle = "General Category";
            if (data.category_uuid) {
              const { data: catData } = await SupaBaseFunction
                .from("Our_Category")
                .select("category_title")
                .eq("category_id", data.category_uuid)
                .maybeSingle();
              if (catData?.category_title) {
                categoryTitle = catData.category_title;
              }
            }
            const fullProfile: LoggedInControllerProfile = {
              ...data,
              category_title: categoryTitle,
            };
            cacheControllerProfile(fullProfile);
            return fullProfile;
          }
        }
      } catch (e) {
        console.warn("Could not parse localStorage user:", e);
      }
    }

    // 4. Fallback to cached profile if available
    const cached = localStorage.getItem("cached_controller_profile");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        inMemoryControllerCache = parsed;
        return parsed;
      } catch {
        // ignore
      }
    }

    return null;
  } catch (err) {
    console.error("Error in resolveControllerProfile:", err);
    return null;
  }
}
