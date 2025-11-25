/**
 * Database Client (Server)
 *
 * IMPORTANT: This now uses RDS PostgreSQL instead of Supabase
 * Migration completed: 2025-10-13
 */

import { createRDSClient } from './rds-adapter'

export function createClient() {
  // Return RDS client with Supabase-compatible API
  // Note: No cookie handling needed for RDS - auth is handled by NextAuth
  return createRDSClient()
}
