$limit = (Get-Date).Date
$deckblatt_file = './Deckblatt.pdf'
$raw_thesis_file = './Thesis.pdf'
$thesis_file = './Bachelorthesis.pdf'

$filenames = (Get-ChildItem -Path ./ -Filter *.md -Name -File | Where-Object{$_ -match '^\d\d-'})
 
pandoc $filenames --bibliography refs.bib --toc --citeproc --number-sections -o $raw_thesis_file

# --csl https://raw.githubusercontent.com/citation-style-language/styles/master/ieee.csl

PDFHandler.py merge $deckblatt_file $raw_thesis_file $thesis_file
rm $raw_thesis_file
Start-Process $thesis_file