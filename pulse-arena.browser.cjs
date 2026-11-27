const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const source=fs.readFileSync(path.join(__dirname,'pulse-arena.js'));
const fixture='<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pulse Arena browser regression</title></head><body style="margin:0"><script>var OL={name:"Testspieler"},LUN={};window.testErrors=[];function luErr(e){return String(e)}function toast(t){window.testErrors.push(String(t))}function toMenu(){window.arena.leave()}function bootArena(){window.arena=window.createPulseArena();window.arena.showSetup()}</script><script src="/pulse-arena.js"></script><script>bootArena()</script></body></html>';
async function main(){
 const server=http.createServer((req,res)=>{if(req.url==='/pulse-arena.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(source);}else{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(fixture);}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const fallback of [false,true]){
 const context=await browser.newContext(fallback?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:800}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(fallback)await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
 await page.goto(url);
 await page.waitForFunction(()=>document.querySelector('#pulse-arena')?.dataset.phase==='setup');
 const root=page.locator('#pulse-arena');
 assert.equal(await root.getAttribute('data-renderer'),fallback?'canvas':'webgl');
 const map=root.locator('select[data-set=map]');
 await map.selectOption('2');
 await root.locator('[data-pa=solo]').click();
 await page.waitForFunction(()=>document.querySelector('#pulse-arena')?.dataset.phase==='play'&&/ s$/.test(document.querySelector('#pa-time')?.textContent||''));
 await page.waitForTimeout(300);
 assert.ok(Number(await root.locator('#pa-hp').textContent())>=0);
 if(!fallback)assert.equal(await page.evaluate(()=>document.querySelector('#pulse-arena canvas').getContext('webgl').getError()),0);
 if(fallback){
 const bounds=await root.locator('.pa-health').boundingBox();
 assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=390);
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(200);
 const rotated=await root.locator('canvas').boundingBox();
 assert.ok(rotated&&rotated.width>rotated.height);
 }
 await root.locator('.pa-top [data-pa=pause]').click();
 assert.ok(await root.locator('.pa-pause').isVisible());
 await root.locator('.pa-pause [data-pa=pause]').click();
 await page.waitForFunction(()=>!document.querySelector('.pa-pause'));
 await root.locator('[data-pa=sound]').click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pulseArenaView')).muted),true);
 await root.locator('[data-pa=exit]').click();
 await page.waitForFunction(()=>!document.querySelector('#pulse-arena'));
 assert.deepEqual(errors,[]);
 assert.deepEqual(await page.evaluate(()=>window.testErrors),[]);
 await context.close();
 console.log('Passed:',fallback?'mobile Canvas fallback + rotation':'desktop WebGL', 'setup/start/pause/resume/mute/leave');
 }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
