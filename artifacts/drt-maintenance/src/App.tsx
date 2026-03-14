import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Dashboard from "@/pages/dashboard";
import Fleet from "@/pages/fleet";
import Forecast from "@/pages/forecast";
import Bundles from "@/pages/bundles";
import Parts from "@/pages/parts";
import LiveFleet from "@/pages/live-fleet";
import ServiceLogs from "@/pages/service-logs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/fleet" component={Fleet} />
        <Route path="/forecast" component={Forecast} />
        <Route path="/bundles" component={Bundles} />
        <Route path="/parts" component={Parts} />
        <Route path="/live-fleet" component={LiveFleet} />
        <Route path="/service-logs" component={ServiceLogs} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
