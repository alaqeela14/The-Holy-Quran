"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const shards=fs.readdirSync(root).filter(x=>/^data-\d{2}\.js$/.test(x)).sort();
if(!shards.length)throw new Error("Quran data shards are missing.");
const files=["data.js",...shards];
const source=files.map(x=>fs.readFileSync(path.join(root,x),"utf8")).join("\n");
const context={};
vm.runInNewContext(source+"\n;globalThis.__q={surahsData,quranData};",context,{timeout:60000});
const {surahsData,quranData}=context.__q;
const errors=[];let total=0,tafsir=0;
if(!Array.isArray(surahsData)||surahsData.length!==114)errors.push("Expected 114 surahs.");
for(const [id,name,count] of surahsData){
 const s=quranData[id];
 if(!s||!Array.isArray(s.verses)){errors.push("Missing surah "+id);continue;}
 if(s.verses.length!==count)errors.push("Wrong verse count: "+id);
 s.verses.forEach((v,i)=>{
  total++;
  if(!v||typeof v.text!=="string"||!v.text.trim())errors.push("Missing text "+id+":"+(i+1));
  if(!v||typeof v.tafsir!=="string")errors.push("Invalid tafsir "+id+":"+(i+1));
  else if(v.tafsir.trim())tafsir++;
  if(v&&typeof v.text==="string"&&v.text.includes("هذه الآية لم يتم إضافة تفسيرها بعد"))errors.push("Placeholder used as Quran text at "+id+":"+(i+1));
 });
 if(id!==1&&id!==9&&typeof s.basmalaTafsir!=="string")errors.push("Missing basmala field "+id);
}
if(total!==6236)errors.push("Expected 6,236 verses, found "+total);
if(!source.includes("Tanzil (https://tanzil.net)"))errors.push("Missing Tanzil attribution.");
if(!quranData[1].verses[0].text.startsWith("بِسْمِ"))errors.push("Al-Fatiha first ayah check failed.");
if(!quranData[2].verses[0].text.startsWith("الٓمٓ"))errors.push("Al-Baqarah first ayah check failed.");
if(!quranData[9].verses[0].text.startsWith("بَرَاءَةٌ"))errors.push("At-Tawbah first ayah check failed.");
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
new vm.Script(app,{filename:"app.js"});
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const scriptRefs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const pageShards=scriptRefs.filter(x=>/^data-\d{2}\.js$/.test(x));
if(JSON.stringify(pageShards)!==JSON.stringify(shards))errors.push("index.html does not load every data shard in order.");
if(scriptRefs[0]!=="data.js"||scriptRefs[scriptRefs.length-1]!=="app.js")errors.push("HTML script loading order is invalid.");
for(const ref of scriptRefs)if(!fs.existsSync(path.join(root,ref)))errors.push("Missing script asset: "+ref);
if(errors.length){console.error(errors.slice(0,50).join("\n"));process.exit(1);}
console.log("Quran data and reader validation passed.");
console.log("Surahs: 114 | Ayahs: "+total+" | Ayahs with tafsir: "+tafsir+" | Data shards: "+shards.length);
