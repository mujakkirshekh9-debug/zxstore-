import React, { useMemo, useState } from 'react';
import { Check, CheckCircle2, Clock, Copy, ReceiptText, XCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ActiveTab, formatNpr, formatTimestamp, OrderStatus } from '../types';
import { GameArtwork } from './GameArtwork';

interface OrdersViewProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onNavigate }) => {
  const { firebaseUser, userOrders } = useStore();
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'All') return userOrders;
    return userOrders.filter((o) => o.status === statusFilter);
  }, [userOrders, statusFilter]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedId(code);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  if (!firebaseUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
          <ReceiptText className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Track Your Game Top-Ups</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Log in to view your real-time order statuses, Player ID receipts, and SMM delivery progress.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('auth')}
          className="h-11 px-6 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          Log in to View Orders
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My orders
        </h1>

        {/* Interactive Status Filter Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          {(['All', 'Pending', 'Successful', 'Cancelled'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <ReceiptText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">
              {statusFilter === 'All' ? 'No orders placed yet' : `No ${statusFilter.toLowerCase()} orders`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Your game diamond top-ups and SMM orders will appear here immediately after checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="h-10 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            Browse Games Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((order) => {
            return (
              <article
                key={order.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                  <GameArtwork artworkKey={order.artworkKey} />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-bold text-slate-900 truncate">
                      {order.productName}
                    </h2>

                    {/* Clean accessible status text + icon (Zero-Pill compliant) */}
                    {order.status === 'Successful' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Successful</span>
                      </span>
                    )}
                    {order.status === 'Pending' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </span>
                    )}
                    {order.status === 'Cancelled' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 shrink-0">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancelled</span>
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-700 font-medium">
                    {order.packageName}
                    {order.quantity > 1 ? ` × ${order.quantity}` : ''}
                  </p>

                  <p className="text-xs text-slate-500 break-all">
                    Target / Player ID:{' '}
                    <span className="font-mono-num font-medium text-slate-700">
                      {order.targetAccount}
                    </span>
                  </p>

                  {order.adminNote && (
                    <p className="text-xs text-blue-700">Note: {order.adminNote}</p>
                  )}

                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(order.orderCode)}
                        className="inline-flex items-center gap-1 font-mono-num text-slate-500 hover:text-slate-900 cursor-pointer"
                        title="Copy order code"
                      >
                        <span>#{order.orderCode}</span>
                        {copiedId === order.orderCode ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <span aria-hidden="true">&middot;</span>
                      <span className="tabular-nums">{formatTimestamp(order.createdAt)}</span>
                    </div>

                    <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                      {formatNpr(order.priceNpr)}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
