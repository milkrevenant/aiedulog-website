#!/usr/bin/env node

/**
 * Supabase Data Extraction Script for RDS Migration
 * Extracts data from 26 essential tables in priority order
 * Handles dependencies and data integrity
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  outputDir: './migration-data',
  batchSize: 1000,
  priorities: {
    HIGH: ['user_profiles', 'auth_methods', 'posts', 'comments', 'post_likes', 'bookmarks', 'notifications'],
    MEDIUM: ['chat_rooms', 'chat_participants', 'chat_messages', 'lectures', 'lecture_registrations', 
             'training_programs', 'regular_meetings', 'announcements', 'news_posts', 'file_uploads', 'resources'],
    LOW: ['footer_categories', 'footer_links', 'footer_social_links', 'footer_settings', 
          'security_audit_log', 'user_deletion_audit', 'notification_analytics', 'notification_deliveries']
  },
  // Table extraction order (respecting foreign key dependencies)
  extractionOrder: [
    // Step 1: Independent tables
    'user_profiles',
    'chat_rooms',
    'lectures',
    'training_programs',
    'regular_meetings',
    
    // Step 2: User-dependent tables
    'auth_methods',
    'posts',
    'announcements',
    'news_posts',
    'file_uploads',
    
    // Step 3: Content-dependent tables
    'comments',
    'post_likes',
    'bookmarks',
    'resources',
    'notifications',
    
    // Step 4: Chat system
    'chat_participants',
    'chat_messages',
    'lecture_registrations'
  ]
};

// Mock Supabase client (replace with actual implementation)
class SupabaseExtractor {
  constructor() {
    // Initialize Supabase client here
    console.log('🔌 Initializing Supabase connection...');
  }

  /**
   * Extract data from a specific table with pagination
   */
  async extractTable(tableName, options = {}) {
    const { 
      batchSize = CONFIG.batchSize, 
      filters = {}, 
      orderBy = 'created_at',
      transform = null 
    } = options;
    
    console.log(`📥 Extracting ${tableName}...`);
    
    try {
      let allData = [];
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        console.log(`   Batch ${Math.floor(offset / batchSize) + 1} (${offset}-${offset + batchSize})`);
        
        // Mock query - replace with actual Supabase query
        const mockData = this.generateMockData(tableName, batchSize, offset);
        
        if (mockData.length === 0) {
          hasMore = false;
          break;
        }
        
        // Apply transformation if provided
        const processedData = transform ? mockData.map(transform) : mockData;
        allData = allData.concat(processedData);
        
        offset += batchSize;
        hasMore = mockData.length === batchSize;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ ${tableName}: ${allData.length} records extracted`);
      return allData;
      
    } catch (error) {
      console.error(`❌ Error extracting ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate mock data for testing (remove in production)
   */
  generateMockData(tableName, batchSize, offset) {
    // This is just for testing - replace with actual Supabase queries
    const mockCounts = {
      user_profiles: 1500,
      posts: 5000,
      comments: 12000,
      chat_messages: 8000,
      lectures: 200,
      notifications: 10000
    };
    
    const totalCount = mockCounts[tableName] || 1000;
    if (offset >= totalCount) return [];
    
    const remainingCount = Math.min(batchSize, totalCount - offset);
    return Array.from({ length: remainingCount }, (_, i) => ({
      id: `mock-${tableName}-${offset + i + 1}`,
      created_at: new Date().toISOString(),
      // Add table-specific mock fields here
      ...(tableName === 'user_profiles' && {
        email: `user${offset + i + 1}@example.com`,
        full_name: `User ${offset + i + 1}`,
        role: 'member'
      }),
      ...(tableName === 'posts' && {
        title: `Sample Post ${offset + i + 1}`,
        content: 'Sample content',
        author_id: `user-${(offset + i) % 100 + 1}`
      })
    }));
  }

  /**
   * Get actual Supabase data (implement this with real queries)
   */
  async getRealData(tableName, options = {}) {
    // Replace this with actual Supabase client queries
    /*
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 1000) - 1)
      .order(options.orderBy || 'created_at', { ascending: true });
    
    if (error) throw error;
    return data;
    */
    
    // Placeholder - remove this and implement real queries
    return this.generateMockData(tableName, options.limit || 1000, options.offset || 0);
  }
}

/**
 * Data transformer for cleaning and preparing data for RDS
 */
class DataTransformer {
  /**
   * Transform user profiles data
   */
  static transformUserProfiles(record) {
    return {
      user_id: record.id || record.user_id,
      email: record.email,
      username: record.username,
      full_name: record.full_name,
      avatar_url: record.avatar_url,
      bio: record.bio,
      nickname: record.nickname,
      school: record.school,
      subject: record.subject,
      interests: record.interests || [],
      role: record.role || 'member',
      is_lecturer: record.is_lecturer || false,
      lecturer_info: record.lecturer_info || {},
      is_active: record.is_active !== false,
      last_sign_in_at: record.last_sign_in_at,
      last_active_at: record.last_active_at,
      created_at: record.created_at,
      updated_at: record.updated_at || record.created_at
    };
  }

  /**
   * Transform posts data
   */
  static transformPosts(record) {
    return {
      id: record.id,
      author_id: record.author_id,
      title: record.title,
      content: record.content,
      category: record.category || 'general',
      tags: record.tags || [],
      images: record.images || [],
      image_urls: record.image_urls || [],
      file_urls: record.file_urls || [],
      file_metadata: record.file_metadata || [],
      school_level: record.school_level,
      view_count: record.view_count || 0,
      is_pinned: record.is_pinned || false,
      is_published: record.is_published !== false,
      created_at: record.created_at,
      updated_at: record.updated_at || record.created_at
    };
  }

  /**
   * Transform auth methods data - adapt for Cognito
   */
  static transformAuthMethods(record) {
    return {
      id: record.id,
      user_id: record.user_id,
      provider: record.provider === 'supabase' ? 'cognito' : record.provider,
      auth_provider_id: record.auth_provider_id,
      provider_data: record.provider_data || {},
      is_primary: record.is_primary || false,
      is_verified: record.is_verified || false,
      last_used_at: record.last_used_at,
      created_at: record.created_at,
      updated_at: record.updated_at || record.created_at
    };
  }

  /**
   * Transform notifications - handle enum types
   */
  static transformNotifications(record) {
    return {
      id: record.id,
      user_id: record.user_id,
      category: record.category || 'system',
      type: record.type,
      priority: record.priority || 'normal',
      title: record.title,
      message: record.message,
      link: record.link,
      data: record.data || {},
      metadata: record.metadata || {},
      related_content_type: record.related_content_type,
      related_content_id: record.related_content_id,
      channels: record.channels || ['in_app'],
      read_at: record.read_at,
      clicked_at: record.clicked_at,
      template_id: record.template_id,
      template_version: record.template_version,
      batch_id: record.batch_id,
      send_at: record.send_at || record.created_at,
      expires_at: record.expires_at,
      created_at: record.created_at,
      updated_at: record.updated_at || record.created_at,
      created_by: record.created_by
    };
  }

  /**
   * Generic transformer for simple tables
   */
  static transformGeneric(record) {
    return record; // Pass through for tables that don't need transformation
  }
}

/**
 * Main migration orchestrator
 */
class MigrationOrchestrator {
  constructor() {
    this.extractor = new SupabaseExtractor();
    this.stats = {
      tablesProcessed: 0,
      totalRecords: 0,
      errors: [],
      startTime: new Date()
    };
    
    // Create output directory
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
  }

  /**
   * Extract data from all tables in dependency order
   */
  async extractAllTables() {
    console.log('🚀 Starting Supabase data extraction...');
    console.log(`📁 Output directory: ${path.resolve(CONFIG.outputDir)}`);
    
    const transformers = {
      user_profiles: DataTransformer.transformUserProfiles,
      posts: DataTransformer.transformPosts,
      auth_methods: DataTransformer.transformAuthMethods,
      notifications: DataTransformer.transformNotifications,
      // Add other transformers as needed
    };
    
    for (const tableName of CONFIG.extractionOrder) {
      try {
        const transformer = transformers[tableName] || DataTransformer.transformGeneric;
        const data = await this.extractor.extractTable(tableName, { transform: transformer });
        
        // Save to JSON file
        const outputFile = path.join(CONFIG.outputDir, `${tableName}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
        
        // Update stats
        this.stats.tablesProcessed++;
        this.stats.totalRecords += data.length;
        
        // Generate SQL insert statements
        this.generateInsertSQL(tableName, data);
        
      } catch (error) {
        console.error(`❌ Failed to extract ${tableName}:`, error.message);
        this.stats.errors.push({ table: tableName, error: error.message });
      }
    }
    
    this.generateSummaryReport();
  }

  /**
   * Generate SQL INSERT statements for RDS
   */
  generateInsertSQL(tableName, data) {
    if (data.length === 0) return;
    
    const sqlFile = path.join(CONFIG.outputDir, `${tableName}_inserts.sql`);
    const columns = Object.keys(data[0]);
    
    let sql = `-- INSERT statements for ${tableName}\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n\n`;
    
    // Batch inserts for better performance
    const batches = this.chunkArray(data, 100);
    
    batches.forEach((batch, batchIndex) => {
      sql += `-- Batch ${batchIndex + 1}\n`;
      sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;
      
      const values = batch.map(record => {
        const valueStr = columns.map(col => {
          const value = record[col];
          if (value === null || value === undefined) return 'NULL';
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
          if (typeof value === 'boolean') return value.toString();
          if (Array.isArray(value)) return `ARRAY['${value.join("','")}']`;
          if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
          return value.toString();
        }).join(', ');
        
        return `  (${valueStr})`;
      }).join(',\n');
      
      sql += values + ';\n\n';
    });
    
    fs.writeFileSync(sqlFile, sql);
    console.log(`📝 Generated SQL: ${sqlFile}`);
  }

  /**
   * Generate migration summary report
   */
  generateSummaryReport() {
    const endTime = new Date();
    const duration = Math.round((endTime - this.stats.startTime) / 1000);
    
    const report = {
      migration_date: this.stats.startTime.toISOString(),
      duration_seconds: duration,
      tables_processed: this.stats.tablesProcessed,
      total_records: this.stats.totalRecords,
      errors: this.stats.errors,
      priority_breakdown: this.calculatePriorityBreakdown(),
      next_steps: [
        '1. Review generated SQL files for any issues',
        '2. Test data import in RDS development environment',
        '3. Validate data integrity and foreign key constraints',
        '4. Run migration validation scripts',
        '5. Schedule production migration window'
      ]
    };
    
    const reportFile = path.join(CONFIG.outputDir, 'migration_report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n📊 EXTRACTION SUMMARY');
    console.log('='.repeat(50));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📋 Tables: ${this.stats.tablesProcessed}`);
    console.log(`📄 Records: ${this.stats.totalRecords.toLocaleString()}`);
    console.log(`❌ Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      this.stats.errors.forEach(err => {
        console.log(`   • ${err.table}: ${err.error}`);
      });
    }
    
    console.log(`\n📁 All files saved to: ${path.resolve(CONFIG.outputDir)}`);
    console.log('\n✅ Data extraction completed!');
  }

  /**
   * Calculate priority breakdown for reporting
   */
  calculatePriorityBreakdown() {
    const breakdown = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    
    Object.entries(CONFIG.priorities).forEach(([priority, tables]) => {
      tables.forEach(table => {
        const file = path.join(CONFIG.outputDir, `${table}.json`);
        if (fs.existsSync(file)) {
          try {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            breakdown[priority] += data.length;
          } catch (err) {
            // Skip if file can't be read
          }
        }
      });
    });
    
    return breakdown;
  }

  /**
   * Utility: Split array into chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const orchestrator = new MigrationOrchestrator();
    await orchestrator.extractAllTables();
  } catch (error) {
    console.error('💥 Fatal error during extraction:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  MigrationOrchestrator,
  DataTransformer,
  SupabaseExtractor,
  CONFIG
};