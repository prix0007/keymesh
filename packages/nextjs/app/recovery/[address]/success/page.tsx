"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAddress } from "@/lib/utils";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export default function RecoverySuccess() {
  const params = useParams();
  const router = useRouter();
  const walletAddress = params.address as string;

  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKeyCopied, setPrivateKeyCopied] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Mock reconstructed private key (in real app, this would come from actual recovery)
  const reconstructedPrivateKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  useEffect(() => {
    // Clean up any recovery state
    localStorage.removeItem(`recovery_${walletAddress}`);
  }, [walletAddress]);

  const copyPrivateKey = async () => {
    try {
      await navigator.clipboard.writeText(reconstructedPrivateKey);
      setPrivateKeyCopied(true);
      setTimeout(() => setPrivateKeyCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy private key:", err);
    }
  };

  const handleGoToDashboard = () => {
    setIsRedirecting(true);
    router.push("/dashboard");
  };

  const securitySteps = [
    "Import your private key into a new wallet immediately",
    "Transfer your assets to a newly generated wallet",
    "Set up Keymesh protection for your new wallet",
    "Never share your private key with anyone",
    "Consider this wallet address compromised until assets are moved",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 p-4 bg-green-100 rounded-full w-20 h-20 flex items-center justify-center">
              <CheckCircleIcon className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-green-800 mb-2">🎉 Recovery Successful!</h1>
            <p className="text-lg text-green-700 mb-4">Your wallet has been successfully recovered</p>
            <div className="bg-white rounded-lg p-4 inline-block border-2 border-green-200">
              <p className="text-sm text-gray-600 mb-1">Recovered Wallet:</p>
              <p className="font-mono text-lg font-medium">{formatAddress(walletAddress, 8)}</p>
            </div>
          </div>

          {/* Recovery Summary */}
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">Recovery Summary</CardTitle>
              <CardDescription className="text-green-700">
                Your private key has been reconstructed from encrypted pieces
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="bg-white rounded-lg p-3 mb-2">
                    <KeyIcon className="h-6 w-6 text-green-600 mx-auto" />
                  </div>
                  <p className="text-sm font-medium text-green-800">Pieces Used</p>
                  <p className="text-lg font-bold text-green-600">2 of 3</p>
                </div>
                <div className="text-center">
                  <div className="bg-white rounded-lg p-3 mb-2">
                    <ShieldCheckIcon className="h-6 w-6 text-green-600 mx-auto" />
                  </div>
                  <p className="text-sm font-medium text-green-800">Security</p>
                  <p className="text-lg font-bold text-green-600">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Private Key Display */}
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800 flex items-center">
                <KeyIcon className="h-5 w-5 mr-2" />
                Your Recovered Private Key
              </CardTitle>
              <CardDescription className="text-amber-700">
                Store this safely - it&apos;s the only way to access your wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white border-2 border-amber-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-amber-800">Private Key:</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="p-1 text-amber-600 hover:text-amber-800"
                    >
                      {showPrivateKey ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                    <button onClick={copyPrivateKey} className="p-1 text-amber-600 hover:text-amber-800">
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="font-mono text-sm break-all bg-gray-100 p-3 rounded border">
                  {showPrivateKey ? reconstructedPrivateKey : "•".repeat(66)}
                </div>
                {privateKeyCopied && <p className="text-sm text-green-600 mt-2">✓ Copied to clipboard!</p>}
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800 mb-1">⚠️ Critical Security Warning</h4>
                    <p className="text-sm text-red-700">
                      This private key gives complete control over your wallet. Never share it with anyone. Consider
                      this wallet compromised until you move your assets to a new wallet.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <InformationCircleIcon className="h-5 w-5 mr-2" />
                Important Next Steps
              </CardTitle>
              <CardDescription>Follow these steps to secure your recovered assets</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {securitySteps.map((step, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                      {index + 1}
                    </div>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Wallet Import Instructions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>How to Import Your Wallet</CardTitle>
              <CardDescription>Use your private key to import the wallet into popular wallet apps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">MetaMask</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. Open MetaMask</li>
                    <li>2. Click account icon → Import Account</li>
                    <li>3. Select &quot;Private Key&quot;</li>
                    <li>4. Paste your private key</li>
                  </ol>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Other Wallets</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. Look for &quot;Import&quot; or &quot;Add Account&quot;</li>
                    <li>2. Choose &quot;Private Key&quot; option</li>
                    <li>3. Enter your private key</li>
                    <li>4. Verify the wallet address matches</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/setup">
                <Button variant="outline" className="w-full">
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  Set Up New Protection
                </Button>
              </Link>
              <Button onClick={handleGoToDashboard} disabled={isRedirecting} className="w-full">
                {isRedirecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Redirecting...
                  </>
                ) : (
                  <>
                    Go to Dashboard
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">Need help? Contact our support team or check the documentation.</p>
            </div>
          </div>

          {/* Recovery Record */}
          <Card className="mt-8 border-gray-200 bg-gray-50">
            <CardHeader>
              <CardTitle className="text-gray-700">Recovery Record</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <strong>Recovery Time:</strong> {new Date().toLocaleString()}
                </p>
                <p>
                  <strong>Method:</strong> Social Recovery
                </p>
                <p>
                  <strong>Wallet:</strong> {walletAddress}
                </p>
                <p>
                  <strong>Status:</strong> <span className="text-green-600 font-medium">Completed Successfully</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
