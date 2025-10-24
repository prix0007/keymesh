#!/bin/bash

# Keymesh Base Mainnet Deployment Script
# WARNING: This script deploys to mainnet and costs real money!

set -e

echo "🚀 Keymesh Base Mainnet Deployment Script"
echo "⚠️  WARNING: This will cost real ETH on Base mainnet!"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "packages/foundry/foundry.toml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Change to foundry directory
cd packages/foundry

print_status "Checking prerequisites..."

# Check if foundry is installed
if ! command -v forge &> /dev/null; then
    print_error "Foundry is not installed. Install it from https://getfoundry.sh/"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Copy .env.example and configure it first."
    echo "Run: cp .env.example .env"
    exit 1
fi

# Check if DEPLOYER_PRIVATE_KEY is set
if ! grep -q "DEPLOYER_PRIVATE_KEY=" .env || grep -q "DEPLOYER_PRIVATE_KEY=$" .env; then
    print_error "DEPLOYER_PRIVATE_KEY not set in .env file"
    exit 1
fi

# Check if BASESCAN_API_KEY is set
if ! grep -q "BASESCAN_API_KEY=" .env || grep -q "BASESCAN_API_KEY=$" .env; then
    print_warning "BASESCAN_API_KEY not set. Contract verification will fail."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_status "Compiling contracts..."
forge build

if [ $? -ne 0 ]; then
    print_error "Contract compilation failed"
    exit 1
fi

print_success "Contracts compiled successfully"

print_status "Running tests..."
forge test

if [ $? -ne 0 ]; then
    print_error "Tests failed"
    exit 1
fi

print_success "All tests passed"

print_warning "FINAL WARNING: You are about to deploy to Base mainnet!"
print_warning "This will cost real ETH. Make sure you:"
print_warning "1. Have sufficient ETH in your deployment wallet"
print_warning "2. Are using a dedicated deployment wallet"
print_warning "3. Have reviewed the DEPLOYMENT.md guide"
echo ""

read -p "Are you absolutely sure you want to proceed? (yes/NO): " -r
if [[ ! $REPLY == "yes" ]]; then
    print_status "Deployment cancelled"
    exit 0
fi

print_status "Running deployment simulation..."
forge script script/DeployBase.s.sol --rpc-url base

if [ $? -ne 0 ]; then
    print_error "Deployment simulation failed"
    exit 1
fi

print_success "Simulation successful"
echo ""

read -p "Simulation passed. Deploy for real? (yes/NO): " -r
if [[ ! $REPLY == "yes" ]]; then
    print_status "Deployment cancelled"
    exit 0
fi

print_status "🚀 Starting mainnet deployment..."
print_status "This may take several minutes..."

# Deploy with verification
forge script script/DeployBase.s.sol --rpc-url base --broadcast --verify

if [ $? -eq 0 ]; then
    print_success "🎉 Deployment completed successfully!"
    print_status "Next steps:"
    echo "1. Check contract on Basescan"
    echo "2. Test frontend integration"
    echo "3. Run post-deployment verification"
    echo "4. Update production environment"

    print_status "Deployment files saved to:"
    echo "- broadcast/DeployBase.s.sol/8453/"
    echo "- deployments/"

else
    print_error "❌ Deployment failed!"
    print_status "Check the error messages above"
    print_status "You may need to:"
    echo "1. Add more ETH to your deployment wallet"
    echo "2. Check your RPC connection"
    echo "3. Verify your environment variables"
    exit 1
fi

# Return to project root
cd ../..