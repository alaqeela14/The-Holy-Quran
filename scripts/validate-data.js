"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const scripts=["data.js",...fs.readdirSync(root).filter(x=>/^data-\d{2}\.js$/.test(x)).sort()];
if(scripts.length<2)throw new Error("Quran data shards are missing.");
const source=scripts.map(x=>fs.readFileSync(path.join(root,x),"utf8")).join("\n");
const context={};vm.runInNewContext(source+"\n;globalThis.__q={surahsData,quranData};",context,{timeout:60000});
const {surahsData,quranData}=context.__q,errors=[];let total=0,tafsir=0;
if(!Array.isArray(surahsData)||surahsData.length!==114)errors.push("Expected 114 surahs.");
for(const [id,name,count] of surahsData){
 const s=quranData[id];if(!s||!Array.isArray(s.verses)){errors.push("Missing surah "+id);continue;}
 if(s.verses.length!==count)errors.push("Wrong verse count: "+id);
 s.verses.forEach((v,i)=>{total++;if(!v||typeof v.text!=="string"||!v.text.trim())errors.push("Missing text "+id+":"+(i+1));if(!v||typeof v.tafsir!=="string")errors.push("Invalid tafsir "+id+":"+(i+1));else if(v.tafsir.trim())tafsir++;});
 if(id!==1&&id!==9&&typeof s.basmalaTafsir!=="string")errors.push("Missing basmala field "+id);
}
if(total!==6236)errors.push("Expected 6236 verses, found "+total);
if(errors.length){console.error(errors.slice(0,50).join("\n"));process.exit(1);}
console.log("Quran data validation passed: 114 surahs, 6,236 complete ayahs, "+tafsir+" tafsir entries.");
