import { NextResponse, type NextRequest } from "next/server";
import { query, withUser } from "@/lib/db";
import { getUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export type MenuItem = {
  id: string;
  restaurant_id: string | null;
  name_fr: string;
  name_ar: string;
  price: string;
  category_fr: string | null;
  category_ar: string | null;
  image: string | null;
};

type Params = { params: Promise<{ id: string }> };

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** One shop plus its menu. */
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  if (!isUuid(id)) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  try {
    const [shop, items] = await Promise.all([
      query(
        `select id, name_fr, name_ar, type, category_fr, category_ar, phone,
                address, wilaya, commune, lat, lng, rating, is_open,
                avg_delivery_min, image, owner_id
         from public.restaurants where id = $1`,
        [id]
      ),
      query<MenuItem>(
        `select id, restaurant_id, name_fr, name_ar, price, category_fr, category_ar, image
         from public.menu_items where restaurant_id = $1 order by name_fr`,
        [id]
      ),
    ]);

    if (!shop.length) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      shop: { ...shop[0], rating: Number(shop[0].rating) },
      items: items.map((i) => ({ ...i, price: Number(i.price) })),
    });
  } catch (err) {
    console.error("[api/restaurants/:id]", err);
    return NextResponse.json({ message: "Could not load shop" }, { status: 500 });
  }
}

/**
 * Update shop fields. Authorisation is not decided here: the UPDATE runs inside
 * withUser(), and the RLS policy rejects it unless the caller owns the row.
 * A denied update surfaces as zero affected rows.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  // Whitelist: never pass the body straight to SQL, and owner_id must not be
  // reassignable from the client.
  const allowed: Record<string, unknown> = {};
  if (typeof body.image === "string") allowed.image = body.image;
  if (typeof body.phone === "string") allowed.phone = body.phone;
  if (typeof body.address === "string") allowed.address = body.address;

  if (!Object.keys(allowed).length) {
    return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
  }

  try {
    const updated = await withUser(userId, async (client) => {
      const sets = Object.keys(allowed)
        .map((k, i) => `${k} = $${i + 2}`)
        .join(", ");
      const res = await client.query(
        `update public.restaurants set ${sets} where id = $1 returning id`,
        [id, ...Object.values(allowed)]
      );
      return res.rows;
    });

    if (!updated.length) {
      return NextResponse.json(
        { message: "Not allowed" },
        { status: 403 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/restaurants/:id PATCH]", err);
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
}

/** Delete a shop. Only the owner can, enforced by RLS. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  }
  if (!isUuid(id)) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  try {
    const deleted = await withUser(userId, async (client) => {
      const res = await client.query(
        "delete from public.restaurants where id = $1 returning id",
        [id]
      );
      return res.rows;
    });

    if (!deleted.length) {
      return NextResponse.json({ message: "Not allowed" }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/restaurants/:id DELETE]", err);
    return NextResponse.json({ message: "Delete failed" }, { status: 500 });
  }
}