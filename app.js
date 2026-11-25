"use strict";
const list=document.getElementById("surah-list");
const search=document.getElementById("search-input");
const status=document.getElementById("list-status");
const appStatus=document.getElementById("app-status");
const reading=document.getElementById("reading-screen");
const title=document.getElementById("reading-title");
const quran=document.getElementById("quran-text");
const scrollArea=document.getElementById("reading-scroll");
const tafsirOverlay=document.getElementById("tafsir-overlay");
const tafsirSheet=document.getElementById("tafsir-sheet");
const tafsirText=document.getElementById("tafsir-text");
const sidebar=document.getElementById("sidebar");
const sidebarOverlay=document.getElementById("sidebar-overlay");
const favoriteButton=document.getElementById("favorite-btn");
const BASMALA="بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const DATA_SHARD_BY_SURAH={"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"11":11,"12":11,"13":12,"14":12,"15":12,"16":13,"17":14,"18":14,"19":15,"20":15,"21":15,"22":16,"23":16,"24":16,"25":17,"26":17,"27":17,"28":17,"29":17,"30":17,"31":17,"32":17,"33":18,"34":18,"35":18,"36":18,"37":18,"38":18,"39":18,"40":18,"41":18,"42":18,"43":18,"44":18,"45":19,"46":19,"47":19,"48":19,"49":19,"50":19,"51":19,"52":19,"53":20,"54":20,"55":20,"56":20,"57":20,"58":20,"59":20,"60":20,"61":20,"62":20,"63":20,"64":21,"65":21,"66":21,"67":21,"68":21,"69":21,"70":21,"71":21,"72":21,"73":21,"74":21,"75":21,"76":21,"77":21,"78":21,"79":21,"80":22,"81":22,"82":22,"83":22,"84":22,"85":22,"86":22,"87":22,"88":22,"89":22,"90":22,"91":22,"92":22,"93":22,"94":22,"95":22,"96":22,"97":22,"98":22,"99":22,"100":22,"101":22,"102":22,"103":22,"104":22,"105":22,"106":22,"107":22,"108":22,"109":22,"110":22,"111":22,"112":22,"113":22,"114":22};
const dataShardPromises=new Map();
const ARABIC_DIGITS="٠١٢٣٤٥٦٧٨٩";
const state={current:null,favorites:loadFavorites(),favoritesOnly:false,pressTimer:null,pressed:null,pressStart:null,fontSize:loadFontSize(),quranFont:loadQuranFont(),verseCtx:null,verseFavorites:loadVerseFavorites(),verseNotes:loadVerseNotes(),currentAudio:null,audioRange:null};

function digits(value){return String(value).replace(/\d/g,d=>ARABIC_DIGITS[Number(d)]);}
function normalize(value){
 return String(value||"").replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).normalize("NFD")
 .replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").trim().toLowerCase();
}
function loadFavorites(){try{const v=JSON.parse(localStorage.getItem("quran-favorite-surahs")||"[]");return new Set(Array.isArray(v)?v.map(Number).filter(Number.isInteger):[]);}catch(_){return new Set();}}
function saveFavorites(){try{localStorage.setItem("quran-favorite-surahs",JSON.stringify([...state.favorites]));}catch(_){}}
function loadFontSize(){try{const v=Number(localStorage.getItem("quran-font-size-v2"));return Number.isFinite(v)&&v>=1.4&&v<=2.8?v:1.4;}catch(_){return 1.4;}}
function applyFontSize(){document.documentElement.style.setProperty("--quran-font-size",state.fontSize+"rem");}
function loadQuranFont(){try{return localStorage.getItem("quran-font-choice")||"amiri";}catch(_){return "amiri";}}
function setQuranFont(v){state.quranFont=v;document.documentElement.dataset.quranFont=v;try{localStorage.setItem("quran-font-choice",v);}catch(_){}}
function applyQuranFont(){document.documentElement.dataset.quranFont=state.quranFont;const sel=document.getElementById("quran-font-select");if(sel)sel.value=state.quranFont;}
function loadVerseFavorites(){try{const v=JSON.parse(localStorage.getItem("quran-favorite-verses")||"[]");return new Set(Array.isArray(v)?v.filter(x=>/^\d+:\d+$/.test(x)):[]);}catch(_){return new Set();}}
function saveVerseFavorites(){try{localStorage.setItem("quran-favorite-verses",JSON.stringify([...state.verseFavorites]));return true;}catch(_){return false;}}
function loadVerseNotes(){try{const v=JSON.parse(localStorage.getItem("quran-verse-notes")||"{}");return (v&&typeof v==="object"&&!Array.isArray(v))?v:{};}catch(_){return {};}}
function saveVerseNotes(){try{localStorage.setItem("quran-verse-notes",JSON.stringify(state.verseNotes));}catch(_){}}
function ensureSurahData(id){
 if(quranData[id])return Promise.resolve(quranData[id]);
 const shard=DATA_SHARD_BY_SURAH[id];
 if(!shard)return Promise.reject(new Error("لا يوجد ملف بيانات لهذه السورة."));
 const file="data-"+String(shard).padStart(2,"0")+".js";
 let pending=dataShardPromises.get(file);
 if(!pending){
  pending=new Promise((resolve,reject)=>{
   const script=document.createElement("script");
   script.src=file;script.async=true;
   script.onload=()=>resolve();
   script.onerror=()=>{dataShardPromises.delete(file);reject(new Error("تعذر تحميل بيانات السورة. تحقق من الاتصال ثم أعد المحاولة."));};
   document.head.appendChild(script);
  });
  dataShardPromises.set(file,pending);
 }
 return pending.then(()=>{
  const data=quranData[id],meta=surahsData.find(x=>x[0]===id);
  if(!data||!meta||!Array.isArray(data.verses)||data.verses.length!==meta[2]||data.verses.some(v=>!v||typeof v.text!=="string"||!v.text.trim())){
   dataShardPromises.delete(file);
   throw new Error("بيانات السورة غير مكتملة؛ أوقف العرض حمايةً للنص القرآني.");
  }
  return data;
 });
}

function renderSurahs(query=""){
 const q=normalize(query),fragment=document.createDocumentFragment();
 const rows=surahsData.filter(([id,name])=>(!q||normalize(name).includes(q)||normalize(id).includes(q))&&(!state.favoritesOnly||state.favorites.has(id)));
 rows.forEach(([id,name,count,type])=>{
  const b=document.createElement("button");b.type="button";b.className="surah-item";b.setAttribute("aria-label","فتح سورة "+name);b.addEventListener("click",()=>openSurah(name,id));
  const n=document.createElement("span");n.className="surah-name";n.textContent=name;
  const info=document.createElement("span");info.className="surah-info";info.textContent=digits(count)+" آية · "+type;
  const num=document.createElement("span");num.className="surah-number";num.textContent=digits(id);
  b.append(n,info,num);fragment.appendChild(b);
 });
 list.replaceChildren(fragment);
 if(!rows.length){const p=document.createElement("p");p.className="empty-state";p.textContent=state.favoritesOnly?"لم تضف أي سورة إلى المفضلة بعد.":"لا توجد نتائج مطابقة.";list.appendChild(p);}
 status.hidden=!state.favoritesOnly;status.textContent=state.favoritesOnly?"السور المفضلة":"";
}
async function openSurah(name,id){
 const meta=surahsData.find(x=>x[0]===id);
 if(!meta){showError("تعذر العثور على بيانات السورة.");return;}
 appStatus.hidden=false;appStatus.textContent="جارٍ تحميل سورة "+name+"…";
 try{await ensureSurahData(id);}catch(err){showError(err&&err.message?err.message:"تعذر تحميل بيانات السورة.");return;}
 finally{appStatus.hidden=true;}
 const s=quranData[id];
 if(!s||!Array.isArray(s.verses)||s.verses.length!==meta[2]||s.verses.some(v=>!v||!v.text||!v.text.trim())){showError("تعذر فتح السورة بسبب نقص بياناتها. لم يتم عرض نص تجريبي.");return;}
 appStatus.hidden=true;state.current=id;title.textContent="سورة "+name;quran.replaceChildren();
 if(id!==1&&id!==9){const b=document.createElement("span");b.className="basmala";b.textContent=BASMALA;b.dataset.tafsir=s.basmalaTafsir||"";quran.appendChild(b);}
 s.verses.forEach((v,i)=>{
  if(id===1&&i===0){const b=document.createElement("span");b.className="basmala";b.dataset.num=1;b.dataset.text=v.text;b.dataset.tafsir=v.tafsir||"";b.textContent=v.text+" ۞ "+digits(1);quran.appendChild(b);return;}
  const item=document.createElement("span");item.className="verse";item.dataset.tafsir=typeof v.tafsir==="string"?v.tafsir:"";
  item.dataset.num=i+1;item.dataset.text=v.text;
  const verseText=document.createElement("span");verseText.className="verse-text";verseText.textContent=v.text;
  const num=document.createElement("span");num.className="verse-number";num.textContent=digits(i+1);
  item.append(verseText,document.createTextNode(" "),num,document.createTextNode(" "));quran.appendChild(item);
 });
 closeTafsir();reading.classList.add("active");reading.setAttribute("aria-hidden","false");scrollArea.scrollTop=0;updateFavorite();
}
function closeSurah(){closeTafsir();reading.classList.remove("active");reading.setAttribute("aria-hidden","true");state.current=null;}
function updateFavorite(){if(state.current===null)return;const yes=state.favorites.has(state.current);favoriteButton.textContent=yes?"★":"☆";favoriteButton.setAttribute("aria-pressed",String(yes));favoriteButton.setAttribute("aria-label",yes?"إزالة من المفضلة":"إضافة إلى المفضلة");}
function toggleFavorite(){if(state.current===null)return;if(state.favorites.has(state.current))state.favorites.delete(state.current);else state.favorites.add(state.current);saveFavorites();updateFavorite();if(state.favoritesOnly)renderSurahs(search.value);}
function showFavorites(){toggleMenu(false);state.favoritesOnly=true;search.value="";renderSurahs("");}
function showAllSurahs(){toggleMenu(false);state.favoritesOnly=false;renderSurahs(search.value);}
function toggleMenu(force){const open=typeof force==="boolean"?force:!sidebar.classList.contains("active");sidebar.classList.toggle("active",open);sidebarOverlay.classList.toggle("active",open);sidebar.setAttribute("aria-hidden",String(!open));}

// ============ قائمة خيارات الآية ============
function openVerseOptions(){closeTafsir();const ov=document.getElementById("verse-options-overlay");const sh=document.getElementById("verse-options-sheet");if(ov&&sh){ov.classList.add("active");ov.setAttribute("aria-hidden","false");sh.classList.add("active");sh.setAttribute("aria-hidden","false");document.getElementById("verse-options-title").textContent="آية "+state.verseCtx.num+" · سورة "+state.verseCtx.id;}}
function closeVerseOptions(){const ov=document.getElementById("verse-options-overlay");const sh=document.getElementById("verse-options-sheet");if(ov){ov.classList.remove("active");ov.setAttribute("aria-hidden","true");}if(sh){sh.classList.remove("active");sh.setAttribute("aria-hidden","true");}state.verseCtx=null;}
function stopAudio(){if(state.currentAudio){try{state.currentAudio.pause();state.currentAudio.src="";}catch(_){}state.currentAudio=null;}const ap=document.getElementById("audio-player");if(ap){ap.classList.remove("active","stop");ap.style.display="none";ap.textContent="🔊";}}
function playVerseAudio(surahId,verseNum){stopAudio();closeVerseOptions();const path=localStorage.getItem("quran-audio-path")||"";if(!path){const p=prompt("أدخل مسار ملفات التفسير الصوتي (مثال: /sdcard/audio/sura/):");if(!p)return;localStorage.setItem("quran-audio-path",p);}const url=path.replace(/\/$/,"")+"/sura_"+String(surahId).padStart(3,"0")+"_verse_"+String(verseNum).padStart(3,"0")+".mp3";const a=new Audio(url);state.currentAudio=a;a.play().catch(()=>{alert("تعذر تشغيل الملف الصوتي: "+url+"\nتأكد من وجود الملف ومشغل MDD يدعم MP3.");stopAudio();});a.onended=stopAudio;const ap=document.getElementById("audio-player");if(ap){ap.classList.add("active");ap.style.display="flex";ap.onclick=stopAudio;}}
function listenRange(surahId,startVerse){stopAudio();closeVerseOptions();const path=localStorage.getItem("quran-audio-path")||"";if(!path){const p=prompt("أدخل مسار ملفات التفسير الصوتي (مثال: /sdcard/audio/sura/):");if(!p)return;localStorage.setItem("quran-audio-path",p);}const s=quranData[surahId];if(!s||!Array.isArray(s.verses))return;let idx=startVerse-1;const next=()=>{if(idx>=s.verses.length){stopAudio();return;}const v=s.verses[idx];const url=path.replace(/\/$/,"")+"/sura_"+String(surahId).padStart(3,"0")+"_verse_"+String(idx+1).padStart(3,"0")+".mp3";const a=new Audio(url);state.currentAudio=a;a.play();a.onended=()=>{stopAudio();idx++;next();};a.onerror=()=>{stopAudio();idx++;next();};};next();const ap=document.getElementById("audio-player");if(ap){ap.classList.add("active","stop");ap.style.display="flex";ap.textContent="⏹";ap.onclick=stopAudio;}}
function playVerseRecitation(surahId,verseNum){stopAudio();closeVerseOptions();const path=localStorage.getItem("quran-recitation-path")||"";if(!path){const p=prompt("أدخل مسار ملفات التلاوة الصوتية (مثال: /sdcard/audio/recitation/):");if(!p)return;localStorage.setItem("quran-recitation-path",p);}const url=path.replace(/\/$/,"")+"/sura_"+String(surahId).padStart(3,"0")+"_verse_"+String(verseNum).padStart(3,"0")+".mp3";const a=new Audio(url);state.currentAudio=a;a.play().catch(()=>{alert("تعذر تشغيل ملف التلاوة: "+url);stopAudio();});a.onended=stopAudio;const ap=document.getElementById("audio-player");if(ap){ap.classList.add("active");ap.style.display="flex";ap.onclick=stopAudio;}}
function showVerseTafsir(surahId,verseNum){closeVerseOptions();const s=quranData[surahId];const v=s&&s.verses&&s.verses[verseNum-1];const t=v&&v.tafsir? v.tafsir:"لم يتم العثور على تفسير لهذه الآية.";showTafsir(t);}
function addVerseNote(surahId,verseNum){closeVerseOptions();const key=surahId+":"+verseNum;const existing=state.verseNotes[key]||"";document.getElementById("note-text").value=existing;showModal("note");state.noteKey=key;}
function saveVerseNote(){const txt=document.getElementById("note-text").value.trim();if(state.noteKey){if(txt){state.verseNotes[state.noteKey]=txt;}else{delete state.verseNotes[state.noteKey];}saveVerseNotes();closeModal("note");showModal("note-saved");setTimeout(()=>closeModal("note-saved"),1200);state.noteKey=null;}}
function toggleVerseFavorite(surahId,verseNum){const key=surahId+":"+verseNum;const removing=state.verseFavorites.has(key);if(removing)state.verseFavorites.delete(key);else state.verseFavorites.add(key);const saved=saveVerseFavorites();closeVerseOptions();showToast(saved?(removing?"تم إزالة الآية من المفضلة":"تم حفظ الآية في المفضلة"):"تعذر حفظ المفضلة على هذا الجهاز");}
function showVerseDetails(surahId,verseNum){closeVerseOptions();const meta=surahsData.find(x=>x[0]===surahId);const juz=Math.ceil((verseNum-1+getVersesBeforeSurah(surahId))/20);const hizb=Math.ceil((verseNum-1+getVersesBeforeSurah(surahId))/10);const page=Math.ceil((verseNum-1+getVersesBeforeSurah(surahId))/16);const content="<div class='verse-details'><div class='row'><span class='label'>رقم السورة:</span><span class='val'>"+surahId+"</span></div><div class='row'><span class='label'>اسم السورة:</span><span class='val'>"+(meta?meta[1]:"")+"</span></div><div class='row'><span class='label'>رقم الآية:</span><span class='val'>"+verseNum+"</span></div><div class='row'><span class='label'>النوع:</span><span class='val'>"+(meta?meta[3]:"")+"</span></div><div class='row'><span class='label'>الجزء (تقريبي):</span><span class='val'>"+juz+"</span></div><div class='row'><span class='label'>الحزب (تقريبي):</span><span class='val'>"+hizb+"</span></div><div class='row'><span class='label'>الصفحة (تقريبي):</span><span class='val'>"+page+"</span></div></div>";closeVerseOptions();showModal("custom-details");document.getElementById("modal-custom-details-content").innerHTML=content;}
function getVersesBeforeSurah(id){let total=0;for(const row of surahsData){if(row[0]>=id)break;total+=row[2];}return total;}return total;}
async function copyVerseText(surahId,verseNum){const s=quranData[surahId],v=s&&s.verses&&s.verses[verseNum-1];closeVerseOptions();if(!v||!v.text){showToast("لا يوجد نص للآية");return;}let ok=false;try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(v.text);ok=true;}}catch(_){}if(!ok){try{const ta=document.createElement("textarea");ta.value=v.text;ta.setAttribute("readonly","");ta.style.position="fixed";ta.style.opacity="0";ta.style.left="-9999px";document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);ok=document.execCommand("copy");ta.remove();}catch(_){ok=false;}}showToast(ok?"تم نسخ نص الآية":"لم يتم النسخ؛ حاول مرة أخرى");}
function shareVerse(surahId,verseNum){closeVerseOptions();const s=quranData[surahId];const v=s&&s.verses&&s.verses[verseNum-1];if(!v||!v.text){alert("لا يوجد نص للمشاركة.");return;}const text="سورة "+(s?s.name:"")+" - الآية "+verseNum+"\n"+v.text+"\n"+(v.tafsir?"\nالتفسير: "+v.tafsir:"")+"\n--- من تطبيق تقريب القرآن";const shareData={title:"سورة "+(s?s.name:"")+" - الآية "+verseNum,text:text};if(navigator.share){navigator.share(shareData).catch(_=>{});return;}closeVerseOptions();showModal("custom-share");document.getElementById("modal-custom-share-preview").textContent=text;}
async function showVerseFavorites(){
 toggleMenu(false);const box=document.getElementById("verse-favorites-list");if(!box)return;box.replaceChildren();
 const keys=[...state.verseFavorites];
 if(!keys.length){box.textContent="لم تضف آيات إلى المفضلة بعد.";showModal("verse-favorites");return;}
 try{
  const ids=[...new Set(keys.map(key=>Number(key.split(":")[0])))];
  await Promise.all(ids.map(id=>ensureSurahData(id)));
 }catch(_){box.textContent="تعذر تحميل بعض الآيات المفضلة. تحقق من الاتصال ثم أعد المحاولة.";showModal("verse-favorites");return;}
 keys.sort((a,b)=>{const [sa,va]=a.split(":").map(Number),[sb,vb]=b.split(":").map(Number);return sa-sb||va-vb;});
 keys.forEach(key=>{const [sid,vid]=key.split(":").map(Number);const s=quranData[sid],v=s&&s.verses&&s.verses[vid-1],meta=surahsData.find(x=>x[0]===sid);if(!v)return;const row=document.createElement("div");row.className="favorite-verse-row";row.textContent=(meta?meta[1]:"سورة")+" · آية "+digits(vid)+"\n"+v.text;const remove=document.createElement("button");remove.textContent="إزالة";remove.onclick=()=>{state.verseFavorites.delete(key);saveVerseFavorites();showVerseFavorites();};row.appendChild(remove);box.appendChild(row);});
 showModal("verse-favorites");
}

function closeVerseOptions(){
 const ov=document.getElementById("verse-options-overlay");
 const sh=document.getElementById("verse-options-sheet");
 if(ov){ov.classList.remove("active");ov.setAttribute("aria-hidden","true");}
 if(sh){sh.classList.remove("active");sh.setAttribute("aria-hidden","true");}
 state.verseCtx=null;
}

function pointerDown(e){
 try{
  if(!state.current){console.warn("No surah open");return;}
  const target=e.target.closest(".verse,.basmala");if(!target)return;
  cancelPress();state.pressed=target;state.pressStart={x:e.clientX,y:e.clientY};target.classList.add("pressing");
  const num=Number(target.dataset.num||0);
  const tafsirText=target.dataset.tafsir||"";
  state.verseCtx={id:state.current,num,text:target.dataset.text||"",tafsir:tafsirText};
  console.log("Pointer down on verse",num,"of surah",state.current);
  state.pressTimer=setTimeout(()=>{
   if(state.pressTimer&&state.pressed){
    state.pressTimer=null;
    state.pressed.classList.remove("pressing");
    state.pressed=null;
    openVerseOptions();
   }
  },700);
 }catch(err){console.error("pointerDown error:",err);}
}

function stopAudio(){if(state.currentAudio){try{state.currentAudio.pause();state.currentAudio.src="";}catch(_){}state.currentAudio=null;}const ap=document.getElementById("audio-player");if(ap){ap.classList.remove("active","stop");ap.style.display="none";ap.textContent="🔊";}}
function showTafsir(text){tafsirText.textContent=text&&text.trim()?text:"لم يُدرج تفسير هذه الآية في قاعدة البيانات الحالية.";tafsirOverlay.classList.add("active");tafsirSheet.classList.add("active");tafsirSheet.setAttribute("aria-hidden","false");}
function closeTafsir(){cancelPress();tafsirOverlay.classList.remove("active");tafsirSheet.classList.remove("active");tafsirSheet.setAttribute("aria-hidden","true");}
function saveCurrentSurah(){
 if(state.current===null)return;const [id,name]=surahsData.find(x=>x[0]===state.current),s=quranData[id],lines=[];
 if(id!==1&&id!==9)lines.push(BASMALA);
 s.verses.forEach((v,i)=>lines.push(v.text+" ﴿"+digits(i+1)+"﴾"));
 const blob=new Blob(["\uFEFF"+lines.join("\n\n")],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="سورة-"+name+".txt";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function adjustFontSize(delta){state.fontSize=Math.max(1.4,Math.min(2.8,Math.round((state.fontSize+delta)*10)/10));applyFontSize();try{localStorage.setItem("quran-font-size-v2",String(state.fontSize));}catch(_){}}
function showModal(type){toggleMenu(false);const el=document.getElementById("modal-"+type);if(el){el.classList.add("active");el.setAttribute("aria-hidden","false");}}
function closeModal(type){const el=document.getElementById("modal-"+type);if(el){el.classList.remove("active");el.setAttribute("aria-hidden","true");}}
function showError(message){appStatus.hidden=false;appStatus.textContent=message;}
quran.addEventListener("pointerdown",pointerDown);
quran.addEventListener("pointerup",cancelPress);
quran.addEventListener("pointercancel",cancelPress);
quran.addEventListener("pointerleave",e=>{if(e.pointerType!=="touch")cancelPress();});
quran.addEventListener("pointermove",e=>{
 if(!state.pressStart||!state.pressTimer)return;
 const dx=e.clientX-state.pressStart.x,dy=e.clientY-state.pressStart.y;
 if(Math.hypot(dx,dy)>12)cancelPress();
},{passive:true});
quran.addEventListener("contextmenu",e=>{if(e.target.closest(".verse,.basmala"))e.preventDefault();});
window.addEventListener("keydown",e=>{if(e.key==="Escape"){closeTafsir();toggleMenu(false);document.querySelectorAll(".custom-modal.active").forEach(x=>{x.classList.remove("active");x.setAttribute("aria-hidden","true");});closeSurah();}});
window.addEventListener("click",e=>{if(e.target.classList.contains("custom-modal")){e.target.classList.remove("active");e.target.setAttribute("aria-hidden","true");}});
applyFontSize();applyQuranFont();
if(loadNightMode())toggleNightMode();
renderSurahs();
