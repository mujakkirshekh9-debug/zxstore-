import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, SUPER_ADMIN_EMAIL } from '../firebase';
import { DEFAULT_PACKAGES, DEFAULT_PRODUCTS, seedDefaultCatalogToFirestore } from '../data/seedCatalog';
import {
  generateReferenceCode,
  generateSafeId,
  OperationType,
  Order,
  Product,
  TopUpPackage,
  UserProfile,
  VALIDATION_LIMITS,
  WalletTransaction,
} from '../types';

interface StoreContextValue {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  authReady: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCatalogSeededInDb: boolean;
  products: Product[];
  packages: TopUpPackage[];
  userOrders: Order[];
  userTransactions: WalletTransaction[];
  signInWithGoogle: () => Promise<FirebaseUser>;
  loginWithEmail: (email: string, password: string) => Promise<FirebaseUser>;
  registerWithEmail: (params: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<FirebaseUser>;
  sendResetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshAuthUser: () => Promise<void>;
  logout: () => Promise<void>;
  saveProfileChanges: (fullName: string, phone: string) => Promise<void>;
  submitPendingWalletRequest: (
    amountNpr: number,
    paymentProofRef: string
  ) => Promise<WalletTransaction>;
  purchasePackage: (params: {
    product: Product;
    pkg: TopUpPackage;
    targetAccount: string;
    quantity: number;
  }) => Promise<Order>;
  seedCatalogNow: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbPackages, setDbPackages] = useState<TopUpPackage[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [packagesLoaded, setPackagesLoaded] = useState(false);

  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userTransactions, setUserTransactions] = useState<WalletTransaction[]>([]);

  const pendingRegistrationMeta = useRef<{ fullName: string; phone: string } | null>(null);
  const autoSeedTriggered = useRef(false);

  // Exclusive Admin: paknep1414k@gmail.com ONLY. All other users remain regular customers.
  const isSuperAdmin = Boolean(
    firebaseUser?.emailVerified &&
      firebaseUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
  );
  const isAdmin = isSuperAdmin;

  // 1. Track Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserProfile(null);
        setUserOrders([]);
        setUserTransactions([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // 2. Public Storefront Listeners (active == true)
  useEffect(() => {
    const productsQuery = query(collection(db, 'products'), where('active', '==', true));
    const unsubProducts = onSnapshot(
      productsQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as Product)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setDbProducts(list);
        setProductsLoaded(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'products');
      }
    );

    const packagesQuery = query(collection(db, 'packages'), where('active', '==', true));
    const unsubPackages = onSnapshot(
      packagesQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as TopUpPackage)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setDbPackages(list);
        setPackagesLoaded(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'packages');
      }
    );

    return () => {
      unsubProducts();
      unsubPackages();
    };
  }, []);

  // 3. Auto-seed or upgrade Firestore catalog when Admin (paknep1414k@gmail.com) logs in
  useEffect(() => {
    const hasUpdatedFreeFireCatalog = dbPackages.some(
      (p) => p.id === 'pkg_ff_lvl30' && p.priceNpr === 165
    );
    if (
      authReady &&
      isSuperAdmin &&
      productsLoaded &&
      packagesLoaded &&
      (dbProducts.length === 0 || !hasUpdatedFreeFireCatalog) &&
      !autoSeedTriggered.current
    ) {
      autoSeedTriggered.current = true;
      seedDefaultCatalogToFirestore().catch((err) => {
        console.error('Initial catalog sync error:', err);
      });
    }
  }, [authReady, isSuperAdmin, productsLoaded, packagesLoaded, dbProducts.length, dbPackages]);

  // 4. Bootstrap & observe authenticated UserProfile + Orders + Transactions
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const uid = firebaseUser.uid;
    const userRef = doc(db, 'users', uid);

    let unsubUser: (() => void) | undefined;
    let unsubOrders: (() => void) | undefined;
    let unsubTxs: (() => void) | undefined;

    const setupUserProfileAndListeners = async () => {
      if (firebaseUser.emailVerified) {
        try {
          const existingSnap = await getDoc(userRef);
          const isOwnerAdminEmail =
            firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

          if (!existingSnap.exists()) {
            const rawName =
              pendingRegistrationMeta.current?.fullName ||
              firebaseUser.displayName ||
              firebaseUser.email?.split('@')[0] ||
              'ZX Customer';
            const cleanName = rawName.trim().slice(0, VALIDATION_LIMITS.USER_NAME_MAX);
            const finalName = cleanName.length >= 2 ? cleanName : 'ZX Member';

            const rawPhone = pendingRegistrationMeta.current?.phone?.trim() || '';
            const validPhone =
              rawPhone.length >= 7 &&
              rawPhone.length <= 20 &&
              VALIDATION_LIMITS.PHONE_REGEX.test(rawPhone)
                ? rawPhone
                : '';

            await setDoc(userRef, {
              uid,
              fullName: finalName,
              email: (firebaseUser.email || 'member@zxstore.np').slice(
                0,
                VALIDATION_LIMITS.EMAIL_MAX
              ),
              phone: validPhone,
              role: isOwnerAdminEmail ? 'admin' : 'user',
              walletBalance: 0,
              lastTxId: 'init',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            pendingRegistrationMeta.current = null;
          } else if (isOwnerAdminEmail && existingSnap.data()?.role !== 'admin') {
            await updateDoc(userRef, {
              role: 'admin',
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
        }
      }

      unsubUser = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${uid}`);
        }
      );

      const ordersQuery = query(collection(db, 'orders'), where('userId', '==', uid));
      unsubOrders = onSnapshot(
        ordersQuery,
        (snap) => {
          const items = snap.docs.map((d) => d.data() as Order);
          items.sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return tb - ta;
          });
          setUserOrders(items);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'orders');
        }
      );

      const txQuery = query(collection(db, 'transactions'), where('userId', '==', uid));
      unsubTxs = onSnapshot(
        txQuery,
        (snap) => {
          const items = snap.docs.map((d) => d.data() as WalletTransaction);
          items.sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return tb - ta;
          });
          setUserTransactions(items);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'transactions');
        }
      );
    };

    setupUserProfileAndListeners();

    return () => {
      if (unsubUser) unsubUser();
      if (unsubOrders) unsubOrders();
      if (unsubTxs) unsubTxs();
    };
  }, [authReady, firebaseUser, firebaseUser?.emailVerified]);

  const signInWithGoogle = async (): Promise<FirebaseUser> => {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  };

  const loginWithEmail = async (email: string, password: string): Promise<FirebaseUser> => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  };

  const registerWithEmail = async ({
    fullName,
    email,
    phone,
    password,
  }: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<FirebaseUser> => {
    pendingRegistrationMeta.current = { fullName: fullName.trim(), phone: phone.trim() };
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: fullName.trim() });
    if (!cred.user.emailVerified) {
      await sendEmailVerification(cred.user);
    }
    return cred.user;
  };

  const sendResetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerification = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const refreshAuthUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setFirebaseUser({ ...auth.currentUser } as FirebaseUser);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const saveProfileChanges = async (fullName: string, phone: string) => {
    if (!firebaseUser || !userProfile) throw new Error('Please sign in first.');
    const cleanName = fullName.trim().slice(0, VALIDATION_LIMITS.USER_NAME_MAX);
    if (cleanName.length < VALIDATION_LIMITS.USER_NAME_MIN) {
      throw new Error('Full name must be at least 2 characters.');
    }

    let finalPhone = userProfile.phone;
    if (userProfile.phone === '' && phone.trim().length > 0) {
      const cleanPhone = phone.trim();
      if (
        cleanPhone.length < VALIDATION_LIMITS.PHONE_MIN ||
        cleanPhone.length > VALIDATION_LIMITS.PHONE_MAX ||
        !VALIDATION_LIMITS.PHONE_REGEX.test(cleanPhone)
      ) {
        throw new Error('Enter a valid mobile number (7–20 digits).');
      }
      finalPhone = cleanPhone;
    }

    const userRef = doc(db, 'users', firebaseUser.uid);
    try {
      await updateDoc(userRef, {
        fullName: cleanName,
        phone: finalPhone,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  /**
   * Submits an eSewa QR wallet top-up request as strictly 'pending'.
   * Wallet funds are NEVER added automatically — Admin (paknep1414k@gmail.com)
   * must manually verify the eSewa payment before balance increases.
   */
  const submitPendingWalletRequest = async (
    amountNpr: number,
    paymentProofRef: string
  ): Promise<WalletTransaction> => {
    if (!firebaseUser || !userProfile) {
      throw new Error('Please sign in to submit an eSewa payment request.');
    }
    const cleanAmount = Math.round(amountNpr);
    if (
      cleanAmount < VALIDATION_LIMITS.MIN_TOPUP_NPR ||
      cleanAmount > VALIDATION_LIMITS.MAX_TOPUP_NPR
    ) {
      throw new Error(
        `Top-up amount must be between Rs. ${VALIDATION_LIMITS.MIN_TOPUP_NPR} and Rs. 1,00,000.`
      );
    }

    const cleanProof = paymentProofRef.trim().replace(/\s+/g, ' ').slice(0, 120);
    if (cleanProof.length < 4) {
      throw new Error('Please enter your eSewa Transaction Code or Sender eSewa Number.');
    }

    const txId = generateSafeId('tx');
    const referenceCode = generateReferenceCode('ESW');

    const txPayload = {
      id: txId,
      referenceCode,
      userId: firebaseUser.uid,
      userEmail: userProfile.email,
      userName: userProfile.fullName,
      type: 'topup' as const,
      gateway: 'eSewa_QR' as const,
      amountNpr: cleanAmount,
      balanceAfter: Math.round(userProfile.walletBalance),
      status: 'pending' as const,
      note: `eSewa Ref/Sender: ${cleanProof}`.slice(0, VALIDATION_LIMITS.NOTE_MAX),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'transactions', txId), txPayload);
      return {
        ...txPayload,
        createdAt: null,
        updatedAt: null,
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `transactions/${txId}`);
    }
  };

  const purchasePackage = async ({
    product,
    pkg,
    targetAccount,
    quantity,
  }: {
    product: Product;
    pkg: TopUpPackage;
    targetAccount: string;
    quantity: number;
  }): Promise<Order> => {
    if (!firebaseUser) {
      throw new Error('Please log in to complete your purchase.');
    }

    const cleanTarget = targetAccount.trim().slice(0, VALIDATION_LIMITS.TARGET_ACCOUNT_MAX);
    if (cleanTarget.length < VALIDATION_LIMITS.TARGET_ACCOUNT_MIN) {
      throw new Error(`Please enter your ${product.inputLabel} (UID) first.`);
    }

    const cleanQty = Math.max(1, Math.min(100, Math.round(quantity)));
    const totalPrice = Math.round(pkg.priceNpr * cleanQty);

    // Read fresh user profile directly from Firestore to guarantee exact atomic balance math
    const userRef = doc(db, 'users', firebaseUser.uid);
    let freshProfile: UserProfile | null = userProfile;
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        freshProfile = snap.data() as UserProfile;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
    }

    if (!freshProfile) {
      throw new Error('Account profile is still initializing. Please try again in a second.');
    }

    const currentBalance = Math.round(Number(freshProfile.walletBalance) || 0);
    if (currentBalance < totalPrice) {
      throw new Error(
        `Insufficient wallet balance. You need Rs. ${totalPrice - currentBalance} more.`
      );
    }

    const orderId = generateSafeId('ord');
    const txId = generateSafeId('tx');
    const orderCode = generateReferenceCode('ZX');
    const newBalance = Math.round(currentBalance - totalPrice);

    const txPayload = {
      id: txId,
      referenceCode: orderCode,
      userId: firebaseUser.uid,
      userEmail: freshProfile.email,
      userName: freshProfile.fullName,
      type: 'purchase' as const,
      gateway: 'Wallet' as const,
      amountNpr: totalPrice,
      balanceAfter: newBalance,
      status: 'verified' as const,
      note: `${product.name} — ${pkg.name} (x${cleanQty})`.slice(0, VALIDATION_LIMITS.NOTE_MAX),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const orderPayload = {
      id: orderId,
      orderCode,
      userId: firebaseUser.uid,
      userEmail: freshProfile.email,
      userName: freshProfile.fullName,
      productId: product.id,
      productName: product.name.slice(0, VALIDATION_LIMITS.PRODUCT_NAME_MAX),
      productCategory: product.category,
      artworkKey: product.artworkKey,
      packageId: pkg.id,
      packageName: pkg.name.slice(0, VALIDATION_LIMITS.PACKAGE_NAME_MAX),
      targetAccount: cleanTarget,
      quantity: cleanQty,
      priceNpr: totalPrice,
      status: 'Pending' as const,
      txId,
      adminNote: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'transactions', txId), txPayload);
      batch.set(doc(db, 'orders', orderId), orderPayload);
      batch.update(userRef, {
        walletBalance: newBalance,
        lastTxId: txId,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return {
        ...orderPayload,
        createdAt: null,
        updatedAt: null,
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
    }
  };

  const seedCatalogNow = async () => {
    await seedDefaultCatalogToFirestore();
  };

  // Merge Firestore packages with updated local defaults if a package hasn't been synced yet
  const isCatalogSeededInDb = dbProducts.length > 0;
  const products = useMemo(
    () => (dbProducts.length > 0 ? dbProducts : DEFAULT_PRODUCTS),
    [dbProducts]
  );
  const packages = useMemo(() => {
    if (dbPackages.length === 0) return DEFAULT_PACKAGES;
    const hasUpdatedFreeFire = dbPackages.some(
      (p) => p.id === 'pkg_ff_lvl30' && p.priceNpr === 165
    );
    if (hasUpdatedFreeFire) return dbPackages;
    // Before admin logs in to re-sync Firestore, display updated Free Fire BD/NP rates seamlessly
    const nonFfDb = dbPackages.filter((p) => p.productId !== 'freefire_bd_np');
    const updatedFf = DEFAULT_PACKAGES.filter((p) => p.productId === 'freefire_bd_np');
    return [...updatedFf, ...nonFfDb];
  }, [dbPackages]);

  const value: StoreContextValue = {
    firebaseUser,
    userProfile,
    authReady,
    isAdmin,
    isSuperAdmin,
    isCatalogSeededInDb,
    products,
    packages,
    userOrders,
    userTransactions,
    signInWithGoogle,
    loginWithEmail,
    registerWithEmail,
    sendResetPassword,
    resendVerification,
    refreshAuthUser,
    logout,
    saveProfileChanges,
    submitPendingWalletRequest,
    purchasePackage,
    seedCatalogNow,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
