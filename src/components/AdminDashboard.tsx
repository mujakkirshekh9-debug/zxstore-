import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Edit3,
  Gamepad2,
  LogOut,
  Package,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, SUPER_ADMIN_EMAIL } from '../firebase';
import {
  ActiveTab,
  APP_LOGO_PATH,
  formatNpr,
  formatTimestamp,
  generateReferenceCode,
  generateSafeId,
  OperationType,
  Order,
  OrderStatus,
  Product,
  ProductCategory,
  ServiceType,
  SmmPlatform,
  TopUpPackage,
  UserProfile,
  VALIDATION_LIMITS,
  WalletTransaction,
} from '../types';
import { GameArtwork } from './GameArtwork';

interface AdminDashboardProps {
  onNavigate: (tab: ActiveTab) => void;
}

type AdminSection = 'overview' | 'catalog' | 'orders' | 'users' | 'transactions';

const ARTWORK_OPTIONS = [
  { value: 'freefire_np', label: 'Garena Free Fire (BD/NP Logo)' },
  { value: 'pubg', label: 'PUBG Mobile (Official Logo)' },
  { value: 'mlbb', label: 'Mobile Legends (Official Logo)' },
  { value: 'bloodstrike', label: 'Blood Strike (Official Logo)' },
  { value: 'freefire_id', label: 'Garena Free Fire (ID Badge)' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'smm_ig', label: 'Instagram SMM' },
  { value: 'smm_fb', label: 'Facebook SMM' },
  { value: 'smm_yt', label: 'YouTube SMM' },
  { value: 'smm_tt', label: 'TikTok SMM' },
  { value: 'smm_tg', label: 'Telegram SMM' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const {
    firebaseUser,
    isAdmin,
    isSuperAdmin,
    isCatalogSeededInDb,
    seedCatalogNow,
    signInWithGoogle,
    logout,
  } = useStore();

  const [section, setSection] = useState<AdminSection>('overview');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allPackages, setAllPackages] = useState<TopUpPackage[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([]);

  const [bannerNotice, setBannerNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [seeding, setSeeding] = useState(false);
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);

  // Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | OrderStatus>('All');
  const [userSearch, setUserSearch] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'pending' | 'topup' | 'purchase' | 'admin'>(
    'all'
  );
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Modals State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  const [editingPackage, setEditingPackage] = useState<Partial<TopUpPackage> | null>(null);
  const [isNewPackage, setIsNewPackage] = useState(false);

  const [walletModalUser, setWalletModalUser] = useState<UserProfile | null>(null);
  const [walletAdjustMode, setWalletAdjustMode] = useState<'credit' | 'debit'>('credit');
  const [walletAdjustAmount, setWalletAdjustAmount] = useState('500');
  const [walletAdjustNote, setWalletAdjustNote] = useState('Manual wallet adjustment by Admin');

  // Attach global listeners exclusively when signed in as paknep1414k@gmail.com
  useEffect(() => {
    if (!isSuperAdmin) return;

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const items = snap.docs
          .map((d) => d.data() as Product)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setAllProducts(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'products')
    );

    const unsubPackages = onSnapshot(
      collection(db, 'packages'),
      (snap) => {
        const items = snap.docs
          .map((d) => d.data() as TopUpPackage)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setAllPackages(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'packages')
    );

    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as Order);
        items.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setAllOrders(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as UserProfile);
        items.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setAllUsers(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubTxs = onSnapshot(
      collection(db, 'transactions'),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as WalletTransaction);
        items.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setAllTransactions(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
    );

    return () => {
      unsubProducts();
      unsubPackages();
      unsubOrders();
      unsubUsers();
      unsubTxs();
    };
  }, [isSuperAdmin]);

  const showNotice = (type: 'ok' | 'err', text: string) => {
    setBannerNotice({ type, text });
    window.setTimeout(() => setBannerNotice(null), 4000);
  };

  const handleCopy = (val: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedText(val);
    window.setTimeout(() => setCopiedText(null), 1500);
  };

  // Pending eSewa Top-Ups List
  const pendingTopups = useMemo(
    () => allTransactions.filter((t) => t.type === 'topup' && t.status === 'pending'),
    [allTransactions]
  );

  // KPI Metrics
  const stats = useMemo(() => {
    const successfulRevenue = allOrders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((acc, o) => acc + o.priceNpr, 0);
    const pendingOrdersCount = allOrders.filter((o) => o.status === 'Pending').length;
    const totalWalletFloat = allUsers.reduce((acc, u) => acc + u.walletBalance, 0);
    return {
      successfulRevenue,
      pendingOrdersCount,
      pendingTopupsCount: pendingTopups.length,
      totalWalletFloat,
    };
  }, [allOrders, pendingTopups.length, allUsers]);

  // Filtered Lists
  const filteredOrders = useMemo(() => {
    return allOrders.filter((o) => {
      if (orderStatusFilter !== 'All' && o.status !== orderStatusFilter) return false;
      if (!orderSearch.trim()) return true;
      const q = orderSearch.toLowerCase();
      return (
        o.orderCode.toLowerCase().includes(q) ||
        o.targetAccount.toLowerCase().includes(q) ||
        o.userEmail.toLowerCase().includes(q) ||
        o.userName.toLowerCase().includes(q) ||
        o.productName.toLowerCase().includes(q)
      );
    });
  }, [allOrders, orderStatusFilter, orderSearch]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
    );
  }, [allUsers, userSearch]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((t) => {
      if (txFilter === 'pending') return t.status === 'pending';
      if (txFilter === 'topup') return t.type === 'topup';
      if (txFilter === 'purchase') return t.type === 'purchase';
      if (txFilter === 'admin') {
        return t.type === 'admin_credit' || t.type === 'admin_debit' || t.type === 'refund';
      }
      return true;
    });
  }, [allTransactions, txFilter]);

  // Gate View if non-admin
  if (!firebaseUser || !isAdmin) {
    return (
      <div className="max-w-lg mx-auto py-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-5 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-slate-900">ZX STORE Admin Portal</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Administrator portal access is exclusively reserved for{' '}
              <span className="font-mono-num font-semibold text-slate-900">
                {SUPER_ADMIN_EMAIL}
              </span>
              . All other accounts operate as standard customer accounts.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="h-11 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Sign in with Admin Google
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="h-11 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
            >
              Return to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Admin Mutation Handlers
  // =========================================================================

  const handleSeedCatalog = async () => {
    setSeeding(true);
    try {
      await seedCatalogNow();
      showNotice(
        'ok',
        'Default games, updated Free Fire BD/NP rates, and SMM packages synced to Firestore.'
      );
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Failed to sync catalog.');
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const cleanName = (editingProduct.name || '').trim().slice(0, VALIDATION_LIMITS.PRODUCT_NAME_MAX);
    if (cleanName.length < 2) {
      showNotice('err', 'Product name must be at least 2 characters.');
      return;
    }

    const generatedSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    const slug = generatedSlug.length >= 2 ? generatedSlug : 'zx-item';

    const productId = isNewProduct
      ? generateSafeId('prod')
      : editingProduct.id || generateSafeId('prod');

    const category: ProductCategory = editingProduct.category || 'game';
    const smmPlatform: SmmPlatform =
      category === 'smm' ? editingProduct.smmPlatform || 'Instagram' : 'none';

    const payload = {
      id: productId,
      name: cleanName,
      slug,
      category,
      smmPlatform,
      publisher: (editingProduct.publisher || 'ZX Official').trim().slice(0, 60),
      description: (
        editingProduct.description || 'Instant digital delivery to your account.'
      )
        .trim()
        .slice(0, 400),
      inputLabel: (editingProduct.inputLabel || 'Game ID').trim().slice(0, 60),
      inputPlaceholder: (editingProduct.inputPlaceholder || 'Enter Your Game ID')
        .trim()
        .slice(0, 80),
      artworkKey: editingProduct.artworkKey || 'freefire_np',
      badgeText: (editingProduct.badgeText || '').trim().slice(0, 30),
      sortOrder: Math.max(0, Math.min(9999, Math.round(Number(editingProduct.sortOrder) || 1))),
      active: editingProduct.active ?? true,
      updatedAt: serverTimestamp(),
    };

    try {
      if (isNewProduct) {
        await setDoc(doc(db, 'products', productId), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        showNotice('ok', `Added product "${cleanName}".`);
      } else {
        await updateDoc(doc(db, 'products', productId), payload);
        showNotice('ok', `Updated product "${cleanName}".`);
      }
      setEditingProduct(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${productId}`);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      const childPackages = allPackages.filter((p) => p.productId === product.id);
      const batch = writeBatch(db);
      childPackages.forEach((pkg) => {
        batch.delete(doc(db, 'packages', pkg.id));
      });
      batch.delete(doc(db, 'products', product.id));
      await batch.commit();
      showNotice(
        'ok',
        `Deleted "${product.name}" and ${childPackages.length} associated packages.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${product.id}`);
    }
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage || !editingPackage.productId) {
      showNotice('err', 'Please select a parent game/product.');
      return;
    }

    const pkgId = isNewPackage
      ? generateSafeId('pkg')
      : editingPackage.id || generateSafeId('pkg');

    const cleanName = (editingPackage.name || '').trim().slice(0, 100);
    const amountLabel = (editingPackage.amountLabel || cleanName).trim().slice(0, 60);
    const priceNpr = Math.max(1, Math.min(500000, Math.round(Number(editingPackage.priceNpr) || 50)));
    const originalPriceNpr = Math.max(
      priceNpr,
      Math.min(500000, Math.round(Number(editingPackage.originalPriceNpr) || priceNpr))
    );

    const payload = {
      id: pkgId,
      productId: editingPackage.productId,
      name: cleanName.length >= 2 ? cleanName : 'Standard Pack',
      amountLabel: amountLabel.length >= 1 ? amountLabel : '1 Pack',
      bonusLabel: (editingPackage.bonusLabel || '').trim().slice(0, 60),
      serviceType: (editingPackage.serviceType || 'topup') as ServiceType,
      priceNpr,
      originalPriceNpr,
      sortOrder: Math.max(0, Math.min(9999, Math.round(Number(editingPackage.sortOrder) || 1))),
      active: editingPackage.active ?? true,
      updatedAt: serverTimestamp(),
    };

    try {
      if (isNewPackage) {
        await setDoc(doc(db, 'packages', pkgId), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        showNotice('ok', `Added package "${payload.amountLabel}".`);
      } else {
        await updateDoc(doc(db, 'packages', pkgId), payload);
        showNotice('ok', `Updated package "${payload.amountLabel}".`);
      }
      setEditingPackage(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `packages/${pkgId}`);
    }
  };

  const handleDeletePackage = async (pkg: TopUpPackage) => {
    try {
      await deleteDoc(doc(db, 'packages', pkg.id));
      showNotice('ok', `Removed package "${pkg.amountLabel}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `packages/${pkg.id}`);
    }
  };

  const handleUpdateOrderStatus = async (order: Order, nextStatus: OrderStatus, refund = false) => {
    try {
      if (refund && nextStatus === 'Cancelled' && order.status !== 'Cancelled') {
        const userRef = doc(db, 'users', order.userId);
        const userSnap = await getDoc(userRef);
        const txId = generateSafeId('tx');
        const batch = writeBatch(db);

        let newBalance = Math.round(order.priceNpr);
        let customerEmail = (order.userEmail || 'member@zxstore.np').trim().slice(0, 120);
        let customerName = (order.userName || 'ZX Member').trim().slice(0, 80);
        if (customerEmail.length < 5) customerEmail = 'member@zxstore.np';
        if (customerName.length < 2) customerName = 'ZX Member';

        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          const currentBalance = Number(userData.walletBalance) || 0;
          newBalance = Math.min(10000000, Math.round(currentBalance + order.priceNpr));
          customerEmail = userData.email || customerEmail;
          customerName = userData.fullName || customerName;

          batch.update(userRef, {
            walletBalance: newBalance,
            lastTxId: txId,
            updatedAt: serverTimestamp(),
          });
        } else {
          const isOwnerAdmin = customerEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
          batch.set(userRef, {
            uid: order.userId,
            fullName: customerName,
            email: customerEmail,
            phone: '',
            role: isOwnerAdmin ? 'admin' : 'user',
            walletBalance: newBalance,
            lastTxId: txId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        batch.update(doc(db, 'orders', order.id), {
          status: 'Cancelled',
          adminNote: 'Cancelled & refunded to wallet',
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'transactions', txId), {
          id: txId,
          referenceCode: generateReferenceCode('REF'),
          userId: order.userId,
          userEmail: customerEmail,
          userName: customerName,
          type: 'refund',
          gateway: 'Admin',
          amountNpr: order.priceNpr,
          balanceAfter: newBalance,
          status: 'verified',
          note: `Refund for cancelled order #${order.orderCode}`.slice(0, 240),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
        showNotice(
          'ok',
          `Order #${order.orderCode} cancelled and ${formatNpr(order.priceNpr)} refunded.`
        );
        return;
      }

      await updateDoc(doc(db, 'orders', order.id), {
        status: nextStatus,
        adminNote:
          nextStatus === 'Successful'
            ? 'Delivered to account'
            : nextStatus === 'Cancelled'
              ? 'Order cancelled by Admin'
              : '',
        updatedAt: serverTimestamp(),
      });
      showNotice('ok', `Order #${order.orderCode} marked ${nextStatus}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const handleAdjustUserWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletModalUser) return;

    const amt = Math.round(Number(walletAdjustAmount) || 0);
    if (amt < 1 || amt > 500000) {
      showNotice('err', 'Enter an amount between Rs. 1 and Rs. 5,00,000.');
      return;
    }

    const txId = generateSafeId('tx');
    const cleanNote =
      walletAdjustNote.trim().slice(0, 240) ||
      `Admin ${walletAdjustMode === 'credit' ? 'credit' : 'debit'}`;

    try {
      const userRef = doc(db, 'users', walletModalUser.uid);
      const freshSnap = await getDoc(userRef);
      const currentBalance = freshSnap.exists()
        ? Number((freshSnap.data() as UserProfile).walletBalance) || 0
        : walletModalUser.walletBalance;

      const delta = walletAdjustMode === 'credit' ? amt : -amt;
      const newBalance = Math.max(0, Math.min(10000000, Math.round(currentBalance + delta)));
      const actualDelta = Math.abs(newBalance - currentBalance);

      if (actualDelta === 0) {
        showNotice('err', 'User wallet balance is already Rs. 0.');
        return;
      }

      const batch = writeBatch(db);
      if (freshSnap.exists()) {
        batch.update(userRef, {
          walletBalance: newBalance,
          lastTxId: txId,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(userRef, {
          uid: walletModalUser.uid,
          fullName: walletModalUser.fullName,
          email: walletModalUser.email,
          phone: walletModalUser.phone || '',
          role: walletModalUser.role || 'user',
          walletBalance: newBalance,
          lastTxId: txId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      batch.set(doc(db, 'transactions', txId), {
        id: txId,
        referenceCode: generateReferenceCode('ADM'),
        userId: walletModalUser.uid,
        userEmail: walletModalUser.email,
        userName: walletModalUser.fullName,
        type: walletAdjustMode === 'credit' ? 'admin_credit' : 'admin_debit',
        gateway: 'Admin',
        amountNpr: actualDelta,
        balanceAfter: newBalance,
        status: 'verified',
        note: cleanNote.length >= 2 ? cleanNote : 'Admin adjustment',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      showNotice(
        'ok',
        `${walletAdjustMode === 'credit' ? 'Credited' : 'Debited'} ${formatNpr(actualDelta)} for ${walletModalUser.fullName}.`
      );
      setWalletModalUser(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${walletModalUser.uid}`);
    }
  };

  const handleResolvePendingTopup = async (
    tx: WalletTransaction,
    decision: 'verified' | 'rejected'
  ) => {
    if (processingTxId) return;
    setProcessingTxId(tx.id);
    try {
      if (decision === 'rejected') {
        await updateDoc(doc(db, 'transactions', tx.id), {
          status: 'rejected',
          note: `${tx.note} · Rejected by Admin`.slice(0, 240),
          updatedAt: serverTimestamp(),
        });
        showNotice('ok', `Rejected eSewa payment request ${tx.referenceCode}.`);
        return;
      }

      // Fetch user profile directly from Firestore (avoids any client cache or index mismatch)
      const userRef = doc(db, 'users', tx.userId);
      const userSnap = await getDoc(userRef);

      const batch = writeBatch(db);
      let newBalance = Math.min(10000000, Math.round(tx.amountNpr));
      let customerName = tx.userName || 'Customer';

      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        const currentBalance = Number(userData.walletBalance) || 0;
        newBalance = Math.min(10000000, Math.round(currentBalance + tx.amountNpr));
        customerName = userData.fullName || customerName;

        batch.update(userRef, {
          walletBalance: newBalance,
          lastTxId: tx.id,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Self-healing fallback: initialize valid user profile document with approved balance
        const fallbackName = (tx.userName || 'ZX Member').trim().slice(0, 80);
        const safeName = fallbackName.length >= 2 ? fallbackName : 'ZX Member';
        const fallbackEmail = (tx.userEmail || 'member@zxstore.np').trim().slice(0, 120);
        const safeEmail = fallbackEmail.length >= 5 ? fallbackEmail : 'member@zxstore.np';
        const isOwnerAdmin = safeEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        customerName = safeName;

        batch.set(userRef, {
          uid: tx.userId,
          fullName: safeName,
          email: safeEmail,
          phone: '',
          role: isOwnerAdmin ? 'admin' : 'user',
          walletBalance: newBalance,
          lastTxId: tx.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      batch.update(doc(db, 'transactions', tx.id), {
        status: 'verified',
        balanceAfter: newBalance,
        note: `${tx.note} · Approved`.slice(0, 240),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      showNotice(
        'ok',
        `Approved ${tx.referenceCode} and credited ${formatNpr(tx.amountNpr)} to ${customerName} (Balance: ${formatNpr(newBalance)}).`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `transactions/${tx.id}`);
    } finally {
      setProcessingTxId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Portal Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <img
            src={APP_LOGO_PATH}
            alt="ZX STORE"
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
          />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Preview User Storefront</span>
              </button>
              <span aria-hidden="true">/</span>
              <span className="font-mono-num">{SUPER_ADMIN_EMAIL}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              ZX STORE Admin Portal
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={seeding}
            onClick={handleSeedCatalog}
            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Database className="w-4 h-4 text-blue-700" />
            <span>
              {seeding
                ? 'Syncing...'
                : isCatalogSeededInDb
                  ? 'Sync Default Catalog'
                  : 'Seed Default Catalog'}
            </span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await logout();
              onNavigate('home');
            }}
            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {bannerNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-3 ${
            bannerNotice.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{bannerNotice.text}</span>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="text-current opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto">
        {(
          [
            { id: 'overview', label: 'Overview', Icon: ShieldCheck },
            { id: 'catalog', label: `Products (${allProducts.length})`, Icon: Gamepad2 },
            { id: 'orders', label: `Orders (${allOrders.length})`, Icon: ReceiptText },
            { id: 'users', label: `Users (${allUsers.length})`, Icon: Users },
            {
              id: 'transactions',
              label: `eSewa & Wallet (${pendingTopups.length} pending)`,
              Icon: Wallet,
            },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              section === id
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* SECTION 1: OVERVIEW */}
      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
              <div className="text-xs font-medium text-slate-500">Order Volume (NPR)</div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {formatNpr(stats.successfulRevenue)}
              </div>
              <div className="text-xs text-slate-400 tabular-nums">
                {allOrders.length} total orders
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
              <div className="text-xs font-medium text-slate-500">Pending Deliveries</div>
              <div className="text-2xl font-extrabold text-amber-700 tabular-nums">
                {stats.pendingOrdersCount}
              </div>
              <div className="text-xs text-slate-400">Awaiting UID fulfillment</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
              <div className="text-xs font-medium text-slate-500">Pending eSewa QR</div>
              <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">
                {stats.pendingTopupsCount}
              </div>
              <div className="text-xs text-slate-400">Awaiting manual approval</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
              <div className="text-xs font-medium text-slate-500">Registered Customers</div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {allUsers.length}
              </div>
              <div className="text-xs text-slate-400 tabular-nums">
                Wallet Float: {formatNpr(stats.totalWalletFloat)}
              </div>
            </div>
          </div>

          {/* Pending Action Queues */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Queue 1: Pending eSewa QR Wallet Requests */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Pending eSewa QR Requests ({pendingTopups.length})
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setTxFilter('pending');
                    setSection('transactions');
                  }}
                  className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  Open eSewa Logs
                </button>
              </div>
              {pendingTopups.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">
                  No pending eSewa QR wallet requests right now.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingTopups.slice(0, 6).map((tx) => (
                    <div
                      key={tx.id}
                      className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {tx.userName} &middot;{' '}
                          <span className="text-emerald-700 font-extrabold tabular-nums">
                            {formatNpr(tx.amountNpr)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 truncate">{tx.note}</div>
                        <div className="text-[11px] text-slate-400 font-mono-num">
                          {tx.referenceCode} &middot; {formatTimestamp(tx.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={processingTxId === tx.id}
                          onClick={() => handleResolvePendingTopup(tx, 'verified')}
                          className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                        >
                          {processingTxId === tx.id ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={processingTxId === tx.id}
                          onClick={() => handleResolvePendingTopup(tx, 'rejected')}
                          className="h-9 px-3 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-700 text-xs font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Queue 2: Latest Incoming Game Top-Up Orders */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Latest Incoming Orders</h2>
                <button
                  type="button"
                  onClick={() => setSection('orders')}
                  className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  Manage all
                </button>
              </div>
              {allOrders.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No customer orders recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {allOrders.slice(0, 6).map((ord) => (
                    <div
                      key={ord.id}
                      className="py-3 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {ord.productName} &middot; {ord.packageName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono-num truncate">
                          ID: {ord.targetAccount} &middot; {ord.userName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-slate-900 tabular-nums">
                          {formatNpr(ord.priceNpr)}
                        </span>
                        {ord.status === 'Pending' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(ord, 'Successful')}
                            className="h-8 px-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
                          >
                            Complete
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">{ord.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: MANAGE PRODUCTS, GAMES & PACKAGES */}
      {section === 'catalog' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Games, Digital &amp; SMM Catalog</h2>
              <p className="text-xs text-slate-500">
                Add or edit titles and manage their NPR diamond / membership / SMM packages.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsNewProduct(true);
                  setEditingProduct({
                    name: '',
                    category: 'game',
                    smmPlatform: 'none',
                    publisher: 'Official Publisher',
                    description: 'Instant top-up delivered directly via Game ID.',
                    inputLabel: 'Game ID',
                    inputPlaceholder: 'Enter Your Game ID',
                    artworkKey: 'freefire_np',
                    badgeText: 'Instant',
                    sortOrder: allProducts.length + 1,
                    active: true,
                  });
                }}
                className="h-10 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Game / Service</span>
              </button>

              <button
                type="button"
                disabled={allProducts.length === 0}
                onClick={() => {
                  setIsNewPackage(true);
                  setEditingPackage({
                    productId: allProducts[0]?.id || '',
                    name: '',
                    amountLabel: '',
                    bonusLabel: '',
                    serviceType: 'topup',
                    priceNpr: 100,
                    originalPriceNpr: 120,
                    sortOrder: 1,
                    active: true,
                  });
                }}
                className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Package className="w-4 h-4 text-blue-700" />
                <span>Add Package</span>
              </button>
            </div>
          </div>

          {allProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                Firestore catalog is currently empty.
              </p>
              <button
                type="button"
                onClick={handleSeedCatalog}
                className="h-10 px-5 rounded-xl bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                Seed Default Games &amp; Packages
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {allProducts.map((prod) => {
                const prodPkgs = allPackages.filter((p) => p.productId === prod.id);
                return (
                  <div
                    key={prod.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                          <GameArtwork artworkKey={prod.artworkKey} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 truncate">
                              {prod.name}
                            </h3>
                            <span className="text-xs text-slate-400">
                              &middot; {prod.category.toUpperCase()} &middot; {prodPkgs.length} items
                              {!prod.active ? ' · Hidden' : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {prod.publisher} &middot; Input: {prod.inputLabel}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewPackage(true);
                            setEditingPackage({
                              productId: prod.id,
                              name: '',
                              amountLabel: '',
                              bonusLabel: '',
                              serviceType: prod.category === 'smm' ? 'Followers' : 'topup',
                              priceNpr: 100,
                              originalPriceNpr: 120,
                              sortOrder: prodPkgs.length + 1,
                              active: true,
                            });
                          }}
                          className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Package</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewProduct(false);
                            setEditingProduct(prod);
                          }}
                          className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${prod.name}`}
                          onClick={() => handleDeleteProduct(prod)}
                          className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {prodPkgs.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {prodPkgs.map((pkg) => (
                          <div
                            key={pkg.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {pkg.amountLabel}
                              </div>
                              <div className="text-slate-500 truncate">{pkg.name}</div>
                              <div className="font-extrabold text-blue-700 tabular-nums mt-0.5">
                                {formatNpr(pkg.priceNpr)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                aria-label={`Edit ${pkg.amountLabel}`}
                                onClick={() => {
                                  setIsNewPackage(false);
                                  setEditingPackage(pkg);
                                }}
                                className="w-8 h-8 rounded-lg hover:bg-white text-slate-600 flex items-center justify-center cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${pkg.amountLabel}`}
                                onClick={() => handleDeletePackage(pkg)}
                                className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: ORDER MANAGEMENT */}
      {section === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search order code, Game ID, email..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
              {(['All', 'Pending', 'Successful', 'Cancelled'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                    orderStatusFilter === st
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Item &amp; Package</th>
                  <th className="py-3 px-4">Game ID / Link</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No matching orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono-num font-bold text-slate-900">
                          #{ord.orderCode}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          {formatTimestamp(ord.createdAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{ord.userName}</div>
                        <div className="text-xs text-slate-500">{ord.userEmail}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{ord.productName}</div>
                        <div className="text-xs text-slate-500">
                          {ord.packageName} &times; {ord.quantity}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleCopy(ord.targetAccount)}
                          className="inline-flex items-center gap-1.5 font-mono-num font-semibold text-blue-700 hover:underline break-all text-left cursor-pointer"
                          title="Copy Game ID"
                        >
                          <span>{ord.targetAccount}</span>
                          {copiedText === ord.targetAccount ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 shrink-0" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatNpr(ord.priceNpr)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-bold text-xs ${
                            ord.status === 'Successful'
                              ? 'text-emerald-700'
                              : ord.status === 'Pending'
                                ? 'text-amber-700'
                                : 'text-red-700'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {ord.status !== 'Successful' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(ord, 'Successful')}
                              className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                            >
                              Success
                            </button>
                          )}
                          {ord.status !== 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(ord, 'Pending')}
                              className="h-8 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                            >
                              Pending
                            </button>
                          )}
                          {ord.status !== 'Cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(ord, 'Cancelled', true)}
                              className="h-8 px-2.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold cursor-pointer"
                            >
                              Cancel &amp; Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 4: USER MANAGEMENT & WALLET ADJUSTMENTS */}
      {section === 'users' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users by name, email, phone..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Wallet Balance</th>
                  <th className="py-3 px-4 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No registered users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isOwnerAccount =
                      u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{u.fullName}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono-num text-slate-700">
                          {u.phone || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-xs font-bold ${
                              isOwnerAccount ? 'text-blue-700' : 'text-slate-600'
                            }`}
                          >
                            {isOwnerAccount ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                          {formatTimestamp(u.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatNpr(u.walletBalance)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setWalletModalUser(u);
                              setWalletAdjustMode('credit');
                              setWalletAdjustAmount('500');
                              setWalletAdjustNote('Manual wallet adjustment by Admin');
                            }}
                            className="h-8 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
                          >
                            Credit / Debit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 5: TRANSACTION & ESEWA QR LOGS */}
      {section === 'transactions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start overflow-x-auto max-w-full">
            {(
              [
                { id: 'all', label: 'All Entries' },
                { id: 'pending', label: `Pending eSewa QR (${pendingTopups.length})` },
                { id: 'topup', label: 'eSewa Top-Ups' },
                { id: 'purchase', label: 'Order Deductions' },
                { id: 'admin', label: 'Admin / Refunds' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTxFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
                  txFilter === f.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Mobile Cards for Rapid Approval on Phones */}
          <div className="md:hidden space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-500">
                No transactions in this view.
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{tx.userName}</div>
                      <div className="text-xs text-slate-500 truncate">{tx.userEmail}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-slate-900 tabular-nums">
                        {formatNpr(tx.amountNpr)}
                      </div>
                      <div
                        className={`text-xs font-bold ${
                          tx.status === 'verified'
                            ? 'text-emerald-700'
                            : tx.status === 'pending'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {tx.status}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 bg-slate-50 rounded-xl p-3 space-y-1">
                    <div className="font-semibold text-slate-900 break-words">{tx.note}</div>
                    <div className="text-[11px] text-slate-500 font-mono-num">
                      {tx.referenceCode} &middot;{' '}
                      {tx.gateway === 'eSewa_QR' ? 'eSewa QR' : tx.gateway} &middot;{' '}
                      {formatTimestamp(tx.createdAt)}
                    </div>
                  </div>

                  {tx.status === 'pending' && tx.type === 'topup' ? (
                    <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                      <button
                        type="button"
                        disabled={processingTxId === tx.id}
                        onClick={() => handleResolvePendingTopup(tx, 'verified')}
                        className="min-h-[42px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{processingTxId === tx.id ? 'Approving...' : 'Approve'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={processingTxId === tx.id}
                        onClick={() => handleResolvePendingTopup(tx, 'rejected')}
                        className="min-h-[42px] px-3 rounded-xl border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 tabular-nums text-right">
                      Wallet after: {formatNpr(tx.balanceAfter)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Channel &amp; Type</th>
                  <th className="py-3 px-4">eSewa Code / Note</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No transactions in this view.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono-num font-bold text-slate-900">
                          {tx.referenceCode}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          {formatTimestamp(tx.createdAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{tx.userName}</div>
                        <div className="text-xs text-slate-500">{tx.userEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {tx.gateway === 'eSewa_QR' ? 'eSewa QR' : tx.gateway}
                        </div>
                        <div className="text-xs text-slate-500">{tx.type}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs break-words">{tx.note}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatNpr(tx.amountNpr)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-bold ${
                            tx.status === 'verified'
                              ? 'text-emerald-700'
                              : tx.status === 'pending'
                                ? 'text-amber-700'
                                : 'text-red-700'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {tx.status === 'pending' && tx.type === 'topup' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={processingTxId === tx.id}
                              onClick={() => handleResolvePendingTopup(tx, 'verified')}
                              className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{processingTxId === tx.id ? 'Approving...' : 'Approve'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={processingTxId === tx.id}
                              onClick={() => handleResolvePendingTopup(tx, 'rejected')}
                              className="h-8 px-2.5 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 tabular-nums">
                            Bal: {formatNpr(tx.balanceAfter)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD / EDIT PRODUCT */}
      {/* ===================================================================== */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingProduct(null)}
        >
          <form
            onSubmit={handleSaveProduct}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                {isNewProduct ? 'Add Game / Service' : 'Edit Product'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Title</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="e.g. Valorant Points Nepal"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Category</label>
                <select
                  value={editingProduct.category || 'game'}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      category: e.target.value as ProductCategory,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="game">Game</option>
                  <option value="digital">Digital Gift / Stars</option>
                  <option value="smm">SMM Service</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Artwork Icon</label>
                <select
                  value={editingProduct.artworkKey || 'freefire_np'}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, artworkKey: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  {ARTWORK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {editingProduct.category === 'smm' && (
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">SMM Platform</label>
                  <select
                    value={editingProduct.smmPlatform || 'Instagram'}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        smmPlatform: e.target.value as SmmPlatform,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="YouTube">YouTube</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Telegram">Telegram</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Publisher</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={editingProduct.publisher || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, publisher: e.target.value })
                  }
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Input Field Label</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={editingProduct.inputLabel || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, inputLabel: e.target.value })
                  }
                  placeholder="Game ID"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Input Placeholder</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={editingProduct.inputPlaceholder || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, inputPlaceholder: e.target.value })
                  }
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  required
                  minLength={5}
                  maxLength={400}
                  value={editingProduct.description || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Sort Order</label>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={editingProduct.sortOrder ?? 1}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, sortOrder: Number(e.target.value) })
                  }
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm tabular-nums"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  id="prod-active"
                  type="checkbox"
                  checked={editingProduct.active ?? true}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, active: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-700"
                />
                <label htmlFor="prod-active" className="text-sm font-medium text-slate-800">
                  Visible in Storefront
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD / EDIT PACKAGE */}
      {/* ===================================================================== */}
      {editingPackage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingPackage(null)}
        >
          <form
            onSubmit={handleSavePackage}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                {isNewPackage ? 'Add NPR Top-Up Package' : 'Edit Package'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPackage(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Parent Game / Service</label>
                <select
                  disabled={!isNewPackage}
                  value={editingPackage.productId || ''}
                  onChange={(e) =>
                    setEditingPackage({ ...editingPackage, productId: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50"
                >
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Amount Headline (e.g. 115 Diamonds)
                </label>
                <input
                  type="text"
                  required
                  minLength={1}
                  maxLength={60}
                  value={editingPackage.amountLabel || ''}
                  onChange={(e) =>
                    setEditingPackage({ ...editingPackage, amountLabel: e.target.value })
                  }
                  placeholder="115 Diamonds"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Package Full Name</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={editingPackage.name || ''}
                  onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                  placeholder="Free Fire 115 Diamonds"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Price (NPR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={500000}
                    value={editingPackage.priceNpr ?? 100}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, priceNpr: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm font-bold tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Retail Price (NPR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={500000}
                    value={editingPackage.originalPriceNpr ?? 120}
                    onChange={(e) =>
                      setEditingPackage({
                        ...editingPackage,
                        originalPriceNpr: Number(e.target.value),
                      })
                    }
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Service Type</label>
                  <select
                    value={editingPackage.serviceType || 'topup'}
                    onChange={(e) =>
                      setEditingPackage({
                        ...editingPackage,
                        serviceType: e.target.value as ServiceType,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="topup">Game Top-Up</option>
                    <option value="Followers">SMM Followers</option>
                    <option value="Likes">SMM Likes</option>
                    <option value="Views">SMM Views</option>
                    <option value="Members">SMM Members</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Bonus Note</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={editingPackage.bonusLabel || ''}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, bonusLabel: e.target.value })
                    }
                    placeholder="Instant UID"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingPackage(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
              >
                Save Package
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREDIT / DEBIT USER WALLET */}
      {/* ===================================================================== */}
      {walletModalUser && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setWalletModalUser(null)}
        >
          <form
            onSubmit={handleAdjustUserWallet}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Adjust User Wallet</h3>
              <button
                type="button"
                onClick={() => setWalletModalUser(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">{walletModalUser.fullName}</div>
                <div className="text-xs text-slate-500">{walletModalUser.email}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400">Current</div>
                <div className="text-base font-extrabold text-blue-700 tabular-nums">
                  {formatNpr(walletModalUser.walletBalance)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setWalletAdjustMode('credit')}
                className={`h-9 rounded-lg text-xs font-bold cursor-pointer ${
                  walletAdjustMode === 'credit'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                + Credit Funds
              </button>
              <button
                type="button"
                onClick={() => setWalletAdjustMode('debit')}
                className={`h-9 rounded-lg text-xs font-bold cursor-pointer ${
                  walletAdjustMode === 'debit'
                    ? 'bg-white text-red-700 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                - Debit Funds
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Amount (NPR)</label>
              <input
                type="number"
                required
                min={1}
                max={500000}
                value={walletAdjustAmount}
                onChange={(e) => setWalletAdjustAmount(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-bold tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Audit Note</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={240}
                value={walletAdjustNote}
                onChange={(e) => setWalletAdjustNote(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setWalletModalUser(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`h-10 px-5 rounded-xl text-white text-xs font-semibold cursor-pointer ${
                  walletAdjustMode === 'credit'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {walletAdjustMode === 'credit' ? 'Credit Wallet' : 'Debit Wallet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
