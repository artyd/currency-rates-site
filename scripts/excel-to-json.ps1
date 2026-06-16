param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [string]$OutputPath = "data/rates.json",

  [string]$UpdatedAt = (Get-Date -Format "yyyy-MM-dd HH:mm")
)

$resolvedInput = Resolve-Path -LiteralPath $InputPath
$resolvedOutput = Join-Path (Get-Location) $OutputPath
$outputDirectory = Split-Path -Parent $resolvedOutput

if (-not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
}

$excel = $null
$workbook = $null

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open($resolvedInput.Path)
  $sheet = $workbook.Worksheets.Item(1)
  $range = $sheet.UsedRange

  $headers = @{}
  for ($col = 1; $col -le $range.Columns.Count; $col++) {
    $header = [string]$range.Cells.Item(1, $col).Text
    if ($header) {
      $headers[$header.Trim().ToLowerInvariant()] = $col
    }
  }

  $requiredHeaders = @("code", "name", "country", "buy", "sell", "nbu")
  foreach ($header in $requiredHeaders) {
    if (-not $headers.ContainsKey($header)) {
      throw "Missing required column '$header'. Expected: code, name, country, buy, sell, nbu."
    }
  }

  $rates = @()
  for ($row = 2; $row -le $range.Rows.Count; $row++) {
    $code = [string]$range.Cells.Item($row, $headers["code"]).Text
    if ([string]::IsNullOrWhiteSpace($code)) {
      continue
    }

    $rates += [ordered]@{
      code = $code.Trim().ToUpperInvariant()
      name = ([string]$range.Cells.Item($row, $headers["name"]).Text).Trim()
      country = ([string]$range.Cells.Item($row, $headers["country"]).Text).Trim()
      buy = [double]$range.Cells.Item($row, $headers["buy"]).Value2
      sell = [double]$range.Cells.Item($row, $headers["sell"]).Value2
      nbu = [double]$range.Cells.Item($row, $headers["nbu"]).Value2
    }
  }

  $payload = [ordered]@{
    updatedAt = $UpdatedAt
    base = "UAH"
    rates = $rates
  }

  $payload | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $resolvedOutput -Encoding UTF8
  Write-Host "Wrote $($rates.Count) rates to $resolvedOutput"
}
finally {
  if ($workbook) {
    $workbook.Close($false) | Out-Null
  }

  if ($excel) {
    $excel.Quit() | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
  }
}
