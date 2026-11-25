"use strict";
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const output=path.join(root,"www");
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
const files=["index.html","style.css","app.js","data.js","sw.js","manifest.webmanifest","icon.svg"];
for(const name of fs.readdirSync(root)){
 if(/^data-\d{2}\.js$/.test(name))files.push(name);
}
for(const name of [...new Set(files)]){
 const source=path.join(root,name);
 if(!fs.existsSync(source))throw new Error("Missing web asset: "+name);
 fs.copyFileSync(source,path.join(output,name));
}
console.log("Prepared "+files.length+" web assets in www/ for the Android app.");