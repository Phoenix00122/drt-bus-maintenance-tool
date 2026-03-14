import { useGetPartsBundles } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { PackageSearch, Clock, Sparkles, Wrench, Bus } from "lucide-react";
import { motion } from "framer-motion";

export default function Bundles() {
  const { data: bundles, isLoading } = useGetPartsBundles({ months: 3 });

  return (
    <div className="space-y-6">
      <div className="bg-primary text-primary-foreground p-8 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-display font-bold tracking-tight">Smart Bundling Suggestions</h1>
          <p className="text-primary-foreground/80 mt-2 max-w-2xl text-lg">
            Save labor costs and minimize bus downtime. These are automatically generated suggestions combining PM activities that overlap within the next 90 days.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-medium">Analyzing schedules for optimal bundles...</p>
        </div>
      ) : bundles?.length === 0 ? (
        <div className="bg-card border border-border p-12 rounded-2xl text-center text-muted-foreground">
          <PackageSearch className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-semibold mb-2">No Bundles Found</h3>
          <p>No overlapping PM activities were detected in the selected timeframe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {bundles?.map((bundle, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={idx}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
            >
              <div className="p-5 bg-gradient-to-br from-accent/10 to-transparent border-b border-border">
                <div className="flex justify-between items-start mb-3">
                  <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm border border-border/50 text-sm font-bold text-primary">
                    <Bus className="w-4 h-4 text-accent" />
                    Bus {bundle.busNumber}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1">Target Date</p>
                    <p className="font-semibold text-foreground">{format(new Date(bundle.scheduledDate), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <h3 className="text-xl font-bold font-display text-foreground leading-tight">
                  {bundle.bundleName}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">{bundle.description}</p>
              </div>

              <div className="p-5 flex-1 space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> Included PMs
                  </h4>
                  <ul className="space-y-2">
                    {bundle.activities.map((act, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"></span>
                        {act}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <PackageSearch className="w-4 h-4" /> Pick List
                  </h4>
                  <div className="space-y-2">
                    {bundle.parts.map((p, i) => (
                      <div key={i} className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/50 border border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{p.partNumber}</span>
                          <span className="font-medium">{p.partName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-foreground/60 bg-black/5 px-2 py-0.5 rounded">x{p.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 bg-muted/30 border-t border-border mt-auto">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">Est. Total Parts</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(bundle.totalCost)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Combined Labor</p>
                    <p className="text-xl font-bold text-foreground flex items-center justify-end gap-1">
                      <Clock className="w-5 h-5 text-accent" />
                      {bundle.estimatedHours} hrs
                    </p>
                  </div>
                </div>
                {bundle.savingsNote && (
                  <div className="bg-green-100 text-green-800 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {bundle.savingsNote}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
