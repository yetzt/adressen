#!/bin/sh

# change to script dir
cd "$( dirname $0 )/..";
APPDIR=$( pwd -P )

# download postcodes if not present
if [ ! -e "$APPDIR/static/postleitzahlen.topojson.br" ]; then
	# check curl
	if [ ! `command -v curl` ]; then
		prnt "Missing curl: https://curl.se/";
		exit 1;
	fi;
	echo "Downloading 'postleitzahlen.topojson.br'";
	curl "https://github.com/yetzt/postleitzahlen/releases/download/2024.11/postleitzahlen.topojson.br" > "$APPDIR/static/postleitzahlen.topojson.br";
fi;

# check bun
if [ ! `command -v bun` ]; then
	prnt "Missing bun: https://bun.sh/";
	exit 1;
fi;

# install modules
if [ ! -d "$APPDIR/node_modules" ]; then
	bun install;
fi;

# import addresses
echo "importing";
bun "$APPDIR/bin/import.js" $1;

if [ ! $? -eq 0]; then
	echo "Importing Failed";
	exit 1;
fi;

# sort addresses
echo "sorting";
bun "$APPDIR/bin/sort.js";

if [ $? -eq 0]; then
	mv "$APPDIR/data/addr.sorted.tsv" "$APPDIR/data/addr.tsv";
fi;

if [ `command -v brotli` ]; then
	echo "compressing wth brotli";
	brotli -q 11 "$APPDIR/data/addr.tsv";
fi;

echo "done.";