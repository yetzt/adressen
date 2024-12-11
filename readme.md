# Adressen

An importer for german address data from the [gdz_basemapde_vektor](https://gdz.bkg.bund.de/index.php/default/open-data/gdz-basemapde-vektor-gdz-basemapde-vektor.html) dataset, released as Open Data under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

## Run

Since sorting the records uses a rather large amount of memory, a js runtime without memory limits such as [bun](https://bun.sh/) is recommended.

1. `bun bin/import.js` – Import address data from tileserver
2. `bun bin/sort.js` – Sort records

## Data

See [Releases](https://github.com/yetzt/adressen/releases)

## Agenda

* [ ] Produce FlatGeoBuf and other portable data formats

## License

This is free and unencumbered software released into the public domain.

## Data Licenses

* [Postcode Data](static/polstleitzahlen.topojson.br): [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright), Licensed under the [Open Data Commons Open Database License](https://opendatacommons.org/licenses/odbl/), via [@yetzt/postleitzahlen](https://github.com/yetzt/postleitzahlen)
* [Buffered Germany Geojson](static/de.geojson): Public Domain
* Vector Tiles "basemap.de Web Vektor": © GeoBasis-DE / [BKG](https://www.bkg.bund.de/) (2024) [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ([License Agreement](https://sgx.geodatenzentrum.de/web_public/gdz/dokumentation/deu/basemap.de_web_vektor.pdf#%5B%7B%22num%22%3A32%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C68%2C738%2C0%5D), [Documentation](https://basemap.de/data/produkte/web_vektor/meta/bm_web_vektor_datenmodell.html#Adresse))
