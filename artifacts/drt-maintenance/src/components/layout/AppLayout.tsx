import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Bus, 
  LayoutDashboard, 
  CalendarDays, 
  PackageSearch, 
  Wrench,
  Menu,
  X,
  Radio
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fleet", label: "Bus Fleet", icon: Bus },
  { href: "/forecast", label: "PM Forecast", icon: CalendarDays },
  { href: "/bundles", label: "Parts Bundling", icon: Wrench },
  { href: "/parts", label: "Parts Inventory", icon: PackageSearch },
  { href: "/live-fleet", label: "Live Fleet", icon: Radio },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavLinks = () => (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;
        return (
          <Link 
            key={item.href} 
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
              isActive 
                ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20 active" 
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:-translate-y-0.5"
            )}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Icon className="w-5 h-5" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background overflow-hidden relative">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-sidebar border-r border-sidebar-border z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-inner">
            <img 
              src={`${import.meta.env.BASE_URL}images/logo.png`} 
              alt="DRT Logo" 
              className="w-8 h-8 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="font-display font-bold text-xl text-sidebar-foreground leading-tight tracking-wide">
              DRT <span className="text-accent">Maintain</span>
            </h1>
            <span className="text-xs text-sidebar-foreground/50 font-medium">Predictive Fleet Ops</span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2">
          <NavLinks />
        </nav>
        <div className="p-6">
          <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border/50">
            <h4 className="text-sm font-semibold text-sidebar-foreground mb-1">System Status</h4>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span className="text-xs text-sidebar-foreground/70">All systems operational</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header & Overlay */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-8 h-8 bg-white rounded-md p-1" />
          <h1 className="font-display font-bold text-lg text-white">DRT Maintain</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 top-16 bg-sidebar z-20 p-4 flex flex-col space-y-2 overflow-y-auto"
          >
            <NavLinks />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen pt-16 md:pt-0 overflow-y-auto relative">
        <div 
          className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hero-bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <div className="flex-1 p-4 sm:p-6 lg:p-8 z-10 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
