let gl, canvas, aspect_ratio, glProgram, fragmentShader, vertexShader;
let aPos, aNormal;
let style;
let teapotMesh, positionBuffer, indexBuffer, wireframeBuffer, normalBuffer;

const TARGET_ASPECT = 1.0;
const WIREFRAME = true;

function makeShader(source, type) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

function initShaders() {
    let vertex_shader_source = document.getElementById("vertex-shader").innerHTML;
    let fragment_shader_source = document.getElementById("fragment-shader").innerHTML;

    vertexShader = makeShader(vertex_shader_source, gl.VERTEX_SHADER);
    fragmentShader = makeShader(fragment_shader_source, gl.FRAGMENT_SHADER);

    glProgram = gl.createProgram();

    gl.attachShader(glProgram, vertexShader);
    gl.attachShader(glProgram, fragmentShader);
    gl.linkProgram(glProgram);

    gl.useProgram(glProgram);
}

function setupBuffers() {
    const teapotText = document.getElementById("teapot-obj").innerHTML;
    teapotMesh = parseOBJ(teapotText);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 
        new Float32Array(teapotMesh.positions), gl.STATIC_DRAW);

    normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(teapotMesh.normals), gl.STATIC_DRAW);

    if(WIREFRAME == true) {
        wireframeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireframeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(teapotMesh.wireframeIndices), gl.STATIC_DRAW);
    } else {
        indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(teapotMesh.indices), gl.STATIC_DRAW);
    }
}

function generateWireframeIndices(triangleIndices) {
    const edges = new Set();
    const wireframeIndices = [];

    for (let i = 0; i < triangleIndices.length; i += 3) {
        const a = triangleIndices[i];
        const b = triangleIndices[i + 1];
        const c = triangleIndices[i + 2];

        function addEdge(i1, i2) {
            const edge = i1 < i2 ? `${i1}-${i2}` : `${i2}-${i1}`;
            if (!edges.has(edge)) {
                edges.add(edge);
                wireframeIndices.push(i1, i2);
            }
        }

        addEdge(a, b);
        addEdge(b, c);
        addEdge(c, a);
    }

    return wireframeIndices;
}

function parseOBJ(text) {
    const positions = [];
    const texcoords = [];
    const normals = [];
    const indices = [];

    const finalPositions = [];
    const finalTexcoords = [];
    const finalNormals = [];
    const indexMap = new Map();

    const lines = text.split('\n');

    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length === 0) continue;

        switch (parts[0]) {
            case 'v':
                positions.push(parts.slice(1).map(Number));
                break;
            case 'vt':
                texcoords.push(parts.slice(1).map(Number));
                break;
            case 'vn':
                normals.push(parts.slice(1).map(Number));
                break;
            case 'f':
                for (let i = 1; i <= 3; i++) {
                    const [v, vt, vn] = parts[i].split('/').map(str => parseInt(str, 10) - 1);
                    const key = `${v}/${vt}/${vn}`;
                    if (!indexMap.has(key)) {
                        finalPositions.push(...positions[v]);
                        if (texcoords[vt]) finalTexcoords.push(...texcoords[vt]);
                        if (normals[vn]) finalNormals.push(...normals[vn]);
                        indexMap.set(key, finalPositions.length / 3 - 1);
                    }
                    indices.push(indexMap.get(key));
                }
                break;
        }
    }

    const wireframeIndices = generateWireframeIndices(indices);
    return {
        positions: finalPositions,
        texcoords: finalTexcoords,
        normals: finalNormals,
        indices: indices,
        wireframeIndices: wireframeIndices,
    };
}

function drawScene() {
    aPos = gl.getAttribLocation(glProgram, "a_pos");
    aNormal = gl.getAttribLocation(glProgram, "a_normal");

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.enableVertexAttribArray(aNormal);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);

    if(WIREFRAME == true) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireframeBuffer);
    } else {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    }
}

function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    aspect_ratio = canvas.width / canvas.height;

    let width, height;
    if (aspect_ratio > TARGET_ASPECT) {
        height = window.innerHeight;
        width = height * TARGET_ASPECT;
    } else {
        width = window.innerWidth;
        height = width / TARGET_ASPECT;
    }

    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    gl.viewport(0, 0, canvas.width, canvas.height);
    drawScene();
}

function parseCSSColor(cssColor) {
  const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);

  if (!match) {
    return [0, 0, 0, 1];
  }

  const r = parseInt(match[1], 10) / 255;
  const g = parseInt(match[2], 10) / 255;
  const b = parseInt(match[3], 10) / 255;
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

  return [r, g, b, a];
}

let timeLast, frames;
function render() {
    const time = performance.now()/1000; // in ms

    if((time - timeLast) > 1) {
        const fps_div = document.getElementById("fps");
        fps_div.innerHTML = frames;

        timeLast = performance.now()/1000;
        frames = 0;
    }

    frames++;

    const uTransform = gl.getUniformLocation(glProgram, "u_transform");
    const uNormalMatrix = gl.getUniformLocation(glProgram, "u_normal_matrix");

    const uLightDirection = gl.getUniformLocation(glProgram, "u_light_dir");
    const uLightColor = gl.getUniformLocation(glProgram, "u_light_color");
    const uObjectColor = gl.getUniformLocation(glProgram, "u_object_color");
    const uAmbientLightColor = gl.getUniformLocation(glProgram, "u_ambient_color");

    gl.uniform3fv(uLightDirection, glMatrix.vec3.normalize([], [0.0, 1.0, 0.0]));
    gl.uniform3fv(uLightColor, [1.0, 1.0, 1.0]);
    gl.uniform3fv(uObjectColor, [1.0, 0.0, 0.0]);
    gl.uniform3fv(uAmbientLightColor, [0.10, 0.10, 0.10]);

    const modelMatrix = glMatrix.mat4.create();

    glMatrix.mat4.translate(modelMatrix, modelMatrix, [-.01, 0, 0]);
    glMatrix.mat4.rotate(modelMatrix, modelMatrix, -time*0.250, [0, 1, 0]);
    glMatrix.mat4.translate(modelMatrix, modelMatrix, [0.08, 0, 0]);
    glMatrix.mat4.scale(modelMatrix, modelMatrix, [.075, .075, .075]);

    const viewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.lookAt(viewMatrix,
        [0, 4, 4], // position
        [0, 0, 0], // target
        [0, 1, 0]  // up vector
    );

    const projectionMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projectionMatrix,
        Math.PI/5, TARGET_ASPECT, 0.1, 100.0);

    const modelViewMatrix = glMatrix.mat4.create();
    const modelViewProjectionMatrix = glMatrix.mat4.create();
    glMatrix.mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
    glMatrix.mat4.multiply(modelViewProjectionMatrix, projectionMatrix, modelViewMatrix);

    const normalMatrix = glMatrix.mat3.create();
    glMatrix.mat3.normalFromMat4(normalMatrix, modelMatrix);

    gl.uniformMatrix3fv(uNormalMatrix, false, normalMatrix);
    gl.uniformMatrix4fv(uTransform, false, modelViewProjectionMatrix);

    const [r, g, b, a] = parseCSSColor(style.backgroundColor);
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if(WIREFRAME == true) {
        gl.drawElements(gl.LINES, teapotMesh.wireframeIndices.length, gl.UNSIGNED_SHORT, 0);
    } else {
        gl.drawElements(gl.TRIANGLES, teapotMesh.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(render);
}

function main() {
    canvas = document.getElementById("canvas");
    style = getComputedStyle(document.querySelector('body'));

    gl = canvas.getContext("webgl");
    console.log("[LOG] " + gl.getParameter(gl.VERSION));
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);

    timeLast = performance.now()/1000;
    frames = 0;

    initShaders();
    setupBuffers();

    onResize();
    window.addEventListener('resize', onResize);
}

main();
requestAnimationFrame(render);
