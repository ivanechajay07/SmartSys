# Respaldo lógico diario de SmartSys para Windows (Docker Desktop).
param(
    [string]$Container = "smartsys-mysql",
    [string]$Database = "smartsys",
    [string]$OutDir = ".\backups",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$remote = "/tmp/smartsys-$stamp.sql.gz"
$local = Join-Path $OutDir "smartsys-$stamp.sql.gz"

docker exec $Container sh -c "mysqldump -uroot -p`"`$MYSQL_ROOT_PASSWORD`" --single-transaction --routines --triggers $Database | gzip > $remote"
docker cp "${Container}:${remote}" $local
docker exec $Container rm -f $remote

if (-not (Test-Path $local) -or (Get-Item $local).Length -eq 0) {
    throw "El respaldo quedó vacío: $local"
}

Write-Host "Respaldo creado: $local ($([math]::Round((Get-Item $local).Length / 1KB)) KB)"
Get-ChildItem $OutDir -Filter "smartsys-*.sql.gz" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
    Remove-Item -Force
