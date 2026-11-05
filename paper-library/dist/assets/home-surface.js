/* One parametric object, shared by shaded material, wire geometry and six locations.
   No external assets, telemetry, dependencies or scientific-data claims. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const WIDTH = .36, THICKNESS = .035;
  function surface(u, v) {
    const c = Math.cos(u / 2), s = Math.sin(u / 2);
    const r = 1 + WIDTH * Math.cos(v) * c - THICKNESS * Math.sin(v) * s;
    return [r * Math.cos(u), r * Math.sin(u), WIDTH * Math.cos(v) * s + THICKNESS * Math.sin(v) * c];
  }
  function locationU(index) { return ((index + 2.24) % 6) / 6 * TAU; }
  function section(index, steps=48) {
    const u=locationU(index);
    return Array.from({length:steps+1},(_,j)=>({u,v:j/steps*TAU,point:surface(u,j/steps*TAU)}));
  }
  function normal(u, v) {
    const p = surface(u, v), a = surface(u + .0001, v), b = surface(u, v + .0001);
    const du = a.map((x, i) => x - p[i]), dv = b.map((x, i) => x - p[i]);
    const n = [du[1]*dv[2]-du[2]*dv[1], du[2]*dv[0]-du[0]*dv[2], du[0]*dv[1]-du[1]*dv[0]];
    const length = Math.hypot(...n);
    return n.map(x => x / length);
  }
  function rotation(time,yaw=0,pitch=0) {
    const x = -.72+pitch, y = .42 + Math.sin(time*.13)*.09+yaw, z = -.32;
    const cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);
    return new Float32Array([cy*cz,cy*sz,-sy,sx*sy*cz-cx*sz,sx*sy*sz+cx*cz,sx*cy,cx*sy*cz+sx*sz,cx*sy*sz-sx*cz,cx*cy]);
  }
  function transformed(p, m) {
    return [m[0]*p[0]+m[3]*p[1]+m[6]*p[2],m[1]*p[0]+m[4]*p[1]+m[7]*p[2],m[2]*p[0]+m[5]*p[1]+m[8]*p[2]];
  }
  function stonePixels(size=128) {
    const data=new Uint8Array(size*size*4);
    const hash=(x,y,n)=>{const v=Math.sin(((x%n+n)%n)*127.1+((y%n+n)%n)*311.7+17.3)*43758.5453;return v-Math.floor(v);};
    function noise(x,y,n){const ix=Math.floor(x),iy=Math.floor(y);let a=x-ix,b=y-iy;a=a*a*(3-2*a);b=b*b*(3-2*b);return (hash(ix,iy,n)*(1-a)+hash(ix+1,iy,n)*a)*(1-b)+(hash(ix,iy+1,n)*(1-a)+hash(ix+1,iy+1,n)*a)*b;}
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const coarse=noise(x/size*8,y/size*8,8),medium=noise(x/size*32,y/size*32,32),grain=hash(x,y,size);
      const value=Math.max(0,Math.min(255,Math.round(255*(.22+.35*coarse+.25*medium+.18*grain-(grain<.035?.18:0)))));
      const offset=(y*size+x)*4;data[offset]=data[offset+1]=data[offset+2]=value;data[offset+3]=255;
    }
    return data;
  }
  const vertex = `attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
    uniform mat3 rotation; uniform vec2 viewport; uniform vec2 center; uniform float scale;
    varying vec3 n; varying vec3 p; varying vec3 objectPoint; varying vec2 tex;
    void main(){p=rotation*position;n=rotation*normal;objectPoint=position;tex=uv;float depth=4.5-p.z;
      vec2 pixel=center+vec2(p.x,-p.y)*scale*4.5/depth;
      gl_Position=vec4(pixel.x/viewport.x*2.0-1.0,1.0-pixel.y/viewport.y*2.0,-p.z*.25,1.0);}`;
  const fragment = `precision highp float; varying vec3 n; varying vec3 p; varying vec3 objectPoint; varying vec2 tex; uniform float wire; uniform float reveal; uniform vec3 focus; uniform float materialKind; uniform sampler2D stoneTexture; uniform mat3 rotation;
    void main(){if(wire<.5 && tex.x<reveal)discard;if(wire>.5 && wire<1.5 && reveal<1. && tex.x>=reveal)discard;vec3 N=normalize(n);vec3 V=normalize(vec3(0.,0.,4.5)-p);if(dot(N,V)<0.)N=-N;
      vec3 L=normalize(vec3(-.7,1.1,1.8));vec3 H=normalize(L+V);
      float diffuse=max(dot(N,L),0.);float grain=.004*sin(tex.y*320.+sin(tex.x*40.)*.8);
      float rough=.31+grain;float reflection=pow(max(dot(N,H),0.),24.+rough*24.);
      float edge=pow(1.-max(dot(N,V),0.),3.);float fold=.77+.23*smoothstep(-.7,.9,p.z);
      // A fixed studio environment: broad warm strip and cool grazing reflection.
      // Reflections respond to the same surface normal when the viewer turns it.
      vec3 R=reflect(-V,N);
      float stripCoord=(R.x+.28)/.28;
      float strip=exp(-stripCoord*stripCoord)*smoothstep(-.55,.55,R.y);
      float cool=pow(max(dot(R,normalize(vec3(.85,.25,.35))),0.),9.);
      float lowerReflection=pow(max(dot(R,normalize(vec3(.7,-.35,.55))),0.),3.);
      vec3 metal=vec3(.23,.28,.29)*(.28+.72*diffuse)*fold;
      metal+=vec3(1.,.80,.51)*(strip*.88+reflection*.52);
      metal+=vec3(.48,.76,.88)*(cool*.46+edge*.18);
      metal+=vec3(.48,.57,.58)*lowerReflection*.38;
      metal+=grain+vec3(.20,.12,.035)*exp(-dot(p-focus,p-focus)*9.);
      if(materialKind>.5 && wire<.5){
        vec2 st=objectPoint.xy*1.7+objectPoint.z*vec2(.4,.7);
        float grainValue=texture2D(stoneTexture,st).r;
        float gx=texture2D(stoneTexture,st+vec2(1./128.,0.)).r-grainValue;
        float gy=texture2D(stoneTexture,st+vec2(0.,1./128.)).r-grainValue;
        vec3 roughN=normalize(N-rotation*vec3(gx*1.7,gy*1.7,gx*.4+gy*.7)*.8);
        float stoneDiffuse=max(dot(roughN,L),0.);
        metal=vec3(.72,.69,.60)*(.56+.64*grainValue)*(.32+.78*stoneDiffuse);
        metal+=vec3(.12,.13,.12)*pow(max(dot(roughN,H),0.),6.)*.20;
      }
      if(wire>.5)metal=vec3(.49,.69,.72)*(.65+.35*diffuse);
      if(wire>1.5)metal=vec3(.96,.72,.39); gl_FragColor=vec4(metal,1.);}`;
  function create(canvas,onLoss=()=>{}) {
    let gl;
    try { gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false}); } catch (_) { return null; }
    if(!gl || typeof gl.createShader!=='function')return null;
    const resources=[];
    function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('Shader unavailable');}resources.push(['shader',s]);return s;}
    try {
      const program=gl.createProgram();resources.push(['program',program]);
      gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Program unavailable');
      const positions=[],normals=[],uvs=[],triangles=[],lines=[],U=120,V=24;
      for(let i=0;i<=U;i++)for(let j=0;j<=V;j++){const u=i/U*TAU,v=j/V*TAU;positions.push(...surface(u,v));normals.push(...normal(u,v));uvs.push(i/U,j/V);}
      for(let i=0;i<U;i++)for(let j=0;j<V;j++){const a=i*(V+1)+j,b=a+V+1;triangles.push(a,b,a+1,a+1,b,b+1);if(i%4===0)lines.push(a,a+1);if(j%3===0)lines.push(a,b);}
      // Six exact editorial-location sections share the existing surface and camera.
      // They are geometry coordinates, not measurements of the papers.
      const sectionIndices=[];
      for(let index=0;index<6;index++){
        const start=positions.length/3,indices=[];
        for(const sample of section(index)){positions.push(...sample.point);normals.push(...normal(sample.u,sample.v));uvs.push(sample.u/TAU,sample.v/TAU);}
        for(let j=0;j<48;j++)indices.push(start+j,start+j+1);
        sectionIndices.push(indices);
      }
      function attribute(name,data,size){const buffer=gl.createBuffer();resources.push(['buffer',buffer]);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,0,0);}
      gl.useProgram(program);attribute('position',positions,3);attribute('normal',normals,3);attribute('uv',uvs,2);
      function elements(data){const buffer=gl.createBuffer();resources.push(['buffer',buffer]);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(data),gl.STATIC_DRAW);return buffer;}
      const solid=elements(triangles),grid=elements(lines),sections=sectionIndices.map(elements);
      const stoneTexture=gl.createTexture();resources.push(['texture',stoneTexture]);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,stoneTexture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,128,128,0,gl.RGBA,gl.UNSIGNED_BYTE,stonePixels());
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
      const uniforms=Object.fromEntries(['rotation','viewport','center','scale','wire','reveal','focus','materialKind','stoneTexture'].map(name=>[name,gl.getUniformLocation(program,name)]));
      let width=1,height=1,mobile=false,lost=false,viewYaw=0,viewPitch=0,materialKind=0;
      canvas.addEventListener('webglcontextlost',()=>{lost=true;onLoss();});
      function frame(time,mode,selectedIndex=0,blend=mode?1:0,sectionIndex=-1){
        if(lost||gl.isContextLost())return null;
        const matrix=rotation(time,viewYaw,viewPitch),center=mobile?[width*.52,192]:[width*.755,height*.50],scale=mobile?Math.min(width*.2,48):Math.min(width*.15,height*.31);
        gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
        gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,stoneTexture);gl.uniform1i(uniforms.stoneTexture,0);gl.uniform1f(uniforms.materialKind,materialKind);gl.uniformMatrix3fv(uniforms.rotation,false,matrix);gl.uniform2f(uniforms.viewport,width,height);gl.uniform2f(uniforms.center,...center);gl.uniform1f(uniforms.scale,scale);gl.uniform1f(uniforms.reveal,Math.max(0,Math.min(1,blend)));
        const focusPoint=transformed(surface(locationU(Math.max(0,selectedIndex)),0),matrix);gl.uniform3f(uniforms.focus,...focusPoint);
        // Complementary UV masks reveal the same mesh, not a second animated object.
        if(blend<1){gl.uniform1f(uniforms.wire,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,solid);gl.drawElements(gl.TRIANGLES,triangles.length,gl.UNSIGNED_SHORT,0);}
        if(blend>0){gl.uniform1f(uniforms.wire,1);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,grid);gl.drawElements(gl.LINES,lines.length,gl.UNSIGNED_SHORT,0);}
        if(mode>0&&sectionIndex>=0&&sectionIndex<6){
          gl.uniform1f(uniforms.wire,2);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,sections[sectionIndex]);gl.drawElements(gl.LINES,sectionIndices[sectionIndex].length,gl.UNSIGNED_SHORT,0);
        }
        // Facing uses the same perspective camera as the shader; this is not occlusion testing.
        return Array.from({length:6},(_,i)=>{const u=locationU(i),v=0,p=transformed(surface(u,v),matrix),n=transformed(normal(u,v),matrix),perspective=4.5/(4.5-p[2]);return{x:center[0]+p[0]*scale*perspective,y:center[1]-p[1]*scale*perspective,front:-n[0]*p[0]-n[1]*p[1]+n[2]*(4.5-p[2])>=0};});
      }
      return {setMaterial(kind){materialKind=kind==='stone'?1:0;},sectionLabel(index){return index>=0&&index<6?'図上の選択位置: u = '+locationU(index).toFixed(3)+' rad, v = 0':'';},setView(yaw,pitch){viewYaw=Math.max(-.35,Math.min(.35,yaw));viewPitch=Math.max(-.18,Math.min(.18,pitch));},resize(w,h,dpr,isMobile){width=w;height=h;mobile=isMobile;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);},draw:frame,equation:'r = 1 + 0.36 cos v cos(u/2) − 0.035 sin v sin(u/2)\np(u,v) = (r cos u, r sin u, 0.36 cos v sin(u/2) + 0.035 sin v cos(u/2))'};
    } catch (_) {
      for(const [kind,resource] of resources){if(kind==='shader')gl.deleteShader(resource);else if(kind==='program')gl.deleteProgram(resource);else if(kind==='texture')gl.deleteTexture(resource);else gl.deleteBuffer(resource);}
      return null;
    }
  }
  window.ResearchSurface={create,surface,normal,rotation,transformed,locationU,section,stonePixels};
})();
