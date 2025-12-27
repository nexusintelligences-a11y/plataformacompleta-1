import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Mail, ArrowRight, Link as LinkIcon, Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InstantMeetingModalProps {
  open: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    linkReuniao: string;
    titulo: string;
  } | null;
  onJoin: () => void;
}

export function InstantMeetingModal({ open, onClose, meeting, onJoin }: InstantMeetingModalProps) {
  const [copied, setCopied] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const { toast } = useToast();

  const handleCopyLink = async () => {
    if (meeting?.linkReuniao) {
      try {
        await navigator.clipboard.writeText(meeting.linkReuniao);
        setCopied(true);
        toast({
          title: "Link copiado!",
          description: "O link da reunião foi copiado para a área de transferência.",
        });
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        console.error("Failed to copy:", err);
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o link.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSendInvites = () => {
    const emails = inviteEmails.split(",").map(e => e.trim()).filter(e => e);
    if (emails.length === 0) {
      toast({
        title: "Nenhum email informado",
        description: "Digite pelo menos um email para enviar o convite.",
        variant: "destructive",
      });
      return;
    }

    const subject = encodeURIComponent(`Convite para reunião: ${meeting?.titulo || "Reunião"}`);
    const body = encodeURIComponent(
      `Olá!\n\nVocê foi convidado(a) para participar de uma reunião.\n\n` +
      `Clique no link abaixo para entrar:\n${meeting?.linkReuniao}\n\n` +
      `Até já!`
    );
    
    window.open(`mailto:${emails.join(",")}?subject=${subject}&body=${body}`, "_blank");
    
    toast({
      title: "Cliente de email aberto",
      description: "Complete o envio do convite no seu cliente de email.",
    });
    setInviteEmails("");
    setShowInviteForm(false);
  };

  const getMeetingCode = () => {
    if (!meeting?.linkReuniao) return "";
    const parts = meeting.linkReuniao.split("/");
    return parts[parts.length - 1] || "";
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <span>Reunião criada!</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Envie este link para quem participará da reunião. Recomendamos salvá-lo para usar mais tarde.
          </p>

          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-mono truncate flex-1">
              {getMeetingCode() || meeting?.linkReuniao}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {!showInviteForm ? (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setShowInviteForm(true)}
              >
                <Users className="h-4 w-4" />
                Adicionar pessoas
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleCopyLink}
              >
                <Copy className="h-4 w-4" />
                {copied ? "Link copiado!" : "Copiar link da reunião"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Convidar por email
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInviteForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder="email@exemplo.com, outro@exemplo.com"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Separe múltiplos emails com vírgula
              </p>
              <Button
                onClick={handleSendInvites}
                className="w-full"
                size="sm"
              >
                <Mail className="h-4 w-4 mr-2" />
                Enviar convite
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={onJoin} className="gap-2">
            Participar agora
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
