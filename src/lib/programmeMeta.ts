import { useState, useEffect, useCallback, useMemo } from "react";
import { SupaBaseFunction } from "./SupaBase";
import type {
  OurCategoryRecord,
  OurVenuesRecord,
  AccademicInfoRecord,
  PointsTemplateRecord,
  OurClassesRecord,
  OurBatchesRecord,
  OurGroupsRecord,
} from "./types";

export interface WingLookup {
  WingCode: string;
  WingTitle: string | null;
}

export interface ProgrammeMetaState {
  categories: OurCategoryRecord[];
  venues: OurVenuesRecord[];
  groups: OurGroupsRecord[];
  academicYears: AccademicInfoRecord[];
  pointsTemplates: PointsTemplateRecord[];
  classes: OurClassesRecord[];
  batches: OurBatchesRecord[];
  wings: WingLookup[];
  loading: boolean;
  error: string | null;

  // Title lookup maps
  categoryMap: Record<string, string>;
  venueMap: Record<string, string>;
  groupMap: Record<string, string>;
  academicMap: Record<string, string>;
  templateMap: Record<string, string>;
  classMap: Record<string, string>;
  batchMap: Record<string, string>;
  wingMap: Record<string, string>;

  // Defaults
  activeAcademicYearId: string;
  defaultTemplateId: string;

  // Mutators
  addCategory: (
    title: string,
    class1?: string | null,
    class2?: string | null,
    class3?: string | null
  ) => Promise<OurCategoryRecord | null>;
  addVenue: (title: string, capacity?: number) => Promise<OurVenuesRecord | null>;
  addGroup: (title: string, shortDec?: string) => Promise<OurGroupsRecord | null>;
  addClass: (
    standardName: string,
    nickName?: string,
    batchUuid?: string,
    serialNumber?: number,
    totalStudent?: number
  ) => Promise<OurClassesRecord | null>;
  addBatch: (batchName: string, president?: string) => Promise<OurBatchesRecord | null>;
  addPointsTemplate: (
    title: string,
    values?: Partial<PointsTemplateRecord>
  ) => Promise<PointsTemplateRecord | null>;
  refetch: () => Promise<void>;
}

// Default standard lists to complement tables so filters never show only 1 option
const STANDARD_CATEGORIES: OurCategoryRecord[] = [
  { category_id: "cat-bidaya-01", category_title: "Bidaya", is_active: true },
  { category_id: "cat-ula-02", category_title: "Ula", is_active: true },
  { category_id: "cat-thaniya-03", category_title: "Thaniya", is_active: true },
  { category_id: "cat-thalitha-04", category_title: "Thalitha", is_active: true },
  { category_id: "cat-rabia-05", category_title: "Rabia", is_active: true },
  { category_id: "cat-khamisa-06", category_title: "Khamisa", is_active: true },
  { category_id: "cat-aliya-07", category_title: "Aliya", is_active: true },
  { category_id: "cat-kulliya-08", category_title: "Kulliya", is_active: true },
  { category_id: "cat-general-09", category_title: "General / Open", is_active: true },
];

const STANDARD_VENUES: OurVenuesRecord[] = [
  { venue_id: "ven-auditorium-01", venue_title: "Main Auditorium", venue_capacity: 250, is_active: true },
  { venue_id: "ven-halla-02", venue_title: "Hall A - Conference Hall", venue_capacity: 100, is_active: true },
  { venue_id: "ven-hallb-03", venue_title: "Hall B - Seminar Hall", venue_capacity: 80, is_active: true },
  { venue_id: "ven-ground-04", venue_title: "Central Campus Stage", venue_capacity: 500, is_active: true },
  { venue_id: "ven-medialab-05", venue_title: "Digital Media Lab", venue_capacity: 45, is_active: true },
  { venue_id: "ven-library-06", venue_title: "Central Library Hall", venue_capacity: 60, is_active: true },
];

const STANDARD_GROUPS: OurGroupsRecord[] = [
  { group_id: "grp-open-01", group_title: "General Open Group", short_dec: "Open to all students across all wings", is_active: true },
  { group_id: "grp-junior-02", group_title: "Junior Group", short_dec: "Dedicated group for junior level students (Bidaya & Ula)", is_active: true },
  { group_id: "grp-senior-03", group_title: "Senior Group", short_dec: "Dedicated group for senior level students (Thaniya & Above)", is_active: true },
  { group_id: "grp-subjunior-04", group_title: "Sub-Junior Group", short_dec: "Introductory group for early stage candidates", is_active: true },
  { group_id: "grp-supersenior-05", group_title: "Super Senior Group", short_dec: "Advanced cohort for Aliya and higher research candidates", is_active: true },
];

// In-memory cache to make lookups instantaneous across components
let inMemoryMetaCache: {
  categories: OurCategoryRecord[];
  venues: OurVenuesRecord[];
  groups: OurGroupsRecord[];
  academicYears: AccademicInfoRecord[];
  pointsTemplates: PointsTemplateRecord[];
  classes: OurClassesRecord[];
  batches: OurBatchesRecord[];
  wings: WingLookup[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 30000; // 30s cache

export function useProgrammeMeta(): ProgrammeMetaState {
  const [categories, setCategories] = useState<OurCategoryRecord[]>(
    () => inMemoryMetaCache?.categories || STANDARD_CATEGORIES
  );
  const [venues, setVenues] = useState<OurVenuesRecord[]>(
    () => inMemoryMetaCache?.venues || STANDARD_VENUES
  );
  const [groups, setGroups] = useState<OurGroupsRecord[]>(
    () => inMemoryMetaCache?.groups || STANDARD_GROUPS
  );
  const [academicYears, setAcademicYears] = useState<AccademicInfoRecord[]>(
    () => inMemoryMetaCache?.academicYears || []
  );
  const [pointsTemplates, setPointsTemplates] = useState<PointsTemplateRecord[]>(
    () => inMemoryMetaCache?.pointsTemplates || []
  );
  const [classes, setClasses] = useState<OurClassesRecord[]>(
    () => inMemoryMetaCache?.classes || []
  );
  const [batches, setBatches] = useState<OurBatchesRecord[]>(
    () => inMemoryMetaCache?.batches || []
  );
  const [wings, setWings] = useState<WingLookup[]>(
    () => inMemoryMetaCache?.wings || []
  );
  const [loading, setLoading] = useState<boolean>(!inMemoryMetaCache);
  const [error, setError] = useState<string | null>(null);

  const fetchMeta = useCallback(async (force = false) => {
    if (!force && inMemoryMetaCache && Date.now() - inMemoryMetaCache.timestamp < CACHE_TTL) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [catRes, venRes, grpRes, acadRes, ptsRes, clsRes, batchRes, wingRes] = await Promise.all([
        SupaBaseFunction.from("Our_Category").select("*").order("category_title"),
        SupaBaseFunction.from("Our_Venues").select("*").order("venue_title"),
        SupaBaseFunction.from("Our_Groups").select("*").order("group_title"),
        SupaBaseFunction.from("Accademic_Info").select("*").order("created_at", { ascending: false }),
        SupaBaseFunction.from("Points_Templates").select("*").order("point_template_title"),
        SupaBaseFunction.from("Our_Classes").select("*").order("class_serial_number"),
        SupaBaseFunction.from("Our_Batches").select("*").order("batch_name"),
        SupaBaseFunction.from("Chs-WingS").select("WingCode, WingTitle").order("WingTitle"),
      ]);

      const rawCat = (catRes.data as OurCategoryRecord[]) || [];
      const rawVen = (venRes.data as OurVenuesRecord[]) || [];
      const rawGrp = (grpRes.data as OurGroupsRecord[]) || [];
      const acadData = (acadRes.data as AccademicInfoRecord[]) || [];
      const ptsData = (ptsRes.data as PointsTemplateRecord[]) || [];
      const clsData = (clsRes.data as OurClassesRecord[]) || [];
      const batchData = (batchRes.data as OurBatchesRecord[]) || [];
      const wingData = (wingRes.data as WingLookup[]) || [];

      // Merge Supabase entries with standard lists so users always have rich options
      const mergedCats = [...rawCat];
      STANDARD_CATEGORIES.forEach((sc) => {
        if (!mergedCats.some((c) => c.category_title.toLowerCase().trim() === sc.category_title.toLowerCase().trim())) {
          mergedCats.push(sc);
        }
      });

      const mergedVenues = [...rawVen];
      STANDARD_VENUES.forEach((sv) => {
        if (!mergedVenues.some((v) => v.venue_title.toLowerCase().trim() === sv.venue_title.toLowerCase().trim())) {
          mergedVenues.push(sv);
        }
      });

      const mergedGroups = [...rawGrp];
      STANDARD_GROUPS.forEach((sg) => {
        if (!mergedGroups.some((g) => (g.group_title || "").toLowerCase().trim() === (sg.group_title || "").toLowerCase().trim())) {
          mergedGroups.push(sg);
        }
      });

      inMemoryMetaCache = {
        categories: mergedCats,
        venues: mergedVenues,
        groups: mergedGroups,
        academicYears: acadData,
        pointsTemplates: ptsData,
        classes: clsData,
        batches: batchData,
        wings: wingData,
        timestamp: Date.now(),
      };

      setCategories(mergedCats);
      setVenues(mergedVenues);
      setGroups(mergedGroups);
      setAcademicYears(acadData);
      setPointsTemplates(ptsData);
      setClasses(clsData);
      setBatches(batchData);
      setWings(wingData);
    } catch (err: any) {
      console.error("Failed to load programme meta lookups:", err);
      setError(err.message || "Failed to load programme metadata.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  // Construct Lookup Maps with useMemo to maintain stable references
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => {
      if (c.category_id) map[c.category_id] = c.category_title;
    });
    return map;
  }, [categories]);

  const venueMap = useMemo(() => {
    const map: Record<string, string> = {};
    venues.forEach((v) => {
      if (v.venue_id) map[v.venue_id] = v.venue_title;
    });
    return map;
  }, [venues]);

  const groupMap = useMemo(() => {
    const map: Record<string, string> = {};
    groups.forEach((g) => {
      if (g.group_id) map[g.group_id] = g.group_title || "Group";
    });
    return map;
  }, [groups]);

  const academicMap = useMemo(() => {
    const map: Record<string, string> = {};
    academicYears.forEach((a) => {
      if (a.accademic_id) {
        map[a.accademic_id] = a.accademic_year || a.accademic_title || "Academic Year";
      }
    });
    return map;
  }, [academicYears]);

  const templateMap = useMemo(() => {
    const map: Record<string, string> = {};
    pointsTemplates.forEach((t) => {
      if (t.p_template_id) map[t.p_template_id] = t.point_template_title;
    });
    return map;
  }, [pointsTemplates]);

  const batchMap = useMemo(() => {
    const map: Record<string, string> = {};
    batches.forEach((b) => {
      if (b.batch_id) map[b.batch_id] = b.batch_name;
    });
    return map;
  }, [batches]);

  const classMap = useMemo(() => {
    const map: Record<string, string> = {};
    classes.forEach((cl) => {
      if (cl.class_id) {
        const name = cl.standard_name || cl.class_nick_name || `Class #${cl.class_serial_number || 1}`;
        map[cl.class_id] = cl.class_nick_name ? `${name} (${cl.class_nick_name})` : name;
      }
    });
    return map;
  }, [classes]);

  const wingMap = useMemo(() => {
    const map: Record<string, string> = {};
    wings.forEach((w) => {
      if (w.WingCode) map[w.WingCode] = w.WingTitle || w.WingCode;
    });
    return map;
  }, [wings]);

  const activeAcademicYear = academicYears.find((a) => a.is_active) || academicYears[0];
  const activeAcademicYearId = activeAcademicYear?.accademic_id || "";

  const defaultTemplate = pointsTemplates[0];
  const defaultTemplateId = defaultTemplate?.p_template_id || "";

  // Quick Inline Category Addition
  const addCategory = async (
    title: string,
    class1: string | null = null,
    class2: string | null = null,
    class3: string | null = null
  ): Promise<OurCategoryRecord | null> => {
    if (!title.trim()) return null;
    try {
      const payload: Record<string, any> = {
        category_title: title.trim(),
        class_1: class1 || null,
        class_2: class2 || null,
        class_3: class3 || null,
        is_active: true,
      };

      const { data, error: insertErr } = await SupaBaseFunction
        .from("Our_Category")
        .insert([payload])
        .select()
        .single();

      if (insertErr) throw insertErr;
      if (data) {
        setCategories((prev) => [...prev, data]);
        if (inMemoryMetaCache) {
          inMemoryMetaCache.categories = [...inMemoryMetaCache.categories, data];
        }
        return data as OurCategoryRecord;
      }
    } catch (e: any) {
      console.error("Error creating category:", e);
      throw e;
    }
    return null;
  };

  // Quick Inline Venue Addition
  const addVenue = async (title: string, capacity: number = 27): Promise<OurVenuesRecord | null> => {
    if (!title.trim()) return null;
    try {
      const { data, error: insertErr } = await SupaBaseFunction
        .from("Our_Venues")
        .insert([{ venue_title: title.trim(), venue_capacity: capacity, is_active: true }])
        .select()
        .single();

      if (insertErr) throw insertErr;
      if (data) {
        setVenues((prev) => [...prev, data]);
        if (inMemoryMetaCache) {
          inMemoryMetaCache.venues = [...inMemoryMetaCache.venues, data];
        }
        return data as OurVenuesRecord;
      }
    } catch (e: any) {
      console.error("Error creating venue:", e);
      throw e;
    }
    return null;
  };

  // Quick Inline Group Addition (Our_Groups)
  const addGroup = async (title: string, shortDec?: string): Promise<OurGroupsRecord | null> => {
    if (!title.trim()) return null;
    try {
      const { data, error: insertErr } = await SupaBaseFunction
        .from("Our_Groups")
        .insert([
          {
            group_title: title.trim(),
            short_dec: shortDec?.trim() || "Event Participation Group",
            is_active: true,
          },
        ])
        .select()
        .single();

      if (insertErr) throw insertErr;
      if (data) {
        setGroups((prev) => [...prev, data]);
        if (inMemoryMetaCache) {
          inMemoryMetaCache.groups = [...inMemoryMetaCache.groups, data];
        }
        return data as OurGroupsRecord;
      }
    } catch (e: any) {
      console.error("Error creating group:", e);
      throw e;
    }
    return null;
  };

  // Quick Inline Class Addition
  const addClass = async (
    standardName: string,
    nickName?: string,
    batchUuid?: string,
    serialNumber: number = 1,
    totalStudent: number = 0
  ): Promise<OurClassesRecord | null> => {
    if (!standardName.trim()) return null;
    try {
      const { data, error: insertErr } = await SupaBaseFunction
        .from("Our_Classes")
        .insert([
          {
            standard_name: standardName.trim(),
            class_nick_name: nickName?.trim() || null,
            batch_uuid: batchUuid || null,
            class_serial_number: serialNumber,
            total_student: totalStudent,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (insertErr) throw insertErr;
      if (data) {
        setClasses((prev) => [...prev, data]);
        if (inMemoryMetaCache) {
          inMemoryMetaCache.classes = [...inMemoryMetaCache.classes, data];
        }
        return data as OurClassesRecord;
      }
    } catch (e: any) {
      console.error("Error creating class:", e);
      throw e;
    }
    return null;
  };

  // Quick Inline Batch Addition
  const addBatch = async (
    batchName: string,
    president?: string
  ): Promise<OurBatchesRecord | null> => {
    if (!batchName.trim()) return null;
    try {
      const { data, error: insertErr } = await SupaBaseFunction
        .from("Our_Batches")
        .insert([
          {
            batch_name: batchName.trim(),
            batch_president: president?.trim() || null,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (insertErr) throw insertErr;
      if (data) {
        setBatches((prev) => [...prev, data]);
        if (inMemoryMetaCache) {
          inMemoryMetaCache.batches = [...inMemoryMetaCache.batches, data];
        }
        return data as OurBatchesRecord;
      }
    } catch (e: any) {
      console.error("Error creating batch:", e);
      throw e;
    }
    return null;
  };

  // Quick Inline Points Template Addition
  const addPointsTemplate = async (
    title: string,
    values?: Partial<PointsTemplateRecord>
  ): Promise<PointsTemplateRecord | null> => {
    if (!title.trim()) return null;
    try {
      const payload = {
        point_template_title: title.trim(),
        first_only: values?.first_only ?? 5,
        second_only: values?.second_only ?? 3,
        third_only: values?.third_only ?? 1,
        first_A_grade: values?.first_A_grade ?? 10,
        first_B_grade: values?.first_B_grade ?? 8,
        second_A_grade: values?.second_A_grade ?? 8,
        second_B_grade: values?.second_B_grade ?? 6,
        third_A_grade: values?.third_A_grade ?? 6,
        third_B_grade: values?.third_B_grade ?? 4,
        A_grade: values?.A_grade ?? 5,
        B_grade: values?.B_grade ?? 3,
      };

      const { data, error: insertErr } = await SupaBaseFunction
        .from("Points_Templates")
        .insert([payload])
        .select()
        .single();

      if (insertErr) throw insertErr;
      if (data) {
        setPointsTemplates((prev) => [...prev, data]);
        if (inMemoryMetaCache) {
          inMemoryMetaCache.pointsTemplates = [...inMemoryMetaCache.pointsTemplates, data];
        }
        return data as PointsTemplateRecord;
      }
    } catch (e: any) {
      console.error("Error creating points template:", e);
      throw e;
    }
    return null;
  };

  return {
    categories,
    venues,
    groups,
    academicYears,
    pointsTemplates,
    classes,
    batches,
    wings,
    loading,
    error,
    categoryMap,
    venueMap,
    groupMap,
    academicMap,
    templateMap,
    classMap,
    batchMap,
    wingMap,
    activeAcademicYearId,
    defaultTemplateId,
    addCategory,
    addVenue,
    addGroup,
    addClass,
    addBatch,
    addPointsTemplate,
    refetch: () => fetchMeta(true),
  };
}
