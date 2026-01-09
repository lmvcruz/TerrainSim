# Run CI steps locally on Windows
# This script mimics the GitHub Actions CI workflow

Write-Host "`n=== TerrainSim CI - Local Execution ===" -ForegroundColor Cyan
Write-Host "Running the same steps as GitHub Actions CI...`n" -ForegroundColor Gray

# Frontend Tests
Write-Host "`n[1/4] Running Frontend Tests" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
pnpm --filter @terrain/web run test
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Frontend tests failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend tests passed!" -ForegroundColor Green

# Configure CMake
Write-Host "`n[2/4] Configuring CMake" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
cmake -S libs/core -B libs/core/build -DCMAKE_BUILD_TYPE=Release
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ CMake configuration failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ CMake configured successfully!" -ForegroundColor Green

# Build C++ Core
Write-Host "`n[3/4] Building C++ Core Library" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
cmake --build libs/core/build --config Release
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ C++ build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ C++ build successful!" -ForegroundColor Green

# Run C++ Tests
Write-Host "`n[4/4] Running C++ Tests" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Push-Location libs/core/build
ctest --output-on-failure -C Release
$testResult = $LASTEXITCODE
Pop-Location

if ($testResult -ne 0) {
    Write-Host "`n❌ C++ tests failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ C++ tests passed!" -ForegroundColor Green

# Success
Write-Host "`n=== ✨ All CI checks passed! ===" -ForegroundColor Green
Write-Host "Your code is ready to push.`n" -ForegroundColor Gray
