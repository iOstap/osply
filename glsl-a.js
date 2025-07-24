const shaders = [
  { id: 'vertShader', type: 'x-shader/x-fragment', code: `
precision highp float;

attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 u_vertex_texel;

void main () {
    vUv = aPosition * .5 + .5;
    vL = vUv - vec2(u_vertex_texel.x, 0.);
    vR = vUv + vec2(u_vertex_texel.x, 0.);
    vT = vUv + vec2(0., u_vertex_texel.y);
    vB = vUv - vec2(0., u_vertex_texel.y);
    gl_Position = vec4(aPosition, 0., 1.);
}
` },

  { id: 'fragShaderAdvection', type: 'x-shader/x-fragment', code: `
precision highp float;
precision highp sampler2D;

varying vec2 vUv;
uniform sampler2D u_velocity_txr;
uniform sampler2D u_input_txr;
uniform vec2 u_vertex_texel;
uniform vec2 u_output_textel;
uniform float u_dt;
uniform float u_dissipation;

void main () {
    vec2 velocity = texture2D(u_velocity_txr, vUv).xy;
    vec2 coord = vUv - u_dt * velocity * u_vertex_texel;

    float bounceDamping = 0.8;

    if (coord.x < 0.0) {
        coord.x = -coord.x;
        velocity.x *= -bounceDamping;
    } else if (coord.x > 1.0) {
        coord.x = 2.0 - coord.x;
        velocity.x *= -bounceDamping;
    }

    if (coord.y < 0.0) {
        coord.y = -coord.y;
        velocity.y *= -bounceDamping;
    } else if (coord.y > 1.0) {
        coord.y = 2.0 - coord.y;
        velocity.y *= -bounceDamping;
    }

    gl_FragColor = u_dissipation * texture2D(u_input_txr, coord);
    gl_FragColor.a = 1.0;
}
` },

  { id: 'fragShaderDivergence', type: 'x-shader/x-fragment', code: `
precision highp float;
precision highp sampler2D;

varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D u_velocity_txr;

void main () {
    float L = texture2D(u_velocity_txr, vL).x;
    float R = texture2D(u_velocity_txr, vR).x;
    float T = texture2D(u_velocity_txr, vT).y;
    float B = texture2D(u_velocity_txr, vB).y;

    float div = .5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0., 0., 1.);
}
` },

  { id: 'fragShaderPressure', type: 'x-shader/x-fragment', code: `
precision highp float;
precision highp sampler2D;

varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D u_pressure_txr;
uniform sampler2D u_divergence_txr;

void main () {
    float L = texture2D(u_pressure_txr, vL).x;
    float R = texture2D(u_pressure_txr, vR).x;
    float T = texture2D(u_pressure_txr, vT).x;
    float B = texture2D(u_pressure_txr, vB).x;
    float C = texture2D(u_pressure_txr, vUv).x;
    float divergence = texture2D(u_divergence_txr, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0., 0., 1.);
}
` },

  { id: 'fragShaderGradientSubtract', type: 'x-shader/x-fragment', code: `
precision highp float;
precision highp sampler2D;

varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D u_pressure_txr;
uniform sampler2D u_velocity_txr;

void main () {
    float L = texture2D(u_pressure_txr, vL).x;
    float R = texture2D(u_pressure_txr, vR).x;
    float T = texture2D(u_pressure_txr, vT).x;
    float B = texture2D(u_pressure_txr, vB).x;
    vec2 velocity = texture2D(u_velocity_txr, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0., 1.);
}
` },

  { id: 'fragShaderPoint', type: 'x-shader/x-fragment', code: `
precision highp float;
precision highp sampler2D;

varying vec2 vUv;
uniform sampler2D u_input_txr;
uniform float u_ratio;
uniform vec3 u_point_value;
uniform vec2 u_point;
uniform float u_point_size;

void main () {
    vec2 p = vUv - u_point.xy;
    p.x *= u_ratio;
    vec3 splat = pow(2., -dot(p, p) / u_point_size) * u_point_value;
    vec3 base = texture2D(u_input_txr, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.);
}
` },

  { id: 'fragShaderDisplay', type: 'x-shader/x-fragment', code: `
precision highp float;
precision highp sampler2D;

varying vec2 vUv;
uniform sampler2D u_output_texture;

void main () {
    vec3 C = texture2D(u_output_texture, vUv).rgb;
    float a = max(C.r, max(C.g, C.b));
    a = pow(.1 * a, .1);
    a = clamp(a, 0., 1.);

    C = mix(vec3(1.0), 1. - C, 1.0);
    a = mix(1.0, 1. - a, 0.3);

    gl_FragColor = vec4(C, a);
}
` },
];

shaders.forEach(({id, type, code}) => {
  const script = document.createElement('script');
  script.id = id;
  script.type = type;
  script.textContent = code.trim();
  document.head.appendChild(script);
});
