import init, { greet } from "./rendering/pkg/rendering.js";
init()
	.then(() => {
		greet("WebAssembly")
	});
const keys = new Set();
const newkeys = new Set();
let mouseButtons = 0;
let newMouseButtons = 0;
const canvas = document.querySelector('#canvas');
var downloadFile = (function () {
	var a = document.createElement("a");
	document.body.appendChild(a);
	a.href = "#"
	a.style = "display: none";
	return function (data, fileName) {
		var json = JSON.stringify(data),
			blob = new Blob([json], { type: "octet/stream" }),
			url = window.URL.createObjectURL(blob);
		a.href = url;
		a.download = fileName;
		a.click();
		window.URL.revokeObjectURL(url);
	};
}());
const upload = (function () {
	const dummyLabel = document.createElement('label');
	const fileInput = document.createElement('input');
	document.body.appendChild(dummyLabel);
	dummyLabel.appendChild(fileInput);
	fileInput.type = "file"
	fileInput.style.opacity = 0
	fileInput.style.width = 1;
	fileInput.style.height = 1;
	fileInput.style.position = "fixed"
	fileInput.style.left = "-10000px"
	fileInput.style.top = "-10000px"
	return function () {
		fileInput.click();
		return new Promise((resolve, reject) => {
			const fn = (e) => {
				const file = fileInput.files[0]
				if (file) {
					var reader = new FileReader();
					reader.readAsText(file, "UTF-8");
					reader.onload = function (evt) {
						resolve(evt.target.result);
					}
					reader.onerror = function (evt) {
						reject();
					}
				} else {
					reject();
				}
				fileInput.removeEventListener("change", fn);
				fileInput.value = null
			}
			fileInput.addEventListener("change", fn);
		})

	}
})()
function main() {

	const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
	// If we don't have a GL context, give up now

	if (!gl) {
		alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}

	// Vertex shader program

	const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColor = aVertexColor;
    }
  `;

	// Fragment shader program

	const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
  `;

	// Initialize a shader program; this is where all the lighting
	// for the vertices and so forth is established.
	const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

	// Collect all the info needed to use the shader program.
	// Look up which attributes our shader program is using
	// for aVertexPosition, aVevrtexColor and also
	// look up uniform locations.
	const programInfo = {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
			vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
		},
	};

	// Here's where we call the routine that builds all the
	// objects we'll be drawing.
	const buffers = initBuffers(gl);

	var then = 0;

	// Draw the scene repeatedly
	function render(now) {
		now *= 0.001; // convert to seconds
		const deltaTime = now - then;
		then = now;

		drawScene(gl, programInfo, buffers, deltaTime);

		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	// Create the shader program

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	// If creating the shader program failed, alert

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
		return null;
	}

	return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
	const shader = gl.createShader(type);

	// Send the source to the shader object 

	gl.shaderSource(shader, source);

	// Compile the shader program

	gl.compileShader(shader);

	// See if it compiled successfully

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}
function shiftColor(color, d) {
	let b = [0, 0, 0, 0]
	for (let c = 0; c < 3; c++) {
		b[c] = color[c] + d;
	}
	b[3] = color[3]
	return b;
}
function getBlockColor(faceColors, gl) {
	// Convert the array of colors into a table for all the vertices.

	var colors = [];
	for (var j = 0; j < faceColors.length; ++j) {
		const c = faceColors[j];

		// Repeat each color four times for the four vertices of the face
		colors = colors.concat(c, shiftColor(c, .05), shiftColor(c, -.03), shiftColor(c, -.08));
	}


	const colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	return colorBuffer;
}
//
// initBuffers
//
function initBuffers(gl) {

	// Create a buffer for the cube's vertex positions.

	const positionBuffer = gl.createBuffer();

	// Select the positionBuffer as the one to apply buffer
	// operations to from here out.

	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

	// Now create an array of positions for the cube.

	const positions = [
		// Front face
		-.5, -.5, .5,
		.5, -.5, .5,
		.5, .5, .5, -.5, .5, .5,

		// Back face
		-.5, -.5, -.5, -.5, .5, -.5,
		.5, .5, -.5,
		.5, -.5, -.5,

		// Top face
		-.5, .5, -.5, -.5, .5, .5,
		.5, .5, .5,
		.5, .5, -.5,

		// Bottom face
		-.5, -.5, -.5,
		.5, -.5, -.5,
		.5, -.5, .5, -.5, -.5, .5,

		// Right face
		.5, -.5, -.5,
		.5, .5, -.5,
		.5, .5, .5,
		.5, -.5, .5,

		// Left face
		-.5, -.5, -.5, -.5, -.5, .5, -.5, .5, .5, -.5, .5, -.5,
	];

	// Now pass the list of positions into WebGL to build the
	// shape. We do this by creating a Float32Array from the
	// JavaScript array, then use it to fill the current buffer.

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	// Now set up the colors for the faces. We'll use solid colors
	// for each face.


	const colorBuffers = [];
	colorBuffers.push(null);
	const grass = [
		[99 / 255, 58 / 255, 17 / 255, 1.0], // Front face: white
		[77 / 255, 38 / 255, 0 / 255, 1.0], // Back face: red
		[58 / 255, 141 / 255, 29 / 255, 1.0], // Top face: green
		[191 / 255, 153 / 255, 89 / 255, 1.0], // Bottom face: blue
		[161 / 255, 115 / 255, 57 / 255, 1.0], // Right face: yellow
		[124 / 255, 77 / 255, 38 / 255, 1.0], // Left face: purple
	];
	colorBuffers.push(getBlockColor(grass, gl));
	const stone = [
		[0.6, 0.6, 0.6, 1.0], // Front face: white
		[0.7, 0.7, 0.7, 1.0], // Back face: red
		[0.65, 0.65, 0.65, 1.0], // Top face: green
		[0.3, 0.3, 0.3, 1.0], // Bottom face: blue
		[0.4, 0.4, 0.4, 1.0], // Right face: yellow
		[0.5, 0.5, 0.5, 1.0], // Left face: purple
	];
	colorBuffers.push(getBlockColor(stone, gl));
	const log = [
		[112 / 255, 82 / 255, 11 / 255, 1.0], // Front face: white
		[100 / 255, 80 / 255, 6 / 255, 1.0], // Back face: red
		[120 / 255, 88 / 255, 16 / 255, 1.0], // Top face: green
		[106 / 255, 77 / 255, 8 / 255, 1.0], // Bottom face: blue
		[95 / 255, 75 / 255, 5 / 255, 1.0], // Right face: yellow
		[109 / 255, 81 / 255, 6 / 255, 1.0], // Left face: purple
	];
	colorBuffers.push(getBlockColor(log, gl));
	const leaves = [
		[60 / 255, 199 / 255, 0 / 255, 0.8], // Front face: white
		[50 / 255, 189 / 255, 0 / 255, 0.8], // Back face: red
		[70 / 255, 210 / 255, 0 / 255, 0.8], // Top face: green
		[65 / 255, 204 / 255, 0 / 255, 0.8], // Bottom face: blue
		[47 / 255, 185 / 255, 0 / 255, 0.8], // Right face: yellow
		[67 / 255, 208 / 255, 0 / 255, 0.8], // Left face: purple
	];
	colorBuffers.push(getBlockColor(leaves, gl));
	const brick = [
		[0.8, 0.5, 0.1, 1.0], // Front face: white
		[0.76, 0.55, 0.0, 1.0], // Back face: red
		[0.88, 0.65, 0.06, 1.0], // Top face: green
		[0.9, 0.7, 0.2, 1.0], // Bottom face: blue
		[0.99, 0.8, 0.0, 1.0], // Right face: yellow
		[0.73, 0.45, 0.05, 1.0], // Left face: purple
	];
	colorBuffers.push(getBlockColor(brick, gl));
	const teal = [
		[0.1, 0.5, 0.8, 1.0], // Front face: white
		[0.0, 0.55, 0.76, 1.0], // Back face: red
		[0.06, 0.65, 0.88, 1.0], // Top face: green
		[0.2, 0.7, 0.9, 1.0], // Bottom face: blue
		[0.0, 0.8, 0.99, 1.0], // Right face: yellow
		[0.05, 0.45, 0.73, 1.0], // Left face: purple

	];
	colorBuffers.push(getBlockColor(teal, gl));
	const water = [
		[0.1, 0.2, 0.8, 0.8], // Front face: white
		[0.0, 0.1, 0.76, 0.8], // Back face: red
		[0.06, 0.1, 0.88, 0.8], // Top face: green
		[0.2, 0.1, 0.9, 0.8], // Bottom face: blue
		[0.0, 0.03, 0.99, 0.8], // Right face: yellow
		[0.05, 0.15, 0.73, 0.8], // Left face: purple
	];
	colorBuffers.push(getBlockColor(water, gl));
	const red = [
		[0.8, 0.0, 0.1, 1.0], // Front face: white
		[0.76, 0.05, 0.0, 1.0], // Back face: red
		[0.88, 0.12, 0.06, 1.0], // Top face: green
		[0.9, 0.08, 0.2, 1.0], // Bottom face: blue
		[0.99, 0.03, 0.0, 1.0], // Right face: yellow
		[0.73, 0.15, 0.05, 1.0], // Left face: purple
	];
	colorBuffers.push(getBlockColor(red, gl));
	const bedrock = [
		[0.1, 0.1, 0.1, 1.0], // Front face: white
		[0.08, 0.12, 0.15, 1.0], // Back face: red
		[0.03, 0.05, 0.02, 1.0], // Top face: green
		[0.02, 0.07, 0.09, 1.0], // Bottom face: blue
		[0.03, 0.03, 0.03, 1.0], // Right face: yellow
		[0.02, 0.04, 0.07, 1.0], // Left face: purple
	];
	colorBuffers.push(getBlockColor(bedrock, gl));

	// Build the element array buffer; this specifies the indices
	// into the vertex arrays for each face's vertices.

	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

	// This array defines each face as two triangles, using the
	// indices into the vertex array to specify each triangle's
	// position.

	const indices = [
		0, 1, 2, 0, 2, 3, // front
		4, 5, 6, 4, 6, 7, // back
		8, 9, 10, 8, 10, 11, // top
		12, 13, 14, 12, 14, 15, // bottom
		16, 17, 18, 16, 18, 19, // right
		20, 21, 22, 20, 22, 23, // left
	];

	// Now send the element array to GL

	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
		new Uint16Array(indices), gl.STATIC_DRAW);

	return {
		position: positionBuffer,
		colors: colorBuffers,
		indices: indexBuffer,
	};
}
function useBlock(gl, programInfo, buffers, i = 1) {
	// Tell WebGL how to pull out the colors from the color buffer
	// into the vertexColor attribute.
	{
		const numComponents = 4;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colors[i]);
		gl.vertexAttribPointer(
			programInfo.attribLocations.vertexColor,
			numComponents,
			type,
			normalize,
			stride,
			offset);
		gl.enableVertexAttribArray(
			programInfo.attribLocations.vertexColor);
	}
}

function howtodraw(gl, programInfo, buffers, projectionMatrix) {
	// Tell WebGL how to pull out the positions from the position
	// buffer into the vertexPosition attribute
	{
		const numComponents = 3;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
		gl.vertexAttribPointer(
			programInfo.attribLocations.vertexPosition,
			numComponents,
			type,
			normalize,
			stride,
			offset);
		gl.enableVertexAttribArray(
			programInfo.attribLocations.vertexPosition);
	}



	// Tell WebGL which indices to use to index the vertices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

	// Tell WebGL to use our program when drawing

	gl.useProgram(programInfo.program);
	gl.enable(gl.BLEND);
	gl.enable(gl.CULL_FACE);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	// Set the shader uniforms

	gl.uniformMatrix4fv(
		programInfo.uniformLocations.projectionMatrix,
		false,
		projectionMatrix);

}
function adjustSize(gl) {
	const canvas = gl.canvas;
	const amount = 1;
	var displayWidth = canvas.clientWidth;
	var displayHeight = canvas.clientHeight;

	// Check if the canvas is not the same size.
	if (canvas.width != displayWidth * amount ||
		canvas.height != displayHeight * amount) {

		// Make the canvas the same size
		canvas.width = displayWidth * amount;
		canvas.height = displayHeight * amount;
		gl.viewport(0, 0, canvas.width, canvas.height);
	}
}
function clearGL(gl) {
	gl.clearColor(0.0, 0.5, 1.0, 1.0); // Clear to black, fully opaque
	gl.clearDepth(1.0); // Clear everything
	gl.enable(gl.DEPTH_TEST); // Enable depth testing
	gl.depthFunc(gl.LEQUAL); // Near things obscure far things
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the canvas before we start drawing on it.
}
let setCounter = 0
function displayFrameRate(gl) {

	if (!("mythen" in displayFrameRate)) {
		displayFrameRate.mythen = new Date().getTime();
		displayFrameRate.frames = 0;
		displayFrameRate.element = document.getElementById("apple");
	}
	const mynow = new Date().getTime();
	if (displayFrameRate.mythen + 1000 <= mynow) {
		displayFrameRate.mythen = mynow;
		displayFrameRate.element.innerText = "2  " + displayFrameRate.frames + " (" + Math.round(cam.x) + "," + Math.round(cam.y) + "," + Math.round(cam.z) + ") " + setCounter;
		displayFrameRate.frames = 0;
	}
	displayFrameRate.frames += 1;
	setCounter = 0
}
function cameraMatrices(gl, projectionMatrix) {
	const fieldOfView = 45 * Math.PI / 180; // in radians
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 100.0;
	glMatrix.mat4.perspective(projectionMatrix,
		fieldOfView,
		aspect,
		zNear,
		zFar);
}
const CHUNKSIZE = 16;
const CHUNKSIZED2 = Math.floor(CHUNKSIZE / 2);
class Chunk {
	constructor(x = 0, y = 0, z = 0) {
		this.x = x * CHUNKSIZE;
		this.y = y * CHUNKSIZE;
		this.z = z * CHUNKSIZE;
		this.data = new Uint8Array(CHUNKSIZE * CHUNKSIZE * CHUNKSIZE);
		this.dirty = false;
		this.empty = true;
		this.generated = false;
		this.playerTicket = false;
		this.matrices = [];
		const modelViewMatrix = glMatrix.mat4.create();
		glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [this.x - CHUNKSIZED2, this.y - CHUNKSIZED2, this.z - CHUNKSIZED2]);
		//this.matrices.push(glMatrix.mat4.clone(modelViewMatrix));
		let i = 0;
		for (let x = 0; x < CHUNKSIZE; x++) {
			for (let y = 0; y < CHUNKSIZE; y++) {
				for (let z = 0; z < CHUNKSIZE; z++) {
					this.matrices.push(glMatrix.mat4.clone(modelViewMatrix));
					glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, 1]);
					i += 1
				}
				glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [0, 1, -CHUNKSIZE]);
			}
			glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [1, -CHUNKSIZE, 0]);
		}
	}
	draw(gl, programInfo, cameraMatrix, buffers) {
		if (this.empty) {
			return;
		}
		const modelViewMatrix = glMatrix.mat4.create();
		let i = 0;
		for (let x = 0; x < CHUNKSIZE; x++) {
			for (let y = 0; y < CHUNKSIZE; y++) {
				for (let z = 0; z < CHUNKSIZE; z++) {
					if (this.data[i] >= 1) { // block
						useBlock(gl, programInfo, buffers, this.data[i])
						glMatrix.mat4.multiply(modelViewMatrix, cameraMatrix, this.matrices[i]);
						gl.uniformMatrix4fv(
							programInfo.uniformLocations.modelViewMatrix,
							false,
							modelViewMatrix); {
							const vertexCount = 36;
							const type = gl.UNSIGNED_SHORT;
							const offset = 0;
							gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
						}
					}
					i += 1
				}
			}
		}
	}

}
class Chunks {
	constructor(generatorFunction = (x = 0, y = 0, z = 0) => new Chunk(x, y, z)) {
		this.loadedChunks = {};
		this.generatorFunction = generatorFunction;
		this.recurse = 0
	}
	removePlayerTickets() {
		for (let chunk of Object.keys(this.loadedChunks)) {
			this.loadedChunks[chunk].playerTicket = false;
		}
	}
	clearChunks() {
		for (let chunk of Object.keys(this.loadedChunks)) {
			const c = this.loadedChunks[chunk];
			if (c.dirty) {
				const ch = this.loadedChunks[chunk]
				const identifier = Math.round(ch.x / CHUNKSIZE) + "," + Math.round(ch.y / CHUNKSIZE) + "," + Math.round(ch.z / CHUNKSIZE);
				localStorage.setItem(identifier, ch.data);
				ch.dirty = false;
			}
			if (c.playerTicket === false) {
				delete this.loadedChunks[chunk];
			}
		}
	}
	getChunk(x = 0, y = 0, z = 0) {
		const chunk = this.getChunkLoaded(x, y, z)
		if (chunk) {
			return chunk;
		}
		else {
			//console.log("Generating",x,y,z)
			const chunk = new Chunk(x, y, z);
			const identifier = x + "," + y + "," + z;
			this.loadedChunks[identifier] = chunk;
			if (this.recurse < 64) {
				this.recurse += 1
				const ret = localStorage.getItem(identifier);
				if (ret) {
					chunk.data = new Uint8Array(ret.split(","));
					chunk.dirty = true;
					chunk.empty = false;
					chunk.generated = true;
				} else {
					this.generatorFunction(chunk, x, 0, z);
					chunk.generated = true
				}
				this.recurse -= 1
			}
			else {
				console.log("NOOOOOO")
			}
			return chunk
		}
	}
	getChunkLoaded(x = 0, y = 0, z = 0) {
		const identifier = x + "," + y + "," + z;
		if (!(identifier in this.loadedChunks)) {
			return null;
		}
		return this.loadedChunks[identifier];
	}
	getBlockChunk(x = 0, y = 0, z = 0) {
		x = Math.round(x);
		y = Math.round(y);
		z = Math.round(z);
		return this.getChunk(Math.round(x / CHUNKSIZE), Math.round(y / CHUNKSIZE), Math.round(z / CHUNKSIZE));
	}
	getBlockIndex(x, y, z) {
		const fn = v => Math.round(((v + CHUNKSIZED2) % CHUNKSIZE + CHUNKSIZE) % CHUNKSIZE)
		const i = fn(x) * CHUNKSIZE * CHUNKSIZE + fn(y) * CHUNKSIZE + fn(z);
		return i;
	}
	getBlock(x = 0, y = 0, z = 0) {
		x = Math.round(x);
		y = Math.round(y);
		z = Math.round(z);
		const chunk = this.getBlockChunk(x, y, z);
		return chunk.data[this.getBlockIndex(x, y, z)];
	}
	setBlock(x = 0, y = 0, z = 0, value = 0, dirty = true) {
		setCounter += 1
		x = Math.round(x);
		y = Math.round(y);
		z = Math.round(z);
		if (!dirty) {
			let loaded = this.getChunkLoaded(Math.round(x / CHUNKSIZE), Math.round(y / CHUNKSIZE), Math.round(z / CHUNKSIZE))
			if (loaded && loaded.generated) {
				return;
			}
		}
		const chunk = this.getBlockChunk(x, y, z);
		chunk.dirty = dirty;
		chunk.empty = false;
		chunk.data[this.getBlockIndex(x, y, z)] = value;
	}
}
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
// 
// Draw the scene.
//
const cam = {
	x: 0,
	y: 10,
	z: 0,
	dx: 0,
	dy: 0,
	dz: 0,
	xzrot: 0,
	yzrot: 0
};

const myChunk = new Chunk(0, 0, 0);
const world = new Chunks((chunk, x, y, z) => {
	if (y == 0) {
		chunk.empty = false;
		// Ground layer
		for (let i = -CHUNKSIZED2; i < Math.ceil(CHUNKSIZE / 2); i++) {
			for (let j = -CHUNKSIZED2; j < Math.ceil(CHUNKSIZE / 2); j++) {
				const height = Math.floor(perlin((i + x * CHUNKSIZE) * .01, (j + z * CHUNKSIZE) * .01) * 64 + perlin((i + x * CHUNKSIZE) * .1, (j + z * CHUNKSIZE) * .1) * 7 + 8);
				world.setBlock(i + x * CHUNKSIZE, height - 3 + y * CHUNKSIZE, j + z * CHUNKSIZE, 9, false);
				for (let k = height - 2; k < height; k++) {
					world.setBlock(i + x * CHUNKSIZE, k + y * CHUNKSIZE, j + z * CHUNKSIZE, 2, false);
					//chunk.data[j + i*CHUNKSIZE*CHUNKSIZE+k*CHUNKSIZE]=2; // Stone
				}
				world.setBlock(i + x * CHUNKSIZE, height + y * CHUNKSIZE, j + z * CHUNKSIZE, 1, false);
				//chunk.data[j + i*CHUNKSIZE*CHUNKSIZE+height*CHUNKSIZE]=1; // Grass
				if (i > 2 - CHUNKSIZED2 && j > 2 - CHUNKSIZED2 && i < Math.ceil(CHUNKSIZE / 2) - 2 && j < Math.ceil(CHUNKSIZE / 2) - 2 && (height % CHUNKSIZE + CHUNKSIZE) % CHUNKSIZE < 1) {
					if (Math.random() < .01) {
						for (let k = height + 3; k < height + 7; k++) {
							for (let a = -1; a < 2; a++) {
								for (let b = -1; b < 2; b++) {
									world.setBlock(i + b + x * CHUNKSIZE, k + y * CHUNKSIZE, j + a + z * CHUNKSIZE, 4, false);
									//chunk.data[(j+a) + (i+b)*CHUNKSIZE*CHUNKSIZE+k*CHUNKSIZE]=4; // Leaves
								}
							}
						}
						for (let k = height + 3; k < height + 5; k++) {
							for (let a = -2; a < 3; a++) {
								for (let b = -1; b < 2; b++) {
									world.setBlock(i + b + x * CHUNKSIZE, k + y * CHUNKSIZE, j + a + z * CHUNKSIZE, 4, false);
									//chunk.data[(j+a) + (i+b)*CHUNKSIZE*CHUNKSIZE+k*CHUNKSIZE]=4; // Leaves
								}
							}
							for (let a = -1; a < 2; a++) {
								for (let b = -2; b < 3; b++) {
									world.setBlock(i + b + x * CHUNKSIZE, k + y * CHUNKSIZE, j + a + z * CHUNKSIZE, 4, false);
									//chunk.data[(j+a) + (i+b)*CHUNKSIZE*CHUNKSIZE+k*CHUNKSIZE]=4; // Leaves
								}
							}
						}
						for (let k = height + 1; k < height + 6; k++) {
							world.setBlock(i + x * CHUNKSIZE, k + y * CHUNKSIZE, j + z * CHUNKSIZE, 3, false);
							//chunk.data[j + i*CHUNKSIZE*CHUNKSIZE+k*CHUNKSIZE]=3; // Logs
						}
					}
				}
			}
		}
	}

	/*for (let i = 0;i<20;i++){
		chunk.data[Math.floor(Math.random()*4096)]=1;
	}*/
});

const FRICTION = .50;
const AIRFRICTION = .995;
let SPEED = .1;
let onGround = false;
let currentBlock = 4;
let flying = true;
let rapid = false;
function colliding() {
	let m = Math.max(
		world.getBlock(cam.x - .4, cam.y - .4, cam.z - .4),
		world.getBlock(cam.x - .4, cam.y - .4, cam.z + .4),
		world.getBlock(cam.x - .4, cam.y + .4, cam.z - .4),
		world.getBlock(cam.x - .4, cam.y + .4, cam.z + .4),
		world.getBlock(cam.x + .4, cam.y - .4, cam.z - .4),
		world.getBlock(cam.x + .4, cam.y - .4, cam.z + .4),
		world.getBlock(cam.x + .4, cam.y + .4, cam.z - .4),
		world.getBlock(cam.x + .4, cam.y + .4, cam.z + .4),
		world.getBlock(cam.x, cam.y, cam.z)
	)
	cam.y -= 1;
	m = Math.max(
		m,
		world.getBlock(cam.x - .4, cam.y - .4, cam.z - .4),
		world.getBlock(cam.x - .4, cam.y - .4, cam.z + .4),
		world.getBlock(cam.x - .4, cam.y + .4, cam.z - .4),
		world.getBlock(cam.x - .4, cam.y + .4, cam.z + .4),
		world.getBlock(cam.x + .4, cam.y - .4, cam.z - .4),
		world.getBlock(cam.x + .4, cam.y - .4, cam.z + .4),
		world.getBlock(cam.x + .4, cam.y + .4, cam.z - .4),
		world.getBlock(cam.x + .4, cam.y + .4, cam.z + .4),
		world.getBlock(cam.x, cam.y, cam.z)
	)
	cam.y += 1;
	return m > 0;
}
function placeBlock() {
	let x, y, z, dx, dy, dz;
	x = cam.x;
	y = cam.y;
	z = cam.z;
	dx = Math.sin(cam.xzrot);
	dz = -Math.cos(cam.xzrot);
	dy = -Math.sin(cam.yzrot);
	dx *= Math.cos(cam.yzrot);
	dz *= Math.cos(cam.yzrot);
	dx *= .01;
	dy *= .01;
	dz *= .01;
	for (let i = 0; i < 10000; i++) {
		x += dx;
		y += dy;
		z += dz;
		if (world.getBlock(x, y, z) > 0) {
			x -= dx;
			y -= dy;
			z -= dz;
			world.setBlock(x, y, z, currentBlock);
			if (colliding()) {
				world.setBlock(x, y, z, 0);
			}


			return;
		}
	}

}
function destroyBlock() {
	let x, y, z, dx, dy, dz;
	x = cam.x;
	y = cam.y;
	z = cam.z;
	dx = Math.sin(cam.xzrot);
	dz = -Math.cos(cam.xzrot);
	dy = -Math.sin(cam.yzrot);
	dx *= Math.cos(cam.yzrot);
	dz *= Math.cos(cam.yzrot);
	dx *= .01;
	dy *= .01;
	dz *= .01;
	for (let i = 0; i < 10000; i++) {
		x += dx;
		y += dy;
		z += dz;
		if (world.getBlock(x, y, z) > 0 && (world.getBlock(x, y, z) != 9 || flying)) {
			world.setBlock(x, y, z, 0);
			return;
		}
	}
}
function getBlock() {
	let x, y, z, dx, dy, dz;
	x = cam.x;
	y = cam.y;
	z = cam.z;
	dx = Math.sin(cam.xzrot);
	dz = -Math.cos(cam.xzrot);
	dy = -Math.sin(cam.yzrot);
	dx *= Math.cos(cam.yzrot);
	dz *= Math.cos(cam.yzrot);
	dx *= .01;
	dy *= .01;
	dz *= .01;
	for (let i = 0; i < 10000; i++) {
		x += dx;
		y += dy;
		z += dz;
		if (world.getBlock(x, y, z) > 0) {
			currentBlock = world.getBlock(x, y, z)
			updateCurrent()
			return;
		}
	}
}
const monsterA = {
	x: 15, y: 15, z: 15
}
let spaceLast = 0;
function drawScene(gl, programInfo, buffers, deltaTime) {
	displayFrameRate();

	adjustSize(gl);
	clearGL(gl);
	if (keys.has("ControlLeft")) {
		SPEED = 1;
	}
	else {
		SPEED = .1;
	}
	if (!onGround && !flying) {
		SPEED *= .1;
	}
	if (flying) {
		SPEED *= 2;
	}
	if (keys.has("ShiftLeft")) {
		if (keys.has("Space")) {
			SPEED *= .1;
		}
		cam.dy -= SPEED;

	}

	if (keys.has("KeyW")) {
		cam.dz -= SPEED * Math.cos(cam.xzrot);
		cam.dx += SPEED * Math.sin(cam.xzrot);
	}
	if (keys.has("KeyA")) {
		cam.dx -= SPEED * Math.cos(cam.xzrot);
		cam.dz -= SPEED * Math.sin(cam.xzrot);
	}
	if (keys.has("KeyS")) {
		cam.dz += SPEED * Math.cos(cam.xzrot);
		cam.dx -= SPEED * Math.sin(cam.xzrot);
	}
	if (keys.has("KeyD")) {
		cam.dx += SPEED * Math.cos(cam.xzrot);
		cam.dz += SPEED * Math.sin(cam.xzrot);
	}
	if (((mouseButtons & 1) && rapid) || newMouseButtons & 1) {
		destroyBlock();
	}
	if (((mouseButtons & 2) && rapid) || newMouseButtons & 2) {
		placeBlock();
	}
	if (mouseButtons & 4) {
		getBlock();
	}

	if (keys.has("Space") && (onGround || flying)) {
		if (flying) {
			cam.dy += SPEED;
		}
		else {
			cam.dy = .5;
		}

	}




	const projectionMatrix = glMatrix.mat4.create();
	cameraMatrices(gl, projectionMatrix)

	const cameraMatrix = glMatrix.mat4.create();
	glMatrix.mat4.rotate(cameraMatrix, cameraMatrix, cam.yzrot, [1, 0, 0]);
	glMatrix.mat4.rotate(cameraMatrix, cameraMatrix, cam.xzrot, [0, 1, 0]);
	glMatrix.mat4.translate(cameraMatrix, cameraMatrix, [-cam.x, -cam.y, -cam.z]);

	howtodraw(gl, programInfo, buffers, projectionMatrix,);
	world.removePlayerTickets();
	for (let x = -1; x < 2; x++) {
		for (let y = -3; y < 3; y++) {
			for (let z = -1; z < 2; z++) {
				const chunk = world.getBlockChunk(cam.x + x * CHUNKSIZE, cam.y + y * CHUNKSIZE, cam.z + z * CHUNKSIZE);
				chunk.draw(gl, programInfo, cameraMatrix, buffers);
				chunk.playerTicket = true;
			}
		}
	}
	world.clearChunks();
	useBlock(gl, programInfo, buffers, 1)
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.modelViewMatrix,
		false,
		cameraMatrix); {
		const vertexCount = 36;
		const type = gl.UNSIGNED_SHORT;
		const offset = 0;
		gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
	}
	useBlock(gl, programInfo, buffers, 8)
	const modelViewMatrix = glMatrix.mat4.create();
	glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [monsterA.x, monsterA.y, monsterA.z]);
	glMatrix.mat4.multiply(modelViewMatrix, cameraMatrix, modelViewMatrix);
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.modelViewMatrix,
		false,
		cameraMatrix); {
		const vertexCount = 36;
		const type = gl.UNSIGNED_SHORT;
		const offset = 0;
		gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
	}


	cam.x += cam.dx;
	if (colliding()) {
		cam.x -= cam.dx;
		cam.dx = 0;
	}
	cam.y += cam.dy;
	if (colliding()) {
		if (cam.dy < -.2) {
			const id = world.getBlock(cam.x, cam.y - 1.4, cam.z);
			if (id == 6) {
				world.setBlock(cam.x, cam.y - 1.4, cam.z, 0)
			}
		}
		onGround = true;
		cam.y -= cam.dy;
		cam.dy = 0;
	}
	else {
		onGround = false;
	}
	cam.z += cam.dz;
	if (colliding()) {
		cam.z -= cam.dz;
		cam.dz = 0;
	}
	if (onGround || flying) {
		cam.dx *= FRICTION;
		cam.dy *= FRICTION;
		cam.dz *= FRICTION;
	} else {
		cam.dx *= AIRFRICTION;
		cam.dy *= AIRFRICTION;
		cam.dz *= AIRFRICTION;
	}
	if (!flying) {
		cam.dy -= .1;
	}

	if (keys.has("KeyQ")) {
		world.setBlock(cam.x, cam.y - 1, cam.z, 1);
	}
	if (keys.has("KeyE")) {
		world.setBlock(cam.x, cam.y - 1, cam.z, 0);
	}
	if (newkeys.has("Space")) {
		let now = Date.now();
		if (now - spaceLast < 300) {
			flying = !flying;
			spaceLast = 0;
		}
		else {
			spaceLast = now;
		}
	}
	if (newkeys.has("KeyL")) {
		upload().then((d) => {
			localStorage.clear()
			const data = JSON.parse(d);
			Object.keys(data).forEach(function (key) {
				//const key = localStorage.key(i)
				const keysp = key.split(",");
				const x = keysp[0];
				const y = keysp[1];
				const z = keysp[2];
				const value = data[key];
				const compress = value.split(",");
				const out = []
				for (let v of compress) {
					const sp = v.split("|");
					if (sp.length > 1) {
						const v2a = parseInt(sp[2])
						for (let i = 0; i < sp[1]; i++) {
							out.push(v2a);
						}
					}
					else {
						const v2a = parseInt(sp[0])
						out.push(v2a);
					}
				}
				data[key] = out.join(",");
				const chunk = new Chunk(x, y, z);
				const identifier = x + "," + y + "," + z;
				world.loadedChunks[identifier] = chunk;
				chunk.data = new Uint8Array(out);
				chunk.dirty = true;
				chunk.empty = false;
				chunk.generated = true;
			})
		})
	}
	if (newkeys.has("KeyK")) {
		const data = {};
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i)
			const value = localStorage.getItem(key);
			const compress = value.split(",");
			const out = []
			let prev = ""
			let count = 0;
			for (let v of compress) {
				if (v == prev) {
					count += 1;
				} else {
					if (count == 1) {
						out.push(prev)
					} else if (count > 1) {
						out.push("|" + count + "|" + prev)
					}
					prev = v
					count = 1
				}
			}
			if (count == 1) {
				out.push(prev)
			} else if (count > 1) {
				out.push("|" + count + "|" + prev)
			}
			data[key] = out.join(",");

		}
		downloadFile(data, "world.json");
	}
	if (newkeys.has("KeyR")) {
		rapid = !rapid;
	}
	newMouseButtons = 0;
	newkeys.clear()
}






document.body.addEventListener("keydown", event => {
	if (!keys.has(event.code)) {
		newkeys.add(event.code);
	}
	keys.add(event.code);
	const Exceptions = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "KeyR"]);
	if (Exceptions.has(event.code)) {
		event.preventDefault();
	}

})
document.body.addEventListener("keyup", event => {
	keys.delete(event.code);
	const Exceptions = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "KeyR"]);
	if (Exceptions.has(event.code)) {
		event.preventDefault();
	}
})
document.body.addEventListener("mousemove", event => {
	if (document.pointerLockElement == canvas) {
		cam.xzrot += event.movementX / 800;
		cam.yzrot += event.movementY / 800;
	}
})
const circle = document.getElementById("circle");
function updateCurrent() {
	const colors = [
		[],
		[0.0, 0.6, 0.0, 1.0], // grass
		[0.65, 0.65, 0.65, 1.0], // stone
		[109 / 255, 81 / 255, 6 / 255, 1.0], // log
		[60 / 255, 199 / 255, 0 / 255, 0.8], // leaves

		[0.88, 0.65, 0.06, 1.0], // Orange
		[0.06, 0.65, 0.88, 1.0], // Teal
		[0.0, 0.1, 0.76, 0.8], // Water
		[0.88, 0.12, 0.06, 1.0], // Red
		[0.08, 0.12, 0.15, 1.0], // Bedrock
	]
	currentBlock -= 1;
	currentBlock %= 9;
	currentBlock += 9;
	currentBlock %= 9;
	currentBlock += 1;
	const attempt = "rgb(" + Math.floor(colors[currentBlock][0] * 255) + "," + Math.floor(colors[currentBlock][1] * 255) + "," + Math.floor(colors[currentBlock][2] * 255) + ")";
	circle.style.backgroundColor = attempt;
}
document.body.addEventListener('wheel', event => {
	let d = 0;
	if (event.deltaY > 0) {
		d = 1;
	}
	else {
		d = -1;
	}
	currentBlock += d;

	updateCurrent()
})
document.body.addEventListener("mouseup", event => {
	mouseButtons = event.buttons;

})
document.body.addEventListener("mousedown", event => {
	newMouseButtons = event.buttons;
	mouseButtons = event.buttons;
})
document.body.addEventListener("click", event => {
	canvas.requestPointerLock();

})
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
	e.preventDefault();
	deferredPrompt = e;
});
const touchListener = TouchListener(canvas);
touchListener.addEventListener('taps', (touch) => {
	if (touch.startX < canvas.width * 1 / 4 && touch.startY < canvas.height * 1 / 4) {
		console.log("install");
		deferredPrompt.prompt();
		deferredPrompt.userChoice.then((choiceResult) => {
			if (choiceResult.outcome === 'accepted') {
				console.log('Added to home screen');
			}
			deferredPrompt = null;
		});
		return
	}
})
touchListener.addEventListener('new', touch => {
	if (touch.startX > canvas.width * 3 / 4 && touch.startY < canvas.height * 1 / 4) {
		currentBlock += 1;
		console.log("switch");
		updateCurrent()
	}
	if (touch.startX > canvas.width * 3 / 4 && touch.startY > canvas.height * 3 / 4) {
		newMouseButtons |= 1
		mouseButtons |= 1
		console.log("destroy");
		touch.addEventListener('end', () => {
			mouseButtons &= ~1
		})
	}
	if (touch.startX > canvas.width * 3 / 4 && touch.startY > canvas.height * 2 / 4 && touch.startY < canvas.height * 3 / 4) {
		newMouseButtons |= 2
		mouseButtons |= 2
		touch.addEventListener('end', () => {
			mouseButtons &= ~2
		})
		console.log("place");
	}
	// Only use height for square
	if (touch.startX < canvas.height / 2 && touch.startY > canvas.height / 2) {
		console.log("move");
		touch.addEventListener('update', () => {
			const rawAngle = Math.atan2(-touch.currentY + canvas.height * 3 / 4, touch.currentX - canvas.height * 1 / 4)
			const shifted = rawAngle * 2 / Math.PI + .5;
			const dir = Math.floor(((shifted % 4) + 4) % 4)
			const code = ["KeyD", "KeyW", "KeyA", "KeyS"][dir]
			if (!keys.has(code)) {
				newkeys.add(code);
			}
			keys.delete("KeyD")
			keys.delete("KeyW")
			keys.delete("KeyA")
			keys.delete("KeyS")
			keys.add(code);

		})
		touch.addEventListener('end', () => {
			keys.delete("KeyD")
			keys.delete("KeyW")
			keys.delete("KeyA")
			keys.delete("KeyS")
		})
		return
	}
	touch.addEventListener('update', () => {
		if (touch.path.length < 2) {
			return
		}
		cam.xzrot += (touch.currentX - touch.path[touch.path.length - 2][0]) / 100;
		cam.yzrot += (touch.currentY - touch.path[touch.path.length - 2][1]) / 100;
	})
})
main();