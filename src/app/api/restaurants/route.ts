import { NextResponse, type NextRequest } from "next/server";
import { query, withUser } from "@/lib/db";
import { getUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

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
  rating: string | null;
  is_open: boolean | null;
  avg_delivery_min: number | null;
  image: string | null;
  owner_id: string | null;
};

const SELECT = `id, name_fr, name_ar, type, category_fr, category_ar, phone,
  address, wilaya, commune, lat, lng, rating, is_open, avg_delivery_min, image, owner_id`;

/** Public catalogue. Readable by anyone; RLS allows SELECT using (true). */
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");

  try {
    const rows =
      type && type !== "all"
        ? await query<Restaurant>(
            `select ${SELECT} from public.restaurants where type = $1 order by rating desc`,
            [type]
          )
        : await query<Restaurant>(
            `select ${SELECT} from public.restaurants order by rating desc`
          );

    // numeric arrives as a string from pg; hand the client a number.
    return NextResponse.json({
      restaurants: rows.map((r) => ({ ...r, rating: Number(r.rating) })),
    });
  } catch (err) {
    console.error("[api/restaurants]", err);
    return NextResponse.json(
      { message: "Could not load restaurants" },
      { status: 500 }
    );
  }
}

/**
 * Claim a shop. owner_id is taken from the verified session, never the body, so
 * a client cannot create a shop owned by someone else.
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  const nameFr = typeof body?.name_fr === "string" ? body.name_fr.trim() : "";
  const nameAr =
    typeof body?.name_ar === "string" && body.name_ar.trim()
      ? body.name_ar.trim()
      : nameFr;
  const type = body?.type === "grocery" ? "grocery" : "restaurant";

  if (!nameFr) {
    return NextResponse.json({ message: "name_fr is required" }, { status: 400 });
  }

  const num = (v: unknown) =>
    v === undefined || v === null || v === "" || !Number.isFinite(Number(v))
      ? null
      : Number(v);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  try {
    const rows = await withUser(userId, async (client) => {
      const res = await client.query(
        `insert into public.restaurants
           (owner_id, name_fr, name_ar, type, category_fr, category_ar, phone,
            address, wilaya, commune, lat, lng)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         returning ${SELECT}`,
        [
          userId, nameFr, nameAr, type,
          str(body?.category_fr), str(body?.category_ar), str(body?.phone),
          str(body?.address), str(body?.wilaya), str(body?.commune),
          num(body?.lat), num(body?.lng),
        ]
      );
      return res.rows;
    });

    if (!rows.length) {
      return NextResponse.json({ message: "Not allowed" }, { status: 403 });
    }
    return NextResponse.json({
      shop: { ...rows[0], rating: Number(rows[0].rating) },
    });
  } catch (err) {
    console.error("[api/restaurants POST]", err);
    return NextResponse.json({ message: "Could not create shop" }, { status: 500 });
  }
}