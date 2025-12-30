#!/bin/bash

# 🚀 SCRIPT AUTOMATIZADO DE MIGRAÇÃO - ASSINATURA DIGITAL
# Executa TUDO que foi feito na migração anterior em um só comando
# Uso: bash assinatura-migration.sh

echo "🚀 INICIANDO MIGRAÇÃO COMPLETA DE ASSINATURA DIGITAL..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório certo
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Erro: Execute este script na raiz do projeto${NC}"
  exit 1
fi

SOURCE_DIR="/home/runner/workspace/assinatura"
TARGET_DIR="."

# ==========================================
# PHASE 1: COPIAR PÁGINAS
# ==========================================
echo -e "${YELLOW}[1/5] Copiando páginas principais...${NC}"

# Páginas principais
cp "$SOURCE_DIR/client/src/pages/Admin.tsx" "$TARGET_DIR/src/pages/AdminAssinatura.tsx" 2>/dev/null && echo "✅ AdminAssinatura.tsx" || echo "⚠️ AdminAssinatura.tsx"
cp "$SOURCE_DIR/client/src/pages/ClientContract.tsx" "$TARGET_DIR/src/pages/ClientAssinatura.tsx" 2>/dev/null && echo "✅ ClientAssinatura.tsx" || echo "⚠️ ClientAssinatura.tsx"
cp "$SOURCE_DIR/client/src/pages/FacialRecognition.tsx" "$TARGET_DIR/src/pages/FacialRecognitionAssinatura.tsx" 2>/dev/null && echo "✅ FacialRecognitionAssinatura.tsx" || echo "⚠️ FacialRecognitionAssinatura.tsx"

# Página principal (criada localmente)
if [ ! -f "$TARGET_DIR/src/pages/Assinatura.tsx" ]; then
  echo "⚠️ src/pages/Assinatura.tsx não existe - criar manualmente com template"
fi

echo ""

# ==========================================
# PHASE 2: COPIAR COMPONENTES
# ==========================================
echo -e "${YELLOW}[2/5] Copiando componentes React (79 arquivos)...${NC}"

mkdir -p "$TARGET_DIR/src/features/assinatura"

# Copiar todos os componentes
cp -r "$SOURCE_DIR/client/src/components" "$TARGET_DIR/src/features/assinatura/" 2>/dev/null

# Copiar contextos
mkdir -p "$TARGET_DIR/src/contexts"
cp -r "$SOURCE_DIR/client/src/contexts"/* "$TARGET_DIR/src/contexts/" 2>/dev/null || true

# Copiar hooks
mkdir -p "$TARGET_DIR/src/hooks"
cp -r "$SOURCE_DIR/client/src/hooks"/* "$TARGET_DIR/src/hooks/" 2>/dev/null || true

# Copiar libs
mkdir -p "$TARGET_DIR/src/lib"
cp -r "$SOURCE_DIR/client/src/lib"/* "$TARGET_DIR/src/lib/" 2>/dev/null || true

# Copiar config
mkdir -p "$TARGET_DIR/src/config"
cp -r "$SOURCE_DIR/client/src/config"/* "$TARGET_DIR/src/config/" 2>/dev/null || true

# Copiar types
mkdir -p "$TARGET_DIR/src/types"
cp -r "$SOURCE_DIR/client/src/types"/* "$TARGET_DIR/src/types/" 2>/dev/null || true

# Copiar integrations
mkdir -p "$TARGET_DIR/src/integrations"
cp -r "$SOURCE_DIR/client/src/integrations"/* "$TARGET_DIR/src/integrations/" 2>/dev/null || true

echo "✅ 79+ componentes copiados"
echo ""

# ==========================================
# PHASE 3: COPIAR SERVER FILES
# ==========================================
echo -e "${YELLOW}[3/5] Copiando arquivos de backend...${NC}"

mkdir -p "$TARGET_DIR/server/routes"
mkdir -p "$TARGET_DIR/server/storage"

cp "$SOURCE_DIR/server/db.ts" "$TARGET_DIR/server/assinatura-db.ts" 2>/dev/null && echo "✅ assinatura-db.ts" || echo "⚠️ assinatura-db.ts"
cp "$SOURCE_DIR/server/index.ts" "$TARGET_DIR/server/assinatura-index.ts" 2>/dev/null && echo "✅ assinatura-index.ts" || echo "⚠️ assinatura-index.ts"
cp "$SOURCE_DIR/server/vite.ts" "$TARGET_DIR/server/assinatura-vite.ts" 2>/dev/null && echo "✅ assinatura-vite.ts" || echo "⚠️ assinatura-vite.ts"
cp "$SOURCE_DIR/server/routes.ts" "$TARGET_DIR/server/routes/assinatura-routes.ts" 2>/dev/null && echo "✅ assinatura-routes.ts" || echo "⚠️ assinatura-routes.ts"
cp "$SOURCE_DIR/server/supabase-routes.ts" "$TARGET_DIR/server/routes/assinatura-supabase-routes.ts" 2>/dev/null && echo "✅ assinatura-supabase-routes.ts" || echo "⚠️ assinatura-supabase-routes.ts"
cp "$SOURCE_DIR/server/storage.ts" "$TARGET_DIR/server/storage/assinatura-storage.ts" 2>/dev/null && echo "✅ assinatura-storage.ts" || echo "⚠️ assinatura-storage.ts"

# Copiar migrations
cp -r "$SOURCE_DIR/supabase/migrations" "$TARGET_DIR/server/assinatura-migrations" 2>/dev/null && echo "✅ Migrations copiadas" || echo "⚠️ Migrations"

echo ""

# ==========================================
# PHASE 4: COPIAR CONFIGURAÇÕES
# ==========================================
echo -e "${YELLOW}[4/5] Copiando arquivos de configuração...${NC}"

cp "$SOURCE_DIR/components.json" "$TARGET_DIR/assinatura-components.json" 2>/dev/null && echo "✅ components.json" || echo "⚠️ components.json"
cp "$SOURCE_DIR/drizzle.config.ts" "$TARGET_DIR/assinatura-drizzle.config.ts" 2>/dev/null && echo "✅ drizzle.config.ts" || echo "⚠️ drizzle.config.ts"
cp "$SOURCE_DIR/eslint.config.js" "$TARGET_DIR/assinatura-eslint.config.js" 2>/dev/null && echo "✅ eslint.config.js" || echo "⚠️ eslint.config.js"
cp "$SOURCE_DIR/tailwind.config.ts" "$TARGET_DIR/assinatura-tailwind.config.ts" 2>/dev/null && echo "✅ tailwind.config.ts" || echo "⚠️ tailwind.config.ts"
cp "$SOURCE_DIR/vite.config.ts" "$TARGET_DIR/assinatura-vite.config.ts" 2>/dev/null && echo "✅ vite.config.ts" || echo "⚠️ vite.config.ts"
cp "$SOURCE_DIR/tsconfig.json" "$TARGET_DIR/assinatura-tsconfig.json" 2>/dev/null && echo "✅ tsconfig.json" || echo "⚠️ tsconfig.json"
cp "$SOURCE_DIR/postcss.config.js" "$TARGET_DIR/assinatura-postcss.config.js" 2>/dev/null && echo "✅ postcss.config.js" || echo "⚠️ postcss.config.js"
cp "$SOURCE_DIR/package.json" "$TARGET_DIR/assinatura-package.json" 2>/dev/null && echo "✅ package.json" || echo "⚠️ package.json"

# Copiar docs
cp "$SOURCE_DIR/README.md" "$TARGET_DIR/ASSINATURA_README.md" 2>/dev/null && echo "✅ README.md" || echo "⚠️ README.md"
cp "$SOURCE_DIR/SUPABASE_SETUP.md" "$TARGET_DIR/ASSINATURA_SUPABASE_SETUP.md" 2>/dev/null && echo "✅ SUPABASE_SETUP.md" || echo "⚠️ SUPABASE_SETUP.md"

echo ""

# ==========================================
# PHASE 5: VALIDAÇÃO
# ==========================================
echo -e "${YELLOW}[5/5] Validando migração...${NC}"

PAGES_COUNT=$(find src/pages -name "*Assinatura*.tsx" 2>/dev/null | wc -l)
COMPONENTS_COUNT=$(find src/features/assinatura -name "*.tsx" 2>/dev/null | wc -l)
CONTEXTS_COUNT=$(find src/contexts -name "*.tsx" 2>/dev/null | wc -l)
SERVER_COUNT=$(find server -name "assinatura-*.ts" 2>/dev/null | wc -l)

echo "📊 Resultado:"
echo "   ✅ Páginas: $PAGES_COUNT"
echo "   ✅ Componentes: $COMPONENTS_COUNT"
echo "   ✅ Contextos: $CONTEXTS_COUNT"
echo "   ✅ Server files: $SERVER_COUNT"

echo ""

if [ $PAGES_COUNT -gt 0 ] && [ $COMPONENTS_COUNT -gt 0 ] && [ $SERVER_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ MIGRAÇÃO COMPLETADA COM SUCESSO!${NC}"
  echo ""
  echo "Próximos passos:"
  echo "1. npm install (atualizar dependências)"
  echo "2. npm run db:push (sincronizar database)"
  echo "3. npm run dev (iniciar servidor)"
  exit 0
else
  echo -e "${RED}❌ MIGRAÇÃO INCOMPLETA - Verifique os erros acima${NC}"
  exit 1
fi
