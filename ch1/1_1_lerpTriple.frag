#version 300 es

precision highp float;

out vec4 fragColor;
uniform vec2 u_resolution;

void main() {
    vec2 pos = gl_FragCoord.xy / u_resolution.xy;
    vec3[3] colors = vec3[]( //ベクトルの配列
        vec3(1.0, 0.0, 0.0), //赤色
        vec3(0.0, 1.0, 0.0), //緑色
        vec3(0.0, 0.0, 1.0) //青色
    );
    pos.x *= 2.0; // 0.0から2.0の範囲に変換
    int index = int(pos.x); // 整数部分を取得し、配列のindexとして使用
    // fractは小数点以下の値を返す。
    // 例えばpos.xが1.5の場合、fract(pos.x)は0.5を返す。
    vec3 col = mix(colors[index], colors[index + 1], fract(pos.x)); // X座標上の線形補間
    fragColor = vec4(col, 1.0);
}
