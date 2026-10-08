import { useState, useMemo } from "react";
import { useProgrammeMeta } from "../lib/programmeMeta";
import {
  Copy,
  Check,
  Search,
  X,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  HelpCircle,
} from "lucide-react";

interface ExcelUuidReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExcelUuidReferenceModal({
  isOpen,
  onClose,
}: ExcelUuidReferenceModalProps) {
  const meta = useProgrammeMeta();
  const [activeTab, setActiveTab] = useState<"classes" | "categories">("classes");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (uuid: string) => {
    if (!uuid) return;
    navigator.clipboard.writeText(uuid);
    setCopiedId(uuid);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Fallback canonical class list if database records are empty
  const defaultClasses = useMemo(() => [
    { class_id: "00000000-0001-0000-0000-000000000001", standard_name: "Secondary First Year", class_nick_name: "Sec 1" },
    { class_id: "00000000-0002-0000-0000-000000000002", standard_name: "Secondary Second Year", class_nick_name: "Sec 2" },
    { class_id: "00000000-0003-0000-0000-000000000003", standard_name: "Secondary Third Year", class_nick_name: "Sec 3" },
    { class_id: "00000000-0004-0000-0000-000000000004", standard_name: "Secondary Fourth Year", class_nick_name: "Sec 4" },
    { class_id: "00000000-0005-0000-0000-000000000005", standard_name: "Secondary Final Year", class_nick_name: "Sec Final" },
    { class_id: "00000000-0006-0000-0000-000000000006", standard_name: "Senior Secondary First Year", class_nick_name: "Senior 1" },
    { class_id: "00000000-0007-0000-0000-000000000007", standard_name: "Senior Secondary Second Year", class_nick_name: "Senior 2" },
    { class_id: "00000000-0008-0000-0000-000000000008", standard_name: "Degree First Year", class_nick_name: "Deg 1" },
    { class_id: "00000000-0009-0000-0000-000000000009", standard_name: "Degree Second Year", class_nick_name: "Deg 2" },
  ], []);

  const displayClasses = useMemo(() => {
    const source = meta.classes.length > 0 ? meta.classes : defaultClasses;
    return source.filter((c: any) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const name = (c.standard_name || c.batch_name || "").toLowerCase();
      const nick = (c.class_nick_name || "").toLowerCase();
      const id = (c.class_id || "").toLowerCase();
      return name.includes(q) || nick.includes(q) || id.includes(q);
    });
  }, [meta.classes, defaultClasses, searchQuery]);

  const defaultCategories = useMemo(() => [
    { category_id: "11111111-0001-0000-0000-000000000001", category_title: "Bidaya" },
    { category_id: "11111111-0002-0000-0000-000000000002", category_title: "Ula" },
    { category_id: "11111111-0003-0000-0000-000000000003", category_title: "Thaniya" },
    { category_id: "11111111-0004-0000-0000-000000000004", category_title: "Aliya" },
  ], []);

  const displayCategories = useMemo(() => {
    const source = meta.categories.length > 0 ? meta.categories : defaultCategories;
    return source.filter((cat: any) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const title = (cat.category_title || "").toLowerCase();
      const id = (cat.category_id || "").toLowerCase();
      return title.includes(q) || id.includes(q);
    });
  }, [meta.categories, defaultCategories, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-xs">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full inline-block">
                  Excel Import Data Helper
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Copyable UUIDs</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                Table UUID Reference for Excel Import
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Instructions banner */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5 shrink-0">
          <HelpCircle size={17} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            When preparing your Excel spreadsheet for bulk importing programmes or students, use the exact <strong className="font-bold">UUID</strong> below. Click <strong className="font-bold">"Copy UUID"</strong> next to any row to copy the unique identifier directly to your clipboard.
          </p>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab("classes")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "classes"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GraduationCap size={15} />
              <span>Classes UUIDs ({displayClasses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("categories")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "categories"
                  ? "bg-white text-purple-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers size={15} />
              <span>Categories UUIDs ({displayCategories.length})</span>
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Content Body: Table of Copyable UUIDs */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {activeTab === "classes" ? (
            /* Classes Table */
            displayClasses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No matching classes found.</div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  Each Class standard name & copyable table UUID:
                </div>
                {displayClasses.map((cls: any) => {
                  const isCopied = copiedId === cls.class_id;
                  const displayName = cls.standard_name || cls.batch_name || "Class Record";
                  return (
                    <div
                      key={cls.class_id}
                      className="bg-slate-50/80 hover:bg-emerald-50/40 border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {displayName}
                          </span>
                          {cls.class_nick_name && (
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                              {cls.class_nick_name}
                            </span>
                          )}
                          {cls.class_serial_number !== undefined && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{cls.class_serial_number}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-mono select-all">
                          <span className="text-[10px] uppercase font-bold text-slate-400 select-none">UUID:</span>
                          <span className="text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 break-all text-[11px]">
                            {cls.class_id}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(cls.class_id)}
                        className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs active:scale-95 ${
                          isCopied
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                        title="Copy this UUID only"
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} className="text-white" />
                            <span>Copied UUID!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} className="text-slate-500" />
                            <span>Copy UUID</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Categories Table */
            displayCategories.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No matching categories found.</div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  Each Category title & copyable table UUID:
                </div>
                {displayCategories.map((cat: any) => {
                  const isCopied = copiedId === cat.category_id;
                  const catTitle = cat.category_title || "Category";
                  return (
                    <div
                      key={cat.category_id}
                      className="bg-slate-50/80 hover:bg-purple-50/40 border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {catTitle}
                          </span>
                          <span className="text-[10px] font-semibold text-purple-800 bg-purple-100/70 px-2 py-0.5 rounded-md">
                            Category Title
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-mono select-all">
                          <span className="text-[10px] uppercase font-bold text-slate-400 select-none">UUID:</span>
                          <span className="text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 break-all text-[11px]">
                            {cat.category_id}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(cat.category_id)}
                        className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs active:scale-95 ${
                          isCopied
                            ? "bg-purple-600 text-white hover:bg-purple-700"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                        title="Copy this UUID only"
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} className="text-white" />
                            <span>Copied UUID!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} className="text-slate-500" />
                            <span>Copy UUID</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Click any button to copy <span className="font-bold text-slate-700">copyable UUID only</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
