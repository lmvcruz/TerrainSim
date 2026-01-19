# Commit and push script
Set-Location "d:\playground\TerrainSim"

# Add changes
git add .husky/pre-push

# Commit
git commit -m "fix(husky): update pre-push hook to only run frontend tests"

# Push
git push origin main

# Output results
Write-Output "=== Commit and push completed ==="
git log --oneline -3
