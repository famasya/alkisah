import { env } from "cloudflare:workers";
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
	return drizzle(env.DB, { schema });
}

export { and, desc, eq, schema, sql };
