import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Current session for client components. Returns null user when signed out. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      name: null,
    },
  });
}