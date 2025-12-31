import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import PlatformRouter from "./platforms/PlatformRouter";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { SupabaseConfigProvider } from "@/features/formularios-platform/contexts/SupabaseConfigContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SupabaseConfigProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PlatformRouter />
          </BrowserRouter>
        </TooltipProvider>
      </SupabaseConfigProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
