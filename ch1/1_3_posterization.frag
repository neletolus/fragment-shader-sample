#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;
int channel; // 表示するシェーダのチャンネルを横で分ける
void main(){
    vec2 pos = gl_FragCoord.xy / u_resolution.xy; // フラグメントの座標を正規化
    vec3[4] col4 = vec3[](
        vec3(1.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 0.0, 1.0),
        vec3(1.0, 1.0, 0.0)
    );
    float n = 16.0; // 階調数
    pos *= n; // フラグメントの座標を0,n区間に変換
    channel = int(2.0 * gl_FragCoord.x / u_resolution.x); // ビューポートを分割して各チャンネルを表示
    if (channel == 0){   //left: 階段関数
        pos = floor(pos) + step(0.5, fract(pos));
    } else {    //right: 滑らかな階段関数
        float thr = 0.25 * sin(u_time);
        pos = floor(pos) + smoothstep(0.25 + thr, 0.75 - thr, fract(pos));
    }
    pos /= n; // フラグメントの座標を0,1区間に正規化
    vec3 col = mix(mix(col4[0], col4[1], pos.x), mix(col4[2], col4[3], pos.x), pos.y);
    fragColor = vec4(col, 1.0);
}