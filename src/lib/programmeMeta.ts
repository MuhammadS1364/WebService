import { useState, useEffect, useCallback } from "react";
import { SupaBaseFunction } from "./SupaBase";
import type {
  OurCategoryRecord,
  OurVenuesRecord,
  AccademicInfoRecord,
  PointsTemplateRecord,
  OurClassesRecord,
  OurBatchesRecord,
} from "./types";

export interface WingLookup {
  WingCode: string;
  WingTitle: string | null;
}

export interface ProgrammeMetaState {
  categories: OurCategoryRecord[];
  venues: OurVenuesRecord[];
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

// In-memory cache to make lookups instantaneous across components
let inMemoryMetaCache: {
  categories: OurCategoryRecord[];
  venues: OurVenuesRecord[];
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
    () => inMemoryMetaCache?.categories || []
  );
  const [venues, setVenues] = useState<OurVenuesRecord[]>(
    () => inMemoryMetaCache?.venues || []
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
      setCategories(inMemoryMetaCache.categories);
      setVenues(inMemoryMetaCache.venues);
      setAcademicYears(inMemoryMetaCache.academicYears);
      setPointsTemplates(inMemoryMetaCache.pointsTemplates);
      setClasses(inMemoryMetaCache.classes);
      setBatches(inMemoryMetaCache.batches);
      setWings(inMemoryMetaCache.wings);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [catRes, venRes, acadRes, ptsRes, clsRes, batchRes, wingRes] = await Promise.all([
        SupaBaseFunction.from("Our_Category").select("*").order("category_title"),
        SupaBaseFunction.from("Our_Venues").select("*").order("venue_title"),
        SupaBaseFunction.from("Accademic_Info").select("*").order("created_at", { ascending: false }),
        SupaBaseFunction.from("Points_Templates").select("*").order("point_template_title"),
        SupaBaseFunction.from("Our_Classes").select("*").order("class_serial_number"),
        SupaBaseFunction.from("Our_Batches").select("*").order("batch_name"),
        SupaBaseFunction.from("Chs-WingS").select("WingCode, WingTitle").order("WingTitle"),
      ]);

      const catData = (catRes.data as OurCategoryRecord[]) || [];
      const venData = (venRes.data as OurVenuesRecord[]) || [];
      const acadData = (acadRes.data as AccademicInfoRecord[]) || [];
      const ptsData = (ptsRes.data as PointsTemplateRecord[]) || [];
      const clsData = (clsRes.data as OurClassesRecord[]) || [];
      const batchData = (batchRes.data as OurBatchesRecord[]) || [];
      const wingData = (wingRes.data as WingLookup[]) || [];

      inMemoryMetaCache = {
        categories: catData,
        venues: venData,
        academicYears: acadData,
        pointsTemplates: ptsData,
        classes: clsData,
        batches: batchData,
        wings: wingData,
        timestamp: Date.now(),
      };

      setCategories(catData);
      setVenues(venData);
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

  // Construct Lookup Maps
  const categoryMap: Record<string, string> = {};
  categories.forEach((c) => {
    if (c.category_id) categoryMap[c.category_id] = c.category_title;
  });

  const venueMap: Record<string, string> = {};
  venues.forEach((v) => {
    if (v.venue_id) venueMap[v.venue_id] = v.venue_title;
  });

  const academicMap: Record<string, string> = {};
  academicYears.forEach((a) => {
    if (a.accademic_id) {
      academicMap[a.accademic_id] = a.accademic_year || a.accademic_title || "Academic Year";
    }
  });

  const templateMap: Record<string, string> = {};
  pointsTemplates.forEach((t) => {
    if (t.p_template_id) templateMap[t.p_template_id] = t.point_template_title;
  });

  const batchMap: Record<string, string> = {};
  batches.forEach((b) => {
    if (b.batch_id) batchMap[b.batch_id] = b.batch_name;
  });

  const classMap: Record<string, string> = {};
  classes.forEach((cl) => {
    if (cl.class_id) {
      const name = cl.standard_name || cl.class_title || `Class #${cl.class_serial_number || 1}`;
      classMap[cl.class_id] = cl.class_nick_name ? `${name} (${cl.class_nick_name})` : name;
    }
  });

  const wingMap: Record<string, string> = {};
  wings.forEach((w) => {
    if (w.WingCode) wingMap[w.WingCode] = w.WingTitle || w.WingCode;
  });

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
            class_title: standardName.trim(),
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
    academicYears,
    pointsTemplates,
    classes,
    batches,
    wings,
    loading,
    error,
    categoryMap,
    venueMap,
    academicMap,
    templateMap,
    classMap,
    batchMap,
    wingMap,
    activeAcademicYearId,
    defaultTemplateId,
    addCategory,
    addVenue,
    addClass,
    addBatch,
    addPointsTemplate,
    refetch: () => fetchMeta(true),
  };
}
