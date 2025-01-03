#version 300 es

precision highp float;

out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;

void main() {
    vec2 pos = gl_FragCoord.xy / u_resolution.xy;
    vec3[4] colors = vec3[](
        vec3(1.0, 0.0, 0.0), //赤色
        vec3(0.0, 1.0, 0.0), //緑色
        vec3(0.0, 0.0, 1.0), //青色
        vec3(1.0, 1.0, 0.0) //黄色
    );
    vec3 col = mix(mix(colors[0], colors[1], pos.x), mix(colors[2], colors[3], pos.x), pos.y);
    fragColor = vec4(col, 1.0);
}
