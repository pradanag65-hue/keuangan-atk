/* ATK Kantor: form pengambilan untuk karyawan. Konfigurasi: data/config.json */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k)||'';localStorage.setItem(k,v)}catch(e){return ''}}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(tt);tt=setTimeout(()=>t.style.display='none',3400)}
let API='',CFG={},items=[],sel=null,scanStream=null,camStream=null,scanning=false,foto=null,busy=false,posPromise=Promise.resolve(null);
const need=k=>((CFG.pengambilan||{})[k])!==false;

/* Scan barcode */
function pick(code){
  const c=String(code).trim().toLowerCase(),it=items.find(i=>String(i.kode).toLowerCase()===c);
  if(!it){sel=null;toast('Kode “'+code+'” tidak ditemukan');return show()}
  sel=it.id;$('#kd').value=it.kode;$('#qt').value=1;show();
}
function show(){
  const it=items.find(i=>i.id===sel),ok=it&&it.stok>0;
  $('#sel').innerHTML=it?`<div class="row sp" style="margin-top:10px"><div><div class="b">${esc(it.nama)}</div><div class="mu">${esc(it.kode)}${it.lokasi?', '+esc(it.lokasi):''}</div></div><div style="text-align:right"><div class="b" style="font-size:26px;line-height:1">${it.stok}</div><div class="mu">${esc(it.satuan||'')} tersedia</div></div></div>${ok?'':'<div class="mu" style="margin-top:8px">Stok habis, barang tidak bisa diambil.</div>'}`:'';
  $('#fm').hidden=!ok;$('#fc3').hidden=!ok;
}
async function startScan(){
  stopCam();
  if(!('BarcodeDetector' in window))return toast('Browser ini belum bisa scan kamera. Ketik kode di kolom atas, atau pakai scanner barcode.');
  try{scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})}catch(e){return toast('Kamera tidak diizinkan. Ketik kodenya saja.')}
  const v=$('#vid');v.srcObject=scanStream;$('#cam').hidden=false;try{await v.play()}catch(e){}
  const det=new BarcodeDetector();scanning=true;
  const loop=async()=>{if(!scanning)return;try{const r=await det.detect(v);if(r.length){const c=r[0].rawValue;stopScan();pick(c);return}}catch(e){}setTimeout(loop,250)};loop();
}
function stopScan(){scanning=false;if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}$('#cam').hidden=true}
$('#bs').onclick=startScan;$('#bx').onclick=stopScan;
$('#kd').onkeydown=e=>{if(e.key==='Enter'&&e.target.value.trim())pick(e.target.value)};
$('#mn').onclick=()=>{const q=$('#qt');q.value=Math.max(1,(+q.value||1)-1)};
$('#pl').onclick=()=>{const q=$('#qt');q.value=(+q.value||0)+1};
$('#nm').value=ls('atk_nm');$('#dv').value=ls('atk_dv');
$('#nm').oninput=e=>ls('atk_nm',e.target.value);$('#dv').oninput=e=>ls('atk_dv',e.target.value);

/* Foto bergeotag: waktu, koordinat, dan alamat lengkap ditempel ke gambar */
const gps=()=>new Promise(ok=>navigator.geolocation?navigator.geolocation.getCurrentPosition(ok,()=>ok(null),{enableHighAccuracy:true,timeout:15000,maximumAge:0}):ok(null));
async function alamat(lat,lng){
  const url=(CFG.geocodeUrl||'').replace('{lat}',lat).replace('{lng}',lng);if(!url)return '';
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),8000);
  try{const j=await (await fetch(url,{signal:ctl.signal})).json();return j.display_name||''}catch(e){return ''}finally{clearTimeout(t)}
}
function stamp(c,lines){
  const x=c.getContext('2d'),fs=Math.max(13,Math.round(c.width/42)),pad=fs*.6,out=[];
  x.font='600 '+fs+'px sans-serif';
  lines.forEach(t=>{let cur='';t.split(' ').forEach(w=>{const n=cur?cur+' '+w:w;if(x.measureText(n).width>c.width-pad*2&&cur){out.push(cur);cur=w}else cur=n});out.push(cur)});
  const h=out.length*fs*1.3+pad*1.3;
  x.fillStyle='rgba(0,0,0,.68)';x.fillRect(0,c.height-h,c.width,h);x.fillStyle='#fff';
  out.forEach((t,i)=>x.fillText(t,pad,c.height-h+pad*.65+fs*1.1+i*fs*1.3));
}
function canvasOf(src,w,h){
  const sc=Math.min(1,(CFG.fotoMaxPx||1280)/Math.max(w,h)),c=document.createElement('canvas');
  c.width=Math.round(w*sc);c.height=Math.round(h*sc);c.getContext('2d').drawImage(src,0,0,c.width,c.height);return c;
}
async function finish(c,tag){
  const now=new Date();
  $('#fp').innerHTML='<div class="mu" style="margin-top:10px">Mencari lokasi dan alamat…</div>';
  let pos=await gps();if(!pos)pos=await posPromise;
  const lat=pos?pos.coords.latitude:null,lng=pos?pos.coords.longitude:null,acc=pos?Math.round(pos.coords.accuracy):null,al=pos?await alamat(lat,lng):'';
  const t=now.toLocaleString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZoneName:'short'})+tag;
  const lines=[t,pos?lat.toFixed(6)+', '+lng.toFixed(6)+' (±'+acc+' m)':'Lokasi tidak tersedia',al||(pos?'Alamat tidak ditemukan':'')].filter(Boolean);
  stamp(c,lines);
  foto={data:c.toDataURL('image/jpeg',CFG.fotoKualitas||.72),lat,lng,acc,al};
  $('#fp').innerHTML='<img src="'+foto.data+'" alt="Foto bukti" style="width:100%;border-radius:18px;margin-top:10px"><div class="mu" style="margin-top:6px">'+esc(lines.join(', '))+'</div>'+(need('wajibLokasi')&&!pos?'<div class="mu" style="margin-top:6px;color:#8a1f14">Lokasi belum terdeteksi. Aktifkan GPS dan izin lokasi, lalu ambil foto ulang.</div>':'');
}
function stopCam(){if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null}$('#cw').hidden=true}
$('#fb').onclick=async()=>{
  stopScan();
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return $('#ff').click();
  try{camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})}catch(e){return toast('Kamera tidak diizinkan. Izinkan kamera di pengaturan browser.')}
  const v=$('#cv');v.srcObject=camStream;$('#cw').hidden=false;try{await v.play()}catch(e){}
  posPromise=gps();
};
$('#cx').onclick=stopCam;
$('#cj').onclick=async()=>{const v=$('#cv');if(!v.videoWidth)return;const c=canvasOf(v,v.videoWidth,v.videoHeight);stopCam();await finish(c,'')};
$('#ff').onchange=async e=>{const f=e.target.files[0];if(!f)return;const bm=await createImageBitmap(f);await finish(canvasOf(bm,bm.width,bm.height),' (kamera bawaan)');e.target.value=''};

/* Kirim */
$('#go').onclick=async()=>{
  if(busy)return;
  const nama=$('#nm').value.trim(),div=$('#dv').value.trim(),q=parseInt($('#qt').value,10),it=items.find(i=>i.id===sel);
  if(!it)return toast('Scan barang dulu');
  if(!nama)return toast('Isi nama pengambil');
  if(!(q>0))return toast('Jumlah minimal 1');
  if(q>it.stok)return toast('Stok tidak cukup. Sisa '+it.stok);
  if(need('wajibFoto')&&!foto)return toast('Ambil foto bukti dulu');
  if(need('wajibLokasi')&&foto&&foto.lat==null)return toast('Lokasi belum terdeteksi. Ambil foto ulang dengan GPS aktif');
  busy=true;$('#go').disabled=true;
  try{
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'ambil',id:sel,qty:q,pengambil:nama,divisi:div,keperluan:$('#kp').value.trim(),foto:foto&&foto.data,lat:foto&&foto.lat,lng:foto&&foto.lng,akurasi:foto&&foto.acc,alamat:foto&&foto.al})});
    const j=await r.json();if(j.error)throw new Error(j.error);
    it.stok-=q;
    $('#done').innerHTML='<div class="b" style="font-size:18px">Pengambilan tercatat</div><div class="mu" style="margin:4px 0 12px">'+q+' '+esc(it.satuan||'')+' '+esc(it.nama)+' atas nama '+esc(nama)+'</div><button class="pri" id="again" style="width:100%">Ambil barang lain</button>';
    $('#done').hidden=false;$('#main').hidden=true;
    $('#again').onclick=()=>{$('#done').hidden=true;$('#main').hidden=false;sel=null;foto=null;$('#kd').value='';$('#kp').value='';$('#fp').innerHTML='';show();scrollTo(0,0)};
  }catch(e){toast(e.message||'Gagal menyimpan. Periksa koneksi lalu coba lagi.')}
  finally{busy=false;$('#go').disabled=false}
};

/* Mulai */
(async()=>{
  try{CFG=await (await fetch('data/config.json')).json()}catch(e){}
  API=CFG.apiUrl||'';
  if(CFG.namaAplikasi){document.title='Pengambilan ATK, '+CFG.namaAplikasi;$('#brand').innerHTML='<b>'+esc(CFG.namaAplikasi)+'</b><span>Form pengambilan</span>'}
  if(!API){$('#st').textContent='Isi apiUrl di data/config.json';return}
  $('#st').textContent='Memuat daftar barang…';
  try{items=(await (await fetch(API+'?a=barang')).json()).atk||[];$('#st').textContent=''}catch(e){$('#st').textContent='Gagal memuat daftar barang. Muat ulang halaman.'}
})();
