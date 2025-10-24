"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  KeyIcon,
  ShieldCheckIcon,
  UsersIcon,
  ClockIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  ArrowRightIcon,
  CogIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  PlusIcon,
  BellIcon,
  CloudArrowUpIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";
import { useAccount } from "wagmi";
import { formatAddress } from "@/lib/utils";

interface RecoverySetup {
  hasPassword: boolean;
  hasBiometric: boolean;
  biometricType?: string;
  guardianCount: number;
  isActive: boolean;
  lastActivity: Date;
}

interface ActiveRecovery {
  id: string;
  type: 'password_social' | 'biometric_social';
  initiatedAt: Date;
  approvals: number;
  requiredApprovals: number;
  timeRemaining: number; // hours
  status: 'pending' | 'approved' | 'expired';
}

interface Notification {
  id: string;
  type: 'guardian_request' | 'recovery_approved' | 'heartbeat_missed' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface DASubmission {
  blockNumber: number;
  txIndex: number;
  dataHash: string;
  merkleRoot: string;
  dataSize: number;
  timestamp: Date;
  metadata: any;
}

interface DAData {
  submissions: DASubmission[];
  totalSize: number;
  totalCost: number;
  currency: string;
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [recoverySetup, setRecoverySetup] = useState<RecoverySetup | null>(null);
  const [activeRecovery, setActiveRecovery] = useState<ActiveRecovery | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [heartbeatStatus, setHeartbeatStatus] = useState<'active' | 'warning' | 'critical'>('active');
  const [lastHeartbeat, setLastHeartbeat] = useState<Date>(new Date());
  const [daData, setDaData] = useState<DAData | null>(null);
  const [loadingDA, setLoadingDA] = useState(false);

  // Load user data
  useEffect(() => {
    if (isConnected && address) {
      // Simulate loading user data
      setRecoverySetup({
        hasPassword: true,
        hasBiometric: true,
        biometricType: 'face',
        guardianCount: 5,
        isActive: true,
        lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      });

      // Mock notifications
      setNotifications([
        {
          id: '1',
          type: 'guardian_request',
          title: 'Guardian Approval Needed',
          message: 'John Doe is requesting to become your guardian',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          isRead: false
        },
        {
          id: '2',
          type: 'heartbeat_missed',
          title: 'Heartbeat Reminder',
          message: 'Your last activity was 5 days ago. Consider sending a heartbeat.',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
          isRead: false
        }
      ]);

      // Mock heartbeat status
      const daysSinceLastActivity = Math.floor((Date.now() - new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastActivity > 30) {
        setHeartbeatStatus('critical');
      } else if (daysSinceLastActivity > 14) {
        setHeartbeatStatus('warning');
      }

      // Load DA data
      loadDAData();
    }
  }, [isConnected, address]);

  const loadDAData = async () => {
    if (!address) return;

    setLoadingDA(true);
    try {
      const response = await fetch(`/api/avail/user-data?address=${address}`);
      const data = await response.json();

      if (response.ok) {
        setDaData(data);
      } else {
        console.error('Error loading DA data:', data.error);
      }
    } catch (error) {
      console.error('Error loading DA data:', error);
    } finally {
      setLoadingDA(false);
    }
  };

  const downloadDAData = async (submission: DASubmission) => {
    try {
      const response = await fetch('/api/avail/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockNumber: submission.blockNumber,
          txIndex: submission.txIndex,
          expectedHash: submission.dataHash
        })
      });

      const result = await response.json();
      if (result.success && result.data) {
        // Convert base64 to blob and download
        const byteCharacters = atob(result.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `recovery-data-${submission.blockNumber}-${submission.txIndex}.bin`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to retrieve data: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error downloading DA data:', error);
      alert('Error downloading data');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <KeyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-4">
              Please connect your wallet to view your recovery dashboard.
            </p>
            <Button>Connect Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.isRead).length;
  const recoveryProgress = recoverySetup ?
    (Number(recoverySetup.hasPassword) + Number(recoverySetup.hasBiometric) + (recoverySetup.guardianCount >= 5 ? 1 : 0)) / 3 * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <KeyIcon className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Keymesh Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <BellIcon className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium">{formatAddress(address!, 6)}</p>
                <p className="text-xs text-gray-500">Connected</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recovery Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                      <span>Recovery Protection Status</span>
                    </CardTitle>
                    <CardDescription>Your wallet is protected and ready for recovery</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{Math.round(recoveryProgress)}%</div>
                    <div className="text-xs text-gray-500">Setup Complete</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={recoveryProgress} className="h-3" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-3 rounded-lg border-2 ${recoverySetup?.hasPassword ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <KeyIcon className={`h-4 w-4 ${recoverySetup?.hasPassword ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="font-medium text-sm">Password</span>
                      {recoverySetup?.hasPassword && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
                    </div>
                    <p className="text-xs text-gray-600">
                      {recoverySetup?.hasPassword ? 'Protected' : 'Not set up'}
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border-2 ${recoverySetup?.hasBiometric ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <ShieldCheckIcon className={`h-4 w-4 ${recoverySetup?.hasBiometric ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="font-medium text-sm">Biometric</span>
                      {recoverySetup?.hasBiometric && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
                    </div>
                    <p className="text-xs text-gray-600">
                      {recoverySetup?.hasBiometric ? `${recoverySetup.biometricType} ID` : 'Not set up'}
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border-2 ${(recoverySetup?.guardianCount || 0) >= 5 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <UsersIcon className={`h-4 w-4 ${(recoverySetup?.guardianCount || 0) >= 5 ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="font-medium text-sm">Guardians</span>
                      {(recoverySetup?.guardianCount || 0) >= 5 && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
                    </div>
                    <p className="text-xs text-gray-600">
                      {recoverySetup?.guardianCount || 0} of 5 active
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Recovery */}
            {activeRecovery && (
              <Card className="border-2 border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-yellow-800">
                    <ClockIcon className="h-5 w-5" />
                    <span>Active Recovery Request</span>
                  </CardTitle>
                  <CardDescription className="text-yellow-700">
                    A recovery process is currently in progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Recovery Type: {activeRecovery.type.replace('_', ' + ')}</p>
                      <p className="text-sm text-gray-600">
                        Initiated {new Date(activeRecovery.initiatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-600">
                        {Math.floor(activeRecovery.timeRemaining)}h remaining
                      </div>
                      <div className="text-sm text-gray-500">
                        {activeRecovery.approvals}/{activeRecovery.requiredApprovals} approvals
                      </div>
                    </div>
                  </div>

                  <Progress value={(activeRecovery.approvals / activeRecovery.requiredApprovals) * 100} />

                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button size="sm" variant="destructive">
                      Cancel Recovery
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks for managing your wallet recovery</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/recovery/initiate">
                    <Button variant="outline" className="w-full justify-start h-auto p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <KeyIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Initiate Recovery</div>
                          <div className="text-sm text-gray-500">Start wallet recovery process</div>
                        </div>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 ml-auto" />
                    </Button>
                  </Link>

                  <Link href="/guardians">
                    <Button variant="outline" className="w-full justify-start h-auto p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-full">
                          <UsersIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Manage Guardians</div>
                          <div className="text-sm text-gray-500">Update guardian information</div>
                        </div>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 ml-auto" />
                    </Button>
                  </Link>

                  <Button variant="outline" className="w-full justify-start h-auto p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <HeartIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Send Heartbeat</div>
                        <div className="text-sm text-gray-500">Confirm you're active</div>
                      </div>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 ml-auto" />
                  </Button>

                  <Link href="/settings">
                    <Button variant="outline" className="w-full justify-start h-auto p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <CogIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Settings</div>
                          <div className="text-sm text-gray-500">Update your preferences</div>
                        </div>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 ml-auto" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* DA Data Storage */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <CloudArrowUpIcon className="h-5 w-5 text-indigo-600" />
                      <span>Avail DA Storage</span>
                    </CardTitle>
                    <CardDescription>Your recovery data stored on decentralized availability</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadDAData} disabled={loadingDA}>
                    {loadingDA ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDA ? (
                  <div className="text-center py-8">
                    <CloudArrowUpIcon className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm text-gray-500">Loading DA data...</p>
                  </div>
                ) : daData && daData.submissions.length > 0 ? (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">{daData.submissions.length}</div>
                        <div className="text-xs text-gray-600">Data Pieces</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {(daData.totalSize / 1024).toFixed(1)}KB
                        </div>
                        <div className="text-xs text-gray-600">Total Size</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          ${daData.totalCost.toFixed(4)}
                        </div>
                        <div className="text-xs text-gray-600">Storage Cost</div>
                      </div>
                    </div>

                    {/* Data Submissions */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-gray-900">Stored Data Pieces</h4>
                      {daData.submissions.map((submission, index) => (
                        <div
                          key={`${submission.blockNumber}-${submission.txIndex}`}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-indigo-100 rounded-full">
                              <DocumentDuplicateIcon className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">
                                Piece #{index + 1}
                              </div>
                              <div className="text-xs text-gray-500">
                                Block {submission.blockNumber}, TX {submission.txIndex}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(submission.timestamp).toLocaleDateString()} • {(submission.dataSize / 1024).toFixed(1)}KB
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(submission.dataHash)}
                              title="Copy hash"
                            >
                              <DocumentDuplicateIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadDAData(submission)}
                              title="Download data"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Technical Details */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                        Technical Details
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded text-xs space-y-2">
                        <div>
                          <strong>Storage Method:</strong> Shamir Secret Sharing (3 pieces, 2 needed for recovery)
                        </div>
                        <div>
                          <strong>Encryption:</strong> AES-256-GCM with password and biometric keys
                        </div>
                        <div>
                          <strong>Availability:</strong> Permanently stored on Avail DA network
                        </div>
                        <div>
                          <strong>Verification:</strong> All pieces include cryptographic hash verification
                        </div>
                      </div>
                    </details>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CloudArrowUpIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-4">No recovery data found</p>
                    <Link href="/setup">
                      <Button size="sm">
                        Set Up Recovery
                        <ArrowRightIcon className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Heartbeat Status */}
            <Card className={`${
              heartbeatStatus === 'critical' ? 'border-red-200 bg-red-50' :
              heartbeatStatus === 'warning' ? 'border-yellow-200 bg-yellow-50' :
              'border-green-200 bg-green-50'
            }`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-lg flex items-center space-x-2 ${
                  heartbeatStatus === 'critical' ? 'text-red-800' :
                  heartbeatStatus === 'warning' ? 'text-yellow-800' :
                  'text-green-800'
                }`}>
                  <HeartIcon className="h-5 w-5" />
                  <span>Activity Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Last Activity:</span>
                    <span className="text-sm font-medium">
                      {lastHeartbeat.toLocaleDateString()}
                    </span>
                  </div>

                  {heartbeatStatus === 'critical' && (
                    <div className="bg-red-100 border border-red-300 rounded p-3">
                      <div className="flex items-start space-x-2">
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Critical: No recent activity</p>
                          <p className="text-xs text-red-700">Your inheritance plan may activate soon</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {heartbeatStatus === 'warning' && (
                    <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
                      <div className="flex items-start space-x-2">
                        <InformationCircleIcon className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Reminder needed</p>
                          <p className="text-xs text-yellow-700">Consider sending a heartbeat signal</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button size="sm" variant="outline" className="w-full">
                    <HeartIcon className="h-4 w-4 mr-1" />
                    Send Heartbeat
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Recent Activity</span>
                  {unreadNotifications > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                      {unreadNotifications} new
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifications.slice(0, 3).map((notification) => (
                    <div key={notification.id} className={`p-3 rounded-lg border ${notification.isRead ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-start space-x-2">
                        <BellIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-gray-600">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {notifications.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <BellIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No recent notifications</p>
                    </div>
                  )}

                  {notifications.length > 3 && (
                    <Button variant="outline" size="sm" className="w-full">
                      View All Notifications
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recovery Methods */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recovery Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Password + Biometric</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Instant</span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">Password + Social</span>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">7 days</span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">Biometric + Social</span>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">7 days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}