// convert house number string to sortable float
const sortable = module.exports = function sortable(s){

	if (!s) return 0; // no number

	// fractional numbers like 1½ are encoded as 1/1/2
	// ranges are sometimes encoded 11/15
	// subdivisions are sometimes encoded 1/10
	// it's not decidable which is which without context
	// this is the best i could do
	// it's good enough unless schemes are severely mixed within the same street

	// particular fixes
	s = s.replace(" (Hinterhaus)","").replace(" Parzelle","").replace("Haus","").replace("9/1113","9/11/13");

	// split number by character class, assign value and accumulate
	return s.match(/\d+|[a-z]+|[A-Z]+|[^a-zA-Z0-9]+/g).filter(seg=>/^[A-Za-z0-9]+$/.test(seg)).reduce((n,seg,i)=>{

		const code = seg.charCodeAt(0);
		let num;
		switch (seg) { // roman numerals are a hack, they are replaced with a value that is sortable even when I, V and X are parsed in base36
			// I is 18 in base36
			case "II":   num = 28; break;
			case "III":  num = 29; break;
			case "IV":   num = 30; break;
			// V is 31 in base36
			case "VI":   num = 31.4; break; // these will spill over by one decimal, but collisions are unlikely
			case "VII":  num = 31.8; break;
			case "VIII": num = 32.2; break;
			case "IX":   num = 32.6; break;
			// X is 33 in base36
			default:
				if (code >= 0x61) { // lowercase
					num = parseInt(seg,36);
				} else if (code >= 0x41) { // uppercase
					num = parseInt(seg.toLowerCase(),36);
				} else { // number
					num = parseInt(seg,10);
				}
			break;
		}

		// shift 4*i decimal points to the right and add
		return n + num / Math.pow(10,i*3);
	},0);

};
