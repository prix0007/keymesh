# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Keymesh is a decentralized social recovery system for crypto wallets built on Scaffold-ETH 2. The project splits wallet private keys into 3 encrypted pieces using Shamir Secret Sharing and stores them permanently on Avail DA. Users need any 2 of 3 pieces to recover their wallet: password + biometric (instant), password + social recovery (7 days), or biometric + social recovery (7 days).

## Common Commands

### Development
- `yarn install` - Install all dependencies
- `yarn chain` - Start local Anvil blockchain (foundry)
- `yarn deploy` - Deploy contracts to local network
- `yarn start` - Start Next.js frontend development server
- `yarn test` - Run smart contract tests
- `yarn foundry:test` - Run Foundry tests specifically

### Build & Lint
- `yarn next:build` - Build Next.js application
- `yarn next:check-types` - TypeScript type checking
- `yarn lint` - Lint both Next.js and Foundry code
- `yarn format` - Format code using Prettier

### Smart Contracts (Foundry)
- `yarn foundry:compile` - Compile smart contracts
- `yarn foundry:deploy` - Deploy contracts
- `yarn foundry:verify` - Verify contracts on block explorer
- `yarn foundry:format` - Format Solidity code

### Envio Indexer
- `pnpm codegen` - Generate types from schema (run from packages/envio/)
- `pnpm dev` - Start Envio indexer development mode
- `pnpm start` - Start Envio indexer production mode
- `TUI_OFF=true pnpm dev` - Run indexer without TUI for debugging

## Repository Structure

This is a Yarn workspace monorepo with three main packages:

### packages/foundry/
Smart contracts using Foundry framework:
- `contracts/` - Solidity smart contracts
- `script/` - Deployment and utility scripts
- `test/` - Contract tests
- Uses Makefile for build commands

### packages/nextjs/
Frontend application using Next.js 15 with App Router:
- `app/` - Next.js app directory with pages and API routes
- Built with Wagmi/Viem for Ethereum interaction
- Uses RainbowKit for wallet connections
- Styled with Tailwind CSS and DaisyUI
- State management with Zustand

### packages/envio/
Blockchain indexer using Envio for real-time event processing:
- `config.yaml` - Indexer configuration
- `src/` - Event handlers and indexing logic
- Uses pnpm (not yarn) - run commands from this directory
- Requires Node.js v20 specifically

## Architecture Patterns

### Blockchain Integration
- Wagmi hooks for contract interactions in Next.js
- RainbowKit for wallet connection UI
- Viem for low-level Ethereum operations
- Envio indexer provides GraphQL API for querying blockchain data

### Smart Contract Development
- Foundry framework with Forge for testing
- OpenZeppelin contracts for security standards
- Deploy scripts in `packages/foundry/script/`
- Local development uses Anvil (localhost:8545)

### Frontend Architecture
- Next.js App Router with TypeScript
- Server-side rendering and API routes
- Component structure follows Scaffold-ETH 2 patterns
- Custom hooks in `hooks/` directory
- Utility functions in `utils/` directory

## Key Development Workflows

### Smart Contract Changes
1. Edit contracts in `packages/foundry/contracts/`
2. Run `yarn foundry:compile` to compile
3. Run `yarn foundry:test` to test
4. Deploy with `yarn deploy`
5. Update Envio config if events changed

### Envio Indexer Changes
1. Navigate to `packages/envio/`
2. Edit `schema.graphql` or `config.yaml`
3. Run `pnpm codegen` to regenerate types
4. Edit handlers in `src/`
5. Run `pnpm tsc --noEmit` to check TypeScript
6. Test with `TUI_OFF=true pnpm dev`

### Important Envio Rules
- Always use spread operator when updating entities (objects are immutable)
- Use Effect API for external calls when `preload_handlers: true`
- Cast timestamps to BigInt: `BigInt(event.block.timestamp)`
- Use `entity_id` fields for relationships, not direct objects
- Never use entity arrays in schema - not supported

### Frontend Development
1. Components in `packages/nextjs/components/`
2. Pages in `packages/nextjs/app/`
3. API routes in `packages/nextjs/app/api/`
4. Run `yarn next:check-types` before committing
5. Frontend auto-reloads when contracts change (hot reload)

## Environment Setup

### Prerequisites
- Node.js 20+ (Envio requires exactly v20)
- Yarn 3.2.3+ (workspace manager)
- pnpm (for Envio package only)
- Docker (for Envio)

### Network Configuration
- Local: Anvil on localhost:8545 (chain ID 31337)
- Target deployment: Arbitrum (chain ID 42161)
- Contracts deployed to testnet/mainnet need verification

## Security Considerations

This project handles sensitive cryptographic operations:
- Never log private keys, passwords, or biometric data
- All crypto operations should use battle-tested libraries
- Smart contracts must be audited before mainnet deployment
- Recovery mechanisms need time delays for security

## Testing Strategy

- **Smart Contracts**: Foundry tests with comprehensive coverage
- **Frontend**: Component and integration tests
- **E2E**: Test complete recovery flow with multiple wallets
- **Security**: Audit recovery mechanisms and crypto implementation

## Common Issues

### Envio Development
- Must use Node.js v20 (not higher/lower)
- Run `pnpm codegen` after schema changes
- Use `TUI_OFF=true pnpm dev` for better error visibility
- Check for decimal normalization when handling different tokens

### Foundry Issues
- Ensure Anvil is running before deploying
- Contract hot reload requires restart if compilation fails
- Check gas settings for complex contracts

### Next.js Development
- TypeScript strict mode enabled
- Wagmi hooks require proper provider setup
- API routes need proper error handling