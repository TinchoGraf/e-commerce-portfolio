import { create } from 'zustand';
import * as cartApi from '../api/cart';
import { useAuthStore } from './authStore';

const LOCAL_STORAGE_KEY = 'techstore_cart';

function readLocalRawItems() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalRawItems(rawItems) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rawItems));
}

function makeLocalItemId(productId, variantId) {
  return `local-${productId}-${variantId || 'default'}`;
}

function rawItemToDisplayItem(rawItem) {
  return {
    id: makeLocalItemId(rawItem.productId, rawItem.variantId),
    productId: rawItem.productId,
    variantId: rawItem.variantId || null,
    quantity: rawItem.quantity,
    productName: rawItem.productName,
    productSlug: rawItem.productSlug,
    productImage: rawItem.productImage,
    variantName: rawItem.variantName || null,
    unitPrice: rawItem.unitPrice,
    lineTotal: rawItem.unitPrice * rawItem.quantity,
  };
}

function backendItemToDisplayItem(item) {
  return {
    id: item.id,
    productId: item.product_id,
    variantId: item.variant_id || null,
    quantity: item.quantity,
    productName: item.product_name,
    productSlug: item.product_slug,
    productImage: item.product_image_url || null,
    variantName: item.variant_name || null,
    unitPrice: Number(item.unit_price),
    lineTotal: Number(item.line_total),
  };
}

function computeTotals(items) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { itemCount, subtotal };
}

export const useCartStore = create((set, get) => ({
  items: [],
  itemCount: 0,
  subtotal: 0,
  isLoading: false,

  addItem: async (product, variant, quantity = 1) => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (isAuthenticated) {
      set({ isLoading: true });
      try {
        await cartApi.addToCart({
          product_id: product.id,
          variant_id: variant ? variant.id : null,
          quantity,
        });
        await get().syncWithBackend();
      } finally {
        set({ isLoading: false });
      }
      return;
    }

    const rawItems = readLocalRawItems();
    const variantId = variant ? variant.id : null;
    const existingIndex = rawItems.findIndex(
      (item) => item.productId === product.id && item.variantId === variantId,
    );
    const unitPrice = variant?.price ?? product.price;

    if (existingIndex >= 0) {
      rawItems[existingIndex].quantity += quantity;
    } else {
      rawItems.push({
        productId: product.id,
        variantId,
        quantity,
        productName: product.name,
        productSlug: product.slug,
        productImage: product.image || null,
        variantName: variant ? variant.name : null,
        unitPrice,
      });
    }

    writeLocalRawItems(rawItems);
    const displayItems = rawItems.map(rawItemToDisplayItem);
    set({ items: displayItems, ...computeTotals(displayItems) });
  },

  updateItemQuantity: async (itemId, quantity) => {
    if (quantity <= 0) {
      await get().removeItem(itemId);
      return;
    }

    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (isAuthenticated) {
      set({ isLoading: true });
      try {
        await cartApi.updateCartItem(itemId, { quantity });
        await get().syncWithBackend();
      } finally {
        set({ isLoading: false });
      }
      return;
    }

    const rawItems = readLocalRawItems();
    const index = rawItems.findIndex(
      (item) => makeLocalItemId(item.productId, item.variantId) === itemId,
    );
    if (index >= 0) {
      rawItems[index].quantity = quantity;
      writeLocalRawItems(rawItems);
      const displayItems = rawItems.map(rawItemToDisplayItem);
      set({ items: displayItems, ...computeTotals(displayItems) });
    }
  },

  removeItem: async (itemId) => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (isAuthenticated) {
      set({ isLoading: true });
      try {
        await cartApi.removeCartItem(itemId);
        await get().syncWithBackend();
      } finally {
        set({ isLoading: false });
      }
      return;
    }

    const rawItems = readLocalRawItems().filter(
      (item) => makeLocalItemId(item.productId, item.variantId) !== itemId,
    );
    writeLocalRawItems(rawItems);
    const displayItems = rawItems.map(rawItemToDisplayItem);
    set({ items: displayItems, ...computeTotals(displayItems) });
  },

  clearCart: async () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (isAuthenticated) {
      set({ isLoading: true });
      try {
        await cartApi.clearCart();
        set({ items: [], itemCount: 0, subtotal: 0 });
      } finally {
        set({ isLoading: false });
      }
      return;
    }

    writeLocalRawItems([]);
    set({ items: [], itemCount: 0, subtotal: 0 });
  },

  syncWithBackend: async () => {
    set({ isLoading: true });
    try {
      const response = await cartApi.getCart();
      const displayItems = response.data.items.map(backendItemToDisplayItem);
      set({
        items: displayItems,
        itemCount: response.data.item_count,
        subtotal: Number(response.data.subtotal),
      });
    } catch {
      set({ items: [], itemCount: 0, subtotal: 0 });
    } finally {
      set({ isLoading: false });
    }
  },

  mergeLocalCartToBackend: async () => {
    const rawItems = readLocalRawItems();
    if (rawItems.length === 0) {
      await get().syncWithBackend();
      return;
    }

    set({ isLoading: true });
    try {
      for (const rawItem of rawItems) {
        try {
          await cartApi.addToCart({
            product_id: rawItem.productId,
            variant_id: rawItem.variantId || null,
            quantity: rawItem.quantity,
          });
        } catch {
          // Si un ítem individual falla (ej. producto sin stock), se ignora
          // y se continúa con el resto para no bloquear el merge completo.
        }
      }
      writeLocalRawItems([]);
      await get().syncWithBackend();
    } finally {
      set({ isLoading: false });
    }
  },

  resetMemory: () => {
    set({ items: [], itemCount: 0, subtotal: 0 });
  },
}));
