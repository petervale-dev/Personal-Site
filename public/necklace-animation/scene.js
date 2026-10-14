(() => {
  const canvas = document.getElementById('scene');
  const wrap = document.getElementById('canvas-wrap');
  const asciiCanvas = document.getElementById('ascii-layer');
  const asciiContext = asciiCanvas?.getContext('2d');
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'high-performance' });
  if (!gl) { document.getElementById('fallback').hidden = false; return; }

  const vertex = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPosition;
    layout(location=1) in vec3 aNormal;
    layout(location=2) in vec2 aUV;
    uniform mat4 uMVP;
    uniform mat4 uModel;
    out vec3 vNormal;
    out vec3 vWorld;
    out vec2 vUV;
    void main(){ vec4 p=uModel*vec4(aPosition,1.0); vWorld=p.xyz; vNormal=mat3(uModel)*aNormal; vUV=aUV; gl_Position=uMVP*vec4(aPosition,1.0); }
  `;
  const fragment = `#version 300 es
    precision highp float;
    in vec3 vNormal;
    in vec3 vWorld;
    in vec2 vUV;
    uniform int uMaterial;
    out vec4 frag;
    void main(){
      vec3 n=normalize(vNormal), view=normalize(vec3(0.0,-0.2,19.2)-vWorld);
      vec3 l1=normalize(vec3(-0.55,0.86,1.0)), l2=normalize(vec3(0.9,-0.2,0.7));
      float a=max(dot(n,l1),0.0), b=max(dot(n,l2),0.0);
      float s1=pow(max(dot(reflect(-l1,n),view),0.0),20.0);
      float s2=pow(max(dot(reflect(-l2,n),view),0.0),36.0);
      vec3 r=reflect(-view,n);
      float band=pow(max(0.0,cos(r.x*11.0+r.y*3.0)),9.0);
      float edge=pow(1.0-max(dot(n,view),0.0),2.0);
      float broad=pow(max(dot(reflect(-l1,n),view),0.0),7.0);
      float panelA=pow(max(0.0,1.0-abs(r.x+0.58)/0.24),2.0);
      float panelB=pow(max(0.0,1.0-abs(r.x-0.50)/0.20),2.0);
      float darkStrip=pow(max(0.0,1.0-abs(r.x+0.10)/0.11),2.0);
      vec3 silver=vec3(0.30,0.31,0.32)+vec3(0.19,0.20,0.20)*a+vec3(0.06,0.065,0.07)*b;
      silver+=vec3(0.085,0.09,0.095)*panelA+vec3(0.06,0.065,0.07)*panelB-vec3(0.045)*darkStrip;
      silver+=vec3(0.10,0.11,0.12)*s1+vec3(0.06,0.065,0.07)*s2+vec3(0.02)*band+vec3(0.04)*broad;
      silver+=vec3(0.07)*edge;
      vec3 color=silver;
      if(uMaterial==4) color=vec3(0.11,0.115,0.12)+silver*1.12;
      if(uMaterial==1) color=vec3(0.026,0.034,0.044)+vec3(0.075)*a+vec3(0.09)*s1;
      if(uMaterial==2) color=vec3(0.005,0.009,0.014)+vec3(0.08,0.10,0.12)*a+vec3(0.23,0.28,0.31)*(s1+s2)+vec3(0.08)*edge;
      frag=vec4(clamp(color,vec3(0.0),vec3(1.0)),1.0);
    }
  `;
  function shader(type, source) { const s=gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; }
  const program=gl.createProgram(); gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex)); gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment)); gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const uni={mvp:gl.getUniformLocation(program,'uMVP'),model:gl.getUniformLocation(program,'uModel'),material:gl.getUniformLocation(program,'uMaterial')};

  const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
  function translate(x,y,z){const m=identity();m[12]=x;m[13]=y;m[14]=z;return m;}
  function rotateX(t){const m=identity(),c=Math.cos(t),s=Math.sin(t);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;}
  function rotateY(t){const m=identity(),c=Math.cos(t),s=Math.sin(t);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;}
  function rotateZ(t){const m=identity(),c=Math.cos(t),s=Math.sin(t);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;}
  function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),m=new Float32Array(16);m[0]=f/aspect;m[5]=f;m[10]=(far+near)/(near-far);m[11]=-1;m[14]=2*far*near/(near-far);return m;}
  const meshCache=new Map(), items=[], chainItems=[];
  function upload(key,make){if(meshCache.has(key))return meshCache.get(key);const g=make(),vao=gl.createVertexArray();gl.bindVertexArray(vao);const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.v),gl.STATIC_DRAW);const ibo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(g.i),gl.STATIC_DRAW);for(let [idx,size,offset] of [[0,3,0],[1,3,12],[2,2,24]]){gl.enableVertexAttribArray(idx);gl.vertexAttribPointer(idx,size,gl.FLOAT,false,32,offset);}gl.bindVertexArray(null);const mesh={vao,count:g.i.length};meshCache.set(key,mesh);return mesh;}
  function geometry(){return {v:[],i:[]};}
  function quad(g,a,b,c,d,n){const start=g.v.length/8;[[a,0,0],[b,1,0],[c,1,1],[d,0,1]].forEach(([p,u,v])=>g.v.push(...p,...n,u,v));g.i.push(start,start+1,start+2,start,start+2,start+3);}
  function box(w,h,d){const g=geometry(),x=w/2,y=h/2,z=d/2;quad(g,[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z],[0,0,1]);quad(g,[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z],[0,0,-1]);quad(g,[x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z],[1,0,0]);quad(g,[-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z],[-1,0,0]);quad(g,[-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z],[0,1,0]);quad(g,[-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z],[0,-1,0]);return g;}
  function crossBody(){const g=geometry(),z=.15,outline=[[-.4,-2],[.4,-2],[.4,.185],[1.425,.185],[1.425,.915],[.4,.915],[.4,2],[-.4,2],[-.4,.915],[-1.425,.915],[-1.425,.185],[-.4,.185]];
    const face=(x1,x2,y1,y2,z,n)=>{if(n>0)quad(g,[x1,y1,z],[x2,y1,z],[x2,y2,z],[x1,y2,z],[0,0,1]);else quad(g,[x2,y1,z],[x1,y1,z],[x1,y2,z],[x2,y2,z],[0,0,-1]);};
    for(const depth of [z,-z]){const n=depth>0?1:-1;face(-.4,.4,.915,2,depth,n);face(-1.425,1.425,.185,.915,depth,n);face(-.4,.4,-2,.185,depth,n);}
    for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);quad(g,[a[0],a[1],-z],[b[0],b[1],-z],[b[0],b[1],z],[a[0],a[1],z],[dy/length,-dx/length,0]);}
    return g;}
  function crossBevel(){const g=geometry(),outline=[[-.4,-2],[.4,-2],[.4,.185],[1.425,.185],[1.425,.915],[.4,.915],[.4,2],[-.4,2],[-.4,.915],[-1.425,.915],[-1.425,.185],[-.4,.185]];
    for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length],c=[b[0]*.965,b[1]*.965],d=[a[0]*.965,a[1]*.965];const dx=b[0]-a[0],dy=b[1]-a[1],inX=d[0]-a[0],inY=d[1]-a[1],nx=dy*.055,ny=-dx*.055,nz=dx*inY-dy*inX,m=Math.hypot(nx,ny,nz)||1;quad(g,[a[0],a[1],.15],[b[0],b[1],.15],[c[0],c[1],.205],[d[0],d[1],.205],[nx/m,ny/m,nz/m]);}
    return g;}
  function sphere(radius,segments=12,rings=8){const g=geometry();for(let j=0;j<=rings;j++){const p=j*Math.PI/rings;for(let i=0;i<=segments;i++){const t=i*2*Math.PI/segments,n=[Math.sin(p)*Math.cos(t),Math.cos(p),Math.sin(p)*Math.sin(t)];g.v.push(...n.map(v=>v*radius),...n,i/segments,j/rings);}}for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;g.i.push(a,a+1,b,b,a+1,b+1);}return g;}
  function torus(rx,ry,tube,segments=28,sides=10,depth=tube){const g=geometry();for(let i=0;i<=segments;i++){const u=i*2*Math.PI/segments,cu=Math.cos(u),su=Math.sin(u),radialLength=Math.hypot(cu/rx,su/ry),radialX=(cu/rx)/radialLength,radialY=(su/ry)/radialLength;for(let j=0;j<=sides;j++){const v=j*2*Math.PI/sides,cv=Math.cos(v),sv=Math.sin(v),nx=radialX*cv/tube,ny=radialY*cv/tube,nz=sv/depth,nlen=Math.hypot(nx,ny,nz);g.v.push(rx*cu+tube*cv*radialX,ry*su+tube*cv*radialY,depth*sv,nx/nlen,ny/nlen,nz/nlen,i/segments,j/sides);}}for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;g.i.push(a,b,a+1,b,b+1,a+1);}return g;}
  function add(mesh,material,x=0,y=0,z=0,rz=0,ry=0,rx=0){items.push({mesh,material,local:mul(translate(x,y,z),mul(rotateZ(rz),mul(rotateY(ry),rotateX(rx))))});}
  function scale(s){const m=identity();m[0]=m[5]=m[10]=s;return m;}
  const cube=(w,h,d)=>upload(`b:${w}:${h}:${d}`,()=>box(w,h,d));
  const orb=(r)=>upload(`s:${r}`,()=>sphere(r));
  const link=asciiCanvas
    ? upload('curb-ascii-thin',()=>torus(.160,.087,.036,36,12,.029))
    : upload('curb-v3',()=>torus(.170,.094,.058,36,12,.041));
  const smallLink=upload('small-link',()=>torus(.145,.095,.035));
  const loop=upload('loop',()=>torus(.22,.30,.085));

  // The photographed pendant has broad arms, a long stem, dark stones, and two rows of tiny silver beads.
  const cy=0;
  function crossBar(w,h,y,z,d,mat){add(cube(w,h,d),mat,0,cy+y,z);}
  add(upload('single-cross-body',crossBody),0);
  add(upload('raised-cross-bevel',crossBevel),0);
  crossBar(.70,3.88,0,.167,.018,1);crossBar(2.73,.63,.55,.167,.018,1);
  crossBar(.37,3.57,-.01,.185,.018,0);crossBar(2.51,.35,.55,.185,.018,0);
  crossBar(.28,3.48,-.01,.203,.018,1);crossBar(2.42,.27,.55,.203,.018,1);
  const stud=orb(.052),gem=upload('faceted-stone',()=>sphere(.093,10,5)),pin=orb(.027),setting=upload('stone-setting',()=>torus(.091,.091,.013,18,6,.012));
  for(let y=-1.82;y<1.90;y+=.16){for(const x of [-.315,.315]) add(stud,0,x,cy+y,.202);}
  for(let x=-1.29;x<1.30;x+=.16){for(const y of [.285,.815])if(Math.abs(x)>.40)add(stud,0,x,cy+y,.202);}
  for(let y=-1.70;y<1.77;y+=.235){add(setting,0,0,y,.27);add(gem,2,0,y,.265);for(const x of [-.092,.092])for(const dy of [-.071,.071])add(pin,0,x,y+dy,.294);}
  for(let x=-1.13;x<1.14;x+=.235){if(Math.abs(x)<.18)continue;add(setting,0,x,.55,.27);add(gem,2,x,.55,.267);for(const dx of [-.071,.071])for(const dy of [-.092,.092])add(pin,0,x+dx,.55+dy,.293);}
  for(const x of [-.395,.395]){add(cube(.035,3.95,.045),0,x,cy,.18);}
  for(const y of [.17,.93])add(cube(2.83,.035,.045),0,0,cy+y,.18);
  add(loop,0,0,2.30,.03,0,.25);
  add(smallLink,0,0,2.62,.0,Math.PI/2,.30);
  for(const x of [-.22,.22])add(cube(.035,3.70,.030),0,x,-.02,.218);
  for(let y=-1.73;y<1.75;y+=.235)for(const x of [-.13,.13])add(pin,0,x,y,.272);

  // One closed loop. Each visible link uses a shared 3D mesh and a moving particle.
  const count=128, ring=[];
  const phases=Array.from({length:4},()=>Math.random()*Math.PI*2);
  for(let i=0;i<count;i++){
    const t=-Math.PI/2+i*2*Math.PI/count;
    const fade=(1+Math.sin(t))*.5;
    const irregularity=fade*(.11*Math.sin(3*t+phases[0])+.065*Math.sin(5*t+phases[1])+.035*Math.sin(7*t+phases[2]));
    const radius=1+irregularity;
    const restX=3.65*Math.cos(t)*radius+.075*fade*Math.sin(4*t+phases[3]);
    const restY=1.20+4.15*Math.sin(t)*radius;
    ring.push({x:restX,y:restY,px:restX,py:restY,restX,restY,homeX:restX,homeY:restY});
    chainItems.push({mesh:link,material:0,index:i});
  }
  const restLengths=ring.map((p,i)=>Math.hypot(ring[(i+1)%count].x-p.x,ring[(i+1)%count].y-p.y));
  const homeLengths=restLengths.slice();
  try{localStorage.removeItem('peter-vale-necklace-shape-v2');}catch{}

  gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);
  let width=0,height=0,projection=identity(),camera=identity(),distance=20.5;
  let asciiColumns=0,asciiRows=0,asciiPixels=null,asciiFont=0,lastAscii=-Infinity;
  function resize(){
    const rect=wrap.getBoundingClientRect(),dpr=asciiCanvas?.85:Math.min(devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
    if(w===width&&h===height)return;
    width=w;height=h;canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);
    projection=perspective(38*Math.PI/180,w/h,.1,100);
    distance=Math.max(23,9.5/(2*Math.tan(19*Math.PI/180)*(w/h)));
    camera=translate(0,.2,-distance);
    if(asciiCanvas){
      asciiFont=Math.max(5.2,rect.width/(320*.60),rect.height/(165*1.05));
      asciiColumns=Math.max(1,Math.floor(rect.width/(asciiFont*.60)));
      asciiRows=Math.max(1,Math.floor(rect.height/(asciiFont*1.05)));
      const textDpr=Math.min(devicePixelRatio||1,2);
      asciiCanvas.width=Math.max(1,Math.round(rect.width*textDpr));
      asciiCanvas.height=Math.max(1,Math.round(rect.height*textDpr));
      asciiContext.setTransform(textDpr,0,0,textDpr,0,0);
      asciiContext.font=`700 ${asciiFont}px Menlo, Monaco, Consolas, monospace`;
      asciiContext.textBaseline='top';
      asciiPixels=new Uint8Array(w*h*4);
    }
  }
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let targetX=-.05,targetY=.06,rotX=-.05,rotY=.06,velX=0,velY=0,dragging=false,grabbed=-1,returning=false,lastX=0,lastY=0,pointerX=0,pointerY=0,zoom=1;
  let pendulum=0,pendulumVel=0,lastBottomX=ring[0].x,clock=0,accumulator=0;
  function worldPoint(e){const r=canvas.getBoundingClientRect(),halfH=distance*zoom*Math.tan(19*Math.PI/180),halfW=halfH*r.width/r.height;return [((e.clientX-r.left)/r.width-.5)*2*halfW-camera[12],(.5-(e.clientY-r.top)/r.height)*2*halfH-camera[13]];}
  canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);[pointerX,pointerY]=worldPoint(e);let best=.52;grabbed=-1;for(let i=0;i<count;i++){const d=Math.hypot(ring[i].x-pointerX,ring[i].y-pointerY);if(d<best){best=d;grabbed=i;}}if(grabbed>=0)returning=false;});
  function release(){
    if(grabbed>=0){
      for(let i=0;i<count;i++){
        const p=ring[i],next=ring[(i+1)%count];
        p.restX=p.px=p.x;p.restY=p.py=p.y;
        restLengths[i]=Math.hypot(next.x-p.x,next.y-p.y);
      }
      lastBottomX=ring[0].x;
      returning=true;
    }
    dragging=false;grabbed=-1;
  }
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  canvas.addEventListener('pointermove',e=>{[pointerX,pointerY]=worldPoint(e);if(dragging){if(grabbed<0){targetY+=(e.clientX-lastX)*.007;targetX+=(e.clientY-lastY)*.007;targetX=Math.max(-.72,Math.min(.72,targetX));targetY=Math.max(-.85,Math.min(.85,targetY));}lastX=e.clientX;lastY=e.clientY;}else{const r=canvas.getBoundingClientRect();targetY=((e.clientX-r.left)/r.width-.5)*.42;targetX=-((e.clientY-r.top)/r.height-.5)*.28;}});
  canvas.addEventListener('pointerleave',()=>{if(!dragging){targetX=-.05;targetY=.06;}});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.55,Math.min(1.8,zoom+e.deltaY*.0007));},{passive:false});
  document.getElementById('reset').addEventListener('click',()=>{targetX=rotX=-.05;targetY=rotY=.06;velX=velY=pendulum=pendulumVel=0;zoom=1;returning=false;ring.forEach((p,i)=>{p.x=p.px=p.restX=p.homeX;p.y=p.py=p.restY=p.homeY;restLengths[i]=homeLengths[i];});lastBottomX=ring[0].x;});
  function step(){
    velX=(velX+(targetX-rotX)*.023)*.85;velY=(velY+(targetY-rotY)*.023)*.85;rotX+=velX;rotY+=velY;
    if(returning){
      let remaining=0;
      for(let i=0;i<count;i++){
        const p=ring[i];
        p.restX+=(p.homeX-p.restX)*.006;
        p.restY+=(p.homeY-p.restY)*.006;
        restLengths[i]+=(homeLengths[i]-restLengths[i])*.006;
        remaining=Math.max(remaining,Math.abs(p.homeX-p.restX),Math.abs(p.homeY-p.restY));
      }
      if(remaining<.001){
        ring.forEach((p,i)=>{p.restX=p.homeX;p.restY=p.homeY;restLengths[i]=homeLengths[i];});
        returning=false;
      }
    }
    for(let i=0;i<count;i++){
      const p=ring[i];if(i===grabbed){p.px=p.x;p.py=p.y;p.x=pointerX;p.y=pointerY;continue;}
      const vx=(p.x-p.px)*.90,vy=(p.y-p.py)*.90,anchor=grabbed>=0?.003:.035;p.px=p.x;p.py=p.y;
      p.x+=vx+(p.restX-p.x)*anchor-velY*(p.restY-1.20)*.09;
      p.y+=vy+(p.restY-p.y)*anchor+velX*p.restX*.09;
    }
    for(let iteration=0;iteration<5;iteration++)for(let i=0;i<count;i++){
      const a=ring[i],b=ring[(i+1)%count],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,correction=(d-restLengths[i])/d*.47,ox=dx*correction,oy=dy*correction;
      if(i!==grabbed){a.x+=ox;a.y+=oy;}if((i+1)%count!==grabbed){b.x-=ox;b.y-=oy;}
    }
    const bottom=ring[0];pendulumVel=(pendulumVel-pendulum*.025-(bottom.x-lastBottomX)*.018+velY*.020)*.91;pendulum=Math.max(-.34,Math.min(.34,pendulum+pendulumVel));lastBottomX=bottom.x;
  }
  function draw(mesh,material,model,vp){gl.uniformMatrix4fv(uni.model,false,model);gl.uniformMatrix4fv(uni.mvp,false,mul(vp,model));gl.uniform1i(uni.material,material);gl.bindVertexArray(mesh.vao);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);}
  function renderAscii(){
    gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,asciiPixels);
    const tones='@#%WM$8B&XOxo*+=-:,.`';
    const grays=['#2a407b','#324a86','#3a528e','#435b98','#526aa1','#667aad','#7e8fb9','#96a3c4','#aeb8d0','#c5cddd'];
    const cellWidth=asciiFont*.60,cellHeight=asciiFont*1.05;
    const offsetX=(asciiCanvas.clientWidth-asciiColumns*cellWidth)/2;
    const offsetY=(asciiCanvas.clientHeight-asciiRows*cellHeight)/2;
    asciiContext.clearRect(0,0,asciiCanvas.clientWidth,asciiCanvas.clientHeight);
    for(let row=0;row<asciiRows;row++){
      for(let col=0;col<asciiColumns;col++){
        let coverage=0,luminance=0;
        for(let sy=0;sy<3;sy++)for(let sx=0;sx<3;sx++){
          const x=Math.min(width-1,Math.floor((col+(sx+.5)/3)*width/asciiColumns));
          const y=Math.min(height-1,Math.floor((asciiRows-row-1+(sy+.5)/3)*height/asciiRows));
          const offset=(y*width+x)*4,alpha=asciiPixels[offset+3]/255;
          coverage+=alpha;
          luminance+=alpha*(.2126*asciiPixels[offset]+.7152*asciiPixels[offset+1]+.0722*asciiPixels[offset+2])/255;
        }
        coverage/=9;
        if(coverage<.07)continue;
        luminance/=9*coverage;
        const shade=Math.max(0,Math.min(tones.length-1,Math.round(luminance*(tones.length-1))));
        const gray=Math.max(0,Math.min(grays.length-1,Math.round(luminance*(grays.length-1))));
        asciiContext.fillStyle=grays[gray];
        asciiContext.fillText(coverage<.18?'.':tones[shade],offsetX+col*cellWidth,offsetY+row*cellHeight);
      }
    }
  }
  function render(time){
    resize();if(!clock)clock=time;accumulator+=Math.min(50,time-clock);clock=time;while(accumulator>=16.667){step();accumulator-=16.667;}
    if(asciiCanvas&&time-lastAscii<50){requestAnimationFrame(render);return;}
    lastAscii=time;
    const drift=reduced?0:Math.sin(time*.0005)*.005,root=mul(rotateY(rotY+drift),rotateX(rotX));
    const bottom=ring[0],crossScale=asciiCanvas?.95:.62;
    const cross=mul(translate(bottom.x,bottom.y,.06),mul(rotateZ(pendulum),mul(translate(0,-2.62*crossScale,0),scale(crossScale))));
    const pendant=mul(root,cross);
    const focus=Math.max(0,Math.min(1,(1-zoom)/.30));
    camera=translate(-pendant[12]*focus,.2*(1-focus)-pendant[13]*focus,-distance*zoom);
    const vp=mul(projection,camera);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    for(const item of chainItems){const i=item.index,p=ring[i],prev=ring[(i+count-1)%count],next=ring[(i+1)%count],angle=Math.atan2(next.y-prev.y,next.x-prev.x),local=mul(translate(p.x,p.y,-.012+(i%2)*.024),mul(rotateZ(angle),mul(rotateY(i%2?.38:-.38),rotateX(i%2?.09:-.09))));draw(item.mesh,item.material,mul(root,local),vp);}
    for(const item of items)draw(item.mesh,item.material===0?4:item.material,mul(root,mul(cross,item.local)),vp);
    if(asciiCanvas)renderAscii();
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
