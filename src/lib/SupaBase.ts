

// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = 'https://xprlayjalwvmefstjobz.supabase.co';
// const supabaseKey = 'sb_publishable_37EYawmUsreUh5j7OtMnkA_1KvW8I0m';


// export const SupaBaseFunction = createClient(supabaseUrl, supabaseKey);



import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://xprlayjalwvmefstjobz.supabase.co';
const defaultKey = 'sb_publishable_37EYawmUsreUh5j7OtMnkA_1KvW8I0m';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || defaultUrl;
const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || defaultKey;

// Updated with your active working Web App URL 
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyEmqPmufDwcj6T0S4uJW3Mj1TkpBYyUgkEBi9xAKmEttXN1ghQsQnbEZkMDc47hiI/exec";

/**
 * Recursively converts string values in an input payload to UPPERCASE,
 * while safely preserving emails, URLs, passwords, tokens, and UUIDs.
 */
export function toUppercaseDbPayload<T = any>(val: T): T {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    const s = val.trim();
    // Preserve URLs, data URIs, blob URIs
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:') || s.startsWith('blob:')) {
      return val;
    }
    // Preserve emails
    if (s.includes('@') && !s.includes(' ')) {
      return val;
    }
    // Preserve UUID foreign keys and IDs (case-insensitive in Postgres, but standard lower-case)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
      return val;
    }
    return s.toUpperCase() as unknown as T;
  }
  if (Array.isArray(val)) {
    return val.map((item) => toUppercaseDbPayload(item)) as unknown as T;
  }
  if (typeof val === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val as Record<string, any>)) {
      const lowerKey = k.toLowerCase();
      // Keep sensitive auth credentials, URLs and links as-is
      if (
        lowerKey.includes('email') ||
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('url') ||
        lowerKey.includes('link')
      ) {
        res[k] = v;
      } else {
        res[k] = toUppercaseDbPayload(v);
      }
    }
    return res as T;
  }
  return val;
}

function safeGenerateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const rawSupabase = createClient(supabaseUrl, supabaseKey);

/**
 * Proxied SupaBaseFunction that automatically converts all input values
 * provided to the database (via .insert, .update, .upsert) to UPPERCASE,
 * and ensures non-null column constraints like UserTable.UserId are reliably satisfied.
 */
export const SupaBaseFunction = new Proxy(rawSupabase, {
  get(target, prop, receiver) {
    if (prop === 'from') {
      return (table: string) => {
        const queryBuilder = (target as any).from(table);
        const isUserTable = typeof table === 'string' && table.toLowerCase() === 'usertable';
        return new Proxy(queryBuilder, {
          get(bTarget, bProp, bReceiver) {
            if (bProp === 'insert' || bProp === 'update' || bProp === 'upsert') {
              return (values: any, options?: any) => {
                if (isUserTable && (bProp === 'insert' || bProp === 'upsert')) {
                  if (Array.isArray(values)) {
                    values.forEach((v) => {
                      if (v && typeof v === 'object' && !v.UserId) {
                        v.UserId = safeGenerateUuid();
                      }
                    });
                  } else if (values && typeof values === 'object' && !values.UserId) {
                    values.UserId = safeGenerateUuid();
                  }
                }
                const upperValues = toUppercaseDbPayload(values);
                return bTarget[bProp](upperValues, options);
              };
            }
            const orig = Reflect.get(bTarget, bProp, bReceiver);
            if (typeof orig === 'function') {
              return orig.bind(bTarget);
            }
            return orig;
          }
        });
      };
    }
    const orig = Reflect.get(target, prop, receiver);
    if (typeof orig === 'function') {
      return orig.bind(target);
    }
    return orig;
  }
});