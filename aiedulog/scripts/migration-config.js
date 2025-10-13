/**
 * Migration Configuration
 * Contains all settings for Supabase to RDS migration
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables (should be loaded from .env file)
const MIGRATION_CONFIG = {
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key',
    schema: 'public'
  },
  
  // RDS configuration  
  rds: {
    host: process.env.RDS_HOST || 'aiedulog-production.cluster-xxxxx.ap-northeast-2.rds.amazonaws.com',
    port: process.env.RDS_PORT || 5432,
    database: process.env.RDS_DATABASE || 'aiedulog',
    username: process.env.RDS_USERNAME || 'postgres',
    password: process.env.RDS_PASSWORD || 'SecurePassword123!',
    ssl: process.env.RDS_SSL === 'true'
  },
  
  // Migration settings
  migration: {
    outputDir: './migration-data',
    batchSize: 1000,
    validateData: true,
    dryRun: false,
    skipExistingFiles: false,
    logLevel: 'info' // error, warn, info, debug
  },
  
  // Table extraction priorities and order
  extraction: {
    // Critical tables that must be migrated first
    priority_high: [
      'user_profiles',
      'auth_methods',
      'posts', 
      'comments',
      'post_likes',
      'bookmarks',
      'notifications'
    ],
    
    // Important tables for core functionality
    priority_medium: [
      'chat_rooms',
      'chat_participants', 
      'chat_messages',
      'lectures',
      'lecture_registrations',
      'training_programs',
      'regular_meetings',
      'announcements',
      'news_posts',
      'file_uploads',
      'resources'
    ],
    
    // Nice-to-have tables that can be migrated later
    priority_low: [
      'security_audit_log',
      'user_deletion_audit'
    ],
    
    // Dependency order (foreign key dependencies)
    dependency_order: [
      // Independent base tables
      'user_profiles',
      'chat_rooms', 
      'lectures',
      'training_programs',
      'regular_meetings',
      
      // User-dependent tables
      'auth_methods',
      'posts',
      'announcements', 
      'news_posts',
      'file_uploads',
      
      // Content-dependent tables
      'comments',
      'post_likes',
      'bookmarks',
      'resources',
      'notifications',
      
      // Complex dependent tables
      'chat_participants',
      'chat_messages',
      'lecture_registrations'
    ]
  },
  
  // Data transformation rules
  transformation: {
    // Field mappings for renamed columns
    fieldMappings: {
      'auth.users.id': 'user_profiles.user_id',
      'profiles.id': 'user_profiles.user_id',
    },
    
    // Default values for missing fields
    defaults: {
      'user_profiles.role': 'member',
      'user_profiles.is_active': true,
      'posts.is_published': true,
      'posts.view_count': 0
    },
    
    // Fields to exclude from migration
    excludeFields: [
      'raw_app_meta_data',
      'raw_user_meta_data', 
      'encrypted_password',
      'email_change',
      'phone_change'
    ],
    
    // Custom transformers for specific data types
    typeTransformers: {
      'uuid': (value) => value || null,
      'timestamp': (value) => value ? new Date(value).toISOString() : null,
      'jsonb': (value) => typeof value === 'object' ? value : JSON.parse(value || '{}'),
      'array': (value) => Array.isArray(value) ? value : (value ? [value] : [])
    }
  },
  
  // Validation rules
  validation: {
    // Required fields that cannot be null
    requiredFields: {
      'user_profiles': ['user_id', 'email'],
      'posts': ['id', 'author_id', 'title', 'content'], 
      'comments': ['id', 'post_id', 'author_id', 'content'],
      'lectures': ['id', 'title', 'instructor_name', 'category']
    },
    
    // Data integrity checks
    integrityChecks: {
      'posts.author_id': 'user_profiles.user_id',
      'comments.post_id': 'posts.id',
      'comments.author_id': 'user_profiles.user_id',
      'post_likes.post_id': 'posts.id',
      'post_likes.user_id': 'user_profiles.user_id'
    },
    
    // Data format validations
    formatValidations: {
      'email': /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'uuid': /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'url': /^https?:\/\/.+/
    }
  }
};

/**
 * Initialize Supabase client with service role key
 */
function initializeSupabaseClient() {
  const supabaseClient = createClient(
    MIGRATION_CONFIG.supabase.url,
    MIGRATION_CONFIG.supabase.key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: MIGRATION_CONFIG.supabase.schema
      }
    }
  );
  
  return supabaseClient;
}

/**
 * Get table-specific extraction configuration
 */
function getTableConfig(tableName) {
  const baseConfig = {
    batchSize: MIGRATION_CONFIG.migration.batchSize,
    validateData: MIGRATION_CONFIG.migration.validateData
  };
  
  // Table-specific configurations
  const tableConfigs = {
    'user_profiles': {
      ...baseConfig,
      orderBy: 'created_at',
      selectFields: '*',
      excludeFields: ['raw_user_meta_data', 'encrypted_password']
    },
    
    'posts': {
      ...baseConfig,
      orderBy: 'created_at',
      selectFields: '*',
      filters: { is_deleted: { $ne: true } } // Exclude deleted posts
    },
    
    'comments': {
      ...baseConfig,
      orderBy: 'created_at', 
      selectFields: '*',
      filters: { is_deleted: { $ne: true } }
    },
    
    'notifications': {
      ...baseConfig,
      orderBy: 'created_at',
      selectFields: '*',
      // Only migrate notifications from the last 6 months
      filters: { 
        created_at: { 
          $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    },
    
    'chat_messages': {
      ...baseConfig,
      batchSize: 500, // Smaller batches for large table
      orderBy: 'created_at',
      selectFields: '*'
    }
  };
  
  return tableConfigs[tableName] || baseConfig;
}

/**
 * Get priority level for a table
 */
function getTablePriority(tableName) {
  if (MIGRATION_CONFIG.extraction.priority_high.includes(tableName)) {
    return 'HIGH';
  } else if (MIGRATION_CONFIG.extraction.priority_medium.includes(tableName)) {
    return 'MEDIUM';
  } else if (MIGRATION_CONFIG.extraction.priority_low.includes(tableName)) {
    return 'LOW';
  }
  return 'UNKNOWN';
}

/**
 * Validate migration configuration
 */
function validateConfig() {
  const errors = [];
  
  // Check required environment variables
  if (!process.env.SUPABASE_URL) {
    errors.push('SUPABASE_URL environment variable is required');
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }
  
  // Validate URLs
  try {
    new URL(MIGRATION_CONFIG.supabase.url);
  } catch (e) {
    errors.push('Invalid Supabase URL format');
  }
  
  // Check table dependencies
  const allTables = [
    ...MIGRATION_CONFIG.extraction.priority_high,
    ...MIGRATION_CONFIG.extraction.priority_medium,
    ...MIGRATION_CONFIG.extraction.priority_low
  ];
  
  const orderTables = MIGRATION_CONFIG.extraction.dependency_order;
  const missingTables = allTables.filter(table => !orderTables.includes(table));
  
  if (missingTables.length > 0) {
    errors.push(`Tables missing from dependency order: ${missingTables.join(', ')}`);
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
  
  return true;
}

module.exports = {
  MIGRATION_CONFIG,
  initializeSupabaseClient,
  getTableConfig,
  getTablePriority,
  validateConfig
};