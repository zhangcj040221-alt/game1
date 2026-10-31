export class RaceRoom {
 constructor(state,env){this.players=new Map();this.started=false;this.startAt=0;this.finish=[]}
 broadcast(o){for(const p of this.players.values())try{p.ws.send(JSON.stringify(o))}catch{}}
 async fetch(req){
 const pair=new WebSocketPair(),client=pair[0],ws=pair[1];ws.accept();
 if(this.players.size>=2||this.started){ws.send(JSON.stringify({type:"error",message:"房间已满或比赛已开始"}));ws.close();return new Response(null,{status:101,webSocket:client})}
 const seat=this.players.has(0)?1:0,p={seat,ws,dist:0};this.players.set(seat,p);
 ws.send(JSON.stringify({type:"welcome",seat}));
 this.broadcast({type:"lobby",count:this.players.size});
 ws.addEventListener("message",e=>{let m;try{m=JSON.parse(e.data)}catch{return}
 if(m.type==="start"&&this.players.size===2&&!this.started){this.started=true;this.startAt=Date.now()+3500;this.broadcast({type:"start",at:this.startAt})}
 if(m.type==="move"&&this.started&&Date.now()>=this.startAt){p.dist=Math.max(p.dist,Math.min(100,Number(m.dist)||0));this.broadcast({type:"move",seat,dist:p.dist});if(p.dist>=100&&!this.finish.some(x=>x.seat===seat)){this.finish.push({seat,time:(Date.now()-this.startAt)/1000});this.broadcast({type:"finish",results:this.finish})}}
 if(m.type==="restart"){this.started=false;this.finish=[];for(const q of this.players.values())q.dist=0;this.broadcast({type:"reset"})}
 });
 const leave=()=>{if(this.players.get(seat)!==p)return;this.players.delete(seat);this.started=false;this.finish=[];this.broadcast({type:"reset"});this.broadcast({type:"lobby",count:this.players.size})};ws.addEventListener("close",leave);ws.addEventListener("error",leave);
 return new Response(null,{status:101,webSocket:client})
 }
}
export default {async fetch(req,env){const u=new URL(req.url);if(u.pathname==="/health")return Response.json({ok:true});const room=u.searchParams.get("room")||"";if(!/^[A-Z0-9]{6}$/.test(room))return new Response("Bad room",{status:400});return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(req)}};
