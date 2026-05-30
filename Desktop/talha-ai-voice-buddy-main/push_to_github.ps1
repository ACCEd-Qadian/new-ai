
$token = "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"
$repo = "acced1919/talha-ai-project"
$branch = "main"
$baseUrl = "https://api.github.com/repos/$repo/contents"
$basePath = "C:\Users\ACCED\Desktop\talha-ai-voice-buddy-main"

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$folders = @("src", "public", "supabase")

$files = @()
foreach ($folder in $folders) {
    $folderPath = Join-Path $basePath $folder
    if (Test-Path $folderPath) {
        $items = Get-ChildItem -Path $folderPath -Recurse -File
        foreach ($item in $items) {
            $files += $item.FullName
        }
    }
}

Write-Host "Total files to upload: $($files.Count)" -ForegroundColor Cyan

$successCount = 0
$failCount = 0

foreach ($filePath in $files) {
    # Get relative path for GitHub (convert backslashes to forward slashes)
    $relativePath = $filePath.Substring($basePath.Length + 1).Replace("\", "/")
    $apiUrl = "$baseUrl/$relativePath"

    # Read file as bytes and base64 encode
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
        $base64Content = [System.Convert]::ToBase64String($fileBytes)
    } catch {
        Write-Host "ERROR reading file: $relativePath - $_" -ForegroundColor Red
        $failCount++
        continue
    }

    # Check if file already exists (to get SHA for update)
    $sha = $null
    try {
        $existingFile = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get -ErrorAction SilentlyContinue
        $sha = $existingFile.sha
    } catch {
        # File doesn't exist, that's fine
    }

    # Prepare body
    $body = @{
        message = "Add $relativePath"
        content = $base64Content
        branch = $branch
    }
    if ($sha) {
        $body["sha"] = $sha
    }

    $bodyJson = $body | ConvertTo-Json -Depth 5

    # Upload file
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Put -Body $bodyJson -ContentType "application/json"
        Write-Host "OK: $relativePath" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "FAIL: $relativePath - $_" -ForegroundColor Red
        $failCount++
    }

    # Small delay to avoid rate limiting
    Start-Sleep -Milliseconds 200
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Upload Complete!" -ForegroundColor Cyan
Write-Host "Success: $successCount files" -ForegroundColor Green
Write-Host "Failed:  $failCount files" -ForegroundColor Red
Write-Host "===========================================" -ForegroundColor Cyan
