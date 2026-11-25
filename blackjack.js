(() => {
  const initialChips = 200;
  const stakes = [10,20,50];
  const isAce = card => card%13===12;
  const cardValue = card => isAce(card)?1:Math.min(10,card%13+2);

  function score(cards) {
    let total=0, aces=0;
    for(const card of cards){
      if(isAce(card)){total++;aces++;}
      else total+=cardValue(card);
    }
    const soft=aces>0&&total+10<=21;
    return {total:total+(soft?10:0),soft};
  }

  function create(count, shuffle) {
    const seats=Array.from({length:count},(_,seat)=>({name:seat?'Bot '+seat:'You',chips:initialChips,hands:[]}));
    let deck=[],dealer=[],turn=-1,handIndex=0,round=0,phase='ready',dealerVisible=false;
    const draw=()=>deck.pop();
    const newHand=(cards,stake,split=false)=>({cards,stake,split,done:false,outcome:'',returned:0});
    const natural=h=>!h.split&&h.cards.length===2&&score(h.cards).total===21;
    const current=()=>seats[turn]?.hands[handIndex];

    function open(stake) {
      if(!['ready','result'].includes(phase)||!Number.isSafeInteger(stake)||stake<1||stake>seats[0].chips)return false;
      round++;deck=shuffle();dealer=[];dealerVisible=false;
      for(const p of seats){
        const amount=p===seats[0]?stake:stakes.findLast(n=>n<=stake&&n<=p.chips);
        p.hands=amount?[newHand([],amount)]:[];
        if(amount)p.chips-=amount;
      }
      for(let i=0;i<2;i++){
        for(const p of seats)if(p.hands.length)p.hands[0].cards.push(draw());
        dealer.push(draw());
      }
      phase='players';turn=0;handIndex=0;
      if(score(dealer).total===21){finish();return true;}
      for(const p of seats)for(const h of p.hands)h.done=natural(h);
      advance();
      return true;
    }

    function advance() {
      while(turn<seats.length){
        const h=current();
        if(h&&!h.done)return;
        if(handIndex+1<seats[turn].hands.length)handIndex++;
        else {turn++;handIndex=0;}
      }
      if(seats.some(p=>p.hands.some(h=>!natural(h)&&score(h.cards).total<=21))){
        phase='dealer';dealerVisible=true;turn=-1;
      }else finish();
    }

    function actions() {
      if(phase!=='players')return {};
      const p=seats[turn],h=current();
      const first=h.cards.length===2;
      return {
        hit:true,stand:true,double:first&&p.chips>=h.stake,
        split:first&&p.hands.length===1&&cardValue(h.cards[0])===cardValue(h.cards[1])&&p.chips>=h.stake
      };
    }

    function act(action) {
      const allowed=actions();
      if(!Object.hasOwn(allowed,action)||!allowed[action])return false;
      const p=seats[turn],h=current();
      if(action==='split'){
        const second=h.cards.pop(), first=h.cards[0];
        p.chips-=h.stake;
        h.split=true;h.cards.push(draw());
        const split=newHand([second,draw()],h.stake,true);
        p.hands.push(split);
        for(const hand of p.hands)hand.done=isAce(first)||score(hand.cards).total===21;
      }else if(action==='stand')h.done=true;
      else {
        if(action==='double'){p.chips-=h.stake;h.stake*=2;}
        h.cards.push(draw());
        h.done=action==='double'||score(h.cards).total>=21;
      }
      advance();
      return true;
    }

    function dealerStep() {
      if(phase!=='dealer')return false;
      if(score(dealer).total<17)dealer.push(draw());
      else finish();
      return true;
    }

    function finish() {
      const dealerTotal=score(dealer).total, dealerBlackjack=dealerTotal===21&&dealer.length===2;
      phase='result';dealerVisible=true;turn=-1;
      for(const p of seats)for(const h of p.hands){
        const {total}=score(h.cards);
        if(total>21)h.outcome='Bust';
        else if(dealerBlackjack){
          if(natural(h)){h.outcome='Push';h.returned=h.stake;}
          else h.outcome='Dealer wins';
        }else if(natural(h)){h.outcome='Blackjack';h.returned=Math.floor(h.stake*2.5);}
        else if(dealerTotal>21||total>dealerTotal){h.outcome='Won';h.returned=h.stake*2;}
        else if(total===dealerTotal){h.outcome='Push';h.returned=h.stake;}
        else h.outcome='Dealer wins';
        p.chips+=h.returned;
      }
    }

    function botAction() {
      const h=current(), value=score(h.cards), allowed=actions();
      const up=isAce(dealer[0])?11:cardValue(dealer[0]);
      if(allowed.split && (isAce(h.cards[0])||cardValue(h.cards[0])===8))return 'split';
      if(allowed.double && value.total===11 && up<11)return 'double';
      if(value.total>=17 || !value.soft && value.total>=13 && up>=2 && up<=6)return 'stand';
      return 'hit';
    }

    function snapshot() {
      return {seats,round,turn,handIndex,phase,dealer:dealerVisible?dealer:[dealer[0],-1],actions:actions()};
    }
    return {open,act,dealerStep,botAction,snapshot};
  }

  window.BlackjackRules={score,create,stakes,initialChips};
})();
