"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatAddress } from "@/lib/utils";
import {
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  FaceSmileIcon,
  KeyIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

interface Guardian {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: "pending" | "approved" | "declined";
  approvedAt?: Date;
}

interface RecoveryRequest {
  id: string;
  type: "password_social" | "biometric_social";
  initiatedAt: Date;
  timeRemaining: number; // hours
  approvals: number;
  requiredApprovals: number;
  canFinalize: boolean;
}

export default function SocialRecovery() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const walletAddress = params.address as string;
  const recoveryType = (searchParams.get("type") as "password_social" | "biometric_social") || "password_social";

  const [currentStep, setCurrentStep] = useState(0);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryRequest, setRecoveryRequest] = useState<RecoveryRequest | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);

  // Mock data
  useEffect(() => {
    // Initialize mock guardians
    setGuardians([
      {
        id: "1",
        name: "Alice Johnson",
        email: "alice@example.com",
        status: "approved",
        approvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: "2",
        name: "Bob Smith",
        phone: "+1-555-0123",
        status: "approved",
        approvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
      {
        id: "3",
        name: "Carol Davis",
        email: "carol@example.com",
        address: "0x742d35Cc6634C0532925a3b8D6Cd8e5f47a48345",
        status: "pending",
      },
      {
        id: "4",
        name: "David Wilson",
        phone: "+1-555-0456",
        status: "pending",
      },
      {
        id: "5",
        name: "Eva Brown",
        address: "0x8ba1f109551bD432803012645Hac136c4dddd567",
        status: "pending",
      },
    ]);

    // Check if recovery is already initiated
    const existingRequest = localStorage.getItem(`recovery_${walletAddress}`);
    if (existingRequest) {
      const request = JSON.parse(existingRequest);
      setRecoveryRequest(request);
      setCurrentStep(recoveryType === "password_social" ? 2 : 1); // Skip to guardian approval step
    }
  }, [walletAddress, recoveryType]);

  const steps = [
    ...(recoveryType === "password_social"
      ? [
          {
            id: "password",
            title: "Enter Password",
            description: "Decrypt key piece A with your master password",
          },
        ]
      : []),
    ...(recoveryType === "biometric_social"
      ? [
          {
            id: "biometric",
            title: "Verify Biometric",
            description: "Decrypt key piece B with your biometric",
          },
        ]
      : []),
    {
      id: "request",
      title: "Request Guardian Approval",
      description: "Send recovery request to your guardians",
    },
    {
      id: "waiting",
      title: "Waiting for Approvals",
      description: "Need 3 of 5 guardian approvals + 7-day delay",
    },
    {
      id: "finalize",
      title: "Finalize Recovery",
      description: "Reconstruct your private key",
    },
  ];

  const handlePasswordVerify = async () => {
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (Math.random() < 0.2) {
        throw new Error("Incorrect password. Please try again.");
      }

      setCurrentStep(currentStep + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBiometricVerify = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      if (!window.PublicKeyCredential) {
        throw new Error("Biometric authentication not supported");
      }

      const authenticationOptions: PublicKeyCredentialRequestOptions = {
        challenge: new Uint8Array(32).map(() => Math.floor(Math.random() * 256)),
        allowCredentials: [],
        timeout: 60000,
        userVerification: "required",
      };

      const credential = await navigator.credentials.get({
        publicKey: authenticationOptions,
      });

      if (credential) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCurrentStep(currentStep + 1);
      } else {
        throw new Error("Biometric verification failed");
      }
    } catch (err: any) {
      setError(err.message || "Biometric verification failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestGuardianApproval = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create recovery request
      const request: RecoveryRequest = {
        id: `recovery_${Date.now()}`,
        type: recoveryType,
        initiatedAt: new Date(),
        timeRemaining: 7 * 24, // 7 days in hours
        approvals: 0,
        requiredApprovals: 3,
        canFinalize: false,
      };

      setRecoveryRequest(request);
      localStorage.setItem(`recovery_${walletAddress}`, JSON.stringify(request));
      setCurrentStep(currentStep + 1);
    } catch {
      setError("Failed to send guardian requests");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelRecovery = () => {
    localStorage.removeItem(`recovery_${walletAddress}`);
    setRecoveryRequest(null);
    router.push("/dashboard");
  };

  const handleFinalize = () => {
    if (recoveryRequest?.canFinalize) {
      router.push(`/recovery/${walletAddress}/success`);
    }
  };

  const approvedGuardians = guardians.filter(g => g.status === "approved");
  const progress = recoveryRequest
    ? Math.min((approvedGuardians.length / recoveryRequest.requiredApprovals) * 100, 100)
    : 0;

  // Simulate time countdown
  useEffect(() => {
    if (recoveryRequest && currentStep === steps.length - 2) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = now.getTime() - recoveryRequest.initiatedAt.getTime();
        const remaining = 7 * 24 * 60 * 60 * 1000 - elapsed;

        if (remaining <= 0 && approvedGuardians.length >= 3) {
          setRecoveryRequest(prev => (prev ? { ...prev, canFinalize: true } : null));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [recoveryRequest, currentStep, approvedGuardians.length, steps.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Social Recovery</h1>
            <p className="text-gray-600 mb-4">
              Recover using {recoveryType === "password_social" ? "password" : "biometric"} + guardian approvals
            </p>
            <div className="bg-white rounded-lg p-3 inline-block">
              <p className="text-sm text-gray-600 mb-1">Recovering:</p>
              <p className="font-mono text-sm font-medium">{formatAddress(walletAddress, 8)}</p>
            </div>
          </div>

          {/* Current Step Content */}
          {currentStep === 0 && recoveryType === "password_social" && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <KeyIcon className="h-5 w-5 mr-2" />
                  Enter Your Master Password
                </CardTitle>
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
                  {isProcessing ? "Verifying..." : "Verify Password"}
                </Button>
              </CardContent>
            </Card>
          )}

          {currentStep === 0 && recoveryType === "biometric_social" && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2" />
                  Biometric Verification
                </CardTitle>
                <CardDescription>Authenticate to decrypt the second piece of your private key</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-6">
                <div className="mx-auto mb-4 p-4 bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center">
                  <FaceSmileIcon className="h-10 w-10 text-purple-600" />
                </div>
                <Button onClick={handleBiometricVerify} disabled={isProcessing} size="lg">
                  {isProcessing ? "Scanning..." : "Start Biometric Scan"}
                </Button>
              </CardContent>
            </Card>
          )}

          {((recoveryType === "password_social" && currentStep === 1) ||
            (recoveryType === "biometric_social" && currentStep === 1)) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UsersIcon className="h-5 w-5 mr-2" />
                  Request Guardian Approval
                </CardTitle>
                <CardDescription>Send recovery requests to your 5 guardians</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {guardians.map(guardian => (
                    <div key={guardian.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-full">
                          <UserIcon className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{guardian.name}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            {guardian.email && (
                              <div className="flex items-center">
                                <EnvelopeIcon className="h-3 w-3 mr-1" />
                                {guardian.email}
                              </div>
                            )}
                            {guardian.phone && (
                              <div className="flex items-center">
                                <PhoneIcon className="h-3 w-3 mr-1" />
                                {guardian.phone}
                              </div>
                            )}
                            {guardian.address && <span className="font-mono">{formatAddress(guardian.address)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm">Will receive request</div>
                    </div>
                  ))}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">What happens next?</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• All 5 guardians will receive recovery requests</li>
                    <li>• You need 3 approvals to proceed</li>
                    <li>• There&apos;s a 7-day security delay before finalization</li>
                    <li>• Guardians should verify your identity before approving</li>
                  </ul>
                </div>

                <Button onClick={handleRequestGuardianApproval} disabled={isProcessing} className="w-full" size="lg">
                  {isProcessing ? "Sending Requests..." : "Send Recovery Requests"}
                </Button>
              </CardContent>
            </Card>
          )}

          {((recoveryType === "password_social" && currentStep === 2) ||
            (recoveryType === "biometric_social" && currentStep === 2)) &&
            recoveryRequest && (
              <div className="space-y-6">
                {/* Status Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2" />
                      Recovery In Progress
                    </CardTitle>
                    <CardDescription>Waiting for guardian approvals and security delay</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-1">Approvals</h4>
                        <p className="text-2xl font-bold text-blue-600">
                          {approvedGuardians.length} / {recoveryRequest.requiredApprovals}
                        </p>
                        <Progress value={progress} className="mt-2" />
                      </div>
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <h4 className="font-medium text-amber-800 mb-1">Time Remaining</h4>
                        <p className="text-2xl font-bold text-amber-600">
                          {Math.floor(recoveryRequest.timeRemaining / 24)}d {recoveryRequest.timeRemaining % 24}h
                        </p>
                        <p className="text-sm text-amber-600">Security delay</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Guardian Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Guardian Status</CardTitle>
                    <CardDescription>Track which guardians have approved your recovery</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {guardians.map(guardian => (
                        <div key={guardian.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`p-2 rounded-full ${
                                guardian.status === "approved"
                                  ? "bg-green-100"
                                  : guardian.status === "declined"
                                    ? "bg-red-100"
                                    : "bg-gray-100"
                              }`}
                            >
                              <UserIcon
                                className={`h-4 w-4 ${
                                  guardian.status === "approved"
                                    ? "text-green-600"
                                    : guardian.status === "declined"
                                      ? "text-red-600"
                                      : "text-gray-600"
                                }`}
                              />
                            </div>
                            <div>
                              <p className="font-medium">{guardian.name}</p>
                              {guardian.approvedAt && (
                                <p className="text-sm text-gray-500">Approved {guardian.approvedAt.toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                          <div
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              guardian.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : guardian.status === "declined"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {guardian.status.charAt(0).toUpperCase() + guardian.status.slice(1)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-between">
                  <Button variant="destructive" onClick={handleCancelRecovery}>
                    Cancel Recovery
                  </Button>

                  <Button onClick={handleFinalize} disabled={!recoveryRequest.canFinalize} size="lg">
                    {recoveryRequest.canFinalize ? "Finalize Recovery" : "Waiting for Requirements"}
                  </Button>
                </div>
              </div>
            )}

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50 mt-6">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800 mb-1">Error</h4>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
