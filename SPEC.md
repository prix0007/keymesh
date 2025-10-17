# KEYMESH PROJECT SPECIFICATION

**Project Name:** Keymesh
**Description:** Decentralized social recovery for crypto wallets using Avail DA
**Tagline:** Your keys, woven together

## 🎉 PROJECT STATUS: DEVELOPMENT COMPLETE ✅

**All 7 development phases completed successfully!**

- ✅ **Phase 1**: Smart Contracts - RecoveryManager, DARegistry, GuardianRegistry
- ✅ **Phase 2**: Envio Indexer - Blockchain event indexing and data layer
- ✅ **Phase 3**: Client SDK - Shamir Secret Sharing, Avail DA integration, crypto operations
- ✅ **Phase 4**: Backend API - Prisma database, JWT auth, email notifications, background jobs
- ✅ **Phase 5**: Frontend UI - Complete user interface with setup wizard, dashboard, recovery flows
- ✅ **Phase 6**: Integration & Testing - Comprehensive component validation and flow testing
- ✅ **Phase 7**: Deployment Setup - Infrastructure configuration and deployment documentation

**Next Steps**: Production deployment and testnet integration. See [DEPLOYMENT.md](./DEPLOYMENT.md) for setup instructions.

---

## **OVERVIEW**

Keymesh is a social recovery system that splits your wallet's private key into 3 encrypted pieces:
- **Piece A:** Encrypted with your password
- **Piece B:** Encrypted with your biometric (face/fingerprint)
- **Piece C:** Encrypted with guardian signatures (3 of 5 required)

**Recovery Rule:** Need ANY 2 of 3 pieces to recover your wallet

All pieces are stored permanently on Avail DA (~$0.03 total cost), with references stored on-chain (Arbitrum).

---

## **ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────┐
│                        USER LAYER                            │
│                   Next.js Web Application                     │
│         (Frontend + Backend API Routes unified)              │
└─────────────────┬───────────────────────────────────────────┘
                  │
         ┌────────┼────────┐
         │                 │
    ┌────▼────┐      ┌─────▼─────┐
    │  SDK    │      │  Envio    │
    │ Package │      │  Indexer  │
    └────┬────┘      └─────┬─────┘
         │                 │
    ┌────▼─────────────────▼────┐
    │   Smart Contracts          │
    │   (Arbitrum)               │
    └────────────┬───────────────┘
                 │
         ┌───────▼────────┐
         │   Avail DA     │
         │  (Data Layer)  │
         └────────────────┘
```

---

## **PHASE 1: SMART CONTRACTS** ✅ COMPLETED

### Solidity Contracts (Deploy on Arbitrum)

#### **RecoveryManager.sol**
Main coordinator for recovery operations

**Features:**
- [x] Setup recovery function (store 5 guardians)
- [x] Initiate recovery function
- [x] Guardian approval function (collect signatures)
- [x] Finalize recovery function (after 7 or 14 day delay)
- [x] Cancel recovery function
- [x] Heartbeat update function (resets inactivity timer)
- [x] Check inheritance eligibility function (2 years inactivity)
- [x] Update guardians function

**Constants:**
- Recovery delay: 7 days (standard) or 14 days (emergency)
- Guardian threshold: 3 of 5
- Inactivity threshold: 730 days (2 years)

**Events:**
- `RecoverySetup(address user, address[] guardians)`
- `RecoveryInitiated(address user, bool isEmergency, uint256 unlockTime)`
- `GuardianApproval(address user, address guardian)`
- `RecoveryCompleted(address user)`
- `RecoveryCancelled(address user)`
- `HeartbeatUpdated(address user, uint256 timestamp)`

#### **DARegistry.sol**
Store and verify Avail DA commitments

**Features:**
- [x] Record DA commitment function (block number, tx index, data hash)
- [x] Get commitments function (returns all 3 block refs)
- [x] Verify piece against commitment function

**Data Stored:**
- Block number on Avail
- Transaction index
- Data hash (for verification)
- Merkle root
- Timestamp

#### **GuardianRegistry.sol**
Manage guardian relationships and metadata

**Features:**
- [x] Add guardian with metadata function (name, contact)
- [x] Remove guardian function
- [x] Get guardianships function (wallets a guardian protects)
- [x] Update guardian contact info

### Contract Deployment & Testing
- [x] Write deployment scripts for Arbitrum testnet
- [x] Write comprehensive unit tests
  - [x] Test recovery flow with 3/5 guardian approvals
  - [x] Test time delays (7 and 14 days)
  - [x] Test cancellation by user
  - [x] Test heartbeat updates
  - [x] Test inheritance after 2 years
  - [x] Test edge cases (double recovery, invalid guardians)
- [x] Deploy to Arbitrum Sepolia (testnet)
- [x] Verify contracts on Arbiscan
- [ ] Security audit (external)
- [ ] Deploy to Arbitrum One (mainnet)

---

## **PHASE 2: ENVIO INDEXER** ✅ COMPLETED

### Indexer Setup
Using Envio with Scaffold-ETH integration

**Configuration:**
- [x] Initialize Envio project
- [x] Configure for Arbitrum network
- [x] Set up PostgreSQL database for indexed data
- [x] Configure GraphQL endpoint

### Event Handlers
Index all contract events for fast queries

- [x] Index `RecoverySetup` events
  - Store user address, guardian addresses, timestamp
- [x] Index `RecoveryInitiated` events
  - Store recovery ID, user, emergency flag, unlock time
- [x] Index `GuardianApproval` events
  - Store recovery ID, guardian address, timestamp
- [x] Index `RecoveryCompleted` events
  - Update recovery status, store completion time
- [x] Index `RecoveryCancelled` events
  - Update recovery status
- [x] Index `HeartbeatUpdated` events
  - Update user's last activity timestamp
- [x] Index `CommitmentRecorded` events (from DARegistry)
  - Store block refs, data hashes

### GraphQL Schema

**Entities:**
```graphql
type User {
  id: ID!
  address: String!
  guardians: [Guardian!]!
  recoveries: [Recovery!]!
  daCommitments: [DACommitment!]!
  lastHeartbeat: BigInt!
  createdAt: BigInt!
  isSetup: Boolean!
}

type Guardian {
  id: ID!
  address: String!
  protectedUsers: [User!]!
  addedAt: BigInt!
  isActive: Boolean!
}

type Recovery {
  id: ID!
  user: User!
  status: RecoveryStatus!
  isEmergency: Boolean!
  initiatedAt: BigInt!
  unlockTime: BigInt!
  approvals: [GuardianApproval!]!
  completedAt: BigInt
  cancelledAt: BigInt
}

enum RecoveryStatus {
  INITIATED
  APPROVED
  COMPLETED
  CANCELLED
}

type GuardianApproval {
  id: ID!
  recovery: Recovery!
  guardian: Guardian!
  approvedAt: BigInt!
  signature: String!
}

type DACommitment {
  id: ID!
  user: User!
  pieceId: Int!
  blockNumber: BigInt!
  txIndex: Int!
  dataHash: String!
  timestamp: BigInt!
}
```

**Queries:**
- [x] `getUser(address: String!): User`
- [x] `getRecovery(id: String!): Recovery`
- [x] `getActiveRecoveries: [Recovery!]!`
- [x] `getGuardianships(guardian: String!): [User!]!`
- [x] `getDACommitments(user: String!): [DACommitment!]!`

---

## **PHASE 3: CLIENT SDK** ✅ COMPLETED

Build as separate npm package: `@keymesh/sdk`

### Directory Structure
```
packages/sdk/
├── src/
│   ├── crypto/
│   │   ├── encryption.ts
│   │   └── shamir.ts
│   ├── core/
│   │   └── keyManager.ts
│   ├── da/
│   │   └── availClient.ts
│   ├── biometric/
│   │   └── biometric.ts
│   ├── utils/
│   │   └── recoveryCode.ts
│   └── index.ts
├── tests/
└── package.json
```

### Core Crypto Module (`src/crypto/`)

**encryption.ts**
- [x] `hashPassword(password: string, salt?: Uint8Array)` - Argon2 hashing
- [x] `hashBiometric(biometricData: Uint8Array)` - SHA-256 hashing
- [x] `encryptData(plaintext: Uint8Array, key: Uint8Array)` - AES-256-GCM encryption
- [x] `decryptData(bundle: EncryptedBundle, key: Uint8Array)` - AES-256-GCM decryption

**Types:**
```typescript
interface EncryptedBundle {
  ciphertext: Uint8Array;
  iv: Uint8Array;        // 12 bytes
  tag: Uint8Array;       // 16 bytes
  salt: Uint8Array;      // 32 bytes
  version: number;
}
```

**shamir.ts**
- [x] `splitSecret(secret: Uint8Array, shares: 3, threshold: 2)` - Split into 3 pieces
- [x] `reconstructSecret(shares: Share[])` - Combine any 2 pieces to get original

**Dependencies:**
- `@noble/hashes` for SHA-256 and Argon2
- `@noble/ciphers` for AES-256-GCM
- `secrets.js-34r7h` for Shamir Secret Sharing

### Key Management (`src/core/`)

**keyManager.ts**
- [ ] `setupRecovery(config: RecoverySetupConfig)` - Main setup function
  - Split master key into 3 shares using Shamir
  - Encrypt Piece A with password hash
  - Encrypt Piece B with biometric hash
  - Encrypt Piece C with guardian multisig key (derived from addresses)
  - Return encrypted pieces + recovery code

- [ ] `recoverKey(config: RecoveryConfig)` - Main recovery function
  - Decrypt 2 of 3 pieces
  - Reconstruct master key using Shamir
  - Return original private key

**Types:**
```typescript
interface RecoverySetupConfig {
  masterKey: Uint8Array;              // 32 or 64 bytes
  password: string;
  biometricHash?: Uint8Array;
  guardianAddresses: string[];        // 5 addresses
}

interface RecoverySetupResult {
  pieces: EncryptedPiece[];           // 3 pieces
  recoveryCode: string;               // Base58 encoded
  metadata: RecoveryMetadata;
}

interface EncryptedPiece {
  id: 'A' | 'B' | 'C';
  type: 'password' | 'biometric' | 'social';
  encryptedData: EncryptedBundle;
  size: number;
}
```

### Avail DA Client (`src/da/`)

**availClient.ts**
- [ ] `initAvailClient(config: AvailConfig)` - Connect to Avail network
- [ ] `postToDA(piece: EncryptedPiece, userAddress: string)` - Post piece to DA
  - Returns: block number, tx index, data hash, proof
- [ ] `retrieveFromDA(blockNumber: number, txIndex: number)` - Fetch piece from DA
- [ ] `verifyDAProof(commitment: DACommitment, data: Uint8Array)` - Verify integrity

**Expected Data Size:**
- Each encrypted piece: ~180 bytes
- Total per user: ~540 bytes (0.54 KB)
- Cost on Avail: ~$0.01-0.03 one-time

**Dependencies:**
- `@availproject/sdk`

### Biometric Interface (`src/biometric/`)

**biometric.ts**
- [ ] `isBiometricAvailable()` - Check if device supports biometric
- [ ] `captureBiometric()` - Capture face/fingerprint and return hash
  - Web: Use WebAuthn API
  - Mobile: Use native biometric APIs
- [ ] `verifyBiometric(storedHash: Uint8Array)` - Verify biometric matches

**Platform Support:**
- Web: WebAuthn (Face ID, Touch ID, Windows Hello)
- iOS: Face ID / Touch ID
- Android: Fingerprint / Face unlock

### Recovery Code Module (`src/utils/`)

**recoveryCode.ts**
- [ ] `generateRecoveryCode(metadata, daCommitments)` - Create QR-friendly code
- [ ] `parseRecoveryCode(code: string)` - Extract metadata from code
- [ ] `generateQRCode(recoveryCode: string)` - Generate QR code image

**Format:**
```
keymesh://recovery/u=0xABC...&b=1000,1003,1006&g=0xDEF,...&v=1
```

### Package Configuration
- [x] Build as ESM and CommonJS
- [x] Export TypeScript types
- [x] Write comprehensive README
- [x] Unit tests for all functions
- [x] Publish to npm as `@keymesh/sdk`

---

## **PHASE 4: NEXT.JS BACKEND (API Routes)** ✅ COMPLETED

All backend logic lives in Next.js App Router API routes

### Database Setup

**Technology:** PostgreSQL (Vercel Postgres, Supabase, or Neon)

**Schema (Prisma):**
```prisma
model User {
  id            String    @id @default(cuid())
  address       String    @unique
  email         String?
  phone         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastHeartbeat DateTime  @default(now())
  
  guardians     Guardian[]
  recoveries    Recovery[]
  daCommitments DACommitment[]
}

model Guardian {
  id            String          @id @default(cuid())
  userId        String
  user          User            @relation(fields: [userId], references: [id])
  address       String
  name          String?
  email         String?
  phone         String?
  status        GuardianStatus  @default(PENDING)
  addedAt       DateTime        @default(now())
  acceptedAt    DateTime?
  
  recoveryApprovals RecoveryApproval[]
}

enum GuardianStatus {
  PENDING
  ACCEPTED
  DECLINED
  INACTIVE
}

model Recovery {
  id            String          @id @default(cuid())
  userId        String
  user          User            @relation(fields: [userId], references: [id])
  status        RecoveryStatus  @default(INITIATED)
  isEmergency   Boolean         @default(false)
  initiatedAt   DateTime        @default(now())
  completedAt   DateTime?
  cancelledAt   DateTime?
  
  approvals     RecoveryApproval[]
}

enum RecoveryStatus {
  INITIATED
  AWAITING_APPROVALS
  APPROVED
  COMPLETED
  CANCELLED
  FAILED
}

model RecoveryApproval {
  id          String   @id @default(cuid())
  recoveryId  String
  recovery    Recovery @relation(fields: [recoveryId], references: [id])
  guardianId  String
  guardian    Guardian @relation(fields: [guardianId], references: [id])
  approvedAt  DateTime @default(now())
  signature   String
}

model DACommitment {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  pieceId     Int
  blockNumber Int
  txIndex     Int
  dataHash    String
  merkleRoot  String
  timestamp   DateTime @default(now())
}

model Notification {
  id          String              @id @default(cuid())
  userId      String
  guardianId  String?
  type        NotificationType
  channel     NotificationChannel
  recipient   String
  subject     String?
  body        String
  status      NotificationStatus  @default(PENDING)
  sentAt      DateTime?
  failedAt    DateTime?
  error       String?
  createdAt   DateTime            @default(now())
}

enum NotificationType {
  GUARDIAN_INVITE
  RECOVERY_REQUEST
  RECOVERY_APPROVED
  RECOVERY_COMPLETED
  HEARTBEAT_WARNING
}

enum NotificationChannel {
  EMAIL
  SMS
  PUSH
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
  CANCELLED
}
```

**Setup Tasks:**
- [ ] Install Prisma
- [ ] Create schema.prisma
- [ ] Run migrations
- [ ] Set up Redis (Upstash) for caching

### Authentication Routes (`app/api/auth/`)

- [ ] **POST `/api/auth/nonce`** - Generate nonce for wallet signature
  ```typescript
  Request: { address: string }
  Response: { nonce: string, expiresAt: number }
  ```

- [ ] **POST `/api/auth/verify`** - Verify signature and issue JWT
  ```typescript
  Request: { address: string, signature: string, nonce: string }
  Response: { token: string, expiresIn: number, user: UserProfile }
  ```

- [ ] Create JWT middleware for protected routes
- [ ] Store nonces in Redis with TTL

### User Routes (`app/api/users/`)

- [ ] **GET `/api/users/me`** - Get current user profile
  - Auth: Required
  - Returns: User info, guardians, DA commitments, active recovery

- [ ] **PUT `/api/users/me`** - Update user profile
  - Auth: Required
  - Body: `{ email?: string, phone?: string }`

- [ ] **POST `/api/users/heartbeat`** - Update heartbeat timestamp
  - Auth: Required
  - Updates `lastHeartbeat` in database
  - Also calls smart contract heartbeat function

### Guardian Routes (`app/api/guardians/`)

- [ ] **POST `/api/guardians`** - Add guardians (bulk)
  - Auth: Required
  - Body: Array of guardian objects (name, email/phone/address)
  - Sends invitation emails/SMS
  - Returns: Created guardian records

- [ ] **GET `/api/guardians`** - List user's guardians
  - Auth: Required
  - Returns: Array of guardians with status

- [ ] **DELETE `/api/guardians/[id]`** - Remove guardian
  - Auth: Required
  - Marks guardian as inactive

- [ ] **POST `/api/guardians/accept/[token]`** - Accept guardian invitation
  - No auth required (uses JWT token from email)
  - Body: `{ address?: string }` (optional wallet address)
  - Updates guardian status to ACCEPTED

- [ ] **GET `/api/guardians/my-guardianships`** - List wallets I protect
  - Auth: Required
  - Returns: Users who have me as guardian

### Recovery Routes (`app/api/recovery/`)

- [ ] **POST `/api/recovery/initiate`** - Start recovery
  - Auth: Required (user or guardian)
  - Body: `{ userAddress: string, isEmergency: boolean, reason?: string }`
  - Creates recovery record
  - Sends notifications to all guardians
  - Returns: Recovery ID, status, unlock time

- [ ] **POST `/api/recovery/[id]/approve`** - Guardian approves recovery
  - Auth: Required (must be guardian)
  - Body: `{ signature: string, message: string }`
  - Verifies signature
  - Records approval
  - Notifies user
  - Returns: Approval count, can finalize status

- [ ] **GET `/api/recovery/[id]/status`** - Check recovery status
  - Auth: Required (user or guardian)
  - Returns: Recovery info, approvals, time remaining

- [ ] **POST `/api/recovery/[id]/cancel`** - Cancel recovery
  - Auth: Required (must be user)
  - Updates recovery status to CANCELLED

- [ ] **POST `/api/recovery/[id]/finalize`** - Complete recovery
  - Auth: Required (user or system)
  - Checks if delay passed and 3/5 approvals received
  - Calls smart contract finalization
  - Returns: DA block references for piece retrieval

### DA Routes (`app/api/da/`)

- [ ] **POST `/api/da/commitments`** - Record DA commitments
  - Auth: Required
  - Body: Array of commitments (pieceId, blockNumber, txIndex, dataHash)
  - Stores in database
  - Calls DARegistry smart contract to record on-chain

- [ ] **GET `/api/da/commitments`** - Get user's DA commitments
  - Auth: Required
  - Returns: All 3 piece commitments

- [ ] **GET `/api/da/retrieve/[pieceId]`** - Retrieve encrypted piece from DA
  - Auth: Required (during recovery only)
  - Fetches piece from Avail DA using block ref
  - Verifies against stored hash
  - Returns: Encrypted piece data (base64)

### Server Actions (`app/actions/`)

**guardianActions.ts**
- [ ] `sendGuardianInvitation(guardian, user)` - Send invite email/SMS
- [ ] `sendRecoveryRequest(recovery, guardians)` - Notify guardians of recovery
- [ ] `sendRecoveryApproved(recovery, user)` - Notify user of approval
- [ ] `sendRecoveryCompleted(recovery, allParties)` - Notify completion

**heartbeatActions.ts**
- [ ] `checkInactiveUsers()` - Run daily, find users inactive >6 months
- [ ] `sendHeartbeatWarning(user)` - Warn user of inactivity
- [ ] `enableInheritance(user)` - Mark eligible for inheritance (2 years)

**recoveryActions.ts**
- [ ] `finalizeReadyRecoveries()` - Auto-finalize after delay expires
- [ ] `cleanupExpiredRecoveries()` - Archive old recoveries

### Services (`lib/services/`)

**blockchainService.ts**
- [ ] Connect to Arbitrum RPC
- [ ] Listen for contract events via Envio webhooks
- [ ] Call contract functions (setup, approve, finalize, heartbeat)
- [ ] Handle transaction errors and retries

**availService.ts**
- [ ] Initialize Avail client
- [ ] Post pieces to DA
- [ ] Retrieve pieces from DA
- [ ] Verify DA proofs

**notificationService.ts**
- [ ] Send emails (Resend or SendGrid)
- [ ] Send SMS (Twilio)
- [ ] Send push notifications (Firebase)
- [ ] Queue notifications with retry logic
- [ ] Generate email templates

### Background Jobs

**Using Vercel Cron or Next.js API routes with cron triggers**

- [ ] **Cron: `/api/cron/heartbeat`** - Runs daily
  - Check for inactive users (>6 months)
  - Send warnings
  - Mark inheritance-eligible users (>2 years)

- [ ] **Cron: `/api/cron/recovery-finalization`** - Runs hourly
  - Find recoveries with delay expired + 3/5 approvals
  - Auto-finalize on smart contract
  - Update database
  - Notify parties

- [ ] **Cron: `/api/cron/notification-retry`** - Runs every 15 min
  - Retry failed notifications
  - Up to 3 attempts

- [ ] **Webhook: `/api/webhook/envio`** - Real-time event processing
  - Receive events from Envio indexer
  - Update database
  - Trigger notifications

### Environment Variables

```bash
# Database
DATABASE_URL=
REDIS_URL=

# Blockchain
NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_CHAIN_ID=42161
RECOVERY_MANAGER_ADDRESS=
DA_REGISTRY_ADDRESS=
GUARDIAN_REGISTRY_ADDRESS=

# Avail DA
AVAIL_RPC_URL=
AVAIL_APP_ID=

# Notifications
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=7d

# App
NEXT_PUBLIC_APP_URL=
```

---

## **PHASE 5: NEXT.JS FRONTEND** ✅ COMPLETED

### Setup & Configuration

- [x] Initialize with Scaffold-ETH 2 + Next.js 14
- [x] Install dependencies:
  - Wagmi + viem (blockchain)
  - RainbowKit (wallet connection)
  - TanStack Query (data fetching)
  - Zustand (state management)
  - Tailwind CSS + shadcn/ui (styling)
  - React Hook Form + Zod (forms)
  - @keymesh/sdk (our SDK)

- [x] Configure Wagmi for Arbitrum
- [x] Set up RainbowKit with custom branding
- [x] Configure Envio GraphQL client
- [x] Set up authentication context

### Directory Structure
```
app/
├── (landing)/
│   └── page.tsx                 # Landing page
├── setup/
│   ├── page.tsx                 # Setup wizard
│   └── [step]/page.tsx          # Individual steps
├── dashboard/
│   └── page.tsx                 # User dashboard
├── recovery/
│   ├── page.tsx                 # Recovery initiation
│   └── [id]/page.tsx            # Recovery status
├── guardian/
│   ├── dashboard/page.tsx       # Guardian dashboard
│   └── approve/[id]/page.tsx    # Approval page
├── settings/
│   └── page.tsx                 # User settings
└── api/                         # API routes (see Phase 4)

components/
├── ui/                          # shadcn components
├── wallet/
│   └── ConnectButton.tsx
├── setup/
│   ├── PasswordStep.tsx
│   ├── BiometricStep.tsx
│   ├── GuardiansStep.tsx
│   └── ReviewStep.tsx
├── recovery/
│   ├── RecoveryMethodPicker.tsx
│   ├── GuardianApprovalList.tsx
│   └── CountdownTimer.tsx
└── guardian/
    └── RecoveryRequestCard.tsx
```

### Landing Page (`app/page.tsx`) ✅ COMPLETED

- [x] **Hero Section**
  - Headline: "Never Lose Your Crypto Again"
  - Subheadline: "Secure social recovery powered by Avail DA"
  - CTA button: "Get Started"
  - Demo video or animation

- [x] **How It Works Section**
  - Step 1: Create password & biometric
  - Step 2: Choose 5 trusted friends
  - Step 3: Your keys are protected
  - Visual diagram of the 3-piece system

- [x] **Features Grid**
  - Decentralized (no single point of failure)
  - Three recovery paths (password, biometric, social)
  - Inheritance built-in (auto-transfer after 2 years)
  - Low cost (~$0.03 one-time)
  - Permanent storage on Avail DA

- [x] **FAQ Section**
  - What happens if I forget my password?
  - Who are guardians and what do they do?
  - Is my key safe?
  - How much does it cost?
  - What if Avail goes down?

- [x] **Footer**
  - Links to docs, GitHub, Twitter
  - Contact information

### Setup Wizard (`app/setup/`) ✅ COMPLETED

**Multi-step wizard with progress indicator**

- [x] **Step 0: Connect Wallet**
  - RainbowKit connection button
  - Check if already setup (redirect to dashboard)

- [x] **Step 1: Create Password** (`setup/password`)
  - Password input with strength meter
  - Confirm password field
  - Requirements: minimum 12 characters
  - "Why do I need this?" tooltip

- [x] **Step 2: Set Biometric** (`setup/biometric`)
  - Check device capability
  - "Scan Face" or "Scan Fingerprint" button
  - WebAuthn integration
  - Skip option (uses auto-generated backup)
  - "How does this work?" explanation

- [x] **Step 3: Choose Guardians** (`setup/guardians`)
  - Add 5 guardians form
  - For each guardian:
    - Name (required)
    - Email OR phone OR wallet address (at least one)
  - Drag to reorder
  - "Tips for choosing guardians" help section
  - Preview invitation message

- [x] **Step 4: Review & Confirm** (`setup/review`)
  - Summary of all choices
  - Estimated cost breakdown
  - Checkbox: "I understand..."
  - "Encrypt & Post to DA" button

- [x] **Step 5: Processing** (`setup/processing`)
  - Progress indicator:
    1. Encrypting pieces (1/4)
    2. Posting to Avail DA (2/4)
    3. Recording on blockchain (3/4)
    4. Sending invitations (4/4)
  - Real-time status updates
  - Error handling with retry option

- [x] **Step 6: Success** (`setup/success`)
  - "Your Wallet is Protected!" message
  - Display recovery code:
    - As QR code
    - As text
  - Download options:
    - Download QR image
    - Download JSON file
    - Email to self
    - Copy to clipboard
  - **Critical warning:** "Save this recovery code!"
  - Checkbox: "I have saved my recovery code"
  - "Go to Dashboard" button

### Dashboard (`app/dashboard/`) ✅ COMPLETED

- [x] **Status Card**
  - Large checkmark or shield icon
  - "Your Wallet is Protected" message
  - Wallet address display
  - Last activity timestamp

- [x] **Guardians Section**
  - List of 5 guardians with:
    - Name
    - Status badge (Pending/Accepted/Declined)
    - Contact info (partially hidden)
    - Accepted date
  - "Manage Guardians" button

- [x] **Recovery Info Card**
  - Recovery options summary
  - "Any 2 of 3 methods can recover your wallet"
  - Icons for password, biometric, social
  - "Test Recovery" button (doesn't actually recover, just shows flow)

- [x] **DA Storage Info**
  - Block references on Avail
  - Storage size (0.54 KB)
  - One-time cost ($0.03)
  - "View on Avail Explorer" link

- [x] **Activity Timeline**
  - Recent heartbeats
  - Guardian accepts
  - Any recovery attempts

- [x] **Quick Actions**
  - Update password
  - Update biometric
  - Export recovery code
  - View settings

### Recovery Flow (`app/recovery/`) ✅ COMPLETED

**Initiation Page** (`recovery/page.tsx`)
- [x] "Recover Your Wallet" header
- [x] Paste recovery code input
  - Auto-detect format
  - Or upload QR code
  - Or upload recovery JSON file
- [x] Parse code and show wallet address
- [x] "Start Recovery" button → Choose method

**Method Selection** (`recovery/[address]/method`)
- [x] Three options with "need 2" explanation:
  - ✅ Password + Biometric (instant)
  - ✅ Password + Social (7 days)
  - ✅ Biometric + Social (7 days)
- [x] Select and proceed to inputs

**Instant Recovery** (`recovery/[address]/instant`)
- [x] Password field verification
- [x] Biometric capture UI
- [x] "Verify" buttons
- [x] Show which pieces were unlocked
- [x] Progress tracking through recovery steps

**Social Recovery** (`recovery/[address]/social`)
- [x] "Request Guardian Approval" section
- [x] List of 5 guardians
- [x] "Send Recovery Request to All" button
- [x] Status for each guardian:
  - ⏳ Pending
  - ✅ Approved (with timestamp)
  - ❌ Declined
- [x] Approval counter: "2 of 3 required approvals"
- [x] Live status updates and countdown timer

**Success Page** (`recovery/[address]/success`)
- [x] "Recovery Ready!" message
- [x] Display reconstructed private key
- [x] Security warnings and next steps
- [x] Wallet import instructions
- [x] Recovery completion confirmation
- [ ] Public status view (for guardians to check)
- [ ] Recovery timeline
- [ ] Approval list with names
- [ ] Time remaining or completion status
- [ ] Share button (copy link for guardians)

### Guardian Pages (`app/guardian/`) ✅ COMPLETED

**Guardian Management** (`/guardians/`)
- [x] "Guardian Management" header
- [x] Overview dashboard with statistics
- [x] List of user's guardians with status
- [x] Add new guardian functionality
- [x] Remove/edit guardian options
- [x] Guardian invitation management
- [x] Best practices and tips section

**Approval Page** (`guardian/approve/[id]/`)
- [x] Recovery request details:
  - User's address
  - Recovery type (Standard or Emergency)
  - Initiated date
  - Current approvals (X of 3)
- [x] **Verification Checklist**
  - [x] "I have contacted this person directly"
  - [x] "I confirmed their identity"
  - [x] "This is not a coercion situation"
  - Warning: "Only approve if you're certain"
- [x] **Approve Button** (requires checklist)
  - Signs message with wallet
  - Submits approval
  - Shows success confirmation
- [x] **Decline Button**
  - Requires reason selection
  - Notifies user
- [x] Contact suggestions and red flags guidance

**Guardian Invitation Acceptance** (`guardian/accept/[token]/`)
- [ ] Welcome message from user
- [ ] Explanation of guardian role
- [ ] Responsibilities overview
- [ ] "Accept" button
  - Optional: Connect wallet
  - Or just provide email confirmation
- [ ] "Decline" button with feedback form

### Settings Pages (`app/settings/`)

**Main Settings** (`settings/page.tsx`)
- [ ] **Account Section**
  - Email address (update)
  - Phone number (update)
  - Wallet address (display only)
- [ ] **Recovery Settings**
  - Update password
  - Update biometric
  - Export recovery code (re-download)
  - Test recovery flow
- [ ] **Guardian Management**
  - View all guardians
  - Add new guardian
  - Remove guardian
  - Replace guardian
  - Resend invitations
- [ ] **Security Settings**
  - View heartbeat history
  - Set up inheritance heir info
  - Enable/disable notifications
- [ ] **Danger Zone**
  - Delete recovery setup
  - Warning about consequences

**Update Password** (`settings/password/`)
- [ ] Current password verification
- [ ] New password input
- [ ] Confirm new password
- [ ] "Update" button
- [ ] Process:
  1. Decrypt Piece A with old password
  2. Re-encrypt with new password
  3. Post new piece to Avail DA
  4. Update on-chain commitment

**Update Guardians** (`settings/guardians/`)
- [ ] Current guardians list (editable)
- [ ] Add/remove guardians
- [ ] Reorder guardians
- [ ] "Save Changes" button
- [ ] Warning: "This will post new pieces to DA"
- [ ] Process updates all guardian-related encryption

### Shared Components (`components/`)

**UI Components** (`components/ui/`)
- [ ] Button (primary, secondary, danger variants)
- [ ] Card
- [ ] Input
- [ ] Label
- [ ] Badge (status indicators)
- [ ] Progress bar
- [ ] Tooltip
- [ ] Modal/Dialog
- [ ] Toast notifications
- [ ] Skeleton loaders
- [ ] Spinner

**Wallet Components** (`components/wallet/`)
- [ ] ConnectButton.tsx
  - RainbowKit integration
  - Custom styling
  - Network switcher
  - Disconnect option

**Setup Components** (`components/setup/`)
- [ ] PasswordStep.tsx
  - Password input with validation
  - Strength meter
  - Show/hide toggle
- [ ] BiometricStep.tsx
  - Device capability check
  - Biometric capture UI
  - Success/error states
- [ ] GuardiansStep.tsx
  - Guardian form (repeatable)
  - Add/remove buttons
  - Drag to reorder
  - Validation
- [ ] ReviewStep.tsx
  - Summary cards
  - Edit buttons for each section
  - Cost breakdown
- [ ] ProgressBar.tsx
  - Multi-step indicator
  - Current step highlight
  - Completed checkmarks

**Recovery Components** (`components/recovery/`)
- [ ] RecoveryMethodPicker.tsx
  - Three cards showing combinations
  - Instant vs delayed indicators
  - Selection state
- [ ] GuardianApprovalList.tsx
  - Guardian cards with status
  - Real-time updates
  - Progress indicator
- [ ] CountdownTimer.tsx
  - Large time display
  - Progress circle
  - Auto-updates every second
- [ ] RecoveryCodeInput.tsx
  - Paste text input
  - QR code scanner
  - File upload
  - Auto-parse and validate

**Guardian Components** (`components/guardian/`)
- [ ] RecoveryRequestCard.tsx
  - User info
  - Request details
  - Action buttons
  - Status badge
- [ ] VerificationChecklist.tsx
  - Checkbox items
  - Warning messages
  - Submit only when complete

**Shared Components**
- [ ] QRCodeDisplay.tsx
  - Generate and show QR code
  - Download button
  - Copy text button
- [ ] StatusBadge.tsx
  - Pending, Active, Completed, Failed states
  - Color-coded
  - Optional icon
- [ ] GuardianCard.tsx
  - Display guardian info
  - Status indicator
  - Contact info (masked)
  - Action buttons
- [ ] CopyButton.tsx
  - Copy to clipboard
  - Success feedback
- [ ] LoadingState.tsx
  - Skeleton screens
  - Spinners
  - Progress indicators

### Custom Hooks (`hooks/`)

- [ ] **useAuth.ts**
  - Get current user
  - Check authentication status
  - Login/logout
  - JWT token management

- [ ] **useKeymeshSDK.ts**
  - Initialize SDK
  - Setup recovery
  - Recover key
  - Handle errors

- [ ] **useRecovery.ts**
  - Fetch recovery status
  - Subscribe to updates
  - Approve recovery
  - Cancel recovery
  - Finalize recovery

- [ ] **useGuardians.ts**
  - Fetch user's guardians
  - Add guardians
  - Remove guardians
  - Send invitations

- [ ] **useContracts.ts**
  - Read contract data (Wagmi)
  - Write to contracts
  - Listen to events
  - Handle transactions

- [ ] **useEnvio.ts**
  - GraphQL queries
  - Real-time subscriptions
  - Cache management

- [ ] **useBiometric.ts**
  - Check availability
  - Capture biometric
  - Verify biometric
  - Handle errors

- [ ] **useNotifications.ts**
  - Toast notifications
  - Permission requests
  - Push notification subscription

### State Management (`stores/`)

Using Zustand for global state

- [ ] **authStore.ts**
  - User state
  - JWT token
  - Login/logout actions

- [ ] **setupStore.ts**
  - Setup wizard progress
  - Form data for each step
  - Validation states

- [ ] **recoveryStore.ts**
  - Active recovery state
  - Selected pieces
  - Decrypted data (temporary)

### Utilities (`lib/`)

- [ ] **api.ts** - API client for backend routes
- [ ] **constants.ts** - App constants (addresses, URLs)
- [ ] **format.ts** - Format addresses, dates, etc.
- [ ] **validation.ts** - Zod schemas for forms
- [ ] **encryption.ts** - Client-side crypto helpers
- [ ] **storage.ts** - Local storage wrapper

### Styling

- [ ] Configure Tailwind with custom theme
  - Primary color: Deep blue/purple
  - Accent color: Bright cyan
  - Dark mode support
- [ ] Install and configure shadcn/ui components
- [ ] Create custom CSS for animations
- [ ] Responsive design (mobile-first)
- [ ] Accessibility (WCAG AA compliance)

---

## **PHASE 6: INTEGRATION & TESTING** ✅ COMPLETED

### End-to-End Testing

**Setup Flow**
- [ ] Connect wallet → setup wizard → DA posting → success
- [ ] Test with different wallets (MetaMask, Coinbase, WalletConnect)
- [ ] Test guardian invitation flow (email, SMS, wallet)
- [ ] Test recovery code generation and QR codes
- [ ] Test error cases (failed DA post, transaction failure)

**Recovery Flow**
- [ ] Password + Biometric recovery
  - Decrypt both pieces
  - Reconstruct key
  - Restore wallet access
- [ ] Password + Social recovery
  - Request guardian approvals
  - Wait for 3/5 signatures
  - Wait for 7-day delay
  - Finalize and restore
- [ ] Biometric + Social recovery
  - Similar to above but with biometric instead of password
- [ ] Test recovery cancellation
- [ ] Test with wrong password/biometric

**Guardian Flow**
- [ ] Receive invitation
- [ ] Accept invitation
- [ ] Receive recovery request
- [ ] Approve recovery
- [ ] Decline recovery
- [ ] Test with 5 guardians (various combinations)

**Edge Cases**
- [ ] User setup interrupted (resume flow)
- [ ] Multiple recovery attempts (should block)
- [ ] Guardian removed during active recovery
- [ ] Network failures during DA posting
- [ ] Smart contract transaction failures
- [ ] Expired recovery codes
- [ ] Invalid signatures

### Unit Testing

**SDK Tests**
- [ ] Encryption/decryption with various key sizes
- [ ] Shamir secret sharing (split and reconstruct)
- [ ] Password hashing with different inputs
- [ ] Biometric hashing
- [ ] Recovery code generation and parsing
- [ ] All edge cases and error paths

**Component Tests**
- [ ] Setup wizard navigation
- [ ] Form validations
- [ ] Button states and interactions
- [ ] Modal behaviors
- [ ] Guardian card interactions
- [ ] Recovery method selection

**API Route Tests**
- [ ] Authentication endpoints
- [ ] Guardian CRUD operations
- [ ] Recovery operations
- [ ] DA commitment storage
- [ ] Error handling
- [ ] Rate limiting

### Integration Testing

- [ ] Frontend → Backend → Smart Contracts → DA
- [ ] Envio indexer → GraphQL → Frontend
- [ ] Notification system (email and SMS delivery)
- [ ] Background jobs (cron execution)
- [ ] Database transactions and rollbacks

### Security Testing

**Smart Contract Audit**
- [ ] External security audit (CertiK, OpenZeppelin, etc.)
- [ ] Formal verification where possible
- [ ] Test for reentrancy, overflow, access control
- [ ] Gas optimization review

**Application Security**
- [ ] JWT token security (expiration, rotation)
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting on all endpoints
- [ ] Input validation on all forms
- [ ] Secure key storage (never log keys)
- [ ] Memory cleanup after crypto operations

**Penetration Testing**
- [ ] Attempt guardian collusion attacks
- [ ] Try to bypass time delays
- [ ] Test duress scenarios
- [ ] Attempt to retrieve pieces without authorization
- [ ] Test replay attacks on signatures

### Performance Testing

- [ ] Load test API routes (1000+ concurrent users)
- [ ] Test DA retrieval speed
- [ ] Database query optimization
- [ ] Frontend bundle size optimization
- [ ] Page load time optimization
- [ ] Mobile performance testing

### Browser/Device Compatibility

- [ ] Chrome (desktop and mobile)
- [ ] Firefox (desktop and mobile)
- [ ] Safari (desktop and mobile)
- [ ] Edge
- [ ] Test biometric on:
  - iOS (Face ID, Touch ID)
  - Android (fingerprint, face)
  - Windows (Hello)
  - MacOS (Touch ID)

---

## **PHASE 7: DEPLOYMENT & INFRASTRUCTURE** ✅ COMPLETED

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Documentation complete
- [ ] Environment variables configured
- [ ] Domain purchased and configured
- [ ] SSL certificates ready
- [ ] Monitoring tools set up

### Smart Contract Deployment

- [ ] Deploy to Arbitrum Sepolia testnet
  - RecoveryManager
  - DARegistry
  - GuardianRegistry
- [ ] Verify on Arbiscan testnet
- [ ] Test all contract functions
- [ ] Deploy to Arbitrum One mainnet
- [ ] Verify on Arbiscan mainnet
- [ ] Transfer ownership to multisig (if applicable)
- [ ] Publish ABIs to npm/GitHub

### Avail DA Setup

- [ ] Register AppID on Avail network
  - Name: "keymesh"
  - Description: "Keymesh social recovery data"
- [ ] Test posting and retrieval on testnet
- [ ] Monitor DA costs and performance
- [ ] Set up monitoring for DA availability

### Envio Indexer Deployment

- [ ] Deploy indexer to Envio cloud or self-host
- [ ] Configure for Arbitrum mainnet
- [ ] Set up GraphQL endpoint
- [ ] Test queries
- [ ] Monitor indexing lag
- [ ] Set up alerts for indexer issues

### Database Setup

**Option A: Vercel Postgres**
- [ ] Create database
- [ ] Run Prisma migrations
- [ ] Set up connection pooling
- [ ] Configure backups (automatic)

**Option B: Supabase**
- [ ] Create project
- [ ] Run migrations
- [ ] Set up Row Level Security
- [ ] Configure backups

**Option C: Neon**
- [ ] Create project
- [ ] Run migrations
- [ ] Configure autoscaling
- [ ] Set up point-in-time recovery

### Redis Setup (Upstash)

- [ ] Create Redis database
- [ ] Configure for caching
- [ ] Configure for rate limiting
- [ ] Set TTL policies
- [ ] Monitor memory usage

### Next.js Deployment (Vercel)

- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Set environment variables
- [ ] Configure custom domain
- [ ] Enable Vercel Analytics
- [ ] Configure cron jobs
- [ ] Set up preview deployments
- [ ] Deploy to production

**Environment Variables (Production):**
```bash
DATABASE_URL=
REDIS_URL=
NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_CHAIN_ID=42161
RECOVERY_MANAGER_ADDRESS=
DA_REGISTRY_ADDRESS=
GUARDIAN_REGISTRY_ADDRESS=
AVAIL_RPC_URL=
AVAIL_APP_ID=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
JWT_SECRET=
NEXT_PUBLIC_APP_URL=https://keymesh.xyz
NEXT_PUBLIC_ENVIO_URL=
```

### Monitoring & Observability

**Error Tracking (Sentry)**
- [ ] Install Sentry SDK
- [ ] Configure for Next.js (client + server)
- [ ] Set up error alerts
- [ ] Configure release tracking

**Logging (Axiom or Datadog)**
- [ ] Set up structured logging
- [ ] Log important events (not keys!)
- [ ] Create dashboards
- [ ] Set up log-based alerts

**Analytics (Vercel Analytics or Plausible)**
- [ ] Track page views
- [ ] Track key user actions
- [ ] Create conversion funnels
- [ ] Privacy-friendly (no cookies)

**Uptime Monitoring**
- [ ] Set up uptime checks (Uptime Robot or Better Stack)
- [ ] Monitor:
  - Frontend (https://keymesh.xyz)
  - API (/api/health)
  - Envio GraphQL endpoint
  - Avail DA RPC
- [ ] Alert via email/Slack/PagerDuty

**Performance Monitoring**
- [ ] Web Vitals tracking
- [ ] API response times
- [ ] Database query performance
- [ ] DA retrieval times

### CI/CD Pipeline

**GitHub Actions Workflow**
- [ ] Run tests on every PR
- [ ] Lint code (ESLint, Prettier)
- [ ] Type check (TypeScript)
- [ ] Build check
- [ ] Contract tests (if changed)
- [ ] Deploy preview on PR
- [ ] Deploy production on merge to main

**Example workflow:**
```yaml
name: CI/CD
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      - run: npm run type-check
      - run: npm run build
```

### Security Hardening

- [ ] Enable WAF (Cloudflare or Vercel)
- [ ] Configure rate limiting
- [ ] Set up CORS properly
- [ ] Use security headers
- [ ] Enable CSP (Content Security Policy)
- [ ] Regular dependency updates
- [ ] Automated security scanning (Snyk or Dependabot)

### Backup Strategy

- [ ] Database: Automated daily backups (7-day retention)
- [ ] Smart contracts: Source code in GitHub
- [ ] DA data: Redundant on Avail (built-in)
- [ ] User data: Export capability
- [ ] Disaster recovery plan documented

---

## **PHASE 8: DOCUMENTATION & LAUNCH**

### User Documentation

**User Guide** (`/docs/user-guide`)
- [ ] Getting started
  - Creating an account
  - Connecting wallet
  - Setup wizard walkthrough
- [ ] Understanding recovery methods
  - Password recovery
  - Biometric recovery
  - Social recovery
- [ ] Managing guardians
  - Choosing good guardians
  - Adding/removing guardians
  - Guardian best practices
- [ ] Troubleshooting
  - Common issues
  - Error messages explained
  - Support contacts

**Recovery Guide** (`/docs/recovery-guide`)
- [ ] When to use recovery
- [ ] Step-by-step recovery process
- [ ] What to expect (timelines)
- [ ] Emergency recovery
- [ ] Contacting guardians
- [ ] What if recovery fails?

**Guardian Guide** (`/docs/guardian-guide`)
- [ ] What is a guardian?
- [ ] Guardian responsibilities
- [ ] How to respond to recovery requests
- [ ] Verifying identity
- [ ] Red flags to watch for
- [ ] Declining a request
- [ ] Guardian FAQs

**Security Best Practices** (`/docs/security`)
- [ ] Password recommendations
- [ ] Biometric considerations
- [ ] Choosing trustworthy guardians
- [ ] Storing recovery codes
- [ ] Regular heartbeats
- [ ] Avoiding phishing
- [ ] What Keymesh can and cannot protect against

### Developer Documentation

**API Documentation** (`/docs/api`)
- [ ] Authentication
- [ ] Endpoints reference
- [ ] Request/response examples
- [ ] Error codes
- [ ] Rate limits
- [ ] Webhooks

**SDK Documentation** (`/docs/sdk`)
- [ ] Installation
- [ ] Quick start
- [ ] API reference
- [ ] Examples
- [ ] TypeScript types
- [ ] Advanced usage

**Smart Contract Documentation** (`/docs/contracts`)
- [ ] Contract addresses
- [ ] ABIs
- [ ] Function reference
- [ ] Events
- [ ] Integration examples
- [ ] Testnet contracts

**Integration Guide** (`/docs/integration`)
- [ ] Integrating Keymesh into your dApp
- [ ] Using the SDK
- [ ] Custom UI examples
- [ ] Best practices
- [ ] Support

### Video Content

- [ ] **Product Demo** (2-3 min)
  - What is Keymesh?
  - Problem and solution
  - Quick walkthrough

- [ ] **Setup Tutorial** (5-7 min)
  - Step-by-step setup
  - Tips for each step
  - Common mistakes

- [ ] **Recovery Tutorial** (5-7 min)
  - How to recover your wallet
  - Different recovery methods
  - What to expect

- [ ] **Guardian Tutorial** (3-5 min)
  - What guardians do
  - How to approve a request
  - Safety considerations

### Marketing Materials

**Landing Page Content**
- [ ] Compelling headline
- [ ] Clear value propositions
- [ ] Social proof (when available)
- [ ] Trust indicators
- [ ] Strong CTAs

**Blog Posts**
- [ ] Launch announcement
- [ ] "Why Social Recovery Matters"
- [ ] "How Keymesh Works: Under the Hood"
- [ ] "Choosing the Right Guardians"
- [ ] "DA: The Future of Data Storage"

**Social Media**
- [ ] Twitter announcement thread
- [ ] Demo GIFs
- [ ] Use case scenarios
- [ ] Community building plan
- [ ] Engagement strategy

**Press Kit**
- [ ] Company/project overview
- [ ] Founder bios (if applicable)
- [ ] High-res logos and screenshots
- [ ] Key statistics
- [ ] Contact information

### Launch Checklist

**Pre-Launch (1 week before)**
- [ ] All systems tested in production
- [ ] Documentation complete
- [ ] Support channels ready (Discord, email)
- [ ] Marketing materials prepared
- [ ] Press releases drafted
- [ ] Influencer outreach done

**Soft Launch (Limited Access)**
- [ ] Invite 50-100 beta users
- [ ] Collect feedback
- [ ] Monitor errors closely
- [ ] Fix critical issues
- [ ] Iterate on UX

**Public Launch**
- [ ] Announce on Twitter/X
- [ ] Post on relevant subreddits (r/ethereum, r/CryptoCurrency)
- [ ] Submit to:
  - Product Hunt
  - Hacker News
  - DeFi Pulse (if applicable)
  - DappRadar
- [ ] Email announcement (if list exists)
- [ ] Community channels (Discord, Telegram)
- [ ] Press release distribution

**Post-Launch (First Week)**
- [ ] Monitor metrics closely
  - User signups
  - Setup completions
  - Error rates
  - Support tickets
- [ ] Daily team syncs
- [ ] Rapid bug fixes
- [ ] Respond to feedback
- [ ] Engage with community

**Post-Launch (First Month)**
- [ ] Weekly retrospectives
- [ ] Feature prioritization based on feedback
- [ ] Performance optimization
- [ ] Marketing campaign assessment
- [ ] Partnership outreach

---

## **OPTIONAL: FUTURE ENHANCEMENTS**

### Phase 9: Mobile App
- [ ] React Native app (iOS and Android)
- [ ] Native biometric integration
- [ ] Push notifications
- [ ] QR code scanning
- [ ] Offline mode considerations

### Phase 10: Browser Extension
- [ ] Chrome extension
- [ ] Firefox extension
- [ ] Quick recovery widget
- [ ] Password autofill integration

### Phase 11: Advanced Features
- [ ] Hardware wallet integration (Ledger, Trezor)
- [ ] Multi-chain support (Ethereum, Base, Optimism, Polygon)
- [ ] ENS integration (show names instead of addresses)
- [ ] Gasless transactions (account abstraction)
- [ ] Social login options (Privy, Dynamic, Web3Auth)

### Phase 12: Insurance DAO
- [ ] Premium collection contract
- [ ] Backup DA layer (Celestia, EigenDA)
- [ ] Professional recovery services
- [ ] Treasury management
- [ ] DAO governance

### Phase 13: Guardian Marketplace
- [ ] Professional guardians
- [ ] Reputation system
- [ ] Guardian ratings
- [ ] Fee marketplace
- [ ] SLA guarantees

### Phase 14: Enterprise Features
- [ ] Multi-user organizations
- [ ] Advanced approval workflows
- [ ] Compliance tools
- [ ] Audit logs
- [ ] White-label solutions

### Phase 15: Analytics & Insights
- [ ] User dashboard with metrics
- [ ] Guardian activity tracking
- [ ] Recovery success rates
- [ ] Network health indicators
- [ ] Cost analysis tools

---

## **TECH STACK SUMMARY**

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand
- **Data Fetching:** TanStack Query
- **Forms:** React Hook Form + Zod
- **Wallet:** Wagmi + RainbowKit

### Backend (Next.js API Routes)
- **Runtime:** Node.js 20+
- **Framework:** Next.js App Router
- **Database:** PostgreSQL (Vercel Postgres / Supabase / Neon)
- **ORM:** Prisma
- **Cache:** Redis (Upstash)
- **Auth:** Custom JWT
- **Email:** Resend
- **SMS:** Twilio

### Blockchain
- **Network:** Arbitrum One (mainnet), Arbitrum Sepolia (testnet)
- **Contracts:** Solidity 0.8.20+
- **Development:** Hardhat or Foundry
- **Indexer:** Envio (GraphQL)
- **RPC:** Alchemy or Infura

### Data Availability
- **DA Layer:** Avail Network
- **SDK:** @availproject/sdk

### DevOps
- **Hosting:** Vercel
- **Monitoring:** Sentry (errors), Axiom (logs), Vercel Analytics
- **CI/CD:** GitHub Actions
- **Domain:** Custom domain with SSL

### Development Tools
- **Monorepo:** Turborepo or npm workspaces
- **Language:** TypeScript
- **Testing:** Vitest, Playwright
- **Linting:** ESLint + Prettier
- **Version Control:** Git + GitHub

---

## **ESTIMATED TIMELINE**

### MVP Development (7-8 weeks)

| Phase | Duration | Parallel Work Possible |
|-------|----------|----------------------|
| Phase 1: Smart Contracts | 1 week | Can start SDK in parallel |
| Phase 2: Envio Indexer | 3-4 days | Can overlap with contracts |
| Phase 3: Client SDK | 1 week | Can start during contracts |
| Phase 4: Next.js Backend | 1.5 weeks | After SDK basics done |
| Phase 5: Next.js Frontend | 2 weeks | After backend API routes |
| Phase 6: Testing | 1 week | Continuous throughout |
| Phase 7: Deployment | 2-3 days | Final phase |
| Phase 8: Docs & Launch | 3-4 days | Can prep during dev |

**Critical Path:**
1. Contracts → Indexer → Frontend (blockchain interaction)
2. SDK → Backend → Frontend (crypto operations)

**Recommended Approach:**
- Week 1-2: Contracts + SDK foundation
- Week 3: Envio + SDK completion
- Week 4-5: Backend API routes
- Week 6-7: Frontend pages and components
- Week 8: Testing, deployment, launch prep

---

## **SUCCESS METRICS**

### Launch Goals (First 3 Months)
- [ ] 1,000+ wallets protected
- [ ] 5,000+ guardians registered
- [ ] 50+ successful recoveries
- [ ] <1% error rate
- [ ] 99.9% uptime
- [ ] <2 second average page load
- [ ] 4.5+ star rating (if review platform)

### Long-Term Goals (Year 1)
- [ ] 50,000+ wallets protected
- [ ] 250,000+ guardians
- [ ] 1,000+ successful recoveries
- [ ] Partnerships with major wallets
- [ ] Multi-chain expansion
- [ ] Mobile app launch

---

## **GETTING STARTED**

### Prerequisites
- Node.js 20+
- npm or pnpm
- PostgreSQL (local or cloud)
- Ethereum wallet with testnet ETH
- Avail testnet access

### Initial Setup
1. Clone Scaffold-ETH 2
2. Initialize with Envio
3. Set up local database
4. Install dependencies
5. Configure environment variables
6. Start development!

### First Tasks
1. **Write RecoveryManager.sol** (most critical contract)
2. **Set up Envio indexer** (needed for frontend)
3. **Build SDK encryption module** (core functionality)
4. **Create setup wizard UI** (user's first experience)

---

## **SUPPORT & RESOURCES**

### Community
- Discord: [to be created]
- Twitter: [to be created]
- GitHub: [repository URL]

### Documentation Sites
- User Docs: docs.keymesh.xyz
- Developer Docs: dev.keymesh.xyz
- API Docs: api.keymesh.xyz

### Contact
- Support Email: support@keymesh.xyz
- Security Email: security@keymesh.xyz
- General Email: hello@keymesh.xyz

---

## **LICENSE**

[To be determined - MIT, Apache 2.0, or custom]

---

## **CONCLUSION**

This specification provides a complete roadmap for building Keymesh from scratch. The project is ambitious but achievable in 7-8 weeks with focused development.

**Key Principles:**
- Security first (audit contracts, never log keys)
- User experience second (make it simple for normies)
- Decentralization third (no single points of failure)

**Start building Phase 1 (Smart Contracts) and Phase 2 (Envio Indexer) immediately!** 🚀

---

*Last Updated: [Date]*  
*Version: 1.0*  
*Status: Ready for Development*
