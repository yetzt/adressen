// geospatial lookup for postcodes

const topojson = require("topojson-client");
const bbox = require("@turf/bbox").default;
const pip = require("@turf/boolean-point-in-polygon").default;
const path = require("node:path");
const zlib = require("node:zlib");
const fs = require("node:fs/promises");

let lookup = null;

const init = async function init(){
	const src = path.resolve(__dirname,"../static/postleitzahlen.topojson.br");

	// load
	let data = await fs.readFile(src);

	// decompress
	data = await new Promise((resolve,reject)=>{
		zlib.brotliDecompress(data, (err,res)=>{
			if (err) return reject(err);
			resolve(res);
		});
	});

	// parse
	data = JSON.parse(data);

	// to geojson
	data = topojson.feature(data, data.objects.postleitzahlen);

	// rtree
	const rbush = (await import("rbush")).default;

	// create tree and features
	const tree = new rbush();
	const features = data.features.map((f, i) => {
		const [minX, minY, maxX, maxY] = bbox(f);
		tree.insert({ minX, minY, maxX, maxY, index: i });
		return f;
	});

	lookup = async function lookup(lon, lat) {

		const candidates = tree.search({ minX: lon, minY: lat, maxX: lon, maxY: lat });

		for (const candidate of candidates) {
			const feature = features[candidate.index];
			if (pip([lon, lat], feature)) {
				return feature.properties.postcode;
			}
		}

		// No containing feature found
		return null;
	};

};

// interface
module.exports = function(lon, lat){
	return new Promise(async (resolve, reject)=>{
		if (!lookup) await init();
		lookup(lon, lat).then(resolve).catch(reject);
	});
};
