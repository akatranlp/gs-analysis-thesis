DECKBLATT_FILE=./Deckblatt.pdf
RAW_THESIS_FILE=./Thesis.pdf
THESIS_FILE=./Bachelorthesis.pdf

filenames=`ls | grep -E "[0-9][0-9].*.md"`

docker run --rm --volume "/opt/gs-analysis/thesis:/data" --user `id -u`:`id -g` \
pandoc/latex $filenames --bibliography refs.bib --toc --citeproc --number-sections -o $RAW_THESIS_FILE

docker run --rm --volume "/opt/gs-analysis/thesis:/data" --user `id -u`:`id -g` \
akatranlp/pdfhandler merge $DECKBLATT_FILE $RAW_THESIS_FILE $THESIS_FILE

rm $RAW_THESIS_FILE