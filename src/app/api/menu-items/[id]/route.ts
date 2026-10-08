import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/db";
import { getUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Delete a menu item. Only the shop owner can, via the RLS policy. */
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
        "delete from public.menu_items where id = $1 returning id",
        [id]
      );
      return res.rows;
    });

    if (!deleted.length) {
      return NextResponse.json({ message: "Not allowed" }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/menu-items/:id]", err);
    return NextResponse.json({ message: "Delete failed" }, { status: 500 });
  }
}