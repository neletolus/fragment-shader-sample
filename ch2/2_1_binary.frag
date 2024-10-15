#version 300 es
precision highp float;
precision highp int; //整数精度を32bitにする
out vec4 fragColor;
uniform float u_time;
uniform vec2 u_resolution;
void main(){
    vec2 pos = gl_FragCoord.xy / u_resolution.xy; // フラグメント座標を正規化する
    pos *= vec2(32.0, 9.0); // 座標のスケール
    uint[9] a = uint[]( // 2進数表示する符号なし整数の配列
        uint(u_time),// 経過時間
        0xbu, //符号なし整数としての16進数のB
        9u, // 符号なし整数としての9
        0xbu ^ 9u, // ビット演算 XOR
        0xffffffffu, // 符号なし整数の最大値
        0xffffffffu + uint(u_time), // オーバーフロー
        floatBitsToUint(floor(u_time)), // 符号なし整数としての経過時間の整数部
        floatBitsToUint(-floor(u_time)), // a[7]
        floatBitsToUint(11.5625) // a[8]
    );
    if (fract(pos.x) < 0.1){
        if (floor(pos.x) == 1.0){// 1桁目と2桁目の区切り
            fragColor = vec4(1, 0, 0, 1);
        } else if (floor(pos.x) == 9.0){// 9桁目と10桁目の区切り
            fragColor = vec4(0, 1, 0, 1);
        } else {// それ以外
            fragColor = vec4(0.5);
        }
    } else if (fract(pos.y) < 0.1){// 横方向の区切り
        fragColor = vec4(0.5);
    } else {
        uint b = a[int(pos.y)]; // y座標に応じてaの要素を表示
        b = (b << uint(pos.x)) >> 31;
        fragColor = vec4(vec3(b), 1.0); 
    }
    
}