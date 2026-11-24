(() => {
  const {create,score,stakes,initialChips}=BlackjackRules;

  window.createBlackjackGame=()=>{
    let count=1,engine=null,state=null,controls=null,timer=null,dealAt=0;
    const actionLabels={hit:'Ziehen',stand:'Halten',double:'Verdoppeln',split:'Teilen'};

    function setup() {
      showOv(`<div class="luwrap poker-setup"><div class=kick>Mit Spielchips</div><h2>Blackjack</h2>
        <div class=lusetup><b>Computer-Mitspieler</b><div class=seg>
        ${Array.from({length:10},(_,i)=>`<button data-lu=bj-count data-v=${i+1} class="${i+1===count?'on':''}">${i}</button>`).join('')}
        </div></div><button class=btn data-lu=bj-start>An den Tisch</button>
        <p class=luhint>Du und bis zu neun Computer-Mitspieler tretet jeweils gegen den Dealer an. Du beginnst mit ${initialChips} Spielchips.</p></div>`);
    }

    function action(key) {
      if(!engine||!state)return;
      if(key==='restart'){
        engine=create(count,()=>mmDeck(4));
        renderState();
      }else if(key.startsWith('stake:')){
        if(engine.open(Number(key.slice(6)))){dealAt=now();renderState();}
      }else if(state.turn===0&&engine.act(key))renderState();
    }

    function startTable() {
      clearTimeout(timer);
      engine=create(count,()=>mmDeck(4));
      $('#ov').style.display='none';
      controls=document.createElement('div');
      controls.className='card-table-controls';
      controls.setAttribute('aria-label','Blackjack-Aktionen');
      controls.addEventListener('click',event=>{
        const key=event.target.closest('[data-bj]')?.dataset.bj;
        if(key)action(key);
      });
      $('#game .stage').append(controls);
      renderState();
    }

    function renderState() {
      clearTimeout(timer);
      state=engine.snapshot();
      const human=state.turn===0, betting=state.phase==='ready'||state.phase==='result';
      controls.hidden=!human&&!betting;
      const announced=human?'Du bist dran. Wert deiner Hand '+score(state.seats[0].hands[state.handIndex].cards).total
        :betting?'Wähle deinen Einsatz. '+state.seats[0].chips+' Chips verfügbar.':'';
      let buttons='';
      if(betting)buttons=state.seats[0].chips<stakes[0]
        ?'<button class=btn data-bj=restart>Neues Spiel</button>'
        :stakes.map(stake=>`<button class=btn data-bj="stake:${stake}" ${stake>state.seats[0].chips?'disabled':''}>${stake} setzen</button>`).join('');
      if(human)buttons=Object.entries(actionLabels).map(([key,name])=>
        `<button class=btn data-bj="${key}" ${state.actions[key]?'':'disabled'}>${name}</button>`).join('');
      const focused=controls.contains(document.activeElement)?document.activeElement.dataset.bj:null;
      controls.innerHTML=`<span class="card-table-announcement" role="status">${announced}</span>${buttons}`;
      if(focused)controls.querySelector(`[data-bj="${focused}"]:not([disabled])`)?.focus();
      if(state.phase==='dealer'||state.phase==='players'&&!human){
        const current=engine;
        timer=setTimeout(()=>{
          if(engine!==current)return;
          if(state.phase==='dealer')engine.dealerStep();
          else engine.act(engine.botAction());
          renderState();
        },state.phase==='dealer'?590:460);
      }
    }

    function label(text,x,y,size,color='#fbecd0',width=740) {
      c.fillStyle=color;c.textAlign='center';c.textBaseline='alphabetic';c.font='700 '+size+'px system-ui';
      c.fillText(text,x,y,width);
    }

    function cards(hand,x,y,width,maxSpacing,animate=false) {
      const spacing=Math.min(width*.8,maxSpacing/Math.max(1,hand.length-1));
      const left=x-(width+spacing*(hand.length-1))/2;
      const motion=animate&&S.anim&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
      hand.forEach((card,i)=>{
        let cardX=left+i*spacing,cardY=y;
        if(motion&&i<2){
          const f=Math.min(1,Math.max(0,(now()-dealAt-i*110)/300));
          if(!f)return;
          cardX=400+(cardX-400)*f;cardY=160+(y-160)*f;
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
        if(state)label(state.seats[0].chips+' Chips · Wähle deinen Einsatz',400,375,20);
        return;
      }
      const {seats,dealer,turn,phase,handIndex}=state;
      for(const [i,p] of seats.slice(1).entries()){
        const row=Math.floor(i/5),col=i%5,total=Math.min(5,seats.length-1-row*5),x=400+(col-(total-1)/2)*146;
        const y=11+row*53,active=turn===i+1;
        rr(x-66,y,132,45,10,active?'#efd09d':'#122d29d8');
        label(p.name,x,y+16,15,active?'#332618':'#f7eee1',120);
        const totals=p.hands.map(h=>score(h.cards).total).join(' / ');
        label(p.chips+' Chips'+(totals?' · '+totals:''),x,y+34,12,active?'#332618':'#c3ded4',120);
      }
      const shown=dealer.includes(-1)?'Dealer · '+score([dealer[0]]).total: 'Dealer · '+score(dealer).total;
      label(shown,400,136,18);
      cards(dealer,400,148,68,320,phase==='players');
      const player=seats[0];
      label('Du · '+player.chips+' Chips'+(phase==='players'&&turn>0?' · '+seats[turn].name+' ist dran':''),400,270,19);
      player.hands.forEach((h,i)=>{
        const x=player.hands.length===1?400:252+i*296;
        cards(h.cards,x,282,64,222,true);
        const active=turn===0&&handIndex===i,profit=h.returned-h.stake;
        const name=score(h.cards).total+' · '+(h.outcome?h.outcome+(profit?' ('+(profit>0?'+':'')+profit+')':''):h.stake+' Chips');
        label(name,x,400,16,active?'#ffdda6':'#e3f0e8',282);
      });
    }

    const api={draw,update(){},click(){},showSetup:setup,
      luClick(button){
        if(button.dataset.lu==='bj-count'){count=Number(button.dataset.v);setup();}
        if(button.dataset.lu==='bj-start')startTable();
      },
      key(code){
        if(controls?.contains(document.activeElement))return;
        const keys={KeyZ:'hit',KeyH:'stand',KeyV:'double',KeyT:'split'};
        if(keys[code])action(keys[code]);
      },
      leave(){clearTimeout(timer);engine=null;state=null;controls?.remove();controls=null;}
    };
    return api;
  };
})();
