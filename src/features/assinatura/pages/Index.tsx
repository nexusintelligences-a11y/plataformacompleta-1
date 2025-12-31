import { ContractProvider, useContract } from '@/features/assinatura/contexts/ContractContext';
import { LandingStep } from '@/features/assinatura/components/steps/LandingStep';
import { VerificationFlow } from '@/features/assinatura/components/verification/VerificationFlow';
import { ContractStep } from '@/features/assinatura/components/steps/ContractStep';
import { SuccessStep } from '@/features/assinatura/components/steps/SuccessStep';
import { brandConfig } from '@/config/branding';

import DesktopLayout from "@/platforms/desktop/layouts/DesktopLayout";

const ContractFlow = () => {
  const { currentStep } = useContract();

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <LandingStep />;
      case 1:
        return <VerificationFlow />;
      case 2:
        return <ContractStep />;
      case 3:
        return <SuccessStep />;
      default:
        return <LandingStep />;
    }
  };

  return (
    <DesktopLayout>
      <div className="min-h-screen bg-background">
        {/* Main Content */}
        <main>{renderStep()}</main>

        {/* Footer */}
        {currentStep === 0 && (
          <footer className="py-6 px-4 border-t border-border bg-card">
            <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
              <p>{brandConfig.footerText}</p>
              <p className="mt-1">
                Assinatura digital segura com reconhecimento facial
              </p>
            </div>
          </footer>
        )}
      </div>
    </DesktopLayout>
  );
};

const Index = () => {
  return (
    <ContractProvider>
      <ContractFlow />
    </ContractProvider>
  );
};

export default Index;
