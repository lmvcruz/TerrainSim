/**
 * Log Comparison Tool
 *
 * Compares production vs local terrain generation logs to identify differences.
 *
 * Usage:
 *   pnpm tsx scripts/compare-logs.ts <production-correlationId> <local-correlationId>
 *
 * Example:
 *   pnpm tsx scripts/compare-logs.ts 57810b6b-9ee2-4538-a779-1a99d8e69572 abc-123-local
 */

interface UnifiedLog {
  correlationId: string;
  logId: string;
  source: 'frontend' | 'backend';
  environment: 'development' | 'production';
  component: string;
  level: 'info' | 'debug' | 'trace' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: number;
  duration?: number;
  userAgent?: string;
  nodeVersion?: string;
  url?: string;
  method?: string;
  stackTrace?: string;
}

interface ComparisonResult {
  productionLogs: UnifiedLog[];
  localLogs: UnifiedLog[];
  summary: {
    production: {
      total: number;
      backend: number;
      frontend: number;
      duration: number;
    };
    local: {
      total: number;
      backend: number;
      frontend: number;
      duration: number;
    };
  };
  differences: Difference[];
}

interface Difference {
  type: 'missing' | 'different' | 'timing' | 'parameter';
  category: 'frontend' | 'backend' | 'both';
  component: string;
  message: string;
  production?: any;
  local?: any;
  timingDiff?: number;
}

const PRODUCTION_API = 'https://api.lmvcruz.work';
const LOCAL_API = 'http://localhost:3001';

async function fetchLogs(apiUrl: string, correlationId: string): Promise<UnifiedLog[]> {
  try {
    const response = await fetch(`${apiUrl}/logs?correlationId=${correlationId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }

    const data = await response.json();
    // Handle both {logs: [...]} and [...] formats
    const logs = Array.isArray(data) ? data : (data.logs || []);
    return logs;
  } catch (error) {
    console.error(`❌ Error fetching logs from ${apiUrl}:`, error);
    return [];
  }
}

function analyzeLogs(logs: UnifiedLog[]) {
  const backend = logs.filter(l => l.source === 'backend');
  const frontend = logs.filter(l => l.source === 'frontend');

  const timestamps = logs.map(l => l.timestamp).sort();
  const duration = timestamps.length > 0 ? timestamps[timestamps.length - 1] - timestamps[0] : 0;

  return {
    total: logs.length,
    backend: backend.length,
    frontend: frontend.length,
    duration
  };
}

function compareParameters(prodLogs: UnifiedLog[], localLogs: UnifiedLog[]): Difference[] {
  const differences: Difference[] = [];

  // Find generation request logs
  const prodGenerate = prodLogs.find(l =>
    l.message.includes('Generating terrain') || l.message.includes('Request received')
  );
  const localGenerate = localLogs.find(l =>
    l.message.includes('Generating terrain') || l.message.includes('Request received')
  );

  if (prodGenerate?.data && localGenerate?.data) {
    const paramKeys = ['seed', 'width', 'height', 'method', 'frequency', 'amplitude', 'octaves'];

    for (const key of paramKeys) {
      const prodValue = prodGenerate.data[key];
      const localValue = localGenerate.data[key];

      if (prodValue !== undefined && localValue !== undefined && prodValue !== localValue) {
        differences.push({
          type: 'parameter',
          category: 'both',
          component: 'Generation Parameters',
          message: `Parameter '${key}' differs`,
          production: prodValue,
          local: localValue
        });
      }
    }
  }

  return differences;
}

function compareBackendLogs(prodLogs: UnifiedLog[], localLogs: UnifiedLog[]): Difference[] {
  const differences: Difference[] = [];

  const prodBackend = prodLogs.filter(l => l.source === 'backend');
  const localBackend = localLogs.filter(l => l.source === 'backend');

  // Compare backend components
  const prodComponents = new Set(prodBackend.map(l => l.component));
  const localComponents = new Set(localBackend.map(l => l.component));

  // Check for missing components
  for (const comp of prodComponents) {
    if (!localComponents.has(comp)) {
      differences.push({
        type: 'missing',
        category: 'backend',
        component: comp,
        message: `Backend component '${comp}' present in production but missing in local`,
        production: true,
        local: false
      });
    }
  }

  for (const comp of localComponents) {
    if (!prodComponents.has(comp)) {
      differences.push({
        type: 'missing',
        category: 'backend',
        component: comp,
        message: `Backend component '${comp}' present in local but missing in production`,
        production: false,
        local: true
      });
    }
  }

  // Compare log messages for same components
  for (const comp of prodComponents) {
    if (localComponents.has(comp)) {
      const prodMessages = prodBackend.filter(l => l.component === comp).map(l => l.message);
      const localMessages = localBackend.filter(l => l.component === comp).map(l => l.message);

      // Find messages in prod but not in local
      for (const msg of prodMessages) {
        if (!localMessages.includes(msg)) {
          differences.push({
            type: 'different',
            category: 'backend',
            component: comp,
            message: `Backend log message differs: "${msg}"`,
            production: true,
            local: false
          });
        }
      }
    }
  }

  return differences;
}

function compareFrontendLogs(prodLogs: UnifiedLog[], localLogs: UnifiedLog[]): Difference[] {
  const differences: Difference[] = [];

  const prodFrontend = prodLogs.filter(l => l.source === 'frontend');
  const localFrontend = localLogs.filter(l => l.source === 'frontend');

  // Compare frontend components
  const prodComponents = new Set(prodFrontend.map(l => l.component));
  const localComponents = new Set(localFrontend.map(l => l.component));

  // Check for missing components
  for (const comp of prodComponents) {
    if (!localComponents.has(comp)) {
      differences.push({
        type: 'missing',
        category: 'frontend',
        component: comp,
        message: `Frontend component '${comp}' present in production but missing in local`,
        production: true,
        local: false
      });
    }
  }

  for (const comp of localComponents) {
    if (!prodComponents.has(comp)) {
      differences.push({
        type: 'missing',
        category: 'frontend',
        component: comp,
        message: `Frontend component '${comp}' present in local but missing in production`,
        production: false,
        local: true
      });
    }
  }

  return differences;
}

function compareTimings(prodLogs: UnifiedLog[], localLogs: UnifiedLog[]): Difference[] {
  const differences: Difference[] = [];

  // Compare backend generation timing
  const prodBackend = prodLogs.filter(l => l.source === 'backend');
  const localBackend = localLogs.filter(l => l.source === 'backend');

  const prodStart = Math.min(...prodBackend.map(l => l.timestamp));
  const prodEnd = Math.max(...prodBackend.map(l => l.timestamp));
  const prodDuration = prodEnd - prodStart;

  const localStart = Math.min(...localBackend.map(l => l.timestamp));
  const localEnd = Math.max(...localBackend.map(l => l.timestamp));
  const localDuration = localEnd - localStart;

  const timingDiff = Math.abs(prodDuration - localDuration);

  if (timingDiff > 100) { // More than 100ms difference
    differences.push({
      type: 'timing',
      category: 'backend',
      component: 'Overall',
      message: `Backend execution time differs by ${timingDiff}ms`,
      production: prodDuration,
      local: localDuration,
      timingDiff
    });
  }

  return differences;
}

async function compareLogs(prodCorrelationId: string, localCorrelationId: string): Promise<ComparisonResult> {
  console.log('🔍 Fetching logs...\n');

  console.log(`  📡 Production: ${PRODUCTION_API}/logs?correlationId=${prodCorrelationId}`);
  const productionLogs = await fetchLogs(PRODUCTION_API, prodCorrelationId);
  console.log(`     ✅ Fetched ${productionLogs.length} logs\n`);

  console.log(`  🏠 Local: ${LOCAL_API}/logs?correlationId=${localCorrelationId}`);
  const localLogs = await fetchLogs(LOCAL_API, localCorrelationId);
  console.log(`     ✅ Fetched ${localLogs.length} logs\n`);

  if (productionLogs.length === 0) {
    console.error('❌ No production logs found. Please check the correlation ID.');
  }

  if (localLogs.length === 0) {
    console.error('❌ No local logs found. Please check the correlation ID.');
  }

  const summary = {
    production: analyzeLogs(productionLogs),
    local: analyzeLogs(localLogs)
  };

  const differences: Difference[] = [
    ...compareParameters(productionLogs, localLogs),
    ...compareBackendLogs(productionLogs, localLogs),
    ...compareFrontendLogs(productionLogs, localLogs),
    ...compareTimings(productionLogs, localLogs)
  ];

  return {
    productionLogs,
    localLogs,
    summary,
    differences
  };
}

function printResults(result: ComparisonResult) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    LOG COMPARISON RESULTS                      ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Summary
  console.log('📊 SUMMARY\n');
  console.log('  Production:');
  console.log(`    Total Logs: ${result.summary.production.total}`);
  console.log(`    Backend:    ${result.summary.production.backend}`);
  console.log(`    Frontend:   ${result.summary.production.frontend}`);
  console.log(`    Duration:   ${result.summary.production.duration}ms\n`);

  console.log('  Local:');
  console.log(`    Total Logs: ${result.summary.local.total}`);
  console.log(`    Backend:    ${result.summary.local.backend}`);
  console.log(`    Frontend:   ${result.summary.local.frontend}`);
  console.log(`    Duration:   ${result.summary.local.duration}ms\n`);

  // Differences
  if (result.differences.length === 0) {
    console.log('✅ NO DIFFERENCES FOUND - Logs are identical!\n');
    return;
  }

  console.log(`⚠️  DIFFERENCES FOUND: ${result.differences.length}\n`);

  // Group by category
  const paramDiffs = result.differences.filter(d => d.type === 'parameter');
  const backendDiffs = result.differences.filter(d => d.category === 'backend');
  const frontendDiffs = result.differences.filter(d => d.category === 'frontend');
  const timingDiffs = result.differences.filter(d => d.type === 'timing');

  if (paramDiffs.length > 0) {
    console.log('🎛️  PARAMETER DIFFERENCES:\n');
    paramDiffs.forEach(diff => {
      console.log(`  • ${diff.message}`);
      console.log(`    Production: ${JSON.stringify(diff.production)}`);
      console.log(`    Local:      ${JSON.stringify(diff.local)}\n`);
    });
  }

  if (backendDiffs.length > 0) {
    console.log('🖥️  BACKEND DIFFERENCES:\n');
    backendDiffs.forEach(diff => {
      console.log(`  • ${diff.message}`);
      if (diff.production !== undefined && diff.local !== undefined) {
        console.log(`    Production: ${diff.production}`);
        console.log(`    Local:      ${diff.local}`);
      }
      console.log('');
    });
  }

  if (frontendDiffs.length > 0) {
    console.log('🌐 FRONTEND DIFFERENCES:\n');
    frontendDiffs.forEach(diff => {
      console.log(`  • ${diff.message}`);
      if (diff.production !== undefined && diff.local !== undefined) {
        console.log(`    Production: ${diff.production}`);
        console.log(`    Local:      ${diff.local}`);
      }
      console.log('');
    });
  }

  if (timingDiffs.length > 0) {
    console.log('⏱️  TIMING DIFFERENCES:\n');
    timingDiffs.forEach(diff => {
      console.log(`  • ${diff.message}`);
      console.log(`    Production: ${diff.production}ms`);
      console.log(`    Local:      ${diff.local}ms`);
      console.log(`    Difference: ${diff.timingDiff}ms\n`);
    });
  }

  // Detailed logs section
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                        DETAILED LOGS                          ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📡 PRODUCTION LOGS:\n');
  printLogList(result.productionLogs);

  console.log('\n🏠 LOCAL LOGS:\n');
  printLogList(result.localLogs);
}

function printLogList(logs: UnifiedLog[]) {
  // Group by source
  const backend = logs.filter(l => l.source === 'backend').sort((a, b) => a.timestamp - b.timestamp);
  const frontend = logs.filter(l => l.source === 'frontend').sort((a, b) => a.timestamp - b.timestamp);

  if (backend.length > 0) {
    console.log('  🖥️  Backend Logs:\n');
    backend.forEach((log, i) => {
      const time = new Date(log.timestamp).toISOString().split('T')[1].slice(0, -1);
      console.log(`    ${i + 1}. [${time}] [${log.level.toUpperCase()}] ${log.component}`);
      console.log(`       ${log.message}`);
      if (log.data) {
        console.log(`       Data: ${JSON.stringify(log.data, null, 2).split('\n').join('\n       ')}`);
      }
      console.log('');
    });
  }

  if (frontend.length > 0) {
    console.log('  🌐 Frontend Logs:\n');
    frontend.forEach((log, i) => {
      const time = new Date(log.timestamp).toISOString().split('T')[1].slice(0, -1);
      console.log(`    ${i + 1}. [${time}] [${log.level.toUpperCase()}] ${log.component}`);
      console.log(`       ${log.message}`);
      if (log.data) {
        console.log(`       Data: ${JSON.stringify(log.data, null, 2).split('\n').join('\n       ')}`);
      }
      console.log('');
    });
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.log('Usage: pnpm tsx scripts/compare-logs.ts <production-correlationId> <local-correlationId>');
    console.log('');
    console.log('Example:');
    console.log('  pnpm tsx scripts/compare-logs.ts 57810b6b-9ee2-4538-a779-1a99d8e69572 abc-123-local');
    console.log('');
    console.log('Steps to generate test data:');
    console.log('  1. Open production: https://terrainsim.lmvcruz.work');
    console.log('  2. Generate terrain (note the correlationId in browser console)');
    console.log('  3. Open local: http://localhost:5173');
    console.log('  4. Generate terrain with SAME parameters (note the correlationId)');
    console.log('  5. Run this script with both correlationIds');
    process.exit(1);
  }

  const [prodCorrelationId, localCorrelationId] = args;

  const result = await compareLogs(prodCorrelationId, localCorrelationId);
  printResults(result);
}

main();
