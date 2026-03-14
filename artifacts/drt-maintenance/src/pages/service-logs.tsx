import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, ChevronRight, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) => `${BASE}${path}`;

interface PmPart {
  partNumber: string;
  partName: string;
  unitCost: number;
  unit: string;
  defaultQty: number;
}

interface LogPart {
  partNumber: string;
  partName: string;
  quantityUsed: number;
  unitCost: number;
  unit: string;
  lineCost: number;
}

interface ServiceLog {
  id: number;
  busNumber: string;
  busModel: string;
  pmName: string;
  serviceLevel: string;
  serviceDate: string;
  mechanicName: string;
  odometerAtService: number | null;
  notes: string | null;
  totalCost: number;
  parts: LogPart[];
}

const LEVEL_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-red-100 text-red-700",
  CVOR: "bg-purple-100 text-purple-700",
};

export default function ServiceLogs() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: buses = [] } = useQuery<any[]>({
    queryKey: ["buses"],
    queryFn: () => fetch(api("/api/buses")).then((r) => r.json()),
  });

  const { data: schedules = [] } = useQuery<any[]>({
    queryKey: ["pm-schedules"],
    queryFn: () => fetch(api("/api/pm-schedules")).then((r) => r.json()),
  });

  const { data: logs = [], refetch: refetchLogs } = useQuery<ServiceLog[]>({
    queryKey: ["service-logs"],
    queryFn: () => fetch(api("/api/service-logs")).then((r) => r.json()),
  });

  // Form state
  const [busId, setBusId] = useState("");
  const [pmScheduleId, setPmScheduleId] = useState("");
  const [serviceDate, setServiceDate] = useState(today);
  const [mechanicName, setMechanicName] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<Record<string, { checked: boolean; qty: number; unitCost: number; unit: string; name: string }>>({});
  const [pmParts, setPmParts] = useState<PmPart[]>([]);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Load PM parts when PM level changes
  useEffect(() => {
    if (!pmScheduleId) { setPmParts([]); setChecklist({}); return; }
    fetch(api(`/api/service-logs/pm-parts/${pmScheduleId}`))
      .then((r) => r.json())
      .then((parts: PmPart[]) => {
        setPmParts(parts);
        const init: typeof checklist = {};
        parts.forEach((p) => {
          init[p.partNumber] = { checked: true, qty: p.defaultQty, unitCost: p.unitCost, unit: p.unit, name: p.partName };
        });
        setChecklist(init);
      });
  }, [pmScheduleId]);

  const totalCost = Object.values(checklist).reduce(
    (sum, p) => sum + (p.checked ? p.qty * p.unitCost : 0),
    0
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const parts = Object.entries(checklist)
        .filter(([, v]) => v.checked && v.qty > 0)
        .map(([partNumber, v]) => ({
          partNumber,
          partName: v.name,
          quantityUsed: v.qty,
          unitCost: v.unitCost,
          unit: v.unit,
        }));
      const res = await fetch(api("/api/service-logs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busId: parseInt(busId), pmScheduleId: parseInt(pmScheduleId) || null, serviceDate, mechanicName, odometerAtService: odometer ? parseInt(odometer) : null, notes, parts }),
      });
      if (!res.ok) throw new Error("Failed to save log");
      return res.json();
    },
    onSuccess: () => {
      const bus = buses.find((b: any) => b.id === parseInt(busId));
      setSuccessMsg(`Service log saved — Bus ${bus?.busNumber || ""} · $${totalCost.toFixed(2)}`);
      setBusId(""); setPmScheduleId(""); setServiceDate(today); setMechanicName("");
      setOdometer(""); setNotes(""); setPmParts([]); setChecklist({});
      refetchLogs();
      setTimeout(() => setSuccessMsg(""), 4000);
    },
  });

  const inputCls = "w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white";
  const labelCls = "block text-xs font-semibold text-muted-foreground mb-1";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Service Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Record completed PM services and track parts used</p>
        </div>
        <span className="text-sm text-muted-foreground">{logs.length} log{logs.length !== 1 ? "s" : ""} on record</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── Form ── */}
        <div className="xl:col-span-2">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Plus className="w-4 h-4 text-accent" />
              <h2 className="font-semibold text-sm">New Service Entry</h2>
            </div>
            <div className="p-5 space-y-4">
              {successMsg && (
                <div className="px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium flex items-center gap-2">
                  <span>✓</span> {successMsg}
                </div>
              )}

              <div>
                <label className={labelCls}>Bus *</label>
                <select value={busId} onChange={(e) => setBusId(e.target.value)} className={inputCls}>
                  <option value="">— select bus —</option>
                  {buses.filter((b: any) => b.status === "active").map((b: any) => (
                    <option key={b.id} value={b.id}>{b.busNumber} — {b.model}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>PM Level *</label>
                <select value={pmScheduleId} onChange={(e) => setPmScheduleId(e.target.value)} className={inputCls}>
                  <option value="">— select level —</option>
                  {schedules.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Service Date *</label>
                  <input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Odometer (km)</label>
                  <input type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="e.g. 215000" min="0" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Mechanic Name *</label>
                <input type="text" value={mechanicName} onChange={(e) => setMechanicName(e.target.value)} placeholder="Full name" className={inputCls} />
              </div>

              {/* Parts checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls + " mb-0"}>Parts Used</label>
                  <span className="text-sm font-bold text-accent">${totalCost.toFixed(2)}</span>
                </div>
                <div className="border border-border rounded-xl bg-muted/30 min-h-[60px] p-3 space-y-1.5">
                  {pmParts.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Select a PM level to load parts</p>
                  ) : pmParts.map((p) => {
                    const row = checklist[p.partNumber] || { checked: true, qty: p.defaultQty, unitCost: p.unitCost, unit: p.unit, name: p.partName };
                    return (
                      <div key={p.partNumber} className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.checked}
                          onChange={(e) => setChecklist((c) => ({ ...c, [p.partNumber]: { ...row, checked: e.target.checked } }))}
                          className="w-4 h-4 accent-green-700 shrink-0"
                        />
                        <div className={`flex-1 flex items-center gap-2 min-w-0 transition-opacity ${!row.checked ? "opacity-35" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{p.partName}</div>
                            <div className="text-[10px] text-muted-foreground">{p.partNumber} · ${p.unitCost}/{p.unit}</div>
                          </div>
                          <input
                            type="number"
                            value={row.qty}
                            min={0}
                            step={p.unit === "L" ? 0.1 : 1}
                            onChange={(e) => setChecklist((c) => ({ ...c, [p.partNumber]: { ...row, qty: parseFloat(e.target.value) || 0 } }))}
                            className="w-16 border border-border rounded px-2 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                          <span className="text-[10px] text-muted-foreground w-5">{p.unit}</span>
                          <span className="text-xs font-semibold text-green-700 w-14 text-right">
                            ${(row.qty * row.unitCost).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observations, issues, or deviations…" className={inputCls + " resize-none"} />
              </div>

              <button
                onClick={() => mutation.mutate()}
                disabled={!busId || !mechanicName || !serviceDate || mutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl shadow hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? "Saving…" : "Save Service Log"}
              </button>
            </div>
          </div>
        </div>

        {/* ── History ── */}
        <div className="xl:col-span-3">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Service History</h2>
            </div>
            {logs.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <ClipboardList className="w-10 h-10 text-muted mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No service logs yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Submit your first entry using the form</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <div key={log.id}>
                    <button
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 text-left transition-colors"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${expandedLog === log.id ? "rotate-90" : ""}`} />
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold shrink-0 ${LEVEL_COLORS[log.serviceLevel] || "bg-muted text-muted-foreground"}`}>
                        {log.serviceLevel || "?"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">Bus {log.busNumber}</span>
                          {log.busModel && <span className="text-xs text-muted-foreground">· {log.busModel}</span>}
                          {log.pmName && <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground">{log.pmName}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-muted-foreground">{log.serviceDate}</span>
                          <span className="text-[11px] text-muted-foreground/40">·</span>
                          <span className="text-[11px] text-muted-foreground">{log.mechanicName}</span>
                          {log.odometerAtService && <>
                            <span className="text-[11px] text-muted-foreground/40">·</span>
                            <span className="text-[11px] text-muted-foreground">{log.odometerAtService.toLocaleString()} km</span>
                          </>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-green-700">${Number(log.totalCost).toLocaleString("en", { minimumFractionDigits: 2 })}</div>
                        <div className="text-[10px] text-muted-foreground">{log.parts.length} part{log.parts.length !== 1 ? "s" : ""}</div>
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedLog === log.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 bg-muted/20">
                            {log.parts.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3 pt-2">
                                {log.parts.map((p, i) => (
                                  <div key={i} className="flex items-center gap-1.5 bg-white border border-border rounded-lg px-2.5 py-1 text-xs shadow-sm">
                                    <Package className="w-3 h-3 text-muted-foreground" />
                                    <span className="font-mono text-[10px] text-muted-foreground">{p.partNumber}</span>
                                    <span className="font-medium">{p.partName}</span>
                                    {p.unit === "L" || p.unit === "litre" ? (
                                      <span className="bg-blue-50 px-1.5 rounded text-blue-600 text-[10px] font-semibold">{p.quantityUsed} L</span>
                                    ) : (
                                      <span className="bg-muted px-1 rounded text-muted-foreground text-[10px]">×{p.quantityUsed}</span>
                                    )}
                                    <span className="text-green-700 font-semibold text-[10px]">${p.lineCost.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {log.notes && (
                              <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{log.notes}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
