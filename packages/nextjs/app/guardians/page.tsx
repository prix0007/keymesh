"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatAddress } from "@/lib/utils";
import { useAccount } from "wagmi";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  InformationCircleIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface Guardian {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: "pending" | "accepted" | "declined" | "inactive";
  addedAt: Date;
  acceptedAt?: Date;
  lastActivity?: Date;
}

export default function GuardianManagement() {
  const { isConnected } = useAccount();
  const [guardians, setGuardians] = useState<Guardian[]>([
    {
      id: "1",
      name: "Alice Johnson",
      email: "alice@example.com",
      status: "accepted",
      addedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "2",
      name: "Bob Smith",
      phone: "+1-555-0123",
      address: "0x742d35Cc6634C0532925a3b8D6Cd8e5f47a48345",
      status: "accepted",
      addedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
      lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "3",
      name: "Carol Davis",
      email: "carol@example.com",
      status: "pending",
      addedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: "4",
      name: "David Wilson",
      phone: "+1-555-0456",
      status: "pending",
      addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: "5",
      name: "Eva Brown",
      email: "eva@example.com",
      address: "0x8ba1f109551bD432803012645Hac136c4dddd567",
      status: "declined",
      addedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newGuardian, setNewGuardian] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const handleAddGuardian = () => {
    if (!newGuardian.name.trim()) return;

    const guardian: Guardian = {
      id: Date.now().toString(),
      name: newGuardian.name,
      email: newGuardian.email || undefined,
      phone: newGuardian.phone || undefined,
      address: newGuardian.address || undefined,
      status: "pending",
      addedAt: new Date(),
    };

    setGuardians([...guardians, guardian]);
    setNewGuardian({ name: "", email: "", phone: "", address: "" });
    setShowAddForm(false);
  };

  const handleRemoveGuardian = (id: string) => {
    setGuardians(guardians.filter(g => g.id !== id));
  };

  const handleResendInvitation = (id: string) => {
    // In real app, this would resend the invitation
    console.log("Resending invitation to guardian:", id);
  };

  const getStatusIcon = (status: Guardian["status"]) => {
    switch (status) {
      case "accepted":
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case "pending":
        return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case "declined":
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      case "inactive":
        return <XCircleIcon className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: Guardian["status"]) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "declined":
        return "bg-red-100 text-red-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const acceptedGuardians = guardians.filter(g => g.status === "accepted").length;
  const pendingGuardians = guardians.filter(g => g.status === "pending").length;
  const totalGuardians = guardians.length;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-4">Please connect your wallet to manage your guardians.</p>
            <Button>Connect Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Guardian Management</h1>
              <p className="text-gray-600">Manage the people who help protect your wallet</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600">{totalGuardians}</div>
                <div className="text-sm text-gray-600">Total Guardians</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{acceptedGuardians}</div>
                <div className="text-sm text-gray-600">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{pendingGuardians}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">3 / 5</div>
                <div className="text-sm text-gray-600">Required for Recovery</div>
              </CardContent>
            </Card>
          </div>

          {/* Requirements Check */}
          {acceptedGuardians < 5 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 mb-1">Incomplete Guardian Setup</h4>
                    <p className="text-sm text-amber-700">
                      You need 5 active guardians for full protection. You currently have {acceptedGuardians} active.
                      {pendingGuardians > 0 && ` ${pendingGuardians} more guardians are pending approval.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Guardian Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Guardians</CardTitle>
                  <CardDescription>People who can help you recover your wallet in case of emergency</CardDescription>
                </div>
                <Button onClick={() => setShowAddForm(true)} disabled={totalGuardians >= 8}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Guardian
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAddForm && (
                <Card className="mb-6 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-blue-800">Add New Guardian</CardTitle>
                    <CardDescription className="text-blue-700">
                      Add someone you trust to help protect your wallet
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Full Name *</label>
                        <Input
                          value={newGuardian.name}
                          onChange={e => setNewGuardian({ ...newGuardian, name: e.target.value })}
                          placeholder="Enter guardian's full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input
                          type="email"
                          value={newGuardian.email}
                          onChange={e => setNewGuardian({ ...newGuardian, email: e.target.value })}
                          placeholder="guardian@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone</label>
                        <Input
                          type="tel"
                          value={newGuardian.phone}
                          onChange={e => setNewGuardian({ ...newGuardian, phone: e.target.value })}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ethereum Address</label>
                        <Input
                          value={newGuardian.address}
                          onChange={e => setNewGuardian({ ...newGuardian, address: e.target.value })}
                          placeholder="0x..."
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-blue-700">
                      * At least one contact method (email, phone, or address) is required
                    </p>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddGuardian} disabled={!newGuardian.name.trim()}>
                        Add Guardian
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Guardian List */}
              <div className="space-y-4">
                {guardians.map(guardian => (
                  <Card key={guardian.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="p-2 bg-gray-100 rounded-full">
                            <UsersIcon className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold">{guardian.name}</h3>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(guardian.status)}`}
                              >
                                {getStatusIcon(guardian.status)}
                                <span className="ml-1">
                                  {guardian.status.charAt(0).toUpperCase() + guardian.status.slice(1)}
                                </span>
                              </span>
                            </div>

                            <div className="space-y-1">
                              {guardian.email && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                                  {guardian.email}
                                </div>
                              )}
                              {guardian.phone && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <PhoneIcon className="h-4 w-4 mr-2" />
                                  {guardian.phone}
                                </div>
                              )}
                              {guardian.address && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <IdentificationIcon className="h-4 w-4 mr-2" />
                                  <span className="font-mono">{formatAddress(guardian.address)}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-2 text-xs text-gray-500">
                              <div>Added: {guardian.addedAt.toLocaleDateString()}</div>
                              {guardian.acceptedAt && <div>Accepted: {guardian.acceptedAt.toLocaleDateString()}</div>}
                              {guardian.lastActivity && guardian.status === "accepted" && (
                                <div>Last activity: {guardian.lastActivity.toLocaleDateString()}</div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2">
                          {guardian.status === "pending" && (
                            <Button variant="outline" size="sm" onClick={() => handleResendInvitation(guardian.id)}>
                              Resend Invite
                            </Button>
                          )}
                          <div className="flex space-x-1">
                            <Button variant="outline" size="sm">
                              <PencilIcon className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveGuardian(guardian.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {guardians.length === 0 && (
                  <div className="text-center py-12">
                    <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Guardians Yet</h3>
                    <p className="text-gray-600 mb-4">Add trusted friends and family to help protect your wallet</p>
                    <Button onClick={() => setShowAddForm(true)}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Your First Guardian
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Guardian Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <InformationCircleIcon className="h-5 w-5 mr-2" />
                Guardian Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Choosing Good Guardians</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Select people you trust completely</li>
                    <li>• Choose tech-savvy individuals if possible</li>
                    <li>• Include family and close friends</li>
                    <li>• Spread across different locations</li>
                    <li>• Ensure they understand their role</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Guardian Responsibilities</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Verify your identity before approving recovery</li>
                    <li>• Respond promptly to legitimate requests</li>
                    <li>• Keep their contact information updated</li>
                    <li>• Never approve suspicious requests</li>
                    <li>• Contact you directly to confirm requests</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recovery Test */}
          <Card>
            <CardHeader>
              <CardTitle>Test Your Guardian Network</CardTitle>
              <CardDescription>Verify your guardians can receive and respond to recovery requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Run a test recovery to ensure your guardian network is working properly. This won&apos;t actually recover
                    your wallet.
                  </p>
                  <p className="text-xs text-gray-500">Recommended: Test quarterly or after adding new guardians</p>
                </div>
                <Button variant="outline" disabled={acceptedGuardians < 3}>
                  <ArrowRightIcon className="h-4 w-4 mr-2" />
                  Test Recovery
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
