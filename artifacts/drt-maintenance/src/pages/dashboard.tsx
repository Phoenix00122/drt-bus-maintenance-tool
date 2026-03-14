import { useQuery } from "@tanstack/react-query";
import { generateForecast, useGetBuses, useGetLiveFleet } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BusFront, AlertTriangle, Hammer, CircleDollarSign, Loader2, Clock, ChevronRight, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency, cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: buses, isLoading: busesLoading } = useGetBuses();
  const { data: liveFleet } = useGetLiveFleet();

  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['dashboard-forecast'],
    queryFn: () => generateForecast({ forecastMonths: 3 }),
  });

  const isLoading = busesLoading || forecastLoading;

  if (isLoading) {
    return (
      <div className="w-full h-[80vh] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-accent" />
        <p className="font-medium text-lg">Loading fleet intelligence...</p>
      </div>
    );
  }

  const activeBusesCount = buses?.filter(b => b.status === 'active').length || 0;
  const maintenanceBusesCount = buses?.filter(b => b.status === 'maintenance').length || 0;
  const liveOnRoad = (liveFleet as any)?.totalLive ?? null;
  
  // Flatten all activities into a sortable list for the service queue
  type QueueItem = {
    busNumber: string;
    busModel: string;
    pmName: string;
    dueInDays: number;
    estimatedDueDate: string;
    urgency: string;
    estimatedHours: number;
    partsCount: number;
  };

  const allActivities: QueueItem[] = [];
  forecast?.forecasts.forEach(f => {
    f.scheduledActivities.forEach((act: any) => {
      allActivities.push({
        busNumber: f.busNumber,
        busModel: f.busModel,
        pmName: act.pmName,
        dueInDays: act.dueInDays,
        estimatedDueDate: act.estimatedDueDate,
        urgency: act.urgency,
        estimatedHours: act.estimatedHours,
        partsCount: act.parts?.length ?? 0,
      });
    });
  });

  // Sort by urgency priority then days
  const urgencyOrder: Record<string, number> = { overdue: 0, urgent: 1, scheduled: 2 };
  allActivities.sort((a, b) => {
    const ua = urgencyOrder[a.urgency] ?? 3;
    const ub = urgencyOrder[b.urgency] ?? 3;
    if (ua !== ub) return ua - ub;
    return a.dueInDays - b.dueInDays;
  });
  const serviceQueue = allActivities.slice(0, 8);

  // Aggregate activities by month for the chart
  const activitiesByMonth: Record<string, number> = {};
  const activitiesByCategory: Record<string, number> = {};

  forecast?.forecasts.forEach(f => {
    f.scheduledActivities.forEach((act: any) => {
      const date = new Date(act.estimatedDueDate);
      const monthStr = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      activitiesByMonth[monthStr] = (activitiesByMonth[monthStr] || 0) + 1;
      activitiesByCategory[act.category] = (activitiesByCategory[act.category] || 0) + 1;
    });
  });

  const barData = Object.entries(activitiesByMonth).map(([month, count]) => ({ month, count }));
  const pieData = Object.entries(activitiesByCategory).map(([name, value]) => ({ name, value }));

  const COLORS = ['#2D7A3A', '#4A2410', '#6B9E5A', '#C4A87C', '#7A8B5D', '#8B6B4A'];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Fleet Intelligence Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time insights and 90-day maintenance forecast.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Maintained Fleet" 
          value={activeBusesCount.toString()}
          subtitle={`${maintenanceBusesCount} in shop · ${liveOnRoad != null ? `${liveOnRoad} live on DRT today` : "live data loading…"}`}
          icon={BusFront} 
          delay={0.1} 
        />
        <StatCard 
          title="Overdue Maintenance" 
          value={forecast?.summary.overdueCount.toString() || "0"} 
          subtitle="Requires immediate attention" 
          icon={AlertTriangle} 
          variant="destructive"
          delay={0.2} 
        />
        <StatCard 
          title="Scheduled Activities (90 Days)" 
          value={forecast?.summary.totalActivities.toString() || "0"} 
          subtitle={`${forecast?.summary.totalEstimatedHours.toFixed(1)} estimated labor hrs`}
          icon={Hammer} 
          delay={0.3} 
        />
        <StatCard 
          title="Projected Parts Cost" 
          value={formatCurrency(forecast?.summary.totalPartsCost || 0)} 
          subtitle="Based on upcoming schedules" 
          icon={CircleDollarSign} 
          variant="accent"
          delay={0.4} 
        />
      </div>

      {/* ── Service Queue ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">Service Queue — Next Up</h3>
          </div>
          <Link href="/forecast" className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
            Full forecast <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {serviceQueue.length === 0 ? (
          <div className="px-6 py-10 text-center text-muted-foreground text-sm">
            No upcoming services in the next 90 days.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {serviceQueue.map((item, i) => {
              const isOverdue = item.urgency === 'overdue';
              const isUrgent = item.urgency === 'urgent';
              const pmLevel = /cvor/i.test(item.pmName) ? 'CVOR'
                : /^D /i.test(item.pmName) ? 'D'
                : /^C /i.test(item.pmName) ? 'C'
                : /^B /i.test(item.pmName) ? 'B'
                : /^A /i.test(item.pmName) ? 'A' : '—';
              const levelColors: Record<string, string> = {
                A: 'bg-green-100 text-green-700',
                B: 'bg-blue-100 text-blue-700',
                C: 'bg-amber-100 text-amber-700',
                D: 'bg-red-100 text-red-700',
                CVOR: 'bg-purple-100 text-purple-700',
                '—': 'bg-muted text-muted-foreground',
              };

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className={cn(
                    "flex items-center gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors",
                    isOverdue && "bg-red-50/60 hover:bg-red-50"
                  )}
                >
                  {/* PM level badge */}
                  <span className={cn(
                    "inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-bold shrink-0",
                    levelColors[pmLevel]
                  )}>
                    {pmLevel}
                  </span>

                  {/* Bus + service info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">Bus {item.busNumber}</span>
                      <span className="text-xs text-muted-foreground truncate">{item.busModel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.pmName}</p>
                  </div>

                  {/* Due date */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-foreground">
                      {format(parseISO(item.estimatedDueDate), 'MMM d')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{item.estimatedHours}h est.</p>
                  </div>

                  {/* Urgency pill */}
                  <div className="shrink-0 w-24 text-right">
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3" /> Overdue
                      </span>
                    ) : isUrgent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                        <Clock className="w-3 h-3" /> {item.dueInDays}d
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">
                        <Clock className="w-3 h-3" /> {item.dueInDays}d
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold text-foreground mb-6">Upcoming Activities by Month</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col"
        >
          <h3 className="text-lg font-bold text-foreground mb-2">Distribution by Category</h3>
          <div className="h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="capitalize text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, delay, variant = "default" }: any) {
  const isDestructive = variant === "destructive";
  const isAccent = variant === "accent";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1",
        isDestructive ? "bg-red-50/50 border-red-100" : isAccent ? "bg-green-50/50 border-green-100" : "bg-card border-border"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className={cn("text-sm font-semibold mb-1", isDestructive ? "text-red-600" : isAccent ? "text-green-700" : "text-muted-foreground")}>{title}</p>
          <h3 className="text-3xl font-display font-bold text-foreground">{value}</h3>
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          isDestructive ? "bg-red-100 text-red-600" : isAccent ? "bg-green-100 text-green-700" : "bg-primary/5 text-primary"
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>
    </motion.div>
  );
}
