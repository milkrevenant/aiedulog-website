#!/usr/bin/env node

/**
 * Migration Data Validation Script
 * Validates data integrity after Supabase to RDS migration
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuration
const VALIDATION_CONFIG = {
  sourceDataDir: './migration-data',
  rdsConnection: {
    host: process.env.RDS_HOST || 'localhost',
    port: process.env.RDS_PORT || 5432,
    database: process.env.RDS_DATABASE || 'aiedulog',
    user: process.env.RDS_USERNAME || 'postgres',
    password: process.env.RDS_PASSWORD,
    ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  batchSize: 1000,
  tolerancePercent: 0.01, // Allow 1% data loss tolerance
  criticalTables: ['user_profiles', 'posts', 'comments'], // Zero tolerance tables
};

// Validation test definitions
const VALIDATION_TESTS = {
  // Table existence
  tableExistence: {
    description: 'Check if all tables exist in RDS',
    critical: true
  },
  
  // Record count validation  
  recordCount: {
    description: 'Compare record counts between source and target',
    critical: true
  },
  
  // Primary key integrity
  primaryKeyIntegrity: {
    description: 'Validate primary key constraints',
    critical: true
  },
  
  // Foreign key integrity
  foreignKeyIntegrity: {
    description: 'Validate foreign key relationships',
    critical: true
  },
  
  // Data type validation
  dataTypeValidation: {
    description: 'Validate data types and constraints',
    critical: false
  },
  
  // Unique constraint validation
  uniqueConstraints: {
    description: 'Check unique constraint violations',
    critical: false
  },
  
  // Sample data comparison
  sampleDataComparison: {
    description: 'Compare sample records for data accuracy',
    critical: false
  }
};

/**
 * Migration Data Validator
 */
class MigrationValidator {
  constructor() {
    this.rdsPool = new Pool(VALIDATION_CONFIG.rdsConnection);
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      criticalFailures: 0,
      warnings: [],
      errors: [],
      details: {},
      startTime: new Date(),
    };
    this.tables = [];
    this.sourceData = {};
  }

  /**
   * Initialize validator and load source data
   */
  async initialize() {
    console.log('🔍 Initializing migration validator...');
    
    try {
      // Load source data files
      await this.loadSourceData();
      
      // Test RDS connection
      await this.testRDSConnection();
      
      console.log(`✅ Validator initialized successfully`);
      console.log(`📊 Found ${this.tables.length} tables to validate`);
      
    } catch (error) {
      console.error('❌ Failed to initialize validator:', error.message);
      throw error;
    }
  }

  /**
   * Load source data from JSON files
   */
  async loadSourceData() {
    const dataDir = VALIDATION_CONFIG.sourceDataDir;
    
    if (!fs.existsSync(dataDir)) {
      throw new Error(`Source data directory not found: ${dataDir}`);
    }

    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    
    for (const file of files) {
      const tableName = path.basename(file, '.json');
      const filePath = path.join(dataDir, file);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.sourceData[tableName] = data;
        this.tables.push(tableName);
        console.log(`📄 Loaded ${data.length.toLocaleString()} records from ${tableName}`);
      } catch (error) {
        console.warn(`⚠️  Failed to load ${file}: ${error.message}`);
      }
    }

    if (this.tables.length === 0) {
      throw new Error('No valid source data files found');
    }
  }

  /**
   * Test RDS connection
   */
  async testRDSConnection() {
    try {
      const client = await this.rdsPool.connect();
      const result = await client.query('SELECT version() as version, now() as current_time');
      client.release();
      
      console.log(`🔌 Connected to PostgreSQL: ${result.rows[0].version.split(' ')[1]}`);
      return true;
    } catch (error) {
      throw new Error(`RDS connection failed: ${error.message}`);
    }
  }

  /**
   * Run all validation tests
   */
  async runAllValidations() {
    console.log('\n🚀 Starting migration validation tests...\n');

    const testMethods = [
      { name: 'tableExistence', method: this.validateTableExistence },
      { name: 'recordCount', method: this.validateRecordCounts },
      { name: 'primaryKeyIntegrity', method: this.validatePrimaryKeys },
      { name: 'foreignKeyIntegrity', method: this.validateForeignKeys },
      { name: 'dataTypeValidation', method: this.validateDataTypes },
      { name: 'uniqueConstraints', method: this.validateUniqueConstraints },
      { name: 'sampleDataComparison', method: this.validateSampleData },
    ];

    for (const test of testMethods) {
      await this.runTest(test.name, test.method.bind(this));
    }

    await this.generateValidationReport();
  }

  /**
   * Run individual validation test
   */
  async runTest(testName, testMethod) {
    const testConfig = VALIDATION_TESTS[testName];
    console.log(`🔬 Running ${testConfig.description}...`);
    
    this.results.totalTests++;
    
    try {
      const result = await testMethod();
      
      if (result.passed) {
        this.results.passedTests++;
        console.log(`   ✅ PASSED: ${result.message || 'All checks passed'}`);
      } else {
        this.results.failedTests++;
        
        if (testConfig.critical) {
          this.results.criticalFailures++;
          console.log(`   ❌ CRITICAL FAILURE: ${result.message}`);
          this.results.errors.push({
            test: testName,
            message: result.message,
            critical: true,
            details: result.details || {}
          });
        } else {
          console.log(`   ⚠️  WARNING: ${result.message}`);
          this.results.warnings.push({
            test: testName,
            message: result.message,
            details: result.details || {}
          });
        }
      }
      
      this.results.details[testName] = result;
      
    } catch (error) {
      this.results.failedTests++;
      
      if (testConfig.critical) {
        this.results.criticalFailures++;
      }
      
      console.log(`   💥 ERROR: ${error.message}`);
      this.results.errors.push({
        test: testName,
        message: error.message,
        critical: testConfig.critical,
        error: error.stack
      });
    }

    console.log(''); // Add spacing between tests
  }

  /**
   * Validate table existence
   */
  async validateTableExistence() {
    const client = await this.rdsPool.connect();
    
    try {
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      const existingTables = result.rows.map(row => row.table_name);
      const missingTables = this.tables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length === 0) {
        return {
          passed: true,
          message: `All ${this.tables.length} tables exist in RDS`,
          existingTables: existingTables.length,
          expectedTables: this.tables.length
        };
      } else {
        return {
          passed: false,
          message: `Missing tables: ${missingTables.join(', ')}`,
          missingTables,
          details: { existingTables, expectedTables: this.tables }
        };
      }
      
    } finally {
      client.release();
    }
  }

  /**
   * Validate record counts
   */
  async validateRecordCounts() {
    const client = await this.rdsPool.connect();
    const results = {};
    let totalSourceRecords = 0;
    let totalTargetRecords = 0;
    let significantDiscrepancies = [];
    
    try {
      for (const tableName of this.tables) {
        const sourceCount = this.sourceData[tableName]?.length || 0;
        
        // Get target count
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const targetCount = parseInt(countResult.rows[0].count);
        
        const discrepancy = sourceCount - targetCount;
        const discrepancyPercent = sourceCount > 0 ? Math.abs(discrepancy) / sourceCount * 100 : 0;
        
        results[tableName] = {
          source: sourceCount,
          target: targetCount,
          discrepancy,
          discrepancyPercent: Math.round(discrepancyPercent * 100) / 100
        };
        
        totalSourceRecords += sourceCount;
        totalTargetRecords += targetCount;
        
        // Check for significant discrepancies
        const isCritical = VALIDATION_CONFIG.criticalTables.includes(tableName);
        const tolerance = isCritical ? 0 : VALIDATION_CONFIG.tolerancePercent;
        
        if (discrepancyPercent > tolerance) {
          significantDiscrepancies.push({
            table: tableName,
            discrepancy,
            discrepancyPercent,
            critical: isCritical
          });
        }
      }
      
      const overallDiscrepancy = totalSourceRecords > 0 ? 
        Math.abs(totalSourceRecords - totalTargetRecords) / totalSourceRecords * 100 : 0;
      
      if (significantDiscrepancies.length === 0) {
        return {
          passed: true,
          message: `Record counts match within tolerance (${overallDiscrepancy.toFixed(2)}% overall discrepancy)`,
          totalSource: totalSourceRecords,
          totalTarget: targetRecords,
          details: results
        };
      } else {
        const criticalDiscrepancies = significantDiscrepancies.filter(d => d.critical);
        const hasCritical = criticalDiscrepancies.length > 0;
        
        return {
          passed: !hasCritical,
          message: hasCritical 
            ? `Critical record count discrepancies in ${criticalDiscrepancies.length} tables`
            : `Record count discrepancies in ${significantDiscrepancies.length} non-critical tables`,
          totalSource: totalSourceRecords,
          totalTarget: totalTargetRecords,
          discrepancies: significantDiscrepancies,
          details: results
        };
      }
      
    } finally {
      client.release();
    }
  }

  /**
   * Validate primary key integrity
   */
  async validatePrimaryKeys() {
    const client = await this.rdsPool.connect();
    const issues = [];
    
    try {
      for (const tableName of this.tables) {
        // Check for duplicate primary keys
        const pkResult = await client.query(`
          SELECT a.attname as column_name
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = $1::regclass AND i.indisprimary
        `, [tableName]);
        
        if (pkResult.rows.length === 0) {
          issues.push({
            table: tableName,
            issue: 'No primary key defined',
            severity: 'warning'
          });
          continue;
        }
        
        const pkColumns = pkResult.rows.map(row => row.column_name);
        const pkColList = pkColumns.join(', ');
        
        // Check for NULL values in primary key
        const nullCheckQuery = pkColumns.map(col => `${col} IS NULL`).join(' OR ');
        const nullResult = await client.query(`
          SELECT COUNT(*) as null_count 
          FROM ${tableName} 
          WHERE ${nullCheckQuery}
        `);
        
        const nullCount = parseInt(nullResult.rows[0].null_count);
        if (nullCount > 0) {
          issues.push({
            table: tableName,
            issue: `${nullCount} records with NULL primary key values`,
            severity: 'critical',
            columns: pkColumns
          });
        }
        
        // Check for duplicate primary keys
        const duplicateResult = await client.query(`
          SELECT ${pkColList}, COUNT(*) as dup_count
          FROM ${tableName}
          GROUP BY ${pkColList}
          HAVING COUNT(*) > 1
          LIMIT 10
        `);
        
        if (duplicateResult.rows.length > 0) {
          issues.push({
            table: tableName,
            issue: `${duplicateResult.rows.length} duplicate primary key values found`,
            severity: 'critical',
            examples: duplicateResult.rows
          });
        }
      }
      
      const criticalIssues = issues.filter(issue => issue.severity === 'critical');
      
      return {
        passed: criticalIssues.length === 0,
        message: criticalIssues.length > 0 
          ? `${criticalIssues.length} critical primary key issues found`
          : issues.length > 0
            ? `${issues.length} minor primary key issues found`
            : 'All primary key constraints are valid',
        issues,
        details: { totalTables: this.tables.length, tablesWithIssues: issues.length }
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * Validate foreign key integrity
   */
  async validateForeignKeys() {
    const client = await this.rdsPool.connect();
    const violations = [];
    
    try {
      // Get all foreign key constraints
      const fkResult = await client.query(`
        SELECT 
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = 'public'
          AND tc.table_name = ANY($1)
      `, [this.tables]);
      
      for (const fk of fkResult.rows) {
        // Check for orphaned records
        const violationResult = await client.query(`
          SELECT COUNT(*) as violation_count
          FROM ${fk.table_name} t
          WHERE t.${fk.column_name} IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM ${fk.foreign_table_name} f
              WHERE f.${fk.foreign_column_name} = t.${fk.column_name}
            )
        `);
        
        const violationCount = parseInt(violationResult.rows[0].violation_count);
        
        if (violationCount > 0) {
          violations.push({
            table: fk.table_name,
            column: fk.column_name,
            referencedTable: fk.foreign_table_name,
            referencedColumn: fk.foreign_column_name,
            constraintName: fk.constraint_name,
            violationCount
          });
        }
      }
      
      return {
        passed: violations.length === 0,
        message: violations.length > 0
          ? `${violations.length} foreign key violations found`
          : `All foreign key constraints are satisfied`,
        violations,
        details: { 
          totalConstraints: fkResult.rows.length,
          violatedConstraints: violations.length
        }
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * Validate data types
   */
  async validateDataTypes() {
    const client = await this.rdsPool.connect();
    const issues = [];
    
    try {
      for (const tableName of this.tables) {
        // Get column information
        const columnResult = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        // Check for common data type issues
        for (const column of columnResult.rows) {
          // Check for invalid UUIDs
          if (column.data_type === 'uuid') {
            const invalidUuidResult = await client.query(`
              SELECT COUNT(*) as invalid_count
              FROM ${tableName}
              WHERE ${column.column_name} IS NOT NULL
                AND ${column.column_name}::text !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
            `);
            
            const invalidCount = parseInt(invalidUuidResult.rows[0].invalid_count);
            if (invalidCount > 0) {
              issues.push({
                table: tableName,
                column: column.column_name,
                issue: `${invalidCount} invalid UUID values`,
                dataType: column.data_type
              });
            }
          }
          
          // Check for NULL values in NOT NULL columns
          if (column.is_nullable === 'NO') {
            const nullResult = await client.query(`
              SELECT COUNT(*) as null_count
              FROM ${tableName}
              WHERE ${column.column_name} IS NULL
            `);
            
            const nullCount = parseInt(nullResult.rows[0].null_count);
            if (nullCount > 0) {
              issues.push({
                table: tableName,
                column: column.column_name,
                issue: `${nullCount} NULL values in NOT NULL column`,
                dataType: column.data_type
              });
            }
          }
        }
      }
      
      return {
        passed: issues.length === 0,
        message: issues.length > 0
          ? `${issues.length} data type validation issues found`
          : 'All data types are valid',
        issues,
        details: { totalTables: this.tables.length }
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * Validate unique constraints
   */
  async validateUniqueConstraints() {
    const client = await this.rdsPool.connect();
    const violations = [];
    
    try {
      // Get unique constraints
      const uniqueResult = await client.query(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          string_agg(kcu.column_name, ', ') as columns
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE' 
          AND tc.table_schema = 'public'
          AND tc.table_name = ANY($1)
        GROUP BY tc.table_name, tc.constraint_name
      `, [this.tables]);
      
      for (const constraint of uniqueResult.rows) {
        const duplicateResult = await client.query(`
          SELECT ${constraint.columns}, COUNT(*) as dup_count
          FROM ${constraint.table_name}
          WHERE ${constraint.columns} IS NOT NULL
          GROUP BY ${constraint.columns}
          HAVING COUNT(*) > 1
          LIMIT 5
        `);
        
        if (duplicateResult.rows.length > 0) {
          violations.push({
            table: constraint.table_name,
            constraint: constraint.constraint_name,
            columns: constraint.columns,
            duplicateCount: duplicateResult.rows.length,
            examples: duplicateResult.rows
          });
        }
      }
      
      return {
        passed: violations.length === 0,
        message: violations.length > 0
          ? `${violations.length} unique constraint violations found`
          : 'All unique constraints are satisfied',
        violations,
        details: { totalConstraints: uniqueResult.rows.length }
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * Validate sample data by comparing source and target
   */
  async validateSampleData() {
    const client = await this.rdsPool.connect();
    const mismatches = [];
    const sampleSize = Math.min(10, VALIDATION_CONFIG.batchSize);
    
    try {
      for (const tableName of this.tables) {
        const sourceData = this.sourceData[tableName];
        if (!sourceData || sourceData.length === 0) continue;
        
        // Get sample records from RDS
        const sampleResult = await client.query(`
          SELECT * FROM ${tableName} ORDER BY RANDOM() LIMIT $1
        `, [sampleSize]);
        
        const targetData = sampleResult.rows;
        
        // Compare field by field for common records
        let matchCount = 0;
        let totalComparisons = 0;
        
        for (const targetRecord of targetData) {
          const sourceRecord = sourceData.find(s => s.id === targetRecord.id);
          if (!sourceRecord) continue;
          
          for (const [key, value] of Object.entries(targetRecord)) {
            if (key === 'created_at' || key === 'updated_at') continue; // Skip timestamps
            
            totalComparisons++;
            
            const sourceValue = sourceRecord[key];
            
            // Handle different data types
            if (this.compareValues(sourceValue, value)) {
              matchCount++;
            }
          }
        }
        
        const accuracy = totalComparisons > 0 ? (matchCount / totalComparisons) * 100 : 100;
        
        if (accuracy < 95) { // Less than 95% accuracy is concerning
          mismatches.push({
            table: tableName,
            accuracy: Math.round(accuracy * 100) / 100,
            matchCount,
            totalComparisons,
            sampleSize: targetData.length
          });
        }
      }
      
      return {
        passed: mismatches.length === 0,
        message: mismatches.length > 0
          ? `Data accuracy issues in ${mismatches.length} tables`
          : 'Sample data validation passed',
        mismatches,
        details: { tablesChecked: this.tables.length, sampleSize }
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * Compare two values with type coercion
   */
  compareValues(sourceValue, targetValue) {
    // Handle nulls
    if (sourceValue === null && targetValue === null) return true;
    if (sourceValue === null || targetValue === null) return false;
    
    // Handle arrays
    if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      return JSON.stringify(sourceValue.sort()) === JSON.stringify(targetValue.sort());
    }
    
    // Handle objects
    if (typeof sourceValue === 'object' && typeof targetValue === 'object') {
      return JSON.stringify(sourceValue) === JSON.stringify(targetValue);
    }
    
    // Handle strings
    if (typeof sourceValue === 'string' || typeof targetValue === 'string') {
      return String(sourceValue).trim() === String(targetValue).trim();
    }
    
    // Handle numbers
    if (typeof sourceValue === 'number' || typeof targetValue === 'number') {
      return Number(sourceValue) === Number(targetValue);
    }
    
    // Handle booleans
    return Boolean(sourceValue) === Boolean(targetValue);
  }

  /**
   * Generate comprehensive validation report
   */
  async generateValidationReport() {
    const endTime = new Date();
    const duration = Math.round((endTime - this.results.startTime) / 1000);
    
    const report = {
      validation: {
        timestamp: this.results.startTime.toISOString(),
        duration_seconds: duration,
        status: this.results.criticalFailures === 0 ? 'PASSED' : 'FAILED'
      },
      summary: {
        total_tests: this.results.totalTests,
        passed_tests: this.results.passedTests,
        failed_tests: this.results.failedTests,
        critical_failures: this.results.criticalFailures,
        warnings: this.results.warnings.length,
        success_rate: Math.round((this.results.passedTests / this.results.totalTests) * 100)
      },
      tables_validated: this.tables.length,
      test_results: this.results.details,
      errors: this.results.errors,
      warnings: this.results.warnings,
      recommendations: this.generateRecommendations()
    };
    
    // Save detailed report
    const reportFile = path.join(VALIDATION_CONFIG.sourceDataDir, 'validation_report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION VALIDATION RESULTS');
    console.log('='.repeat(60));
    console.log(`🏆 Overall Status: ${report.validation.status}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Passed Tests: ${report.summary.passed_tests}/${report.summary.total_tests} (${report.summary.success_rate}%)`);
    console.log(`❌ Critical Failures: ${report.summary.critical_failures}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`📋 Tables Validated: ${report.tables_validated}`);
    
    if (this.results.criticalFailures > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      this.results.errors
        .filter(error => error.critical)
        .forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.test}: ${error.message}`);
        });
      
      console.log('\n⛔ MIGRATION VALIDATION FAILED');
      console.log('   Please address critical issues before deploying to production');
    } else {
      console.log('\n✅ MIGRATION VALIDATION PASSED');
      console.log('   Data migration completed successfully with acceptable quality');
      
      if (this.results.warnings.length > 0) {
        console.log('\n⚠️  Warnings (non-critical):');
        this.results.warnings.slice(0, 3).forEach((warning, index) => {
          console.log(`   ${index + 1}. ${warning.test}: ${warning.message}`);
        });
        
        if (this.results.warnings.length > 3) {
          console.log(`   ... and ${this.results.warnings.length - 3} more warnings`);
        }
      }
    }
    
    console.log(`\n📄 Detailed report saved: ${reportFile}`);
    
    return report;
  }

  /**
   * Generate recommendations based on validation results
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.criticalFailures > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Address all critical failures before proceeding',
        description: 'Critical data integrity issues must be resolved'
      });
    }
    
    if (this.results.warnings.length > 5) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Review and address warnings',
        description: 'Multiple warnings may indicate systemic issues'
      });
    }
    
    if (this.results.passedTests < this.results.totalTests * 0.9) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Investigate failing tests',
        description: 'Success rate below 90% indicates potential data quality issues'
      });
    }
    
    recommendations.push({
      priority: 'LOW',
      action: 'Monitor application performance after deployment',
      description: 'Verify application functionality with migrated data'
    });
    
    return recommendations;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      await this.rdsPool.end();
      console.log('🧹 Resources cleaned up');
    } catch (error) {
      console.error('Warning: Cleanup error:', error.message);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  
  if (verbose) {
    console.log('🔍 Running in verbose mode');
  }

  const validator = new MigrationValidator();
  
  try {
    await validator.initialize();
    const report = await validator.runAllValidations();
    
    // Exit with error code if critical failures
    process.exit(report.validation.status === 'FAILED' ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Validation failed with error:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await validator.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { MigrationValidator };