#!/usr/bin/env node
/**
 * OERC-S Kernel CLI
 * Command-line interface for Intent, Frame, and Collapse operations
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { glob } from 'node:fs/promises';

import type {
  Intent,
  Frame,
  Collapse,
  IntentBody,
  FrameBody,
  CollapseBody,
  Signature,
  Sigset,
} from './types.js';
import { isIntent, isFrame, isCollapse, isSignedObject } from './types.js';
import { signMessage, derivePublicKey, generateKeyPair } from './crypto.js';
import { toCanonical, computeObjectId } from './canonical.js';
import { verifyIntent, verifyFrame, verifyCollapse, verify } from './verify.js';
import { loadVectors, runVector, generateReport } from './conformance.js';

// =============================================================================
// CLI Setup
// =============================================================================

const program = new Command();

program
  .name('oerc-s')
  .description('OERC-S Kernel CLI - Intent, Frame, and Collapse operations')
  .version('0.1.0');

// =============================================================================
// Helper Functions
// =============================================================================

function readJsonFile<T>(path: string): T {
  try {
    const content = readFileSync(resolve(path), 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read ${path}: ${message}`);
  }
}

function writeJsonFile(path: string, data: unknown): void {
  try {
    const content = JSON.stringify(data, null, 2);
    writeFileSync(resolve(path), content, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to write ${path}: ${message}`);
  }
}

function readPrivateKey(keyPath: string | undefined): string {
  if (!keyPath) {
    // Check environment variable
    const envKey = process.env['OERC_S_PRIVATE_KEY'];
    if (envKey) {
      return envKey;
    }
    throw new Error(
      'No private key provided. Use --key option or set OERC_S_PRIVATE_KEY environment variable'
    );
  }

  try {
    const content = readFileSync(resolve(keyPath), 'utf-8').trim();
    // Handle JSON format { "privateKey": "..." }
    if (content.startsWith('{')) {
      const parsed = JSON.parse(content) as { privateKey?: string };
      if (parsed.privateKey) {
        return parsed.privateKey;
      }
    }
    // Raw hex format
    return content;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read private key from ${keyPath}: ${message}`);
  }
}

async function expandGlob(pattern: string): Promise<string[]> {
  const files: string[] = [];
  try {
    for await (const file of glob(pattern)) {
      files.push(file);
    }
  } catch {
    // Fallback: treat as literal path
    files.push(pattern);
  }
  return files.sort();
}

// =============================================================================
// Commands
// =============================================================================

// issue-intent command
program
  .command('issue-intent')
  .description('Sign an intent and output the signed intent')
  .requiredOption('--in <path>', 'Input intent JSON file (unsigned body)')
  .requiredOption('--out <path>', 'Output signed intent JSON file')
  .option('--key <path>', 'Private key file path')
  .action(async (options: { in: string; out: string; key?: string }) => {
    try {
      const privateKey = readPrivateKey(options.key);
      const publicKey = derivePublicKey(privateKey);

      // Read input - can be body only or full intent
      const input = readJsonFile<IntentBody | Intent>(options.in);

      let body: IntentBody;
      let existingSignatures: Signature[] = [];

      if ('object_type' in input && input.object_type === 'intent') {
        // Full intent - add signature
        body = (input as Intent).body;
        existingSignatures = (input as Intent).sigset?.signatures ?? [];
      } else {
        // Body only
        body = input as IntentBody;
      }

      // Compute ID if not present
      if (!body.id) {
        body.id = computeObjectId(body);
      }

      // Create signature
      const bodyCanonical = toCanonical(body);
      const sig = signMessage(privateKey, bodyCanonical, 'ed25519-blake3');

      const signature: Signature = {
        pubkey: publicKey,
        sig: sig,
        suite_id: 'ed25519-blake3',
        signed_at: new Date().toISOString(),
      };

      // Build signed intent
      const signedIntent: Intent = {
        object_type: 'intent',
        body: body,
        sigset: {
          threshold: 1,
          signatures: [...existingSignatures, signature],
        },
      };

      writeJsonFile(options.out, signedIntent);
      console.log(`Signed intent written to ${options.out}`);
      console.log(`  ID: ${body.id}`);
      console.log(`  Signer: ${publicKey}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// emit-frame command
program
  .command('emit-frame')
  .description('Sign a frame and output the signed frame')
  .requiredOption('--in <path>', 'Input frame JSON file (unsigned body)')
  .requiredOption('--out <path>', 'Output signed frame JSON file')
  .option('--key <path>', 'Private key file path')
  .action(async (options: { in: string; out: string; key?: string }) => {
    try {
      const privateKey = readPrivateKey(options.key);
      const publicKey = derivePublicKey(privateKey);

      // Read input - can be body only or full frame
      const input = readJsonFile<FrameBody | Frame>(options.in);

      let body: FrameBody;

      if ('object_type' in input && input.object_type === 'frame') {
        body = (input as Frame).body;
      } else {
        body = input as FrameBody;
      }

      // Set executor if not present
      if (!body.executor) {
        body.executor = publicKey;
      }

      // Compute ID if not present
      if (!body.id) {
        body.id = computeObjectId(body);
      }

      // Create signature
      const bodyCanonical = toCanonical(body);
      const sig = signMessage(privateKey, bodyCanonical, 'ed25519-blake3');

      const signature: Signature = {
        pubkey: publicKey,
        sig: sig,
        suite_id: 'ed25519-blake3',
        signed_at: new Date().toISOString(),
      };

      // Build signed frame
      const signedFrame: Frame = {
        object_type: 'frame',
        body: body,
        signature: signature,
      };

      writeJsonFile(options.out, signedFrame);
      console.log(`Signed frame written to ${options.out}`);
      console.log(`  ID: ${body.id}`);
      console.log(`  Intent: ${body.intent_id}`);
      console.log(`  Sequence: ${body.sequence}`);
      console.log(`  Executor: ${publicKey}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// collapse command
program
  .command('collapse')
  .description('Create and sign a collapse from frames')
  .requiredOption('--frames <pattern>', 'Glob pattern for frame files')
  .requiredOption('--out <path>', 'Output signed collapse JSON file')
  .option('--intent <path>', 'Intent JSON file (for reference)')
  .option('--key <path>', 'Private key file path')
  .action(
    async (options: {
      frames: string;
      out: string;
      intent?: string;
      key?: string;
    }) => {
      try {
        const privateKey = readPrivateKey(options.key);
        const publicKey = derivePublicKey(privateKey);

        // Load frames
        const framePaths = await expandGlob(options.frames);
        if (framePaths.length === 0) {
          throw new Error(`No frames found matching pattern: ${options.frames}`);
        }

        const frames: Frame[] = [];
        for (const path of framePaths) {
          const frame = readJsonFile<Frame>(path);
          if (!isFrame(frame)) {
            throw new Error(`${path} is not a valid frame`);
          }
          frames.push(frame);
        }

        // Sort frames by sequence
        frames.sort((a, b) => a.body.sequence - b.body.sequence);

        // Get intent_id from first frame
        const firstFrame = frames[0];
        if (!firstFrame) {
          throw new Error('No frames loaded');
        }
        const intentId = firstFrame.body.intent_id;

        // Verify all frames have same intent_id
        for (const frame of frames) {
          if (frame.body.intent_id !== intentId) {
            throw new Error(
              `Frame ${frame.body.id} has different intent_id: ${frame.body.intent_id}`
            );
          }
        }

        // Aggregate metrics
        const aggregatedMetrics: Record<string, number> = {};
        for (const frame of frames) {
          for (const metric of frame.body.metrics ?? []) {
            const current = aggregatedMetrics[metric.name] ?? 0;
            aggregatedMetrics[metric.name] = current + metric.value;
          }
        }

        // Determine final status
        const lastFrame = frames[frames.length - 1];
        let finalStatus: 'success' | 'partial' | 'failed' = 'success';
        if (lastFrame?.body.status === 'failed') {
          finalStatus = 'failed';
        } else if (frames.some((f) => f.body.status === 'failed')) {
          finalStatus = 'partial';
        }

        // Build collapse body
        const collapseBody: CollapseBody = {
          version: '1.0.0',
          id: '', // Will be computed
          intent_id: intentId,
          frame_ids: frames.map((f) => f.body.id),
          summary: {
            frame_count: frames.length,
            aggregated_metrics: aggregatedMetrics,
            final_status: finalStatus,
          },
          collapsed_at: new Date().toISOString(),
          payload: {},
        };

        // Compute ID
        collapseBody.id = computeObjectId(collapseBody);

        // Create signature
        const bodyCanonical = toCanonical(collapseBody);
        const sig = signMessage(privateKey, bodyCanonical, 'ed25519-blake3');

        const signature: Signature = {
          pubkey: publicKey,
          sig: sig,
          suite_id: 'ed25519-blake3',
          signed_at: new Date().toISOString(),
        };

        // Build signed collapse
        const signedCollapse: Collapse = {
          object_type: 'collapse',
          body: collapseBody,
          sigset: {
            threshold: 1,
            signatures: [signature],
          },
        };

        writeJsonFile(options.out, signedCollapse);
        console.log(`Signed collapse written to ${options.out}`);
        console.log(`  ID: ${collapseBody.id}`);
        console.log(`  Intent: ${intentId}`);
        console.log(`  Frames: ${frames.length}`);
        console.log(`  Status: ${finalStatus}`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    }
  );

// verify command
program
  .command('verify')
  .description('Verify a signed object (intent, frame, or collapse)')
  .requiredOption('--in <path>', 'Input signed JSON file')
  .option('--intent <path>', 'Intent file for frame/collapse verification')
  .option('--frames <pattern>', 'Frame files for collapse verification')
  .option('--verbose', 'Show detailed output')
  .action(
    async (options: {
      in: string;
      intent?: string;
      frames?: string;
      verbose?: boolean;
    }) => {
      try {
        const obj = readJsonFile<unknown>(options.in);

        if (!isSignedObject(obj)) {
          console.error('Error: Input is not a valid signed object');
          process.exit(1);
        }

        let result;

        if (isIntent(obj)) {
          result = verifyIntent(obj);
          console.log(`Verifying Intent: ${obj.body.id}`);
        } else if (isFrame(obj)) {
          let intent: Intent | undefined;
          if (options.intent) {
            intent = readJsonFile<Intent>(options.intent);
          }
          result = verifyFrame(obj, intent);
          console.log(`Verifying Frame: ${obj.body.id}`);
        } else if (isCollapse(obj)) {
          let frames: Frame[] | undefined;
          if (options.frames) {
            const framePaths = await expandGlob(options.frames);
            frames = framePaths.map((p) => readJsonFile<Frame>(p));
          }
          result = verifyCollapse(obj, frames);
          console.log(`Verifying Collapse: ${obj.body.id}`);
        } else {
          result = verify(obj);
        }

        if (result.valid) {
          console.log('Result: VALID');
          if (result.warnings && result.warnings.length > 0) {
            console.log('Warnings:');
            for (const warning of result.warnings) {
              console.log(`  - ${warning}`);
            }
          }
          process.exit(0);
        } else {
          console.log('Result: INVALID');
          console.log('Errors:');
          for (const error of result.errors) {
            console.log(`  - ${error}`);
          }
          process.exit(1);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    }
  );

// conformance-check command
program
  .command('conformance-check')
  .description('Run conformance tests against test vectors')
  .requiredOption('--vectors <dir>', 'Directory containing test vectors')
  .option('--report <path>', 'Output report JSON file')
  .option('--verbose', 'Show detailed output')
  .action(
    async (options: { vectors: string; report?: string; verbose?: boolean }) => {
      try {
        console.log(`Loading vectors from ${options.vectors}...`);
        const vectors = loadVectors(options.vectors);
        console.log(`Found ${vectors.length} test vectors`);

        console.log('Running conformance tests...\n');
        const results = vectors.map(runVector);

        const report = generateReport(results);

        console.log('='.repeat(60));
        console.log(`Total: ${report.total}`);
        console.log(`Passed: ${report.passed}`);
        console.log(`Failed: ${report.failed}`);
        console.log('='.repeat(60));

        if (options.verbose || report.failed > 0) {
          console.log('\nDetails:');
          for (const result of report.results) {
            const status = result.passed ? 'PASS' : 'FAIL';
            console.log(`  [${status}] ${result.name}`);
            if (!result.passed && result.error) {
              console.log(`         Error: ${result.error}`);
            }
          }
        }

        if (options.report) {
          writeJsonFile(options.report, report);
          console.log(`\nReport written to ${options.report}`);
        }

        process.exit(report.failed > 0 ? 1 : 0);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    }
  );

// keygen command
program
  .command('keygen')
  .description('Generate a new Ed25519 key pair')
  .option('--out <path>', 'Output key file path')
  .action((options: { out?: string }) => {
    try {
      const keyPair = generateKeyPair();

      const output = {
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        suite_id: 'ed25519-blake3',
        generated_at: new Date().toISOString(),
      };

      if (options.out) {
        writeJsonFile(options.out, output);
        console.log(`Key pair written to ${options.out}`);
      } else {
        console.log(JSON.stringify(output, null, 2));
      }

      console.log(`Public key: ${keyPair.publicKey}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// canonical command
program
  .command('canonical')
  .description('Output canonical JSON and compute object ID')
  .requiredOption('--in <path>', 'Input JSON file')
  .option('--out <path>', 'Output canonical JSON file')
  .action((options: { in: string; out?: string }) => {
    try {
      const obj = readJsonFile<unknown>(options.in);
      const canonical = toCanonical(obj);
      const id = computeObjectId(obj);

      console.log(`Object ID: ${id}`);

      if (options.out) {
        writeFileSync(resolve(options.out), canonical, 'utf-8');
        console.log(`Canonical JSON written to ${options.out}`);
      } else {
        console.log('Canonical JSON:');
        console.log(canonical);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Parse and execute
program.parse();
