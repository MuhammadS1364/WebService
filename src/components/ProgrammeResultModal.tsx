import { useState, useEffect } from "react";
import { SupaBaseFunction } from "../lib/SupaBase";
import { useProgrammeMeta } from "../lib/programmeMeta";
import formatResultDate from "../PublicProgrammesComponents/DateFormatConvertor";
import SafeImage from "../lib/SafeImage";
import { Trophy, Award, Calendar, MapPin, X, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { ResultBoxRecord } from "../lib/types";

interface StudentInfo {
  AddNo: string;
  StudentName: string;
  Class?: string;
  CollegeName?: string;
  Student_Photo_Urls?: string;
}

interface ProgrammeResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  programCode: string;
  programTitle?: string | null;
  programDate?: string | null;
  programVenue?: string | null;
  programPoster?: string | null;
  wingCode?: string | null;
}

export default function ProgrammeResultModal({
  isOpen,
  onClose,
  programCode,
  programTitle,
  programDate,
  programVenue,
  programPoster,
  wingCode,
}: ProgrammeResultModalProps) {
  const meta = useProgrammeMeta();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResultBoxRecord | null>(null);
  const [students, setStudents] = useState<Record<string, StudentInfo>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !programCode) return;

    let isMounted = true;
    const fetchResultData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch ResultBox record for this program
        const { data: resData, error: resError } = await SupaBaseFunction
          .from("ResultBox")
          .select("*")
          .eq("Program_Id", programCode)
          .maybeSingle();

        if (resError) throw resError;

        if (!isMounted) return;
        setResult(resData || null);

        if (resData) {
          // 2. Collect student AddNos
          const rawCodes = [
            resData.First_Holder,
            resData.Second_Holder,
            resData.Third_Holder,
            resData.AGrade,
            resData.BGrade,
          ].filter(Boolean) as string[];

          // Normalize comma-separated or whitespace
          const candidateCodes: string[] = [];
          rawCodes.forEach((codeStr) => {
            codeStr.split(",").forEach((c) => {
              const trimmed = c.trim();
              if (trimmed && trimmed.toLowerCase() !== "no grade" && trimmed.toLowerCase() !== "none") {
                candidateCodes.push(trimmed);
              }
            });
          });

          if (candidateCodes.length > 0) {
            const { data: stnData } = await SupaBaseFunction
              .from("StudentsBox")
              .select("AddNo, StudentName, Class, CollegeName, Student_Photo_Urls")
              .in("AddNo", candidateCodes);

            if (isMounted && stnData) {
              const map: Record<string, StudentInfo> = {};
              stnData.forEach((s) => {
                map[s.AddNo] = s;
              });
              setStudents(map);
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Error loading programme result:", err);
          setError(err.message || "Failed to load competition result.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchResultData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, programCode]);

  if (!isOpen) return null;

  const renderStudentCard = (
    addNoOrText: string | null | undefined,
    place: "1st" | "2nd" | "3rd" | "A" | "B",
    label: string
  ) => {
    if (!addNoOrText || addNoOrText === "No Grade" || addNoOrText === "none") {
      return (
        <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            {label}
          </span>
          <span className="text-xs text-slate-400 italic">No candidate awarded</span>
        </div>
      );
    }

    const items = addNoOrText.split(",").map((s) => s.trim()).filter(Boolean);

    return (
      <div className="space-y-2">
        {items.map((itemCode) => {
          const student = students[itemCode];
          const displayName = student?.StudentName || itemCode;

          const isFirst = place === "1st";
          const isSecond = place === "2nd";
          const isThird = place === "3rd";
          const isGrade = place === "A" || place === "B";

          return (
            <div
              key={itemCode}
              className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 shadow-2xs ${
                isFirst
                  ? "bg-gradient-to-r from-amber-50 to-amber-100/60 border-amber-300"
                  : isSecond
                  ? "bg-gradient-to-r from-slate-50 to-slate-100 border-slate-300"
                  : isThird
                  ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
                  : isGrade && place === "A"
                  ? "bg-emerald-50/70 border-emerald-200"
                  : "bg-sky-50/70 border-sky-200"
              }`}
            >
              {/* Badge / Avatar */}
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 border-2 bg-white shadow-2xs">
                <SafeImage
                  src={student?.Student_Photo_Urls}
                  alt={displayName}
                  fallbackCategory="student"
                  fallbackText={displayName}
                  className="w-full h-full object-cover"
                />
                <span className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full px-1 shadow-2xs border border-slate-200 leading-none">
                  {isFirst ? "🥇" : isSecond ? "🥈" : isThird ? "🥉" : place === "A" ? "🏅" : "🎖️"}
                </span>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isFirst
                        ? "bg-amber-200 text-amber-900"
                        : isSecond
                        ? "bg-slate-200 text-slate-800"
                        : isThird
                        ? "bg-orange-200 text-orange-900"
                        : place === "A"
                        ? "bg-emerald-200 text-emerald-900"
                        : "bg-sky-200 text-sky-900"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm mt-1 truncate">
                  {displayName}
                </h4>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                  <span>AddNo: {itemCode}</span>
                  {student?.Class && <span>• Class: {student.Class}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const wingTitle = wingCode ? meta.wingMap[wingCode] || wingCode : "";
  const venueTitle = programVenue ? meta.venueMap[programVenue] || programVenue : "TBA";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-900 p-6 sm:p-7 text-white">
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                  <Trophy className="w-5 h-5 text-yellow-300" />
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
                  Official Result Published
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                {programTitle || "Programme Competition Result"}
              </h2>
              <p className="text-xs text-amber-100 font-mono mt-1">
                Event Code: {programCode}
              </p>
            </div>

            {programPoster && (
              <div className="hidden sm:block w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 border-white/30 shadow-md">
                <SafeImage
                  src={programPoster}
                  alt={programTitle || "Poster"}
                  fallbackCategory="programme"
                  fallbackText={programTitle || programCode}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="relative z-10">
            {/* Date & Venue meta */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-amber-100/90 mt-3 pt-3 border-t border-white/15">
              {programDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-amber-300" />
                  <span>{formatResultDate(programDate)}</span>
                </div>
              )}
              {venueTitle && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-amber-300" />
                  <span>{venueTitle}</span>
                </div>
              )}
              {wingTitle && (
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] font-bold">
                  {wingTitle}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-600 animate-pulse">
                Fetching Official Standings & Podium...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold">
              {error}
            </div>
          ) : !result ? (
            <div className="py-12 px-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-800">
                Result Declared — Standings Compilation in Progress
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                The evaluation panel has finalized the competition score. The official position holders sheet is being compiled by the Wing authority.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Podium Positions Section */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Award size={14} className="text-amber-500" />
                  Competition Podium Winners
                </h3>
                <div className="space-y-3">
                  {renderStudentCard(result.First_Holder, "1st", "1st Place Winner")}
                  {renderStudentCard(result.Second_Holder, "2nd", "2nd Place Winner")}
                  {renderStudentCard(result.Third_Holder, "3rd", "3rd Place Winner")}
                </div>
              </div>

              {/* Grade Honors Section (if available) */}
              {((result.AGrade && result.AGrade !== "No Grade") ||
                (result.BGrade && result.BGrade !== "No Grade")) && (
                <div className="pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Special Grade Honors & Commendations
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.AGrade && result.AGrade !== "No Grade" && (
                      <div>{renderStudentCard(result.AGrade, "A", "A Grade Honor")}</div>
                    )}
                    {result.BGrade && result.BGrade !== "No Grade" && (
                      <div>{renderStudentCard(result.BGrade, "B", "B Grade Honor")}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <Link
            to="/public-panel/leaderboard"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
          >
            <span>Inspect Overall Leaderboard</span>
            <ArrowRight size={13} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Close Result
          </button>
        </div>
      </div>
    </div>
  );
}
