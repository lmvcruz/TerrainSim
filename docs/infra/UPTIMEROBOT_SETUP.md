# UptimeRobot Setup Guide

This guide walks through setting up comprehensive uptime monitoring for TerrainSim using UptimeRobot's free tier.

## Overview

- **Service**: UptimeRobot Free Tier
- **Monitoring**: 4 endpoints (health, generate, WebSocket, frontend)
- **Check Interval**: 5 minutes
- **Alert Email**: lmvcruz@gmail.com
- **Flood Prevention**: 10-minute confirmation + 6-hour re-alert

## Step 1: Create UptimeRobot Account

1. Go to https://uptimerobot.com
2. Click **Sign Up**
3. Use email: lmvcruz@gmail.com
4. Verify email
5. Log in to dashboard

## Step 2: Add Alert Contact

1. Go to **My Settings** → **Alert Contacts**
2. Click **Add Alert Contact**
3. Select **E-mail**
4. Enter: lmvcruz@gmail.com
5. **Friendly Name**: Luis Cruz
6. Click **Create Alert Contact**
7. Verify email (check inbox for verification link)

## Step 3: Create Monitors

### Monitor 1: API Health Endpoint

1. Click **+ Add New Monitor**
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: `TerrainSim API Health`
4. **URL (or IP)**: `https://api.lmvcruz.work/health`
5. **Monitoring Interval**: 5 Minutes
6. **Monitor Timeout**: 30 seconds

**Advanced Settings** (click to expand):
- **Keyword**: Leave empty (just check 200 OK)
- **HTTP Method**: GET
- **HTTP Auth**: None
- **POST Value**: Leave empty

**Alert Contacts**:
- ✅ Select: Luis Cruz (lmvcruz@gmail.com)
- **Send alerts if down for**: 2 times (10 minutes total)
- **Re-alert if still down**: Every 360 minutes (6 hours)
- **Alert when back up**: Yes

7. Click **Create Monitor**

### Monitor 2: Generate Endpoint

1. Click **+ Add New Monitor**
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: `TerrainSim API Generate`
4. **URL (or IP)**: `https://api.lmvcruz.work/generate`
5. **Monitoring Interval**: 5 Minutes
6. **Monitor Timeout**: 30 seconds

**Advanced Settings**:
- **HTTP Method**: POST
- **POST Type**: JSON
- **POST Value**:
```json
{
  "method": "fbm",
  "width": 32,
  "height": 32,
  "seed": 42,
  "frequency": 0.05,
  "amplitude": 10,
  "octaves": 3,
  "persistence": 0.5,
  "lacunarity": 2.0
}
```
- **HTTP Headers**: `Content-Type: application/json`

**Alert Contacts**:
- ✅ Select: Luis Cruz
- **Send alerts if down for**: 2 times
- **Re-alert if still down**: Every 360 minutes
- **Alert when back up**: Yes

7. Click **Create Monitor**

### Monitor 3: WebSocket Port

1. Click **+ Add New Monitor**
2. **Monitor Type**: Port
3. **Friendly Name**: `TerrainSim WebSocket`
4. **URL (or IP)**: `api.lmvcruz.work`
5. **Port**: 443
6. **Monitoring Interval**: 5 Minutes

**Alert Contacts**:
- ✅ Select: Luis Cruz
- **Send alerts if down for**: 2 times
- **Re-alert if still down**: Every 360 minutes
- **Alert when back up**: Yes

7. Click **Create Monitor**

### Monitor 4: Frontend Website

1. Click **+ Add New Monitor**
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: `TerrainSim Frontend`
4. **URL (or IP)**: `https://terrainsim.lmvcruz.work`
5. **Monitoring Interval**: 5 Minutes
6. **Monitor Timeout**: 30 seconds

**Advanced Settings**:
- **Keyword**: `Hello Terrain` (checks if app loaded correctly)
- **Keyword Type**: Exists

**Alert Contacts**:
- ✅ Select: Luis Cruz
- **Send alerts if down for**: 2 times
- **Re-alert if still down**: Every 360 minutes
- **Alert when back up**: Yes

7. Click **Create Monitor**

## Step 4: Enable Response Time Monitoring

For each monitor:

1. Click on the monitor name
2. Go to **Settings** tab
3. Scroll to **Advanced Settings**
4. Enable **Response Time Monitoring**
5. Set **Alert on Response Time Greater Than**: 3000 ms
6. Save changes

## Step 5: Configure Public Status Page (Optional)

1. Go to **Public Status Pages**
2. Click **Add New Public Status Page**
3. **Friendly Name**: TerrainSim Status
4. **Select Monitors**: Choose all 4 monitors
5. **Custom Domain**: Leave empty (or configure custom domain if desired)
6. **Show Response Times**: Yes
7. **Show Uptime**: Yes (Last 90 days)
8. Click **Create Public Status Page**
9. Copy the public URL (e.g., `https://stats.uptimerobot.com/xyz`)

## Step 6: Verify Setup

### Check Dashboard

1. Go to **Dashboard**
2. Verify all 4 monitors are listed
3. Status should show:
   - 🟢 Up (green) for healthy services
   - Response times visible
   - Last check timestamp

### Test Email Alerts

**Option 1: Pause a Monitor**
1. Click on a monitor
2. Click **Pause**
3. Wait 10 minutes (2 × 5-minute checks)
4. Check email for down alert
5. **Unpause** the monitor
6. Wait 5 minutes
7. Check email for recovery alert

**Option 2: Temporarily Block IP**
(Only if you have server access)
```bash
# Block UptimeRobot IP temporarily
sudo iptables -A INPUT -s <uptimerobot-ip> -j DROP

# Wait for alert email

# Unblock
sudo iptables -D INPUT -s <uptimerobot-ip> -j DROP
```

## Expected Email Alerts

### Down Alert

```
Subject: [DOWN] TerrainSim API Health

Your monitor "TerrainSim API Health" is DOWN.

Monitor URL: https://api.lmvcruz.work/health
Reason: Connection timeout
Last checked: 2026-01-14 16:00:00 UTC
Down since: 2026-01-14 15:50:00 UTC

This monitor has been down for 10 minutes (2 consecutive checks).

View Monitor: https://uptimerobot.com/dashboard#<monitor_id>
```

### Recovery Alert

```
Subject: [UP] TerrainSim API Health

Your monitor "TerrainSim API Health" is back UP.

Monitor URL: https://api.lmvcruz.work/health
Last checked: 2026-01-14 16:05:00 UTC
Was down for: 15 minutes
Uptime: 99.95%

View Monitor: https://uptimerobot.com/dashboard#<monitor_id>
```

### High Response Time Alert

```
Subject: [SLOW] TerrainSim API Health

Your monitor "TerrainSim API Health" has slow response time.

Monitor URL: https://api.lmvcruz.work/health
Response Time: 3500ms (threshold: 3000ms)
Last checked: 2026-01-14 16:10:00 UTC

View Monitor: https://uptimerobot.com/dashboard#<monitor_id>
```

## Flood Prevention Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| Check Interval | 5 minutes | Free tier max frequency |
| Down Confirmation | 2 checks (10 min) | Prevents false alarms |
| Re-alert Interval | 360 minutes (6 hours) | Prevents email flood |
| Alert on Recovery | Yes | Single email when restored |

**Maximum alert frequency**:
- Initial down: 1 email after 10 minutes
- Re-alerts: 1 email every 6 hours while down
- Recovery: 1 email when back up
- **Total worst case**: ~5 emails/day if service oscillates

## Monitoring Regions

UptimeRobot checks from multiple global locations:

- North America (US East, US West)
- Europe (London, Frankfurt)
- Asia Pacific (Singapore, Tokyo)

This provides comprehensive coverage and detects regional outages.

## Dashboard Features

### Available on Free Tier

- ✅ Monitor status (up/down)
- ✅ Response times (last check)
- ✅ Uptime percentage (last 90 days)
- ✅ Downtime incidents (last 90 days)
- ✅ Response time graphs
- ✅ Public status page
- ✅ Email/SMS/webhook alerts
- ✅ 50 monitors maximum
- ✅ 5-minute check interval

### Dashboard Views

1. **All Monitors**: Grid view of all services
2. **Logs**: Downtime incident history
3. **Stats**: Uptime/downtime statistics
4. **Response Times**: Graph of response times over time

## Maintenance

### Weekly

- Review dashboard for any downtime incidents
- Check response time trends

### Monthly

- Verify email alerts are working (test one monitor)
- Review uptime percentage (goal: >99.9%)
- Check for false positives

### Troubleshooting

**No emails received:**
1. Check spam folder
2. Verify alert contact email is verified
3. Check monitor alert settings

**False alerts:**
1. Increase down confirmation (2 → 3 checks)
2. Increase monitor timeout (30s → 60s)

**High response times:**
1. Check server resources (`pm2 monit`)
2. Review nginx logs
3. Analyze Cloudflare cache hit rate

## API Access (Optional)

UptimeRobot provides a REST API for programmatic access:

```bash
# Get all monitors
curl -X POST https://api.uptimerobot.com/v2/getMonitors \
  -H "Content-Type: application/json" \
  -d '{"api_key": "your-api-key"}'
```

API key available at: **My Settings** → **API Settings**

## Cost Breakdown

| Feature | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Monitors | 50 | Unlimited |
| Check Interval | 5 minutes | 1 minute |
| Retention | 90 days | 1 year |
| SMS Alerts | Limited | Unlimited |
| **Cost** | **$0/month** | $7/month |

Free tier is sufficient for this project.

## Completion Checklist

- [ ] UptimeRobot account created
- [ ] Email alert contact verified
- [ ] Monitor 1: API Health configured
- [ ] Monitor 2: API Generate configured
- [ ] Monitor 3: WebSocket configured
- [ ] Monitor 4: Frontend configured
- [ ] Response time alerts enabled (3000ms threshold)
- [ ] Down confirmation set (2 checks)
- [ ] Re-alert interval set (6 hours)
- [ ] Test email alerts received
- [ ] Public status page created (optional)

## Next Steps

After completing this setup:

1. Document public status page URL in README (if created)
2. Add UptimeRobot dashboard link to team documentation
3. Set calendar reminder to review dashboard weekly
4. Configure Cloudflare Analytics (DEPLOY-032)

## References

- [UptimeRobot Documentation](https://uptimerobot.com/api/)
- [Monitor Types Guide](https://blog.uptimerobot.com/understanding-uptimerobot-monitor-types/)
- [Alert Settings Best Practices](https://blog.uptimerobot.com/configuring-alert-contacts/)
