import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, LayoutDashboard, Users, Settings } from "lucide-react";

/**
 * Assinatura Digital - Página Principal
 * 
 * Plataforma completa integrada com:
 * ✅ Painel Admin (AdminAssinatura) - Gerenciamento de contratos
 * ✅ Assinatura Cliente (ClientAssinatura) - Interface para clientes assinarem
 * ✅ Reconhecimento Facial - Verificação biométrica
 * ✅ 140+ componentes React
 * ✅ Todos os schemas e APIs registrados
 */

export default function AssinaturaPrincipal() {
  const [view, setView] = useState<'dashboard' | 'admin' | 'about'>('dashboard');

  const features = [
    {
      icon: FileText,
      title: "Gestão de Contratos",
      description: "Crie, configure e acompanhe contratos digitais",
    },
    {
      icon: Users,
      title: "Assinatura de Clientes",
      description: "Interface para clientes assinarem com reconhecimento facial",
    },
    {
      icon: Settings,
      title: "Personalização Completa",
      description: "Configure cores, logos, textos e fluxos customizados",
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Tabs */}
      <div className="border-b px-4 sm:px-6 flex gap-2 pb-2">
        <Button
          variant={view === 'dashboard' ? 'default' : 'ghost'}
          onClick={() => setView('dashboard')}
          className="gap-2"
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Button>
        <Button
          variant={view === 'admin' ? 'default' : 'ghost'}
          onClick={() => setView('admin')}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Admin
        </Button>
        <Button
          variant={view === 'about' ? 'default' : 'ghost'}
          onClick={() => setView('about')}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          Sobre
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <Card key={idx} className="p-4">
                    <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </Card>
                );
              })}
            </div>

            <Card className="p-6 bg-blue-50 dark:bg-blue-950">
              <h2 className="text-lg font-bold mb-3">Recursos Importados</h2>
              <ul className="grid grid-cols-2 gap-2 text-sm">
                <li>✅ Admin de Contratos (AdminAssinatura.tsx)</li>
                <li>✅ Interface de Cliente (ClientAssinatura.tsx)</li>
                <li>✅ Reconhecimento Facial (FacialRecognitionAssinatura.tsx)</li>
                <li>✅ 140+ Componentes React</li>
                <li>✅ 70+ Componentes de UI</li>
                <li>✅ Contextos e Hooks</li>
                <li>✅ Validadores e Utilities</li>
                <li>✅ Configs de Branding</li>
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold mb-3">Funcionalidades Completas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">👨‍💼 Admin</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Gerenciar contratos</li>
                    <li>• Personalizar aparência</li>
                    <li>• Configurar verificação</li>
                    <li>• Rastreador de progresso</li>
                    <li>• Parabéns pós-assinatura</li>
                    <li>• Promoção de aplicativos</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">👤 Cliente</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Reconhecimento facial</li>
                    <li>• Verificação Gov.br</li>
                    <li>• Assinatura digital</li>
                    <li>• Rastreamento de progresso</li>
                    <li>• Promoção de app</li>
                    <li>• Logs de auditoria</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        {view === 'admin' && (
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-3">Painel Administrativo</h2>
            <p className="text-muted-foreground mb-4">
              Para acessar o painel completo de administração, navegue para <code>/assinatura-admin</code>
            </p>
            <Button asChild>
              <a href="/assinatura-admin">Ir para Admin</a>
            </Button>
          </Card>
        )}

        {view === 'about' && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-bold">Sobre a Plataforma</h2>
            <div className="space-y-3 text-sm">
              <div>
                <h3 className="font-semibold">Arquitetura</h3>
                <p className="text-muted-foreground">
                  Plataforma completa de assinatura digital com reconhecimento facial avançado,
                  integração Gov.br para autenticação, e sistema de auditoria completo.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Tecnologias</h3>
                <p className="text-muted-foreground">
                  React + TypeScript + Supabase + Express.js + PostgreSQL
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Componentes</h3>
                <p className="text-muted-foreground">
                  140+ componentes React com Shadcn/UI, contextos de autenticação,
                  hooks customizados, validadores e utilitários completos.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Arquivos Integrados</h3>
                <ul className="text-muted-foreground list-disc list-inside">
                  <li>Admin.tsx - Painel completo (~95KB)</li>
                  <li>ClientContract.tsx - Interface cliente (~23KB)</li>
                  <li>FacialRecognition.tsx - Verificação facial</li>
                  <li>70+ componentes de UI e steps</li>
                  <li>Contextos e hooks</li>
                  <li>50+ rotas Express API</li>
                  <li>Schemas Supabase completos</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
