/* ATK Kantor: logika aplikasi. Konfigurasi ada di data/config.json */
let API='',CFG={};
let beli=[],cs=null,fotos=[],items=[],logs=[],sel=null,stream=null,scanning=false,view='dash',rows=[];
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rp=n=>'Rp '+Math.round(n||0).toLocaleString('id-ID');
const fmt=ts=>new Date(ts).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const day=ts=>new Date(ts).toISOString().slice(0,10);
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k)||'';localStorage.setItem(k,v)}catch(e){return ''}}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(tt);tt=setTimeout(()=>t.style.display='none',2800)}

async function call(x){x.pin=$('#pin').value;const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(x)});const j=await r.json();if(j.error)throw new Error(j.error);return j}
async function load(){try{const r=await fetch(API);const j=await r.json();items=j.atk;logs=j.log;beli=j.beli||[];$('#st').textContent='Sinkron '+new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});refresh()}catch(e){$('#st').textContent='Gagal memuat data'}}

function setTitle(t){const w=t.split(' ');$('#ttl').innerHTML='<b>'+esc(w[0])+'</b>'+(w[1]?' '+esc(w.slice(1).join(' ')):'')}
const TT={dash:'Dashboard',trx:'Transaksi',brg:'Master barang',lap:'Laporan',klm:'Klaim Dishub'};
document.querySelectorAll('#nv button').forEach(b=>b.onclick=()=>{
  view=b.dataset.v;document.querySelectorAll('#nv button').forEach(x=>x.classList.toggle('on',x===b));
  Object.keys(TT).forEach(n=>$('#v-'+n).hidden=n!==view);setTitle(TT[view]);
  if(view!=='trx')stopScan();if(view!=='trx')stopCam();refresh();
});
$('#rf').onclick=load;
$('#m1').onclick=()=>{stopCam();$('#p1').hidden=false;$('#p2').hidden=true;$('#m1').classList.add('on');$('#m2').classList.remove('on')};
$('#m2').onclick=()=>{$('#p1').hidden=true;$('#p2').hidden=false;$('#m2').classList.add('on');$('#m1').classList.remove('on');stopScan()};

/* Dashboard */
function dash(){
  const d30=Date.now()-30*864e5,k=logs.filter(l=>l.tipe==='keluar'&&l.ts>=d30);
  const low=items.filter(i=>i.stok<=(i.min||0)).sort((a,b)=>a.stok-b.stok);
  const nilai=items.reduce((a,i)=>a+i.stok*(i.harga||0),0);
  const kp=(n,l)=>`<div class="card kpi" style="margin:0"><div class="n">${n}</div><div class="l">${l}</div></div>`;
  $('#kpi').innerHTML=kp(items.length,'Jenis barang')+kp(rp(nilai),'Nilai persediaan')+kp(low.length,'Perlu restock')+kp(k.length,'Pengambilan 30 hari');
  const g={};k.forEach(l=>{const d=l.divisi||'Tanpa divisi';g[d]=(g[d]||0)+(l.nilai||l.qty)});
  const e=Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,6),mx=e.length?e[0][1]:1;
  $('#dv-ch').innerHTML=e.length?e.map(([n,v])=>`<div style="margin-bottom:8px"><div class="row sp"><span>${esc(n)}</span><span class="mu">${rp(v)}</span></div><div class="bar" style="width:${Math.max(2,v/mx*100)}%"></div></div>`).join(''):'<div class="mu">Belum ada pengambilan.</div>';
  $('#rs-ls').innerHTML=low.length?low.slice(0,6).map(i=>`<div class="row sp" style="margin-bottom:6px"><span>${esc(i.nama)}</span><span class="tag ${i.stok<=0?'r':'w'}">${i.stok} / min ${i.min||0}</span></div>`).join(''):'<div class="mu">Semua stok aman.</div>';
  $('#ak').innerHTML=tbl(['Waktu','Tipe','Barang','Jumlah','Oleh'],logs.slice(0,8).map(l=>[fmt(l.ts),l.tipe==='masuk'?'<span class="tag o">Masuk</span>':'<span class="tag w">Keluar</span>',esc(l.nama),l.qty+' '+esc(l.satuan||''),esc(l.tipe==='masuk'?l.keperluan:l.pengambil)]));
}
function tbl(h,r,nc){return `<table><thead><tr>${h.map((x,i)=>`<th class="${nc&&nc.includes(i)?'n':''}">${x}</th>`).join('')}</tr></thead><tbody>${r.length?r.map(x=>`<tr>${x.map((c,i)=>`<td class="${nc&&nc.includes(i)?'n':''}">${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${h.length}" class="mu">Belum ada data.</td></tr>`}</tbody></table>`}

/* Transaksi: scan */
function pick(code){
  const c=String(code).trim().toLowerCase(),it=items.find(i=>String(i.kode).toLowerCase()===c);
  if(!it){sel=null;toast('Kode “'+code+'” belum ada di master barang');renderSel();return}
  sel=it.id;$('#kd').value=it.kode;$('#qt').value=1;renderSel();
}
$('#kd').onkeydown=e=>{if(e.key==='Enter'&&e.target.value.trim())pick(e.target.value)};
function renderSel(){
  const it=items.find(i=>i.id===sel);$('#form').hidden=!it;
  $('#sel').innerHTML=it?`<div class="row sp" style="margin:8px 0 12px"><div><div class="b">${esc(it.nama)}</div><div class="mu">${esc(it.kode)}, ${esc(it.lokasi||'tanpa lokasi')}</div></div><div style="text-align:right"><div class="kpi"><div class="n">${it.stok}</div></div><div class="mu">${esc(it.satuan||'')}</div></div></div>`:'';
}
$('#mn').onclick=()=>{const q=$('#qt');q.value=Math.max(1,(+q.value||1)-1)};
$('#pl').onclick=()=>{const q=$('#qt');q.value=(+q.value||0)+1};
async function startScan(){
  if(!('BarcodeDetector' in window)){toast('Browser ini belum bisa scan kamera. Ketik kode atau pakai scanner USB.');return}
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})}catch(e){toast('Kamera tidak diizinkan. Ketik kodenya saja.');return}
  const v=$('#vid');v.srcObject=stream;$('#cam').hidden=false;try{await v.play()}catch(e){}
  const det=new BarcodeDetector();scanning=true;
  const loop=async()=>{if(!scanning)return;try{const r=await det.detect(v);if(r.length){const c=r[0].rawValue;stopScan();pick(c);return}}catch(e){}setTimeout(loop,250)};loop();
}
function stopScan(){scanning=false;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}$('#cam').hidden=true}
$('#bs').onclick=startScan;$('#bx').onclick=stopScan;
$('#nm').value=ls('atk_nm');$('#dv').value=ls('atk_dv');
$('#nm').oninput=e=>ls('atk_nm',e.target.value);$('#dv').oninput=e=>ls('atk_dv',e.target.value);

$('#go').onclick=async()=>{
  const nama=$('#nm').value.trim(),div=$('#dv').value.trim(),q=parseInt($('#qt').value,10),kp=$('#kp').value.trim();
  if(!sel)return toast('Scan barang dulu');if(!nama)return toast('Isi nama pengambil');if(!(q>0))return toast('Jumlah minimal 1');
  $('#go').disabled=true;
  try{const it=items.find(i=>i.id===sel);
    await call({action:'ambil',id:sel,qty:q,pengambil:nama,divisi:div,keperluan:kp});
    toast('Tercatat: '+q+' '+(it.satuan||'')+' '+it.nama);sel=null;$('#kd').value='';$('#kp').value='';renderSel();await load()}
  catch(e){toast(e.message||'Gagal menyimpan. Coba lagi.')}
  finally{$('#go').disabled=false}
};

/* Barang */
function brg(){
  const q=$('#bq').value.trim().toLowerCase(),kt=$('#bk').value;
  const cats=[...new Set(items.map(i=>i.kategori||'Umum'))].sort();
  if($('#bk').options.length!==cats.length+1){$('#bk').innerHTML='<option value="">Semua kategori</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join('')}
  const l=items.filter(i=>(!q||(i.nama+' '+i.kode).toLowerCase().includes(q))&&(!kt||(i.kategori||'Umum')===kt)).sort((a,b)=>String(a.nama).localeCompare(b.nama));
  $('#bl').innerHTML=tbl(['Kode','Nama','Kategori','Lokasi','Stok','Harga',''],l.map(i=>{
    const tg=i.stok<=0?' <span class="tag r">Habis</span>':i.stok<=(i.min||0)?' <span class="tag w">Menipis</span>':'';
    return [esc(i.kode),esc(i.nama),esc(i.kategori||'Umum'),esc(i.lokasi||'-'),i.stok+' '+esc(i.satuan||'')+tg,rp(i.harga),`<button data-e="${esc(i.id)}">Ubah</button> <button data-d="${esc(i.id)}">Hapus</button>`]}),[5]);
}
$('#bq').oninput=brg;$('#bk').onchange=brg;
$('#bl').onclick=async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.e){const i=items.find(x=>x.id===b.dataset.e);$('#fk').value=i.kode;$('#fn').value=i.nama;$('#fc').value=i.kategori||'';$('#fl').value=i.lokasi||'';$('#fs').value=i.satuan||'';$('#ft').value=i.stok;$('#fm').value=i.min||0;$('#fh').value=i.harga||0;$('#fn').scrollIntoView({block:'center'})}
  if(b.dataset.d){if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='Yakin?';return}
    try{await call({action:'hapus',id:b.dataset.d});toast('Barang dihapus');load()}catch(x){toast(x.message)}}
};
$('#sv').onclick=async()=>{
  const k=$('#fk').value.trim(),n=$('#fn').value.trim();if(!k||!n)return toast('Kode dan nama wajib diisi');
  const v=id=>$('#'+id).value;
  try{await call({action:'simpan',item:{kode:k,nama:n,kategori:v('fc').trim()||'Umum',lokasi:v('fl').trim(),satuan:v('fs').trim()||'pcs',stok:Math.max(0,parseInt(v('ft'),10)||0),min:Math.max(0,parseInt(v('fm'),10)||0),harga:Math.max(0,parseInt(v('fh'),10)||0)}});
    toast('Barang tersimpan');['fk','fn','fc','fl','fs','ft','fm','fh'].forEach(x=>$('#'+x).value='');load()}
  catch(e){toast(e.message)}
};
$('#ib').onclick=async()=>{
  const r=$('#im').value.split('\n').map(x=>x.split(',').map(y=>y.trim())).filter(x=>x[0]&&x[1]).map(x=>({kode:x[0],nama:x[1],kategori:x[2],satuan:x[3],stok:parseInt(x[4],10)||0,min:parseInt(x[5],10)||0,lokasi:x[6],harga:parseInt(x[7],10)||0}));
  if(!r.length)return toast('Format belum benar');
  try{await call({action:'impor',rows:r});$('#im').value='';toast(r.length+' barang diimpor');load()}catch(e){toast(e.message)}
};

$('#ij').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{const a=JSON.parse(await f.text()),r=(Array.isArray(a)?a:a.barang||[]).filter(x=>x.kode&&x.nama);
    if(!r.length)return toast('File JSON tidak berisi barang');
    await call({action:'impor',rows:r});toast(r.length+' barang diimpor');load()}
  catch(x){toast(x.message)}
  e.target.value='';
};

/* Laporan */
function lap(){
  const a=$('#l1').value?new Date($('#l1').value).getTime():0,z=$('#l2').value?new Date($('#l2').value).getTime()+864e5:Infinity,j=$('#lj').value;
  const l=logs.filter(x=>x.ts>=a&&x.ts<z),k=l.filter(x=>x.tipe==='keluar');let h,r;
  if(j==='mut'){h=['Waktu','Tipe','Kode','Barang','Jumlah','Divisi','Oleh/Ket','Nilai'];rows=l.map(x=>[fmt(x.ts),x.tipe,x.kode,x.nama,x.qty,x.divisi||'',x.tipe==='masuk'?x.keperluan:x.pengambil,x.nilai||0])}
  else{const f=j==='div'?x=>x.divisi||'Tanpa divisi':x=>x.nama,g={};
    k.forEach(x=>{const n=f(x);g[n]=g[n]||{t:0,q:0,v:0};g[n].t++;g[n].q+=x.qty;g[n].v+=x.nilai||0});
    h=[j==='div'?'Divisi':'Barang','Transaksi','Jumlah','Nilai'];rows=Object.entries(g).sort((x,y)=>y[1].v-x[1].v).map(([n,v])=>[n,v.t,v.q,v.v])}
  const tot=rows.reduce((s,x)=>s+(x[x.length-1]||0),0);
  $('#lr').innerHTML=tbl(h,rows.map(x=>x.map((c,i)=>i===x.length-1?rp(c):esc(c))).concat([['<b>Total nilai</b>'].concat(Array(h.length-2).fill('')).concat(['<b>'+rp(tot)+'</b>'])]),[h.length-1]);
  lap.h=h;
}
['l1','l2','lj'].forEach(i=>$('#'+i).onchange=lap);
$('#ex').onclick=()=>{const q=c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"';
  const csv=[lap.h.map(q).join(',')].concat(rows.map(x=>x.map(q).join(','))).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='laporan-atk.csv';a.click()};
$('#pr').onclick=()=>print();


/* Klaim Dishub */
const BLN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const sum=a=>a.reduce((t,b)=>t+b.jumlah,0),dm=t=>t.slice(8,10)+'/'+t.slice(5,7)+'/'+t.slice(0,4),r2=n=>'Rp '+Math.round(n).toLocaleString('en-US');
function periode(){
  const [y,m]=($('#km').value||new Date().toISOString().slice(0,7)).split('-').map(Number),p=$('#kq').value,last=new Date(y,m,0).getDate(),a=p==='1'?1:16,z=p==='1'?15:last;
  return{y,m,txt:String(a).padStart(2,'0')+' - '+z+' '+BLN[m-1].toUpperCase()+' '+y,in:t=>+t.slice(0,4)===y&&+t.slice(5,7)===m&&+t.slice(8,10)>=a&&+t.slice(8,10)<=z};
}
function lst(){const P=periode();return beli.filter(b=>P.in(b.tanggal)).sort((a,b)=>a.tanggal.localeCompare(b.tanggal))}
let ed={};
const ql=l=>ed[l.id]!=null?ed[l.id]:l.klaim;
function klm(f){
  const ae=document.activeElement;if(!f&&ae&&ae.tagName==='INPUT'&&ae.closest('#kl2'))return;
  if(!$('#km').value)$('#km').value=new Date().toISOString().slice(0,7);
  const L=lst(),seen={};
  klm.tot=()=>{let k=0,t=0;L.forEach(l=>{const q=ql(l);k+=q*l.harga;t+=(l.qty-q)*l.harga});return 'Diklaim '+rp(k)+', tidak diklaim '+rp(t)};
  $('#kl2').innerHTML=`<div class="row sp" style="margin-bottom:10px;flex-wrap:wrap"><h3 style="margin:0">Konfirmasi klaim periode ${periode().txt}</h3><div class="row"><button data-all="1">Klaim semua</button><button data-all="0">Tidak klaim semua</button></div></div><div class="mu" id="ksum" style="margin-bottom:8px">${klm.tot()}</div>`+
    tbl(['Tanggal','Barang','Qty beli','Harga','Qty klaim','Tidak diklaim','Nilai klaim',''],L.map(l=>{const q=ql(l),first=!seen[l.nota];seen[l.nota]=1;
      return [dm(l.tanggal),esc(l.ket),l.qty+(l.satuan?' '+esc(l.satuan):''),rp(l.harga),`<input type="number" min="0" max="${l.qty}" value="${q}" data-k="${esc(l.id)}" style="width:76px;margin:0">`,String(l.qty-q),rp(q*l.harga),first?`<button data-n="${esc(l.nota)}">Hapus nota</button>`:'']}),[2,3,5,6])+
    `<div class="row" style="margin-top:12px"><button class="pri" id="ksv">Simpan konfirmasi</button></div>`;
}
$('#km').onchange=$('#kq').onchange=()=>klm(true);
$('#kl2').oninput=e=>{const k=e.target.dataset.k;if(!k)return;const l=beli.find(x=>x.id===k);ed[k]=Math.max(0,Math.min(l.qty,parseFloat(e.target.value)||0));$('#ksum').textContent=klm.tot()};
$('#kl2').onchange=e=>{if(e.target.dataset.k)klm(true)};
$('#kl2').onclick=async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.all!=null){lst().forEach(l=>{ed[l.id]=b.dataset.all==='1'?l.qty:0});return klm(true)}
  try{
    if(b.id==='ksv'){const x=Object.entries(ed).map(([id,klaim])=>({id,klaim}));if(!x.length)return toast('Belum ada perubahan');await call({action:'klaim',set:x});ed={};toast('Konfirmasi klaim tersimpan');load()}
    if(b.dataset.n){if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='Yakin? Stok ikut dikurangi';return}await call({action:'notahapus',nota:b.dataset.n});toast('Nota dihapus, stok dikoreksi');load()}
  }catch(x){toast(x.message)}
};
function renderFotos(){$('#fph').innerHTML=fotos.map((f,i)=>`<div style="position:relative"><img src="${f.data}" style="height:70px;border-radius:6px"><button data-r="${i}" style="position:absolute;top:0;right:0;padding:0 6px">×</button></div>`).join('')}
$('#fph').onclick=e=>{const b=e.target.closest('button');if(b){fotos.splice(+b.dataset.r,1);renderFotos()}};
function stopCam(){if(cs){cs.getTracks().forEach(t=>t.stop());cs=null}$('#cw').hidden=true}
$('#fc1').onclick=async()=>{
  try{cs=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})}catch(e){return toast('Kamera tidak diizinkan. Pakai tombol Pilih file.')}
  $('#cv').srcObject=cs;$('#cw').hidden=false;try{await $('#cv').play()}catch(e){}
};
$('#cx').onclick=stopCam;
const gps=()=>new Promise(ok=>navigator.geolocation?navigator.geolocation.getCurrentPosition(ok,()=>ok(null),{enableHighAccuracy:true,timeout:8000}):ok(null));
function addFoto(src,w,h,pos,tag){
  const sc=Math.min(1,(CFG.fotoMaxPx||1280)/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.round(w*sc);c.height=Math.round(h*sc);
  const x=c.getContext('2d');x.drawImage(src,0,0,c.width,c.height);
  const now=new Date(),t=now.toLocaleString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})+tag;
  const g=pos?pos.coords.latitude.toFixed(6)+', '+pos.coords.longitude.toFixed(6)+' (±'+Math.round(pos.coords.accuracy)+' m)':'Lokasi tidak tersedia';
  const fs=Math.max(14,Math.round(c.width/48));x.font='600 '+fs+'px sans-serif';
  x.fillStyle='rgba(0,0,0,.65)';x.fillRect(0,c.height-fs*3.1,c.width,fs*3.1);
  x.fillStyle='#fff';x.fillText(t,fs*.6,c.height-fs*1.8);x.fillText(g,fs*.6,c.height-fs*.5);
  fotos.push({data:c.toDataURL('image/jpeg',CFG.fotoKualitas||.72),ts:now.getTime(),lat:pos?pos.coords.latitude:null,lng:pos?pos.coords.longitude:null});renderFotos();
}
$('#cj').onclick=async()=>{const v=$('#cv');if(!v.videoWidth)return;const p=await gps();addFoto(v,v.videoWidth,v.videoHeight,p,'');stopCam()};
$('#ff').onclick=()=>$('#ffile').click();
$('#ffile').onchange=async e=>{const f=e.target.files[0];if(!f)return;const p=await gps(),bm=await createImageBitmap(f);addFoto(bm,bm.width,bm.height,p,' (unggah)');e.target.value=''};
let nl=[];
const bo=()=>'<option value="">Pilih barang</option>'+items.slice().sort((a,b)=>String(a.nama).localeCompare(b.nama)).map(i=>`<option value="${esc(i.id)}">${esc(i.nama)} (${esc(i.kode)})</option>`).join('');
function nsum(){$('#nsum').textContent='Total nota '+rp(nl.reduce((t,l)=>t+(l.t==='b'?l.qty*l.harga:l.harga),0))}
function rNl(){
  $('#nl').innerHTML=nl.map((l,i)=>`<div class="card" style="padding:10px 12px;margin-bottom:8px">`+(l.t==='b'
    ?`<select data-i="${i}" data-f="id">${bo().replace('value="'+esc(l.id)+'"','value="'+esc(l.id)+'" selected')}</select><div class="grid g2" style="gap:8px"><div><label>Qty beli</label><input type="number" min="1" data-i="${i}" data-f="qty" value="${l.qty}"></div><div><label>Harga satuan (Rp)</label><input type="number" min="0" data-i="${i}" data-f="harga" value="${l.harga}"></div></div>`
    :`<label>Biaya lain</label><input data-i="${i}" data-f="ket" value="${esc(l.ket)}" placeholder="Contoh: Jilid laporan operasional"><label>Jumlah (Rp)</label><input type="number" min="0" data-i="${i}" data-f="harga" value="${l.harga}">`)
    +`<div style="text-align:right"><button data-rm="${i}">Hapus baris</button></div></div>`).join('');
  nsum();
}
function initNota(){
  if(!$('#nt').value)$('#nt').value=new Date().toISOString().slice(0,10);
  if(!nl.length&&items.length){nl.push({t:'b',id:'',qty:1,harga:0});rNl()}
}
$('#nl').addEventListener('input',e=>{const t=e.target,i=t.dataset.i;if(i==null||t.tagName==='SELECT')return;const f=t.dataset.f;nl[i][f]=f==='ket'?t.value:(parseFloat(t.value)||0);nsum()});
$('#nl').addEventListener('change',e=>{const t=e.target;if(t.dataset.f!=='id')return;const l=nl[t.dataset.i],it=items.find(x=>x.id===t.value);l.id=t.value;if(it&&!l.harga)l.harga=it.harga||0;rNl()});
$('#nl').onclick=e=>{const b=e.target.closest('[data-rm]');if(b){nl.splice(+b.dataset.rm,1);rNl()}};
$('#na').onclick=()=>{nl.push({t:'b',id:'',qty:1,harga:0});rNl()};
$('#nx').onclick=()=>{nl.push({t:'x',ket:'',qty:1,harga:0});rNl()};
$('#nsv').onclick=async()=>{
  const tg=$('#nt').value,ln=nl.filter(l=>l.t==='b'?l.id&&l.qty>0:l.ket.trim()&&l.harga>0);
  if(!tg||!ln.length)return toast('Isi tanggal dan minimal satu baris yang lengkap');
  $('#nsv').disabled=true;
  try{const meta=[];for(const f of fotos){const r=await call({action:'foto',data:f.data});meta.push({id:r.id,ts:f.ts,lat:f.lat,lng:f.lng})}
    await call({action:'nota',nota:{tanggal:tg,toko:$('#ntk').value.trim(),foto:meta,lines:ln.map(l=>l.t==='b'?{id:l.id,qty:l.qty,harga:l.harga}:{ket:l.ket.trim(),qty:1,harga:l.harga})}});
    toast('Nota tersimpan, stok bertambah. Konfirmasi klaim di menu Klaim');
    nl=[];fotos=[];renderFotos();$('#ntk').value='';await load();rNl()}
  catch(e){toast(e.message)}finally{$('#nsv').disabled=false}
};
$('#kb').onclick=()=>{
  const P=periode(),L=lst();
  const grp=a=>{const m={};a.forEach(l=>(m[l.nota]=m[l.nota]||[]).push(l));return Object.values(m).sort((x,y)=>x[0].tanggal.localeCompare(y[0].tanggal))};
  const row=(g,q)=>{const x=g.map(l=>({l,q:q(l)})).filter(o=>o.q>0);return x.length?{tanggal:g[0].tanggal,ket:x.map(o=>o.l.jenis==='ATK'?o.l.ket+' ( '+o.q+' '+o.l.satuan+' )':o.l.ket).join(', '),jumlah:x.reduce((t,o)=>t+o.q*o.l.harga,0)}:null};
  const at=L.filter(l=>l.jenis==='ATK'),bl=L.filter(l=>l.jenis!=='ATK');
  const A=grp(at).map(g=>row(g,l=>l.klaim)).filter(Boolean),B=bl.map(l=>row([l],x=>x.klaim)).filter(Boolean),k=A.concat(B);
  const t=grp(at).map(g=>row(g,l=>l.qty-l.klaim)).concat(bl.map(l=>row([l],x=>x.qty-x.klaim))).filter(Boolean).sort((x,y)=>x.tanggal.localeCompare(y.tanggal));
  const rw=a=>a.map((b,i)=>`<tr><td>${i+1}</td><td>${dm(b.tanggal)}</td><td>${esc(b.ket)}</td><td style="text-align:right">${r2(b.jumlah)}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center">-</td></tr>';
  const st=(l,a)=>`<tr><td colspan="3" style="text-align:right"><b>${l}</b></td><td style="text-align:right"><b>${r2(sum(a))}</b></td></tr>`;
  const ph=grp(L).map(g=>{const r=row(g,l=>l.klaim);return r&&(g[0].foto||[]).length?Object.assign(r,{foto:g[0].foto}):null}).filter(Boolean);
  $('#doc').innerHTML=`<h2>${esc(CFG.judulLaporan||'LAPORAN PENGELUARAN OPERASIONAL UNIT TRANSPORTASI')}</h2><h2>(ATK)</h2><h2 style="margin-bottom:10px">REALISASI PERIODE ${P.txt}</h2>
<table><tr><th style="width:36px">NO</th><th style="width:90px">TANGGAL</th><th>KETERANGAN</th><th style="width:120px">JUMLAH</th></tr>
<tr><td><b>A</b></td><td colspan="3"><b>ATK</b></td></tr>${rw(A)}${st('SUB TOTAL',A)}
<tr><td><b>B</b></td><td colspan="3"><b>BIAYA LAIN</b></td></tr>${rw(B)}${st('SUB TOTAL',B)}${st('TOTAL',k)}
<tr><td><b>C</b></td><td colspan="3"><b>PEMBELIAN TIDAK DIKLAIM (tidak termasuk total di atas)</b></td></tr>${rw(t)}${st('SUB TOTAL TIDAK DIKLAIM',t)}</table>
<table class="sg" style="margin-top:18px"><tr><td>Mengetahui,</td><td>Mengajukan,</td></tr><tr><td style="height:70px"></td><td></td></tr>
<tr><td><b><u>${esc($('#kn1').value)}</u></b><br>${esc(((CFG.penandatangan||{}).mengetahui||{}).jabatan||'Manajer Unit Transportasi')}</td><td><b><u>${esc($('#kn2').value)}</u></b><br>${esc(((CFG.penandatangan||{}).mengajukan||{}).jabatan||'Staff Keuangan')}</td></tr></table>
${ph.length?`<div class="pg"><h2 style="margin-bottom:10px">LAMPIRAN DOKUMENTASI PEMBELIAN<br>PERIODE ${P.txt}</h2>`+ph.map((b,n)=>`<div style="margin-bottom:8px"><b>Lampiran ${n+1}.</b> ${dm(b.tanggal)}, ${esc(b.ket)}, ${r2(b.jumlah)}<br>`+b.foto.map(f=>`<div class="ph"><img data-id="${esc(f.id)}" alt=""><br>${new Date(f.ts).toLocaleString('id-ID',{hour12:false})}, ${f.lat==null?'lokasi tidak tersedia':f.lat.toFixed(6)+', '+f.lng.toFixed(6)}</div>`).join('')+'</div>').join('')+'</div>':''}`;
  $('#doc').hidden=false;
  $('#doc').querySelectorAll('img[data-id]').forEach(im=>fetch(API+'?foto='+im.dataset.id).then(r=>r.json()).then(j=>{im.src=j.data}).catch(()=>{im.alt='Foto gagal dimuat'}));
  $('#doc').scrollIntoView();
};
$('#kc').onclick=()=>{if($('#doc').hidden)return toast('Buat laporan dulu');print()};
function refresh(){({dash,trx:()=>{brg();renderSel();initNota()},brg,lap,klm})[view]();if(view!=='brg')brg()}
(async()=>{
  try{CFG=await (await fetch('data/config.json')).json()}catch(e){}
  API=CFG.apiUrl||'';
  const pn=CFG.penandatangan||{};
  if(pn.mengetahui)$('#kn1').value=pn.mengetahui.nama;
  if(pn.mengajukan)$('#kn2').value=pn.mengajukan.nama;
  if(CFG.namaAplikasi){document.title=CFG.namaAplikasi;$('#brand').innerHTML='<b>'+esc(CFG.namaAplikasi)+'</b><span>'+esc(CFG.unit||'')+'</span>'}
  $('#kat').innerHTML=(CFG.kategori||[]).map(k=>'<option value="'+esc(k)+'">').join('');
  $('#sat').innerHTML=(CFG.satuan||[]).map(k=>'<option value="'+esc(k)+'">').join('');
  if(!API){$('#st').textContent='Isi apiUrl di data/config.json';return}
  $('#st').textContent='Memuat…';load();setInterval(load,(CFG.refreshDetik||30)*1000);
})();
