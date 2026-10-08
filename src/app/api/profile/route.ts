import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/db";
import { getUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

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

const SELECT = `id, full_name, phone, wilaya, commune, address, role,
  vehicle_type, vehicle_brand, vehicle_model, vehicle_plate, vehicle_year,
  vehicle_color, preferred_language`;

/** The caller's own profile. RLS makes this the only row they can read. */
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  }

  try {
    const rows = await withUser(userId, async (client) => {
      const res = await client.query(
        `select ${SELECT} from public.profiles where id = $1`,
        [userId]
      );
      return res.rows;
    });

    if (!rows.length) {
      return NextResponse.json({ profile: null });
    }
    return NextResponse.json({ profile: rows[0] as Profile });
  } catch (err) {
    console.error("[api/profile GET]", err);
    return NextResponse.json({ message: "Could not load profile" }, { status: 500 });
  }
}

/**
 * Update the caller's profile. The id always comes from the verified session,
 * never the request body, so a client cannot edit someone else's row.
 */
export async function PATCH(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const TEXT_FIELDS = [
    "full_name", "phone", "wilaya", "commune", "address", "role",
    "vehicle_type", "vehicle_brand", "vehicle_model", "vehicle_plate",
    "vehicle_color", "preferred_language",
  ] as const;

  const allowed: Record<string, unknown> = {};
  for (const f of TEXT_FIELDS) {
    if (typeof body[f] === "string") allowed[f] = body[f];
  }
  if (body.vehicle_year === null || body.vehicle_year === undefined) {
    if ("vehicle_year" in body) allowed.vehicle_year = null;
  } else if (Number.isFinite(Number(body.vehicle_year))) {
    allowed.vehicle_year = Number(body.vehicle_year);
  }

  if (!Object.keys(allowed).length) {
    return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
  }

  try {
    const rows = await withUser(userId, async (client) => {
      const sets = Object.keys(allowed)
        .map((k, i) => `${k} = $${i + 2}`)
        .join(", ");
      const res = await client.query(
        `update public.profiles set ${sets} where id = $1 returning ${SELECT}`,
        [userId, ...Object.values(allowed)]
      );
      return res.rows;
    });

    if (!rows.length) {
      return NextResponse.json({ message: "Not allowed" }, { status: 403 });
    }
    return NextResponse.json({ profile: rows[0] as Profile });
  } catch (err) {
    console.error("[api/profile PATCH]", err);
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
}