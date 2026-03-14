import { useState } from "react";
import { useGetLiveFleet } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { 
  Radio, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Bus,
  MapPin,
  Navigation,
  Search,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLOR: Record<string, string> = {
  IN_TRANSIT_TO: "bg-green-100 text-green-700 border-green-200",
  STOPPED_AT: "bg-blue-100 text-blue-700 border-blue-200",
  INCOMING_AT: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const STATUS_LABEL: Record<string, string> = {
  IN_TRANSIT_TO: "In Transit",
  STOPPED_AT: "Stopped",
  INCOMING_AT: "Arriving",
};

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-5 flex items-start gap-4 bg-card", color)}>
      <div className="p-2 rounded-xl bg-white/60">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function LiveFleet() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "matched" | "unmatched">("all");
  const { data, isLoading, error, refetch, isRefetching } = useGetLiveFleet({
    query: { refetchInterval: 30000 },
  });

  const vehicles = data?.vehicles ?? [];

  const filtered = vehicles.filter((v) => {
    const matchesSearch =
      !search ||
      v.vehicleLabel.includes(search) ||
      (v.routeId ?? "").includes(search);
    const matchesFilter =
      filter === "all" ||
      (filter === "matched" && v.inOurDatabase) ||
      (filter === "unmatched" && !v.inOurDatabase);
    return matchesSearch && matchesFilter;
  });

  const fetchedAgo = data?.fetchedAt
    ? formatDistanceToNow(new Date(data.fetchedAt), { addSuffix: true })
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Live Fleet Tracker</h1>
            <span className="relative flex h-2.5 w-2.5 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            Real-time vehicle positions from the DRT GTFS-RT feed, compared against your maintenance database.
            {fetchedAgo && <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">Updated {fetchedAgo}</span>}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
        >
          <RefreshCw className={cn("w-4 h-4", (isLoading || isRefetching) && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">Failed to load live fleet data. The DRT GTFS-RT feed may be temporarily unavailable.</p>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      )}

      {/* Stats */}
      {data && !isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Vehicles Live"
            value={data.totalLive}
            sub="Currently active on DRT GTFS-RT"
            icon={Bus}
            color="border-blue-200"
          />
          <StatCard
            label="In Our Database"
            value={data.matchedInDb}
            sub={`${Math.round((data.matchedInDb / Math.max(data.totalLive, 1)) * 100)}% coverage`}
            icon={CheckCircle2}
            color="border-green-200"
          />
          <StatCard
            label="Not Tracked"
            value={data.notInDb}
            sub="Active but missing from maintenance DB"
            icon={XCircle}
            color="border-orange-200"
          />
        </div>
      )}

      {/* Coverage bar */}
      {data && data.totalLive > 0 && (
        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Database Coverage</h3>
            <span className="text-xs text-muted-foreground">
              {data.matchedInDb} of {data.totalLive} live vehicles tracked
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(data.matchedInDb / data.totalLive) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {data.notInDb > 0
              ? `⚠️ ${data.notInDb} vehicles are active in the DRT fleet but not in your maintenance database. Consider adding them.`
              : "✅ All live vehicles are tracked in your maintenance database."}
          </p>
        </div>
      )}

      {/* Filters */}
      {data && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search bus # or route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "matched", "unmatched"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {f === "all" ? "All Vehicles" : f === "matched" ? "✅ In Database" : "⚠️ Not Tracked"}
                {f === "all" && data && ` (${data.totalLive})`}
                {f === "matched" && data && ` (${data.matchedInDb})`}
                {f === "unmatched" && data && ` (${data.notInDb})`}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            Showing {filtered.length} vehicles
          </span>
        </div>
      )}

      {/* Vehicle Table */}
      {data && !isLoading && (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bus #</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Route</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Position</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">In DB</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      No vehicles match your search
                    </td>
                  </tr>
                ) : (
                  filtered.map((v, i) => (
                    <motion.tr
                      key={v.vehicleId}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.01 }}
                      className={cn(
                        "border-b last:border-0 hover:bg-muted/30 transition-colors",
                        !v.inOurDatabase && "bg-orange-50/40"
                      )}
                    >
                      <td className="px-4 py-3 font-mono font-semibold">
                        <div className="flex items-center gap-2">
                          <Bus className="w-4 h-4 text-primary shrink-0" />
                          {v.vehicleLabel || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {v.routeId ? (
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium text-xs">
                            Route {v.routeId}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {v.currentStatus ? (
                          <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium border", STATUS_COLOR[v.currentStatus] ?? "bg-muted text-muted-foreground border-muted")}>
                            {STATUS_LABEL[v.currentStatus] ?? v.currentStatus}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {v.latitude && v.longitude ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">No GPS</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {v.inOurDatabase ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Tracked
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-500 text-xs font-medium">
                            <XCircle className="w-4 h-4" /> Not in DB
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
