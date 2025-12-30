import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Importar a página Admin completa
const AdminAssinatura = lazy(() => import('./AdminAssinatura'));

export default function AdminAssinaturaDashboard() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-full" />}>
      <AdminAssinatura />
    </Suspense>
  );
}
