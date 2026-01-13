module.exports = {
  apps: [{
    name: 'terrainsim-api',
    cwd: '/var/www/terrainsim/apps/simulation-api',
    script: 'src/index.ts',
    interpreter: '/var/www/terrainsim/node_modules/.bin/tsx',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    error_file: '/var/log/terrainsim/error.log',
    out_file: '/var/log/terrainsim/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
  }]
};
