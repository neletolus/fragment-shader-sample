#version 300 es
precision highp float;

out vec4 fragColor;
uniform vec2 u_resolution; //ビューポートの解像度

void main() {
    vec2 pos = gl_FragCoord.xy / u_resolution.xy; // ピクセルの位置をビューポートの解像度で正規化
    fragColor = vec4(1.0, pos, 1.0);
}
