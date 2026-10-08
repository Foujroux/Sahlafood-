import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/db";
import { getUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Place an order. Requires a session; RLS pins user_id to the caller. */
export async function POST(request: NextRequest) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    restaurant_id?: string;
    items?: unknown;
    total?: number | string;
    delivery_fee?: number | string;
    delivery_vehicle?: string;
    address?: string;
    lat?: number;
    lng?: number;
    payment_method?: string;
  } | null;

  const total = Number(body?.total);

  if (
    !body?.restaurant_id ||
    !Array.isArray(body.items) ||
    !Number.isFinite(total) ||
    total < 0
  ) {
    return NextResponse.json(
      { message: "restaurant_id, items and a valid total are required" },
      { status: 400 }
    );
  }

  try {
    const rows = await withUser(userId, async (client) => {
      const res = await client.query(
        `insert into public.orders
           (user_id, restaurant_id, items, delivery_vehicle, delivery_fee,
            total, address, lat, lng, payment_method)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         returning id, total, status, created_at`,
        [
          userId,
          body?.restaurant_id,
          JSON.stringify(body.items),
          body?.delivery_vehicle ?? null,
          Number(body?.delivery_fee ?? 0),
          total,
          body?.address ?? null,
          Number.isFinite(Number(body?.lat)) ? Number(body?.lat) : null,
          Number.isFinite(Number(body?.lng)) ? Number(body?.lng) : null,
          body?.payment_method ?? "cash_on_delivery",
        ]
      );
      return res.rows;
    });

    if (!rows.length) {
      return NextResponse.json({ message: "Could not place order" }, { status: 403 });
    }
    return NextResponse.json({ order: rows[0] });
  } catch (err) {
    console.error("[api/orders]", err);
    return NextResponse.json({ message: "Order failed" }, { status: 500 });
  }
}

/** The caller's own orders. RLS hides everyone else's. */
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  }

  try {
    const rows = await withUser(userId, async (client) => {
      const res = await client.query(
        `select id, restaurant_id, items, total, status, created_at
         from public.orders order by created_at desc`
      );
      return res.rows;
    });
    return NextResponse.json({ orders: rows });
  } catch (err) {
    console.error("[api/orders GET]", err);
    return NextResponse.json({ message: "Could not load orders" }, { status: 500 });
  }
}