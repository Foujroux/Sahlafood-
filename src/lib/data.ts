"use client";

/**
 * Client-side data access.
 *
 * Replaces supabase.from(...): the browser now talks to our own route handlers
 * instead of a PostgREST endpoint, so no database credentials or keys are ever
 * exposed to the client. Authorisation happens server-side and is enforced by
 * RLS in Postgres.
 */

export type Restaurant = {
  id: string;
  name_fr: string;
  name_ar: string;
  type: string;
  category_fr: string | null;
  category_ar: string | null;
  phone: string | null;
  address: string | null;
  wilaya: string | null;
  commune: string | null;
  lat: number | null;
  lng: number | null;
  rating: number;
  is_open: boolean | null;
  avg_delivery_min: number | null;
  image: string | null;
  owner_id: string | null;
};

export type MenuItem = {
  id: string;
  restaurant_id: string | null;
  name_fr: string;
  name_ar: string;
  price: number;
  category_fr: string | null;
  category_ar: string | null;
  image: string | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  wilaya: string | null;
  commune: string | null;
  address: string | null;
  role: string | null;
  vehicle_type: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  preferred_language: string | null;
};

export type CartLine = MenuItem & {
  shopId: string;
  shopName: string;
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new ApiError(
      (body.message as string) || `Request failed (${res.status})`,
      res.status
    );
  }
  return body as T;
}

export const api = {
  restaurants: (type?: string) =>
    request<{ restaurants: Restaurant[] }>(
      `/api/restaurants${type && type !== "all" ? `?type=${encodeURIComponent(type)}` : ""}`
    ),

  restaurant: (id: string) =>
    request<{ shop: Restaurant; items: MenuItem[] }>(
      `/api/restaurants/${encodeURIComponent(id)}`
    ),

  updateRestaurant: (id: string, patch: { image?: string; phone?: string; address?: string }) =>
    request<{ ok: true }>(`/api/restaurants/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  createRestaurant: (payload: {
    name_fr: string;
    name_ar?: string;
    type?: string;
    category_fr?: string;
    category_ar?: string;
    phone?: string;
    address?: string;
    wilaya?: string;
    commune?: string;
    lat?: number | null;
    lng?: number | null;
  }) =>
    request<{ shop: Restaurant }>("/api/restaurants", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteRestaurant: (id: string) =>
    request<{ ok: true }>(`/api/restaurants/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  createMenuItem: (payload: {
    restaurant_id: string;
    name_fr: string;
    name_ar?: string;
    price: number;
    image?: string | null;
  }) =>
    request<{ item: MenuItem }>("/api/menu-items", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteMenuItem: (id: string) =>
    request<{ ok: true }>(`/api/menu-items/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  createOrder: (payload: {
    restaurant_id: string;
    items: unknown[];
    total: number;
    delivery_fee?: number;
    delivery_vehicle?: string;
    address?: string;
    lat?: number;
    lng?: number;
    payment_method?: string;
  }) =>
    request<{ order: { id: string; total: number; status: string } }>("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  profile: () => request<{ profile: Profile | null }>("/api/profile"),

  updateProfile: (patch: Partial<Profile>) =>
    request<{ profile: Profile }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
};

/** Local cart, unchanged from the previous implementation. */
const CART_KEY = "sahlafood-cart";

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]") as CartLine[];
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    // Private browsing or a full quota: the in-memory cart still works.
  }
}

export function clearCart() {
  try {
    localStorage.removeItem(CART_KEY);
  } catch {
    // Ignore.
  }
}