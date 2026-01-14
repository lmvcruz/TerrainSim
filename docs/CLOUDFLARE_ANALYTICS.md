# Cloudflare Analytics Setup Guide

Cloudflare Analytics is automatically enabled for all sites proxied through Cloudflare. This guide explains how to access and interpret the analytics data for TerrainSim.

## Overview

- **Service**: Cloudflare Analytics (Free tier)
- **Domain**: terrainsim.lmvcruz.work
- **Data Retention**: 90 days (free tier)
- **Update Frequency**: Real-time (with slight delay)

## Accessing Analytics

1. Go to https://dash.cloudflare.com
2. Log in with your Cloudflare account
3. Select the zone: **lmvcruz.work**
4. Click on **Analytics & Logs** in the left sidebar

## Analytics Dashboard

### Traffic Tab

**Key Metrics:**

| Metric | Description | Good Value |
|--------|-------------|------------|
| **Requests** | Total HTTP requests | Trending up |
| **Bandwidth** | Data transfer | - |
| **Unique Visitors** | Distinct IPs | - |
| **Page Views** | Total page loads | - |

**Charts Available:**
- Requests over time
- Bandwidth over time
- Requests by country
- Top requests (URLs)
- Status codes (2xx, 3xx, 4xx, 5xx)

### Performance Tab

**Key Metrics:**

| Metric | Description | Target |
|--------|-------------|--------|
| **Cache Hit Rate** | % requests served from cache | >80% |
| **Saved Bandwidth** | Data saved by caching | - |
| **Origin Response Time** | Time for server to respond | <500ms |

**Insights:**
- Slow URLs (response time > 1s)
- Uncached content breakdown
- Cache effectiveness score

### Security Tab

**Key Metrics:**

| Metric | Description | Action |
|--------|-------------|--------|
| **Threats Blocked** | Malicious requests stopped | Monitor |
| **Challenge Rate** | % requests challenged | <5% |
| **Bot Traffic** | Automated traffic detected | Review |

**Security Features:**
- Threat distribution (SQL injection, XSS, etc.)
- Top threat countries
- Firewall event log

### DNS Tab

**Key Metrics:**
- DNS queries by record type
- DNS queries by data center
- DNSSEC status

## Key Performance Indicators

### Frontend (terrainsim.lmvcruz.work)

**Traffic Metrics:**
- Daily requests: 100-1,000
- Unique visitors: 10-100/day
- Average session: 5-10 minutes

**Performance Metrics:**
- Cache hit rate: >85% (static assets cached)
- Origin response time: <200ms
- Total page load: <2s

**Content Distribution:**
- `/` - Homepage
- `/assets/*` - JS/CSS bundles (should be cached)
- `/*.{png,jpg,woff2}` - Static assets (should be cached)

### Backend (api.lmvcruz.work)

**Traffic Metrics:**
- Daily requests: 500-5,000
- `/health` - High volume (UptimeRobot checks)
- `/generate` - Medium volume (terrain generation)
- WebSocket connections: Real-time simulation traffic

**Performance Metrics:**
- Cache hit rate: ~20% (dynamic content, not cacheable)
- Origin response time: 50-500ms depending on request
- Error rate: <1%

## Analyzing Performance

### Cache Optimization

1. Go to **Caching** → **Configuration**
2. Verify **Caching Level**: Standard
3. Check **Browser Cache TTL**: 4 hours (recommended)

**What should be cached:**
- ✅ Static JS/CSS bundles (`/assets/*.js`, `/assets/*.css`)
- ✅ Images (`*.png`, `*.jpg`, `*.svg`)
- ✅ Fonts (`*.woff2`, `*.ttf`)
- ✅ Favicon

**What should NOT be cached:**
- ❌ API endpoints (`/health`, `/generate`, `/simulate`)
- ❌ WebSocket connections
- ❌ Dynamic JSON responses

### Response Time Analysis

**Expected response times:**

| Endpoint | Cached | Uncached | Alert If |
|----------|--------|----------|----------|
| `/` (HTML) | <100ms | <500ms | >2s |
| `/assets/*.js` | <50ms | <200ms | >1s |
| `/health` | N/A | <50ms | >500ms |
| `/generate` | N/A | 100-500ms | >2s |

**Troubleshooting slow responses:**
1. Check **Performance** tab for slow URLs
2. Review origin server logs (`pm2 logs`)
3. Check server resources (`pm2 monit`)
4. Verify CDN cache hit rate

### Traffic Patterns

**Normal patterns:**
- Steady /health checks every 5 minutes (UptimeRobot)
- User traffic peaks during daytime (UTC-based audience)
- Weekend traffic lower than weekdays

**Abnormal patterns (investigate):**
- Sudden spike in 4xx/5xx errors
- Sharp drop in cache hit rate
- High bot traffic from single country
- Unusually high bandwidth usage

## Security Monitoring

### Threat Detection

Cloudflare automatically blocks:
- SQL injection attempts
- XSS (Cross-Site Scripting) attacks
- DDoS attempts
- Known malicious IPs

**Review Security Events:**
1. Go to **Security** → **Events**
2. Filter by:
   - Action: Block, Challenge, Allow
   - Service: Firewall, Bot Fight Mode
   - Country

### Bot Management

**Verified Bots (Allow):**
- Googlebot
- Bingbot
- UptimeRobot monitors

**Bad Bots (Block):**
- Scrapers
- Spam bots
- Vulnerability scanners

## Geographic Distribution

**Expected traffic distribution:**
- 60-70% North America
- 20-30% Europe
- 5-10% Asia Pacific
- 5% Rest of world

**Insights:**
- Helps optimize CDN distribution
- Identifies potential regional issues
- Guides feature localization decisions

## Rate Limiting (If Needed)

Cloudflare Free tier includes basic rate limiting:

**Recommended rules:**
- `/generate`: Max 60 requests/minute per IP
- `/simulate`: Max 10 concurrent WebSocket connections per IP

**Setup:**
1. Go to **Security** → **WAF** → **Rate limiting rules**
2. Create rule:
   - **Name**: Generate endpoint rate limit
   - **If incoming requests match**: `http.request.uri.path eq "/generate"`
   - **Then**: Block for 60 seconds
   - **For**: 60 requests per 1 minute per IP

## Custom Analytics (Optional)

### Web Analytics (Privacy-focused)

Cloudflare offers **Web Analytics** as an alternative to Google Analytics:

1. Go to **Analytics & Logs** → **Web Analytics**
2. Click **Add a site**
3. Follow setup instructions
4. Add JS snippet to frontend

**Benefits:**
- Privacy-focused (no cookies)
- GDPR compliant
- Core Web Vitals tracking
- No impact on performance

## Alerts and Notifications

### Configurable Alerts

1. Go to **Notifications**
2. Available alerts:
   - Traffic surge (>3x normal)
   - Origin error rate spike (>5%)
   - DDoS attack detected
   - SSL/TLS certificate expiring

3. Add notification:
   - Select alert type
   - Set threshold
   - Add email: lmvcruz@gmail.com

**Recommended alerts:**
- ✅ Origin error rate spike (>5%)
- ✅ SSL certificate expiring (<30 days)
- ✅ DDoS attack (auto-mitigated)

## Reporting

### Custom Reports

**Weekly Report:**
- Total requests
- Bandwidth saved by caching
- Top pages
- Error rate
- Security events blocked

**Monthly Report:**
- Uptime percentage
- Average response time
- Cache hit rate trend
- Traffic growth
- Geographic distribution changes

### Export Data

**Export options:**
1. CSV export (from Analytics dashboard)
2. Logpush (requires Enterprise plan)
3. GraphQL Analytics API (requires API token)

## Comparison with Other Tools

| Metric | Cloudflare | UptimeRobot | PM2 Logs |
|--------|-----------|-------------|----------|
| Traffic volume | ✅ | ❌ | ❌ |
| Response time | ✅ | ✅ | ❌ |
| Uptime | ✅ | ✅ | ✅ |
| Cache performance | ✅ | ❌ | ❌ |
| Security threats | ✅ | ❌ | ❌ |
| Application errors | ❌ | ❌ | ✅ |
| WebSocket metrics | ⚠️ Partial | ✅ Port check | ✅ Full |

**Complementary tools:**
- **Cloudflare**: Traffic, caching, security (frontend focus)
- **UptimeRobot**: Uptime, availability (external monitoring)
- **PM2**: Application logs, process health (backend focus)

## Best Practices

### Daily

- Quick glance at dashboard for anomalies
- Check error rate (<1% target)

### Weekly

- Review traffic trends
- Check cache hit rate (>80% target)
- Review security events

### Monthly

- Analyze performance trends
- Optimize caching rules
- Review geographic distribution
- Check bandwidth usage

## Troubleshooting

### Low Cache Hit Rate (<60%)

**Causes:**
- Cache-Control headers too short
- Dynamic content not cached
- Frequent cache purges

**Fixes:**
1. Check **Caching** → **Configuration**
2. Create **Page Rules** for static assets
3. Set longer Browser Cache TTL

### High Error Rate (>5%)

**Causes:**
- Origin server issues
- DNS misconfiguration
- SSL/TLS problems

**Fixes:**
1. Check PM2 logs for application errors
2. Verify nginx configuration
3. Test SSL certificate validity

### Unusual Traffic Spike

**Causes:**
- Bot attack
- Legitimate viral traffic
- DDoS attempt

**Actions:**
1. Check **Security** tab for threats
2. Review **Firewall Events**
3. Enable **Under Attack Mode** if needed
4. Contact Cloudflare support if persistent

## No Setup Required

Cloudflare Analytics is automatically enabled for:
- ✅ terrainsim.lmvcruz.work (proxied)
- ✅ api.lmvcruz.work (proxied)

**Immediate access:**
Just log in to Cloudflare dashboard and navigate to Analytics.

## References

- [Cloudflare Analytics Docs](https://developers.cloudflare.com/analytics/)
- [Cache Performance](https://developers.cloudflare.com/cache/)
- [Security Analytics](https://developers.cloudflare.com/waf/analytics/)
- [GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/)
