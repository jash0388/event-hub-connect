import{_ as G}from"./index-DDQmiDYb.js";const X=""+new URL("vision_wasm_internal-Uq1_n2E_.js",import.meta.url).href,C=""+new URL("vision_wasm_internal-CA13OlP-.wasm",import.meta.url).href,N=3,O=8,I=12,M=.2,W=2.5,b=`#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`,H=`#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uSrc;
uniform sampler2D uMask;
uniform float uLod;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec4 s = textureLod(uSrc, vUv, uLod);
  float keep = 1.0 - textureLod(uMask, vUv, 0.0).r;
  fragColor = vec4(s.rgb * keep, s.a * keep);
}`,Y=`#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uSrc;
uniform vec2 uStep;      // one texel along the axis being blurred
uniform int uRadius;
uniform float uWeight[${I+1}];
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec4 acc = textureLod(uSrc, vUv, 0.0) * uWeight[0];
  for (int i = 1; i <= uRadius; i++) {
    vec2 o = uStep * float(i);
    acc += (textureLod(uSrc, vUv + o, 0.0) + textureLod(uSrc, vUv - o, 0.0)) * uWeight[i];
  }
  fragColor = acc;
}`,V=`#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D uFrame;   // full-res camera frame
uniform sampler2D uMask;    // low-res person alpha
uniform sampler2D uGuide;   // the same frame at mask resolution
uniform sampler2D uBlur;    // blurred background, premultiplied (blur mode)
uniform sampler2D uImage;   // background image (image mode)

uniform vec2 uMaskTexel;    // 1 / mask size, pre-scaled by the edge spread
uniform vec2 uImageScale;   // cover-fit transform for uImage
uniform vec2 uImageOffset;
uniform float uRangeFalloff; // 1 / (2 * sigma^2) for the range term
uniform float uWrap;         // light-wrap strength, 0 disables
uniform int uUseImage;

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec3 fg = textureLod(uFrame, vUv, 0.0).rgb;

  // 3x3 over the mask grid: joint bilateral for the alpha we composite
  // with, plain spatial for the wide alpha that drives light wrapping.
  float sum = 0.0;
  float weightSum = 0.0;
  float wide = 0.0;
  float wideSum = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 d = vec2(float(x), float(y));
      float spatial = exp(-0.5 * dot(d, d)); // gaussian, sigma = 1 texel
      vec2 tap = vUv + d * uMaskTexel;

      vec3 dc = textureLod(uGuide, tap, 0.0).rgb - fg;
      float w = spatial * exp(-dot(dc, dc) * uRangeFalloff);
      sum += textureLod(uMask, tap, 0.0).r * w;
      weightSum += w;

      wide += textureLod(uMask, vUv + d * uMaskTexel * ${W.toFixed(1)}, 0.0).r * spatial;
      wideSum += spatial;
    }
  }
  float alpha = clamp(sum / max(weightSum, 1e-4), 0.0, 1.0);
  float wideAlpha = wide / wideSum;

  // The blur is premultiplied by 1 - person alpha; dividing that weight
  // back out reconstructs a background-only blur, with the background
  // extended a little way in under the subject's edge. Deep inside the
  // subject the weight hits 0 and bg falls to black — alpha is 1 there,
  // so it is never seen (and the wrap term has died off with wideAlpha).
  vec4 blurred = textureLod(uBlur, vUv, 0.0);
  vec3 bg = uUseImage == 1
    ? textureLod(uImage, vUv * uImageScale + uImageOffset, 0.0).rgb
    : clamp(blurred.rgb / max(blurred.a, 0.004), 0.0, 1.0);

  // Light wrapping. Peaks just inside the outline (solid alpha, but the
  // wide blur hasn't saturated yet) and dies off deeper in. Screened
  // rather than added so a bright background can't blow out skin.
  float wrap = uWrap * alpha * (1.0 - wideAlpha);
  fg = 1.0 - (1.0 - fg) * (1.0 - bg * wrap);

  fragColor = vec4(mix(bg, fg, alpha), 1.0);
}`;function j(a){const t=Math.min(O,Math.max(1,Math.round(a/N))),i=Math.max(.5,a/t),s=Math.min(I,Math.max(1,Math.ceil(3*i))),e=new Float32Array(I+1);let r=0;for(let n=0;n<=s;n++){const o=Math.exp(-(n*n)/(2*i*i));e[n]=o,r+=n===0?o:2*o}for(let n=0;n<=s;n++)e[n]/=r;return{downscale:t,radius:s,weights:e,lod:Math.log2(t)}}class w{static create(){try{const t=new w;return t.#i?t:null}catch{return null}}canvas=document.createElement("canvas");#i;#a=null;#u=null;#o=null;#t=null;#e=null;#h=null;#m=null;#f=null;#s=null;#d=!1;#E={sigma:-1,plan:null};#l=!1;#r=!1;constructor(){this.#i=this.canvas.getContext("webgl2",{alpha:!1,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1}),this.#i&&(this.canvas.addEventListener("webglcontextlost",t=>{t.preventDefault(),this.#r=!0}),this.canvas.addEventListener("webglcontextrestored",()=>{this.#T(),this.#r=!1}),this.#T())}resize(t,i){this.canvas.width!==t&&(this.canvas.width=t),this.canvas.height!==i&&(this.canvas.height=i)}setBackgroundImage(t){this.#s=t,this.#d=!0}render({video:t,mask:i,maskWidth:s,maskHeight:e,guide:r,spec:n,spread:o,wrap:h}){const u=this.#i;if(!u||this.#r||u.isContextLost()||!this.#a)return;const l=this.canvas.width,m=this.canvas.height,f=n.type==="image"&&this.#s,T=!f;this.#R(t),this.#g(i,s,e),this.#A(r),this.#d&&this.#c(),u.bindVertexArray(this.#u),T&&this.#p(l,m,n.blur);const{composite:c}=this.#a;u.bindFramebuffer(u.FRAMEBUFFER,null),u.viewport(0,0,l,m),u.useProgram(c.program),this.#n(u.TEXTURE0,this.#t.frame,c.u.uFrame,0),this.#n(u.TEXTURE1,this.#t.mask,c.u.uMask,1),this.#n(u.TEXTURE2,this.#t.guide,c.u.uGuide,2),this.#n(u.TEXTURE3,T?this.#t.blurA:this.#t.dummy,c.u.uBlur,3),this.#n(u.TEXTURE4,f?this.#t.image:this.#t.dummy,c.u.uImage,4),u.uniform2f(c.u.uMaskTexel,o/s,o/e),u.uniform1f(c.u.uRangeFalloff,1/(2*M*M)),u.uniform1f(c.u.uWrap,h),u.uniform1i(c.u.uUseImage,f?1:0),this.#b(c.u,l,m),u.drawArrays(u.TRIANGLE_STRIP,0,4),u.bindVertexArray(null)}dispose(){const t=this.#i;if(t){this.#s=null;for(const i of Object.values(this.#t??{}))t.deleteTexture(i);for(const i of Object.values(this.#e??{}))t.deleteFramebuffer(i);for(const i of Object.values(this.#a??{}))t.deleteProgram(i.program);t.deleteVertexArray(this.#u),t.deleteBuffer(this.#o),this.#t=this.#e=this.#a=null,t.getExtension("WEBGL_lose_context")?.loseContext()}}#T(){const t=this.#i;this.#l=!!t.getExtension("EXT_color_buffer_float"),this.#a={blit:A(t,b,H,["uSrc","uMask","uLod"]),blur:A(t,b,Y,["uSrc","uStep","uRadius","uWeight[0]"]),composite:A(t,b,V,["uFrame","uMask","uGuide","uBlur","uImage","uMaskTexel","uImageScale","uImageOffset","uRangeFalloff","uWrap","uUseImage"])},this.#o=t.createBuffer(),this.#u=t.createVertexArray(),t.bindVertexArray(this.#u),t.bindBuffer(t.ARRAY_BUFFER,this.#o),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0),t.bindVertexArray(null),this.#t={frame:g(t),mask:g(t),guide:g(t),image:g(t),pre:g(t),blurA:g(t),blurB:g(t),dummy:g(t)},t.bindTexture(t.TEXTURE_2D,this.#t.dummy),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),t.bindTexture(t.TEXTURE_2D,this.#t.pre),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR),this.#e={pre:t.createFramebuffer(),a:t.createFramebuffer(),b:t.createFramebuffer()},this.#h=null,this.#m=null,this.#f=null,this.#d=this.#s!==null,t.disable(t.DEPTH_TEST),t.disable(t.BLEND),t.pixelStorei(t.UNPACK_ALIGNMENT,1)}#R(t){const i=this.#i;i.bindTexture(i.TEXTURE_2D,this.#t.frame),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!0),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,i.RGBA,i.UNSIGNED_BYTE,t),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1)}#g(t,i,s){const e=this.#i;e.bindTexture(e.TEXTURE_2D,this.#t.mask),this.#f?.width!==i||this.#f?.height!==s?(e.texImage2D(e.TEXTURE_2D,0,e.R8,i,s,0,e.RED,e.UNSIGNED_BYTE,t),this.#f={width:i,height:s}):e.texSubImage2D(e.TEXTURE_2D,0,0,0,i,s,e.RED,e.UNSIGNED_BYTE,t)}#A(t){const i=this.#i;i.bindTexture(i.TEXTURE_2D,this.#t.guide),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!0),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,i.RGBA,i.UNSIGNED_BYTE,t),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1)}#c(){const t=this.#i;this.#d=!1,this.#s&&(t.bindTexture(t.TEXTURE_2D,this.#t.image),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,this.#s),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR),t.generateMipmap(t.TEXTURE_2D))}#p(t,i,s){const e=this.#i;this.#E.sigma!==s&&(this.#E={sigma:s,plan:j(s)});const{downscale:r,radius:n,weights:o,lod:h}=this.#E.plan,u=Math.max(8,Math.round(t/r)),l=Math.max(8,Math.round(i/r));(this.#m?.width!==t||this.#m?.height!==i)&&(e.bindTexture(e.TEXTURE_2D,this.#t.pre),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,t,i,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,this.#e.pre),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.#t.pre,0),this.#m={width:t,height:i}),(this.#h?.width!==u||this.#h?.height!==l)&&(this.#_(u,l),this.#l&&e.checkFramebufferStatus(e.FRAMEBUFFER)!==e.FRAMEBUFFER_COMPLETE&&(this.#l=!1,this.#_(u,l)),this.#h={width:u,height:l});const{blit:m,blur:f}=this.#a;e.bindFramebuffer(e.FRAMEBUFFER,this.#e.pre),e.viewport(0,0,t,i),e.useProgram(m.program),this.#n(e.TEXTURE3,this.#t.frame,m.u.uSrc,3),this.#n(e.TEXTURE1,this.#t.mask,m.u.uMask,1),e.uniform1f(m.u.uLod,0),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.bindTexture(e.TEXTURE_2D,this.#t.pre),e.generateMipmap(e.TEXTURE_2D),e.bindFramebuffer(e.FRAMEBUFFER,this.#e.a),e.viewport(0,0,u,l),this.#n(e.TEXTURE3,this.#t.pre,m.u.uSrc,3),this.#n(e.TEXTURE1,this.#t.dummy,m.u.uMask,1),e.uniform1f(m.u.uLod,h),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.useProgram(f.program),e.uniform1i(f.u.uRadius,n),e.uniform1fv(f.u["uWeight[0]"],o);for(const[T,c,d]of[[this.#t.blurA,this.#e.b,[1/u,0]],[this.#t.blurB,this.#e.a,[0,1/l]]])e.bindFramebuffer(e.FRAMEBUFFER,c),this.#n(e.TEXTURE3,T,f.u.uSrc,3),e.uniform2f(f.u.uStep,d[0],d[1]),e.drawArrays(e.TRIANGLE_STRIP,0,4)}#_(t,i){const s=this.#i;for(const[e,r]of[[this.#t.blurA,this.#e.a],[this.#t.blurB,this.#e.b]])s.bindTexture(s.TEXTURE_2D,e),this.#l?s.texImage2D(s.TEXTURE_2D,0,s.RGBA16F,t,i,0,s.RGBA,s.HALF_FLOAT,null):s.texImage2D(s.TEXTURE_2D,0,s.RGBA8,t,i,0,s.RGBA,s.UNSIGNED_BYTE,null),s.bindFramebuffer(s.FRAMEBUFFER,r),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,e,0)}#b(t,i,s){const e=this.#i,r=this.#s?.naturalWidth||this.#s?.width||0,n=this.#s?.naturalHeight||this.#s?.height||0;let o=1,h=1;if(r&&n){const u=i/s,l=r/n;l>u?o=u/l:h=l/u}e.uniform2f(t.uImageScale,o,h),e.uniform2f(t.uImageOffset,(1-o)/2,(1-h)/2)}#n(t,i,s,e){const r=this.#i;r.activeTexture(t),r.bindTexture(r.TEXTURE_2D,i),r.uniform1i(s,e)}}function g(a){const t=a.createTexture();return a.bindTexture(a.TEXTURE_2D,t),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),t}function A(a,t,i,s){const e=a.createProgram();if(a.attachShader(e,L(a,a.VERTEX_SHADER,t)),a.attachShader(e,L(a,a.FRAGMENT_SHADER,i)),a.bindAttribLocation(e,0,"aPos"),a.linkProgram(e),!a.getProgramParameter(e,a.LINK_STATUS))throw new Error(`program link failed: ${a.getProgramInfoLog(e)}`);const r={};for(const n of s)r[n]=a.getUniformLocation(e,n);return{program:e,u:r}}function L(a,t,i){const s=a.createShader(t);if(a.shaderSource(s,i),a.compileShader(s),!a.getShaderParameter(s,a.COMPILE_STATUS))throw new Error(`shader compile failed: ${a.getShaderInfoLog(s)}`);return s}const K="./models/selfie_segmenter_landscape.tflite",v=256,x=144,U=30,z=.8,$={lo:.3,hi:.7},q={lo:.35,hi:.8},J=1.25,Q=1,Z=.25,tt=.4,et=8,it=4,st=()=>{try{return typeof document.createElement("canvas").getContext("2d").filter=="string"}catch{return!1}};let _=null;function B(){return _??=(async()=>{const{ImageSegmenter:a}=await G(async()=>{const{ImageSegmenter:s}=await import("./vision_bundle-D5zfWKS-.js");return{ImageSegmenter:s}},[],import.meta.url),t={wasmLoaderPath:X,wasmBinaryPath:C},i=s=>({baseOptions:{modelAssetPath:K,delegate:s},runningMode:"VIDEO",outputConfidenceMasks:!0,outputCategoryMask:!1});try{return await a.createFromOptions(t,i("GPU"))}catch{return await a.createFromOptions(t,i("CPU"))}})(),_.catch(()=>{_=null}),_}function ut(){B().catch(()=>{})}let P=0;const at=URL.createObjectURL(new Blob([`let timer = null;
       onmessage = ({ data }) => {
         if (data.delay !== undefined) timer = setTimeout(() => postMessage(0), data.delay);
         else { clearTimeout(timer); timer = null; }
       };`],{type:"application/javascript"}));class y{track;#i;#a;#u=null;#o=document.createElement("video");#t;#e;#h=document.createElement("canvas");#m;#f=null;#s=0;#d=0;#E=null;#l=null;#r=null;#T=null;#R=null;#g=!1;#A=null;#c=null;#p=!1;#_=0;#b=!0;#n=-1;static async start(t,i){const s=await B(),e=new y(s);try{await e.setSpec(i),e.#U(t)}catch(r){throw e.stop(),r}return e}constructor(t){this.#i=t,this.#t=w.create(),this.#e=this.#t?.canvas??document.createElement("canvas"),this.#h.width=v,this.#h.height=x,this.#m=this.#h.getContext("2d",{willReadFrequently:!0}),this.#m.imageSmoothingQuality="high",this.#t||(this.#l=this.#e.getContext("2d"),this.#g=st(),this.#r=document.createElement("canvas"),this.#r.width=v,this.#r.height=x,this.#T=this.#r.getContext("2d"))}async setSpec(t){const i=++this.#_,s=t.type==="image"?await rt(t.src):null;i!==this.#_||this.#p||(this.#u=s,this.#a=t,this.#t?.setBackgroundImage(s),this.#b=!0)}stop(){this.#p||(this.#p=!0,this.#c?.postMessage({}),this.#c?.terminate(),this.#c=null,this.track?.stop(),this.#o.srcObject=null,this.#u=null,this.#t?.dispose(),this.#t=null)}#U(t){const i=t.getSettings?.()??{};this.#v(i.width||1280,i.height||720),this.#o.autoplay=!0,this.#o.muted=!0,this.#o.playsInline=!0,this.#o.srcObject=new MediaStream([t]),this.#o.play?.().catch(()=>{});const s=Math.min(U,i.frameRate||U),e=this.#e.captureStream(U);this.track=e.getVideoTracks()[0];try{this.track.contentHint="motion"}catch{}this.#x();const r=1e3/s;this.#c=new Worker(at,{name:"background-effect timer"}),this.#c.onmessage=()=>{if(this.#p)return;const n=performance.now();try{this.#x()}catch(h){console.warn("[background-effect] frame failed",h)}const o=performance.now()-n;this.#c?.postMessage({delay:Math.max(1,r-o)})},this.#c.postMessage({delay:r})}#v(t,i){this.#t?this.#t.resize(t,i):(this.#e.width!==t&&(this.#e.width=t),this.#e.height!==i&&(this.#e.height=i))}#x(){const t=this.#o;if(t.readyState<2||!t.videoWidth)return;const i=t.currentTime;if(!this.#b&&i===this.#n&&document.visibilityState==="visible")return;const s=t.videoWidth,e=t.videoHeight;if(this.#v(s,e),!!this.#I(t))if(this.#n=i,this.#b=!1,this.#t){const r=this.#a.type==="image"&&this.#u;this.#t.render({video:t,mask:this.#f,maskWidth:this.#s,maskHeight:this.#d,guide:this.#h,spec:this.#a,spread:r?Q:J,wrap:r?tt:Z})}else this.#w(t,s,e)}#I(t){this.#m.drawImage(t,0,0,v,x);const i=Math.max(performance.now(),P+1);P=i;const s=this.#i.segmentForVideo(this.#h,i);try{const e=s.confidenceMasks,r=e?.[e.length-1];if(!r)return!1;const n=r.getAsFloat32Array(),o=r.width,h=r.height;(this.#s!==o||this.#d!==h)&&(this.#s=o,this.#d=h,this.#f=new Uint8Array(o*h),this.#E=null,this.#t||(this.#R=new ImageData(o,h),this.#r.width=o,this.#r.height=h)),this.#E||(this.#E=Float32Array.from(n));const u=this.#E,l=this.#f,m=this.#t!==null,{lo:f,hi:T}=m?$:q,c=1/(T-f);for(let d=0;d<h;d++){const E=d*o,k=(m?h-1-d:d)*o;for(let R=0;R<o;R++){const S=n[E+R],D=(1-Math.min(1,2*Math.abs(S-.5)))*z,F=S*(1-D)+u[E+R]*D;u[E+R]=F;let p=(F-f)*c;p=p<0?0:p>1?1:p,l[k+R]=p*p*(3-2*p)*255|0}}if(!this.#t){const d=this.#R.data;for(let E=0;E<l.length;E++)d[E*4+3]=l[E];this.#T.putImageData(this.#R,0,0)}return!0}finally{s.close()}}#w(t,i,s){const e=this.#l,r=this.#a.type==="image"&&this.#u;e.globalCompositeOperation="copy",this.#g&&(e.filter=`blur(${r?it:et}px)`),e.drawImage(this.#r,0,0,this.#r.width,this.#r.height,0,0,i,s),e.globalCompositeOperation="source-in",this.#g&&(e.filter="none"),e.drawImage(t,0,0,i,s),e.globalCompositeOperation="destination-over",r?this.#S(this.#u,i,s):this.#g?(e.filter=`blur(${this.#a.blur}px)`,e.drawImage(t,0,0,i,s),e.filter="none"):this.#D(t,i,s),e.globalCompositeOperation="source-over"}#S(t,i,s){const e=t.naturalWidth||t.width,r=t.naturalHeight||t.height;if(!e||!r)return;const n=Math.max(i/e,s/r),o=e*n,h=r*n;this.#l.drawImage(t,(i-o)/2,(s-h)/2,o,h)}#D(t,i,s){const e=Math.max(2,Math.round(this.#a.blur/4)),r=Math.max(16,Math.round(i/e)),n=Math.max(9,Math.round(s/e));this.#A??=document.createElement("canvas");const o=this.#A;(o.width!==r||o.height!==n)&&(o.width=r,o.height=n),o.getContext("2d").drawImage(t,0,0,r,n),this.#l.imageSmoothingEnabled=!0,this.#l.drawImage(o,0,0,r,n,0,0,i,s)}}function rt(a){return new Promise((t,i)=>{const s=new Image;s.crossOrigin="anonymous",s.onload=()=>t(s),s.onerror=()=>i(new Error("background image failed to load")),s.src=a})}export{y as BackgroundEffect,ut as preloadBackgroundEngine};
//# sourceMappingURL=background-effect-BC7KeERo.js.map
