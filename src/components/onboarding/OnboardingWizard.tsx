"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Step1Org } from "./Step1Org";
import { Step2Vehicle } from "./Step2Vehicle";
import { Step3Customer } from "./Step3Customer";
import { Step4Contract } from "./Step4Contract";
import { Step5Done } from "./Step5Done";
import { ProgressBar } from "./ProgressBar";

export type OrgInit = {
  id: string;
  name: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  tax_number: string;
  processing_fee: number;
};

export type VehicleLite = {
  id: string;
  plate: string;
  manufacturer: string | null;
  model: string | null;
};

export type CustomerLite = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export const STEP_TITLES = [
  "Unternehmen",
  "Fahrzeug",
  "Kunde",
  "Vertrag",
  "Fertig",
];

export const OnboardingWizard = ({
  initialStep,
  org,
  vehicles,
  customers,
  contractCount,
}: {
  initialStep: number;
  org: OrgInit;
  vehicles: VehicleLite[];
  customers: CustomerLite[];
  contractCount: number;
}) => {
  const router = useRouter();
  const [step, setStep] = useState<number>(Math.min(Math.max(initialStep, 1), 5));
  const [vehiclesState, setVehiclesState] = useState<VehicleLite[]>(vehicles);
  const [customersState, setCustomersState] = useState<CustomerLite[]>(customers);
  const [contractsCreated, setContractsCreated] = useState<number>(contractCount);

  const persistStep = useCallback(async (next: number) => {
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: next }),
      });
    } catch {
      // Soft-fail: local state still advances; user can retry on next action.
    }
  }, []);

  const goNext = useCallback(async () => {
    const next = Math.min(step + 1, 5);
    setStep(next);
    if (next !== step) await persistStep(next);
  }, [step, persistStep]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1));
  }, []);

  const finish = useCallback(async () => {
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
    } catch {
      // continue anyway — user has explicitly clicked done
    }
    router.replace("/dashboard");
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <ProgressBar
        current={step}
        total={5}
        labels={STEP_TITLES}
      />

      <main className="flex-1 flex items-start justify-center px-6 py-10 sm:py-16">
        <div className="w-full max-w-2xl">
          {step === 1 && (
            <Step1Org
              org={org}
              onDone={goNext}
              onSkip={goNext}
            />
          )}
          {step === 2 && (
            <Step2Vehicle
              onDone={(v) => {
                setVehiclesState((prev) => [v, ...prev.filter((x) => x.id !== v.id)]);
                void goNext();
              }}
              onSkip={goNext}
              onBack={goBack}
            />
          )}
          {step === 3 && (
            <Step3Customer
              onDone={(c) => {
                setCustomersState((prev) => [c, ...prev.filter((x) => x.id !== c.id)]);
                void goNext();
              }}
              onSkip={goNext}
              onBack={goBack}
            />
          )}
          {step === 4 && (
            <Step4Contract
              vehicles={vehiclesState}
              customers={customersState}
              onDone={() => {
                setContractsCreated((n) => n + 1);
                void goNext();
              }}
              onSkip={goNext}
              onBack={goBack}
            />
          )}
          {step === 5 && (
            <Step5Done
              vehicleCount={vehiclesState.length}
              customerCount={customersState.length}
              contractCount={contractsCreated}
              onFinish={finish}
            />
          )}
        </div>
      </main>
    </div>
  );
};
