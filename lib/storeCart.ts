"use client";

// Lightweight Qoyl Store cart — persisted in localStorage.
// Keyed by product_id. Each entry carries the CartItem snapshot
// plus a quantity the user can adjust on the checkout page.

import type { CartItem } from "@/lib/styleCart";

export type StoreCartEntry = {
  item: CartItem;
  quantity: number;
};

const KEY = "qoyl_store_cart_v1";

function read(): StoreCartEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoreCartEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: StoreCartEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {}
}

export const storeCart = {
  getAll(): StoreCartEntry[] {
    return read();
  },

  // Add one unit of an item. If already in cart, bumps quantity by 1.
  add(item: CartItem): StoreCartEntry[] {
    const entries = read();
    const id = item.product_id ?? item.product_name;
    const idx = entries.findIndex(
      (e) => (e.item.product_id ?? e.item.product_name) === id
    );
    if (idx >= 0) {
      entries[idx].quantity += 1;
    } else {
      entries.push({ item, quantity: 1 });
    }
    write(entries);
    return entries;
  },

  remove(id: string): StoreCartEntry[] {
    const entries = read().filter(
      (e) => (e.item.product_id ?? e.item.product_name) !== id
    );
    write(entries);
    return entries;
  },

  setQuantity(id: string, quantity: number): StoreCartEntry[] {
    const entries = read().map((e) =>
      (e.item.product_id ?? e.item.product_name) === id
        ? { ...e, quantity: Math.max(1, quantity) }
        : e
    );
    write(entries);
    return entries;
  },

  clear(): void {
    try { localStorage.removeItem(KEY); } catch {}
  },

  count(): number {
    return read().reduce((s, e) => s + e.quantity, 0);
  },
};
