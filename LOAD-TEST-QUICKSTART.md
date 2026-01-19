# Quick Start: Running Your First Load Test

This guide will help you run your first load test in under 5 minutes.

## Prerequisites

You need k6 installed on your system.

### Install k6

**Windows (PowerShell as Administrator):**
```powershell
choco install k6
```

**macOS:**
```bash
brew install k6
```

**Linux (Ubuntu/Debian):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Option 1: Run via GitHub Actions (Easiest)

1. **Navigate to your repository on GitHub**
2. Click the **Actions** tab
3. Select **Load Testing** from the left sidebar
4. Click **Run workflow** (green button on the right)
5. Configure the test:
   - **Scenario:** Select `ci-scenario` (recommended for first run)
   - **API URL:** Leave default or enter your API URL
   - **Duration multiplier:** Leave as `1.0`
6. Click **Run workflow** (green button in modal)
7. Wait ~3 minutes for completion
8. View results in the workflow summary

**That's it!** Your first load test is complete. Check the summary for:
- ✅ P95 Latency
- ✅ Error Rate
- ✅ RPS (Requests Per Second)
- ✅ Threshold Status

---

## Option 2: Run Locally

### Step 1: Open Terminal/PowerShell

Navigate to the project directory:
```bash
cd d:\playground\TerrainSim
```

### Step 2: Run the CI Scenario

**Against Production API:**
```bash
k6 run tests/load/ci-scenario.js
```

**Against Local Development Server:**
```bash
# Make sure your API is running on localhost:3001
k6 run tests/load/ci-scenario.js -e API_URL=http://localhost:3001
```

### Step 3: Watch the Output

You'll see real-time metrics like:
```
running (0m30s), 3/3 VUs, 10 complete and 0 interrupted iterations
```

### Step 4: Review Results

After ~3 minutes, you'll see a summary:

```
✓ checks.........................: 98.50%
✗ errors........................: 1.50%
  http_req_duration..............: avg=245ms med=198ms p(95)=856ms
    ✓ health....................: p(95)=124ms
    ✓ generate..................: p(95)=1456ms
  http_req_failed...............: 1.20%
  http_reqs......................: 2847 (23.45/s)
  vus............................: 5 (max=5)
```

### Understanding the Results

**✅ Good Signs:**
- Checks > 95%
- P95 latency < 1000ms
- Error rate < 5%
- Consistent RPS

**⚠️ Warning Signs:**
- Checks 90-95%
- P95 latency 1000-2000ms
- Error rate 5-10%

**❌ Problems:**
- Checks < 90%
- P95 latency > 2000ms
- Error rate > 10%

---

## Next Steps

### After Your First Test

1. **Establish a Baseline:**
   - Run the CI scenario via GitHub Actions
   - This creates `.github/performance-baseline.json`
   - Future runs will compare against this baseline

2. **Explore Other Scenarios:**
   ```bash
   # Stress test (10 minutes, up to 50 users)
   k6 run tests/load/stress-test.js

   # Spike test (5 minutes, sudden traffic spikes)
   k6 run tests/load/spike-test.js
   ```

3. **Review Documentation:**
   - [Performance Thresholds](docs/performance-thresholds.md) - Detailed threshold definitions
   - [Load Test README](tests/load/README.md) - Comprehensive guide
   - [TEST-304 Summary](TEST-304-SUMMARY.md) - Complete implementation details

---

## Troubleshooting

### "k6: command not found"
**Solution:** Install k6 using the commands above. Restart your terminal after installation.

### "Connection refused" errors
**Solution:**
- Check if the API is running
- Verify the API URL is correct
- Try against production: `k6 run tests/load/ci-scenario.js -e API_URL=https://api.lmvcruz.work`

### High error rates
**Solution:**
- Check API logs for errors
- Verify API has sufficient resources (CPU, memory)
- Try with fewer users (edit the script's `stages` configuration)

### Tests running too long
**Solution:**
- Use CI scenario (3 minutes) instead of stress test (10 minutes)
- Press `Ctrl+C` to stop the test early
- Results up to that point will still be displayed

---

## Quick Reference

### Run Commands
```bash
# CI scenario (recommended first test)
k6 run tests/load/ci-scenario.js

# Local API
k6 run tests/load/ci-scenario.js -e API_URL=http://localhost:3001

# Export results
k6 run tests/load/ci-scenario.js --out json=results.json

# Stress test
k6 run tests/load/stress-test.js

# Spike test
k6 run tests/load/spike-test.js
```

### Key Metrics to Watch
- **P95 Latency:** Should be < 1000ms
- **Error Rate:** Should be < 5%
- **RPS:** Higher is better (target: 10+)
- **Checks:** Should be > 95%

---

## Getting Help

- 📖 [Full Documentation](tests/load/README.md)
- 📊 [Performance Thresholds](docs/performance-thresholds.md)
- 🔧 [k6 Documentation](https://k6.io/docs/)
- 💬 Open a GitHub issue with your test results

---

**Congratulations!** 🎉 You've completed your first load test. The system is now set up to automatically track performance and detect regressions.
