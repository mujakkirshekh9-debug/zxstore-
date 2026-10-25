import { Timestamp } from 'firebase/firestore';

export const APP_LOGO_PATH =
  '/assets/aistudio/file_00000000fd9881f48cd12dd86ec6f845_4c5f6f1b.png';
export const ESEWA_QR_PATH =
  '/assets/aistudio/Screenshot_20261025-161518_22fbd88d.png';
export const ESEWA_MERCHANT_NAME = 'Mo. Ashif Khan';
export const ESEWA_MERCHANT_ID = '9716748756';

export const GAME_LOGO_PATHS = {
  freefire:
    '/assets/aistudio/square-garena-logo-with-symbol-free-fire-11764782788sgnxewraxn_a51cf67a.webp',
  pubg: '/assets/aistudio/pubg-logo-rounded-glossy-icon-with-transparent-background-free-png_ab2894a1.png',
  mlbb: '/assets/aistudio/mobile-legends-logo-rounded-square-icon-free-png_3faa6e11.png',
  bloodstrike: '/assets/aistudio/a2080174946_16_1a6ae05f.jpg',
} as const;

/**
 * Validation constants synchronized verbatim with firebase-blueprint.json
 * and firestore.rules to guarantee strict schema compliance.
 */
export const VALIDATION_LIMITS = {
  ID_MAX_LEN: 128,
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  SLUG_REGEX: /^[a-z0-9-]+$/,
  PHONE_REGEX: /^[0-9+\- ]+$/,
  ORDER_CODE_REGEX: /^[A-Z0-9-]+$/,
  ARTWORK_KEY_REGEX: /^[a-z0-9_-]+$/,
  USER_NAME_MIN: 2,
  USER_NAME_MAX: 80,
  EMAIL_MIN: 5,
  EMAIL_MAX: 120,
  PHONE_MIN: 7,
  PHONE_MAX: 20,
  PRODUCT_NAME_MIN: 2,
  PRODUCT_NAME_MAX: 80,
  PUBLISHER_MIN: 2,
  PUBLISHER_MAX: 60,
  DESCRIPTION_MIN: 5,
  DESCRIPTION_MAX: 400,
  INPUT_LABEL_MIN: 2,
  INPUT_LABEL_MAX: 60,
  INPUT_PLACEHOLDER_MIN: 2,
  INPUT_PLACEHOLDER_MAX: 80,
  BADGE_MAX: 30,
  PACKAGE_NAME_MIN: 2,
  PACKAGE_NAME_MAX: 100,
  AMOUNT_LABEL_MIN: 1,
  AMOUNT_LABEL_MAX: 60,
  BONUS_LABEL_MAX: 60,
  TARGET_ACCOUNT_MIN: 2,
  TARGET_ACCOUNT_MAX: 200,
  NOTE_MAX: 240,
  MIN_TOPUP_NPR: 10,
  MAX_TOPUP_NPR: 100000,
  MAX_WALLET_NPR: 10000000,
} as const;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export type UserRole = 'user' | 'admin';
export type ProductCategory = 'game' | 'digital' | 'smm';
export type SmmPlatform = 'none' | 'Instagram' | 'Facebook' | 'YouTube' | 'TikTok' | 'Telegram';
export type ServiceType = 'topup' | 'Followers' | 'Likes' | 'Views' | 'Members';
export type OrderStatus = 'Pending' | 'Successful' | 'Cancelled';
export type TransactionType = 'topup' | 'purchase' | 'admin_credit' | 'admin_debit' | 'refund';
export type PaymentGateway = 'eSewa_QR' | 'Wallet' | 'Admin';
export type TransactionStatus = 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  walletBalance: number;
  lastTxId: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  smmPlatform: SmmPlatform;
  publisher: string;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  artworkKey: string;
  badgeText: string;
  sortOrder: number;
  active: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface TopUpPackage {
  id: string;
  productId: string;
  name: string;
  amountLabel: string;
  bonusLabel: string;
  serviceType: ServiceType;
  priceNpr: number;
  originalPriceNpr: number;
  sortOrder: number;
  active: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  userEmail: string;
  userName: string;
  productId: string;
  productName: string;
  productCategory: ProductCategory;
  artworkKey: string;
  packageId: string;
  packageName: string;
  targetAccount: string;
  quantity: number;
  priceNpr: number;
  status: OrderStatus;
  txId: string;
  adminNote: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface WalletTransaction {
  id: string;
  referenceCode: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: TransactionType;
  gateway: PaymentGateway;
  amountNpr: number;
  balanceAfter: number;
  status: TransactionStatus;
  note: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ActiveTab = 'home' | 'orders' | 'smm' | 'profile' | 'auth' | 'admin';

export function formatNpr(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatTimestamp(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Just now';
  const date = ts.toDate();
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, VALIDATION_LIMITS.ID_MAX_LEN);
}

export function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 9);
  return sanitizeId(`${prefix}_${Date.now()}_${rand}`);
}

export function generateReferenceCode(prefix: string): string {
  const now = new Date();
  const ymd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ymd}-${digits}`;
}
