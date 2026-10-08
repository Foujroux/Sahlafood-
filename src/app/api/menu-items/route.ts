import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/db";
import { getUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

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

/** Add a menu item. Ownership is enforced by RLS, not by this route. */
export async function POST(request: NextRequest) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    restaurant_id?: string;
    name_fr?: string;
    name_ar?: string;
    price?: number | string;
    category_fr?: string;
    category_ar?: string;
    image?: string;
  } | null;

  const restaurantId = body?.restaurant_id;
  const nameFr = body?.name_fr?.trim();
  const price = Number(body?.price);

  if (!restaurantId || !nameFr || !Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { message: "restaurant_id, name_fr and a valid price are required" },
      { status: 400 }
    );
  }

  try {
    const inserted = await withUser(userId, async (client) => {
      const res = await client.query(
        `insert into public.menu_items
           (restaurant_id, name_fr, name_ar, price, category_fr, category_ar, image)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id, restaurant_id, name_fr, name_ar, price, category_fr, category_ar, image`,
        [
          restaurantId,
          nameFr,
          body?.name_ar?.trim() || nameFr,
          price,
          body?.category_fr ?? null,
          body?.category_ar ?? null,
          body?.image ?? null,
        ]
      );
      return res.rows;
    });

    if (!inserted.length) {
      return NextResponse.json({ message: "Not allowed" }, { status: 403 });
    }

    return NextResponse.json({
      item: { ...inserted[0], price: Number(inserted[0].price) },
    });
  } catch (err) {
    console.error("[api/menu-items]", err);
    return NextResponse.json({ message: "Could not add item" }, { status: 500 });
  }
}