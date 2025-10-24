"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import { SetupData } from "@/app/setup/page";

interface PasswordStepProps {
  data: SetupData;
  updateData: (data: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
}

const checkPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 12) {
    score += 25;
  } else {
    feedback.push("Use at least 12 characters");
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 25;
  } else {
    feedback.push("Include both uppercase and lowercase letters");
  }

  if (/\d/.test(password)) {
    score += 25;
  } else {
    feedback.push("Include at least one number");
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 25;
  } else {
    feedback.push("Include at least one special character");
  }

  let color = "bg-red-500";
  if (score >= 75) color = "bg-green-500";
  else if (score >= 50) color = "bg-yellow-500";
  else if (score >= 25) color = "bg-orange-500";

  return { score, feedback, color };
};

export default function PasswordStep({ data, updateData, onNext, onPrev }: PasswordStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = checkPasswordStrength(data.password);
  const passwordsMatch = data.password === data.confirmPassword && data.confirmPassword.length > 0;
  const isValid = passwordStrength.score >= 75 && passwordsMatch;

  const handlePasswordChange = (password: string) => {
    updateData({ password });
  };

  const handleConfirmPasswordChange = (confirmPassword: string) => {
    updateData({ confirmPassword });
  };

  const handleNext = () => {
    if (isValid) {
      onNext();
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Your Master Password</CardTitle>
        <CardDescription>
          Your password encrypts one piece of your private key. Choose a strong password you'll remember.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Password Input */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Master Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={data.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Enter a strong password"
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

        {/* Password Strength */}
        {data.password && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Password Strength</span>
              <span className="text-gray-500">{passwordStrength.score}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full ${passwordStrength.color} transition-all`} style={{ width: `${passwordStrength.score}%` }} />
            </div>

            {passwordStrength.feedback.length > 0 && (
              <div className="space-y-1">
                {passwordStrength.feedback.map((item, index) => (
                  <div key={index} className="flex items-center text-sm text-red-600">
                    <XCircleIcon className="h-4 w-4 mr-2" />
                    {item}
                  </div>
                ))}
              </div>
            )}

            {passwordStrength.score >= 75 && (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Strong password!
              </div>
            )}
          </div>
        )}

        {/* Confirm Password */}
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={data.confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              placeholder="Re-enter your password"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <EyeIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Password Match Indicator */}
        {data.confirmPassword && (
          <div className="flex items-center text-sm">
            {passwordsMatch ? (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600" />
                <span className="text-green-600">Passwords match</span>
              </>
            ) : (
              <>
                <XCircleIcon className="h-4 w-4 mr-2 text-red-600" />
                <span className="text-red-600">Passwords don't match</span>
              </>
            )}
          </div>
        )}

        {/* Security Note */}
        <div className="glass rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Security Note</h4>
          <p className="text-sm text-blue-800">
            Your password is used to encrypt one piece of your private key locally.
            We never store your password on our servers. Make sure you remember it or store it safely.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev}>
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isValid}
            className="min-w-32"
          >
            Continue
            <ChevronRightIcon className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}