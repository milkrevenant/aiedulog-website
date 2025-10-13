#!/usr/bin/env node

/**
 * Production Data Extraction Script
 * Real implementation using actual Supabase client
 * Run with: node extract-production-data.js
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { 
  MIGRATION_CONFIG, 
  initializeSupabaseClient, 
  getTableConfig, 
  getTablePriority,
  validateConfig 
} = require('./migration-config');

/**
 * Production Supabase Data Extractor
 */
class ProductionDataExtractor {
  constructor() {
    this.supabase = initializeSupabaseClient();
    this.stats = {
      tablesProcessed: 0,
      totalRecords: 0,
      errors: [],
      warnings: [],
      startTime: new Date(),
      tableStats: {}
    };
    
    this.outputDir = MIGRATION_CONFIG.migration.outputDir;
    
    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Extract data from a specific table with real Supabase queries
   */
  async extractTable(tableName) {
    console.log(`\n📥 Extracting ${tableName} (${getTablePriority(tableName)} priority)...`);
    
    const tableConfig = getTableConfig(tableName);
    const startTime = Date.now();
    
    try {
      let allData = [];
      let totalCount = 0;
      let batchCount = 0;
      
      // First, get total count for progress tracking
      const { count, error: countError } = await this.supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        throw new Error(`Failed to count records: ${countError.message}`);
      }
      
      totalCount = count || 0;
      console.log(`   📊 Total records: ${totalCount.toLocaleString()}`);
      
      if (totalCount === 0) {
        console.log(`   ⚠️  No data found in ${tableName}`);
        this.stats.warnings.push(`No data in ${tableName}`);
        return [];
      }
      
      // Extract data in batches
      let hasMore = true;
      let offset = 0;
      const batchSize = tableConfig.batchSize;
      
      while (hasMore && offset < totalCount) {
        batchCount++;
        const progress = Math.round((offset / totalCount) * 100);
        console.log(`   🔄 Batch ${batchCount} (${offset}-${Math.min(offset + batchSize, totalCount)}) [${progress}%]`);
        
        // Build query with filters and ordering
        let query = this.supabase
          .from(tableName)
          .select(tableConfig.selectFields || '*')
          .range(offset, offset + batchSize - 1);
        
        // Apply ordering
        if (tableConfig.orderBy) {
          query = query.order(tableConfig.orderBy, { ascending: true });
        }
        
        // Apply filters if configured
        if (tableConfig.filters) {
          Object.entries(tableConfig.filters).forEach(([field, condition]) => {
            if (typeof condition === 'object') {
              Object.entries(condition).forEach(([operator, value]) => {
                switch (operator) {
                  case '$ne':
                    query = query.neq(field, value);
                    break;
                  case '$gte':
                    query = query.gte(field, value);
                    break;
                  case '$lte':
                    query = query.lte(field, value);
                    break;
                  // Add more operators as needed
                }
              });
            } else {
              query = query.eq(field, condition);
            }
          });
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw new Error(`Batch ${batchCount} failed: ${error.message}`);
        }
        
        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }
        
        // Transform data if needed
        const transformedData = data.map(record => this.transformRecord(tableName, record));
        
        // Validate data if configured
        if (tableConfig.validateData) {
          const validData = transformedData.filter(record => this.validateRecord(tableName, record));
          if (validData.length !== transformedData.length) {
            this.stats.warnings.push(`${tableName}: ${transformedData.length - validData.length} invalid records filtered out`);
          }
          allData = allData.concat(validData);
        } else {
          allData = allData.concat(transformedData);
        }
        
        offset += batchSize;
        hasMore = data.length === batchSize;
        
        // Rate limiting to avoid overwhelming Supabase
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      const avgPerSec = Math.round(allData.length / Math.max(duration, 1));
      
      console.log(`   ✅ ${tableName}: ${allData.length.toLocaleString()} records in ${duration}s (${avgPerSec}/sec)`);
      
      // Save statistics
      this.stats.tableStats[tableName] = {
        recordCount: allData.length,
        expectedCount: totalCount,
        duration: duration,
        avgPerSecond: avgPerSec,
        priority: getTablePriority(tableName)
      };
      
      // Save data to JSON file
      const jsonFile = path.join(this.outputDir, `${tableName}.json`);
      fs.writeFileSync(jsonFile, JSON.stringify(allData, null, 2));
      
      // Generate SQL insert statements
      this.generateSQLInserts(tableName, allData);
      
      this.stats.tablesProcessed++;
      this.stats.totalRecords += allData.length;
      
      return allData;
      
    } catch (error) {
      console.error(`   ❌ Error extracting ${tableName}: ${error.message}`);
      this.stats.errors.push({
        table: tableName,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  /**
   * Transform record based on table-specific rules
   */
  transformRecord(tableName, record) {
    const transformations = MIGRATION_CONFIG.transformation;
    const transformed = { ...record };
    
    // Apply field mappings
    Object.entries(transformations.fieldMappings).forEach(([oldField, newField]) => {
      if (oldField.includes(tableName) && transformed[oldField.split('.').pop()]) {
        const oldKey = oldField.split('.').pop();
        const newKey = newField.split('.').pop();
        transformed[newKey] = transformed[oldKey];
        if (oldKey !== newKey) delete transformed[oldKey];
      }
    });
    
    // Apply default values
    Object.entries(transformations.defaults).forEach(([field, defaultValue]) => {
      if (field.startsWith(tableName + '.')) {
        const fieldName = field.split('.').pop();
        if (transformed[fieldName] === null || transformed[fieldName] === undefined) {
          transformed[fieldName] = defaultValue;
        }
      }
    });
    
    // Remove excluded fields
    transformations.excludeFields.forEach(field => {
      delete transformed[field];
    });
    
    // Apply type transformers
    Object.entries(transformed).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        // UUID transformation
        if (key.includes('_id') || key === 'id') {
          transformed[key] = transformations.typeTransformers.uuid(value);
        }
        // Timestamp transformation
        else if (key.includes('_at') || key.includes('_date')) {
          transformed[key] = transformations.typeTransformers.timestamp(value);
        }
        // JSON transformation
        else if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            transformed[key] = JSON.parse(value);
          } catch (e) {
            // Keep as string if not valid JSON
          }
        }
      }
    });
    
    return transformed;
  }

  /**
   * Validate record against table requirements
   */
  validateRecord(tableName, record) {
    const validationRules = MIGRATION_CONFIG.validation;
    
    // Check required fields
    const requiredFields = validationRules.requiredFields[tableName] || [];
    for (const field of requiredFields) {
      if (!record[field] || record[field] === null) {
        console.warn(`   ⚠️  ${tableName}: Missing required field '${field}'`);
        return false;
      }
    }
    
    // Check format validations
    Object.entries(validationRules.formatValidations).forEach(([format, regex]) => {
      Object.entries(record).forEach(([key, value]) => {
        if (key.includes(format) && value && !regex.test(value)) {
          console.warn(`   ⚠️  ${tableName}: Invalid ${format} format for '${key}': ${value}`);
          return false;
        }
      });
    });
    
    return true;
  }

  /**
   * Generate SQL INSERT statements optimized for PostgreSQL
   */
  generateSQLInserts(tableName, data) {
    if (data.length === 0) return;
    
    const sqlFile = path.join(this.outputDir, `${tableName}_inserts.sql`);
    const columns = Object.keys(data[0]).sort(); // Consistent column order
    
    let sql = `-- PostgreSQL INSERT statements for ${tableName}\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n`;
    sql += `-- Total records: ${data.length.toLocaleString()}\n\n`;
    
    // Add transaction wrapper for safety
    sql += `BEGIN;\n\n`;
    
    // Disable triggers during bulk insert for performance
    sql += `ALTER TABLE ${tableName} DISABLE TRIGGER ALL;\n\n`;
    
    // Use COPY for better performance on large datasets
    if (data.length > 5000) {
      sql += `-- Use COPY for bulk insert (recommended for ${data.length} records)\n`;
      sql += `COPY ${tableName} (${columns.join(', ')}) FROM stdin;\n`;
      
      data.forEach(record => {
        const values = columns.map(col => {
          const value = record[col];
          if (value === null || value === undefined) return '\\N';
          if (typeof value === 'string') return value.replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\n/g, '\\n');
          if (typeof value === 'boolean') return value.toString();
          if (Array.isArray(value)) return `{${value.join(',')}}`;
          if (typeof value === 'object') return JSON.stringify(value);
          return value.toString();
        });
        
        sql += values.join('\t') + '\n';
      });
      
      sql += `\\.\n\n`;
    } else {
      // Use INSERT statements for smaller datasets
      const batchSize = 100;
      const batches = this.chunkArray(data, batchSize);
      
      batches.forEach((batch, batchIndex) => {
        sql += `-- Batch ${batchIndex + 1} (${batchIndex * batchSize + 1}-${Math.min((batchIndex + 1) * batchSize, data.length)})\n`;
        sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;
        
        const values = batch.map(record => {
          const valueStr = columns.map(col => {
            const value = record[col];
            if (value === null || value === undefined) return 'NULL';
            if (typeof value === 'string') return `'${this.escapeSQLString(value)}'`;
            if (typeof value === 'boolean') return value.toString();
            if (Array.isArray(value)) return `ARRAY[${value.map(v => `'${this.escapeSQLString(v.toString())}'`).join(',')}]`;
            if (typeof value === 'object') return `'${this.escapeSQLString(JSON.stringify(value))}'::jsonb`;
            return value.toString();
          }).join(', ');
          
          return `  (${valueStr})`;
        }).join(',\n');
        
        sql += values + '\nON CONFLICT DO NOTHING;\n\n';
      });
    }
    
    // Re-enable triggers
    sql += `ALTER TABLE ${tableName} ENABLE TRIGGER ALL;\n\n`;
    
    // Commit transaction
    sql += `COMMIT;\n\n`;
    
    // Add verification query
    sql += `-- Verification\n`;
    sql += `SELECT COUNT(*) as imported_count FROM ${tableName};\n`;
    
    fs.writeFileSync(sqlFile, sql);
    console.log(`   📝 SQL file: ${path.basename(sqlFile)} (${this.formatFileSize(fs.statSync(sqlFile).size)})`);
  }

  /**
   * Escape SQL strings properly
   */
  escapeSQLString(str) {
    if (!str) return '';
    return str.toString().replace(/'/g, "''").replace(/\\/g, '\\\\');
  }

  /**
   * Extract all tables in dependency order
   */
  async extractAllTables() {
    console.log('🚀 Starting production data extraction from Supabase...');
    console.log(`📁 Output directory: ${path.resolve(this.outputDir)}`);
    
    // Validate configuration
    try {
      validateConfig();
      console.log('✅ Configuration validated successfully');
    } catch (error) {
      console.error('❌ Configuration validation failed:', error.message);
      return;
    }
    
    // Test Supabase connection
    try {
      const { data, error } = await this.supabase.from('user_profiles').select('count', { count: 'exact', head: true });
      if (error) throw error;
      console.log('✅ Supabase connection successful');
    } catch (error) {
      console.error('❌ Failed to connect to Supabase:', error.message);
      return;
    }
    
    console.log('\n📋 Extraction plan:');
    MIGRATION_CONFIG.extraction.dependency_order.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table} (${getTablePriority(table)})`);
    });
    
    // Extract tables in dependency order
    for (const tableName of MIGRATION_CONFIG.extraction.dependency_order) {
      if (MIGRATION_CONFIG.migration.dryRun) {
        console.log(`🔍 DRY RUN: Would extract ${tableName}`);
        continue;
      }
      
      await this.extractTable(tableName);
      
      // Brief pause between tables
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    this.generateFinalReport();
  }

  /**
   * Generate comprehensive final report
   */
  generateFinalReport() {
    const endTime = new Date();
    const totalDuration = Math.round((endTime - this.stats.startTime) / 1000);
    
    const report = {
      migration: {
        timestamp: this.stats.startTime.toISOString(),
        duration_seconds: totalDuration,
        duration_readable: this.formatDuration(totalDuration),
        status: this.stats.errors.length === 0 ? 'SUCCESS' : 'PARTIAL_FAILURE'
      },
      statistics: {
        tables_processed: this.stats.tablesProcessed,
        total_records: this.stats.totalRecords,
        records_per_second: Math.round(this.stats.totalRecords / Math.max(totalDuration, 1)),
        errors_count: this.stats.errors.length,
        warnings_count: this.stats.warnings.length
      },
      tables: this.stats.tableStats,
      errors: this.stats.errors,
      warnings: this.stats.warnings,
      priority_summary: this.calculatePrioritySummary(),
      next_steps: [
        '1. Review generated SQL files for any issues',
        '2. Set up RDS PostgreSQL instance',
        '3. Apply DDL schema (RDS_MIGRATION_DDL.sql)',
        '4. Test data import in development environment',
        '5. Run data validation scripts',
        '6. Schedule production migration window',
        '7. Update application code to use RDS instead of Supabase'
      ]
    };
    
    // Save detailed report
    const reportFile = path.join(this.outputDir, 'migration_report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // Generate summary report
    const summaryFile = path.join(this.outputDir, 'MIGRATION_SUMMARY.md');
    this.generateMarkdownSummary(report, summaryFile);
    
    // Console summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION EXTRACTION COMPLETED');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Duration: ${report.migration.duration_readable}`);
    console.log(`📋 Tables Processed: ${report.statistics.tables_processed}`);
    console.log(`📄 Total Records: ${report.statistics.total_records.toLocaleString()}`);
    console.log(`⚡ Avg Speed: ${report.statistics.records_per_second.toLocaleString()} records/sec`);
    console.log(`❌ Errors: ${report.statistics.errors_count}`);
    console.log(`⚠️  Warnings: ${report.statistics.warnings_count}`);
    console.log(`📁 Output: ${path.resolve(this.outputDir)}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n🚨 ERRORS ENCOUNTERED:');
      this.stats.errors.forEach((err, index) => {
        console.log(`   ${index + 1}. ${err.table}: ${err.error}`);
      });
    }
    
    if (this.stats.warnings.length > 0 && this.stats.warnings.length <= 5) {
      console.log('\n⚠️  WARNINGS:');
      this.stats.warnings.slice(0, 5).forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
      if (this.stats.warnings.length > 5) {
        console.log(`   ... and ${this.stats.warnings.length - 5} more warnings`);
      }
    }
    
    console.log(`\n📋 Next: Review ${summaryFile} for detailed migration plan`);
    console.log('✅ Data extraction completed successfully!');
  }

  /**
   * Generate Markdown summary report
   */
  generateMarkdownSummary(report, filePath) {
    let markdown = `# AiEduLog Database Migration Report\n\n`;
    markdown += `**Generated:** ${report.migration.timestamp}\n`;
    markdown += `**Duration:** ${report.migration.duration_readable}\n`;
    markdown += `**Status:** ${report.migration.status}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `- **Tables Processed:** ${report.statistics.tables_processed}\n`;
    markdown += `- **Total Records:** ${report.statistics.total_records.toLocaleString()}\n`;
    markdown += `- **Average Speed:** ${report.statistics.records_per_second.toLocaleString()} records/second\n`;
    markdown += `- **Errors:** ${report.statistics.errors_count}\n`;
    markdown += `- **Warnings:** ${report.statistics.warnings_count}\n\n`;
    
    markdown += `## Tables by Priority\n\n`;
    Object.entries(report.priority_summary).forEach(([priority, data]) => {
      markdown += `### ${priority} Priority\n`;
      markdown += `- **Tables:** ${data.count}\n`;
      markdown += `- **Records:** ${data.records.toLocaleString()}\n\n`;
    });
    
    markdown += `## Table Details\n\n`;
    markdown += `| Table | Records | Duration | Speed | Priority |\n`;
    markdown += `|-------|---------|----------|-------|----------|\n`;
    Object.entries(report.tables).forEach(([table, stats]) => {
      markdown += `| ${table} | ${stats.recordCount.toLocaleString()} | ${stats.duration}s | ${stats.avgPerSecond}/sec | ${stats.priority} |\n`;
    });
    
    if (report.errors.length > 0) {
      markdown += `\n## Errors\n\n`;
      report.errors.forEach((error, index) => {
        markdown += `${index + 1}. **${error.table}:** ${error.error} _(${error.timestamp})_\n`;
      });
    }
    
    if (report.warnings.length > 0) {
      markdown += `\n## Warnings\n\n`;
      report.warnings.forEach((warning, index) => {
        markdown += `${index + 1}. ${warning}\n`;
      });
    }
    
    markdown += `\n## Next Steps\n\n`;
    report.next_steps.forEach((step, index) => {
      markdown += `${index + 1}. ${step}\n`;
    });
    
    markdown += `\n## Files Generated\n\n`;
    markdown += `- **DDL Schema:** \`RDS_MIGRATION_DDL.sql\`\n`;
    markdown += `- **Data Files:** \`{table_name}.json\` for each table\n`;
    markdown += `- **SQL Inserts:** \`{table_name}_inserts.sql\` for each table\n`;
    markdown += `- **Report:** \`migration_report.json\` (detailed)\n`;
    
    fs.writeFileSync(filePath, markdown);
  }

  /**
   * Calculate priority summary statistics
   */
  calculatePrioritySummary() {
    const summary = { HIGH: { count: 0, records: 0 }, MEDIUM: { count: 0, records: 0 }, LOW: { count: 0, records: 0 } };
    
    Object.entries(this.stats.tableStats).forEach(([table, stats]) => {
      const priority = stats.priority;
      if (summary[priority]) {
        summary[priority].count++;
        summary[priority].records += stats.recordCount;
      }
    });
    
    return summary;
  }

  /**
   * Utility functions
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)}${units[unitIndex]}`;
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipValidation = args.includes('--skip-validation');
  
  if (dryRun) {
    MIGRATION_CONFIG.migration.dryRun = true;
    console.log('🔍 Running in DRY RUN mode - no data will be extracted');
  }
  
  try {
    const extractor = new ProductionDataExtractor();
    await extractor.extractAllTables();
  } catch (error) {
    console.error('💥 Fatal error during data extraction:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ProductionDataExtractor };