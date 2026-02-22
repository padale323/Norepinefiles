(function(){

const PLUGIN_NAME="norepinefiles";
const COOKIE_NAME="norepinefiles_data";

function setCookie(name,value,days){
const d=new Date();
d.setTime(d.getTime()+(days*24*60*60*1000));
document.cookie=name+"="+encodeURIComponent(value)+";expires="+d.toUTCString()+";path=/";
}

function getCookie(name){
const match=document.cookie.match(new RegExp('(^| )'+name+'=([^;]+)'));
if(match)return decodeURIComponent(match[2]);
return null;
}

function loadData(){
const raw=getCookie(COOKIE_NAME);
if(!raw)return{files:{},aliases:{}};
try{return JSON.parse(raw);}catch{return{files:{},aliases:{}}}
}

function saveData(data){
setCookie(COOKIE_NAME,JSON.stringify(data),365);
}

let data=loadData();

function save(){saveData(data)}

function evaluateMath(expr){
if(!/^[0-9+\-*/(). %]+$/.test(expr))return null;
try{return Function("return ("+expr+")")()}catch{return null}
}

commands["touch"]="Create a file. Usage: touch filename";
commands["write"]="Write text to file. Usage: write filename content";
commands["read"]="Read file contents. Usage: read filename";
commands["rm"]="Delete file. Usage: rm filename";
commands["ls"]="List files.";
commands["alias"]="Create alias. Usage: alias name command";
commands["unalias"]="Remove alias. Usage: unalias name";
commands["aliases"]="List aliases.";
commands["math"]="Evaluate math expression. Usage: math 2+2";

api.registerCleanup(()=>{
delete commands["touch"];
delete commands["write"];
delete commands["read"];
delete commands["rm"];
delete commands["ls"];
delete commands["alias"];
delete commands["unalias"];
delete commands["aliases"];
delete commands["math"];
});

const originalHandle=handle;

handle=async function(input){

const raw=input.trim();
if(!raw)return;

const parts=raw.split(" ");
const cmd=parts[0];
const args=parts.slice(1);

if(data.aliases[cmd]){
return originalHandle(data.aliases[cmd]+" "+args.join(" "));
}

if(cmd==="touch"){
if(!args[0])return print("Filename required.");
if(data.files[args[0]])return print("File exists.");
data.files[args[0]]="";
save();
print("File created.");
return;
}

if(cmd==="write"){
if(!args[0])return print("Filename required.");
if(!data.files.hasOwnProperty(args[0]))return print("File not found.");
data.files[args[0]]=args.slice(1).join(" ");
save();
print("File updated.");
return;
}

if(cmd==="read"){
if(!args[0])return print("Filename required.");
if(!data.files.hasOwnProperty(args[0]))return print("File not found.");
print(data.files[args[0]]);
return;
}

if(cmd==="rm"){
if(!args[0])return print("Filename required.");
if(!data.files.hasOwnProperty(args[0]))return print("File not found.");
delete data.files[args[0]];
save();
print("File removed.");
return;
}

if(cmd==="ls"){
const keys=Object.keys(data.files);
if(!keys.length)return print("No files.");
keys.forEach(f=>print(f));
return;
}

if(cmd==="alias"){
if(!args[0]||args.length<2)return print("Usage: alias name command");
data.aliases[args[0]]=args.slice(1).join(" ");
save();
print("Alias added.");
return;
}

if(cmd==="unalias"){
if(!args[0])return print("Alias name required.");
if(!data.aliases[args[0]])return print("Alias not found.");
delete data.aliases[args[0]];
save();
print("Alias removed.");
return;
}

if(cmd==="aliases"){
const keys=Object.keys(data.aliases);
if(!keys.length)return print("No aliases.");
keys.forEach(a=>print(a+" → "+data.aliases[a]));
return;
}

if(cmd==="math"){
const result=evaluateMath(args.join(" "));
if(result===null)return print("Invalid expression.");
print(String(result));
return;
}

return originalHandle(input);
};

print("[norepinefiles Loaded] Files, aliases, and math enabled.");

})();
