"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CheckCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  UsersIcon,
  WalletIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import { SetupData } from "@/app/setup/page";
import { formatAddress } from "@/lib/utils";

interface ReviewStepProps {
  data: SetupData;
  walletAddress: string;
  onNext: () => void;
  onPrev: () => void;
}

export default function ReviewStep({ data, walletAddress, onNext, onPrev }: ReviewStepProps) {
  const [confirmationPassword, setConfirmationPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPasswordCorrect = confirmationPassword === data.password;
  const canProceed = isPasswordCorrect && agreedToTerms;

  const handleConfirm = () => {
    if (!isPasswordCorrect) {
      setError("Password doesn't match. Please enter your password correctly.");
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to the terms and conditions to proceed.");
      return;
    }

    setError(null);
    onNext();
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Review & Confirm Setup</CardTitle>
        <CardDescription>
          Please review your setup details before creating your recovery configuration.
          This information will be used to protect your wallet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Information */}
        <Card className="border-2 border-indigo-100">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <WalletIcon className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg">Wallet Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Connected Wallet:</span>
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {formatAddress(walletAddress)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Setup */}
        <Card className="border-2 border-green-100">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <KeyIcon className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Password Protection</CardTitle>
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              ✓ Strong master password configured
              <br />
              ✓ Encrypts the first piece of your private key
              <br />
              ✓ Enables instant recovery when combined with biometrics
            </p>
          </CardContent>
        </Card>

        {/* Biometric Setup */}
        <Card className={`border-2 ${data.biometricData ? 'border-purple-100' : 'border-gray-100'}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className={`h-5 w-5 ${data.biometricData ? 'text-purple-600' : 'text-gray-400'}`} />
              <CardTitle className="text-lg">Biometric Authentication</CardTitle>
              {data.biometricData && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
            </div>
          </CardHeader>
          <CardContent>
            {data.biometricData ? (
              <p className="text-sm text-gray-600">
                ✓ {data.biometricType === 'face' ? 'Face Recognition' : 'Fingerprint'} authentication configured
                <br />
                ✓ Encrypts the second piece of your private key
                <br />
                ✓ Enables instant recovery when combined with password
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                ⚪ Biometric authentication skipped
                <br />
                ⚪ You can still recover using password + social recovery
                <br />
                ⚪ Recovery will take 7 days without biometrics
              </p>
            )}
          </CardContent>
        </Card>

        {/* Guardians Setup */}
        <Card className="border-2 border-blue-100">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <UsersIcon className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Guardian Network</CardTitle>
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                ✓ {data.guardians.length} trusted guardians configured
                <br />
                ✓ 3 guardian approvals required for social recovery
                <br />
                ✓ 7-day delay for security protection
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.guardians.map((guardian, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                    <span className="font-medium">{guardian.name}</span>
                    <br />
                    {guardian.email && <span className="text-gray-500">📧 {guardian.email}</span>}
                    {guardian.phone && <span className="text-gray-500">📱 {guardian.phone}</span>}
                    {guardian.address && (
                      <span className="text-gray-500 font-mono">🔗 {formatAddress(guardian.address)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Your Recovery Options</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded">
                    <div className="text-green-600 font-medium mb-1">Instant Recovery</div>
                    <div>Password + {data.biometricData ? 'Biometric' : 'N/A'}</div>
                    {!data.biometricData && <div className="text-gray-500 text-xs">Not available</div>}
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-yellow-600 font-medium mb-1">7-Day Recovery</div>
                    <div>Password + 3 Guardians</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-yellow-600 font-medium mb-1">7-Day Recovery</div>
                    <div>{data.biometricData ? 'Biometric' : 'Social'} + 3 Guardians</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Confirmation */}
        <Card className="border-2 border-yellow-100">
          <CardHeader>
            <CardTitle className="text-lg">Confirm Your Password</CardTitle>
            <CardDescription>
              Enter your master password one more time to confirm your setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Master Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmationPassword}
                  onChange={(e) => {
                    setConfirmationPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Re-enter your master password"
                  className={`pr-10 ${
                    confirmationPassword && !isPasswordCorrect ? 'border-red-500' : ''
                  }`}
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
              {confirmationPassword && (
                <div className="flex items-center text-sm">
                  {isPasswordCorrect ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600" />
                      <span className="text-green-600">Password matches</span>
                    </>
                  ) : (
                    <>
                      <ExclamationTriangleIcon className="h-4 w-4 mr-2 text-red-600" />
                      <span className="text-red-600">Password doesn't match</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Terms Agreement */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm">
              <span className="font-medium">I understand and agree to the following:</span>
              <ul className="mt-2 space-y-1 text-gray-600">
                <li>• I am responsible for keeping my password secure</li>
                <li>• I have informed my guardians about their responsibility</li>
                <li>• Recovery requests have security delays to prevent unauthorized access</li>
                <li>• Keymesh cannot recover my wallet without my authentication factors</li>
                <li>• My private key pieces will be stored permanently on Avail DA</li>
              </ul>
            </label>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Cost Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">💰 One-Time Cost</h4>
          <p className="text-sm text-green-800">
            Approximately $0.03 to store your encrypted key pieces permanently on Avail DA.
            No monthly fees or subscriptions required.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev}>
            Back
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canProceed}
            className="min-w-32 bg-green-600 hover:bg-green-700"
          >
            Create Recovery Setup
            <ChevronRightIcon className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}