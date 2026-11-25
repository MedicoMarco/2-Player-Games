(() => {
  const {create,score,initialChips}=BlackjackRules;

  window.createBlackjackGame=()=>{
    let count=1,engine=null,state=null,controls=null,timer=null,dealAt=0,dealerFlipAt=0,hadHole=false,handAnimations=new Map();
    let chips=null,mySeat=0,waiting=false,request=0;
    const actionLabels={hit:'Hit',stand:'Stand',double:'Double',split:'Split'};

    function setup() {
      showOv(`<div class="luwrap poker-setup"><div class=kick>Play chips</div><h2>Blackjack</h2>
        <div class=lusetup><b>Other seats</b><div class=seg>
        ${Array.from({length:10},(_,i)=>`<button data-lu=bj-count data-v=${i+1} class="${i+1===count?'on':''}">${i}</button>`).join('')}
        </div></div><button class=btn data-lu=bj-start>Take a seat</button>
        <div class=luon><b>Online</b><button class=btn data-lu=bj-create>Create room</button>
        <input id=lucode maxlength=20 placeholder="ROOM CODE" aria-label="Room code" autocomplete=off autocapitalize=characters><button class="btn r" data-lu=bj-join>Join</button></div>
        <p class=luhint>Play against the dealer with bots or with up to nine other players online. You start with ${initialChips} play chips.</p></div>`);
    }

    function submit(action,amount){
      if(!state||waiting)return;
      if(online.joined()){
        const id=++request;
        waiting=true;refreshControls();
        online.send(action,amount).then(ok=>{
          if(!ok&&id===request){waiting=false;refreshControls();}
        });
      }else if(action==='bet'?engine.open(amount):state.turn===0&&engine.act(action))renderState(engine.snapshot());
    }
    function action(key) {
      if(key==='restart'){
        engine=create(count,()=>mmDeck(4));
        handAnimations.clear();renderState(engine.snapshot());
      }else if(key==='next')online.next();
      else submit(key);
    }

    function mountControls() {
      $('#ov').style.display='none';
      if(controls)return;
      controls=document.createElement('div');
      controls.className='card-table-controls blackjack-controls';
      controls.setAttribute('aria-label','Blackjack actions');
      controls.innerHTML='<span class="card-table-announcement" role="status"></span><div class="card-actions"></div>';
      chips=createCardChipPicker({confirm:amount=>submit('bet',amount)});
      controls.append(chips.element);
      controls.addEventListener('click',event=>{
        const key=event.target.closest('[data-bj]')?.dataset.bj;
        if(key)action(key);
      });
      $('#game .stage').append(controls);
    }

    function startTable() {
      clearTimeout(timer);mySeat=0;
      engine=create(count,()=>mmDeck(4));
      renderState(engine.snapshot());
    }

    function refreshControls(){
      if(!controls||!state)return;
      const player=state.seats[mySeat],remote=online.joined();
      const human=state.phase==='players'&&state.turn===mySeat;
      const betting=remote?state.phase==='betting':['ready','result'].includes(state.phase);
      const next=remote&&online.isHost()&&state.phase==='result'&&state.seats.some(p=>p.name&&p.chips);
      const committed=remote&&state.bets?.[mySeat];
      controls.hidden=!human&&!betting&&!next;
      const announced=human?'Your turn. Hand total '+score(player.hands[state.handIndex].cards).total
        :committed?'Bet confirmed: '+committed+' chips. Waiting for the other players.':
          betting?'Choose your bet. '+player.chips+' chips available.':'';
      let buttons='';
      if(human)buttons=Object.entries(actionLabels).map(([key,name])=>
        `<button class=btn data-bj="${key}" ${state.actions[key]&&!waiting?'':'disabled'}>${name}</button>`).join('');
      if(next)buttons='<button class=btn data-bj=next>Next round</button>';
      if(betting&&!player.chips&&!remote)buttons='<button class=btn data-bj=restart>New game</button>';
      if(betting&&(committed||!player.chips&&remote))buttons='<span class="chip-table-note">'+(committed?
        'Bet confirmed: '+committed+' chips · Waiting for the table':'No chips remaining · Watching the table')+'</span>';
      const actions=controls.querySelector('.card-actions');
      if(actions.innerHTML!==buttons)actions.innerHTML=buttons;
      controls.querySelector('[role=status]').textContent=announced;
      chips.update(betting&&!committed&&player.chips?{
        key:remote?state.roundKey:state.round,min:1,max:player.chips,allIn:true,disabled:waiting,confirmLabel:'Confirm bet'
      }:null);
    }

    function renderState(next,seat=mySeat) {
      clearTimeout(timer);
      const previous=state;
      mySeat=seat;state=next;
      if(!previous||previous.round!==state.round||previous.phase!==state.phase||state.phase==='players'&&previous.seq!==state.seq||state.bets?.[seat]){
        waiting=false;++request;
      }
      if(previous?.round!==state.round){handAnimations.clear();hadHole=false;dealerFlipAt=0;dealAt=now();}
      if(hadHole&&!state.dealer.includes(-1))dealerFlipAt=now();
      hadHole=state.dealer.includes(-1);
      const updateCards=(key,hand)=>{
        const existing=handAnimations.get(key)||[];
        while(existing.length<hand.length)existing.push(now());
        handAnimations.set(key,existing.slice(0,hand.length));
      };
      if(state.round){updateCards('dealer',state.dealer);state.seats[mySeat].hands.forEach((h,i)=>updateCards(i,h.cards));}
      mountControls();refreshControls();
      if(!online.joined()&&(state.phase==='dealer'||state.phase==='players'&&state.turn!==mySeat)){
        const current=engine;
        timer=setTimeout(()=>{
          if(engine!==current)return;
          if(state.phase==='dealer')engine.dealerStep();
          else engine.act(engine.botAction());
          renderState(engine.snapshot());
        },state.phase==='dealer'?590:460);
      }
    }

    function label(text,x,y,size,color='#fbecd0',width=740) {
      c.fillStyle=color;c.textAlign='center';c.textBaseline='alphabetic';c.font='700 '+size+'px system-ui';
      c.fillText(text,x,y,width);
    }

    function cards(hand,x,y,width,maxSpacing,key=null) {
      const spacing=Math.min(width*.8,maxSpacing/Math.max(1,hand.length-1));
      const left=x-(width+spacing*(hand.length-1))/2;
      const motion=key!==null&&S.anim&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
      hand.forEach((card,i)=>{
        let cardX=left+i*spacing,cardY=y;
        const started=handAnimations.get(key)?.[i]??dealAt;
        if(motion){
          const f=Math.min(1,Math.max(0,(now()-Math.max(started,dealAt+i*70))/270));
          if(!f)return;
          cardX=400+(cardX-400)*f;cardY=160+(y-160)*f;
        }
        if(motion&&key==='dealer'&&i===1&&dealerFlipAt){
          const f=(now()-dealerFlipAt)/260;
          if(f>=0&&f<1){
            const scale=Math.max(.06,Math.abs(1-2*f));
            c.save();c.translate(cardX+width/2,0);c.scale(scale,1);drawCard(-width/2,cardY,width,f<.5?-1:card,{sh:true});c.restore();
            return;
          }
        }
        drawCard(cardX,cardY,width,card,{sh:true});
      });
    }

    function draw() {
      const felt=c.createRadialGradient(400,202,28,400,244,515);
      felt.addColorStop(0,'#225c50');felt.addColorStop(1,'#0a2729');
      c.fillStyle=felt;c.fillRect(0,0,800,480);
      c.strokeStyle='#dfc58f88';c.lineWidth=2;c.beginPath();c.ellipse(400,247,367,177,0,0,Math.PI*2);c.stroke();
      if(!state||!state.round){
        cards([12,21],400,140,105,96);
        label('Blackjack',400,322,40);
        if(state){
          label(state.seats[mySeat].chips+' chips · '+(state.bets?.[mySeat]?'Bet confirmed':'Choose your bet'),400,365,20);
          if(state.deadline)label(Math.max(0,Math.ceil((state.deadline-Date.now())/1000))+' s',701,226,18);
        }
        return;
      }
      const {seats,dealer,turn,phase,handIndex}=state;
      rr(25,193,142,49,9,'#102c29');label('BANKROLL',96,211,12,'#91c5b4');label(seats[mySeat].chips+' chips',96,231,19);
      const opponents=seats.map((p,seat)=>({...p,seat})).filter(p=>p.name&&p.seat!==mySeat);
      for(const [i,p] of opponents.entries()){
        const row=Math.floor(i/5),col=i%5,total=Math.min(5,opponents.length-row*5),x=400+(col-(total-1)/2)*146;
        const y=11+row*53,active=turn===p.seat;
        rr(x-66,y,132,45,10,active?'#efd09d':'#122d29d8');
        label(p.name,x,y+16,15,active?'#332618':'#f7eee1',120);
        const totals=p.hands.map(h=>score(h.cards).total).join(' / ');
        label(p.chips+' Chips'+(totals?' · '+totals:''),x,y+34,12,active?'#332618':'#c3ded4',120);
      }
      if(online.joined()&&state.deadline)label(Math.max(0,Math.ceil((state.deadline-Date.now())/1000))+' s',701,226,18);
      const shown=dealer.includes(-1)?'Dealer · '+score([dealer[0]]).total: 'Dealer · '+score(dealer).total;
      label(shown,400,136,18);
      cards(dealer,400,148,68,320,'dealer');
      const player=seats[mySeat];
      label('You · '+player.chips+' Chips'+(phase==='players'&&turn!==mySeat?' · '+seats[turn].name+' is playing':''),400,270,19);
      player.hands.forEach((h,i)=>{
        const x=player.hands.length===1?400:252+i*296;
        cards(h.cards,x,282,64,222,i);
        const active=turn===mySeat&&handIndex===i,profit=h.returned-h.stake;
        const name=score(h.cards).total+' · '+(h.outcome?h.outcome+(profit?' ('+(profit>0?'+':'')+profit+')':''):h.stake+' Chips');
        label(name,x,400,16,active?'#ffdda6':'#e3f0e8',282);
      });
    }

    const api={draw,update(){},click(){},showSetup:setup,
      luClick(button){
        if(button.dataset.lu==='bj-count'){count=Number(button.dataset.v);setup();}
        if(button.dataset.lu==='bj-start')startTable();
        online.click(button,count);

      },
      key(code){
        if(controls?.contains(document.activeElement)||document.activeElement?.matches('input,textarea,select'))return;
        const keys={KeyH:'hit',KeyS:'stand',KeyD:'double',KeyP:'split'};
        if(keys[code])action(keys[code]);
      },
      joinCode:code=>online.join(code),canJoin:()=>!online.joined(),
      leave(){online.leave();clearTimeout(timer);engine=null;state=null;controls?.remove();controls=null;}
    };
    const online=createBlackjackRoom({game:api,onLobby(){
      clearTimeout(timer);engine=null;state=null;waiting=false;++request;
      chips?.update(null);
      if(controls)controls.hidden=true;
    },onState(next,seat){
      engine=null;
      renderState(next,seat);
    }});
    return api;
  };
})();
