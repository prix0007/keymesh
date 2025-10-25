"use client";

import { useEffect, useState } from "react";
import { SetupData } from "@/app/setup/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ClientAvailService } from "@/lib/services/clientAvailService";
import { CryptoService } from "@/lib/services/cryptoService";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

interface ProcessingStepProps {
  data: SetupData;
  walletAddress: string;
  onNext: () => void;
  onError: () => void;
  updateSetupData: (data: Partial<SetupData>) => void;
}

interface ProcessingStage {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
}

export default function ProcessingStep({ data, walletAddress, onNext, onError, updateSetupData }: ProcessingStepProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [encryptedPieces, setEncryptedPieces] = useState<{
    piece1: Uint8Array;
    piece2: Uint8Array;
    piece3: Uint8Array;
  } | null>(null);
  const [preparationComplete, setPreparationComplete] = useState(false);
  const [userConfirmed, setUserConfirmed] = useState(false);

  const [stages, setStages] = useState<ProcessingStage[]>([
    {
      id: "generate-keys",
      title: "Generating Key Shares",
      description: "Splitting your private key using Shamir Secret Sharing",
      icon: KeyIcon,
      status: "pending",
      progress: 0,
    },
    {
      id: "encrypt-pieces",
      title: "Encrypting Key Pieces",
      description: "Encrypting pieces with your password and biometric data",
      icon: ShieldCheckIcon,
      status: "pending",
      progress: 0,
    },
    {
      id: "setup-guardians",
      title: "Preparing Guardian Network",
      description: "Configuring guardian verification system",
      icon: UsersIcon,
      status: "pending",
      progress: 0,
    },
    {
      id: "store-avail",
      title: "Store on Avail DA",
      description: "Ready to upload encrypted pieces to decentralized storage",
      icon: CloudArrowUpIcon,
      status: "pending",
      progress: 0,
    },
  ]);

  // Phase 1: Preparation - Generate and encrypt pieces but don't submit
  useEffect(() => {
    if (preparationComplete || userConfirmed) return;

    const prepareCrypto = async () => {
      try {
        // Stage 1: Generate key shares using actual crypto
        setCurrentStageIndex(0);
        updateStageStatus(0, "processing", 0);

        // Generate a mock private key and split it
        const privateKey = await CryptoService.generatePrivateKey();
        const { pieces } = await CryptoService.splitKey(privateKey, 2, 3);
        // setKeyPieces(pieces); // pieces are used locally in this function

        updateStageStatus(0, "completed", 100);
        setOverallProgress(25);

        // Stage 2: Encrypt pieces with password, biometric, and guardian data
        setCurrentStageIndex(1);
        updateStageStatus(1, "processing", 0);

        // Encrypt piece 1 with password
        const piece1Encrypted = await CryptoService.encryptWithPassword(pieces[0].data, data.password);

        // Encrypt piece 2 with biometric or password fallback
        let piece2Encrypted: Uint8Array;
        if (data.biometricData) {
          piece2Encrypted = await CryptoService.encryptWithBiometric(pieces[1].data, data.biometricData);
        } else {
          piece2Encrypted = await CryptoService.encryptWithPassword(pieces[1].data, data.password + "_bio");
        }

        // Encrypt piece 3 with guardian info
        const guardiansString = JSON.stringify(data.guardians);
        const piece3Encrypted = await CryptoService.encryptWithPassword(pieces[2].data, guardiansString);

        setEncryptedPieces({ piece1: piece1Encrypted, piece2: piece2Encrypted, piece3: piece3Encrypted });

        updateStageStatus(1, "completed", 100);
        setOverallProgress(50);

        // Stage 3: Setup guardian network
        setCurrentStageIndex(2);
        updateStageStatus(2, "processing", 0);

        // Extract guardian addresses (use mock addresses for now)
        // Extract guardian addresses (use mock addresses for now)
        // const guardianAddresses = data.guardians.map((_, index) => `0x${"0".repeat(39)}${(index + 1).toString()}`);

        updateStageStatus(2, "completed", 100);
        setOverallProgress(75);

        // Stage 4: Ready to store (but don't submit yet)
        setCurrentStageIndex(3);
        updateStageStatus(3, "pending", 0);
        setOverallProgress(75);

        // Preparation complete - show confirmation
        setPreparationComplete(true);
      } catch (err: any) {
        console.error("Preparation error:", err);
        setError(err.message || "An error occurred during preparation");
        updateStageStatus(currentStageIndex, "error", 0);
      }
    };

    prepareCrypto();
  }, [isRetrying, currentStageIndex, data.biometricData, data.guardians, data.password, preparationComplete, userConfirmed]);

  // Phase 2: Submission - Actually submit to Avail DA after user confirmation
  useEffect(() => {
    if (!userConfirmed || !encryptedPieces) return;

    const submitToStorage = async () => {
      try {
        const availService = new ClientAvailService();

        // Stage 4: Store encrypted pieces on Avail DA
        setCurrentStageIndex(3);
        updateStageStatus(3, "processing", 0);

        const commitments = [];

        // Submit piece 1
        const piece1Result = await availService.submitPiece(encryptedPieces.piece1, walletAddress);
        if (!piece1Result.success) throw new Error("Failed to store piece 1 on Avail");
        commitments.push(piece1Result);

        updateStageStatus(3, "processing", 33);

        // Submit piece 2
        const piece2Result = await availService.submitPiece(encryptedPieces.piece2, walletAddress);
        if (!piece2Result.success) throw new Error("Failed to store piece 2 on Avail");
        commitments.push(piece2Result);

        updateStageStatus(3, "processing", 66);

        // Submit piece 3
        const piece3Result = await availService.submitPiece(encryptedPieces.piece3, walletAddress);
        if (!piece3Result.success) throw new Error("Failed to store piece 3 on Avail");
        commitments.push(piece3Result);

        // setAvailCommitments(commitments); // commitments are used locally in this function
        updateStageStatus(3, "completed", 100);
        setOverallProgress(100);

        // Store recovery data for SuccessStep
        const blockReferences = commitments.map(c => c.blockNumber || 0);
        // Extract guardian addresses (use mock addresses for now)
        // const guardianAddresses = data.guardians.map((_, index) => `0x${"0".repeat(39)}${(index + 1).toString()}`);

        updateSetupData({
          recoveryData: {
            blockReferences,
            guardianAddresses: data.guardians.map((_, index) => `0x${'0'.repeat(39)}${(index + 1).toString()}`),
          },
        });

        // All stages completed - proceed to next step
        await delay(1000);
        onNext();
      } catch (err: any) {
        console.error("Submission error:", err);
        setError(err.message || "An error occurred during data submission");
        updateStageStatus(3, "error", 0);
      }
    };

    submitToStorage();
  }, [userConfirmed, encryptedPieces, data.guardians, onNext, updateSetupData, walletAddress]);

  const updateStageStatus = (index: number, status: ProcessingStage["status"], progress: number) => {
    setStages(prev => prev.map((stage, i) => (i === index ? { ...stage, status, progress } : stage)));
  };

  // Commented out unused function
  // const simulateStageProgress = async (stageIndex: number) => {
  //   const stage = stages[stageIndex];
  //
  //   // Simulate different processing times for each stage
  //   const stageDurations = {
  //     "generate-keys": 3000,
  //     "encrypt-pieces": 2500,
  //     "setup-guardians": 2000,
  //     "store-avail": 4000,
  //   };
  //
  //   const duration = stageDurations[stage.id as keyof typeof stageDurations] || 3000;
  //   const steps = 20;
  //   const stepDuration = duration / steps;
  //
  //   for (let step = 0; step <= steps; step++) {
  //     const progress = (step / steps) * 100;
  //     updateStageStatus(stageIndex, "processing", progress);
  //
  //     // Add some randomness to make it feel more realistic
  //     await delay(stepDuration + Math.random() * 200);
  //
  //     // Simulate potential error (very low chance)
  //     if (Math.random() < 0.01 && step > 5) {
  //       throw new Error(`Failed during ${stage.title.toLowerCase()}`);
  //     }
  //   }
  // };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleRetry = () => {
    setError(null);
    setIsRetrying(!isRetrying);
    setCurrentStageIndex(0);
    setOverallProgress(0);
    setPreparationComplete(false);
    setUserConfirmed(false);
    setEncryptedPieces(null);
    setStages(prev => prev.map(stage => ({ ...stage, status: "pending", progress: 0 })));
  };

  const handleGoBack = () => {
    onError();
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Setting Up Your Recovery</CardTitle>
        <CardDescription>
          Please wait while we securely process your recovery configuration. This may take a few minutes.
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
            const isCompleted = stage.status === "completed";
            const isError = stage.status === "error";
            const isPending = stage.status === "pending";

            return (
              <Card
                key={stage.id}
                className={`border-2 transition-all ${
                  isActive
                    ? "border-blue-300 bg-blue-50"
                    : isCompleted
                      ? "border-green-300 bg-green-50"
                      : isError
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-gray-50"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-2 rounded-full ${
                        isCompleted ? "bg-green-100" : isError ? "bg-red-100" : isActive ? "bg-blue-100" : "bg-gray-100"
                      }`}
                    >
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
                      <h3
                        className={`font-medium ${
                          isCompleted
                            ? "text-green-800"
                            : isError
                              ? "text-red-800"
                              : isActive
                                ? "text-blue-800"
                                : "text-gray-600"
                        }`}
                      >
                        {stage.title}
                      </h3>
                      <p
                        className={`text-sm ${
                          isCompleted
                            ? "text-green-600"
                            : isError
                              ? "text-red-600"
                              : isActive
                                ? "text-blue-600"
                                : "text-gray-500"
                        }`}
                      >
                        {stage.description}
                      </p>

                      {isActive && stage.progress > 0 && (
                        <div className="mt-2">
                          <Progress value={stage.progress} className="h-1" />
                        </div>
                      )}
                    </div>

                    <div className="text-sm font-medium">
                      {isCompleted && "✓"}
                      {isError && "✗"}
                      {isActive && `${Math.round(stage.progress)}%`}
                      {isPending && "⏳"}
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

        {/* Confirmation Step */}
        {preparationComplete && !userConfirmed && !error && (
          <Card className="border-2 border-green-300 bg-green-50">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-green-800 text-lg mb-2">Ready to Finalize Setup</h3>
                  <p className="text-sm text-green-700 mb-4">
                    Your key pieces have been generated and encrypted. Click below to permanently store them on Avail DA
                    and complete your recovery setup.
                  </p>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-green-800">
                      ⚠️ <strong>Final Step:</strong> Once confirmed, your encrypted key pieces will be permanently
                      stored on the blockchain. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreparationComplete(false);
                      setEncryptedPieces(null);
                      setOverallProgress(0);
                      setCurrentStageIndex(0);
                      setStages(prev => prev.map(stage => ({ ...stage, status: "pending", progress: 0 })));
                    }}
                  >
                    Cancel & Start Over
                  </Button>
                  <Button onClick={() => setUserConfirmed(true)} className="bg-green-600 hover:bg-green-700">
                    Confirm & Store Key Pieces
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Notes */}
        {!error && !preparationComplete && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">🔒 What&apos;s Happening</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your private key is being split into 3 encrypted pieces</li>
              <li>• Each piece is encrypted with different authentication factors</li>
              <li>• Pieces will be ready for storage on Avail DA</li>
              <li>• Guardian network is being configured for recovery</li>
              <li>• No single party can access your wallet without authorization</li>
            </ul>
          </div>
        )}

        {/* Post-confirmation Security Notes */}
        {userConfirmed && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">🔒 Storing Your Recovery Data</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Uploading encrypted pieces to Avail DA network</li>
              <li>• Creating permanent, tamper-proof storage</li>
              <li>• Recording commitments for future recovery</li>
              <li>• Finalizing your wallet recovery configuration</li>
            </ul>
          </div>
        )}

        {/* Processing Note */}
        {!error && overallProgress < 100 && (
          <div className="text-center text-sm text-gray-600">
            <p>Please don&apos;t close this page while setup is in progress.</p>
            <p>This process ensures maximum security for your wallet recovery.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
