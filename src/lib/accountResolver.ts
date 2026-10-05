import { SupaBaseFunction } from "./SupaBase";

export interface LoggedInStudentProfile {
  AddNo: string;
  StudentName: string;
  StudentEmail: string;
  Student_Photo_Urls?: string;
  CollegeName?: string;
  Class?: string;
  FatherName?: string;
  StnState?: string;
  StnDistrict?: string;
  Grand_Total_Points?: number;
}

/**
 * In-memory cache to prevent redundant network hits and avoid render bouncing
 */
let inMemoryProfileCache: LoggedInStudentProfile | null = null;

/**
 * Robustly resolves the logged-in student's profile without triggering loop dispatches.
 */
export async function resolveStudentProfile(paramIdentifier?: string): Promise<LoggedInStudentProfile | null> {
  try {
    let cleanParam = paramIdentifier ? decodeURIComponent(paramIdentifier).trim() : "";

    // 1. Check in-memory cache first if identifier matches
    if (
      inMemoryProfileCache &&
      cleanParam &&
      (inMemoryProfileCache.StudentEmail.toLowerCase() === cleanParam.toLowerCase() ||
       inMemoryProfileCache.AddNo.toLowerCase() === cleanParam.toLowerCase())
    ) {
      return inMemoryProfileCache;
    }

    // 2. Try resolving using URL parameter
    if (cleanParam) {
      if (cleanParam.includes("@")) {
        // Query by email (case-insensitive)
        const { data } = await SupaBaseFunction
          .from("StudentsBox")
          .select("*")
          .ilike("StudentEmail", cleanParam)
          .maybeSingle();

        if (data) {
          cacheStudentProfile(data, false);
          return data as LoggedInStudentProfile;
        }
      } else {
        // Query by Admission Number (e.g. U1364)
        const { data } = await SupaBaseFunction
          .from("StudentsBox")
          .select("*")
          .eq("AddNo", cleanParam)
          .maybeSingle();

        if (data) {
          cacheStudentProfile(data, false);
          return data as LoggedInStudentProfile;
        }
      }
    }

    // 3. Fallback to localStorage logged in user
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      const userEmail = parsed.UserEmail?.trim();

      if (userEmail) {
        const { data } = await SupaBaseFunction
          .from("StudentsBox")
          .select("*")
          .ilike("StudentEmail", userEmail)
          .maybeSingle();

        if (data) {
          cacheStudentProfile(data, false);
          return data as LoggedInStudentProfile;
        }
      }
    }

    // 4. Check if cached profile exists in localStorage
    const cached = localStorage.getItem("cached_student_profile");
    if (cached) {
      const parsed = JSON.parse(cached) as LoggedInStudentProfile;
      inMemoryProfileCache = parsed;
      return parsed;
    }

    return null;
  } catch (err) {
    console.error("Error resolving student profile:", err);
    return null;
  }
}

/**
 * Caches student profile. Does NOT dispatch event unless explicitly requested.
 */
export function cacheStudentProfile(profile: any, shouldDispatch = false) {
  try {
    if (profile && profile.StudentEmail) {
      inMemoryProfileCache = profile as LoggedInStudentProfile;
      localStorage.setItem("cached_student_profile", JSON.stringify(profile));
      if (shouldDispatch) {
        window.dispatchEvent(new CustomEvent("student-profile-synced", { detail: profile }));
      }
    }
  } catch (e) {
    console.error("Error caching student profile:", e);
  }
}

/**
 * Broadcasts profile update across all components when profile is updated by the user.
 */
export function broadcastProfileUpdate(profile: any) {
  cacheStudentProfile(profile, true);
}
