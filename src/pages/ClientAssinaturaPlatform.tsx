import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Importar a página Client completa
const ClientAssinatura = lazy(() => import('./ClientAssinatura'));

export default function ClientAssinaturaPlatform() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-full" />}>
      <ClientAssinatura />
    </Suspense>
  );
}
