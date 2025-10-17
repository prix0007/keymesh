"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  KeyIcon,
  ShieldIcon,
  CloudArrowUpIcon,
  UsersIcon
} from "@heroicons/react/24/outline";
import { SetupData } from "@/app/setup/page";

interface ProcessingStepProps {
  data: SetupData;
  walletAddress: string;
  onNext: () => void;
  onError: () => void;
}

interface ProcessingStage {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
}

export default function ProcessingStep({ data, walletAddress, onNext, onError }: ProcessingStepProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const [stages, setStages] = useState<ProcessingStage[]>([
    {
      id: 'generate-keys',
      title: 'Generating Key Shares',
      description: 'Splitting your private key using Shamir Secret Sharing',
      icon: KeyIcon,
      status: 'pending',
      progress: 0
    },
    {
      id: 'encrypt-pieces',
      title: 'Encrypting Key Pieces',
      description: 'Encrypting pieces with your password and biometric data',
      icon: ShieldIcon,
      status: 'pending',
      progress: 0
    },
    {
      id: 'setup-guardians',
      title: 'Setting Up Guardian Network',
      description: 'Preparing guardian verification system',
      icon: UsersIcon,
      status: 'pending',
      progress: 0
    },
    {
      id: 'store-avail',
      title: 'Storing on Avail DA',
      description: 'Uploading encrypted pieces to decentralized storage',
      icon: CloudArrowUpIcon,
      status: 'pending',
      progress: 0
    }
  ]);

  // Simulate the processing stages
  useEffect(() => {
    const processStages = async () => {
      try {
        for (let i = 0; i < stages.length; i++) {
          // Set current stage to processing
          setCurrentStageIndex(i);
          updateStageStatus(i, 'processing', 0);

          // Simulate progress for current stage
          await simulateStageProgress(i);

          // Mark stage as completed
          updateStageStatus(i, 'completed', 100);

          // Update overall progress
          setOverallProgress(((i + 1) / stages.length) * 100);

          // Small delay between stages
          await delay(500);
        }

        // All stages completed
        await delay(1000);
        onNext();
      } catch (err: any) {
        console.error('Processing error:', err);
        setError(err.message || 'An error occurred during setup');
        updateStageStatus(currentStageIndex, 'error', 0);
      }
    };

    processStages();
  }, [isRetrying]);

  const updateStageStatus = (index: number, status: ProcessingStage['status'], progress: number) => {
    setStages(prev => prev.map((stage, i) =>
      i === index ? { ...stage, status, progress } : stage
    ));
  };

  const simulateStageProgress = async (stageIndex: number) => {
    const stage = stages[stageIndex];

    // Simulate different processing times for each stage
    const stageDurations = {
      'generate-keys': 3000,
      'encrypt-pieces': 2500,
      'setup-guardians': 2000,
      'store-avail': 4000
    };

    const duration = stageDurations[stage.id as keyof typeof stageDurations] || 3000;
    const steps = 20;
    const stepDuration = duration / steps;

    for (let step = 0; step <= steps; step++) {
      const progress = (step / steps) * 100;
      updateStageStatus(stageIndex, 'processing', progress);

      // Add some randomness to make it feel more realistic
      await delay(stepDuration + Math.random() * 200);

      // Simulate potential error (very low chance)
      if (Math.random() < 0.01 && step > 5) {
        throw new Error(`Failed during ${stage.title.toLowerCase()}`);
      }
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleRetry = () => {
    setError(null);
    setIsRetrying(!isRetrying);
    setCurrentStageIndex(0);
    setOverallProgress(0);
    setStages(prev => prev.map(stage => ({ ...stage, status: 'pending', progress: 0 })));
  };

  const handleGoBack = () => {
    onError();
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Setting Up Your Recovery</CardTitle>
        <CardDescription>
          Please wait while we securely process your recovery configuration.
          This may take a few minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Processing Stages */}
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === currentStageIndex;
            const isCompleted = stage.status === 'completed';
            const isError = stage.status === 'error';
            const isPending = stage.status === 'pending';

            return (
              <Card
                key={stage.id}
                className={`border-2 transition-all ${
                  isActive ? 'border-blue-300 bg-blue-50' :
                  isCompleted ? 'border-green-300 bg-green-50' :
                  isError ? 'border-red-300 bg-red-50' :
                  'border-gray-200 bg-gray-50'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      isCompleted ? 'bg-green-100' :
                      isError ? 'bg-red-100' :
                      isActive ? 'bg-blue-100' :
                      'bg-gray-100'
                    }`}>
                      {isCompleted ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      ) : isError ? (
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                      ) : isActive ? (
                        <ArrowPathIcon className="h-6 w-6 text-blue-600 animate-spin" />
                      ) : (
                        <Icon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        isCompleted ? 'text-green-800' :
                        isError ? 'text-red-800' :
                        isActive ? 'text-blue-800' :
                        'text-gray-600'
                      }`}>
                        {stage.title}
                      </h3>
                      <p className={`text-sm ${
                        isCompleted ? 'text-green-600' :
                        isError ? 'text-red-600' :
                        isActive ? 'text-blue-600' :
                        'text-gray-500'
                      }`}>
                        {stage.description}
                      </p>

                      {isActive && stage.progress > 0 && (
                        <div className="mt-2">
                          <Progress value={stage.progress} className="h-1" />
                        </div>
                      )}
                    </div>

                    <div className="text-sm font-medium">
                      {isCompleted && '✓'}
                      {isError && '✗'}
                      {isActive && `${Math.round(stage.progress)}%`}
                      {isPending && '⏳'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Error Handling */}
        {error && (
          <Card className="border-2 border-red-300 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-800 mb-1">Setup Failed</h3>
                  <p className="text-sm text-red-700 mb-3">{error}</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handleRetry}>
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGoBack}>
                      Go Back
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Notes */}
        {!error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">🔒 What's Happening</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your private key is being split into 3 encrypted pieces</li>
              <li>• Each piece is encrypted with different authentication factors</li>
              <li>• Pieces are being stored permanently on Avail DA</li>
              <li>• Guardian network is being configured for recovery</li>
              <li>• No single party can access your wallet without authorization</li>
            </ul>
          </div>
        )}

        {/* Processing Note */}
        {!error && overallProgress < 100 && (
          <div className="text-center text-sm text-gray-600">
            <p>Please don't close this page while setup is in progress.</p>
            <p>This process ensures maximum security for your wallet recovery.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}