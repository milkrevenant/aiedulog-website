/**
 * Supabase compatibility adapter that forwards to the RDS client.
 * Existing imports from '@/lib/supabase/server' continue to work after migration.
 */

import { createRDSClient } from '@/lib/db/rds-client';

export { createRDSClient };
export { createRDSClient as createClient };
export { createRDSClient as createServerClient };
