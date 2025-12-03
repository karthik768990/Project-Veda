<# ===================================================================
    ChandasCreator Backend Test Runner
    Usage:  Run from PowerShell inside backend folder:

        .\tests\test_backend.ps1
=================================================================== #>

$BaseUrl = "http://localhost:3000"

function Write-Section($title) {
    Write-Host ""
    Write-Host "============ $title ============" -ForegroundColor Cyan
}

function Test-Endpoint($name, $method, $url, $bodyJson=$null) {
    Write-Host "`n[TEST] $name" -ForegroundColor Yellow

    try {
        if ($bodyJson) {
            $resp = Invoke-RestMethod -Uri $url -Method $method -ContentType "application/json" -Body $bodyJson
        }
        else {
            $resp = Invoke-RestMethod -Uri $url -Method $method
        }

        Write-Host "   PASSED" -ForegroundColor Green
        return @{ passed=$true; response=$resp }
    }
    catch {
        Write-Host "   FAILED ❌" -ForegroundColor Red
        Write-Host "   ERROR:" $_.Exception.Message -ForegroundColor Red
        return @{ passed=$false; response=$null }
    }
}

Write-Section "1. HEALTH CHECK"

$res1 = Test-Endpoint `
    -name "GET /health" `
    -method "GET" `
    -url "$BaseUrl/health"

Start-Sleep -Milliseconds 200

Write-Section "2. RELOAD DB"

$res2 = Test-Endpoint `
    -name "GET /reload-db" `
    -method "GET" `
    -url "$BaseUrl/reload-db"

Start-Sleep -Milliseconds 200

Write-Section "3. FETCH ALL CHANDAS"

$res3 = Test-Endpoint `
    -name "GET /chandas" `
    -method "GET" `
    -url "$BaseUrl/chandas"

Start-Sleep -Milliseconds 200

Write-Section "4. ANALYZE SIMPLE SHLOKA"

$bodySimple = @{ shloka = "गुरुर्ब्रह्मा गुरुर्विष्णुः" } | ConvertTo-Json
$res4 = Test-Endpoint `
    -name "POST /chandas/analyze (simple)" `
    -method "POST" `
    -url "$BaseUrl/chandas/analyze" `
    -bodyJson $bodySimple

Start-Sleep -Milliseconds 200

Write-Section "5. ANALYZE MULTI-PADA SHLOKA"

$bodyMulti = @{ shloka = "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।`nमा कर्मफलहेतुर्भूर्मा ते संगोऽस्त्वकर्मणि ॥" } | ConvertTo-Json
$res5 = Test-Endpoint `
    -name "POST /chandas/analyze (multi-pada)" `
    -method "POST" `
    -url "$BaseUrl/chandas/analyze" `
    -bodyJson $bodyMulti

Start-Sleep -Milliseconds 200

Write-Section "6. GENERATE + VERIFY SHLOKA"

$genReq = @{
    chandas      = "Anuṣṭubh"
    context      = "praise of Sarasvati"
    language     = "devanagari"
    max_attempts = 3
} | ConvertTo-Json

$res6 = Test-Endpoint `
    -name "POST /generate-and-verify" `
    -method "POST" `
    -url "$BaseUrl/generate-and-verify" `
    -bodyJson $genReq

Write-Host ""
Write-Host "=============== SUMMARY ===============" -ForegroundColor Cyan

$results = @{
    Health   = $res1.passed
    ReloadDB = $res2.passed
    Chandas  = $res3.passed
    Analyze1 = $res4.passed
    Analyze2 = $res5.passed
    GenVerify = $res6.passed
}

$results.GetEnumerator() | ForEach-Object {
    $color = if ($_.Value) { "Green" } else { "Red" }
    Write-Host ("{0,-12} : {1}" -f $_.Key, $_.Value) -ForegroundColor $color
}

Write-Host "`nDone."
