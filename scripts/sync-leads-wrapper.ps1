# MySQL Lead Sync Wrapper Script for Windows
# This script handles logging and error reporting for scheduled syncs

$ErrorActionPreference = "Continue"

# Set paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $ProjectRoot "logs"
$LogFile = Join-Path $LogDir "sync-leads.log"
$ErrorLogFile = Join-Path $LogDir "sync-leads-error.log"
$LockFile = Join-Path $LogDir "sync-leads.lock"

# Ensure logs directory exists
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Function to log with timestamp
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    
    # Write to log file
    Add-Content -Path $LogFile -Value $LogMessage
    
    # Also write to console if running interactively
    if ($Host.Name -eq "ConsoleHost") {
        Write-Host $LogMessage
    }
}

# Function to log errors
function Write-ErrorLog {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $ErrorMessage = "[$Timestamp] ERROR: $Message"
    
    Add-Content -Path $ErrorLogFile -Value $ErrorMessage
    Write-Log $Message "ERROR"
}

# Check for lock file (prevent overlapping syncs)
if (Test-Path $LockFile) {
    $LockContent = Get-Content $LockFile -ErrorAction SilentlyContinue
    $LockPID = $LockContent -as [int]
    
    if ($LockPID) {
        $Process = Get-Process -Id $LockPID -ErrorAction SilentlyContinue
        if ($Process -and $Process.ProcessName -eq "node" -or $Process.ProcessName -eq "tsx") {
            Write-Log "Sync already running (PID: $LockPID), skipping this run" "WARN"
            exit 0
        } else {
            # Stale lock file, remove it
            Remove-Item $LockFile -Force
            Write-Log "Removed stale lock file"
        }
    }
}

# Create lock file
$CurrentPID = $PID
Set-Content -Path $LockFile -Value $CurrentPID

# Ensure lock file is removed on exit
try {
    Write-Log "Starting scheduled lead sync (PID: $CurrentPID)"
    
    # Change to project directory
    Set-Location $ProjectRoot
    
    # Load environment variables from .env file if it exists
    $EnvFile = Join-Path $ProjectRoot ".env"
    if (Test-Path $EnvFile) {
        Get-Content $EnvFile | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
                $Key = $matches[1].Trim()
                $Value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($Key, $Value, "Process")
            }
        }
        Write-Log "Loaded environment variables from .env"
    }
    
    # Run the sync command
    $SyncCommand = "npm run sync:leads"
    Write-Log "Executing: $SyncCommand"
    
    # Capture output
    $Output = & npm run sync:leads 2>&1
    $ExitCode = $LASTEXITCODE
    
    # Log all output
    foreach ($Line in $Output) {
        if ($Line) {
            Write-Log $Line
        }
    }
    
    if ($ExitCode -eq 0) {
        Write-Log "Lead sync completed successfully"
    } else {
        Write-ErrorLog "Lead sync failed with exit code: $ExitCode"
        Write-ErrorLog "Check the log file for details: $LogFile"
        exit $ExitCode
    }
    
} catch {
    Write-ErrorLog "Exception occurred: $($_.Exception.Message)"
    Write-ErrorLog "StackTrace: $($_.ScriptStackTrace)"
    exit 1
} finally {
    # Remove lock file
    if (Test-Path $LockFile) {
        Remove-Item $LockFile -Force
        Write-Log "Removed lock file"
    }
}

exit 0
