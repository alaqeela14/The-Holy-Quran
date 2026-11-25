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
const ARABIC_DIGITS="٠١٢٣٤٥٦٧٨٩";
const state={current:null,favorites:loadFavorites(),favoritesOnly:false,pressTimer:null,pressed:null,fontSize:loadFontSize(),verseCtx:null,verseFavorites:loadVerseFavorites(),verseNotes:loadVerseNotes(),currentAudio:null,audioRange:null};

function digits(value){return String(value).replace(/\d/g,d=>ARABIC_DIGITS[Number(d)]);}
function normalize(value){
 return String(value||"").replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).normalize("NFD")
 .replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").trim().toLowerCase();
}
function loadFavorites(){try{const v=JSON.parse(localStorage.getItem("quran-favorite-surahs")||"[]");return new Set(Array.isArray(v)?v.map(Number).filter(Number.isInteger):[]);}catch(_){return new Set();}}
function saveFavorites(){try{localStorage.setItem("quran-favorite-surahs",JSON.stringify([...state.favorites]));}catch(_){}}
function loadFontSize(){try{const v=Number(localStorage.getItem("quran-font-size-v2"));return Number.isFinite(v)&&v>=1.4&&v<=2.8?v:1.4;}catch(_){return 1.4;}}
function applyFontSize(){document.documentElement.style.setProperty("--quran-font-size",state.fontSize+"rem");}
function loadVerseFavorites(){try{const v=JSON.parse(localStorage.getItem("quran-favorite-verses")||"[]");return new Set(Array.isArray(v)?v.filter(x=>/^\d+:\d+$/.test(x)):[]);}catch(_){return new Set();}}
function saveVerseFavorites(){try{localStorage.setItem("quran-favorite-verses",JSON.stringify([...state.verseFavorites]));}catch(_){}}
function loadVerseNotes(){try{const v=JSON.parse(localStorage.getItem("quran-verse-notes")||"{}");return (v&&typeof v==="object"&&!Array.isArray(v))?v:{};}catch(_){return {};}}
function saveVerseNotes(){try{localStorage.setItem("quran-verse-notes",JSON.stringify(state.verseNotes));}catch(_){}}
function validateData(){
 if(!Array.isArray(surahsData)||surahsData.length!==114||!quranData)return "تعذر تحميل قاعدة بيانات القرآن.";
 let total=0;
 for(const [id,name,count] of surahsData){
  const s=quranData[id];
  if(!s||!Array.isArray(s.verses)||s.verses.length!==count)return "يوجد خلل في عدد آيات سورة "+name+".";
  if(s.verses.some(v=>!v||typeof v.text!=="string"||!v.text.trim()))return "يوجد نص قرآني ناقص في سورة "+name+"؛ أوقف العرض منعاً لإظهار نص غير مكتمل.";
  total+=s.verses.length;
 }
 return total===6236?"": "عدد الآيات لا يطابق العدد المعتمد.";
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
function openSurah(name,id){
 const s=quranData[id],meta=surahsData.find(x=>x[0]===id);
 if(!s||!meta||!Array.isArray(s.verses)||s.verses.length!==meta[2]||s.verses.some(v=>!v||!v.text||!v.text.trim())){showError("تعذر فتح السورة بسبب نقص بياناتها. لم يتم عرض نص تجريبي.");return;}
 state.current=id;title.textContent="سورة "+name;quran.replaceChildren();
 if(id!==1&&id!==9){const b=document.createElement("span");b.className="basmala";b.textContent=BASMALA;b.dataset.tafsir=s.basmalaTafsir||"";quran.appendChild(b);}
 s.verses.forEach((v,i)=>{
	  const item=document.createElement("span");item.className="verse";item.dataset.tafsir=typeof v.tafsir==="string"?v.tafsir:"";
	  item.dataset.num=i+1;
	  item.dataset.text=v.text;
	  const text=document.createElement("span");text.className="verse-text";text.textContent=v.text;
  const num=document.createElement("span");num.className="verse-number";num.textContent=digits(i+1);
  item.append(text,document.createTextNode(" "),num,document.createTextNode(" "));quran.appendChild(item);
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
function toggleVerseFavorite(surahId,verseNum){closeVerseOptions();const key=surahId+":"+verseNum;if(state.verseFavorites.has(key)){state.verseFavorites.delete(key);showToast("تم إزالة الآية من المفضلة");}else{state.verseFavorites.add(key);showToast("تم إضافة الآية للمفضلة");}saveVerseFavorites();}
function showVerseDetails(surahId,verseNum){closeVerseOptions();const meta=surahsData.find(x=>x[0]===surahId);const juz=Math.ceil((verseNum-1+getVersesBeforeSurah(surahId))/20);const hizb=Math.ceil((verseNum-1+getVersesBeforeSurah(surahId))/10);const page=Math.ceil((verseNum-1+getVersesBeforeSurah(surahId))/16);const content="<div class='verse-details'><div class='row'><span class='label'>رقم السورة:</span><span class='val'>"+surahId+"</span></div><div class='row'><span class='label'>اسم السورة:</span><span class='val'>"+(meta?meta[1]:"")+"</span></div><div class='row'><span class='label'>رقم الآية:</span><span class='val'>"+verseNum+"</span></div><div class='row'><span class='label'>النوع:</span><span class='val'>"+(meta?meta[3]:"")+"</span></div><div class='row'><span class='label'>الجزء (تقريبي):</span><span class='val'>"+juz+"</span></div><div class='row'><span class='label'>الحزب (تقريبي):</span><span class='val'>"+hizb+"</span></div><div class='row'><span class='label'>الصفحة (تقريبي):</span><span class='val'>"+page+"</span></div></div>";closeVerseOptions();showModal("custom-details");document.getElementById("modal-custom-details-content").innerHTML=content;}
function getVersesBeforeSurah(id){let total=0;for(let i=1;i<id;i++){const s=quranData[i];if(s&&Array.isArray(s.verses))total+=s.verses.length;}return total;}
function copyVerseText(surahId,verseNum){closeVerseOptions();const s=quranData[surahId];const v=s&&s.verses&&s.verses[verseNum-1];if(!v||!v.text){alert("لا يوجد نص للآية.");return;}navigator.clipboard.writeText(v.text).then(()=>showToast("تم نسخ نص الآية")).catch(()=>{const ta=document.createElement("textarea");ta.value=v.text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();showToast("تم نسخ نص الآية");});}
function shareVerse(surahId,verseNum){closeVerseOptions();const s=quranData[surahId];const v=s&&s.verses&&s.verses[verseNum-1];if(!v||!v.text){alert("لا يوجد نص للمشاركة.");return;}const text="سورة "+(s?s.name:"")+" - الآية "+verseNum+"\n"+v.text+"\n"+(v.tafsir?"\nالتفسير: "+v.tafsir:"")+"\n--- من تطبيق تقريب القرآن";const shareData={title:"سورة "+(s?s.name:"")+" - الآية "+verseNum,text:text};if(navigator.share){navigator.share(shareData).catch(_=>{});return;}closeVerseOptions();showModal("custom-share");document.getElementById("modal-custom-share-preview").textContent=text;}
function showToast(msg){const t=document.getElementById("toast");if(t){t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2000);}}

function cancelPress(){if(state.pressTimer){clearTimeout(state.pressTimer);state.pressTimer=null;}if(state.pressed){state.pressed.classList.remove("pressing");state.pressed=null;}}

function openVerseOptions(){
 closeTafsir();
 const ov=document.getElementById("verse-options-overlay");
 const sh=document.getElementById("verse-options-sheet");
 const titleEl=document.getElementById("verse-options-title");
 if(!ov||!sh){console.error("verse-options elements not found");return;}
 ov.classList.add("active");ov.setAttribute("aria-hidden","false");
 sh.classList.add("active");sh.setAttribute("aria-hidden","false");
 if(titleEl&&state.verseCtx){titleEl.textContent="آية "+state.verseCtx.num+" · سورة "+state.verseCtx.id;}
 console.log("Verse options opened for surah",state.verseCtx.id,"verse",state.verseCtx.num);
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
  cancelPress();state.pressed=target;target.classList.add("pressing");
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
quran.addEventListener("pointerdown",pointerDown);quran.addEventListener("pointerup",cancelPress);quran.addEventListener("pointercancel",cancelPress);quran.addEventListener("pointerleave",cancelPress);quran.addEventListener("pointermove",cancelPress,{passive:true});
quran.addEventListener("contextmenu",e=>{if(e.target.closest(".verse,.basmala"))e.preventDefault();});
window.addEventListener("keydown",e=>{if(e.key==="Escape"){closeTafsir();toggleMenu(false);document.querySelectorAll(".custom-modal.active").forEach(x=>{x.classList.remove("active");x.setAttribute("aria-hidden","true");});closeSurah();}});
window.addEventListener("click",e=>{if(e.target.classList.contains("custom-modal")){e.target.classList.remove("active");e.target.setAttribute("aria-hidden","true");}});
applyFontSize();
const dataError=validateData();
if(dataError){showError(dataError);const p=document.createElement("p");p.className="empty-state error-state";p.textContent=dataError;list.replaceChildren(p);}else renderSurahs();
