/**
 * OERC-S Kernel Conformance Testing
 * Implements conformance vector loading and validation
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import type {
  ConformanceResult,
  ConformanceReport,
  SignedObject,
} from './types.js';
import { verify } from './verify.js';

// =============================================================================
// Types
// =============================================================================

interface TestVector {
  vector_id: string;
  description: string;
  expected_result: 'valid' | 'invalid';
  expected_error: string | null;
  object_type: 'intent' | 'frame' | 'collapse';
  object: unknown;
}

interface VectorManifest {
  version: string;
  vectors: string[];
  generated: string;
}

// =============================================================================
// Vector Loading
// =============================================================================

/**
 * Load all test vectors from a directory
 * @param vectorDir - Directory containing test vectors
 * @returns Array of test vectors
 */
export function loadVectors(vectorDir: string): TestVector[] {
  const vectors: TestVector[] = [];

  // Try to load manifest first
  const manifestPath = join(vectorDir, 'manifest.json');
  let vectorFiles: string[];

  try {
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent) as VectorManifest;
    vectorFiles = manifest.vectors;
    console.log(`[INFO] Loaded manifest: ${manifest.version} (${manifest.vectors.length} vectors)`);
  } catch {
    // No manifest, scan directory
    vectorFiles = readdirSync(vectorDir)
      .filter(f => f.endsWith('.json') && f !== 'manifest.json');
    console.log(`[INFO] No manifest found, scanning directory: ${vectorFiles.length} files`);
  }

  for (const file of vectorFiles) {
    const filePath = join(vectorDir, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const vector = JSON.parse(content) as TestVector;
      vectors.push(vector);
    } catch (err) {
      console.error(`[WARN] Failed to load vector ${file}: ${err}`);
    }
  }

  return vectors;
}

// =============================================================================
// Vector Execution
// =============================================================================

/**
 * Run a single test vector and return result
 * @param vector - Test vector to run
 * @returns Conformance result
 */
export function runVector(vector: TestVector): ConformanceResult {
  const startTime = Date.now();

  try {
    // Wrap object in expected structure for verification
    const wrappedObject = wrapObject(vector.object, vector.object_type);

    // Run verification
    const result = verify(wrappedObject as SignedObject);

    // Check if result matches expectation
    const passed = vector.expected_result === 'valid'
      ? result.valid
      : !result.valid;

    // For invalid vectors, optionally check error code
    let errorMatch = true;
    if (vector.expected_result === 'invalid' && vector.expected_error) {
      errorMatch = result.errors.some(e =>
        e.includes(vector.expected_error!) ||
        e.toUpperCase().includes(vector.expected_error!.toUpperCase())
      );
    }

    const finalPassed = passed && (vector.expected_result === 'valid' || errorMatch);

    return {
      name: vector.vector_id,
      passed: finalPassed,
      error: finalPassed ? undefined : formatError(vector, result, errorMatch),
      actual: { valid: result.valid, errors: result.errors },
      expected: { valid: vector.expected_result === 'valid', error: vector.expected_error },
    };
  } catch (err) {
    return {
      name: vector.vector_id,
      passed: false,
      error: `Exception during verification: ${err}`,
    };
  }
}

/**
 * Wrap a raw object in the expected structure
 */
function wrapObject(obj: unknown, type: string): unknown {
  const rawObj = obj as Record<string, unknown>;

  // If already has object_type, return as-is
  if (rawObj['object_type']) {
    return rawObj;
  }

  // Otherwise, wrap it
  return {
    object_type: type,
    body: rawObj,
    sigset: rawObj['sigset'] || { threshold: 1, signatures: [] },
    signature: rawObj['signature'] || null,
  };
}

/**
 * Format error message for failed test
 */
function formatError(
  vector: TestVector,
  result: { valid: boolean; errors: string[] },
  errorMatch: boolean
): string {
  const parts: string[] = [];

  if (vector.expected_result === 'valid' && !result.valid) {
    parts.push(`Expected valid but got invalid: ${result.errors.join(', ')}`);
  } else if (vector.expected_result === 'invalid' && result.valid) {
    parts.push('Expected invalid but got valid');
  }

  if (!errorMatch && vector.expected_error) {
    parts.push(`Expected error containing "${vector.expected_error}" but got: ${result.errors.join(', ')}`);
  }

  return parts.join('; ') || 'Unknown error';
}

// =============================================================================
// Report Generation
// =============================================================================

/**
 * Generate conformance report from results
 * @param results - Array of conformance results
 * @returns Conformance report
 */
export function generateReport(results: ConformanceResult[]): ConformanceReport {
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  return {
    generated_at: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    results,
  };
}

/**
 * Run all vectors and generate report
 * @param vectorDir - Directory containing test vectors
 * @param reportPath - Optional path to write report
 * @returns Conformance report
 */
export function runConformanceCheck(
  vectorDir: string,
  reportPath?: string
): ConformanceReport {
  console.log(`\n[INFO] OERC-S Conformance Check`);
  console.log(`[INFO] Vector directory: ${vectorDir}`);
  console.log('─'.repeat(60));

  // Load vectors
  const vectors = loadVectors(vectorDir);
  console.log(`[INFO] Loaded ${vectors.length} test vectors\n`);

  // Run each vector
  const results: ConformanceResult[] = [];

  for (const vector of vectors) {
    const result = runVector(vector);
    results.push(result);

    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status} ${vector.vector_id}: ${vector.description}`);
    if (!result.passed && result.error) {
      console.log(`         Error: ${result.error}`);
    }
  }

  // Generate report
  const report = generateReport(results);

  console.log('\n' + '─'.repeat(60));
  console.log(`[INFO] Results: ${report.passed}/${report.total} passed`);

  if (report.failed > 0) {
    console.log(`[WARN] ${report.failed} test(s) failed`);
  } else {
    console.log('[INFO] All tests passed!');
  }

  // Write report if path provided
  if (reportPath) {
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`[INFO] Report written to: ${reportPath}`);
  }

  return report;
}

// =============================================================================
// Exports
// =============================================================================

export { TestVector, VectorManifest };
