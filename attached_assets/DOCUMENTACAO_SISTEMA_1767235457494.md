# Documentação Técnica: Sistema de Assinatura Digital e Gestão de Contratos

Este documento fornece um guia exaustivo para replicar a plataforma de gestão de contratos e assinatura digital, incluindo personalização (branding), fluxo de verificação facial, integração com banco de dados e automações avançadas.

## 1. Visão Geral da Arquitetura

O sistema é composto por:
- **Frontend**: React + Vite + Tailwind CSS + Radix UI.
- **Backend**: Node.js + Express + TypeScript.
- **Banco de Dados**: PostgreSQL + Drizzle ORM.
- **Integração de Terceiros**: Supabase (utilizado para armazenamento de configurações extendidas e storage de imagens).

---

## 2. Modelo de Dados (Schema)

O sistema utiliza uma arquitetura híbrida entre o banco de dados local (via Drizzle) e o Supabase.

### Tabelas Principais (Drizzle - `shared/schema.ts`):
1. **`users`**: Dados dos signatários (CPF, Nome, Email, Endereço completo, Status Gov.br). Suporta persistência de dados residenciais detalhados (CEP, Rua, Número, Cidade, Estado).
2. **`contracts`**: Contém o `contract_html`, `access_token` (UUID para URL pública), fotos da selfie/documento, status e **extensas colunas de personalização** (logos, cores, fontes, links de apps e textos de progresso) que espelham as configs do Supabase para fallback ou uso direto.
3. **`signature_logs`**: Auditoria detalhada (IP, User Agent, Geolocalização, Hash Gov.br e validade da assinatura).
4. **`audit_trail`**: Histórico completo de ações realizadas no sistema com metadados em JSONB para flexibilidade de logs.

### Tabelas Extendidas (Supabase):
Gerenciadas via `server/supabase-routes.ts`, estas tabelas permitem personalização profunda por contrato:
- **`appearance_configs`**: Controle de branding (Logo, cores primária/texto, fontes, footer).
- **`verification_configs`**: Customização da biometria (instruções, textos de segurança, backgrounds, headers).
- **`contract_configs`**: Gerenciamento dinâmico de títulos, cláusulas e templates.
- **`progress_tracker_configs`**: Visual do rastreador de etapas.
- **`reseller_welcome_configs`**: Telas de sucesso personalizadas.
- **`app_promotion_configs`**: Redirecionamentos para lojas de aplicativos.

---

## 3. Fluxo de Criação e URL Externa

### Geração de URL:
A URL pública é gerada no Admin usando o `access_token` único:
`https://[dominio]/c/{access_token}`

### Endpoints de Configuração e Segurança:
- **Proxy de Configuração**: `GET /api/config/supabase` — Resolve o conflito entre variáveis de ambiente `REACT_APP_*` e `VITE_*`, entregando apenas a chave pública (anon) necessária para o cliente React.
- **Persistência de Sessão**: O sistema utiliza `localStorage` para a sessão Supabase e `sessionStorage` para cache temporário das fotos de verificação (`verification_selfie`, `verification_document`) garantindo que o usuário não perca o progresso ao navegar entre etapas.

---

## 4. Personalização e Branding Dinâmico

O sistema suporta personalização "on-the-fly" por contrato:
- **Configuração de Header**: Suporte para Header fixo com branding específico (cor de fundo, logo e nome da empresa) que persiste durante todo o fluxo de verificação.
- **Fallback Automático (Mock Mode)**: Se o Supabase não estiver configurado ou falhar, a plataforma entra em modo offline simulado (`client/src/integrations/supabase/client.ts`), permitindo testes e uso básico sem interrupções.
- **Injeção de Estilos**: O componente `VerificationFlow` e os steps injetam dinamicamente estilos inline baseados nas configurações recuperadas.

---

## 5. Fluxo de Verificação Biométrica e Segurança

### Inteligência Artificial (IA) e Comparação Facial:
- **Motor de Comparação**: Utiliza `face-api.js` com modelos avançados carregados no navegador.
- **Métricas de Score (Ensemble)**: Avaliação multi-critério incluindo distância Euclidiana, Cosseno, landmarks faciais, análise estrutural, textura e histograma.
- **Algoritmos de Pontuação**: Implementa scores específicos de modelos como ArcFace, CosFace e SphereFace, consolidando em um `ensembleScore` para máxima precisão.
- **Qualidade de Captura**: Verificadores de qualidade integrados para garantir que as fotos sejam nítidas antes do processamento.

### Segurança e Auditoria:
- **Integridade Gov.br**: Registro de hashes SHA-256 (`govbr_token_hash`) para garantir a imutabilidade da autenticação.
- **Logs de Auditoria**: Cada interação (abertura de contrato, início de biometria, finalização) é registrada com metadados técnicos.

---

## 6. Automações e Funcionalidades de UI/UX

- **Integração Gov.br Simulado**: Componente `GovBRStep.tsx` que simula o OAuth do Governo Federal, permitindo testes de fluxo completo de assinatura digital com dados pré-carregados.
- **Feedback Visual**: Uso de `canvas-confetti` para celebração de sucesso e `framer-motion` para transições suaves entre etapas.
- **Geração de Protocolo**: Criação automática de número de protocolo único para cada tentativa de assinatura.
- **Download Inteligente**: O contrato assinado pode ser baixado em HTML que contém estilos de impressão específicos para gerar um PDF perfeito via navegador.

---

## 7. Configurações de Ambiente (Secrets)

| Variável | Descrição |
| :--- | :--- |
| `DATABASE_URL` | Conexão PostgreSQL (Drizzle). |
| `REACT_APP_SUPABASE_URL` | URL do projeto Supabase. |
| `REACT_APP_SUPABASE_ANON_KEY` | Chave pública anônima do Supabase. |
| `SESSION_SECRET` | Chave para criptografia de sessões no servidor. |

---

## 8. Guia de Instalação e Replicação

1. **Dependências**: `npm install`.
2. **Banco de Dados**:
   - Drizzle: `npm run db:push` (ou `--force` se necessário).
   - Supabase: Importar o schema SQL de `shared/supabase-tables.sql`.
3. **Execução**: `npm run dev` (Porta 5000).
4. **Vite Config**: O arquivo `vite.config.ts` está configurado com `allowedHosts: true` para garantir o funcionamento correto no ambiente de proxy do Replit.
