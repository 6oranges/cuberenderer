import init, { calc_colors, compress, start } from "./rust-rendering/rendering.js";
/*init().then(() => {
	let arr = new Uint8Array(8);
	arr[0] = 1
	console.log(compress(arr))
	arr[1] = 2
	console.log(compress(arr))
	arr[2] = 3
	console.log(compress(arr))
	arr[3] = 4
	console.log(compress(arr))
	arr[4] = 5
	console.log(compress(arr))
	arr[5] = 6
	console.log(compress(arr))
	arr[6] = 7
	console.log(compress(arr))
	arr[7] = 8
	console.log(compress(arr))
});*/
const keys = new Set();
const newkeys = new Set();
let mouseButtons = 0;
const track = {};
let newMouseButtons = 0;
let GlobalGL;
const canvas = document.querySelector('#canvas');
const trackcanvas = document.querySelector('#trackcanvas');
const canvas2d = document.querySelector('#canvas2d');
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
	GlobalGL = gl;
	if (!gl) {
		alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}
	var ext = gl.getExtension('OES_element_index_uint');
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
		//gl_FragColor = vec4(0,0,0,1);
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
		requestAnimationFrame(render);
		drawScene(gl, programInfo, buffers, deltaTime);


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
	let positions = [];
	for (let x = 0; x < CHUNKSIZE + 1; x++) {
		for (let y = 0; y < CHUNKSIZE + 1; y++) {
			for (let z = 0; z < CHUNKSIZE + 1; z++) {
				for (let c = 0; c < 24; c++) {
					positions.push(-CHUNKSIZED2 - .5 + x)
					positions.push(-CHUNKSIZED2 - .5 + y)
					positions.push(-CHUNKSIZED2 - .5 + z)
				}
			}
		}
	}
	console.log(positions)
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


	return {
		position: positionBuffer,
		colors: colorBuffers,
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
	//useBlock(gl, programInfo, buffers)


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
	const amount = 1;
	var displayWidth = canvas.clientWidth;
	var displayHeight = canvas.clientHeight;

	// Check if the canvas is not the same size.
	if (canvas.width != displayWidth * amount ||
		canvas.height != displayHeight * amount) {

		// Make the canvas the same size
		canvas.width = displayWidth * amount;
		canvas.height = displayHeight * amount;
		trackcanvas.width = displayWidth * amount;
		trackcanvas.height = displayHeight * amount;
		canvas2d.width = displayWidth * amount;
		canvas2d.height = displayHeight * amount;
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
		displayFrameRate.element.innerText = "3  " + displayFrameRate.frames + " (" + Math.round(cam.x) + "," + Math.round(cam.y) + "," + Math.round(cam.z) + ") " + setCounter;
		displayFrameRate.frames = 0;
	}
	displayFrameRate.frames += 1;
	setCounter = 0
}
function cameraMatrices(gl, projectionMatrix) {
	const fieldOfView = 45 * Math.PI / 180; // in radians
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 1000.0;
	glMatrix.mat4.perspective(projectionMatrix,
		fieldOfView,
		aspect,
		zNear,
		zFar);
}
var db;
{
	var request = window.indexedDB.open("cubes", 1);

	request.onerror = function (event) {
		console.log("error: ");
	};

	request.onsuccess = function (event) {
		db = request.result;
		console.log("success: " + db);
	};

	request.onupgradeneeded = function (event) {
		var db = event.target.result;
		db.createObjectStore("chunks", { keyPath: "xyz" });
	}
}


function read(identifier) {
	return new Promise((resolve, reject) => {
		var transaction = db.transaction(["chunks"]);
		var objectStore = transaction.objectStore("chunks");
		var request = objectStore.get(identifier);

		request.onerror = function (event) {
			alert("Unable to retrieve daa from database!");
			reject();
		};

		request.onsuccess = function (event) {
			// Do something with the request.result!
			if (request.result) {
				resolve(request.result);
			} else {
				reject();
			}
		};
	})
}

function add(identifier, data) {
	var request = db.transaction(["chunks"], "readwrite")
		.objectStore("chunks")
		.put({ xyz: identifier, data: data });

	request.onsuccess = function (event) {
	};

	request.onerror = function (event) {
	}
}
const CHUNKSIZE = 16;
const CHUNKSIZED2 = Math.floor(CHUNKSIZE / 2);
class Chunk {
	constructor(x = 0, y = 0, z = 0) {
		this.x = x * CHUNKSIZE;
		this.y = y * CHUNKSIZE;
		this.z = z * CHUNKSIZE;
		this.dirty = false;
		this.empty = true;
		this.generated = false;
		this.playerTicket = false;
		//this.matrices = [];
		this.cachedBuffer = null;
		this.colors = null;
		this.verts = 0;
		this.posmatrix = glMatrix.mat4.create();
		glMatrix.mat4.translate(this.posmatrix, this.posmatrix, [this.x, this.y, this.z]);
		//this.matrices.push(glMatrix.mat4.clone(modelViewMatrix));
		/*let i = 0;
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
		}*/
	}
	updateBuffer() {
		if (this.empty || this.data.length < CHUNKSIZE * CHUNKSIZE * CHUNKSIZE) {
			return;
		}
		const gl = GlobalGL;
		// Build the element array buffer; this specifies the indices
		// into the vertex arrays for each face's vertices.

		this.cachedBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cachedBuffer);

		// This array defines each face as two triangles, using the
		// indices into the vertex array to specify each triangle's
		// position.

		const indices = compress(this.data);
		this.verts = indices.length;

		// Now send the element array to GL

		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
			new Uint32Array(indices), gl.STATIC_DRAW);




		this.colors = gl.createBuffer();
		const colors = calc_colors(this.data);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.colors);
		gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
	}
	draw(gl, programInfo, cameraMatrix, buffers) {
		if (this.empty || this.verts < 2) {
			return;
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cachedBuffer);
		const modelViewMatrix = glMatrix.mat4.create();
		glMatrix.mat4.multiply(modelViewMatrix, cameraMatrix, this.posmatrix);
		{
			const numComponents = 4;
			const type = gl.FLOAT;
			const normalize = false;
			const stride = 0;
			const offset = 0;
			gl.bindBuffer(gl.ARRAY_BUFFER, this.colors);
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
		gl.uniformMatrix4fv(
			programInfo.uniformLocations.modelViewMatrix,
			false,
			modelViewMatrix);
		{
			const vertexCount = this.verts;
			const type = gl.UNSIGNED_INT;
			const offset = 0;
			gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
		}
	}

}
class Chunks {
	constructor() {
		this.loadedChunks = {};
		this.recurse = 0;
		this.generater = new Worker('background.js');
		this.generater.onmessage = (e) => {
			requestIdleCallback(() => {
				const identifier = e.data.x + "," + e.data.y + "," + e.data.z;
				this.loadedChunks[identifier].generated = true;
				this.loadedChunks[identifier].data = e.data.data;
				if (!e.data.empty) {
					this.loadedChunks[identifier].empty = false;
					this.loadedChunks[identifier].updateBuffer();
				}

			})


		}
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
				c.updateBuffer();
				const identifier = Math.round(c.x / CHUNKSIZE) + "," + Math.round(c.y / CHUNKSIZE) + "," + Math.round(c.z / CHUNKSIZE);
				add(identifier, c.data);
				c.dirty = false;
			}
			if (c.generated && !c.playerTicket) {
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
			this.generater.postMessage([x, y, z, identifier]);
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
		if (chunk.generated) {
			return chunk.data[this.getBlockIndex(x, y, z)];
		} else {
			return 9;
		}
	}
	setBlock(x = 0, y = 0, z = 0, value = 0) {
		setCounter += 1
		x = Math.round(x);
		y = Math.round(y);
		z = Math.round(z);
		const chunk = this.getBlockChunk(x, y, z);
		if (!chunk.generated) {
			return;
		}
		chunk.dirty = true;
		chunk.empty = false;
		chunk.data[this.getBlockIndex(x, y, z)] = value;
	}
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
const world = new Chunks()

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
const INTERACTDISTANCE = 10000;
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
	for (let i = 0; i < INTERACTDISTANCE; i++) {
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
	if (false) {
		x -= dx * 200;
		y -= dy * 200;
		z -= dz * 200;
		world.setBlock(x, y, z, currentBlock);
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
	for (let i = 0; i < INTERACTDISTANCE; i++) {
		x += dx;
		y += dy;
		z += dz;
		if (world.getBlock(x, y, z) == 9 && !flying) {
			return;
		}
		if (world.getBlock(x, y, z) > 0) {
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
	for (let i = 0; i < INTERACTDISTANCE; i++) {
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

	const projectionMatrix = glMatrix.mat4.create();
	cameraMatrices(gl, projectionMatrix)

	const cameraMatrix = glMatrix.mat4.create();
	glMatrix.mat4.rotate(cameraMatrix, cameraMatrix, cam.yzrot, [1, 0, 0]);
	glMatrix.mat4.rotate(cameraMatrix, cameraMatrix, cam.xzrot, [0, 1, 0]);
	glMatrix.mat4.translate(cameraMatrix, cameraMatrix, [-cam.x, -cam.y, -cam.z]);

	howtodraw(gl, programInfo, buffers, projectionMatrix,);
	world.removePlayerTickets();
	for (let x = -6; x < 6; x++) {
		for (let y = -4; y < 4; y++) {
			for (let z = -6; z < 6; z++) {
				const chunk = world.getBlockChunk(cam.x + x * CHUNKSIZE, cam.y + y * CHUNKSIZE, cam.z + z * CHUNKSIZE);
				chunk.draw(gl, programInfo, cameraMatrix, buffers);
				chunk.playerTicket = true;
			}
		}
	}
	world.clearChunks();
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
	/*
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
	}*/
	if (newkeys.has("KeyR")) {
		rapid = !rapid;
	}
	newMouseButtons = 0;
	newkeys.clear()
	updateTrack(canvas.height / 4);
	drawPad();
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
const touchListener = TouchListener(trackcanvas);
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
const trackctx = trackcanvas.getContext("2d");
const ctx2d = canvas2d.getContext("2d");
function draw3rdSquare(x, y) {
	trackctx.beginPath();
	trackctx.rect(x, y, track.third, track.third);
	trackctx.fill();
}
function drawPad() {
	trackctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx2d.clearRect(0, 0, canvas.width, canvas.height);
	ctx2d.globalCompositeOperation = "source-over";
	ctx2d.beginPath();
	ctx2d.rect(track.left, track.middleY, track.radius, track.radius);
	if (keys.has("ShiftLeft")) {
		ctx2d.fillStyle = "#3336";
	} else {
		ctx2d.fillStyle = "#BBB6";
	}
	ctx2d.fill();
	ctx2d.globalCompositeOperation = "destination-out";
	ctx2d.fillStyle = "#000";
	ctx2d.lineWidth = 20;
	ctx2d.beginPath();
	ctx2d.arc(track.middleX, track.middleY, track.radius, 0, Math.PI * 2);
	ctx2d.stroke();
	ctx2d.fill();


	trackctx.globalCompositeOperation = "source-over";
	trackctx.fillStyle = "#BBB6"
	trackctx.beginPath();
	trackctx.arc(track.middleX, track.middleY, track.radius, 0, Math.PI * 2);
	trackctx.fill();
	trackctx.globalCompositeOperation = "source-atop";
	trackctx.fillStyle = "#3336"
	if (keys.has("KeyW")) {
		draw3rdSquare(track.X3A, track.top);
		if (keys.has("KeyA")) {
			draw3rdSquare(track.left, track.top);
		}
		if (keys.has("KeyD")) {
			draw3rdSquare(track.X3B, track.top);
		}
	}
	if (keys.has("KeyS")) {
		draw3rdSquare(track.X3A, track.Y3B);
		if (keys.has("KeyA")) {
			draw3rdSquare(track.left, track.Y3B);
		}
		if (keys.has("KeyD")) {
			draw3rdSquare(track.X3B, track.Y3B);
		}
	}
	if (keys.has("KeyA")) {
		draw3rdSquare(track.left, track.Y3A);
	}
	if (keys.has("KeyD")) {
		draw3rdSquare(track.X3B, track.Y3A);
	}
	if (keys.has("Space")) {
		draw3rdSquare(track.X3A, track.Y3A);
	}

	trackctx.globalCompositeOperation = "destination-out";
	trackctx.lineWidth = 10;
	trackctx.beginPath();
	trackctx.moveTo(track.X3A, track.top);
	trackctx.lineTo(track.X3A, track.bottom);
	trackctx.stroke();
	trackctx.beginPath();
	trackctx.moveTo(track.X3B, track.top);
	trackctx.lineTo(track.X3B, track.bottom);
	trackctx.stroke();
	trackctx.beginPath();
	trackctx.moveTo(track.left, track.Y3A);
	trackctx.lineTo(track.right, track.Y3A);
	trackctx.stroke();
	trackctx.beginPath();
	trackctx.moveTo(track.left, track.Y3B);
	trackctx.lineTo(track.right, track.Y3B);
	trackctx.stroke();

	trackctx.globalCompositeOperation = "source-over";
}
function updateTrack(radius) {
	track.radius = radius;
	track.left = 0;
	track.right = track.left + track.radius * 2;
	track.bottom = canvas.height;
	track.top = track.bottom - track.radius * 2;
	track.middleX = track.left + track.radius;
	track.middleY = track.top + track.radius;
	track.third = track.radius * 2 / 3
	track.X3A = track.left + track.third;
	track.X3B = track.left + track.third * 2;
	track.Y3A = track.top + track.third;
	track.Y3B = track.top + track.third * 2;

}
let mostrecentmovingtouch = null;
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
	updateTrack(canvas.height / 4);
	if (touch.startX < track.right && touch.startY > track.top && touch.startX > track.left && touch.startY < track.bottom) {
		const ty = (track.middleY - touch.startY);
		const tx = (track.middleX - touch.startX);
		const d2 = tx * tx + ty * ty;
		if (d2 <= track.radius * track.radius) {
			mostrecentmovingtouch = touch;
			if (
				touch.startX > track.X3A &&
				touch.startX < track.X3B &&
				touch.startY > track.Y3A &&
				touch.startY < track.Y3B) {
				keys.add("Space");
				newkeys.add("Space");
			}
			console.log("jumpmove");
			touch.addEventListener('update', () => {
				if (touch.path.length > 1) {
					const previousX = touch.path[touch.path.length - 2][0];
					const previousY = touch.path[touch.path.length - 2][1];
					if (previousX > track.X3B) {
						keys.delete("KeyD");
					}
					if (previousX < track.X3A) {
						keys.delete("KeyA");
					}
					if (previousY > track.Y3B) {
						keys.delete("KeyS");
					}
					if (previousY < track.Y3A) {
						keys.delete("KeyW");
					}
				}

				if (touch.currentX > track.X3B) {
					keys.add("KeyD");
				}
				if (touch.currentX < track.X3A) {
					keys.add("KeyA");
				}
				if (touch.currentY > track.Y3B) {
					keys.add("KeyS");
				}
				if (touch.currentY < track.Y3A) {
					keys.add("KeyW");
				}

			})
			touch.addEventListener('end', () => {
				if (touch.currentX > track.X3B) {
					keys.delete("KeyD");
				}
				if (touch.currentX < track.X3A) {
					keys.delete("KeyA");
				}
				if (touch.currentY > track.Y3B) {
					keys.delete("KeyS");
				}
				if (touch.currentY < track.Y3A) {
					keys.delete("KeyW");
				}
				if (touch === mostrecentmovingtouch) {
					keys.delete("Space")
				}
			})
			return
		}
		if (touch.startX < track.middleX && touch.startY > track.middleY) {
			keys.add("ShiftLeft");
			touch.addEventListener('end', () => {
				keys.delete("ShiftLeft");
			})

			return;
		}


	}
	touch.addEventListener('update', () => {
		if (touch.path.length < 2) {
			return
		}
		cam.xzrot += (touch.currentX - touch.path[touch.path.length - 2][0]) / 100;
		cam.yzrot += (touch.currentY - touch.path[touch.path.length - 2][1]) / 100;
	})
})
init().then(() => {
	const arr = new Uint8Array(CHUNKSIZE * CHUNKSIZE * CHUNKSIZE);
	arr[0] = 1;
	console.log(calc_colors(arr));
	start();
	main();
})