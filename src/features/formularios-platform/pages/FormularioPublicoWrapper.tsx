import { useParams as useReactRouterParams } from "react-router-dom";
import { Router, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "../components/ui/tooltip";
import { SupabaseConfigProvider } from "../contexts/SupabaseConfigContext";
import { queryClient } from "../lib/queryClient";
import FormularioPublico from "./FormularioPublico";
import { useMemo } from "react";

/**
 * Wrapper para FormularioPublico que permite usá-lo com React Router
 * 
 * FormularioPublico usa Wouter internamente, mas este wrapper permite
 * que ele seja chamado de rotas do React Router nas apps Desktop/Mobile.
 * 
 * Suporta múltiplos formatos de URL:
 * - /f/:token (com token de lead)
 * - /form/:id (acesso público direto)
 * - /:companySlug/form/:id (acesso público com slug da empresa)
 */
const FormularioPublicoWrapper = () => {
  const params = useReactRouterParams<{ token?: string; id?: string; companySlug?: string }>();
  
  // Determine qual rota usar baseado nos parâmetros disponíveis
  const wooterPath = useMemo(() => {
    if (params.token) {
      return `/f/${params.token}`;
    } else if (params.companySlug && params.id) {
      return `/${params.companySlug}/form/${params.id}`;
    } else if (params.id) {
      return `/form/${params.id}`;
    }
    return '/';
  }, [params.token, params.id, params.companySlug]);
  
  // Create a custom hook that always returns the current path
  const customHook = useMemo(() => {
    return () => [wooterPath, () => {}] as const;
  }, [wooterPath]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseConfigProvider>
        <TooltipProvider>
          <Router hook={customHook as any}>
            <Route path="/f/:token">
              <FormularioPublico />
            </Route>
            <Route path="/:companySlug/form/:id">
              <FormularioPublico />
            </Route>
            <Route path="/form/:id">
              <FormularioPublico />
            </Route>
          </Router>
        </TooltipProvider>
      </SupabaseConfigProvider>
    </QueryClientProvider>
  );
};

export default FormularioPublicoWrapper;
