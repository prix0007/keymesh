# Keymesh Deployment Guide - Base Mainnet

## Overview
This guide covers deploying the Keymesh social recovery system to Base mainnet. **This will cost real money** - ensure you're ready before proceeding.

## Prerequisites

### 1. Environment Setup
```bash
# Copy and configure environment variables
cp .env.example .env
```

Edit `.env` and add:
```bash
# REQUIRED: Your deployment private key (NEVER commit this)
DEPLOYER_PRIVATE_KEY=0x1234567890abcdef...

# REQUIRED: Base API key for contract verification
BASESCAN_API_KEY=your_basescan_api_key

# OPTIONAL: Alchemy API key for better RPC (recommended for production)
ALCHEMY_API_KEY=your_alchemy_api_key
```

### 2. Wallet Requirements
- **ETH on Base mainnet**: Minimum 0.01 ETH for deployment (recommended: 0.05 ETH for safety)
- **Dedicated deployment wallet**: Use a separate wallet for deployment security
- **Private key security**: Never share or commit your private key

### 3. API Keys Setup
1. **Basescan API Key**: Get from https://basescan.org/apis
2. **Alchemy API Key** (optional but recommended): Get from https://dashboard.alchemy.com/

## Pre-Deployment Checklist

### Security Checklist
- [ ] Using a dedicated deployment wallet (not your main wallet)
- [ ] Deployment wallet has minimal funds (only what's needed)
- [ ] Private key is stored securely (not in plaintext files)
- [ ] `.env` file is in `.gitignore` and won't be committed
- [ ] You have backups of all important information

### Technical Checklist
- [ ] Local testing completed successfully
- [ ] All contracts compile without errors
- [ ] Test suite passes completely
- [ ] Environment variables configured
- [ ] Base mainnet RPC is accessible
- [ ] Sufficient ETH balance for deployment

## Deployment Steps

### Step 1: Verify Environment
```bash
# Check foundry installation
forge --version

# Verify compilation
forge build

# Run tests locally
forge test
```

### Step 2: Dry Run (Simulation)
```bash
# Simulate deployment without broadcasting
forge script script/DeployBase.s.sol --rpc-url base

# This will show you:
# - Gas estimates
# - Contract addresses (simulated)
# - Any potential errors
```

### Step 3: Deploy to Base Mainnet
```bash
# IMPORTANT: This costs real money!
forge script script/DeployBase.s.sol --rpc-url base --broadcast --verify

# What this does:
# - Deploys SocialRecovery contract to Base mainnet
# - Verifies contract source code on Basescan
# - Exports deployment info for frontend
# - Runs safety checks before deployment
```

### Step 4: Post-Deployment Verification
```bash
# Verify deployment worked correctly
SOCIAL_RECOVERY_ADDRESS=<deployed_address> forge script script/VerifyBase.s.sol --rpc-url base

# Check contract on Basescan
# Visit: https://basescan.org/address/<deployed_address>
```

## Expected Costs

### Gas Estimates (Base Mainnet)
- **SocialRecovery Deployment**: ~1,500,000 gas
- **Contract Verification**: Free (but requires API key)
- **Total Cost**: ~0.003-0.01 ETH (depending on gas price)

### Current Gas Prices
Check current Base gas prices at: https://basescan.org/gastracker

## Deployment Output

After successful deployment, you'll see:
```
=== KEYMESH DEPLOYMENT TO BASE MAINNET SUCCESSFUL ===
SocialRecovery deployed at: 0x1234567890abcdef...
Deployer: 0x9876543210fedcba...
Chain ID: 8453
Gas Used: 1,523,456
Total Cost (ETH): 0.004561369
===============================================
```

## Next Steps After Deployment

### 1. Update Frontend Configuration
```bash
# The deployment script automatically updates:
# packages/nextjs/contracts/deployedContracts.ts

# Verify the contract address is correct in the frontend
```

### 2. Test Frontend Integration
```bash
# Start frontend with new contract address
cd packages/nextjs
yarn start

# Test complete flow with deployed contracts
```

### 3. Production Environment Setup
1. Update environment variables for production
2. Configure proper RPC endpoints
3. Set up monitoring and alerts
4. Prepare incident response procedures

## Troubleshooting

### Common Issues

#### "Insufficient funds for intrinsic transaction cost"
- **Cause**: Not enough ETH for gas
- **Solution**: Add more ETH to deployment wallet

#### "Contract verification failed"
- **Cause**: Wrong API key or network settings
- **Solution**: Check BASESCAN_API_KEY in .env

#### "RPC timeout" or "Connection refused"
- **Cause**: RPC endpoint issues
- **Solution**: Use Alchemy RPC URL instead of public endpoint

#### "Private key not found"
- **Cause**: DEPLOYER_PRIVATE_KEY not set
- **Solution**: Set proper private key in .env (without 0x prefix)

### Getting Help
1. Check deployment logs for specific error messages
2. Verify environment configuration
3. Test on Base Sepolia testnet first if needed
4. Contact team if persistent issues

## Security Reminders

### After Deployment
- [ ] Remove private key from environment or secure it properly
- [ ] Monitor deployed contracts for unusual activity
- [ ] Set up alerts for contract interactions
- [ ] Prepare emergency procedures

### Contract Management
- [ ] Document all deployed addresses
- [ ] Set up proper access controls
- [ ] Plan for potential upgrades or migrations
- [ ] Monitor gas costs and optimize if needed

## Rollback Plan

If deployment fails or issues are discovered:
1. **Do not send any funds to faulty contracts**
2. **Document the issue and error messages**
3. **Deploy a new version with fixes**
4. **Update frontend to use new contract addresses**
5. **Notify users if any funds are at risk**

---

**⚠️ IMPORTANT**: This is a mainnet deployment involving real money. Double-check everything before proceeding!