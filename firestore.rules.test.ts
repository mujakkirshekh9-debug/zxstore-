/**
 * ZX STORE — Phase 0 Payload-First Security Test Suite
 * Verifies that all 12 "Dirty Dozen" adversarial payloads defined in security_spec.md
 * are deterministically rejected with PERMISSION_DENIED by firestore.rules.
 */

export interface DirtyDozenScenario {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authContext: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenScenario[] = [
  {
    id: 1,
    name: 'Self-Assigned Admin Role on Registration',
    collection: 'users',
    docId: 'attacker_1',
    operation: 'create',
    authContext: { uid: 'attacker_1', email: 'evil@test.com', email_verified: true },
    payload: {
      uid: 'attacker_1',
      fullName: 'Attacker',
      email: 'evil@test.com',
      phone: '9800000000',
      role: 'admin',
      walletBalance: 0,
      lastTxId: 'init',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Free Wallet Money on Registration',
    collection: 'users',
    docId: 'attacker_1',
    operation: 'create',
    authContext: { uid: 'attacker_1', email: 'evil@test.com', email_verified: true },
    payload: {
      uid: 'attacker_1',
      fullName: 'Attacker',
      email: 'evil@test.com',
      phone: '9800000000',
      role: 'user',
      walletBalance: 50000,
      lastTxId: 'init',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unbacked Wallet Balance Inflation (Update Gap)',
    collection: 'users',
    docId: 'attacker_1',
    operation: 'update',
    authContext: { uid: 'attacker_1', email: 'evil@test.com', email_verified: true },
    payload: {
      walletBalance: 999999,
      lastTxId: 'forged_tx_99',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Profile Update',
    collection: 'users',
    docId: 'user_1',
    operation: 'update',
    authContext: { uid: 'user_1', email: 'user1@test.com', email_verified: true },
    payload: {
      fullName: 'Valid Name',
      isVerifiedMerchant: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'PII Scrape by Non-Owner',
    collection: 'users',
    docId: 'victim_uid',
    operation: 'get',
    authContext: { uid: 'attacker_1', email: 'evil@test.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Unverified Admin Email Spoof',
    collection: 'products',
    docId: 'hack_game',
    operation: 'create',
    authContext: { uid: 'spoof_uid', email: 'paknep1414k@gmail.com', email_verified: false },
    payload: {
      id: 'hack_game',
      name: 'Spoofed Game',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'ID Poisoning & Oversized Field Resource Exhaustion',
    collection: 'orders',
    docId: 'bad$id!poison',
    operation: 'create',
    authContext: { uid: 'user_1', email: 'user1@test.com', email_verified: true },
    payload: {
      targetAccount: 'X'.repeat(5000),
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Orphaned Package Creation Referencing Missing Product',
    collection: 'packages',
    docId: 'pkg_orphan',
    operation: 'create',
    authContext: { uid: 'admin_uid', email: 'paknep1414k@gmail.com', email_verified: true },
    payload: {
      id: 'pkg_orphan',
      productId: 'non_existent_product_999',
      name: 'Orphan UC',
      amountLabel: '60 UC',
      bonusLabel: '',
      serviceType: 'topup',
      priceNpr: 150,
      originalPriceNpr: 170,
      sortOrder: 1,
      active: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Order Creation With Spoofed Price or Pre-Marked Successful Status',
    collection: 'orders',
    docId: 'ord_free',
    operation: 'create',
    authContext: { uid: 'user_1', email: 'user1@test.com', email_verified: true },
    payload: {
      id: 'ord_free',
      status: 'Successful',
      priceNpr: 1,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Cross-Tenant Order List Query Without userId Filter',
    collection: 'orders',
    docId: '*',
    operation: 'list',
    authContext: { uid: 'attacker_1', email: 'evil@test.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Sub-Minimum Fonepay Top-Up (< Rs. 10)',
    collection: 'transactions',
    docId: 'tx_tiny',
    operation: 'create',
    authContext: { uid: 'user_1', email: 'user1@test.com', email_verified: true },
    payload: {
      id: 'tx_tiny',
      type: 'topup',
      gateway: 'Fonepay',
      amountNpr: 2,
      status: 'verified',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Backdated Client Timestamp Forgery',
    collection: 'orders',
    docId: 'ord_backdated',
    operation: 'create',
    authContext: { uid: 'user_1', email: 'user1@test.com', email_verified: true },
    payload: {
      id: 'ord_backdated',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
