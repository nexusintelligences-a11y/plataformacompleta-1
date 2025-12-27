import { useEffect, useState, useRef } from "react";
import {
  HMSReactiveStore,
  selectIsConnectedToRoom,
  selectPeers,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectVideoTrackByID,
  selectAudioTrackByID,
  HMSPeer,
} from "@100mslive/hms-video-store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  Circle,
  Loader2,
  Users,
  Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomDesignConfig, DEFAULT_ROOM_DESIGN_CONFIG } from "../types";

interface Meeting100msProps {
  roomId: string;
  meetingId: string;
  participantName?: string;
  initialAudioEnabled?: boolean;
  initialVideoEnabled?: boolean;
  onLeave: () => void;
  tenant?: {
    nome: string;
    logoUrl?: string;
  };
  roomDesignConfig?: RoomDesignConfig;
  meetingCode?: string;
}

const hmsManager = new HMSReactiveStore();
const hmsStore = hmsManager.getStore();
const hmsActions = hmsManager.getActions();

const EMOJI_REACTIONS = [
  { emoji: "👍", label: "Positivo" },
  { emoji: "👏", label: "Aplausos" },
  { emoji: "❤️", label: "Coração" },
  { emoji: "😂", label: "Risada" },
  { emoji: "😮", label: "Surpresa" },
  { emoji: "🎉", label: "Celebração" },
];

function PeerVideo({
  peer,
  config,
  isSpotlight = false,
}: {
  peer: HMSPeer;
  config: RoomDesignConfig;
  isSpotlight?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const videoTrackId = peer.videoTrack;
  const audioTrackId = peer.audioTrack;

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !videoTrackId) {
      setHasVideo(false);
      return;
    }

    let isMounted = true;

    const handleTrackUpdate = async (track: any) => {
      if (!isMounted || !videoElement) return;

      if (track && (track.enabled || track.displayEnabled)) {
        try {
          await hmsActions.attachVideo(videoTrackId, videoElement);
          if (isMounted) {
            setHasVideo(true);
          }
        } catch (err) {
          console.error('[PeerVideo] Attach error:', err);
          if (isMounted) setHasVideo(false);
        }
      } else {
        try {
          await hmsActions.detachVideo(videoTrackId, videoElement);
        } catch (err) {
          // Ignore detach errors
        }
        if (isMounted) setHasVideo(false);
      }
    };

    const initialTrack = hmsStore.getState(selectVideoTrackByID(videoTrackId));
    handleTrackUpdate(initialTrack);

    const unsubscribe = hmsStore.subscribe(handleTrackUpdate, selectVideoTrackByID(videoTrackId));

    return () => {
      isMounted = false;
      unsubscribe();
      if (videoElement && videoTrackId) {
        hmsActions.detachVideo(videoTrackId, videoElement).catch(() => {});
      }
    };
  }, [videoTrackId, peer.name]);

  useEffect(() => {
    if (!audioTrackId) {
      setIsAudioMuted(true);
      return;
    }

    const handleAudioUpdate = (track: any) => {
      setIsAudioMuted(!track?.enabled);
    };

    const initialAudioTrack = hmsStore.getState(selectAudioTrackByID(audioTrackId));
    handleAudioUpdate(initialAudioTrack);

    const unsubscribe = hmsStore.subscribe(handleAudioUpdate, selectAudioTrackByID(audioTrackId));
    return () => unsubscribe();
  }, [audioTrackId]);

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border border-zinc-700",
        isSpotlight ? "aspect-video" : "aspect-video"
      )}
      style={{ backgroundColor: config.colors.background }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted={peer.isLocal}
        playsInline
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          peer.isLocal && "transform scale-x-[-1]",
          !hasVideo && "invisible"
        )}
      />
      
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "rounded-full flex items-center justify-center font-bold",
              isSpotlight ? "h-32 w-32 text-5xl" : "h-20 w-20 text-2xl"
            )}
            style={{
              backgroundColor: config.colors.avatarBackground,
              color: config.colors.avatarText,
            }}
          >
            {peer.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        </div>
      )}

      <div
        className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2"
        style={{
          backgroundColor: config.colors.participantNameBackground,
          color: config.colors.participantNameText,
        }}
      >
        {isAudioMuted && <MicOff className="h-3.5 w-3.5 text-red-400" />}
        <span className="font-medium">
          {peer.name} {peer.isLocal && "(Você)"}
        </span>
      </div>
    </div>
  );
}

function Controls({
  onLeave,
  config,
  onReact,
}: {
  onLeave: () => void;
  config: RoomDesignConfig;
  onReact: (emoji: string) => void;
}) {
  const [isLocalAudioEnabled, setIsLocalAudioEnabled] = useState(true);
  const [isLocalVideoEnabled, setIsLocalVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);

  useEffect(() => {
    const unsubAudio = hmsStore.subscribe(setIsLocalAudioEnabled, selectIsLocalAudioEnabled);
    const unsubVideo = hmsStore.subscribe(setIsLocalVideoEnabled, selectIsLocalVideoEnabled);
    return () => {
      unsubAudio();
      unsubVideo();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLeave = async () => {
    try {
      await hmsActions.leave();
    } catch (e) {
      console.error("Error leaving room:", e);
    }
    onLeave();
  };

  const toggleAudio = async () => {
    try {
      await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
    } catch (e) {
      console.error("Error toggling audio:", e);
    }
  };

  const toggleVideo = async () => {
    try {
      await hmsActions.setLocalVideoEnabled(!isLocalVideoEnabled);
    } catch (e) {
      console.error("Error toggling video:", e);
    }
  };

  const toggleScreenShare = async () => {
    if (!config.meeting.enableScreenShare) return;
    try {
      if (!isScreenSharing) {
        await hmsActions.setScreenShareEnabled(true);
      } else {
        await hmsActions.setScreenShareEnabled(false);
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (e) {
      console.error("Error toggling screen share:", e);
    }
  };

  const toggleRecording = async () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setRecordingTimer(0);
    }
  };

  return (
    <div
      className="flex items-center justify-center gap-3 p-4 rounded-2xl"
      style={{ backgroundColor: config.colors.controlsBackground }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAudio}
              className={cn(
                "rounded-full h-12 w-12",
                isLocalAudioEnabled
                  ? "bg-zinc-800 hover:bg-zinc-700"
                  : "bg-red-500 hover:bg-red-600"
              )}
            >
              {isLocalAudioEnabled ? (
                <Mic className="h-5 w-5 text-white" />
              ) : (
                <MicOff className="h-5 w-5 text-white" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isLocalAudioEnabled ? "Desativar microfone" : "Ativar microfone"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVideo}
              className={cn(
                "rounded-full h-12 w-12",
                isLocalVideoEnabled
                  ? "bg-zinc-800 hover:bg-zinc-700"
                  : "bg-red-500 hover:bg-red-600"
              )}
            >
              {isLocalVideoEnabled ? (
                <Video className="h-5 w-5 text-white" />
              ) : (
                <VideoOff className="h-5 w-5 text-white" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isLocalVideoEnabled ? "Desativar câmera" : "Ativar câmera"}
          </TooltipContent>
        </Tooltip>

        {config.meeting.enableScreenShare && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleScreenShare}
                className={cn(
                  "rounded-full h-12 w-12",
                  isScreenSharing
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                )}
              >
                <MonitorUp className="h-5 w-5 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isScreenSharing ? "Parar compartilhamento" : "Compartilhar tela"}
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRecording}
              className={cn(
                "rounded-full h-12 w-12",
                isRecording
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-zinc-800 hover:bg-zinc-700"
              )}
            >
              <Circle
                className={cn(
                  "h-5 w-5 text-white",
                  isRecording && "fill-current animate-pulse"
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isRecording ? `Gravando ${formatTime(recordingTimer)}` : "Iniciar gravação"}
          </TooltipContent>
        </Tooltip>

        {config.meeting.enableReactions && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-12 w-12 bg-zinc-800 hover:bg-zinc-700"
              >
                <Smile className="h-5 w-5 text-white" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 bg-zinc-800 border-zinc-700">
              <div className="flex gap-1">
                {EMOJI_REACTIONS.map(({ emoji, label }) => (
                  <TooltipProvider key={emoji}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-xl hover:bg-zinc-700 rounded-full"
                          onClick={() => onReact(emoji)}
                        >
                          {emoji}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{label}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLeave}
              className="rounded-full h-12 w-12 bg-red-500 hover:bg-red-600"
            >
              <PhoneOff className="h-5 w-5 text-white" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sair da reunião</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function Meeting100ms({
  roomId,
  meetingId,
  participantName = "Participante",
  initialAudioEnabled = true,
  initialVideoEnabled = true,
  onLeave,
  tenant,
  roomDesignConfig,
  meetingCode,
}: Meeting100msProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [peers, setPeers] = useState<HMSPeer[]>([]);
  const [reactions, setReactions] = useState<{ id: string; emoji: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const config = roomDesignConfig || DEFAULT_ROOM_DESIGN_CONFIG;

  useEffect(() => {
    const unsubConnected = hmsStore.subscribe(setIsConnected, selectIsConnectedToRoom);
    const unsubPeers = hmsStore.subscribe(setPeers, selectPeers);

    return () => {
      unsubConnected();
      unsubPeers();
    };
  }, []);

  useEffect(() => {
    // Auto-join ao montar o componente
    const autoJoin = async () => {
      await joinRoom();
    };
    autoJoin();
  }, [meetingId, participantName]);

  const joinRoom = async () => {
    if (isConnected) return; // Já conectado
    
    setIsJoining(true);
    setError(null);

    try {
      console.log('[Meeting100ms] Obtendo token para reunião:', meetingId);
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/meetings/${meetingId}/token?userName=${encodeURIComponent(participantName)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Meeting100ms] Erro ao obter token:', response.status, errorText);
        throw new Error(`Falha ao obter token de acesso: ${response.status}`);
      }

      const result = await response.json();
      const authToken = result.data?.token;

      if (!authToken) {
        console.error('[Meeting100ms] Token inválido na resposta:', result);
        throw new Error('Token de acesso inválido');
      }

      console.log('[Meeting100ms] Token obtido com sucesso, conectando...');
      
      await hmsActions.join({
        userName: participantName,
        authToken,
        settings: {
          isAudioMuted: !initialAudioEnabled,
          isVideoMuted: !initialVideoEnabled,
        },
      });
      
      console.log('[Meeting100ms] Conectado com sucesso!');
    } catch (err: any) {
      console.error('[Meeting100ms] Join error:', err);
      setError(err.message || 'Erro ao entrar na reunião');
    } finally {
      setIsJoining(false);
    }
  };

  const handleReact = (emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (isConnected) {
        hmsActions.leave().catch(console.error);
      }
    };
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-6 p-8"
        style={{ backgroundColor: config.colors.background }}
      >
        {tenant?.logoUrl && config.branding.showLogoInLobby && (
          <img
            src={tenant.logoUrl}
            alt={tenant.nome}
            className="h-12 object-contain"
          />
        )}
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            {config.lobby.title}
          </h2>
          {config.lobby.subtitle && (
            <p className="text-zinc-400">{config.lobby.subtitle}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg px-4 py-2 text-red-400">
            {error}
          </div>
        )}

        <Button
          onClick={joinRoom}
          disabled={isJoining}
          className="gap-2 px-8 py-6 text-lg"
          style={{ backgroundColor: config.colors.primaryButton }}
        >
          {isJoining ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Entrando...
            </>
          ) : (
            config.lobby.buttonText || "Participar agora"
          )}
        </Button>
      </div>
    );
  }

  const gridCols =
    peers.length <= 1
      ? "grid-cols-1"
      : peers.length <= 4
      ? "grid-cols-2"
      : peers.length <= 9
      ? "grid-cols-3"
      : "grid-cols-4";

  return (
    <div
      className="h-full flex flex-col relative"
      style={{ backgroundColor: config.colors.background }}
    >
      {tenant?.logoUrl && config.branding.showLogoInMeeting && (
        <div className="absolute top-4 left-4 z-10">
          <img
            src={tenant.logoUrl}
            alt={tenant.nome}
            style={{ height: config.branding.logoSize || 40 }}
            className="object-contain"
          />
        </div>
      )}

      {config.meeting.showParticipantCount && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full text-white text-sm">
          <Users className="h-4 w-4" />
          {peers.length}
        </div>
      )}

      <div className={`flex-1 grid ${gridCols} gap-4 p-4`}>
        {peers.map((peer) => (
          <PeerVideo
            key={peer.id}
            peer={peer}
            config={config}
            isSpotlight={peers.length === 1}
          />
        ))}
      </div>

      {reactions.map(({ id, emoji }) => (
        <div
          key={id}
          className="absolute bottom-24 left-1/2 transform -translate-x-1/2 animate-bounce text-4xl"
          style={{ animationDuration: "0.5s" }}
        >
          {emoji}
        </div>
      ))}

      <div className="flex justify-center pb-6">
        <Controls onLeave={onLeave} config={config} onReact={handleReact} />
      </div>
    </div>
  );
}
