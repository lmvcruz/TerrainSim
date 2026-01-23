#!/usr/bin/env pwsh
# Compare production vs local simulation results

Write-Host "`n🔍 TerrainSim Log Comparison Tool" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Gray

# Production logs
Write-Host "`n🌐 PRODUCTION (sessionId: 0aa9d6ef-cd7e-41bc-ae8c-723b75a04eaf)" -ForegroundColor Yellow
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $uri = "https://api.lmvcruz.work/logs?sessionId=0aa9d6ef-cd7e-41bc-ae8c-723b75a04eaf&limit=500"
    $prodLogs = Invoke-RestMethod -Uri $uri -UseBasicParsing -ErrorAction Stop

    Write-Host "✅ Retrieved $($prodLogs.Count) logs" -ForegroundColor Green
    Write-Host "`nFrame Results:" -ForegroundColor Cyan
    $prodLogs | Where-Object { $_.message -like "Frame * complete" } | Sort-Object timestamp | ForEach-Object {
        if ($_.message -match "Frame (\d+)") {
            $frame = $matches[1]
            $stats = $_.data.statistics
            Write-Host ("  Frame {0,2}: min={1,20}, max={2,20}" -f $frame, $stats.min, $stats.max)
        }
    }
}
catch {
    Write-Host "❌ Unable to fetch production logs: $($_.Exception.Message)" -ForegroundColor Red
}

# Local logs
Write-Host "`n💻 LOCAL (correlationId: 85536164-4a87-4b9e-bbf6-6a173b4d0768)" -ForegroundColor Yellow
try {
    $uri = "http://localhost:3001/logs?correlationId=85536164-4a87-4b9e-bbf6-6a173b4d0768&limit=500"
    $localLogs = Invoke-RestMethod -Uri $uri -ErrorAction Stop

    Write-Host "✅ Retrieved $($localLogs.Count) logs" -ForegroundColor Green
    Write-Host "`nFrame Results:" -ForegroundColor Cyan
    $localLogs | Where-Object { $_.message -like "Frame * complete" } | Sort-Object timestamp | ForEach-Object {
        if ($_.message -match "Frame (\d+)") {
            $frame = $matches[1]
            $stats = $_.data.statistics
            Write-Host ("  Frame {0,2}: min={1,20}, max={2,20}" -f $frame, $stats.min, $stats.max)
        }
    }
}
catch {
    Write-Host "❌ Unable to fetch local logs: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure backend is running on localhost:3001" -ForegroundColor Gray
}

Write-Host "`n" + ("=" * 70) -ForegroundColor Gray
