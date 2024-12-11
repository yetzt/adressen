const fs = require("node:fs/promises");
const path = require("node:path");
const pip = require("@turf/boolean-point-in-polygon").default;

// germany geojson
const src = path.resolve(__dirname, "../static/de.geojson");

let germany = null;

const inGermany = module.exports = async function inGermany(point){

	// load geojson if not present
	if (!germany) germany = JSON.parse(await fs.readFile(src)).features[0];

	return pip(point, germany);
};