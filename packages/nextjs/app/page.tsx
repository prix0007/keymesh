"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldCheckIcon,
  KeyIcon,
  UsersIcon,
  CloudArrowUpIcon,
  QuestionMarkCircleIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function LandingPage() {
  const { address, isConnected } = useAccount();
  const [hasSetup, setHasSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(false);

  // Check if user has completed setup when wallet connects
  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!isConnected || !address) {
        setHasSetup(false);
        return;
      }

      setCheckingSetup(true);
      try {
        const response = await fetch(`/api/user/setup-status?address=${address}`);
        const data = await response.json();
        setHasSetup(data.hasSetup);
      } catch (error) {
        console.error('Error checking setup status:', error);
        setHasSetup(false);
      } finally {
        setCheckingSetup(false);
      }
    };

    checkSetupStatus();
  }, [isConnected, address]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-cyan-100 relative">
      {/* Background pattern for glass effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(120,119,198,0.3),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(56,178,172,0.3),transparent_50%)]"></div>
      <div className="relative z-10">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <KeyIcon className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">Keymesh</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/docs" className="text-gray-600 hover:text-gray-900">
              Docs
            </Link>
            {isConnected && hasSetup ? (
              <Link href="/dashboard">
                <Button variant="solid" className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Go to Dashboard</span>
                </Button>
              </Link>
            ) : (
              <div className="flex items-center space-x-3">
                <ConnectButton />
                {!hasSetup && (
                  <Link href="/setup">
                    <Button variant="solid">Get Started</Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          {isConnected && hasSetup ? (
            <>
              <div className="mx-auto mb-6 p-4 bg-green-100 rounded-full w-20 h-20 flex items-center justify-center">
                <CheckCircleIcon className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Welcome Back!
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                  {" "}Your Wallet is Protected{" "}
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Your wallet recovery is active and secure. Monitor your setup, test recovery methods,
                and manage your guardians from your dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard">
                  <Button variant="solid" size="lg" className="w-full sm:w-auto">
                    <CheckCircleIcon className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/recovery">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Test Recovery
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Never Lose Your
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-600">
                  {" "}Crypto{" "}
                </span>
                Again
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Secure social recovery powered by Avail DA. Your keys are protected by trusted friends,
                biometrics, and cryptography - no single point of failure.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {isConnected ? (
                  <Link href="/setup">
                    <Button variant="solid" size="lg" className="w-full sm:w-auto">
                      Protect Your Wallet
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <div className="w-full sm:w-auto">
                    <ConnectButton />
                  </div>
                )}
                <Link href="#how-it-works">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Learn How It Works
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How Keymesh Protects Your Wallet
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your private key is split into 3 encrypted pieces. You only need any 2 to recover your wallet.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="text-center p-6 bg-white/90 backdrop-blur-sm border border-blue-200 shadow-lg">
            <CardHeader>
              <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center">
                <KeyIcon className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-gray-900">Step 1: Create Password & Biometric</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-700">
                Set up a strong password and register your biometric (face/fingerprint).
                These encrypt two pieces of your key.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center p-6 bg-white/90 backdrop-blur-sm border border-blue-200 shadow-lg">
            <CardHeader>
              <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center">
                <UsersIcon className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-gray-900">Step 2: Choose 5 Trusted Friends</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-700">
                Select 5 guardians you trust. They'll help protect the third piece.
                You need 3 of them to approve recovery.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center p-6 bg-white/90 backdrop-blur-sm border border-blue-200 shadow-lg">
            <CardHeader>
              <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center">
                <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-gray-900">Step 3: Your Keys Are Protected</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-700">
                All pieces are stored on Avail DA permanently. No one can access
                your wallet without your approval.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Recovery Methods */}
        <div className="mt-16 bg-gray-50 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-center mb-8">Three Ways to Recover</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-medium mb-2 inline-block">
                Instant
              </div>
              <h4 className="font-semibold mb-2">Password + Biometric</h4>
              <p className="text-sm text-gray-600">Recover immediately with your password and biometric</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-sm font-medium mb-2 inline-block">
                7 Days
              </div>
              <h4 className="font-semibold mb-2">Password + Social</h4>
              <p className="text-sm text-gray-600">Use password + 3 guardian approvals (7-day delay)</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-sm font-medium mb-2 inline-block">
                7 Days
              </div>
              <h4 className="font-semibold mb-2">Biometric + Social</h4>
              <p className="text-sm text-gray-600">Use biometric + 3 guardian approvals (7-day delay)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Keymesh
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center">
              <ShieldCheckIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="font-semibold mb-2">Decentralized</h3>
            <p className="text-sm text-gray-600">No single point of failure. Your data is distributed across Avail DA.</p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-cyan-100 rounded-full w-16 h-16 flex items-center justify-center">
              <KeyIcon className="h-8 w-8 text-cyan-600" />
            </div>
            <h3 className="font-semibold mb-2">Three Recovery Paths</h3>
            <p className="text-sm text-gray-600">Password, biometric, or social recovery. Multiple ways to regain access.</p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center">
              <CloudArrowUpIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Inheritance Built-in</h3>
            <p className="text-sm text-gray-600">Auto-transfer to heirs after 2 years of inactivity. Plan for the future.</p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center">
              <span className="text-purple-600 font-bold text-lg">$</span>
            </div>
            <h3 className="font-semibold mb-2">Low Cost</h3>
            <p className="text-sm text-gray-600">~$0.03 one-time cost for permanent storage on Avail DA.</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-20 bg-gray-50">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {[
            {
              question: "What happens if I forget my password?",
              answer: "You can still recover using your biometric + 3 guardian approvals, or wait for the 7-day social recovery period."
            },
            {
              question: "Who are guardians and what do they do?",
              answer: "Guardians are trusted friends/family who help protect your wallet. They approve recovery requests after verifying your identity through separate channels."
            },
            {
              question: "Is my key safe?",
              answer: "Yes. Your key is split using Shamir Secret Sharing and encrypted with AES-256. No single party can access your wallet without your permission."
            },
            {
              question: "How much does it cost?",
              answer: "One-time cost of ~$0.03 to store your encrypted pieces permanently on Avail DA. No monthly fees."
            },
            {
              question: "What if Avail goes down?",
              answer: "Avail DA is designed for permanent data availability. Even if some nodes go offline, your data remains accessible through the decentralized network."
            }
          ].map((faq, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QuestionMarkCircleIcon className="h-5 w-5 text-indigo-600" />
                  {faq.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {faq.answer}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Protect Your Wallet?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of users who trust Keymesh to keep their crypto safe.
          </p>
          <Link href="/setup">
            <Button variant="solid" size="lg">
              Get Started Now
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <KeyIcon className="h-6 w-6 text-indigo-600" />
              <span className="text-lg font-semibold text-gray-900">Keymesh</span>
            </div>
            <div className="flex space-x-6 text-sm text-gray-600">
              <Link href="/docs" className="hover:text-gray-900">Documentation</Link>
              <Link href="/security" className="hover:text-gray-900">Security</Link>
              <Link href="/contact" className="hover:text-gray-900">Contact</Link>
            </div>
          </div>
          <div className="text-center text-sm text-gray-500 mt-4">
            © 2024 Keymesh. Your keys, woven together.
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
