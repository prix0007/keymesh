"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

type RecoveryMethod = "password_biometric" | "password_social" | "biometric_social";

interface RecoveryOption {
  id: RecoveryMethod;
  title: string;
  description: string;
  requirements: string[];
  timeframe: string;
  icon: React.ComponentType<any>;
  available: boolean;
  reason?: string;
}

export default function RecoveryMethodSelection() {
  const params = useParams();
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<RecoveryMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - in real app, this would be fetched based on wallet setup
  const walletAddress = params.address as string;
  const hasPassword = true;
  const hasBiometric = true;
  const guardianCount = 5;

  const recoveryOptions: RecoveryOption[] = [
    {
      id: "password_biometric",
      title: "Password + Biometric",
      description: "Use your master password and biometric authentication",
      requirements: ["Master password", "Face ID / Touch ID / Fingerprint"],
      timeframe: "Instant",
      icon: ShieldCheckIcon,
      available: hasPassword && hasBiometric,
      reason: !hasPassword ? "No password configured" : !hasBiometric ? "No biometric configured" : undefined,
    },
    {
      id: "password_social",
      title: "Password + Social Recovery",
      description: "Use your master password and guardian approvals",
      requirements: ["Master password", "3 of 5 guardian approvals"],
      timeframe: "7 days",
      icon: KeyIcon,
      available: hasPassword && guardianCount >= 5,
      reason: !hasPassword ? "No password configured" : guardianCount < 5 ? "Insufficient guardians" : undefined,
    },
    {
      id: "biometric_social",
      title: "Biometric + Social Recovery",
      description: "Use your biometric authentication and guardian approvals",
      requirements: ["Face ID / Touch ID / Fingerprint", "3 of 5 guardian approvals"],
      timeframe: "7 days",
      icon: UsersIcon,
      available: hasBiometric && guardianCount >= 5,
      reason: !hasBiometric ? "No biometric configured" : guardianCount < 5 ? "Insufficient guardians" : undefined,
    },
  ];

  const handleMethodSelect = (method: RecoveryMethod) => {
    setSelectedMethod(method);
  };

  const handleProceed = async () => {
    if (!selectedMethod) return;

    setIsLoading(true);
    try {
      // Navigate to the specific recovery flow
      switch (selectedMethod) {
        case "password_biometric":
          router.push(`/recovery/${walletAddress}/instant`);
          break;
        case "password_social":
          router.push(`/recovery/${walletAddress}/password-social`);
          break;
        case "biometric_social":
          router.push(`/recovery/${walletAddress}/biometric-social`);
          break;
      }
    } catch (error) {
      console.error("Failed to proceed with recovery:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Recovery Method</h1>
            <p className="text-gray-600 mb-4">
              Select how you&apos;d like to recover your wallet. You need any 2 of your 3 key pieces.
            </p>
            <div className="bg-white rounded-lg p-4 inline-block">
              <p className="text-sm text-gray-600 mb-1">Recovering wallet:</p>
              <p className="font-mono text-sm font-medium">{walletAddress}</p>
            </div>
          </div>

          {/* How It Works */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <InformationCircleIcon className="h-5 w-5 mr-2" />
                How Recovery Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-blue-600 font-bold">A</span>
                  </div>
                  <h4 className="font-medium mb-1">Piece A</h4>
                  <p className="text-sm text-gray-600">Encrypted with your password</p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-purple-600 font-bold">B</span>
                  </div>
                  <h4 className="font-medium mb-1">Piece B</h4>
                  <p className="text-sm text-gray-600">Encrypted with your biometric</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-green-600 font-bold">C</span>
                  </div>
                  <h4 className="font-medium mb-1">Piece C</h4>
                  <p className="text-sm text-gray-600">Protected by 5 guardians</p>
                </div>
              </div>
              <div className="text-center mt-6">
                <p className="text-sm text-gray-600">
                  <strong>Recovery Rule:</strong> Any 2 pieces can reconstruct your private key
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recovery Options */}
          <div className="grid gap-6 mb-8">
            {recoveryOptions.map(option => {
              const Icon = option.icon;
              const isSelected = selectedMethod === option.id;
              const isInstant = option.timeframe === "Instant";

              return (
                <Card
                  key={option.id}
                  className={`cursor-pointer transition-all border-2 ${
                    !option.available
                      ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                      : isSelected
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                  }`}
                  onClick={() => option.available && handleMethodSelect(option.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div
                          className={`p-3 rounded-full ${
                            !option.available ? "bg-gray-100" : isInstant ? "bg-green-100" : "bg-yellow-100"
                          }`}
                        >
                          <Icon
                            className={`h-6 w-6 ${
                              !option.available ? "text-gray-400" : isInstant ? "text-green-600" : "text-yellow-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold">{option.title}</h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                !option.available
                                  ? "bg-gray-100 text-gray-500"
                                  : isInstant
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {option.available ? option.timeframe : "Unavailable"}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3">{option.description}</p>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-700">Requirements:</p>
                            <ul className="text-sm text-gray-600">
                              {option.requirements.map((req, index) => (
                                <li key={index} className="flex items-center">
                                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {!option.available && option.reason && (
                            <div className="mt-3 flex items-center text-sm text-red-600">
                              <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                              {option.reason}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center space-y-2">
                        {isSelected && option.available && <CheckCircleIcon className="h-6 w-6 text-indigo-600" />}
                        {isInstant && option.available && (
                          <div className="flex items-center text-green-600">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            <span className="text-xs font-medium">Fast</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Security Warning */}
          <Card className="mb-8 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <ExclamationCircleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 mb-1">Security Notice</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Only proceed if you are the legitimate owner of this wallet</li>
                    <li>• Social recovery methods have a 7-day delay for security</li>
                    <li>• Make sure you&apos;re on the correct website (check URL)</li>
                    <li>• Never share your password or biometric with anyone</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>

            <Button onClick={handleProceed} disabled={!selectedMethod || isLoading} size="lg" className="min-w-48">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  Continue with{" "}
                  {selectedMethod ? recoveryOptions.find(o => o.id === selectedMethod)?.title : "Recovery"}
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
