"use client";

import { useState } from "react";
import { SetupData } from "@/app/setup/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ChevronRightIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  InformationCircleIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

interface GuardiansStepProps {
  data: SetupData;
  updateData: (data: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface Guardian {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

const REQUIRED_GUARDIANS = 5;
const RECOVERY_THRESHOLD = 3;

export default function GuardiansStep({ data, updateData, onNext, onPrev }: GuardiansStepProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const addGuardian = () => {
    const newGuardians = [...data.guardians, { name: "", email: "", phone: "", address: "" }];
    updateData({ guardians: newGuardians });
  };

  const removeGuardian = (index: number) => {
    const newGuardians = data.guardians.filter((_, i) => i !== index);
    updateData({ guardians: newGuardians });
  };

  const updateGuardian = (index: number, field: keyof Guardian, value: string) => {
    const newGuardians = [...data.guardians];
    newGuardians[index] = { ...newGuardians[index], [field]: value };
    updateData({ guardians: newGuardians });

    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateGuardians = (): boolean => {
    const newErrors: string[] = [];

    if (data.guardians.length < REQUIRED_GUARDIANS) {
      newErrors.push(`You need exactly ${REQUIRED_GUARDIANS} guardians`);
    }

    data.guardians.forEach((guardian, index) => {
      if (!guardian.name.trim()) {
        newErrors.push(`Guardian ${index + 1}: Name is required`);
      }

      // Check if at least one contact method is provided
      const hasContact = guardian.email?.trim() || guardian.phone?.trim() || guardian.address?.trim();
      if (!hasContact) {
        newErrors.push(`Guardian ${index + 1}: At least one contact method is required`);
      }

      // Basic email validation
      if (guardian.email && guardian.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardian.email)) {
        newErrors.push(`Guardian ${index + 1}: Invalid email format`);
      }

      // Basic phone validation (allow various formats)
      if (guardian.phone && guardian.phone.trim() && !/^[\+\-\(\)\s\d]+$/.test(guardian.phone)) {
        newErrors.push(`Guardian ${index + 1}: Invalid phone format`);
      }

      // Basic address validation (Ethereum address)
      if (guardian.address && guardian.address.trim() && !/^0x[a-fA-F0-9]{40}$/.test(guardian.address)) {
        newErrors.push(`Guardian ${index + 1}: Invalid Ethereum address format`);
      }
    });

    // Check for duplicate names
    const names = data.guardians.map(g => g.name.trim().toLowerCase()).filter(Boolean);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      newErrors.push("Guardian names must be unique");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (validateGuardians()) {
      onNext();
    }
  };

  // Initialize with empty guardians if none exist
  if (data.guardians.length === 0) {
    const initialGuardians = Array(REQUIRED_GUARDIANS)
      .fill(null)
      .map(() => ({
        name: "",
        email: "",
        phone: "",
        address: "",
      }));
    updateData({ guardians: initialGuardians });
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Choose Your Guardians</CardTitle>
        <CardDescription>
          Select {REQUIRED_GUARDIANS} trusted friends or family members. You&apos;ll need {RECOVERY_THRESHOLD} of them to
          approve recovery if you lose your password or biometric access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Guardian Cards */}
        <div className="grid gap-4">
          {data.guardians.map((guardian, index) => (
            <Card key={index} className="border-2 border-dashed border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-indigo-100 rounded-full">
                      <UserIcon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <CardTitle className="text-lg">Guardian {index + 1}</CardTitle>
                  </div>
                  {data.guardians.length > REQUIRED_GUARDIANS && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeGuardian(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name - Required */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <UserIcon className="h-4 w-4 mr-1" />
                      Full Name *
                    </label>
                    <Input
                      value={guardian.name}
                      onChange={e => updateGuardian(index, "name", e.target.value)}
                      placeholder="Enter guardian's full name"
                      className={
                        errors.some(e => e.includes(`Guardian ${index + 1}`) && e.includes("Name"))
                          ? "border-red-500"
                          : ""
                      }
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <EnvelopeIcon className="h-4 w-4 mr-1" />
                      Email
                    </label>
                    <Input
                      type="email"
                      value={guardian.email || ""}
                      onChange={e => updateGuardian(index, "email", e.target.value)}
                      placeholder="guardian@example.com"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-1" />
                      Phone
                    </label>
                    <Input
                      type="tel"
                      value={guardian.phone || ""}
                      onChange={e => updateGuardian(index, "phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  {/* Ethereum Address */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <IdentificationIcon className="h-4 w-4 mr-1" />
                      Ethereum Address
                    </label>
                    <Input
                      value={guardian.address || ""}
                      onChange={e => updateGuardian(index, "address", e.target.value)}
                      placeholder="0x..."
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  * At least one contact method (email, phone, or address) is required
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Guardian Button */}
        {data.guardians.length < 8 && (
          <div className="text-center">
            <Button variant="outline" onClick={addGuardian}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Another Guardian
            </Button>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
              <div>
                <h4 className="font-medium text-red-800 mb-2">Please fix the following errors:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* How Guardian Recovery Works */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">How Guardian Recovery Works</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Guardians help protect the third piece of your private key</li>
                <li>
                  • You need {RECOVERY_THRESHOLD} out of {REQUIRED_GUARDIANS} guardians to approve recovery
                </li>
                <li>• Recovery requests have a 7-day delay for security</li>
                <li>• Guardians verify your identity through the contact methods you provide</li>
                <li>• Choose people you trust who will respond when needed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Guardian Tips */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">💡 Tips for Choosing Guardians</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Choose friends and family who are reliable and tech-savvy</li>
            <li>• Spread guardians across different locations and social circles</li>
            <li>• Include people you can easily contact through multiple channels</li>
            <li>• Consider people who understand the importance of this responsibility</li>
            <li>• Let them know they&apos;ll be your recovery guardians beforehand</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev}>
            Back
          </Button>
          <Button onClick={handleNext} disabled={data.guardians.length < REQUIRED_GUARDIANS} className="min-w-32">
            Continue
            <ChevronRightIcon className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
