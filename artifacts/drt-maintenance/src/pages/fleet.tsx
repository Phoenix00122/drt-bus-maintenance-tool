import { useState } from "react";
import { useGetBuses, useCreateBus, useUpdateBus, useDeleteBus, Bus } from "@workspace/api-client-react";
import { Plus, Edit2, Trash2, Loader2, Bus as BusIcon, Search, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const busSchema = z.object({
  busNumber: z.string().min(1, "Bus number is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce.number().min(1990).max(2030),
  currentOdometer: z.coerce.number().min(0),
  monthlyDistance: z.coerce.number().min(0),
  lastPmDate: z.string().min(1, "Required"),
  lastPmOdometer: z.coerce.number().min(0),
  status: z.enum(["active", "inactive", "maintenance"]),
  notes: z.string().optional(),
});

type BusFormData = z.infer<typeof busSchema>;

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  maintenance: "bg-amber-100 text-amber-700",
  inactive: "bg-gray-100 text-gray-500",
};

function getFamily(bus: Bus): string {
  const n = parseInt(bus.busNumber);
  if (n >= 8419 && n <= 8473) return "New Flyer D40LF (84xx)";
  if (n >= 8501 && n <= 8599) return "New Flyer Xcelsior (85xx)";
  if (n >= 8600 && n <= 8699) return "New Flyer Xcelsior (86xx)";
  if (n >= 8551 && n <= 8589) return "Nova Bus LFS (85xx)";
  if (n >= 6100 && n <= 6119) return "Nova Bus LFS (6100-6119)";
  if (n >= 6120 && n <= 6129) return "Nova Bus HEV Hybrid (6120-6129)";
  if (n >= 6130 && n <= 6135) return "Nova LFSe BEB — Electric (6130-6135)";
  if (n >= 6136 && n <= 6157) return "Nova Bus LFS (6136-6157)";
  if (n >= 7100 && n <= 7103) return "Nova Bus LFS (7100-7103)";
  if (n >= 7104 && n <= 7124) return "Nova Bus LFS (7104-7124)";
  if (n >= 9100 && n <= 9107) return "Nova Bus LFS (9100-9107)";
  return "Other";
}

export default function Fleet() {
  const { data: buses, isLoading } = useGetBuses();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [collapsedFamilies, setCollapsedFamilies] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = buses?.filter(b => {
    const matchesSearch =
      b.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) ?? [];

  // Group by fleet family
  const grouped = filtered.reduce<Record<string, Bus[]>>((acc, bus) => {
    const fam = getFamily(bus);
    if (!acc[fam]) acc[fam] = [];
    acc[fam].push(bus);
    return acc;
  }, {});

  const toggleFamily = (fam: string) => {
    setCollapsedFamilies(prev => {
      const next = new Set(prev);
      next.has(fam) ? next.delete(fam) : next.add(fam);
      return next;
    });
  };

  const totalActive = buses?.filter(b => b.status === "active").length ?? 0;
  const totalMaint  = buses?.filter(b => b.status === "maintenance").length ?? 0;
  const totalInact  = buses?.filter(b => b.status === "inactive").length ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Bus Fleet</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {buses?.length ?? 0} vehicles · {Object.keys(grouped).length} families
          </p>
        </div>
        <button
          onClick={() => { setEditingBus(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Bus
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active", count: totalActive, color: "text-green-600 bg-green-50 border-green-200", filter: "active" },
          { label: "In Shop", count: totalMaint, color: "text-amber-600 bg-amber-50 border-amber-200", filter: "maintenance" },
          { label: "Inactive", count: totalInact, color: "text-gray-500 bg-gray-50 border-gray-200", filter: "inactive" },
        ].map(s => (
          <button
            key={s.filter}
            onClick={() => setStatusFilter(statusFilter === s.filter ? "all" : s.filter)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all",
              statusFilter === s.filter ? s.color + " ring-2 ring-current/30" : "bg-card border-border hover:border-primary/30"
            )}
          >
            <div className={cn("text-2xl font-bold", statusFilter === s.filter ? "" : "text-foreground")}>{s.count}</div>
            <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search bus # or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        {(searchTerm || statusFilter !== "all") && (
          <button onClick={() => { setSearchTerm(""); setStatusFilter("all"); }} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border">
            Clear
          </button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} shown</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-12 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground">
          <BusIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No buses match your filter.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Column headers */}
          <div className="grid grid-cols-[80px_1fr_120px_110px_110px_90px_90px_72px] text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border px-3 py-2">
            <span>Bus #</span>
            <span>Model / Year</span>
            <span className="text-right">Odometer</span>
            <span className="text-right">Mo. km</span>
            <span className="text-right">Last PM</span>
            <span className="text-center">Status</span>
            <span className="text-center">Notes</span>
            <span className="text-right">Edit</span>
          </div>

          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([family, familyBuses]) => {
              const isCollapsed = collapsedFamilies.has(family);
              const activeCnt = familyBuses.filter(b => b.status === "active").length;
              return (
                <div key={family}>
                  {/* Family row */}
                  <button
                    onClick={() => toggleFamily(family)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 bg-muted/30 hover:bg-muted/50 border-b border-border text-left transition-colors"
                  >
                    {isCollapsed
                      ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    }
                    <span className="text-xs font-bold text-foreground">{family}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{activeCnt}/{familyBuses.length} active</span>
                  </button>

                  {/* Bus rows */}
                  {!isCollapsed && familyBuses.map((bus) => (
                    <div
                      key={bus.id}
                      className="grid grid-cols-[80px_1fr_120px_110px_110px_90px_90px_72px] items-center px-3 py-1.5 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors group text-sm"
                    >
                      <span className="font-bold text-primary font-mono text-sm">{bus.busNumber}</span>
                      <span className="truncate text-foreground/90">
                        <span>{bus.model}</span>
                        <span className="ml-1.5 text-muted-foreground text-xs">'{String(bus.year).slice(2)}</span>
                      </span>
                      <span className="text-right font-mono text-xs text-muted-foreground">{Number(bus.currentOdometer).toLocaleString()} km</span>
                      <span className="text-right font-mono text-xs text-muted-foreground">{Number(bus.monthlyDistance).toLocaleString()}</span>
                      <span className="text-right text-xs text-muted-foreground">
                        {bus.lastPmDate ? format(new Date(bus.lastPmDate), "MMM d ''yy") : "—"}
                      </span>
                      <span className="flex justify-center">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase", STATUS_STYLE[bus.status] ?? STATUS_STYLE.inactive)}>
                          {bus.status === "maintenance" ? "Shop" : bus.status}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground truncate px-1" title={bus.notes ?? ""}>
                        {bus.notes?.split("|")[0]?.trim() ?? ""}
                      </span>
                      <span className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingBus(bus); setIsModalOpen(true); }} className="p-1 text-primary hover:bg-primary/10 rounded transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <DeleteBusButton id={bus.id} busNumber={bus.busNumber} />
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
        </div>
      )}

      {isModalOpen && (
        <BusFormModal bus={editingBus} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

function DeleteBusButton({ id, busNumber }: { id: number; busNumber: string }) {
  const queryClient = useQueryClient();
  const del = useDeleteBus({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/buses"] }) } });
  return (
    <button
      onClick={() => { if (confirm(`Delete bus ${busNumber}?`)) del.mutate({ id }); }}
      disabled={del.isPending}
      className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors"
    >
      {del.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}

function BusFormModal({ bus, onClose }: { bus: Bus | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const create = useCreateBus({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/buses"] }); onClose(); } } });
  const update = useUpdateBus({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/buses"] }); onClose(); } } });

  const form = useForm<BusFormData>({
    resolver: zodResolver(busSchema),
    defaultValues: bus ? { ...bus, notes: bus.notes || "" } : {
      busNumber: "", model: "Nova Bus LFS", year: new Date().getFullYear(),
      currentOdometer: 0, monthlyDistance: 9000,
      lastPmDate: new Date().toISOString().split("T")[0],
      lastPmOdometer: 0, status: "active", notes: "",
    },
  });

  const isPending = create.isPending || update.isPending;
  const onSubmit = (data: BusFormData) =>
    bus ? update.mutate({ id: bus.id, data }) : create.mutate({ data });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-5 py-3.5 border-b border-border flex justify-between items-center bg-muted/30">
          <h2 className="text-lg font-bold">{bus ? `Edit Bus ${bus.busNumber}` : "Add New Bus"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground">✕</button>
        </div>
        <div className="p-5 overflow-y-auto">
          <form id="bus-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Bus Number *", name: "busNumber", type: "text", placeholder: "e.g. 6100" },
                { label: "Year *", name: "year", type: "number" },
                { label: "Model *", name: "model", type: "text" },
              ].map(({ label, name, type, placeholder }) => (
                <div key={name} className={cn("space-y-1", name === "model" ? "col-span-2" : "")}>
                  <label className="text-xs font-semibold text-foreground">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    {...form.register(name as keyof BusFormData)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-border focus:ring-2 focus:ring-accent/30 outline-none"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Status</label>
                <select {...form.register("status")} className="w-full px-3 py-1.5 text-sm rounded-lg border border-border focus:ring-2 focus:ring-accent/30 outline-none bg-white">
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {[
                { label: "Current Odometer (km) *", name: "currentOdometer" },
                { label: "Avg. Monthly Distance (km) *", name: "monthlyDistance" },
                { label: "Last PM Odometer (km) *", name: "lastPmOdometer" },
              ].map(({ label, name }) => (
                <div key={name} className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">{label}</label>
                  <input type="number" {...form.register(name as keyof BusFormData)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-border focus:ring-2 focus:ring-accent/30 outline-none" />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Last PM Date *</label>
                <input type="date" {...form.register("lastPmDate")} className="w-full px-3 py-1.5 text-sm rounded-lg border border-border focus:ring-2 focus:ring-accent/30 outline-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Notes</label>
              <textarea {...form.register("notes")} rows={2} className="w-full px-3 py-1.5 text-sm rounded-lg border border-border focus:ring-2 focus:ring-accent/30 outline-none resize-none" placeholder="Route, filter spec, notes..." />
            </div>
          </form>
        </div>
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors">Cancel</button>
          <button type="submit" form="bus-form" disabled={isPending} className="px-5 py-1.5 text-sm bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50">
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {bus ? "Save Changes" : "Create Bus"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
