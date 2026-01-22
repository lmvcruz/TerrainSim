/**
 * Quick Test Helper
 *
 * Simplifies the testing workflow by providing easy commands.
 *
 * Usage:
 *   pnpm test:compare        - Interactive mode (prompts for IDs)
 *   pnpm test:latest         - Compare latest production vs local
 *   pnpm test:prod <id>      - Show production logs
 *   pnpm test:local <id>     - Show local logs
 */

const PRODUCTION_API = 'https://api.lmvcruz.work';
const LOCAL_API = 'http://localhost:3001';

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
}

async function fetchLogs(apiUrl: string, correlationId: string): Promise<UnifiedLog[]> {
  const response = await fetch(`${apiUrl}/logs?correlationId=${correlationId}`);
  if (!response.ok) throw new Error(`Failed to fetch logs: ${response.statusText}`);
  return response.json();
}

async function getLatestCorrelationId(apiUrl: string): Promise<string | null> {
  try {
    const response = await fetch(`${apiUrl}/logs/latest?limit=1`);
    if (!response.ok) return null;
    const logs = await response.json();
    if (logs.length === 0) return null;
    return logs[0].correlationId;
  } catch {
    return null;
  }
}

function showLogs(logs: UnifiedLog[], title: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(70)}\n`);

  const backend = logs.filter(l => l.source === 'backend').sort((a, b) => a.timestamp - b.timestamp);
  const frontend = logs.filter(l => l.source === 'frontend').sort((a, b) => a.timestamp - b.timestamp);

  console.log(`📊 Summary:`);
  console.log(`   Total: ${logs.length} logs`);
  console.log(`   Backend: ${backend.length} | Frontend: ${frontend.length}\n`);

  if (backend.length > 0) {
    console.log('🖥️  Backend Logs:\n');
    backend.forEach((log, i) => {
      const time = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12);
      console.log(`  ${i + 1}. [${time}] [${log.level.toUpperCase().padEnd(5)}] ${log.component}`);
      console.log(`     ${log.message}`);
      if (log.data && Object.keys(log.data).length > 0) {
        const dataStr = JSON.stringify(log.data);
        if (dataStr.length < 100) {
          console.log(`     ${dataStr}`);
        } else {
          console.log(`     ${dataStr.substring(0, 100)}...`);
        }
      }
      console.log('');
    });
  }

  if (frontend.length > 0) {
    console.log('🌐 Frontend Logs:\n');
    frontend.forEach((log, i) => {
      const time = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12);
      console.log(`  ${i + 1}. [${time}] [${log.level.toUpperCase().padEnd(5)}] ${log.component}`);
      console.log(`     ${log.message}`);
      if (log.data && Object.keys(log.data).length > 0) {
        const dataStr = JSON.stringify(log.data);
        if (dataStr.length < 100) {
          console.log(`     ${dataStr}`);
        } else {
          console.log(`     ${dataStr.substring(0, 100)}...`);
        }
      }
      console.log('');
    });
  }
}

async function showProductionLogs(correlationId: string) {
  console.log(`\n🔍 Fetching production logs for: ${correlationId}\n`);
  const logs = await fetchLogs(PRODUCTION_API, correlationId);

  if (logs.length === 0) {
    console.log('❌ No logs found.');
    return;
  }

  showLogs(logs, `PRODUCTION LOGS (${correlationId})`);
}

async function showLocalLogs(correlationId: string) {
  console.log(`\n🔍 Fetching local logs for: ${correlationId}\n`);
  const logs = await fetchLogs(LOCAL_API, correlationId);

  if (logs.length === 0) {
    console.log('❌ No logs found.');
    return;
  }

  showLogs(logs, `LOCAL LOGS (${correlationId})`);
}

async function compareLatest() {
  console.log('\n🔍 Finding latest correlation IDs...\n');

  const prodId = await getLatestCorrelationId(PRODUCTION_API);
  const localId = await getLatestCorrelationId(LOCAL_API);

  if (!prodId) {
    console.log('❌ No production logs found.');
    return;
  }

  if (!localId) {
    console.log('❌ No local logs found.');
    return;
  }

  console.log(`📡 Production: ${prodId}`);
  console.log(`🏠 Local: ${localId}\n`);

  // Run the comparison script
  const { spawn } = await import('child_process');
  const proc = spawn('pnpm', ['tsx', 'scripts/compare-logs.ts', prodId, localId], {
    stdio: 'inherit',
    shell: true
  });

  proc.on('close', (code) => {
    if (code !== 0) {
      console.error(`\n❌ Comparison failed with exit code ${code}`);
    }
  });
}

async function interactiveMode() {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  };

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       Production vs Local Comparison - Interactive         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📋 Steps:');
  console.log('  1. Generate terrain on production (https://terrainsim.lmvcruz.work)');
  console.log('  2. Copy correlationId from browser console');
  console.log('  3. Generate terrain locally (http://localhost:5173)');
  console.log('  4. Copy correlationId from browser console\n');

  const prodId = await question('📡 Production correlationId: ');
  const localId = await question('🏠 Local correlationId: ');

  rl.close();

  if (!prodId || !localId) {
    console.log('\n❌ Both correlation IDs are required.');
    return;
  }

  // Run the comparison script
  const { spawn } = await import('child_process');
  const proc = spawn('pnpm', ['tsx', 'scripts/compare-logs.ts', prodId, localId], {
    stdio: 'inherit',
    shell: true
  });

  proc.on('close', (code) => {
    if (code !== 0) {
      console.error(`\n❌ Comparison failed with exit code ${code}`);
    }
  });
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'compare':
      case 'interactive':
        await interactiveMode();
        break;

      case 'latest':
        await compareLatest();
        break;

      case 'prod':
      case 'production':
        if (!arg) {
          console.log('Usage: pnpm test:prod <correlationId>');
          process.exit(1);
        }
        await showProductionLogs(arg);
        break;

      case 'local':
        if (!arg) {
          console.log('Usage: pnpm test:local <correlationId>');
          process.exit(1);
        }
        await showLocalLogs(arg);
        break;

      default:
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║         Production vs Local Testing Helper                 ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');
        console.log('Commands:\n');
        console.log('  pnpm test:compare          Interactive comparison (prompts for IDs)');
        console.log('  pnpm test:latest           Compare latest production vs local');
        console.log('  pnpm test:prod <id>        Show production logs');
        console.log('  pnpm test:local <id>       Show local logs\n');
        console.log('Examples:\n');
        console.log('  pnpm test:compare');
        console.log('  pnpm test:latest');
        console.log('  pnpm test:prod 57810b6b-9ee2-4538-a779-1a99d8e69572');
        console.log('  pnpm test:local abc-123-local\n');
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
