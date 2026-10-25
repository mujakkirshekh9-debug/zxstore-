/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthView } from './components/AuthView';
import { BottomNav } from './components/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { LoadWalletModal } from './components/LoadWalletModal';
import { OrdersView } from './components/OrdersView';
import { ProductPurchaseModal } from './components/ProductPurchaseModal';
import { ProfileView } from './components/ProfileView';
import { SmmView } from './components/SmmView';
import { StoreProvider, useStore } from './context/StoreContext';
import { SUPER_ADMIN_EMAIL } from './firebase';
import { ActiveTab, Product } from './types';

function hashToTab(hash: string): ActiveTab {
  const cleaned = hash.replace(/^#\/?/, '').toLowerCase();
  if (cleaned === 'orders') return 'orders';
  if (cleaned === 'smm') return 'smm';
  if (cleaned === 'profile') return 'profile';
  if (cleaned === 'auth' || cleaned === 'login') return 'auth';
  if (cleaned === 'admin') return 'admin';
  return 'home';
}

function StoreShell() {
  const { authReady, firebaseUser, isAdmin } = useStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => hashToTab(window.location.hash));
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);

  const autoRoutedAdminUid = useRef<string | null>(null);

  const navigateTo = (tab: ActiveTab) => {
    setActiveTab(tab);
    const nextHash = tab === 'home' ? '' : `#${tab}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash || window.location.pathname);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onHashChange = () => {
      setActiveTab(hashToTab(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Automatically open Admin Portal when paknep1414k@gmail.com logs in or restores session
  useEffect(() => {
    if (!authReady) return;
    if (firebaseUser && isAdmin) {
      if (autoRoutedAdminUid.current !== firebaseUser.uid) {
        autoRoutedAdminUid.current = firebaseUser.uid;
        navigateTo('admin');
      }
    } else if (!firebaseUser) {
      autoRoutedAdminUid.current = null;
      if (activeTab === 'admin') {
        navigateTo('home');
      }
    } else if (firebaseUser && !isAdmin && activeTab === 'admin') {
      // Ensure standard users stay on the user storefront
      navigateTo('home');
    }
  }, [authReady, firebaseUser, isAdmin, activeTab]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-900">
      <Header
        activeTab={activeTab}
        onNavigate={navigateTo}
        onOpenWallet={() => setWalletOpen(true)}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-24 md:pb-12">
        {activeTab === 'home' && (
          <HomeView
            onSelectProduct={(prod) => setSelectedProduct(prod)}
            onNavigate={navigateTo}
            onOpenWallet={() => setWalletOpen(true)}
          />
        )}

        {activeTab === 'orders' && <OrdersView onNavigate={navigateTo} />}

        {activeTab === 'smm' && (
          <SmmView
            onNavigate={navigateTo}
            onSelectSmmProduct={(prod) => setSelectedProduct(prod)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            onNavigate={navigateTo}
            onOpenWallet={() => setWalletOpen(true)}
          />
        )}

        {activeTab === 'auth' && (
          <AuthView
            onNavigate={navigateTo}
            onSuccess={(user) => {
              const isOwnerAdmin =
                Boolean(user.emailVerified) &&
                user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
              if (isOwnerAdmin) {
                autoRoutedAdminUid.current = user.uid;
                navigateTo('admin');
              } else {
                navigateTo('home');
              }
            }}
          />
        )}

        {activeTab === 'admin' && <AdminDashboard onNavigate={navigateTo} />}
      </main>

      <BottomNav activeTab={activeTab} onNavigate={navigateTo} />

      <ProductPurchaseModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onRequireAuth={() => navigateTo('auth')}
        onOpenWallet={() => setWalletOpen(true)}
        onGoToOrders={() => navigateTo('orders')}
      />

      <LoadWalletModal
        isOpen={walletOpen}
        onClose={() => setWalletOpen(false)}
        onRequireAuth={() => navigateTo('auth')}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <StoreShell />
      </StoreProvider>
    </ErrorBoundary>
  );
}
