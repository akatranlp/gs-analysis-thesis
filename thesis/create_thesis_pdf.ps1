$limit = (Get-Date).Date
$deckblatt_file = './Deckblatt.pdf'
$raw_thesis_file = './Thesis.pdf'
$thesis_file = './Bachelorthesis.pdf'

if(Test-Path -Path $deckblatt_file -PathType Leaf) {
    Get-ChildItem -Path $deckblatt_file | Where-Object { !$_.PSIsContainer -and $_.CreationTime -lt $limit } | Remove-Item -Force
}

if(-not(Test-Path -Path $deckblatt_file -PathType Leaf)) {
    $process = Start-Process -PassThru ./Deckblatt_makro.docm
    Start-Sleep -Seconds 3
    Stop-Process $process
}

$filenames = (Get-ChildItem -Path ./ -Filter *.md -Name -File | Where-Object{$_ -match '^\d\d-'})
 
pandoc $filenames --bibliography refs.bib --toc --citeproc --number-sections -o $raw_thesis_file

# --csl https://raw.githubusercontent.com/citation-style-language/styles/master/ieee.csl

PDFHandler.py merge $deckblatt_file $raw_thesis_file $thesis_file
rm $raw_thesis_file
Start-Process $thesis_file