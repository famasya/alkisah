import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getAppEnv } from "~/lib/app-env.server";
import * as schema from "./schema";

export function getDb() {
	return drizzle(getAppEnv().DB, { schema });
}

export { and, desc, eq, schema, sql };
