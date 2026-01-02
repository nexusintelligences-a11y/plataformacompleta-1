# Relatório Técnico: Conflito de Schemas e Falha na Criação de Contratos

## 1. Descrição do Problema Atual
O projeto possui dois arquivos de schema concorrentes que estão causando falhas críticas no banco de dados e na aplicação:
1. `shared/db-schema.ts`: Schema original do projeto (gigante, +2000 linhas) contendo toda a infraestrutura de formulários, multi-tenant, BI, leads, etc.
2. `assinatura/shared/schema.ts`: Schema novo da plataforma de assinatura digital.

**O Erro Fatal:** O Drizzle ORM (via `drizzle.config.ts`) está configurado para olhar apenas para um arquivo. Ao tentar unificar, houve perda de exportações vitais (como `supabaseConfig`, `complianceAuditLog`), quebrando o servidor backend que depende dessas tabelas para inicializar.

## 2. Erros de Execução Registrados
- `Error: relation "contracts" does not exist`: A tabela de contratos não foi criada no banco de dados principal.
- `SyntaxError: The requested module '../../../shared/db-schema.js' does not provide an export named 'supabaseConfig'`: O servidor falha ao iniciar porque faltam definições no arquivo unificado.
- `ReferenceError: integer is not defined`: Erro de sintaxe no Drizzle ao tentar usar tipos não importados corretamente.

## 3. Requisitos para a Solução (Claude)

### A. Unificação do Arquivo de Schema
Você deve mesclar o conteúdo de `assinatura/shared/schema.ts` dentro de `shared/db-schema.ts` seguindo estas regras:
1.  **NÃO REMOVER NADA:** Todas as tabelas, índices e tipos originais de `shared/db-schema.ts` devem ser preservados integralmente.
2.  **INTEGRAÇÃO DA ASSINATURA:** Adicionar as tabelas `users` (assinatura), `contracts`, `signature_logs` e `audit_trail` (assinatura). 
    - *Atenção:* Se já existir uma tabela `users` no schema original, renomeie a nova para `signature_users` ou integre os campos.
3.  **CORREÇÃO DE TIPOS:** Garantir que todos os helpers do Drizzle (`integer`, `numeric`, `serial`, etc.) estejam no `import` inicial.
4.  **ZOD SCHEMAS:** Incluir os validadores `insertContractSchema` com os helpers `optionalUrlOrEmpty` e `optionalColorOrEmpty` que permitem strings vazias.

### B. Ajuste de IDs e Chaves Primárias
- Manter a consistência dos tipos de ID (não trocar `serial` por `uuid` ou vice-versa em tabelas existentes) para não quebrar dados atuais.

### C. Mapeamento de Dados (Backend Storage)
- O backend (`server/storage/assinatura-storage.ts`) e as rotas devem apontar para o novo arquivo unificado.
- Garantir que o método `createContract` no storage receba os dados "achatados" (flattened) vindos do frontend.

## 4. Estrutura de Arquivos Alvo
- **Arquivo Único de Verdade:** `shared/db-schema.ts`
- **Configuração Drizzle:** `drizzle.config.ts` apontando para `./shared/db-schema.ts`
- **Import no Backend:** `import * as schema from "../shared/db-schema";`

## 5. Próximos Passos (Após a correção do Claude)
1. Substituir o conteúdo de `shared/db-schema.ts` pelo código gerado.
2. Executar `npm run db:push --force` para sincronizar.
3. Reiniciar o servidor.
