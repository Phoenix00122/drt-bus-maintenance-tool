import { useState } from "react";
import { useGetBuses, useCreateBus, useUpdateBus, useDeleteBus, Bus } from "@workspace/api-client-react";
import { Plus, Edit2, Trash2, Loader2, Bus as BusIcon, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

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

export default function Fleet() {
  const { data: buses, isLoading } = useGetBuses();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);

  const filteredBuses = buses?.filter(b => 
    b.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setEditingBus(null);
    setIsModalOpen(true);
  };

  const openEdit = (bus: Bus) => {
    setEditingBus(bus);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Bus Fleet</h1>
          <p className="text-muted-foreground mt-1">Manage vehicles and track odometer readings.</p>
        </div>
        <button 
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-semibold shadow-lg shadow-accent/30 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Bus
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center bg-gray-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by bus number or model..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
        ) : filteredBuses?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <BusIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No buses found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="px-6 py-4">Bus #</th>
                  <th className="px-6 py-4">Model & Year</th>
                  <th className="px-6 py-4 text-right">Current Odo</th>
                  <th className="px-6 py-4 text-right">Avg. Mo/Km</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence>
                  {filteredBuses?.map((bus, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={bus.id} 
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-6 py-4 font-bold text-primary">{bus.busNumber}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{bus.model}</div>
                        <div className="text-xs text-muted-foreground">{bus.year}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">{bus.currentOdometer.toLocaleString()} km</td>
                      <td className="px-6 py-4 text-right font-mono">{bus.monthlyDistance.toLocaleString()} km</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                          bus.status === 'active' ? "bg-green-100 text-green-700" :
                          bus.status === 'maintenance' ? "bg-orange-100 text-orange-700" :
                          "bg-gray-100 text-gray-600"
                        )}>
                          {bus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(bus)} className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <DeleteBusButton id={bus.id} busNumber={bus.busNumber} />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <BusFormModal 
          bus={editingBus} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}

function DeleteBusButton({ id, busNumber }: { id: number, busNumber: string }) {
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteBus({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/buses'] })
    }
  });

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete bus ${busNumber}?`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={deleteMutation.isPending}
      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
    >
      {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}

function BusFormModal({ bus, onClose }: { bus: Bus | null, onClose: () => void }) {
  const queryClient = useQueryClient();
  const createMutation = useCreateBus({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/buses'] }); onClose(); } }
  });
  const updateMutation = useUpdateBus({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/buses'] }); onClose(); } }
  });

  const form = useForm<BusFormData>({
    resolver: zodResolver(busSchema),
    defaultValues: bus ? {
      ...bus,
      notes: bus.notes || ""
    } : {
      busNumber: "",
      model: "Nova Bus LFS",
      year: new Date().getFullYear(),
      currentOdometer: 0,
      monthlyDistance: 5000,
      lastPmDate: new Date().toISOString().split('T')[0],
      lastPmOdometer: 0,
      status: "active",
      notes: ""
    }
  });

  const onSubmit = (data: BusFormData) => {
    if (bus) {
      updateMutation.mutate({ id: bus.id, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h2 className="text-xl font-bold font-display">{bus ? `Edit Bus ${bus.busNumber}` : 'Add New Bus'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors"><XIcon className="w-5 h-5 text-muted-foreground"/></button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form id="bus-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Bus Number *</label>
                <input {...form.register("busNumber")} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-accent/50 outline-none" placeholder="e.g. 8104" />
                {form.formState.errors.busNumber && <p className="text-xs text-red-500">{form.formState.errors.busNumber.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Status</label>
                <select {...form.register("status")} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-accent/50 outline-none bg-white">
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Model *</label>
                <input {...form.register("model")} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-accent/50 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Year *</label>
                <input type="number" {...form.register("year")} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-accent/50 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Current Odometer (km) *</label>
                <input type="number" {...form.register("currentOdometer")} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-accent/50 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Avg. Monthly Distance (km) *</label>
                <input type="number" {...form.register("monthlyDistance")} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-accent/50 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Last PM Date *</label>
                <input type="date" {...form.register("lastPmDate")} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-accent/50 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Last PM Odometer (km) *</label>
                <input type="number" {...form.register("lastPmOdometer")} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-accent/50 outline-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground">Notes</label>
              <textarea {...form.register("notes")} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-accent/50 outline-none min-h-[80px]" placeholder="Optional notes..." />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-foreground hover:bg-muted rounded-xl transition-colors">Cancel</button>
          <button 
            type="submit" 
            form="bus-form"
            disabled={isPending}
            className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {bus ? 'Save Changes' : 'Create Bus'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function XIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
}
