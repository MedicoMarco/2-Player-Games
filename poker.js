(function (root) {
  const maxPlayers = 10;
  const startingChips = 500;
  const handNames = ['Hohe Karte', 'Ein Paar', 'Zwei Paare', 'Drilling', 'Straße', 'Flush', 'Full House', 'Vierling', 'Straight Flush'];
  const streetNames = ['Preflop', 'Flop', 'Turn', 'River'];
  const rankName = ([category, highCard]) =>
    category === 8 && highCard === 14 ? 'Royal Flush' : handNames[category];

  function compare(a, b) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
  }

  function fiveCardRank(cards) {
    const counts = new Map();
    for (const card of cards) {
      const rank = card % 13 + 2;
      counts.set(rank,(counts.get(rank) || 0) + 1);
    }
    const groups = [...counts].sort(([a,n],[b,m])=>m-n||b-a);
    const ranks = [...counts.keys()].sort((a,b)=>b-a);
    const flush = cards.every(card=>Math.floor(card/13)===Math.floor(cards[0]/13));
    const straight = ranks.length===5
      ? ranks[0]-ranks[4]===4 ? ranks[0] : ranks.join(',')==='14,5,4,3,2' ? 5 : 0
      : 0;
    const [first,second] = groups;
    const kickers = groups.map(([rank])=>rank);
    if (flush&&straight) return [8,straight];
    if (first[1]===4) return [7,...kickers];
    if (first[1]===3&&second[1]===2) return [6,...kickers];
    if (flush) return [5,...ranks];
    if (straight) return [4,straight];
    if (first[1]===3) return [3,...kickers];
    if (first[1]===2&&second[1]===2) return [2,...kickers];
    if (first[1]===2) return [1,...kickers];
    return [0,...ranks];
  }

  function bestRank(cards) {
    let best = [-1];
    for (let a=0;a<cards.length-4;a++) for (let b=a+1;b<cards.length-3;b++)
      for (let c=b+1;c<cards.length-2;c++) for (let d=c+1;d<cards.length-1;d++)
        for (let e=d+1;e<cards.length;e++) {
          const rank = fiveCardRank([cards[a],cards[b],cards[c],cards[d],cards[e]]);
          if (compare(rank,best)>0) best=rank;
        }
    return best;
  }

  function handName(hand, board) {
    if (hand.length !== 2) return '';
    if (board.length < 3) return handNames[Number(hand[0] % 13 === hand[1] % 13)];
    return rankName(bestRank([...hand, ...board]));
  }

  function create(seats, shuffledDeck) {
    const players = seats.map((seat,i)=>({
      name:seat.name, bot:seat.bot, chips:seat.active?startingChips:0, hand:[], inHand:false,
      folded:false, paid:0, bet:0, won:0, seat:i
    }));
    let dealer=-1, smallBlind=-1, bigBlind=-1, turn=-1, street=0, handNumber=0, seq=0;
    let board=[], deck=[], target=0, lastRaise=10, actedAt=new Map(), pending=new Set(), phase='ready', result='', shown={};

    const after = (seat, predicate) => {
      for(let offset=1;offset<=players.length;offset++){
        const next=(seat+offset)%players.length;
        if(predicate(players[next]))return next;
      }
      return -1;
    };
    const pay = (p,amount) => {
      const paid=Math.min(amount,p.chips);
      p.chips-=paid;
      p.bet+=paid;
      p.paid+=paid;
    };
    const alive = p=>p.inHand&&!p.folded;
    const canAct = p=>alive(p)&&p.chips>0;
    const pot = ()=>players.reduce((sum,p)=>sum+p.paid,0);

    function start() {
      if (phase==='play'||phase==='end') return false;
      const funded=players.filter(p=>p.chips>0);
      if(funded.length<2)return false;
      handNumber++;
      dealer=after(dealer,p=>p.chips>0);
      smallBlind=funded.length===2?dealer:after(dealer,p=>p.chips>0);
      bigBlind=after(smallBlind,p=>p.chips>0);
      deck=shuffledDeck();board=[];street=0;lastRaise=10;actedAt.clear();
      phase='play';result='';shown={};
      for(const p of players){
        p.inHand=p.chips>0;p.hand=[];p.folded=false;p.paid=p.bet=p.won=0;
      }
      let seat=dealer;
      for(let dealt=0;dealt<2*funded.length;dealt++){
        seat=after(seat,p=>p.inHand);
        players[seat].hand.push(deck.pop());
      }
      pay(players[smallBlind],5);
      pay(players[bigBlind],10);
      target=10;
      pending=new Set(players.filter(canAct).map(p=>p.seat));
      advance(bigBlind);
      seq++;
      return true;
    }

    function revealStreet() {
      deck.pop();
      const count = street===0 ? 3 : 1;
      for(let i=0;i<count;i++)board.push(deck.pop());
      street++;
    }

    function finish() {
      const contenders=players.filter(alive), ranks=new Map();
      if(contenders.length>1) {
        for(const p of contenders) {
          ranks.set(p.seat,bestRank([...p.hand,...board]));
          shown[p.seat]=p.hand.slice();
        }
      }
      const levels=[...new Set(players.map(p=>p.paid).filter(Boolean))].sort((a,b)=>a-b);
      let previous=0;
      for(const level of levels){
        const contributors=players.filter(p=>p.paid>=level);
        const amount=(level-previous)*contributors.length;
        previous=level;
        const eligible=contributors.filter(alive);
        if(contributors.length===1 || !eligible.length){
          for(const p of contributors)p.chips+=amount/contributors.length;
          continue;
        }
        let winners=eligible;
        if(ranks.size){
          const strongest=eligible.reduce((a,p)=>compare(ranks.get(p.seat),ranks.get(a.seat))>0?p:a);
          winners=eligible.filter(p=>compare(ranks.get(p.seat),ranks.get(strongest.seat))===0);
        }
        winners.sort((a,b)=>(a.seat-dealer+players.length-1)%players.length-(b.seat-dealer+players.length-1)%players.length);
        winners.forEach((p,i)=>{
          const payout=Math.floor(amount/winners.length)+(i<amount%winners.length?1:0);
          p.won+=payout;p.chips+=payout;
        });
      }
      const winners=players.filter(p=>p.won>0).sort((a,b)=>b.won-a.won);
      result=winners.map(p=>p.name+' +'+p.won+(ranks.size?' ('+rankName(ranks.get(p.seat))+')':'')).join(' · ');
      turn=-1;pending.clear();
      const surviving=players.filter(p=>p.chips>0);
      phase=surviving.length<2?'end':'result';
      if(phase==='end')result=surviving[0].name+' gewinnt das Spiel · '+result;
    }

    function advance(from) {
      if(players.filter(alive).length<2){finish();return;}
      while(true) {
        const active=players.filter(canAct);
        const candidate=after(from,p=>canAct(p)&&pending.has(p.seat) &&
          (active.length>1 || p.bet<Math.min(target,Math.max(...players.filter(q=>q.seat!==p.seat).map(q=>q.bet)))));
        if(candidate>=0){turn=candidate;return;}
        if(street===3){finish();return;}
        revealStreet();
        for(const p of players)p.bet=0;
        target=0;lastRaise=10;actedAt.clear();from=dealer;
        pending=new Set(active.map(p=>p.seat));
      }
    }

    function actions(seat) {
      if(phase!=='play'||seat!==turn)return null;
      const p=players[seat];
      const active=players.filter(canAct);
      const price=active.length===1
        ? Math.min(target,Math.max(...players.filter(q=>q.seat!==seat).map(q=>q.bet)))
        : target;
      const due=Math.max(0,price-p.bet);
      const max=p.bet+p.chips, oldTarget=actedAt.get(seat);
      const mayRaise=active.length>1&&(oldTarget===undefined||target-oldTarget>=lastRaise);
      const minimum=target<10?10:target+lastRaise;
      return {call:Math.min(due,p.chips),raise:mayRaise&&max>=minimum?minimum:0,max,
        allIn:mayRaise||p.chips<=due};
    }

    function act(seat, action, amount) {
      const options=actions(seat);
      if(!options||!['fold','call','raise','all-in'].includes(action))return false;
      const p=players[seat];
      let betTo=0;
      if(action==='raise'){
        betTo=amount??options.raise;
        if(!options.raise||!Number.isSafeInteger(betTo)||betTo<options.raise||betTo>options.max)return false;
      }else if(action==='all-in'){
        if(!options.allIn)return false;
        betTo=options.max;
      }
      pending.delete(seat);
      if(action==='fold')p.folded=true;
      else if(action==='call')pay(p,options.call);
      else {
        pay(p,betTo-p.bet);
        if(betTo>target){
          const increase=betTo-target;
          if(betTo>=10&&increase>=lastRaise)lastRaise=increase;
          target=betTo;
          pending=new Set(players.filter(q=>q!==p&&canAct(q)).map(q=>q.seat));
        }
      }
      actedAt.set(seat,target);
      advance(seat);seq++;
      return true;
    }

    function estimateEquity(hand,opponents,random) {
      const visible=new Set([...hand,...board]);
      const unseen=Array.from({length:52},(_,i)=>i).filter(card=>!visible.has(card));
      let points=0;
      const samples=16, count=Math.min(opponents,3);
      for(let i=0;i<samples;i++){
        const pool=unseen.slice();
        const card=()=>{
          const index=Math.floor(random()*pool.length);
          const selected=pool[index];
          pool[index]=pool.at(-1);pool.pop();
          return selected;
        };
        const community=board.slice();
        while(community.length<5)community.push(card());
        const rank=bestRank([...hand,...community]);
        let tied=1, beaten=false;
        for(let n=0;n<count;n++){
          const difference=compare(rank,bestRank([card(),card(),...community]));
          if(difference<0){beaten=true;break;}
          if(difference===0)tied++;
        }
        if(!beaten)points+=1/tied;
      }
      return points/samples*Math.pow(.92,opponents-count);
    }

    function botAction(seat,random=Math.random) {
      const p=players[seat], options=actions(seat);
      const opponents=players.filter(q=>q!==p&&alive(q)).length;
      const equity=estimateEquity(p.hand,opponents,random);
      const odds=options.call/(pot()+options.call||1);
      const style=random();
      if(options.call&&equity<odds-(style<.15?.05:0))return {action:'fold'};
      const strong=equity>Math.max(.35,1/(opponents+1)+.13);
      const valueBet=strong&&style<.67;
      const bluff=!options.call&&opponents<=2&&style<.13;
      if(options.raise&&(valueBet||bluff)){
        const increment=Math.round((pot()+options.call)*(.35+style*.7));
        return {action:'raise',amount:Math.min(options.max,Math.max(options.raise,target+increment))};
      }
      if(options.allIn&&options.max>target&&!options.raise&&strong&&style<.5)return {action:'all-in'};
      return {action:'call'};
    }

    function snapshot() {
      const options=turn>=0?actions(turn):null;
      return {seq,rn:handNumber,ph:phase,turn,street,dealer,smallBlind,bigBlind,board:board.slice(),pot:pot(),result,shown,
        options,players:players.map(({name,bot,chips,inHand,folded,bet,won,seat})=>({name,bot,chips,inHand,folded,bet,won,seat}))};
    }

    return {start,act,snapshot,botAction,hand:seat=>players[seat].hand.slice(),substitute:seat=>{
      if(players[seat].bot)return false;
      players[seat].bot=true;seq++;return true;
    }};
  }

  const rules={create,bestRank,compare,handName,handNames,streetNames,maxPlayers,startingChips};
  if(typeof module!=='undefined'&&module.exports)module.exports=rules;
  else root.PokerRules=rules;
})(typeof window==='undefined'?null:window);
