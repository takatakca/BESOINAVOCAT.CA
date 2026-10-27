param([Parameter(Mandatory = $true)][string]$Destination)
$ErrorActionPreference = 'Stop'
$pluginBuildRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$pluginBuildDestination = [IO.Path]::GetFullPath($Destination)
if ([IO.File]::Exists($pluginBuildDestination)) { throw 'Le fichier de destination existe déjà. Aucun écrasement.' }
if (-not [IO.Directory]::Exists([IO.Path]::GetDirectoryName($pluginBuildDestination))) { throw 'Le dossier de destination doit déjà exister.' }
$pluginBuildFiles = @('besoinavocat-experience.php', 'render-integrity.php', 'render-rules.php', 'funnel.php', 'assets/funnel.css', 'assets/funnel.js', 'assets/experience.css', 'assets/experience.js', 'assets/common.css', 'assets/common.js', 'README.md')
foreach ($pluginBuildRelative in $pluginBuildFiles) {
    $pluginBuildSource = [IO.Path]::GetFullPath((Join-Path $pluginBuildRoot $pluginBuildRelative))
    if (-not $pluginBuildSource.StartsWith($pluginBuildRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Source hors du plugin.' }
    if (-not [IO.File]::Exists($pluginBuildSource)) { throw "Fichier manquant : $pluginBuildRelative" }
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$pluginBuildStream = [IO.File]::Open($pluginBuildDestination, [IO.FileMode]::CreateNew, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
try {
    $pluginBuildZip = [IO.Compression.ZipArchive]::new($pluginBuildStream, [IO.Compression.ZipArchiveMode]::Create, $true)
    try {
        foreach ($pluginBuildRelative in $pluginBuildFiles) {
            $pluginBuildSource = Join-Path $pluginBuildRoot $pluginBuildRelative
            $pluginBuildEntry = 'besoinavocat-experience/' + $pluginBuildRelative.Replace('\', '/')
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($pluginBuildZip, $pluginBuildSource, $pluginBuildEntry, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally { $pluginBuildZip.Dispose() }
} finally { $pluginBuildStream.Dispose() }
Get-Item -LiteralPath $pluginBuildDestination | Select-Object FullName, Length
Get-FileHash -LiteralPath $pluginBuildDestination -Algorithm SHA256
