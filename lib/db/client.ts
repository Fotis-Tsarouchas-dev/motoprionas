import 'server-only';
import { getConnectionString } from '@netlify/database';
import postgres from 'postgres';
let sqlClient: ReturnType<typeof postgres> | undefined;
export function db() {
  if (!sqlClient) sqlClient = postgres(getConnectionString(), { prepare: true });
  return sqlClient;
}
