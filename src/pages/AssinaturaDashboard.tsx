/**
 * Assinatura Digital Platform Page
 * 100% Export from /assinatura folder
 * Includes Admin page with full contract management
 */

import { lazy, Suspense } from 'react';

// Lazy load the complete Assinatura app from features
const AssinatureApp = lazy(() => import('@/features/assinatura/pages/Admin') as any);

export default function AssinaturaDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando Assinatura Digital...</div>}>
      <AssinatureApp />
    </Suspense>
  );
}
