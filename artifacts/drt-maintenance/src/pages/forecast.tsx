import { useState } from "react";
import { cn } from "@/lib/utils";
import { generateForecast, ForecastResponse } from "@workspace/api-client-react";
import { format } from "date-fns";
import {
  CalendarDays, Loader2, Play, Wrench,
  ShieldAlert, AlertCircle, Settings2, CheckCircle2,
  ChevronDown, ChevronRight, Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Activity = ForecastResponse["forecasts"][number]["scheduledActivities"][number] & {
  busNumber: string;
  busModel: string;
  busId: number;
};

const URGENCY_ROW: Record<string, string> = {
  overdue: "bg-red-50/70 border-l-2 border-red-400",
  urgent:  "bg-orange-50/70 border-l-2 border-orange-400",
  upcoming:"bg-yellow-50/30 border-l-2 border-yellow-400",
  scheduled:"border-l-2 border-transparent",
};

const URGENCY_BADGE: Record<string, string> = {
  overdue: "bg-red-100 text-red-700",
  urgent:  "bg-orange-100 text-orange-700",
  upcoming:"bg-yellow-100 text-yellow-700",
  scheduled:"bg-green-100 text-green-700",
};

const URGENCY_ICON: Record<string, React.ElementType> = {
  overdue: ShieldAlert,
  urgent:  AlertCircle,
  upcoming: CalendarDays,
  scheduled: CheckCircle2,
};

const URGENCY_ORDER = ["overdue", "urgent", "upcoming", "scheduled"];

export default function Forecast() {
  const [months, setMonths] = useState(6);
  const [isGenerating, setIsGenerating] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [busSearch, setBusSearch] = useState("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const data = await generateForecast({ forecastMonths: months });
      setForecastData(data);
      setExpandedRows(new Set());
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Flatten all activities into one list
  const allActivities: Activity[] = forecastData?.forecasts.flatMap(f =>
    f.scheduledActivities.map(act => ({
      ...act,
      busNumber: f.busNumber,
      busModel: f.busModel,
      busId: f.busId,
    }))
  ) ?? [];

  const filtered = allActivities.filter(a => {
    const matchGroup = groupFilter === "all" || a.urgency === groupFilter;
    const matchBus = !busSearch || a.busNumber.includes(busSearch) || a.busModel.toLowerCase().includes(busSearch.toLowerCase());
    return matchGroup && matchBus;
  }).sort((a, b) => a.dueInDays - b.dueInDays);

  const counts = URGENCY_ORDER.reduce<Record<string, number>>((acc, u) => {
    acc[u] = allActivities.filter(a => a.urgency === u).length;
    return acc;
  }, {});

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">PM Forecast</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Upcoming preventative maintenance based on odometer projections.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-accent shrink-0" />
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-medium"
            >
              <option value={1}>1 Month</option>
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>1 Year</option>
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-5 py-1.5 bg-accent text-white font-bold text-sm rounded-lg shadow hover:shadow-md hover:bg-accent/90 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            Generate
          </button>
        </div>
      </div>

      {/* Summary + filters */}
      <AnimatePresence>
        {forecastData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Summary strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Tasks", value: forecastData.summary.totalActivities, color: "bg-blue-50 text-blue-700 border-blue-200" },
                { label: "Overdue", value: forecastData.summary.overdueCount, color: "bg-red-50 text-red-700 border-red-200" },
                { label: "Urgent (30d)", value: forecastData.summary.urgentCount, color: "bg-orange-50 text-orange-700 border-orange-200" },
                { label: "Est. Labor", value: `${forecastData.summary.totalEstimatedHours.toFixed(0)} hrs`, color: "bg-purple-50 text-purple-700 border-purple-200" },
              ].map(s => (
                <div key={s.label} className={cn("rounded-xl border p-3 flex items-center gap-3", s.color)}>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-75">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Urgency filter pills + bus search */}
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setGroupFilter("all")}
                className={cn("px-3 py-1 text-xs font-semibold rounded-lg border transition-all", groupFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40")}
              >
                All ({allActivities.length})
              </button>
              {URGENCY_ORDER.map(u => (
                <button
                  key={u}
                  onClick={() => setGroupFilter(groupFilter === u ? "all" : u)}
                  className={cn("px-3 py-1 text-xs font-semibold rounded-lg border transition-all capitalize", groupFilter === u ? URGENCY_BADGE[u] + " border-current/30" : "bg-card border-border hover:border-primary/40")}
                >
                  {u} ({counts[u] ?? 0})
                </button>
              ))}
              <div className="ml-auto">
                <input
                  type="search"
                  placeholder="Filter by bus..."
                  value={busSearch}
                  onChange={e => setBusSearch(e.target.value)}
                  className="px-3 py-1 text-xs border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-accent/30 w-36"
                />
              </div>
            </div>

            {/* Flat table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {/* Column headers */}
              <div className="grid grid-cols-[72px_160px_1fr_100px_90px_70px_60px_32px] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border px-3 py-2">
                <span>Bus #</span>
                <span>Service</span>
                <span>Task</span>
                <span className="text-center">Due Date</span>
                <span className="text-center">Urgency</span>
                <span className="text-right">Days</span>
                <span className="text-right">Hrs</span>
                <span></span>
              </div>

              {filtered.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400 opacity-50" />
                  No activities match this filter.
                </div>
              ) : (
                filtered.map((act, i) => {
                  const rowKey = `${act.busId}-${act.pmName}-${i}`;
                  const isExpanded = expandedRows.has(rowKey);
                  const Icon = URGENCY_ICON[act.urgency] ?? Settings2;
                  const hasParts = act.parts && act.parts.length > 0;

                  return (
                    <div key={rowKey} className={cn("border-b border-border/50 last:border-0", URGENCY_ROW[act.urgency])}>
                      {/* Main row */}
                      <div className="grid grid-cols-[72px_160px_1fr_100px_90px_70px_60px_32px] items-center px-3 py-2 hover:bg-black/[0.02] transition-colors">
                        <span className="font-bold font-mono text-primary text-sm">{act.busNumber}</span>
                        <span className="text-xs text-muted-foreground truncate pr-2" title={act.busModel}>{act.busModel}</span>
                        <span className="text-sm font-medium text-foreground truncate pr-2">{act.pmName}</span>
                        <span className="text-center text-xs text-muted-foreground">
                          {format(new Date(act.estimatedDueDate), "MMM d, yy")}
                        </span>
                        <span className="flex justify-center">
                          <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase", URGENCY_BADGE[act.urgency])}>
                            <Icon className="w-3 h-3" />
                            {act.urgency}
                          </span>
                        </span>
                        <span className={cn("text-right text-xs font-mono font-semibold", act.dueInDays < 0 ? "text-red-600" : act.dueInDays <= 30 ? "text-orange-600" : "text-muted-foreground")}>
                          {act.dueInDays < 0 ? `${Math.abs(act.dueInDays)}d ago` : `${act.dueInDays}d`}
                        </span>
                        <span className="text-right text-xs text-muted-foreground">{act.estimatedHours}h</span>
                        <button
                          onClick={() => hasParts && toggleRow(rowKey)}
                          disabled={!hasParts}
                          className={cn("flex justify-center items-center transition-colors rounded", hasParts ? "text-muted-foreground hover:text-primary cursor-pointer" : "text-transparent cursor-default")}
                          title={hasParts ? "Show required parts" : ""}
                        >
                          {hasParts && (isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
                        </button>
                      </div>

                      {/* Expanded parts */}
                      <AnimatePresence>
                        {isExpanded && hasParts && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-2 pt-1 bg-muted/20 border-t border-border/40">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Package className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Required Parts</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {act.parts.map((p: any) => (
                                  <div key={p.partId} className="flex items-center gap-1.5 bg-white border border-border rounded px-2 py-1 text-xs shadow-sm">
                                    <span className="font-mono text-primary/60 text-[10px]">{p.partNumber}</span>
                                    <span className="text-foreground font-medium">{p.partName}</span>
                                    {(p.unit === "L" || p.unit === "litre") ? (
                                      <span className="bg-blue-50 px-1.5 rounded text-blue-600 text-[10px] font-semibold">{p.quantity} L</span>
                                    ) : (
                                      <span className="bg-muted px-1 rounded text-muted-foreground text-[10px]">×{p.quantity}</span>
                                    )}
                                    <span className="text-green-700 font-semibold text-[10px]">${(p.unitCost * p.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <p className="text-xs text-muted-foreground text-right">
              Showing {filtered.length} of {allActivities.length} activities · Click the arrow on any row to see required parts
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
