# Monitoring & Observability Guide

## Overview

This document describes the monitoring and observability infrastructure for TerrainSim, including logging, uptime monitoring, analytics, and alerting.

## Architecture

### Components

1. **PM2 Process Manager**: Application process monitoring and log management
2. **PM2 Log Rotate**: Automatic log rotation and retention
3. **UptimeRobot**: External uptime monitoring and alerting
4. **Cloudflare Analytics**: Traffic and performance analytics
5. **Email Alerts**: Critical incident notifications to lmvcruz@gmail.com

## PM2 Logging (DEPLOY-028)

### Configuration

**Format**: Human-readable with timestamps
**Location**: `/var/www/terrainsim/logs/`
- `terrainsim-api-out.log` - Standard output
- `terrainsim-api-error.log` - Error output

**Timestamp Format**: `YYYY-MM-DD HH:mm:ss Z`

### Viewing Logs

```bash
# Real-time logs (all)
pm2 logs terrainsim-api

# Real-time logs (errors only)
pm2 logs terrainsim-api --err

# Real-time logs (output only)
pm2 logs terrainsim-api --out

# Last 100 lines
pm2 logs terrainsim-api --lines 100

# Clear logs
pm2 flush
```

### Log Structure

**Example log entry:**
```
2026-01-14 15:30:45 +00:00: [INFO] 🔌 WebSocket client connected
2026-01-14 15:30:46 +00:00: [INFO] 🌊 Starting erosion simulation: 5000 particles
2026-01-14 15:30:47 +00:00: [ERROR] Failed to process frame: Invalid heightmap data
```

## Log Rotation (DEPLOY-029)

### Configuration

- **Max File Size**: 100MB per log file
- **Retention Period**: 90 days
- **Compression**: Enabled (gzip)
- **Rotation Schedule**: Daily at midnight UTC
- **Date Format**: `YYYY-MM-DD_HH-mm-ss`

### Module: pm2-logrotate

```bash
# View configuration
pm2 conf pm2-logrotate

# Update settings
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 90
pm2 set pm2-logrotate:compress true
```

### Rotated Log Naming

```
terrainsim-api-out.log                    # Current log
terrainsim-api-out__2026-01-14_00-00-00.log.gz  # Rotated log (compressed)
```

### Disk Space Management

With 100MB max size and 90-day retention:
- **Worst case**: ~18GB total (2 logs × 100MB × 90 days, assuming no compression)
- **Typical case**: ~5-10GB (with gzip compression achieving ~50-70% reduction)

## Uptime Monitoring (DEPLOY-030)

### UptimeRobot Configuration

**Service**: UptimeRobot Free Tier
**Monitoring Interval**: 5 minutes
**Alert Contacts**: lmvcruz@gmail.com

### Monitored Endpoints

| Name | Type | URL | Check |
|------|------|-----|-------|
| TerrainSim API Health | HTTP(S) | https://api.lmvcruz.work/health | 200 OK + JSON response |
| TerrainSim Generate | HTTP(S) | https://api.lmvcruz.work/generate | POST, 200 OK |
| TerrainSim WebSocket | Port | api.lmvcruz.work:443 | TCP connection |
| TerrainSim Frontend | HTTP(S) | https://terrainsim.lmvcruz.work | 200 OK |

### Response Time Tracking

- **Location**: Multiple regions (US, Europe, Asia)
- **Metrics**: Response time, uptime percentage
- **Threshold**: Alert if response time > 3000ms

### Setup Instructions

1. Go to https://uptimerobot.com and sign up
2. Add monitors for each endpoint:
   - **Monitor Type**: HTTP(s) for APIs, Port for WebSocket
   - **Friendly Name**: TerrainSim API Health
   - **URL/IP**: https://api.lmvcruz.work/health
   - **Monitoring Interval**: 5 minutes
   - **Alert Contacts**: lmvcruz@gmail.com

3. Configure alert settings:
   - **Alert when**: Monitor is down
   - **Send alerts if**: Down for 2 consecutive checks (10 minutes)
   - **Re-alert if still down**: Every 6 hours (prevents flood)
   - **Send notification when up**: Yes

4. Enable response time monitoring:
   - Go to Monitor Settings → Advanced
   - Enable "Response Time Monitoring"
   - Set threshold: 3000ms

## Error Alerting (DEPLOY-031)

### Email Alerts

**Recipient**: lmvcruz@gmail.com
**Service**: UptimeRobot built-in email alerts

### Alert Types

1. **Service Down**: API becomes unreachable
2. **High Response Time**: Response time exceeds 3000ms
3. **Service Restored**: API comes back online

### Flood Prevention

**Strategy**: UptimeRobot built-in rate limiting
- **Initial Alert**: Sent immediately after 2 failed checks (10 minutes down)
- **Re-alerts**: Only every 6 hours while still down
- **Recovery Alert**: Sent once when service restored

**Additional safeguards:**
- Minimum check interval: 5 minutes (free tier)
- Down confirmation: 2 consecutive failed checks required
- Debounce period: 10 minutes before first alert

### Email Format

```
Subject: [DOWN] TerrainSim API Health

Your monitor TerrainSim API Health (https://api.lmvcruz.work/health) is DOWN.
Reason: Connection timeout
Last checked: 2026-01-14 15:45:00 UTC
Down since: 2026-01-14 15:40:00 UTC (10 minutes)

View details: https://uptimerobot.com/dashboard
```

### Alert Workflow

```
Service Down → Wait 5 min → Check again → Still down? →
Wait 5 min → Check again → Still down (10 min total)? →
Send email alert → Re-check every 5 min →
If still down after 6 hours → Send re-alert →
Service restored → Send recovery email
```

## Cloudflare Analytics (DEPLOY-032)

### Features Enabled

**Free Tier Includes:**
- Traffic analytics (requests, bandwidth, cached vs uncached)
- Security analytics (threats blocked, challenge rate)
- Performance analytics (response time, cache hit rate)
- Geographic distribution (visitors by country)
- Top content (most requested pages/assets)

### Access Analytics

1. Log in to Cloudflare dashboard
2. Select `terrainsim.lmvcruz.work`
3. Go to **Analytics & Logs** → **Traffic**

### Key Metrics

| Metric | Description | Good Range |
|--------|-------------|------------|
| Requests | Total HTTP requests | - |
| Bandwidth | Data transfer | - |
| Cache Hit Rate | % of requests served from cache | >80% |
| Response Time | Average response time | <500ms |
| Error Rate | 4xx/5xx errors | <1% |
| Threat Score | Security threats blocked | Monitor |

### Insights Dashboard

**Available reports:**
- Last 24 hours, 7 days, 30 days
- Traffic by country
- Top paths
- Status codes distribution
- Bot traffic

### No Additional Setup Required

Cloudflare Analytics is automatically enabled for all sites on Cloudflare. No configuration needed.

## Monitoring Dashboard URLs

### Quick Access

- **UptimeRobot Dashboard**: https://uptimerobot.com/dashboard
- **Cloudflare Analytics**: https://dash.cloudflare.com → Select domain → Analytics
- **PM2 Monitoring**: `ssh terrainsim "pm2 monit"`
- **Production Site**: https://terrainsim.lmvcruz.work
- **API Health Check**: https://api.lmvcruz.work/health

## Troubleshooting

### High Error Rate

1. Check PM2 logs: `pm2 logs terrainsim-api --err --lines 100`
2. Check system resources: `pm2 monit`
3. Verify WebSocket connections: `netstat -an | grep 3001`
4. Check nginx error log: `tail -f /var/log/nginx/error.log`

### Disk Space Issues

```bash
# Check disk usage
df -h

# Check log directory size
du -sh /var/www/terrainsim/logs

# Find large logs
find /var/www/terrainsim/logs -type f -size +50M

# Clear PM2 logs if needed (careful!)
pm2 flush

# Force log rotation
pm2 trigger pm2-logrotate rotate
```

### Email Alerts Not Received

1. Check UptimeRobot alert contacts
2. Verify email isn't in spam folder
3. Check UptimeRobot "Alert Contacts" status (verified?)
4. Review alert settings (down confirmation period)

### PM2 Not Restarting

```bash
# Check PM2 status
pm2 status

# Restart manually
pm2 restart terrainsim-api

# Check startup script
pm2 startup

# Save process list
pm2 save
```

## Performance Baselines

### Expected Metrics (128×128 grid)

| Metric | Typical | Acceptable | Alert |
|--------|---------|------------|-------|
| Response Time (/health) | <50ms | <200ms | >3000ms |
| Response Time (/generate) | 50-200ms | <500ms | >2000ms |
| WebSocket Latency | <100ms | <300ms | >1000ms |
| Memory Usage | 150-300MB | <450MB | >500MB |
| CPU Usage | 10-30% | <80% | >90% |
| Uptime | 99.9%+ | >99% | <95% |

### Historical Data

UptimeRobot provides:
- 90-day uptime history (free tier)
- Response time graphs
- Downtime incident log

## Maintenance

### Daily

- ✅ Automated log rotation (midnight UTC)
- ✅ Automated monitoring checks (every 5 minutes)

### Weekly

- Review error logs for patterns
- Check disk space usage
- Review uptime statistics

### Monthly

- Analyze Cloudflare Analytics trends
- Review alert history
- Verify backup retention

## Security Considerations

### Log Data

- Logs may contain sensitive information (IPs, user agents)
- Log files are stored with restricted permissions (644)
- Logs are compressed and encrypted at rest (filesystem level)
- Old logs are automatically deleted after 90 days

### Alert Email

- Email alerts contain only high-level status (no sensitive data)
- No authentication tokens or credentials in alerts
- Email delivery over TLS

## Cost

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| PM2 | Open Source | $0 |
| pm2-logrotate | Open Source | $0 |
| UptimeRobot | Free (50 monitors, 5 min interval) | $0 |
| Cloudflare Analytics | Free tier | $0 |
| Email Alerts | Built-in (UptimeRobot) | $0 |
| **Total** | | **$0** |

## References

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Log Rotation](https://github.com/keymetrics/pm2-logrotate)
- [UptimeRobot Documentation](https://uptimerobot.com/api/)
- [Cloudflare Analytics](https://developers.cloudflare.com/analytics/)

## See Also

- [DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment runbook
- [System Spec](../System%20Spec.md) - System architecture
- [Iterations Planning](../Iterations%20Planning) - Project roadmap
