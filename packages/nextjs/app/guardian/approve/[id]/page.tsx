"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldCheckIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";
import { formatAddress } from "@/lib/utils";

interface RecoveryRequest {
  id: string;
  userAddress: string;
  userName?: string;
  initiatedAt: Date;
  type: 'standard' | 'emergency';
  reason?: string;
  timeRemaining: number; // hours
  approvalsReceived: number;
  approvalsRequired: number;
  approvedBy: string[];
  status: 'pending' | 'approved' | 'declined' | 'completed';
}

export default function GuardianApproval() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  // Mock data - in real app, this would be fetched from API
  const [request] = useState<RecoveryRequest>({
    id: requestId,
    userAddress: "0x742d35Cc6634C0532925a3b8D6Cd8e5f47a48345",
    userName: "Alice Johnson",
    initiatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    type: "standard",
    reason: "Lost access to my device and need to recover my wallet",
    timeRemaining: 166, // ~7 days remaining
    approvalsReceived: 1,
    approvalsRequired: 3,
    approvedBy: ["0x123...abc"],
    status: "pending"
  });

  const [checklist, setChecklist] = useState({
    contactedUser: false,
    verifiedIdentity: false,
    noCoercion: false,
    understoodRequest: false
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [decision, setDecision] = useState<'approve' | 'decline' | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const allChecklistComplete = Object.values(checklist).every(Boolean);

  const handleChecklistChange = (key: keyof typeof checklist, value: boolean) => {
    setChecklist(prev => ({ ...prev, [key]: value }));
  };

  const handleApprove = async () => {
    if (!allChecklistComplete) return;

    setIsProcessing(true);
    setDecision('approve');

    try {
      // In real app, this would call the API to approve the recovery
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Navigate to success page
      router.push(`/guardian/approve/${requestId}/success?action=approved`);
    } catch (error) {
      console.error("Failed to approve recovery:", error);
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) return;

    setIsProcessing(true);
    setDecision('decline');

    try {
      // In real app, this would call the API to decline the recovery
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Navigate to success page
      router.push(`/guardian/approve/${requestId}/success?action=declined`);
    } catch (error) {
      console.error("Failed to decline recovery:", error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center">
              <ShieldCheckIcon className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Guardian Approval Required</h1>
            <p className="text-gray-600">
              Someone needs your help to recover their wallet
            </p>
          </div>

          {/* Request Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Recovery Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">From:</p>
                  <p className="font-medium">{request.userName || "Unknown User"}</p>
                  <p className="font-mono text-sm text-gray-600">{formatAddress(request.userAddress, 8)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Request Type:</p>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    request.type === 'emergency'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {request.type === 'emergency' ? '🚨 Emergency' : '📋 Standard'} Recovery
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Initiated:</p>
                  <p className="text-sm">{request.initiatedAt.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Time Remaining:</p>
                  <p className="text-sm font-medium text-amber-600">
                    {Math.floor(request.timeRemaining / 24)}d {request.timeRemaining % 24}h
                  </p>
                </div>
              </div>

              {request.reason && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border italic">
                    "{request.reason}"
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <InformationCircleIcon className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-800">Approval Progress</p>
                </div>
                <p className="text-sm text-blue-700">
                  {request.approvalsReceived} of {request.approvalsRequired} required approvals received
                </p>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(request.approvalsReceived / request.approvalsRequired) * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Checklist */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-amber-800">⚠️ Verification Required</CardTitle>
              <CardDescription>
                Complete ALL verification steps before approving this request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={checklist.contactedUser}
                    onChange={(e) => handleChecklistChange('contactedUser', e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">I have contacted this person directly</span>
                    <p className="text-sm text-gray-600">
                      Call, text, or message them through a separate channel to confirm this request
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={checklist.verifiedIdentity}
                    onChange={(e) => handleChecklistChange('verifiedIdentity', e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">I have verified their identity</span>
                    <p className="text-sm text-gray-600">
                      Confirm they are who they claim to be through personal questions or verification
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={checklist.noCoercion}
                    onChange={(e) => handleChecklistChange('noCoercion', e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">This is not a coercion situation</span>
                    <p className="text-sm text-gray-600">
                      They are making this request freely and are not being forced or threatened
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={checklist.understoodRequest}
                    onChange={(e) => handleChecklistChange('understoodRequest', e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">I understand this request and its implications</span>
                    <p className="text-sm text-gray-600">
                      This will help them regain access to their wallet and cryptocurrency
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Contact Suggestions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                How to Contact Them
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <PhoneIcon className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Phone Call</p>
                  <p className="text-xs text-gray-600">Most secure option</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <EnvelopeIcon className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Text Message</p>
                  <p className="text-xs text-gray-600">Quick verification</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Social Media</p>
                  <p className="text-xs text-gray-600">Alternative channel</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 text-center mt-4">
                Ask them personal questions only they would know to verify their identity
              </p>
            </CardContent>
          </Card>

          {/* Warning Signs */}
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                🚩 Red Flags - Decline if you notice these
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• You cannot reach them through normal channels</li>
                <li>• They seem stressed, rushed, or under pressure</li>
                <li>• They can't answer personal questions correctly</li>
                <li>• The request seems out of character for them</li>
                <li>• They mention threats or someone forcing them</li>
                <li>• You have any doubt about the legitimacy</li>
              </ul>
            </CardContent>
          </Card>

          {/* Decline Reason */}
          {decision === 'decline' && (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-800">Reason for Declining</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Please explain why you're declining this request..."
                  className="w-full p-3 border rounded-lg"
                  rows={3}
                />
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="destructive"
              onClick={() => setDecision('decline')}
              disabled={isProcessing}
              className="flex-1"
            >
              {decision === 'decline' && !declineReason.trim() ? (
                "Enter decline reason above"
              ) : decision === 'decline' && isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Declining...
                </>
              ) : (
                "Decline Request"
              )}
            </Button>

            <Button
              onClick={decision === 'decline' ? handleDecline : handleApprove}
              disabled={
                isProcessing ||
                (decision !== 'decline' && !allChecklistComplete) ||
                (decision === 'decline' && !declineReason.trim())
              }
              className="flex-1"
            >
              {decision === 'approve' && isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Approving...
                </>
              ) : decision === 'decline' ? (
                "Confirm Decline"
              ) : !allChecklistComplete ? (
                "Complete verification first"
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Approve Recovery
                </>
              )}
            </Button>
          </div>

          {/* Help */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Need help? Contact Keymesh support or review the guardian guide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}