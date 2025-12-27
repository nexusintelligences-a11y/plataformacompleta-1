import { createContext, useContext, useState, ReactNode } from 'react';
import type { Tables } from '@/features/revendedora/integrations/supabase/types';

type Reseller = Tables<'resellers'>;

interface CompanyContextType {
  reseller: Reseller | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCompanyData = async () => {
    setReseller(null);
    setLoading(false);
  };

  return (
    <CompanyContext.Provider value={{ reseller, loading, refetch: fetchCompanyData }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
