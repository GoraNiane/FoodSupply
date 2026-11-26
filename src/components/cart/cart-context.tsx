"use client";

import * as React from "react";
import type { StorageType } from "@prisma/client";
import {
  resolveVolumeTierUnitPrice,
  type VolumePriceTier,
} from "@/modules/catalog/pricing";

export interface CartItemEntry {
  offerId: string;
  slug: string;
  name: string;
  unitLabel: string;
  categoryName: string;
  clientUnitPriceXof: number;
  minOrderQty: number;
  quantity: number;
  storageType: StorageType;
  isFragile: boolean;
  imageUrl?: string | null;
  volumeTiers?: VolumePriceTier[];
}

export interface RecentGuestOrderRef {
  orderNumber: string;
  trackingUrl: string;
  totalClientXof: number;
  createdAt: string;
  restaurantName?: string;
}

interface CartContextValue {
  items: CartItemEntry[];
  isHydrated: boolean;
  totalUnits: number;
  lineCount: number;
  subtotalClientXof: number;
  totalVolumeSavingsXof: number;
  requiresColdChain: boolean;
  hasFragileItems: boolean;
  recentGuestOrders: RecentGuestOrderRef[];
  addItem: (item: Omit<CartItemEntry, "quantity">, quantity?: number) => void;
  addManyItems: (entries: CartItemEntry[]) => void;
  updateQuantity: (offerId: string, quantity: number) => void;
  removeItem: (offerId: string) => void;
  clearCart: () => void;
  rememberGuestOrder: (ref: RecentGuestOrderRef) => void;
}

const CART_STORAGE_KEY = "foodsupply_cart_v1";
const RECENT_ORDERS_KEY = "foodsupply_recent_orders_v1";

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItemEntry[]>([]);
  const [recentGuestOrders, setRecentGuestOrders] = React.useState<RecentGuestOrderRef[]>([]);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        if (Array.isArray(parsed)) setItems(parsed);
      }
      const rawRecent = window.localStorage.getItem(RECENT_ORDERS_KEY);
      if (rawRecent) {
        const parsedRecent = JSON.parse(rawRecent);
        if (Array.isArray(parsedRecent)) setRecentGuestOrders(parsedRecent);
      }
    } catch {
      // Ignore corrupt storage
    } finally {
      setIsHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore quota errors
    }
  }, [items, isHydrated]);

  const addItem = React.useCallback(
    (entry: Omit<CartItemEntry, "quantity">, quantity?: number) => {
      const qtyToAdd = Math.max(entry.minOrderQty, Math.round(quantity ?? entry.minOrderQty));
      setItems((prev) => {
        const existing = prev.find((i) => i.offerId === entry.offerId);
        if (existing) {
          return prev.map((i) =>
            i.offerId === entry.offerId
              ? { ...i, ...entry, quantity: i.quantity + (quantity ?? 1) }
              : i
          );
        }
        return [...prev, { ...entry, quantity: qtyToAdd }];
      });
    },
    []
  );

  const addManyItems = React.useCallback((entries: CartItemEntry[]) => {
    if (entries.length === 0) return;
    setItems((prev) => {
      const map = new Map(prev.map((i) => [i.offerId, i]));
      for (const entry of entries) {
        const existing = map.get(entry.offerId);
        if (existing) {
          map.set(entry.offerId, {
            ...entry,
            quantity: existing.quantity + Math.max(entry.minOrderQty, entry.quantity),
          });
        } else {
          map.set(entry.offerId, {
            ...entry,
            quantity: Math.max(entry.minOrderQty, entry.quantity),
          });
        }
      }
      return Array.from(map.values());
    });
  }, []);

  const updateQuantity = React.useCallback((offerId: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.offerId === offerId
            ? { ...i, quantity: Math.max(i.minOrderQty, Math.round(quantity)) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeItem = React.useCallback((offerId: string) => {
    setItems((prev) => prev.filter((i) => i.offerId !== offerId));
  }, []);

  const clearCart = React.useCallback(() => {
    setItems([]);
  }, []);

  const rememberGuestOrder = React.useCallback((ref: RecentGuestOrderRef) => {
    setRecentGuestOrders((prev) => {
      const next = [ref, ...prev.filter((r) => r.orderNumber !== ref.orderNumber)].slice(0, 15);
      try {
        window.localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const totalUnits = items.reduce((acc, item) => acc + item.quantity, 0);
  const lineCount = items.length;
  let subtotalClientXof = 0;
  let totalVolumeSavingsXof = 0;
  for (const item of items) {
    const { effectiveUnitPriceXof } = resolveVolumeTierUnitPrice(
      item.clientUnitPriceXof,
      item.quantity,
      item.volumeTiers
    );
    subtotalClientXof += effectiveUnitPriceXof * item.quantity;
    totalVolumeSavingsXof += Math.max(0, item.clientUnitPriceXof - effectiveUnitPriceXof) * item.quantity;
  }

  const requiresColdChain = items.some((i) => i.storageType !== "AMBIENT");
  const hasFragileItems = items.some((i) => i.isFragile);

  return (
    <CartContext.Provider
      value={{
        items,
        isHydrated,
        totalUnits,
        lineCount,
        subtotalClientXof,
        totalVolumeSavingsXof,
        requiresColdChain,
        hasFragileItems,
        recentGuestOrders,
        addItem,
        addManyItems,
        updateQuantity,
        removeItem,
        clearCart,
        rememberGuestOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart doit être utilisé dans CartProvider");
  }
  return ctx;
}
