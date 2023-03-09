$theme = $args[0]

if ($theme -ne "dark" -and $theme -ne "light") {
    Write-Host "You must specify one of the themes light or dark"
    Exit
}

$deckblatt_file = './Deckblatt.pdf'
$raw_thesis_file = './Thesis.pdf'
$thesis_file = './Bachelorthesis.pdf'

$filenames = (Get-ChildItem -Path ./ -Filter *.md -Name -File | Where-Object{$_ -Match '^\d\d-'})

Get-ChildItem -Path ./ -Recurse -File | Where-Object{$_ -Match "^$($theme)-"} | ForEach-Object { Copy-Item $_.FullName -Force -Destination $_.FullName.Replace("$($theme)-", "")}
 
pandoc $filenames --defaults ./defaults.yaml

PDFHandler.py merge $deckblatt_file $raw_thesis_file $thesis_file
rm $raw_thesis_file
Start-Process $thesis_file