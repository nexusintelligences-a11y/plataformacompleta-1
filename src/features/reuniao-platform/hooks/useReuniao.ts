import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Meeting, CreateMeetingData } from "../types";

const API_BASE = "/api/reunioes";

async function apiRequest(method: string, url: string, data?: unknown) {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
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

export function useReuniao(id?: string) {
  const queryClient = useQueryClient();

  const { data: meetingsResponse, isLoading: listLoading, error: listError } = useQuery<{ success: boolean; data: Meeting[] }>({
    queryKey: [API_BASE],
    queryFn: () => apiRequest("GET", API_BASE),
    staleTime: 30 * 1000,
  });

  const meetings = meetingsResponse?.data || [];

  const { data: meetingResponse, isLoading: meetingLoading, error: meetingError } = useQuery<{ success: boolean; data: Meeting }>({
    queryKey: [API_BASE, id],
    queryFn: () => apiRequest("GET", `${API_BASE}/${id}`),
    enabled: !!id,
  });

  const meeting = meetingResponse?.data;

  const createMutation = useMutation({
    mutationFn: (data: CreateMeetingData) => apiRequest("POST", API_BASE, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Meeting> }) => 
      apiRequest("PATCH", `${API_BASE}/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [API_BASE] });
      queryClient.invalidateQueries({ queryKey: [API_BASE, id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `${API_BASE}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE] });
    },
  });

  const startMeetingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `${API_BASE}/${id}/start`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [API_BASE] });
      queryClient.invalidateQueries({ queryKey: [API_BASE, id] });
    },
  });

  const endMeetingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `${API_BASE}/${id}/end`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [API_BASE] });
      queryClient.invalidateQueries({ queryKey: [API_BASE, id] });
    },
  });

  const getTokenMutation = useMutation({
    mutationFn: ({ id, userName, role = 'guest' }: { id: string; userName?: string; role?: string }) => 
      apiRequest("GET", `${API_BASE}/${id}/token?role=${role}${userName ? `&userName=${encodeURIComponent(userName)}` : ''}`),
  });

  const startRecordingMutation = useMutation({
    mutationFn: ({ id, meetingUrl }: { id: string; meetingUrl?: string }) => 
      apiRequest("POST", `${API_BASE}/${id}/recording/start`, { meetingUrl }),
  });

  const stopRecordingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `${API_BASE}/${id}/recording/stop`),
  });

  const createInstantMeetingMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 60 * 1000); // 1 hora de duração
      
      const data: CreateMeetingData = {
        titulo: `Reunião Instantânea - ${now.toLocaleTimeString('pt-BR')}`,
        descricao: 'Reunião criada instantaneamente',
        dataInicio: now.toISOString(),
        dataFim: end.toISOString(),
        duracao: 60,
        participantes: [],
      };
      
      const result = await apiRequest("POST", API_BASE, data);
      
      // Iniciar a reunião automaticamente
      if (result.data?.id) {
        await apiRequest("POST", `${API_BASE}/${result.data.id}/start`);
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE] });
    },
  });

  return {
    meetings,
    meeting,
    loading: listLoading || meetingLoading,
    error: listError || meetingError,
    addMeeting: (data: CreateMeetingData) => createMutation.mutateAsync(data),
    updateMeeting: (id: string, data: Partial<Meeting>) => updateMutation.mutateAsync({ id, data }),
    deleteMeeting: (id: string) => deleteMutation.mutateAsync(id),
    startMeeting: (id: string) => startMeetingMutation.mutateAsync(id),
    endMeeting: (id: string) => endMeetingMutation.mutateAsync(id),
    getToken: (id: string, userName?: string, role?: string) => 
      getTokenMutation.mutateAsync({ id, userName, role }),
    startRecording: (id: string, meetingUrl?: string) => 
      startRecordingMutation.mutateAsync({ id, meetingUrl }),
    stopRecording: (id: string) => stopRecordingMutation.mutateAsync(id),
    createInstantMeeting: () => createInstantMeetingMutation.mutateAsync(),
    isCreating: createMutation.isPending,
    isStarting: startMeetingMutation.isPending || createInstantMeetingMutation.isPending,
    isEnding: endMeetingMutation.isPending,
    createError: createMutation.error,
  };
}
