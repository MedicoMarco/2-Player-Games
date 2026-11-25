(() => {
  const {create,score,stakes,initialChips}=BlackjackRules;

  window.createBlackjackGame=()=>{
    let count=1,engine=null,state=null,controls=null,timer=null,dealAt=0,dealerFlipAt=0,hadHole=false,handAnimations=new Map();
    const actionLabels={hit:'Hit',stand:'Stand',double:'Double',split:'Split'};

    function setup() {
      showOv(`<div class="luwrap poker-setup"><div class=kick>Play chips</div><h2>Blackjack</h2>
        <div class=lusetup><b>Other players</b><div class=seg>
        ${Array.from({length:10},(_,i)=>`<button data-lu=bj-count data-v=${i+1} class="${i+1===count?'on':''}">${i}</button>`).join('')}
        </div></div><button class=btn data-lu=bj-start>Take a seat</button>
        <p class=luhint>You and up to nine bots each play against the dealer. You start with ${initialChips} play chips.</p></div>`);
    }

    function action(key) {
      if(!engine||!state)return;
      if(key==='restart'){
        engine=create(count,()=>mmDeck(4));
        renderState();
      }else if(key==='custom'||key==='all-in'){
        const amount=key==='all-in'?state.seats[0].chips:controls.querySelector('[data-bj-amount]')?.valueAsNumber;
        if(!engine.open(amount)){
          controls.querySelector('[data-bj-amount]')?.reportValidity();
          return;
        }
        dealAt=now();renderState();
      }else if(state.turn===0&&engine.act(key))renderState();
    }

    function startTable() {
      clearTimeout(timer);
      engine=create(count,()=>mmDeck(4));
      $('#ov').style.display='none';
      controls=document.createElement('div');
      controls.className='card-table-controls blackjack-controls';
      controls.setAttribute('aria-label','Blackjack actions');
      controls.addEventListener('keydown',event=>{
        if(event.key==='Enter'&&event.target.matches('[data-bj-amount]')){event.preventDefault();action('custom');}
      });
      controls.addEventListener('click',event=>{
        const key=event.target.closest('[data-bj]')?.dataset.bj;
        if(key)action(key);
      });
      $('#game .stage').append(controls);
      renderState();
    }

    function renderState() {
      clearTimeout(timer);
      const previousRound=state?.round;
      state=engine.snapshot();
      if(previousRound!==state.round){handAnimations.clear();hadHole=false;dealerFlipAt=0;}
      if(hadHole&&!state.dealer.includes(-1))dealerFlipAt=now();
      hadHole=state.dealer.includes(-1);
      const updateCards=(key,hand)=>{
        const existing=handAnimations.get(key)||[];
        while(existing.length<hand.length)existing.push(now());
        handAnimations.set(key,existing.slice(0,hand.length));
      };
      if(state.round){updateCards('dealer',state.dealer);state.seats[0].hands.forEach((h,i)=>updateCards(i,h.cards));}
      const human=state.turn===0, betting=state.phase==='ready'||state.phase==='result';
      controls.hidden=!human&&!betting;
      const announced=human?'Your turn. Hand total '+score(state.seats[0].hands[state.handIndex].cards).total
        :betting?'Choose your bet. '+state.seats[0].chips+' chips available.':'';
      let buttons='';
      if(betting)buttons=state.seats[0].chips<1
        ?'<button class=btn data-bj=restart>New game</button>'
        :`<input data-bj-amount type=number inputmode=numeric min=1 max=${state.seats[0].chips} step=1 value=${Math.min(stakes[0],state.seats[0].chips)} required aria-label="Bet amount">
          <button class=btn data-bj=custom>Bet</button><button class=btn data-bj=all-in>All-in</button>`;
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
        if(state)label(state.seats[0].chips+' chips · Enter a bet',400,375,20);
        return;
      }
      const {seats,dealer,turn,phase,handIndex}=state;
      rr(25,193,142,49,9,'#102c29');label('BANKROLL',96,211,12,'#91c5b4');label(seats[0].chips+' chips',96,231,19);
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
      cards(dealer,400,148,68,320,'dealer');
      const player=seats[0];
      label('You · '+player.chips+' Chips'+(phase==='players'&&turn>0?' · '+seats[turn].name+' is playing':''),400,270,19);
      player.hands.forEach((h,i)=>{
        const x=player.hands.length===1?400:252+i*296;
        cards(h.cards,x,282,64,222,i);
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
        if(controls?.contains(document.activeElement)||document.activeElement?.matches('input,textarea,select'))return;
        const keys={KeyH:'hit',KeyS:'stand',KeyD:'double',KeyP:'split'};
        if(keys[code])action(keys[code]);
      },
      leave(){clearTimeout(timer);engine=null;state=null;controls?.remove();controls=null;}
    };
    return api;
  };
})();
