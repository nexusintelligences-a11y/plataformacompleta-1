import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import PlatformRouter from "./platforms/PlatformRouter";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { SupabaseConfigProvider } from "@/features/formularios-platform/contexts/SupabaseConfigContext";
import { ThemeProvider } from "@/components/ThemeProvider";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SupabaseConfigProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <PlatformRouter />
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </SupabaseConfigProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
