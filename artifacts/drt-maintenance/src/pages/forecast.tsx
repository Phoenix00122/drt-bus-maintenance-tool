import { useState } from "react";
import { generateForecast, useGetBuses, ForecastResponse } from "@workspace/api-client-react";
import { format } from "date-fns";
import { CalendarDays, Loader2, Play, Settings2, ShieldAlert, Wrench, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Forecast() {
  const { data: buses } = useGetBuses();
  const [months, setMonths] = useState(6);
  const [isGenerating, setIsGenerating] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const data = await generateForecast({ forecastMonths: months });
      setForecastData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Maintenance Forecast</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Predict upcoming preventative maintenance based on planned monthly service distances and current odometer readings.
          </p>
        </div>
        
        <div className="flex items-end gap-4 w-full md:w-auto">
          <div className="space-y-1.5 flex-1 md:w-48">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-accent" />
              Forecast Period
            </label>
            <select 
              value={months} 
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background focus:ring-4 focus:ring-accent/20 focus:border-accent outline-none font-medium transition-all"
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
            className="px-6 py-2.5 bg-accent text-white font-bold rounded-xl shadow-lg shadow-accent/25 hover:shadow-xl hover:bg-accent/90 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 disabled:opacity-50 h-[46px]"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            Generate
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {forecastData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryBadge label="Total Activities" value={forecastData.summary.totalActivities} color="bg-blue-100 text-blue-700" />
              <SummaryBadge label="Overdue" value={forecastData.summary.overdueCount} color="bg-red-100 text-red-700" />
              <SummaryBadge label="Urgent (Next 30D)" value={forecastData.summary.urgentCount} color="bg-orange-100 text-orange-700" />
              <SummaryBadge label="Est. Labor Hrs" value={forecastData.summary.totalEstimatedHours.toFixed(1)} color="bg-purple-100 text-purple-700" />
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {forecastData.forecasts.map((forecast, i) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  key={forecast.busId} 
                  className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="bg-primary px-6 py-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg"><BusIcon className="w-5 h-5" /></div>
                      <div>
                        <h3 className="font-display font-bold text-xl">Bus {forecast.busNumber}</h3>
                        <p className="text-primary-foreground/70 text-sm font-medium">{forecast.busModel}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{forecast.scheduledActivities.length}</div>
                      <div className="text-xs text-primary-foreground/70 uppercase tracking-wide">Tasks</div>
                    </div>
                  </div>
                  
                  <div className="p-0">
                    {forecast.scheduledActivities.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                        <CheckCircle2 className="w-10 h-10 mb-2 text-green-500 opacity-50" />
                        <p>No maintenance scheduled for this period.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {forecast.scheduledActivities.map((act, j) => (
                          <ActivityRow key={j} activity={act} />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryBadge({ label, value, color }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center items-center shadow-sm">
      <div className={cn("text-2xl font-bold font-display mb-1 px-4 py-1 rounded-lg", color)}>{value}</div>
      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider text-center">{label}</div>
    </div>
  );
}

function ActivityRow({ activity }: any) {
  const getUrgencyStyles = (u: string) => {
    switch (u) {
      case 'overdue': return 'bg-red-50 border-l-4 border-red-500';
      case 'urgent': return 'bg-orange-50 border-l-4 border-orange-500';
      case 'upcoming': return 'bg-yellow-50 border-l-4 border-yellow-400';
      default: return 'bg-white border-l-4 border-green-500';
    }
  };

  const getUrgencyIcon = (u: string) => {
    switch (u) {
      case 'overdue': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'urgent': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'upcoming': return <CalendarDays className="w-4 h-4 text-yellow-500" />;
      default: return <Settings2 className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className={cn("p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between", getUrgencyStyles(activity.urgency))}>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          {getUrgencyIcon(activity.urgency)}
          <h4 className="font-bold text-foreground text-base">{activity.pmName}</h4>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5 text-foreground/70 uppercase tracking-wider ml-2">
            {activity.category}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> Due: {format(new Date(activity.estimatedDueDate), 'MMM d, yyyy')}</div>
          <div className="flex items-center gap-1.5"><Wrench className="w-4 h-4" /> {activity.estimatedHours} hrs labor</div>
        </div>

        {activity.parts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-black/5">
            <p className="text-xs font-semibold text-foreground/60 mb-2 uppercase tracking-wider">Required Parts</p>
            <div className="flex flex-wrap gap-2">
              {activity.parts.map((p: any) => (
                <div key={p.partId} className="text-xs bg-white border border-border px-2.5 py-1 rounded-md shadow-sm flex items-center gap-2">
                  <span className="font-mono text-primary/60">{p.partNumber}</span>
                  <span className="font-medium text-foreground">{p.partName}</span>
                  <span className="bg-muted px-1.5 rounded text-muted-foreground">x{p.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sm:text-right shrink-0">
        <div className={cn(
          "inline-flex font-bold px-3 py-1 rounded-lg text-sm",
          activity.urgency === 'overdue' ? 'bg-red-100 text-red-700' :
          activity.urgency === 'urgent' ? 'bg-orange-100 text-orange-700' :
          activity.urgency === 'upcoming' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        )}>
          {activity.urgency.toUpperCase()}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 font-medium text-right pr-1">
          {activity.dueInDays < 0 ? `${Math.abs(activity.dueInDays)} days ago` : `in ${activity.dueInDays} days`}
        </p>
      </div>
    </div>
  );
}

function BusIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
}
