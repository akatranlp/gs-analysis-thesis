THEME=$1

if [ "$THEME" != "dark" ] && [ "$THEME" != "light" ]; then
    echo "You must specify one of the themes light or dark"
    exit
fi

copyFiles() {
    for image in $(ls ./$1 | grep -E "^$THEME-"); do
        to=${image//$THEME-/}
        cp ./$1/$image ./$1/$to
    done
}

DECKBLATT_FILE=./Deckblatt.pdf
RAW_THESIS_FILE=./Thesis.pdf
THESIS_FILE=./Bachelorthesis.pdf

filenames=`ls | grep -E "[0-9][0-9].*.md"`

copyFiles images
copyFiles attachement

docker run --rm --volume "/opt/gs-analysis/thesis:/data" --user `id -u`:`id -g` \
akatranlp/pandoc $filenames --defaults ./defaults.yaml

docker run --rm --volume "/opt/gs-analysis/thesis:/data" --user `id -u`:`id -g` \
akatranlp/pdfhandler merge $DECKBLATT_FILE $RAW_THESIS_FILE $THESIS_FILE

rm $RAW_THESIS_FILE
