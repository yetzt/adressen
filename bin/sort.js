// sort records

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const sortable = require("../lib/sortable");
const xsv = require("xsv");

const src = path.resolve(__dirname, "../data/addr.tsv");
const dest = path.resolve(__dirname, "../data/addr.sorted.tsv");

(async()=>{

	let n = 0;
	const data = {};

	fs.createReadStream(src).pipe(xsv({ sep: '\t' })).on("data", async r=>{
		if (!data[r.land]) data[r.land] = {};
		if (!data[r.land][r.ort]) data[r.land][r.ort] = {};
		if (!data[r.land][r.ort][r.ot]) data[r.land][r.ort][r.ot] = {};
		if (!data[r.land][r.ort][r.ot][r.plz]) data[r.land][r.ort][r.ot][r.plz] = {};
		if (!data[r.land][r.ort][r.ot][r.plz][r.str]) data[r.land][r.ort][r.ot][r.plz][r.str] = {};
		data[r.land][r.ort][r.ot][r.plz][r.str][r.nr] = [ r.lon, r.lat ];

		if (++n%1e5===0) console.log("%d, %d MB", n, (process.memoryUsage().rss/1024/1024).toFixed(2));

	}).on("end", async ()=>{

		const out = fs.createWriteStream(dest);
		out.write(["land","ort","ot","plz","str","nr","lon","lat"].join("\t")+"\n");
		let w = 0;

		for (let land of Object.keys(data).sort((a,b)=>a.localeCompare(b))) {
			for (let ort of Object.keys(data[land]).sort((a,b)=>a.localeCompare(b))) {
				for (let ot of Object.keys(data[land][ort]).sort((a,b)=>a.localeCompare(b))) {
					for (let plz of Object.keys(data[land][ort][ot]).sort((a,b)=>a.localeCompare(b))) {
						for (let str of Object.keys(data[land][ort][ot][plz]).sort((a,b)=>a.localeCompare(b))) {
							for (let nr of Object.keys(data[land][ort][ot][plz][str]).map(n=>({ hausnummer: n, sortable: sortable(n) })).sort((a,b)=>a.sortable-b.sortable).map(n=>n.hausnummer)) {
								out.write(`${land}\t${ort}\t${ot}\t${plz}\t${str}\t${nr}\t${data[land][ort][ot][plz][str][nr][0]}\t${data[land][ort][ot][plz][str][nr][1]}\n`);
								if (++w%1e5===0) console.log("%d, %d MB", w, (process.memoryUsage().rss/1024/1024).toFixed(2));
							};
						};
					};
				};
			};
		};

		out.end();

	});

})();