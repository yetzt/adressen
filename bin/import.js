// import address data from vector tile layer

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const phn = require("phn");
const vtt = require("vtt");

const inGermany = require("../lib/in-germany");
const postcode = require("../lib/postcode");

// https agent to reuse connecitons
let agent = new https.Agent({ keepAlive: true });

// bounding box
const bbox = [ 5.687223178683411, 47.14295452513247, 15.238597172011879, 55.15930173973919 ]; // germany
// const bbox =  [ 13.409377, 52.495516, 13.433903, 52.504556 ]; // testing

// state label lookup
const states = {
	BB: "Brandenburg",
	BE: "Berlin",
	BW: "Baden-Württemberg",
	BY: "Bayern",
	HB: "Bremen",
	HE: "Hessen",
	HH: "Hamburg",
	MV: "Mecklenburg-Vorpommern",
	NI: "Niedersachsen",
	NW: "Nordrhein-Westfalen",
	RP: "Rheinland-Pflaz",
	SH: "Schleswig-Holstein",
	SL: "Saarland",
	SN: "Sachsen",
	ST: "Sachsen-Anhalt",
	TH: "Thüringen",
};

// lon to tile x
function lon2tile(lon,z) {
	return (Math.floor((lon+180)/360*Math.pow(2,z)));
};

// lat to tile y
function lat2tile(lat,z){
	return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*Math.pow(2,z)));
};

// tile y to lon
function tile2lon(x,z) {
	return (x/Math.pow(2,z)*360-180);
};

// tilye x to lat
function tile2lat(y,z) {
	let n=Math.PI-2*Math.PI*y/Math.pow(2,z);
	return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
};

let agentCount = 0;
let failCount = 0;

// retrieve tile
async function retrieve(x, y) {
	return new Promise(async (resolve,reject)=>{

		// refresh agent, treshold appears to be 96 requests
		if (++agentCount >= 96) {
			agent = new https.Agent({ keepAlive: true });
			agentCount = 0;
		}

		await phn({
			url: `https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/v1/bm_web_de_3857/15/${x}/${y}.pbf`,
			core: { agent },
			compression: true,
			headers: {
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0",
				"Accept": "*/*",
				"Accept-Language": "de,en-US;q=0.7,en;q=0.3",
				"Referer": "https://basemap.de/",
				"Origin": "https://basemap.de",
				"Sec-GPC": "1",
				"Sec-Fetch-Dest": "empty",
				"Sec-Fetch-Mode": "cors",
				"Sec-Fetch-Site": "cross-site",
				"DNT": "1",
			}
		}).then(res=>{
			failCount = 0;
			resolve(res);
		}).catch(err=>{
			if (++failCount > 5) return reject(err);
			console.log("[ERR] try with new connection");
			// try again with new agent after $failCount seconds
			setTimeout(()=>{
				agent = new https.Agent({ keepAlive: true });
				agentCount = 0;
				retrieve(x, y).then(resolve).catch(err);
			},failCount * 1000);
		});
	});
};

// async fs.exists
async function exists(f){
	return new Promise(resolve=>{
		fs.access(f, fs.constants.F_OK, (err)=>resolve(!err));
	});
};

// importer
const main = module.exports = async function main() {

	// continue file if existing, otherwise create
	const dest = path.resolve(__dirname,"../data/addr.tsv");
	const destStats = path.resolve(__dirname,"../data/stats.json");
	const append = await exists(dest);

	const out = fs.createWriteStream(dest, { flags: 'a+' });

	// write headers if not appending
	if (!append) out.write(["land","ort","ot","plz","str","nr","lon","lat"].join("\t")+"\n");

	// calculare total number of iterations for percent calculation
	const tot = (1+lon2tile(bbox[2],15)-lon2tile(bbox[0],15)) * (1+lat2tile(bbox[1],15) - lat2tile(bbox[3],15));

	console.log(`total: ${tot}`);

	let n = 0; // interation count
	let r = 0; // retrieval count
	let l = 0; // record count
	let p = null; // percent

	// get continuation index from argument
	let cont = process.argv[2] ? parseInt(process.argv[2],10) : 0;

	for (let x = lon2tile(bbox[0],15); x <= lon2tile(bbox[2],15); x++) {
		for (let y = lat2tile(bbox[3],15); y <= lat2tile(bbox[1],15); y++) {

			// increment iteration count
			n++;

			// skip if continuation index not yet reached
			// FIXME: this can be solved more elegantly
			if (cont && n<=cont) continue;

			// check if tile is in germany
			if (inGermany([tile2lon(x,15), tile2lat(y,15)])) {

				// increment retrieval counter
				r++;

				// retrievr tile
				const res = await retrieve(x, y).catch(err=>{
					console.error(err);
					console.log("failed at %d, continue from here with `run.sh %d`", n, n);
					out.end();
					process.exit(1);
				});

				// skip if answer is unexpected
				if (res.statusCode !== 200) continue;
				if (res.headers["content-type"] !== 'application/octet-stream' && res.headers["content-type"] !== 'application/x-protobuf') continue;

				// unpack tile
				const tile = vtt.unpack(res.body)

				// get adress layer
				const addr = tile.find(layer=>layer.name === "Adresse");

				// skip if no adress layer is present
				if (!addr) continue;

				// pepare tile geometry
				let size = addr.extent * 32768;
				let x0 = addr.extent * x;
				let y0 = addr.extent * y;

				for (let feature of addr.features) {

					// calculate lon and lat from x and y within tile
					const lon = ((feature.geometry[0][0][0] + x0) * 360 / size - 180); // .toFixed(6)
					const lat = (360 / Math.PI * Math.atan(Math.exp((180 - (feature.geometry[0][0][1] + y0) * 360 / size) * Math.PI / 180)) - 90); // .toFixed(6)

					out.write([
						states[feature.properties.land], // expand to full label
						feature.properties.ort,
						feature.properties.ortsteil,
						await postcode(lon, lat), // lookup postcode
						feature.properties.strasse,
						feature.properties.hausnummer,
						lon.toFixed(6), // round to 6 decimals
						lat.toFixed(6), // plenty enough precision
					].join("\t")+"\n");
					l++;
				}
			};

			// calculate percentage
			let pc = ((n/tot)*100).toFixed(2);
			if (pc !== p) console.error("%s%% | iteration %d | %d retrieved | %d adresses", p=pc, n, r, l);

		};
	};

	// close stream
	out.end();

	// write stats
	fs.writeFile(destStats, JSON.stringify({
		retrieved: r,
		records: l,
	}), ()=>{
		console.error("done");
	});

};

// run if called directly
if (require.main === module) (async()=>{
	await main();
})();