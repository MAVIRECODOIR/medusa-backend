param (
    [string]$EnvFile = ".env"
)

$newVars = @(
    "",
    "# --- Redis (Production Infrastructure) ---",
    "REDIS_URL=redis://localhost:6379",
    "",
    "# --- Stripe (Payment) ---",
    "STRIPE_API_KEY=sk_live_...",
    "",
    "# --- Cloudflare R2 (File Storage, S3-compatible) ---",
    "S3_FILE_URL=https://pub-xxxx.r2.dev",
    "S3_ACCESS_KEY_ID=your_r2_access_key_id",
    "S3_SECRET_ACCESS_KEY=your_r2_secret_access_key",
    "S3_REGION=auto",
    "S3_BUCKET=your-bucket-name",
    "S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com",
    "",
    "# --- SendGrid (Email Notifications) ---",
    "SENDGRID_API_KEY=SG.xxx",
    "SENDGRID_FROM=noreply@mavire.com",
    "",
    "# --- PostHog (Analytics) ---",
    "POSTHOG_API_KEY=phc_xxx",
    "POSTHOG_PROJECT_API_KEY=phx_xxx",
    "",
    "# --- Google OAuth (Authentication) ---",
    "GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET=GOCSPX-xxx",
    "GOOGLE_CALLBACK_URL=http://localhost:9000/auth/google/callback"
)

$existingKeys = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^([A-Za-z_][A-Za-z0-9_]*)=') {
        $existingKeys[$matches[1]] = $true
    }
}

$linesToAdd = @()
foreach ($line in $newVars) {
    if ($line -match '^#') {
        $linesToAdd += $line
    }
    elseif ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=') {
        $key = $matches[1]
        if (-not $existingKeys.ContainsKey($key)) {
            $linesToAdd += $line
        }
    }
    elseif ($line -eq '') {
        $linesToAdd += $line
    }
}

if ($linesToAdd.Count -gt 0) {
    Add-Content $EnvFile $linesToAdd
    Write-Output "Added $($linesToAdd.Count) lines to $EnvFile"
} else {
    Write-Output "No new variables needed"
}
