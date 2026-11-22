// The light behind the page: a field of soft colour that breathes (one breath every 11 s, about 5.5 a minute) and a
// pearl that breathes with it. Both follow the section in view and lean toward the pointer. Without WebGL the CSS
// gradient on <body> stays; with reduced motion the light holds still and only changes between sections.
import * as THREE from "/vendor/three.module.min.js";

const canvas = document.getElementById("light");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "default" });
} catch {
  canvas.remove();
}
if (renderer) start();

function start() {
  const BREATH = 11;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const C = {
    mist: rgb("#f2f3f5"), lilac: rgb("#cbc3f5"), sky: rgb("#bfd8f4"), sage: rgb("#cfe6d8"),
    apricot: rgb("#f6cfb8"), rose: rgb("#f1c4cf"), violet: rgb("#b4aaf0"),
  };
  // Per section: four lights [colour, x, y (from the top), radius as a share of the viewport height],
  // how strong the field is, and where the pearl sits [x, y, size, opacity].
  const looks = {
    hero:  { l: [["lilac", .84, .22, .62], ["apricot", .60, .70, .46], ["sky", 1.0, .84, .5], ["sage", .45, .08, .32]], k: 1.0,  orb: [.77, .4, .92, 1] },
    calm:  { l: [["lilac", .96, .12, .42], ["sky", .04, .96, .38], ["apricot", 1.1, 1.1, .3], ["sage", .5, -.2, .3]],   k: .62, orb: [.95, .45, .35, 0] },
    s1:    { l: [["sky", .88, .2, .62], ["lilac", .08, .92, .52], ["sage", .5, 1.25, .3], ["violet", .62, .55, .26]],  k: .9,  orb: [.95, .5, .4, 0] },
    s2:    { l: [["apricot", .12, .15, .62], ["rose", .92, .86, .56], ["lilac", .86, .08, .32], ["apricot", .52, .62, .28]], k: .9, orb: [.95, .5, .4, 0] },
    s3:    { l: [["sage", .82, .82, .62], ["sky", .1, .2, .52], ["lilac", .96, .1, .32], ["sage", .3, .92, .3]],       k: .9,  orb: [.95, .5, .4, 0] },
    close: { l: [["lilac", .5, .55, .6], ["apricot", .28, .78, .46], ["sky", .74, .36, .46], ["rose", .62, .92, .3]],  k: 1.0, orb: [.5, .5, .78, .5] },
  };
  const flat = (look) => ({
    col: look.l.flatMap(([c]) => C[c]), pos: look.l.flatMap(([, x, y, r]) => [x, y, r]), k: look.k, orb: [...look.orb],
  });
  const targets = Object.fromEntries(Object.entries(looks).map(([n, l]) => [n, flat(l)]));
  const cur = structuredClone(targets.hero);

  const noise = /* glsl */ `
    vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;} vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);} vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
    float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
      vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
      vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
      i=m289(i);vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
      float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);
      vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;
      vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
      return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;

  // The field: four soft lights over mist, their space slowly warped by noise so the edges flow.
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uBreath: { value: 0 }, uK: { value: 1 }, uAsp: { value: 1 },
        uMouse: { value: new THREE.Vector2(0.7, 0.4) }, uMist: { value: new THREE.Vector3(...C.mist) },
        uCol: { value: Array.from({ length: 4 }, () => new THREE.Vector3()) },
        uPos: { value: Array.from({ length: 4 }, () => new THREE.Vector3()) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime, uBreath, uK, uAsp; uniform vec2 uMouse; uniform vec3 uMist, uCol[4], uPos[4];
        varying vec2 vUv;
        ${noise}
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 p = vec2(vUv.x * uAsp, 1.0 - vUv.y);
          float t = uTime * 0.035;
          vec2 w = p + 0.16 * vec2(snoise(vec3(p * 1.1, t)), snoise(vec3(p * 1.1 + 7.3, t + 3.1)));
          w += 0.05 * vec2(snoise(vec3(p * 3.0, t * 1.7)), snoise(vec3(p * 3.0 + 2.1, t * 1.7)));
          float br = 0.9 + 0.16 * uBreath;
          vec3 col = uMist;
          for (int i = 0; i < 4; i++) {
            float fi = float(i);
            vec2 c = vec2(uPos[i].x * uAsp, uPos[i].y) + 0.06 * vec2(sin(t * 2.3 + fi * 1.7), cos(t * 1.9 + fi * 2.3));
            float r = uPos[i].z * br;
            vec2 d = w - c;
            float a = exp(-dot(d, d) / (r * r));
            col = mix(col, uCol[i], a * 0.92);
          }
          vec2 m = vec2(uMouse.x * uAsp, uMouse.y);
          vec2 dm = p - m;
          col = mix(col, vec3(1.0), 0.32 * exp(-dot(dm, dm) / 0.05));
          col = mix(uMist, col, uK);
          col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 160.0;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  field.frustumCulled = false;
  field.renderOrder = -1;

  // The pearl: a sphere whose surface swells and settles with the breath, coloured by the section's lights.
  const pearl = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 40),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uBreath: { value: 0 }, uOpacity: { value: 1 },
        uCol: { value: Array.from({ length: 4 }, () => new THREE.Vector3()) },
      },
      vertexShader: /* glsl */ `
        uniform float uTime, uBreath; varying vec3 vN, vV; varying float vD;
        ${noise}
        void main(){
          float t = uTime * 0.11;
          float d = snoise(position * 1.1 + vec3(0.0, t, t * 0.6)) * 0.035 + snoise(position * 2.4 - t) * 0.01;
          vec3 p = position * (0.94 + 0.08 * uBreath + d);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vN = normalize(normalMatrix * normal); vV = -mv.xyz; vD = d;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime, uOpacity; uniform vec3 uCol[4]; varying vec3 vN, vV; varying float vD;
        void main(){
          vec3 n = normalize(vN), v = normalize(vV);
          float fr = pow(1.0 - max(dot(n, v), 0.0), 2.0);
          vec3 base = mix(uCol[2], uCol[0], n.y * 0.5 + 0.5);
          base = mix(base, uCol[1], smoothstep(0.1, 0.9, n.x * 0.5 + 0.5) * 0.65);
          base = mix(base, uCol[3], smoothstep(0.3, 1.0, 0.5 - n.y * 0.5 + vD * 6.0) * 0.45);
          vec3 sheen = 0.5 + 0.5 * cos(6.2831 * (fr * 0.8 + vec3(0.0, 0.33, 0.67) + uTime * 0.015));
          vec3 col = mix(base, sheen * 0.3 + 0.78, fr * 0.55);
          vec3 L = normalize(vec3(-0.45, 0.75, 0.6));
          col += pow(max(dot(reflect(-L, n), v), 0.0), 10.0) * 0.22;
          col += pow(max(dot(n, v), 0.0), 3.0) * 0.06;
          col = mix(col, vec3(1.0), smoothstep(0.35, 0.0, dot(n, v)) * 0.15);
          float a = uOpacity * (1.0 - smoothstep(0.62, 1.0, fr));
          gl_FragColor = vec4(col, a);
        }`,
    }),
  );

  const scene = new THREE.Scene();
  scene.add(field, pearl);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.z = 6;
  const halfH = Math.tan(THREE.MathUtils.degToRad(35 / 2)) * 6;

  let w = 0, h = 0;
  function resize() {
    w = innerWidth; h = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    field.material.uniforms.uAsp.value = w / h;
    if (still) draw(0);
  }

  const sections = [...document.querySelectorAll("[data-light]")];
  function lookInView() {
    const mid = h * 0.5;
    let best = sections[0];
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) { best = s; break; }
      if (r.top > mid) break;
      best = s;
    }
    return targets[best.dataset.light];
  }

  const mouse = { x: 0.72, y: 0.38, tx: 0.72, ty: 0.38 };
  addEventListener("pointermove", (e) => { mouse.tx = e.clientX / w; mouse.ty = e.clientY / h; }, { passive: true });

  const lerp = (a, b, f) => a + (b - a) * f;
  function draw(dt) {
    const tgt = lookInView();
    const f = still ? 1 : 1 - Math.exp(-dt * 1.6);
    for (let i = 0; i < 12; i++) { cur.col[i] = lerp(cur.col[i], tgt.col[i], f); cur.pos[i] = lerp(cur.pos[i], tgt.pos[i], f); }
    cur.k = lerp(cur.k, tgt.k, f);
    for (let i = 0; i < 4; i++) cur.orb[i] = lerp(cur.orb[i], tgt.orb[i], f);
    const mf = still ? 1 : 1 - Math.exp(-dt * 2.5);
    mouse.x = lerp(mouse.x, mouse.tx, mf); mouse.y = lerp(mouse.y, mouse.ty, mf);

    const t = still ? 20 : performance.now() / 1000;
    const breath = still ? 0.5 : 0.5 - 0.5 * Math.cos((t / BREATH) * Math.PI * 2);
    const fu = field.material.uniforms, pu = pearl.material.uniforms;
    fu.uTime.value = t; fu.uBreath.value = breath; fu.uK.value = cur.k;
    fu.uMouse.value.set(mouse.x, mouse.y);
    for (let i = 0; i < 4; i++) {
      fu.uCol.value[i].set(cur.col[i * 3], cur.col[i * 3 + 1], cur.col[i * 3 + 2]);
      fu.uPos.value[i].set(cur.pos[i * 3], cur.pos[i * 3 + 1], cur.pos[i * 3 + 2]);
      pu.uCol.value[i].copy(fu.uCol.value[i]);
    }
    pu.uTime.value = t; pu.uBreath.value = breath;

    // The pearl: placed in viewport fractions, sized by the shorter side; narrow screens get a fainter, offset pearl.
    const asp = w / h, narrow = asp < 0.9;
    let [ox, oy, os, oo] = cur.orb;
    if (narrow) { ox = lerp(ox, 0.72, 0.8); oy = Math.min(oy, 0.32); oo *= 0.55; }
    const side = Math.min(halfH, halfH * asp);
    pearl.position.set((ox * 2 - 1) * halfH * asp, (1 - oy * 2) * halfH, 0);
    pearl.scale.setScalar(side * 0.6 * os);
    pearl.rotation.y = t * 0.05 + (mouse.x - 0.5) * 0.6;
    pearl.rotation.x = (mouse.y - 0.5) * 0.4;
    pu.uOpacity.value = oo;
    pearl.visible = oo > 0.01;

    renderer.render(scene, camera);
  }

  let last = performance.now(), raf = 0;
  function frame(now) {
    draw(Math.min((now - last) / 1000, 0.1));
    last = now;
    raf = requestAnimationFrame(frame);
  }
  addEventListener("resize", resize);
  resize();
  if (still) {
    addEventListener("scroll", () => draw(0), { passive: true });
    draw(0);
  } else {
    document.addEventListener("visibilitychange", () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    raf = requestAnimationFrame(frame);
  }
  requestAnimationFrame(() => canvas.classList.add("on"));
}
