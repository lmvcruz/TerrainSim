module.exports = {
  apps: [{
    name: 'terrainsim-api',
    cwd: '/var/www/terrainsim/apps/simulation-api',
    script: 'pnpm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/terrainsim/error.log',
    out_file: '/var/log/terrainsim/out.log',
    time: true
  }]
}
