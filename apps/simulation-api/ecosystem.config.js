module.exports = {
  apps: [
    {
      name: 'terrainsim-api',
      script: 'dist/index.js',
      cwd: '/var/www/terrainsim/apps/simulation-api',
      instances: 1,
      exec_mode: 'fork',

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Logging Configuration
      // Human-readable format with timestamps for easy debugging
      error_file: '/var/www/terrainsim/logs/terrainsim-api-error.log',
      out_file: '/var/www/terrainsim/logs/terrainsim-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Log rotation handled by PM2 module pm2-logrotate
      // This prevents log files from growing indefinitely

      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Process management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Error handling
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
    },
  ],
};
