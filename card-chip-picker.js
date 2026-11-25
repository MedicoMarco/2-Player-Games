(() => {
  const values=[1,5,10,25,50,100];
  window.createCardChipPicker=({language='en',confirm})=>{
    const de=language==='de';
    const element=document.createElement('div');
    element.className='chip-picker';
    element.hidden=true;
    element.innerHTML=`
      <div class="chip-values" role="group" aria-label="${de?'Spielchips':'Play chips'}">
        ${values.map(value=>`<button type="button" class="play-chip chip-${value}" data-chip="${value}" aria-label="${de?'Chip hinzufügen':'Add chip'}: ${value}">${value}</button>`).join('')}
      </div>
      <div class="chip-summary">
        <span class="chip-readout"><output class="chip-total" aria-live="polite"></output><small class="chip-minimum" hidden></small></span>
        <button type="button" class="btn" data-chip="undo">${de?'Zurück':'Undo'}</button>
        <button type="button" class="btn" data-chip="all">All-in</button>
        <button type="button" class="btn chip-confirm" data-chip="confirm"></button>
      </div>`;
    const buttons=[...element.querySelectorAll('button')];
    const total=element.querySelector('output'),minimum=element.querySelector('.chip-minimum');
    let history=[],amount=0,options=null;
    const canSubmit=()=>options&&!options.disabled&&amount>0&&amount<=options.max&&
      (amount>=options.min||amount===options.max&&options.allIn);
    function paint(){
      for(const button of buttons){
        const key=button.dataset.chip;
        button.disabled=!options||options.disabled||(key==='undo'?!history.length:key==='all'?(!options.allIn||amount===options.max):key==='confirm'?!canSubmit():amount+Number(key)>options.max||!Number.isFinite(options.min));
        if(key==='confirm')button.textContent=options?.confirmLabel||(de?'Bestätigen':'Confirm');
      }
      minimum.hidden=!options?.showMinimum;
      if(!minimum.hidden)minimum.textContent=Number.isFinite(options.min)?'Min. '+options.min:'Nur All-in';
      total.textContent=options?`${options.label|| (de?'Gewählt':'Selected')} ${amount} / ${options.max}`:'';
    }
    element.addEventListener('click',event=>{
      const button=event.target.closest('button[data-chip]');
      if(!button||button.disabled)return;
      const key=button.dataset.chip;
      if(key==='confirm'){if(canSubmit())confirm(amount);return;}
      if(key==='undo')amount=history.pop();
      else{history.push(amount);amount=key==='all'?options.max:amount+Number(key);}
      paint();
    });
    return {
      element,
      update(next){
        if(next?.key!==options?.key){history=[];amount=0;}
        options=next;
        element.hidden=!next;
        paint();
      }
    };
  };
})();
