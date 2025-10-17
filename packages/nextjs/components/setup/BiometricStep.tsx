"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FaceSmileIcon,
  FingerPrintIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import { SetupData } from "@/app/setup/page";

interface BiometricStepProps {
  data: SetupData;
  updateData: (data: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

type BiometricType = 'face' | 'fingerprint' | null;

export default function BiometricStep({ data, updateData, onNext, onPrev }: BiometricStepProps) {
  const [selectedType, setSelectedType] = useState<BiometricType>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if WebAuthn is supported
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      setIsSupported(true);
    }

    // Check if we already have biometric data
    if (data.biometricData && data.biometricType) {
      setSelectedType(data.biometricType as BiometricType);
      setRegistrationComplete(true);
    }
  }, [data.biometricData, data.biometricType]);

  const handleBiometricRegistration = async (type: BiometricType) => {
    if (!type) return;

    setIsRegistering(true);
    setError(null);
    setSelectedType(type);

    try {
      // Check if WebAuthn is available
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      // Create credential options
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: new Uint8Array(32).map(() => Math.floor(Math.random() * 256)),
        rp: {
          name: "Keymesh",
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(`user_${Date.now()}`),
          name: "Keymesh User",
          displayName: "Keymesh User",
        },
        pubKeyCredParams: [
          {
            alg: -7, // ES256
            type: "public-key",
          },
        ],
        authenticatorSelection: {
          authenticatorAttachment: type === 'fingerprint' ? 'platform' : undefined,
          userVerification: 'required',
          residentKey: 'required',
        },
        timeout: 60000,
        attestation: 'direct',
      };

      // Create the credential
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (credential) {
        // Store the credential ID and public key
        const response = credential.response as AuthenticatorAttestationResponse;
        const credentialData = new Uint8Array(response.attestationObject);

        updateData({
          biometricData: credentialData,
          biometricType: type,
        });

        setRegistrationComplete(true);
      } else {
        throw new Error('Failed to create credential');
      }
    } catch (err: any) {
      console.error('Biometric registration error:', err);
      setError(err.message || 'Failed to register biometric. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSkip = () => {
    // Clear any biometric data if skipping
    updateData({
      biometricData: undefined,
      biometricType: undefined,
    });
    onNext();
  };

  const handleNext = () => {
    if (registrationComplete) {
      onNext();
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Set Up Biometric Authentication</CardTitle>
        <CardDescription>
          Your biometric encrypts the second piece of your private key. This enables instant recovery
          when combined with your password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSupported && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h4 className="font-medium text-yellow-800">Biometrics Not Supported</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Your browser doesn't support biometric authentication. You can skip this step
                  and still use password + social recovery.
                </p>
              </div>
            </div>
          </div>
        )}

        {isSupported && !registrationComplete && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-center">Choose your preferred biometric method</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Face ID Option */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedType === 'face' ? 'ring-2 ring-indigo-500' : ''
                }`}
                onClick={() => !isRegistering && handleBiometricRegistration('face')}
              >
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center">
                    <FaceSmileIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Face Recognition</h4>
                  <p className="text-sm text-gray-600">
                    Use your face to authenticate securely
                  </p>
                </CardContent>
              </Card>

              {/* Fingerprint Option */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedType === 'fingerprint' ? 'ring-2 ring-indigo-500' : ''
                }`}
                onClick={() => !isRegistering && handleBiometricRegistration('fingerprint')}
              >
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center">
                    <FingerPrintIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Fingerprint</h4>
                  <p className="text-sm text-gray-600">
                    Use your fingerprint to authenticate
                  </p>
                </CardContent>
              </Card>
            </div>

            {isRegistering && (
              <div className="text-center py-4">
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-blue-800">Setting up {selectedType} authentication...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-red-800">Registration Failed</h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setError(null)}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {registrationComplete && (
          <div className="text-center space-y-4">
            <div className="mx-auto p-3 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-green-800">
              {selectedType === 'face' ? 'Face Recognition' : 'Fingerprint'} Set Up Successfully!
            </h3>
            <p className="text-gray-600">
              You can now use your {selectedType} along with your password for instant wallet recovery.
            </p>
          </div>
        )}

        {/* Security Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">How Biometric Security Works</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your biometric data never leaves your device</li>
                <li>• Only a cryptographic signature is used to encrypt your key piece</li>
                <li>• Enables instant recovery when combined with your password</li>
                <li>• You can still recover without biometrics using social recovery</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev}>
            Back
          </Button>
          <div className="flex space-x-2">
            {isSupported && !registrationComplete && (
              <Button variant="outline" onClick={handleSkip}>
                Skip for Now
              </Button>
            )}
            <Button
              onClick={registrationComplete ? handleNext : handleSkip}
              className="min-w-32"
            >
              Continue
              <ChevronRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}