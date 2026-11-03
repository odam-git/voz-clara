// ====== Utilidades de voz ======
const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
const norm=s=>s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-zñ0-9\s]/g," ").replace(/\s+/g," ").trim();
function lcsMatch(target,said){ // devuelve arreglo booleano por palabra objetivo
  const a=norm(target).split(" "),b=norm(said).split(" ").filter(Boolean);
  const m=a.length,n=b.length,dp=Array.from({length:m+1},()=>new Array(n+1).fill(0));
  for(let i=m-1;i>=0;i--)for(let j=n-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  const ok=new Array(m).fill(false);let i=0,j=0;
  while(i<m&&j<n){if(a[i]===b[j]){ok[i]=true;i++;j++}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++}
  return ok;
}
function countMuletillas(txt){
  const t=" "+norm(txt)+" ";let c=0;const found={};
  for(const m of MULETILLAS){const k=norm(m);if(!k)continue;const re=new RegExp(" "+k+"(?= )","g");const n=(t.match(re)||[]).length;if(n){c+=n;found[k]=n}}
  return {c,found};
}
class Listener{
  constructor(onText){this.onText=onText;this.final="";this.rec=null;this.chunks=[];this.audioURL=null}
  async start(){
    this.final="";this.t0=Date.now();
    try{
      this.stream=await navigator.mediaDevices.getUserMedia({audio:true});
      this.mr=new MediaRecorder(this.stream);this.chunks=[];
      this.mr.ondataavailable=e=>this.chunks.push(e.data);this.mr.start();
      this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      const src=this.ctx.createMediaStreamSource(this.stream);this.an=this.ctx.createAnalyser();this.an.fftSize=512;src.connect(this.an);
    }catch(e){toast("No pude acceder al micrófono. Revisa los permisos.");throw e}
    if(SR){
      this.rec=new SR();this.rec.lang="es-MX";this.rec.continuous=true;this.rec.interimResults=true;
      this.rec.onresult=e=>{let interim="";for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)this.final+=r[0].transcript+" ";else interim+=r[0].transcript}this.onText&&this.onText(this.final+interim)};
      this.rec.onend=()=>{if(this.running)try{this.rec.start()}catch(_){}}; // reanuda en Android
      this.running=true;this.rec.start();
    }
  }
  level(){if(!this.an)return 0;const d=new Uint8Array(this.an.fftSize);this.an.getByteTimeDomainData(d);let s=0;for(const v of d){const x=(v-128)/128;s+=x*x}return Math.min(1,Math.sqrt(s/d.length)*4)}
  stop(){
    this.running=false;const secs=(Date.now()-this.t0)/1000;
    try{this.rec&&this.rec.stop()}catch(_){}
    return new Promise(res=>{
      const done=()=>{this.stream&&this.stream.getTracks().forEach(t=>t.stop());try{this.ctx&&this.ctx.close()}catch(_){}
        const blob=new Blob(this.chunks,{type:this.chunks[0]?.type||"audio/webm"});this.audioURL=URL.createObjectURL(blob);
        setTimeout(()=>res({text:this.final.trim(),secs,audio:this.audioURL}),400)};
      if(this.mr&&this.mr.state!=="inactive"){this.mr.onstop=done;this.mr.stop()}else done();
    });
  }
}
