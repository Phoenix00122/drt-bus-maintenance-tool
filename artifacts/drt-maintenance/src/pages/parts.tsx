import { useState } from "react";
import { useGetParts } from "@workspace/api-client-react";
import { formatCurrency, cn } from "@/lib/utils";
import { Package, Search, AlertTriangle } from "lucide-react";

export default function Parts() {
  const { data: parts, isLoading } = useGetParts();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredParts = parts?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Parts Inventory</h1>
          <p className="text-muted-foreground mt-1">Browse stock levels and unit costs.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center bg-gray-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by part number, name, or category..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredParts?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No parts found in inventory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4">Part #</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4 text-right">Unit Cost</th>
                  <th className="px-6 py-4 text-right">Stock Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredParts?.map((part) => {
                  const isLowStock = part.stockLevel < 10;
                  return (
                    <tr key={part.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 font-mono font-bold text-primary/80">{part.partNumber}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{part.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded-md text-xs font-semibold">
                          {part.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{part.supplier || 'N/A'}</td>
                      <td className="px-6 py-4 text-right font-mono font-medium">{formatCurrency(part.unitCost)} <span className="text-xs text-muted-foreground ml-1">/{part.unit}</span></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLowStock && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                          <span className={cn(
                            "font-bold px-2 py-1 rounded-md", 
                            isLowStock ? "bg-orange-100 text-orange-700" : "text-foreground"
                          )}>
                            {part.stockLevel}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
