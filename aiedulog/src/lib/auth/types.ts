/**
 * Shared application-level auth user shape.
 * Provides the minimal fields required across RDS/Cognito integrations.
 */
export type AppUser = {
  id: string;
  email?: string | null;
  [key: string]: any;
};
