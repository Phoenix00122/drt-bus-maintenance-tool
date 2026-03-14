import { useQuery } from "@tanstack/react-query";
import { generateForecast, useGetBuses } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BusFront, AlertTriangle, Hammer, CircleDollarSign, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

export default function Dashboard() {
  const { data: buses, isLoading: busesLoading } = useGetBuses();
  
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
  
  // Aggregate activities by month for the chart
  const activitiesByMonth: Record<string, number> = {};
  const activitiesByCategory: Record<string, number> = {};

  forecast?.forecasts.forEach(f => {
    f.scheduledActivities.forEach(act => {
      // Month grouping
      const date = new Date(act.estimatedDueDate);
      const monthStr = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      activitiesByMonth[monthStr] = (activitiesByMonth[monthStr] || 0) + 1;

      // Category grouping
      activitiesByCategory[act.category] = (activitiesByCategory[act.category] || 0) + 1;
    });
  });

  const barData = Object.entries(activitiesByMonth).map(([month, count]) => ({ month, count }));
  const pieData = Object.entries(activitiesByCategory).map(([name, value]) => ({ name, value }));

  const COLORS = ['#F97316', '#1E3A8A', '#3B82F6', '#10B981', '#F59E0B', '#6366F1'];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Fleet Intelligence Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time insights and 90-day maintenance forecast.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Active Fleet" 
          value={activeBusesCount.toString()} 
          subtitle="Out of total buses" 
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
        isDestructive ? "bg-red-50/50 border-red-100" : isAccent ? "bg-orange-50/50 border-orange-100" : "bg-card border-border"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className={cn("text-sm font-semibold mb-1", isDestructive ? "text-red-600" : isAccent ? "text-orange-600" : "text-muted-foreground")}>{title}</p>
          <h3 className="text-3xl font-display font-bold text-foreground">{value}</h3>
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          isDestructive ? "bg-red-100 text-red-600" : isAccent ? "bg-orange-100 text-orange-600" : "bg-primary/5 text-primary"
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>
    </motion.div>
  );
}
