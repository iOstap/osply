<script>
const canvasEl = document.getElementById("canvas-b");
const imgInput = document.querySelector("#image-selector-input");

const params = {
    cursorSize: 2,
    cursorPower: 32,
    distortionPower: 0.4,
};

const pointer = {
    x: 0.65 * window.innerWidth,
    y: 0.5 * window.innerHeight,
    dx: 0,
    dy: 0,
    moved: false,
};

const res = { w: null, h: null };

let outputColor, velocity, divergence, pressure, imageTexture, imgRatio;
let isPreview = true;

const gl = canvasEl.getContext("webgl");
gl.getExtension("OES_texture_float");

const vertexShader = createShader(
    document.getElementById("b-vertShader").textContent,
    gl.VERTEX_SHADER
);

const splatProgram = createProgram("b-fragShaderPoint");
const divergenceProgram = createProgram("b-fragShaderDivergence");
const pressureProgram = createProgram("b-fragShaderPressure");
const gradientSubtractProgram = createProgram("b-fragShaderGradientSubtract");
const advectionProgram = createProgram("b-fragShaderAdvection");
const displayProgram = createProgram("b-fragShaderOutputShader");

resizeCanvas();
initFBOs();
setupEvents();
render();

loadImage("https://cdn.prod.website-files.com/6851445a5f608bdfa876a1e3/68814f4e14c8e66575c1c478_IAM.webp");

window.addEventListener("resize", () => {
    resizeCanvas();
    initFBOs();
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
});

imgInput.onchange = () => {
    const [file] = imgInput.files;
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            loadImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }
};

function setupEvents() {
    canvasEl.addEventListener("click", (e) => {
        isPreview = false;
        updatePointerPosition(e);
    });

    canvasEl.addEventListener("mousemove", (e) => {
        isPreview = false;
        updatePointerPosition(e);
    });

    canvasEl.addEventListener("touchmove", (e) => {
        isPreview = false;
        e.preventDefault();
        updatePointerPosition(e.targetTouches[0]);
    }, { passive: false });
}

function updatePointerPosition(e) {
    const rect = canvasEl.getBoundingClientRect();
    const eX = e.clientX - rect.left;
    const eY = e.clientY - rect.top;

    pointer.moved = true;
    pointer.dx = 6 * (eX - pointer.x);
    pointer.dy = 6 * (eY - pointer.y);
    pointer.x = eX;
    pointer.y = eY;
}

function loadImage(src) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    image.onload = () => {
        imgRatio = image.naturalWidth / image.naturalHeight;
        imageTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    };
}

function createProgram(elId) {
    const shader = createShader(
        document.getElementById(elId).textContent,
        gl.FRAGMENT_SHADER
    );
    const program = createShaderProgram(vertexShader, shader);
    const uniforms = getUniforms(program);
    return {
        program,
        uniforms,
    };
}

function createShaderProgram(vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(
            "Unable to initialize the shader program: " + gl.getProgramInfoLog(program)
        );
        return null;
    }

    return program;
}

function getUniforms(program) {
    let uniforms = [];
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        let uniformName = gl.getActiveUniform(program, i).name;
        uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
}

function createShader(sourceCode, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, sourceCode);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(
            "An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader)
        );
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function blit(target) {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
        gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array([0, 1, 2, 0, 2, 3]),
        gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    if (target == null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function initFBOs() {
    outputColor = createDoubleFBO(res.w, res.h);
    velocity = createDoubleFBO(res.w, res.h);
    divergence = createFBO(res.w, res.h);
    pressure = createDoubleFBO(res.w, res.h);
}

function createFBO(w, h) {
    gl.activeTexture(gl.TEXTURE0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, w, h, 0, gl.RGB, gl.FLOAT, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
        fbo,
        width: w,
        height: h,
        attach(id) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        },
    };
}

function createDoubleFBO(w, h) {
    let fbo1 = createFBO(w, h);
    let fbo2 = createFBO(w, h);

    return {
        width: w,
        height: h,
        texelSizeX: 1 / w,
        texelSizeY: 1 / h,
        read: () => fbo1,
        write: () => fbo2,
        swap() {
            let temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
        },
    };
}

const cycleDuration = 3000;        
const cycleActiveDuration = 1500; 

function render(t) {
    const dt = 1 / 60;

    if (t && isPreview) {
        const timeInCycle = t % cycleDuration;

        if (timeInCycle < cycleActiveDuration) {
            updatePointerPosition({
                clientX: canvasEl.getBoundingClientRect().left + canvasEl.clientWidth * (0.5 + 0.25 * Math.sin(0.002 * t - 3.14)),
                clientY: canvasEl.getBoundingClientRect().top + canvasEl.clientHeight * (0.5 + 0.1 * Math.sin(0.005 * t) * Math.cos(0.002 * t)),
            });
        }
    }

    if (pointer.moved) {
        if (!isPreview) {
            pointer.moved = false;
        }

        gl.useProgram(splatProgram.program);
        gl.uniform1i(splatProgram.uniforms.u_input_texture, velocity.read().attach(1));
        gl.uniform1f(splatProgram.uniforms.u_ratio, canvasEl.width / canvasEl.height);
        gl.uniform2f(splatProgram.uniforms.u_point, pointer.x / canvasEl.clientWidth, 1 - pointer.y / canvasEl.clientHeight);
        gl.uniform3f(splatProgram.uniforms.u_point_value, pointer.dx, -pointer.dy, 0);
        gl.uniform1f(splatProgram.uniforms.u_point_size, params.cursorSize * 0.001);

        blit(velocity.write());
        velocity.swap();

        gl.uniform1i(splatProgram.uniforms.u_input_texture, outputColor.read().attach(1));
        gl.uniform3f(splatProgram.uniforms.u_point_value, params.cursorPower * 0.001, 0, 0);
        blit(outputColor.write());
        outputColor.swap();
    }

    gl.useProgram(divergenceProgram.program);
    gl.uniform2f(divergenceProgram.uniforms.u_texel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms.u_velocity_texture, velocity.read().attach(1));
    blit(divergence);

    gl.useProgram(pressureProgram.program);
    gl.uniform2f(pressureProgram.uniforms.u_texel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms.u_divergence_texture, divergence.attach(1));
    for (let i = 0; i < 16; i++) {
        gl.uniform1i(pressureProgram.uniforms.u_pressure_texture, pressure.read().attach(2));
        blit(pressure.write());
        pressure.swap();
    }

    gl.useProgram(gradientSubtractProgram.program);
    gl.uniform2f(gradientSubtractProgram.uniforms.u_texel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradientSubtractProgram.uniforms.u_pressure_texture, pressure.read().attach(1));
    gl.uniform1i(gradientSubtractProgram.uniforms.u_velocity_texture, velocity.read().attach(2));
    blit(velocity.write());
    velocity.swap();

    gl.useProgram(advectionProgram.program);
    gl.uniform2f(advectionProgram.uniforms.u_texel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform2f(advectionProgram.uniforms.u_output_textel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(advectionProgram.uniforms.u_velocity_texture, velocity.read().attach(1));
    gl.uniform1i(advectionProgram.uniforms.u_input_texture, velocity.read().attach(1));
    gl.uniform1f(advectionProgram.uniforms.u_dt, dt);
    gl.uniform1f(advectionProgram.uniforms.u_dissipation, 0.97);
    blit(velocity.write());
    velocity.swap();

    gl.useProgram(advectionProgram.program);
    gl.uniform2f(advectionProgram.uniforms.u_output_textel, outputColor.texelSizeX, outputColor.texelSizeY);
    gl.uniform1i(advectionProgram.uniforms.u_input_texture, outputColor.read().attach(2));
    gl.uniform1f(advectionProgram.uniforms.u_dt, 8 * dt);
    gl.uniform1f(advectionProgram.uniforms.u_dissipation, 0.98);
    blit(outputColor.write());
    outputColor.swap();

    gl.useProgram(displayProgram.program);
    gl.uniform2f(displayProgram.uniforms.u_point, pointer.x / canvasEl.clientWidth, 1 - pointer.y / canvasEl.clientHeight);
    gl.uniform1i(displayProgram.uniforms.u_velocity_texture, velocity.read().attach(2));
    gl.uniform1f(displayProgram.uniforms.u_ratio, canvasEl.width / canvasEl.height);
    gl.uniform1f(displayProgram.uniforms.u_img_ratio, imgRatio);
    gl.uniform1f(displayProgram.uniforms.u_disturb_power, params.distortionPower);
    gl.uniform1i(displayProgram.uniforms.u_output_texture, outputColor.read().attach(1));
    blit();

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}

function resizeCanvas() {
    canvasEl.width = window.innerWidth;
    canvasEl.height = window.innerHeight;
    const ratio = window.innerWidth / window.innerHeight;
    res.w = Math.max(256 * ratio, canvasEl.clientWidth);
    res.h = Math.max(256, canvasEl.clientHeight);
}
