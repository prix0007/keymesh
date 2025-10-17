"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  KeyIcon,
  QrCodeIcon,
  DocumentArrowUpIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClipboardDocumentIcon
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface RecoveryCode {
  walletAddress: string;
  blockReferences: number[];
  guardianAddresses: string[];
  version: number;
}

export default function RecoveryInitiation() {
  const router = useRouter();
  const [recoveryInput, setRecoveryInput] = useState("");
  const [inputMethod, setInputMethod] = useState<"paste" | "qr" | "file">("paste");
  const [parsedData, setParsedData] = useState<RecoveryCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const parseRecoveryCode = (input: string): RecoveryCode | null => {
    try {
      // Handle keymesh:// URL format
      if (input.startsWith("keymesh://recovery/")) {
        const url = new URL(input);
        const params = new URLSearchParams(url.search);

        const walletAddress = params.get("u");
        const blockRefs = params.get("b")?.split(",").map(Number);
        const guardians = params.get("g")?.split(",");
        const version = parseInt(params.get("v") || "1");

        if (!walletAddress || !blockRefs || !guardians) {
          throw new Error("Invalid recovery code format");
        }

        return {
          walletAddress,
          blockReferences: blockRefs,
          guardianAddresses: guardians,
          version
        };
      }

      // Handle JSON format
      if (input.trim().startsWith("{")) {
        const data = JSON.parse(input);
        if (!data.walletAddress || !data.blockReferences || !data.guardianAddresses) {
          throw new Error("Invalid JSON recovery data");
        }
        return data;
      }

      // Handle base64 encoded data
      try {
        const decoded = atob(input);
        const data = JSON.parse(decoded);
        if (!data.walletAddress || !data.blockReferences || !data.guardianAddresses) {
          throw new Error("Invalid encoded recovery data");
        }
        return data;
      } catch {
        throw new Error("Invalid recovery code format");
      }
    } catch (err: any) {
      return null;
    }
  };

  const handleInputChange = (value: string) => {
    setRecoveryInput(value);
    setError(null);
    setParsedData(null);

    if (value.trim()) {
      const parsed = parseRecoveryCode(value.trim());
      if (parsed) {
        setParsedData(parsed);
      } else {
        setError("Invalid recovery code format. Please check your input.");
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleInputChange(content);
    };
    reader.readAsText(file);
  };

  const handleQRScan = async () => {
    try {
      // In a real implementation, this would use a QR scanner
      // For now, we'll show a placeholder
      setError("QR code scanning not implemented in this demo");
    } catch (err: any) {
      setError("Failed to scan QR code: " + err.message);
    }
  };

  const handleStartRecovery = async () => {
    if (!parsedData) return;

    setIsLoading(true);
    try {
      // In a real implementation, this would:
      // 1. Validate the recovery code
      // 2. Check if wallet exists
      // 3. Navigate to method selection

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate to recovery method selection
      router.push(`/recovery/${parsedData.walletAddress}/method`);
    } catch (err: any) {
      setError("Failed to initiate recovery: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleInputChange(text);
    } catch (err) {
      setError("Failed to read from clipboard. Please paste manually.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 p-3 bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center">
              <KeyIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Recover Your Wallet</h1>
            <p className="text-gray-600">
              Enter your recovery code to regain access to your protected wallet
            </p>
          </div>

          {/* Input Method Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Choose Input Method</CardTitle>
              <CardDescription>
                How would you like to provide your recovery information?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button
                  onClick={() => setInputMethod("paste")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    inputMethod === "paste"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <ClipboardDocumentIcon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="font-medium">Paste Code</p>
                  <p className="text-sm text-gray-500">Paste recovery text or URL</p>
                </button>

                <button
                  onClick={() => setInputMethod("qr")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    inputMethod === "qr"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <QrCodeIcon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="font-medium">Scan QR Code</p>
                  <p className="text-sm text-gray-500">Use camera to scan QR</p>
                </button>

                <button
                  onClick={() => setInputMethod("file")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    inputMethod === "file"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <DocumentArrowUpIcon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="font-medium">Upload File</p>
                  <p className="text-sm text-gray-500">Upload recovery JSON file</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Input Area */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Recovery Information</CardTitle>
              <CardDescription>
                {inputMethod === "paste" && "Paste your recovery code, URL, or JSON data"}
                {inputMethod === "qr" && "Scan the QR code from your recovery backup"}
                {inputMethod === "file" && "Upload your recovery file"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inputMethod === "paste" && (
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Paste your recovery code here..."
                      value={recoveryInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      className="flex-1 font-mono text-sm"
                    />
                    <Button variant="outline" onClick={pasteFromClipboard}>
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Supports: keymesh:// URLs, JSON data, or base64 encoded recovery information
                  </p>
                </div>
              )}

              {inputMethod === "qr" && (
                <div className="text-center py-8">
                  <QrCodeIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <Button onClick={handleQRScan} className="mb-4">
                    Start QR Scan
                  </Button>
                  <p className="text-sm text-gray-500">
                    Position the QR code in front of your camera
                  </p>
                </div>
              )}

              {inputMethod === "file" && (
                <div className="text-center py-8">
                  <input
                    type="file"
                    id="recovery-file"
                    accept=".json,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="recovery-file"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                    Choose File
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Upload .json or .txt file containing your recovery data
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parsed Data Display */}
          {parsedData && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center">
                  <KeyIcon className="h-5 w-5 mr-2" />
                  Recovery Code Validated
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-green-800">Wallet Address:</p>
                  <p className="font-mono text-sm bg-white p-2 rounded border">
                    {parsedData.walletAddress}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">Data References:</p>
                  <p className="text-sm text-green-700">
                    {parsedData.blockReferences.length} encrypted pieces found on Avail DA
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">Guardians:</p>
                  <p className="text-sm text-green-700">
                    {parsedData.guardianAddresses.length} guardians configured
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <InformationCircleIcon className="h-5 w-5 mr-2" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-sm">Where to find your recovery code:</p>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>• Screenshot or download from setup completion</li>
                  <li>• QR code image saved to device</li>
                  <li>• JSON file downloaded during setup</li>
                  <li>• Email sent to yourself (if configured)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-sm">Supported formats:</p>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>• keymesh:// URLs</li>
                  <li>• Raw JSON recovery data</li>
                  <li>• Base64 encoded strings</li>
                  <li>• QR codes containing any of the above</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="text-center">
            <Button
              onClick={handleStartRecovery}
              disabled={!parsedData || isLoading}
              size="lg"
              className="w-full sm:w-auto min-w-48"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Validating...
                </>
              ) : (
                <>
                  Start Recovery Process
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