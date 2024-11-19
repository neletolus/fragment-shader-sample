#version 300 es
precision mediump float;
precision mediump int;
out vec4 fragColor;
uniform float u_time;
uniform vec2 u_resolution;

#define PI                      3.14159265

// 法線
#define NORMAL_EPS              0.001

// レイマーチング周り
#define NEAR_CLIP_PLANE         1.0
#define FAR_CLIP_PLANE          100.0
#define MAX_RAYCAST_STEPS       200
#define STEP_DAMPING            0.7
#define DIST_EPSILON            0.001
#define MAX_RAY_BOUNCES         3.0

#define MAX_SHADOW_DIST         10.0

#define AMBIENT_COLOR           vec3(0.03, 0.03, 0.03)
#define LIGHT_COLOR             vec3(0.8, 1.0, 0.9)
#define SPEC_COLOR              vec3(0.8, 0.90, 0.60)

#define SPEC_POWER              16.0

#define FOG_DENSITY             0.001

#define CAM_DIST                18.0
#define CAM_H                   1.0
#define CAM_FOV_FACTOR 4.0
#define LOOK_AT_H               4.0
#define LOOK_AT                 vec3(0.0, LOOK_AT_H, 0.0)

#define MTL_BACKGROUND          -1.0
#define MTL_GROUND              1.0
#define MTL_NEEDLE              2.0
#define MTL_STEM                3.0
#define MTL_TOPPER              4.0
#define MTL_CAP                 5.0
#define MTL_BAUBLE              6.0

#define CLR_BACKGROUND          vec3(0.3, 0.342, 0.5)
#define CLR_GROUND              vec3(3.3, 3.3, 4.5)
#define CLR_NEEDLE              vec3(0.152,0.36,0.18)
#define CLR_STEM                vec3(0.79,0.51,0.066)
#define CLR_TOPPER              vec3(1.6,1.0,0.6)
#define CLR_CAP                 vec3(1.2,1.0,0.8)

#define BAUBLE_REFLECTIVITY     0.7

#define TREE_H                  4.0
#define TREE_R                  3.0
#define TREE_CURVATURE          1.0
#define TRUNK_WIDTH             0.025
#define TREE2_ANGLE             0.4
#define TREE2_OFFSET            0.4
#define TREE2_SCALE             0.9


#define NEEDLE_LENGTH           0.5
#define NEEDLE_SPACING          0.15
#define NEEDLE_THICKNESS        0.05
#define NEEDLES_RADIAL_NUM      17.0
#define NEEDLE_BEND             0.99
#define NEEDLE_TWIST            1.0
#define NEEDLE_GAIN             0.7
#define STEM_THICKNESS          0.02
#define BRANCH_ANGLE            0.38
#define BRANCH_SPACING          1.2
#define BRANCH_NUM_MAX          9.0
#define BRANCH_NUM_FADE         2.0

#define BAUBLE_SIZE             0.25
#define BAUBLE_SPACING          1.9
#define BAUBLE_COUNT_FADE1      1.2
#define BAUBLE_COUNT_FADE2      0.3
#define BAUBLE_JITTER           0.05
#define BAUBLE_SPREAD           0.6
#define BAUBLE_MTL_SEED         131.0
#define BAUBLE_YIQ_MUL          vec3(0.8, 1.1, 0.6)
#define BAUBLE_CLR_Y            0.7
#define BAUBLE_CLR_I            1.3
#define BAUBLE_CLR_Q            0.9
#define TOPPER_SCALE            2.0

// Primitives

/**
* 板（単体ではは利用せず、星を作るために利用）
* p: 3D空間内の点
* n: 平面の法線ベクトル
* h: 平面のオフセット
**/
float sdPlane( vec3 p, vec3 n, float h )
{
  // 3d空間内の点と平面の法線ベクトルの内積をとり、オフセットを足す
  return dot(p,n) + h;
}

/**
* 球（加工してオーナメントにする）
* p: 3D空間内の点
* r: 球の半径
**/
float sdSphere(vec3 p, float r) {
    // pからの距離が球の半径の内側か外側かを値で返す
    return length(p) - r;
}

/**
* 円錐（木の枝と幹）
* p: 3D空間内の点
* r: 円錐の底面の半径
* h: 円錐のオフセット
**/
float sdCone(in vec3 p, float r, float h) {
    return max(abs(p.y) - h, length(p.xz)) - r*clamp(h - abs(p.y), 0.0, h);
}

/**
* 円柱(枝とオーナメントの紐)
* p: 3D空間内の点
* h: 円柱のオフセット
**/
float sdCylinder(vec3 p, vec2 h) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - h;
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

/**
* トーラス（オーナメントのフック）
* p: 3D空間内の点
* ri: トーラスの内径
* ro: トーラスの外径
**/
float sdTorus(vec3 p, float ri, float ro) {
    vec2 q = vec2(length(p.xz) - ri, p.y);
    return length(q) - ro;
}


/** 距離関数の演算群 **/
float diff(float d1, float d2) {
    return max(-d2, d1);
}

float add(float d1, float d2) {
    return min(d2, d1);
}

float intersect(float d1, float d2) {
    return max(d2, d1);
}


/** 距離関数の演算群(マテリアルIDを含む) **/
void diff(inout vec2 d1, in vec2 d2) {
    if (-d2.x > d1.x) {
        d1.x = -d2.x;
        d1.y = d2.y;
    }
}

void add(inout vec2 d1, in vec2 d2) {
    if (d2.x < d1.x) d1 = d2;
}

void intersect(inout vec2 d1, in vec2 d2) {
    if (d1.x < d2.x) d1 = d2;
}


//　オーナメントの上の紐部分の位置計算に利用
vec3 translate(vec3 p, vec3 d) {
    return p - d;
}

vec2 rotate(vec2 p, float ang) {
    float c = cos(ang), s = sin(ang);
    return vec2(p.x*c-p.y*s, p.x*s+p.y*c);
}


//  繰り返し
float repeat(float coord, float spacing) {
    return mod(coord, spacing) - spacing*0.5;
}

// アークタンジェントで回転しながら繰り返し
vec2 repeatAng(vec2 p, float n) {
    float ang = 2.0*PI/n;
    float sector = floor(atan(p.x, p.y)/ang + 0.5);
    p = rotate(p, sector*ang);
    return p;
}

// アークタンジェントで回転しながら繰り返し（z軸にも適用）
vec3 repeatAngS(vec2 p, float n) {
    float ang = 2.0*PI/n;
    float sector = floor(atan(p.x, p.y)/ang + 0.5);
    p = rotate(p, sector*ang);
    return vec3(p.x, p.y, mod(sector, n));
}

// 星の距離関数。planeを変形させた形を角度を変えながら5回繰り返す
float star(vec3 p) {
    p.xy = repeatAng(p.xy, 5.0);
    p.xz = abs(p.xz);
    return sdPlane(p, vec3(0.5, 0.25, 0.8), -0.09);
}

uvec3 k = uvec3(0x456789abu, 0x6789ab45u, 0x89ab4567u);
uvec3 u = uvec3(1, 2, 3);
uvec3 uhash33(uvec3 n){
    n ^= (n.yzx << u);
    n ^= (n.yzx >> u);
    n *= k;
    n ^= (n.yzx << u);
    return n * k;
}

// noise
float gtable3(vec3 lattice, vec3 p){// latticeは格子点の位置、pは位置ベクトル
    uvec3 n = floatBitsToUint(lattice);//格子点の値をビット列に変換
    uint ind = uhash33(n).x >> 28; //ハッシュ値の桁を落とす
    float u = ind < 8u ? p.x : p.y;
    float v = ind < 4u ? p.y : ind == 12u || ind == 14u ? p.x : p.z;
    return ((ind & 1u) == 0u? u: -u) + ((ind & 2u) == 0u? v : -v);
}

// パーリンノイズを生成するための関数をインポート
float pnoise31(vec3 p){
    vec3 n = floor(p);
    vec3 f = fract(p);
    float[8] v;
    for (int k = 0; k < 2; k++ ){
        for (int j = 0; j < 2; j++ ){
            for (int i = 0; i < 2; i++){
                v[i+2*j+4*k] = gtable3(n + vec3(i, j, k), f - vec3(i, j, k)) * 0.70710678; // 0.70710678 = 1.0 / sqrt(2.0)
            }
            
        }
    }
    f = f * f * f * (10.0 - 15.0 * f + 6.0 * f * f);
    float[2] w;
    for (int i = 0; i < 2; i++){
        w[i] = mix(mix(v[4*i], v[4*i+1], f[0]), mix(v[4*i+2], v[4*i+3], f[0]), f[1]);
    }
    return 0.5 * mix(w[0], w[1], f[2]) + 0.5;
}

// ground関数にパーリンノイズを追加
vec2 ground(in vec3 p) {
    // パーリンノイズを生成し、地面の高さに追加
    float noise = pnoise31(p) * 0.2; // スケールと強度を調整
    p.y += (sin(sin(p.z*0.1253) - p.x*0.371)*0.31 + cos(p.z*0.553 + sin(p.x*0.127))*0.12)*1.7 + 0.2;
    p.y += noise; // ノイズを地面の高さに追加
    return vec2(p.y, MTL_GROUND);
}

vec2 bauble(in vec3 pos, float matID) {
    float type = mod(matID, 5.0);
    float d = sdSphere(pos, BAUBLE_SIZE);
    if (type <= 1.0) {
        // bumped sphere
        d += cos(atan(pos.x, pos.z)*30.0)*0.01*(0.5 - pos.y) + sin(pos.y*60.0)*0.01;
    } else if (type <= 2.0) {
        // dented sphere
        d = diff(d, sdSphere(pos + vec3(0.0, 0.0, -0.9), 0.7));
    } else if (type <= 3.0) {
        // horisontally distorted sphere
        d  += cos(pos.y*28.0)*0.01;
    } else if (type <= 4.0) {
        // vertically distorted sphere
        d += cos(atan(pos.x, pos.z)*20.0)*0.01*(0.5 - pos.y);
    }

    vec2 res = vec2(d, matID);
    //  the cap 
    pos = translate(pos, vec3(0.0, BAUBLE_SIZE, 0.0));
    float cap = sdCylinder(pos, vec2(BAUBLE_SIZE*0.05, 0.1));
    //  the hook
    cap = add(cap, sdTorus(pos.xzy - vec3(0.0, 0.0, 0.12), BAUBLE_SIZE*0.1, 0.015));
    vec2 b = vec2(cap, MTL_CAP);
    add(res, b);
    return res;
}


vec2 baubles(in vec3 p) {
    vec3 pos = p;
    float h = abs(-floor(pos.y/BAUBLE_SPACING)/TREE_H + 1.0)*TREE_R;
    float nb = max(1.0, floor(BAUBLE_COUNT_FADE1*(h + BAUBLE_COUNT_FADE2)*h));
    vec3 rp = repeatAngS(pos.xz, nb);
    float matID = (h + rp.z + BAUBLE_MTL_SEED)*117.0;
    pos.xz = rp.xy;
    pos.y = repeat(pos.y, BAUBLE_SPACING);
    pos.y += mod(matID, 11.0)*BAUBLE_JITTER;
    pos.z += -h + BAUBLE_SPREAD;
    vec2 res = bauble(pos, matID);
    res.x = intersect(res.x, sdSphere(p - vec3(0.0, TREE_H*0.5 + 0.5, 0.0), TREE_H + 0.5));
    return res;
}

vec2 topper(vec3 pos) {
    pos.y -= TREE_H*2.0;
    pos /= TOPPER_SCALE;
    float d = add(star(pos), sdCylinder(pos - vec3(0.0, -0.2, 0.0), vec2(0.04, 0.1)))*TOPPER_SCALE;
    return vec2(d, MTL_TOPPER);
}

float needles(in vec3 p) {
    p.xy = rotate(p.xy, -length(p.xz)*NEEDLE_TWIST);
    p.xy = repeatAng(p.xy, NEEDLES_RADIAL_NUM);
    p.yz = rotate(p.yz, -NEEDLE_BEND);
    p.y -= p.z*NEEDLE_GAIN;
    p.z = min(p.z, 0.0);
    p.z = repeat(p.z, NEEDLE_SPACING);
    return sdCone(p, NEEDLE_THICKNESS, NEEDLE_LENGTH);
}

vec2 branch(in vec3 p) {
    vec2 res = vec2(needles(p), MTL_NEEDLE);
    float s = sdCylinder(p.xzy + vec3(0.0, 100.0, 0.0), vec2(STEM_THICKNESS, 100.0));
    vec2 stem = vec2(s, MTL_STEM);
    add(res, stem);
    return res;
}

vec2 halfTree(vec3 p) {
    float section = floor(p.y/BRANCH_SPACING);
    float numBranches =  max(2.0, BRANCH_NUM_MAX - section*BRANCH_NUM_FADE);
    p.xz = repeatAng(p.xz, numBranches);
    p.z -= TREE_R*TREE_CURVATURE;
    p.yz = rotate(p.yz, BRANCH_ANGLE);
    p.y = repeat(p.y, BRANCH_SPACING);
    return branch(p);
}


vec2 tree(vec3 p) {
    //  the first bunch of branches
    vec2 res = halfTree(p); 
    
    // the second bunch of branches (to hide the regularity)
    p.xz = rotate(p.xz, TREE2_ANGLE);
    p.y -= BRANCH_SPACING*TREE2_OFFSET;
    p /= TREE2_SCALE;
    vec2 t2 = halfTree(p);
    t2.x *= TREE2_SCALE;
    add(res, t2);

    // trunk    
    vec2 tr = vec2(sdCone(p.xyz, TRUNK_WIDTH, TREE_H*2.0), MTL_STEM);
    add(res, tr);

    res.x = intersect(res.x, sdSphere(p - vec3(0.0, TREE_H*0.5 + 1.0, 0.0), TREE_H + 1.0));    
    return res;
}

vec2 distf(in vec3 pos) {
    vec2 res = ground(pos);
    
    vec2 tr = tree(pos);
    add(res, tr);
    
    vec2 top = topper(pos);
    add(res, top);
    
    vec2 b = baubles(pos);
    add(res, b);
    return res;
}

vec3 normal(in vec3 p)
{
    vec2 d = vec2(NORMAL_EPS, 0.0);
    return normalize(vec3(
        distf(p + d.xyy).x - distf(p - d.xyy).x,
        distf(p + d.yxy).x - distf(p - d.yxy).x,
        distf(p + d.yyx).x - distf(p - d.yyx).x));
}


vec2 rayMarch(in vec3 rayOrig, in vec3 rayDir) {
    float t = NEAR_CLIP_PLANE;
    float mtlID = MTL_BACKGROUND;
    for (int i = 0; i < MAX_RAYCAST_STEPS; i++) {
        vec2 d = distf(rayOrig + rayDir*t);
        if (d.x < DIST_EPSILON || t > FAR_CLIP_PLANE) break;
        t += d.x*STEP_DAMPING;
        mtlID = d.y;
    }

    if (t > FAR_CLIP_PLANE) mtlID = MTL_BACKGROUND;
    return vec2(t, mtlID);
}


vec3 applyFog(vec3 col, float dist) {
    return mix(col, CLR_BACKGROUND, 1.0 - exp(-FOG_DENSITY*dist*dist));
}


const mat3 YIQ_TO_RGB = mat3(
    1.0,  0.956,  0.620, 
    1.0, -0.272, -0.647, 
    1.0, -1.108,  1.705);

vec3 jollyColor(float matID) {
    vec3 clr = cos(matID*BAUBLE_YIQ_MUL);
    clr= clr*vec3(0.1, BAUBLE_CLR_I, BAUBLE_CLR_Q) + vec3(BAUBLE_CLR_Y, 0.0, 0.0);
    return clamp(clr*YIQ_TO_RGB, 0.0, 1.0);
}

vec3 getMaterialColor(float matID) {
    vec3 col = CLR_BACKGROUND;
         if (matID <= MTL_GROUND) col = vec3(3.3, 3.3, 4.5);
    else if (matID <= MTL_NEEDLE) col = vec3(0.152,0.36,0.18);
    else if (matID <= MTL_STEM)   col = vec3(0.79,0.51,0.066);
    else if (matID <= MTL_TOPPER) col = vec3(1.6,1.0,0.6);
    else if (matID <= MTL_CAP)    col = vec3(1.2,1.0,0.8);
    else                          col = jollyColor(matID);
    return col;
}


float shadow(in vec3 rayOrig, in vec3 rayDir, in float tmin, in float tmax) {
    float shadowAmt = 1.0;
    float t = tmin;
    for (int i = 0; i < MAX_RAYCAST_STEPS; i++) {
        float d = distf(rayOrig + rayDir*t).x*STEP_DAMPING;
        shadowAmt = min(shadowAmt, 16.0*d/t);
        t += clamp(d, 0.01, 0.25);
        if (d < DIST_EPSILON || t > tmax) break;
    }

    return clamp(shadowAmt, 0.0, 1.0);
}


vec3 render(in vec3 rayOrig, in vec3 rayDir) {
    vec3  lightDir = -rayDir; // miner's lamp
    vec3 resCol = vec3(0.0);
    float alpha = 1.0;
    for (float i = 0.0; i < MAX_RAY_BOUNCES; i++) {
        vec2 d = rayMarch(rayOrig, rayDir);
        float t = d.x;
        float mtlID = d.y;
        vec3 pos = rayOrig + t*rayDir;
        vec3 nrm = normal(pos);
        vec3 ref = reflect(rayDir, nrm);
        vec3 mtlDiffuse = getMaterialColor(mtlID);
        float diffuse = clamp(dot(nrm, lightDir), 0.0, 1.0);
        float specular = pow(clamp(dot(ref, lightDir), 0.0, 1.0), SPEC_POWER);
        diffuse *= shadow(pos, lightDir, DIST_EPSILON, MAX_SHADOW_DIST);
        vec3 col = mtlDiffuse*(AMBIENT_COLOR + LIGHT_COLOR*(diffuse + specular*SPEC_COLOR));
        col = applyFog(col, t);
        resCol += col*alpha; //  blend in (a possibly reflected) new color 
        if (mtlID <= MTL_BAUBLE || abs(dot(nrm, rayDir)) < 0.1) break;
        rayOrig = pos + ref*DIST_EPSILON;
        alpha *= BAUBLE_REFLECTIVITY;
        rayDir = ref;
    }
    return vec3(clamp(resCol, 0.0, 1.0));
}

vec3 getRayDir(vec3 camPos, vec3 viewDir, vec2 pixelPos) {
    vec3 camRight = normalize(cross(viewDir, vec3(0.0, 1.0, 0.0)));
    vec3 camUp = normalize(cross(camRight, viewDir));
    return normalize(pixelPos.x*camRight + pixelPos.y*camUp + CAM_FOV_FACTOR*viewDir);
}


void main() {
    vec2 q = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = -1.0 + 2.0 * q;
    p.x *= u_resolution.x / u_resolution.y;

    float ang = 0.1*(40.0 + u_time);
    vec3 camPos = vec3(CAM_DIST*cos(ang), CAM_H, CAM_DIST*sin(ang));
    vec3 rayDir = getRayDir(camPos,normalize(LOOK_AT - camPos), p);
    vec3 color = render(camPos, rayDir);
    fragColor=vec4(color, 1.0);
}