# SV Browser - DPAPI MasterKey Helper for Cross-Machine Profile Portability
# Handles DPAPI decryption on Export and DPAPI re-encryption on Import
param(
    [string]$Action,      # 'export', 'import', 'batch-export', 'batch-import'
    [string]$TargetDir,   # Single profile directory OR parent directory containing multiple profiles
    [string]$RawKeyB64    # Base64 raw 32-byte master key (for single import)
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Security

function Decrypt-LocalStateKey([string]$dir) {
    $lsPath = Join-Path $dir "Local State"
    if (-not (Test-Path $lsPath)) { return $null }
    try {
        $json = Get-Content $lsPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if (-not $json.os_crypt -or -not $json.os_crypt.encrypted_key) { return $null }
        $encKey = [Convert]::FromBase64String($json.os_crypt.encrypted_key)
        if ($encKey.Length -le 5) { return $null }
        $dpapi = $encKey[5..($encKey.Length - 1)]
        $masterKey = [System.Security.Cryptography.ProtectedData]::Unprotect($dpapi, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
        return [Convert]::ToBase64String($masterKey)
    } catch {
        return $null
    }
}

function Encrypt-ToLocalState([string]$dir, [string]$keyB64) {
    if (-not (Test-Path $dir) -or -not $keyB64) { return $false }
    try {
        $rawBytes = [Convert]::FromBase64String($keyB64)
        $reProtected = [System.Security.Cryptography.ProtectedData]::Protect($rawBytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
        $dpapiPrefix = [System.Text.Encoding]::ASCII.GetBytes("DPAPI")
        $newEncKeyBytes = New-Object byte[] ($dpapiPrefix.Length + $reProtected.Length)
        [Array]::Copy($dpapiPrefix, 0, $newEncKeyBytes, 0, $dpapiPrefix.Length)
        [Array]::Copy($reProtected, 0, $newEncKeyBytes, $dpapiPrefix.Length, $reProtected.Length)
        $newEncKeyB64 = [Convert]::ToBase64String($newEncKeyBytes)

        $lsPath = Join-Path $dir "Local State"
        $json = $null
        if (Test-Path $lsPath) {
            try {
                $json = Get-Content $lsPath -Raw -Encoding UTF8 | ConvertFrom-Json
            } catch {}
        }
        if (-not $json) {
            $json = [PSCustomObject]@{
                os_crypt = [PSCustomObject]@{
                    audit_enabled = $true
                    encrypted_key = $newEncKeyB64
                }
            }
        } else {
            if (-not $json.os_crypt) {
                $json | Add-Member -MemberType NoteProperty -Name "os_crypt" -Value ([PSCustomObject]@{
                    audit_enabled = $true
                    encrypted_key = $newEncKeyB64
                })
            } else {
                $json.os_crypt.encrypted_key = $newEncKeyB64
            }
        }

        $newJsonStr = $json | ConvertTo-Json -Depth 20 -Compress
        [System.IO.File]::WriteAllText($lsPath, $newJsonStr, [System.Text.Encoding]::UTF8)
        return $true
    } catch {
        return $false
    }
}

if ($Action -eq "export") {
    $key = Decrypt-LocalStateKey $TargetDir
    if ($key) {
        Write-Output "MASTER_KEY:$key"
    } else {
        Write-Output "MASTER_KEY_NONE"
    }
} elseif ($Action -eq "import") {
    $ok = Encrypt-ToLocalState $TargetDir $RawKeyB64
    if ($ok) {
        Write-Output "IMPORT_SUCCESS"
    } else {
        Write-Output "IMPORT_FAILED"
    }
} elseif ($Action -eq "batch-export") {
    if (Test-Path $TargetDir) {
        if (Test-Path (Join-Path $TargetDir "Local State")) {
            $key = Decrypt-LocalStateKey $TargetDir
            if ($key) {
                [System.IO.File]::WriteAllText((Join-Path $TargetDir "master_key.txt"), $key, [System.Text.Encoding]::UTF8)
            }
        }
        Get-ChildItem -Path $TargetDir -Directory | ForEach-Object {
            $pDir = $_.FullName
            if (Test-Path (Join-Path $pDir "Local State")) {
                $key = Decrypt-LocalStateKey $pDir
                if ($key) {
                    [System.IO.File]::WriteAllText((Join-Path $pDir "master_key.txt"), $key, [System.Text.Encoding]::UTF8)
                }
            }
        }
    }
    Write-Output "BATCH_EXPORT_DONE"
} elseif ($Action -eq "batch-import") {
    if (Test-Path $TargetDir) {
        if (Test-Path (Join-Path $TargetDir "master_key.txt")) {
            $key = [System.IO.File]::ReadAllText((Join-Path $TargetDir "master_key.txt"), [System.Text.Encoding]::UTF8).Trim()
            if ($key) {
                Encrypt-ToLocalState $TargetDir $key | Out-Null
            }
        }
        Get-ChildItem -Path $TargetDir -Directory | ForEach-Object {
            $pDir = $_.FullName
            $mkFile = Join-Path $pDir "master_key.txt"
            if (Test-Path $mkFile) {
                $key = [System.IO.File]::ReadAllText($mkFile, [System.Text.Encoding]::UTF8).Trim()
                if ($key) {
                    Encrypt-ToLocalState $pDir $key | Out-Null
                }
            }
        }
    }
    Write-Output "BATCH_IMPORT_DONE"
}
