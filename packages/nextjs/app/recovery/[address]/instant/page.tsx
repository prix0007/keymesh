"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  FaceSmileIcon,
  FingerPrintIcon,
  KeyIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface RecoveryStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  icon: React.ComponentType<any>;
}

export default function InstantRecovery() {
  const params = useParams();
  const router = useRouter();
  const walletAddress = params.address as string;

  const [currentStep, setCurrentStep] = useState(0);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricType] = useState<"face" | "fingerprint">("face");

  const [steps, setSteps] = useState<RecoveryStep[]>([
    {
      id: "password",
      title: "Enter Password",
      description: "Decrypt key piece A with your master password",
      status: "in_progress",
      icon: KeyIcon,
    },
    {
      id: "biometric",
      title: "Verify Biometric",
      description: "Decrypt key piece B with your biometric",
      status: "pending",
      icon: biometricType === "face" ? FaceSmileIcon : FingerPrintIcon,
    },
    {
      id: "reconstruct",
      title: "Reconstruct Key",
      description: "Combine pieces to restore your private key",
      status: "pending",
      icon: ShieldCheckIcon,
    },
  ]);

  const updateStepStatus = (stepIndex: number, status: RecoveryStep["status"]) => {
    setSteps(prev => prev.map((step, index) => (index === stepIndex ? { ...step, status } : step)));
  };

  const handlePasswordVerify = async () => {
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Simulate password verification and decryption
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In real implementation:
      // 1. Hash the password
      // 2. Fetch encrypted piece A from Avail DA
      // 3. Attempt to decrypt piece A
      // 4. If successful, mark step complete and move to biometric

      // Simulate random failure for demo
      if (Math.random() < 0.2) {
        throw new Error("Incorrect password. Please try again.");
      }

      updateStepStatus(0, "completed");
      setCurrentStep(1);
      updateStepStatus(1, "in_progress");
    } catch (err: any) {
      setError(err.message);
      updateStepStatus(0, "failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBiometricVerify = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Check if WebAuthn is available
      if (!window.PublicKeyCredential) {
        throw new Error("Biometric authentication not supported in this browser");
      }

      // Create authentication options
      const authenticationOptions: PublicKeyCredentialRequestOptions = {
        challenge: new Uint8Array(32).map(() => Math.floor(Math.random() * 256)),
        allowCredentials: [],
        timeout: 60000,
        userVerification: "required",
      };

      // Request biometric authentication
      const credential = (await navigator.credentials.get({
        publicKey: authenticationOptions,
      })) as PublicKeyCredential;

      if (credential) {
        // Simulate decryption process
        await new Promise(resolve => setTimeout(resolve, 1000));

        updateStepStatus(1, "completed");
        setCurrentStep(2);
        updateStepStatus(2, "in_progress");

        // Start reconstruction
        await handleReconstruction();
      } else {
        throw new Error("Biometric verification failed");
      }
    } catch (err: any) {
      console.error("Biometric verification error:", err);
      if (err.name === "NotAllowedError") {
        setError("Biometric verification was cancelled or not allowed");
      } else if (err.name === "NotSupportedError") {
        setError("Biometric authentication not supported on this device");
      } else {
        setError(err.message || "Biometric verification failed");
      }
      updateStepStatus(1, "failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReconstruction = async () => {
    try {
      // Simulate key reconstruction
      await new Promise(resolve => setTimeout(resolve, 2000));

      updateStepStatus(2, "completed");

      // Navigate to success page
      router.push(`/recovery/${walletAddress}/success`);
    } catch (err: any) {
      console.error("Reconstruction error:", err);
      setError("Failed to reconstruct private key");
      updateStepStatus(2, "failed");
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    const failedStepIndex = steps.findIndex(step => step.status === "failed");
    if (failedStepIndex !== -1) {
      updateStepStatus(failedStepIndex, "in_progress");
      setCurrentStep(failedStepIndex);
    }
  };

  const progress = (steps.filter(s => s.status === "completed").length / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Instant Recovery</h1>
            <p className="text-gray-600 mb-4">
              Recover your wallet instantly using password + biometric authentication
            </p>
            <div className="bg-white rounded-lg p-3 inline-block">
              <p className="text-sm text-gray-600 mb-1">Recovering:</p>
              <p className="font-mono text-sm font-medium">{walletAddress}</p>
            </div>
          </div>

          {/* Progress */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Recovery Progress</CardTitle>
              <CardDescription>Decrypting and reconstructing your private key</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="mb-4" />
              <p className="text-sm text-gray-500 text-center">{Math.round(progress)}% complete</p>
            </CardContent>
          </Card>

          {/* Steps */}
          <div className="space-y-4 mb-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = step.status === "completed";
              const isFailed = step.status === "failed";

              return (
                <Card
                  key={step.id}
                  className={`border-2 ${
                    isFailed
                      ? "border-red-300 bg-red-50"
                      : isCompleted
                        ? "border-green-300 bg-green-50"
                        : isActive
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-2 rounded-full ${
                          isFailed
                            ? "bg-red-100"
                            : isCompleted
                              ? "bg-green-100"
                              : isActive
                                ? "bg-blue-100"
                                : "bg-gray-100"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        ) : isFailed ? (
                          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                        ) : (
                          <Icon className={`h-6 w-6 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3
                          className={`font-medium ${
                            isFailed
                              ? "text-red-800"
                              : isCompleted
                                ? "text-green-800"
                                : isActive
                                  ? "text-blue-800"
                                  : "text-gray-600"
                          }`}
                        >
                          {step.title}
                        </h3>
                        <p
                          className={`text-sm ${
                            isFailed
                              ? "text-red-600"
                              : isCompleted
                                ? "text-green-600"
                                : isActive
                                  ? "text-blue-600"
                                  : "text-gray-500"
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>
                      {isActive && isProcessing && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Current Step Content */}
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Enter Your Master Password</CardTitle>
                <CardDescription>This will decrypt the first piece of your private key</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Master Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your master password"
                      className="pr-10"
                      onKeyPress={e => e.key === "Enter" && handlePasswordVerify()}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <Button onClick={handlePasswordVerify} disabled={!password || isProcessing} className="w-full">
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Decrypting...
                    </>
                  ) : (
                    <>
                      Verify Password
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Biometric Verification</CardTitle>
                <CardDescription>
                  Authenticate with your {biometricType === "face" ? "face" : "fingerprint"} to decrypt the second piece
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-6">
                  <div className="mx-auto mb-4 p-4 bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center">
                    {biometricType === "face" ? (
                      <FaceSmileIcon className="h-10 w-10 text-purple-600" />
                    ) : (
                      <FingerPrintIcon className="h-10 w-10 text-purple-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {biometricType === "face" ? "Scan Your Face" : "Scan Your Fingerprint"}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Position your {biometricType === "face" ? "face in front of the camera" : "finger on the sensor"}
                  </p>

                  <Button onClick={handleBiometricVerify} disabled={isProcessing} size="lg">
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Scanning...
                      </>
                    ) : (
                      <>
                        Start {biometricType === "face" ? "Face" : "Fingerprint"} Scan
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Reconstructing Private Key</CardTitle>
                <CardDescription>Combining your decrypted pieces to restore wallet access</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Please wait while we reconstruct your private key...</p>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50 mt-6">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-800 mb-1">Recovery Failed</h4>
                    <p className="text-sm text-red-700 mb-3">{error}</p>
                    <Button variant="outline" size="sm" onClick={handleRetry}>
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Back Button */}
          <div className="text-center mt-6">
            <Button variant="outline" onClick={() => router.back()} disabled={isProcessing}>
              Back to Method Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
