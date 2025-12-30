import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/reunioes";

async function apiRequest(method: string, url: string, data?: unknown) {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  
  // Headers dinâmicos do Supabase (para multi-tenant)
  const supabaseUrl = localStorage.getItem('supabase_url');
  const supabaseKey = localStorage.getItem('supabase_key');

  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (supabaseUrl) headers["x-supabase-url"] = supabaseUrl;
  if (supabaseKey) headers["x-supabase-key"] = supabaseKey;
  
  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }

  return response.json();
}

export function useGravacoes() {
  const queryClient = useQueryClient();

  // 📌 Busca todas as gravações do tenant via API (sem precisar de tenant_id)
  // O servidor já sabe qual é o tenant_id da sessão
  const { data: gravacoesList = [], isLoading, error, refetch } = useQuery({
    queryKey: [API_BASE, 'gravacoes'],
    queryFn: () => apiRequest("GET", `${API_BASE}/gravacoes/list`),
    staleTime: 30 * 1000,
    retry: 3,
  });

  // Mutation para deletar gravação
  const deleteGravacao = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `${API_BASE}/gravacoes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE, 'gravacoes'] });
    },
  });

  // Mutation para obter URL de playback
  const getPlaybackUrl = useMutation({
    mutationFn: (id: string) => apiRequest("GET", `${API_BASE}/gravacoes/${id}/url`),
  });

  return {
    gravacoes: gravacoesList,
    isLoading,
    error,
    refetch,
    deleteGravacao: deleteGravacao.mutate,
    getPlaybackUrl: getPlaybackUrl.mutate,
    isDeleting: deleteGravacao.isPending,
    isFetchingUrl: getPlaybackUrl.isPending,
  };
}
