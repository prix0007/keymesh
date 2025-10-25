"use client";

import { useState } from "react";
import Link from "next/link";
import { SetupData } from "@/app/setup/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAddress } from "@/lib/utils";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentDuplicateIcon,
  HeartIcon,
  InformationCircleIcon,
  KeyIcon,
  ShareIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

interface SuccessStepProps {
  walletAddress: string;
  setupData: SetupData;
}

export default function SuccessStep({ walletAddress, setupData }: SuccessStepProps) {
  const [recoveryIdCopied, setRecoveryIdCopied] = useState(false);

  // Generate proper recovery URL from actual recovery data
  const generateRecoveryUrl = () => {
    if (setupData.recoveryData) {
      const { blockReferences, guardianAddresses } = setupData.recoveryData;
      const params = new URLSearchParams({
        u: walletAddress,
        b: blockReferences.join(","),
        g: guardianAddresses.join(","),
        v: "1",
      });
      return `keymesh://recovery/?${params.toString()}`;
    }
    // Fallback to old format if no recovery data
    return `keymesh_${walletAddress.slice(-8)}_${Date.now().toString(36)}`;
  };

  const recoveryId = generateRecoveryUrl();

  const copyRecoveryId = async () => {
    try {
      await navigator.clipboard.writeText(recoveryId);
      setRecoveryIdCopied(true);
      setTimeout(() => setRecoveryIdCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy recovery ID:", err);
    }
  };

  const nextSteps = [
    {
      title: "Test Your Setup",
      description: "Verify your recovery methods work correctly",
      icon: ShieldCheckIcon,
      action: "Test Recovery",
      link: "/test-recovery",
    },
    {
      title: "Manage Guardians",
      description: "Update guardian information or add new ones",
      icon: UsersIcon,
      action: "Manage Guardians",
      link: "/guardians",
    },
    {
      title: "View Dashboard",
      description: "Monitor your recovery status and activity",
      icon: KeyIcon,
      action: "Go to Dashboard",
      link: "/dashboard",
    },
  ];

  const securityTips = [
    "Store your recovery ID in a safe place (not digitally)",
    "Test your password regularly to ensure you remember it",
    "Keep your guardians informed about their role",
    "Update guardian contact information if it changes",
    "Consider setting up inheritance plans for your assets",
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Success Header */}
      <Card className="border-2 border-green-300 bg-green-50">
        <CardContent className="text-center py-8">
          <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-20 h-20 flex items-center justify-center">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-800 mb-2">🎉 Wallet Protection Complete!</h1>
          <p className="text-lg text-green-700 mb-4">Your wallet is now protected with Keymesh social recovery</p>
          <div className="bg-white rounded-lg p-4 inline-block">
            <p className="text-sm text-gray-600 mb-1">Protected Wallet</p>
            <p className="font-mono text-lg font-medium">{formatAddress(walletAddress, 8)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Setup Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="mx-auto mb-2 p-2 bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center">
              <KeyIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-sm mb-1">Password</h3>
            <p className="text-xs text-gray-600">First key piece encrypted</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="mx-auto mb-2 p-2 bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center">
              <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-sm mb-1">Biometric</h3>
            <p className="text-xs text-gray-600">Second key piece secured</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="mx-auto mb-2 p-2 bg-green-100 rounded-full w-12 h-12 flex items-center justify-center">
              <UsersIcon className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-sm mb-1">Guardians</h3>
            <p className="text-xs text-gray-600">5 guardians configured</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="mx-auto mb-2 p-2 bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center">
              <CloudArrowUpIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-sm mb-1">Avail DA</h3>
            <p className="text-xs text-gray-600">Permanently stored</p>
          </CardContent>
        </Card>
      </div>

      {/* Recovery ID */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DocumentDuplicateIcon className="h-5 w-5" />
            <span>Your Recovery ID</span>
          </CardTitle>
          <CardDescription>
            Save this ID in a secure location. You&apos;ll need it to initiate recovery from a new device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <code className="flex-1 font-mono text-sm">{recoveryId}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={copyRecoveryId}
              className={recoveryIdCopied ? "bg-green-50 border-green-300" : ""}
            >
              {recoveryIdCopied ? (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Your Recovery Options</CardTitle>
          <CardDescription>You now have multiple ways to recover your wallet if needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium mb-2 inline-block">
                Instant
              </div>
              <h4 className="font-semibold mb-1">Password + Biometric</h4>
              <p className="text-sm text-gray-600">Immediate access using your password and biometric</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full text-xs font-medium mb-2 inline-block">
                7 Days
              </div>
              <h4 className="font-semibold mb-1">Password + Social</h4>
              <p className="text-sm text-gray-600">Recovery using password + 3 guardian approvals</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full text-xs font-medium mb-2 inline-block">
                7 Days
              </div>
              <h4 className="font-semibold mb-1">Biometric + Social</h4>
              <p className="text-sm text-gray-600">Recovery using biometric + 3 guardian approvals</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Next Steps</CardTitle>
          <CardDescription>Complete these actions to ensure your recovery system works perfectly.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {nextSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                  <Link href={step.link}>
                    <Button variant="outline" size="sm">
                      {step.action}
                      <ArrowRightIcon className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <InformationCircleIcon className="h-5 w-5" />
            <span>Security Best Practices</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {securityTips.map((tip, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm">
                <span className="text-green-600 mt-1">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Share Success */}
      <Card className="bg-gradient-to-r from-indigo-50 to-cyan-50">
        <CardContent className="text-center py-6">
          <HeartIcon className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <h3 className="font-semibold mb-2">Love Keymesh?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Help others protect their crypto by sharing Keymesh with friends and family.
          </p>
          <Button variant="outline" size="sm">
            <ShareIcon className="h-4 w-4 mr-1" />
            Share Keymesh
          </Button>
        </CardContent>
      </Card>

      {/* Final CTA */}
      <div className="text-center">
        <Link href="/dashboard">
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
            Go to Your Dashboard
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
