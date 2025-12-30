import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, Clock, AlertCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

/**
 * Página de Assinatura Digital
 * Plataforma completa de assinatura com reconhecimento facial integrada ao dashboard
 */

interface Contract {
  id: string;
  client_name: string;
  status: "pending" | "signed" | "rejected";
  created_at: string;
  signed_at?: string;
}

export default function AssinaturePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch contracts
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["/api/assinatura/contracts"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/assinatura/contracts");
        const data = await response.json();
        return data.contracts || [];
      } catch (error) {
        console.error("Error fetching contracts:", error);
        return [];
      }
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "signed":
        return (
          <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Assinado
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-700 dark:text-red-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="border-b p-4 sm:p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-md">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Assinatura Digital</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie contratos e assinaturas com reconhecimento facial
            </p>
          </div>
        </div>
        <Button className="gap-2" data-testid="button-create-contract">
          <Plus className="w-4 h-4" />
          Novo Contrato
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2 animate-spin" />
              <p className="text-muted-foreground">Carregando contratos...</p>
            </div>
          </div>
        ) : contracts.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum contrato</h3>
            <p className="text-muted-foreground mb-6">
              Comece criando seu primeiro contrato digital
            </p>
            <Button data-testid="button-create-first-contract">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Contrato
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {contracts.map((contract: Contract) => (
              <Card
                key={contract.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedId(contract.id)}
                data-testid={`card-contract-${contract.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{contract.client_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Criado em{" "}
                      {new Date(contract.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    {contract.signed_at && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Assinado em{" "}
                        {new Date(contract.signed_at).toLocaleDateString(
                          "pt-BR"
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(contract.status)}
                    <Button variant="ghost" size="sm">
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Features Info */}
      <div className="border-t p-4 sm:p-6 bg-muted/30">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Reconhecimento Facial
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Verificação biométrica segura
            </p>
          </div>
          <div>
            <p className="font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Assinatura Digital
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Validade legal garantida
            </p>
          </div>
          <div>
            <p className="font-semibold text-sm flex items-center gap-2">
              <Badge className="w-4 h-4 text-purple-600" />
              Gov.br Integrado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Autenticação oficial
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
