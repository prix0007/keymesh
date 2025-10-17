"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  KeyIcon,
  ShieldCheckIcon,
  UsersIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { useAccount } from "wagmi";
import { RainbowKitConnectButton } from "@rainbow-me/rainbowkit";

// Import step components
import PasswordStep from "@/components/setup/PasswordStep";
import BiometricStep from "@/components/setup/BiometricStep";
import GuardiansStep from "@/components/setup/GuardiansStep";
import ReviewStep from "@/components/setup/ReviewStep";
import ProcessingStep from "@/components/setup/ProcessingStep";
import SuccessStep from "@/components/setup/SuccessStep";

export interface SetupData {
  password: string;
  confirmPassword: string;
  biometricData?: Uint8Array;
  biometricType?: string;
  guardians: Array<{
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  }>;
}

const STEPS = [
  { id: 'connect', title: 'Connect Wallet', icon: KeyIcon },
  { id: 'password', title: 'Create Password', icon: KeyIcon },
  { id: 'biometric', title: 'Set Biometric', icon: ShieldCheckIcon },
  { id: 'guardians', title: 'Choose Guardians', icon: UsersIcon },
  { id: 'review', title: 'Review & Confirm', icon: CheckCircleIcon },
  { id: 'processing', title: 'Processing', icon: CheckCircleIcon },
  { id: 'success', title: 'Complete', icon: CheckCircleIcon }
];

export default function SetupWizard() {
  const { address, isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState<SetupData>({
    password: '',
    confirmPassword: '',
    guardians: []
  });

  const updateSetupData = (data: Partial<SetupData>) => {
    setSetupData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // If not connected, show connect step
  if (!isConnected || currentStep === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            {/* Progress Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup Wallet Recovery</h1>
              <p className="text-gray-600">Connect your wallet to get started</p>
            </div>

            <Progress value={progress} className="mb-8" />

            {/* Connect Wallet Step */}
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center">
                  <KeyIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle>Connect Your Wallet</CardTitle>
                <CardDescription>
                  Connect your Ethereum wallet to start protecting it with Keymesh social recovery.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <RainbowKitConnectButton />
                {isConnected && (
                  <div className="mt-4">
                    <Button onClick={() => setCurrentStep(1)} className="w-full">
                      Continue to Setup
                      <ChevronRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup Wallet Recovery</h1>
            <p className="text-gray-600">Step {currentStep} of {STEPS.length - 1}</p>
          </div>

          <Progress value={progress} className="mb-8" />

          {/* Step Indicators */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-2 overflow-x-auto">
              {STEPS.slice(1).map((step, index) => {
                const stepIndex = index + 1;
                const isActive = stepIndex === currentStep;
                const isCompleted = stepIndex < currentStep;
                const Icon = step.icon;

                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center min-w-0 flex-1 ${
                      isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        isActive
                          ? 'border-indigo-600 bg-indigo-50'
                          : isCompleted
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className="text-xs mt-2 text-center">{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {currentStep === 1 && (
              <PasswordStep
                data={setupData}
                updateData={updateSetupData}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {currentStep === 2 && (
              <BiometricStep
                data={setupData}
                updateData={updateSetupData}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {currentStep === 3 && (
              <GuardiansStep
                data={setupData}
                updateData={updateSetupData}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {currentStep === 4 && (
              <ReviewStep
                data={setupData}
                walletAddress={address!}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {currentStep === 5 && (
              <ProcessingStep
                data={setupData}
                walletAddress={address!}
                onNext={nextStep}
                onError={() => setCurrentStep(4)} // Go back to review on error
              />
            )}
            {currentStep === 6 && (
              <SuccessStep
                walletAddress={address!}
              />
            )}
          </div>

          {/* Navigation Buttons */}
          {currentStep > 1 && currentStep < 5 && (
            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeftIcon className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <div className="text-sm text-gray-500 flex items-center">
                Step {currentStep} of {STEPS.length - 1}
              </div>
              <div className="w-24" /> {/* Spacer for alignment */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}