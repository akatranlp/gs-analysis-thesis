$deckblatt_file = './Deckblatt.pdf'
$raw_thesis_file = './Thesis.pdf'
$thesis_file = './Bachelorthesis.pdf'

$filenames = (Get-ChildItem -Path ./ -Filter *.md -Name -File | Where-Object{$_ -match '^\d\d-'})
 
pandoc $filenames --defaults ./defaults.yaml

PDFHandler.py merge $deckblatt_file $raw_thesis_file $thesis_file
rm $raw_thesis_file
Start-Process $thesis_file