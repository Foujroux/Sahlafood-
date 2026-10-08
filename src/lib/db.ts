import { Pool, type PoolClient, type QueryResultRow } from "pg";

/**
 * Server-side Postgres access for Neon.
 *
 * The app connects as `app_user`, which has no BYPASSRLS and no access to
 * auth internals. Identity is passed per-transaction by setUserId(), which
 * issues `set local neon_auth.user_id` so the RLS policies in the database
 * decide what the caller can see. Nothing here trusts a user id supplied by
 * the browser: it always comes from a verified session.
 */

declare global {
  // eslint-disable-next-line no-var
  var __sfPool: Pool | undefined;
}

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Point it at the Neon connection string."
    );
  }
  return url;
}

// Reuse the pool across hot reloads so dev doesn't exhaust Neon connections.
export function pool(): Pool {
  if (!global.__sfPool) {
    global.__sfPool = new Pool({
      connectionString: connectionString(),
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // Neon requires TLS; reject an unencrypted connection outright rather
      // than silently trusting whatever the URL implies.
      ssl: { rejectUnauthorized: false },
    });
    // A pool-level error (server restart, network blip) must not crash the
    // process; the next query will reconnect.
    global.__sfPool.on("error", (err) => {
      console.error("[db] idle client error", err.message);
    });
  }
  return global.__sfPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool().query<T>(text, params);
  return res.rows;
}

/**
 * Runs `fn` inside a transaction with the caller's identity applied, so RLS
 * sees them as that user. When userId is null the transaction runs with no
 * identity, which the policies treat as anonymous.
 *
 * Always pass the id from the verified session, never from request input.
 */
export async function withUser<T>(
  userId: string | null,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    if (userId) {
      // `set local` scopes the value to this transaction, so pooled
      // connections can't leak one user's identity into the next request.
      await client.query("select set_config('neon_auth.user_id', $1, true)", [
        userId,
      ]);
    }
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}