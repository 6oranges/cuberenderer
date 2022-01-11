
/* Function to linearly interpolate between a0 and a1
 * Weight w should be in the range [0.0, 1.0]
 */
function interpolate(a0, a1, w) {
	/* // You may want clamping by inserting:
	 * if (0.0 > w) return a0;
	 * if (1.0 < w) return a1;
	 */
	//return (a1 - a0) * w + a0;
	/* // Use this cubic interpolation [[Smoothstep]] instead, for a smooth appearance:
	 * return (a1 - a0) * (3.0 - w * 2.0) * w * w + a0;
	 *
	 * // Use [[Smootherstep]] for an even smoother result with a second derivative equal to zero on boundaries:
	 */
	return (a1 - a0) * ((w * (w * 6.0 - 15.0) + 10.0) * w * w * w) + a0;

}

/* Create random direction vector
 */
function randomGradient(ix, iy) {
	// Random float. No precomputed gradients mean this works for any number of grid coordinates
	const random = 2920 * Math.sin(ix * 21942 + iy * 171324 + 8912) * Math.cos(ix * 23157 * iy * 217832 + 9758);
	return { x: Math.cos(random), y: Math.sin(random) };
}

// Computes the dot product of the distance and gradient vectors.
function dotGridGradient(ix, iy, x, y) {
	// Get gradient from integer coordinates
	const gradient = randomGradient(ix, iy);

	// Compute the distance vector
	const dx = x - ix;
	const dy = y - iy;

	// Compute the dot-product
	return (dx * gradient.x + dy * gradient.y);
}

// Compute Perlin noise at coordinates x, y
function perlin(x, y) {
	// Determine grid cell coordinates
	const x0 = Math.floor(x);
	const x1 = x0 + 1;
	const y0 = Math.floor(y);
	const y1 = y0 + 1;

	// Determine interpolation weights
	// Could also use higher order polynomial/s-curve here
	const sx = x - x0;
	const sy = y - y0;

	// Interpolate between grid point gradients
	let n0, n1, ix0, ix1, value;

	n0 = dotGridGradient(x0, y0, x, y);
	n1 = dotGridGradient(x1, y0, x, y);
	ix0 = interpolate(n0, n1, sx);

	n0 = dotGridGradient(x0, y1, x, y);
	n1 = dotGridGradient(x1, y1, x, y);
	ix1 = interpolate(n0, n1, sx);

	value = interpolate(ix0, ix1, sy);
	return value;
}
const CHUNKSIZE = 16;
const CHUNKSIZED2 = Math.floor(CHUNKSIZE / 2);
function generate(x, y, z) {
	const data = new Uint8Array(CHUNKSIZE * CHUNKSIZE * CHUNKSIZE);
	let empty = true
	// Ground layer
	for (let i = 0; i < CHUNKSIZE; i++) {
		for (let j = 0; j < CHUNKSIZE; j++) {
			const rheight = Math.floor(perlin((i + x * CHUNKSIZE) * .01, (j + z * CHUNKSIZE) * .01) * 64 + perlin((i + x * CHUNKSIZE) * .1, (j + z * CHUNKSIZE) * .1) * 7 + 8);
			const height = (rheight + CHUNKSIZED2 + CHUNKSIZE) % CHUNKSIZE;
			if (Math.round(rheight / CHUNKSIZE) == y) {
				empty = false;
				data[j + i * CHUNKSIZE * CHUNKSIZE + height * CHUNKSIZE] = 1; // Grass
				for (let k = 0; k < height; k++) {
					data[j + i * CHUNKSIZE * CHUNKSIZE + k * CHUNKSIZE] = 2; // Stone
				}
			} else if (Math.round(rheight / CHUNKSIZE) > y) {
				for (let k = 0; k < CHUNKSIZE; k++) {
					data[j + i * CHUNKSIZE * CHUNKSIZE + k * CHUNKSIZE] = 2; // Stone
				}
			}
		}
	}
	return [data, empty];
}

var resolvedb;
var db = new Promise((resolve, reject) => {
	resolvedb = resolve;
});
{
	var request = indexedDB.open("cubes", 1);

	request.onerror = function (event) {
		console.log("error: ");
	};

	request.onsuccess = async function (event) {
		resolvedb(request.result);
		console.log("success: " + await db);
	};

	request.onupgradeneeded = function (event) {
		var db = event.target.result;
		db.createObjectStore("chunks", { keyPath: "xyz" });
	}
}


async function read(identifier) {
	return new Promise(async (resolve, reject) => {
		var transaction = (await db).transaction(["chunks"]);
		var objectStore = transaction.objectStore("chunks");
		var request = objectStore.get(identifier);

		request.onerror = function (event) {
			console.log("Unable to retrieve daa from database!");
			resolve(null);
		};

		request.onsuccess = function (event) {
			// Do something with the request.result!
			if (request.result) {
				resolve(request.result);
			} else {
				resolve(null);
			}
		};
	})
}
onmessage = async function (e) {
	var workerResult = { x: e.data[0], y: e.data[1], z: e.data[2] };
	const ret = await read(e.data[3]);
	if (ret) {
		workerResult.data = ret.data;
	} else {
		const x = generate(e.data[0], e.data[1], e.data[2]);
		workerResult.data = x[0];
		workerResult.empty = x[1];
	}
	postMessage(workerResult);
}
