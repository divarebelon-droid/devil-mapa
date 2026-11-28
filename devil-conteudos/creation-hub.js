(() => {
  const formats = ['reel', 'carousel', 'stories', 'static'];
  const stageNames = ['Descoberta', 'Consideração', 'Decisão', 'Recuperação'];
  let mounted = false;
  const mount = () => {
    if (mounted) return true;
    const chat = document.querySelector('#devilChat.devil-chat') || document.querySelector('#devilChat');
    const conversation = chat?.querySelector('#storiesConversation');
    const formatSelect = document.querySelector('#contentFormat');
    const goalSelect = document.querySelector('#contentGoal');
    if (!chat || !conversation || !formatSelect) return false;
    mounted = true;
    const hub = document.createElement('section');
    hub.id = 'storiesCreationHub';
    hub.className = 'stories-creation-hub';
    hub.setAttribute('aria-label', 'Escolha o formato de conteúdo');
    hub.innerHTML = `
      <div class="creation-hub-screen" data-creation-screen="formats">
        <div class="creation-hub-orbit" aria-hidden="true"></div>
        <p class="creation-hub-kicker">ESTÚDIO CRIATIVO · DIVA REBEL</p>
        <h1>Diva, o que vamos criar hoje?</h1>
        <p class="creation-hub-intro">Escolha o formato. A Devil acompanha você da primeira ideia até a versão pronta.</p>
        <div class="creation-format-grid">
          <button type="button" class="creation-format-card" data-create-format="reel"><span class="creation-format-icon" aria-hidden="true">▶</span><span class="creation-format-name">Reels</span><span class="creation-format-copy">Um roteiro para prender atenção e conduzir a mensagem.</span><span class="creation-format-link">Começar <b aria-hidden="true">↗</b></span></button>
          <button type="button" class="creation-format-card" data-create-format="carousel"><span class="creation-format-icon" aria-hidden="true">▤</span><span class="creation-format-name">Carrossel</span><span class="creation-format-copy">Uma ideia organizada em telas que fazem sentido juntas.</span><span class="creation-format-link">Escolher intenção <b aria-hidden="true">↗</b></span></button>
          <button type="button" class="creation-format-card creation-format-featured" data-create-format="stories"><span class="creation-format-icon" aria-hidden="true">◉</span><span class="creation-format-name">Stories</span><span class="creation-format-copy">Uma conversa estratégica para construir sua sequência.</span><span class="creation-format-link">Escolher etapa <b aria-hidden="true">↗</b></span></button>
          <button type="button" class="creation-format-card" data-create-format="static"><span class="creation-format-icon" aria-hidden="true">▣</span><span class="creation-format-name">Post estático</span><span class="creation-format-copy">Uma peça direta, com uma mensagem central.</span><span class="creation-format-link">Escolher intenção <b aria-hidden="true">↗</b></span></button>
        </div>
        <div class="creation-hub-foot"><span class="creation-hub-live-dot"></span>Seu perfil e sua identidade já estão conectados</div>
      </div>
      <div class="creation-hub-screen" data-creation-screen="stages" hidden>
        <button type="button" class="creation-back" data-creation-back="formats"><span aria-hidden="true">←</span> Formatos</button>
        <p class="creation-hub-kicker">STORIES · SUA ESTRATÉGIA</p>
        <h1>Em que etapa essa conversa acontece?</h1>
        <p class="creation-hub-intro">Escolha um ponto de partida. Se ainda não tiver certeza, a Devil pode ajudar a definir no chat.</p>
        <div class="creation-stage-grid">
          <button type="button" class="creation-stage-card" data-story-stage="Descoberta"><span class="creation-stage-index">01</span><span class="creation-stage-title">Descoberta</span><span class="creation-stage-copy">Atrair atenção e criar identificação com uma situação real.</span><span class="creation-stage-arrow" aria-hidden="true">↗</span></button>
          <button type="button" class="creation-stage-card" data-story-stage="Consideração"><span class="creation-stage-index">02</span><span class="creation-stage-title">Consideração</span><span class="creation-stage-copy">Aprofundar a conversa e apresentar outro jeito de olhar.</span><span class="creation-stage-arrow" aria-hidden="true">↗</span></button>
          <button type="button" class="creation-stage-card" data-story-stage="Decisão"><span class="creation-stage-index">03</span><span class="creation-stage-title">Decisão</span><span class="creation-stage-copy">Aproximar a audiência de uma escolha ou próximo passo.</span><span class="creation-stage-arrow" aria-hidden="true">↗</span></button>
          <button type="button" class="creation-stage-card" data-story-stage="Recuperação"><span class="creation-stage-index">04</span><span class="creation-stage-title">Recuperação</span><span class="creation-stage-copy">Retomar uma conversa e reabrir uma possibilidade.</span><span class="creation-stage-arrow" aria-hidden="true">↗</span></button>
        </div>
        <button type="button" class="creation-stage-unsure" data-story-stage="">Ainda não sei — quero pensar isso com a Devil</button>
      </div>`;
    hub.insertAdjacentHTML('beforeend', `
      <div class="creation-hub-screen" data-creation-screen="options" hidden>
        <button type="button" class="creation-back" data-creation-back="formats"><span aria-hidden="true">←</span> Formatos</button>
        <p class="creation-hub-kicker" id="creation-options-kicker"></p>
        <h1 id="creation-options-title"></h1>
        <p class="creation-hub-intro" id="creation-options-intro"></p>
        <div class="creation-stage-grid" id="creation-options-grid"></div>
      </div>`);
    conversation.before(hub);

    let screen = 'formats';
    const show = next => {
      screen = next;
      const view = document.querySelector('#view-studio');
      const chatRoot = conversation.closest('.devil-chat');
      const hubMode = next !== 'chat' && next !== 'form';
      view?.classList.toggle('creation-hub-active', hubMode);
      chatRoot?.classList.toggle('stories-conversation-mode', hubMode || formatSelect.value === 'stories');
      hub.hidden = next === 'chat' || next === 'form';
      conversation.hidden = next !== 'chat';
      hub.querySelectorAll('[data-creation-screen]').forEach(el => { el.hidden = el.dataset.creationScreen !== next; });
      if (next === 'chat') {
        conversation.scrollIntoView({ block: 'start', behavior: 'smooth' });
        document.querySelector('#devilConversation')?.focus({ preventScroll: true });
      }
    };
    const setFormat = value => {
      if (!formats.includes(value)) return;
      formatSelect.value = value;
      formatSelect.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const optionCopy = {
      growth: ['Atrair público e crescer', 'Chamar atenção de novas pessoas com uma ideia que gere identificação.'],
      connection: ['Criar conexão', 'Aproximar a conversa e fortalecer o relacionamento com quem acompanha.'],
      authority: ['Construir autoridade', 'Mostrar seu raciocínio, experiência e jeito próprio de trabalhar.'],
      engagement: ['Gerar conversa', 'Convidar o público a participar e responder.'],
      sales: ['Vender ou captar contatos', 'Conduzir a pessoa a uma oferta ou próximo passo claro.'],
      emotion: ['Despertar uma emoção', 'Escolher a sensação que deve guiar a mensagem.']
    };
    const openFormatChoice = format => {
      hub.dataset.pendingFormat = format;
      const isReel = format === 'reel';
      const title = hub.querySelector('#creation-options-title');
      const intro = hub.querySelector('#creation-options-intro');
      hub.querySelector('#creation-options-kicker').textContent = isReel ? 'REELS · ESTRUTURA POR ETAPA' : format === 'carousel' ? 'CARROSSEL · INTENÇÃO DA NARRATIVA' : 'POST ESTÁTICO · INTENÇÃO DA PEÇA';
      title.textContent = isReel ? 'Em que etapa esse Reel entra?' : format === 'carousel' ? 'O que esse carrossel precisa fazer?' : 'O que essa peça precisa comunicar?';
      intro.textContent = isReel ? 'O roteiro muda de condução conforme a etapa. Escolha um ponto de partida para o método.' : format === 'carousel' ? 'A estrutura de 10 telas continua a mesma; a intenção ajuda a orientar o conteúdo e o CTA.' : 'Escolha a intenção principal. Você poderá completar o contexto no briefing.';
      const grid = hub.querySelector('#creation-options-grid');
      if (isReel) {
        grid.innerHTML = stageNames.map((name, index) => `<button type="button" class="creation-stage-card" data-option-stage="${name}"><span class="creation-stage-index">${String(index+1).padStart(2,'0')}</span><span class="creation-stage-title">${name}</span><span class="creation-stage-copy">${['Atrair atenção e criar identificação.','Aprofundar a conversa e apresentar outro olhar.','Aproximar o público de uma decisão.','Retomar uma conversa e reabrir uma possibilidade.'][index]}</span><span class="creation-stage-arrow" aria-hidden="true">↗</span></button>`).join('');
      } else {
        const choices = Array.from(goalSelect?.options || []).filter(option => option.value).map(option => ({value:option.value,label:optionCopy[option.value]?.[0] || option.textContent.trim(),copy:optionCopy[option.value]?.[1] || ''}));
        grid.innerHTML = choices.map((choice,index) => `<button type="button" class="creation-stage-card" data-option-goal="${choice.value}"><span class="creation-stage-index">${String(index+1).padStart(2,'0')}</span><span class="creation-stage-title">${choice.label}</span><span class="creation-stage-copy">${choice.copy}</span><span class="creation-stage-arrow" aria-hidden="true">↗</span></button>`).join('');
      }
      show('options');
    };
    hub.addEventListener('click', event => {
      const formatCard = event.target.closest('[data-create-format]');
      if (formatCard) {
        const chosen = formatCard.dataset.createFormat;
        if (chosen === 'stories') { setFormat(chosen); show('stages'); }
        else openFormatChoice(chosen);
        return;
      }
      const back = event.target.closest('[data-creation-back]');
      if (back) { show(back.dataset.creationBack); return; }
      const stageCard = event.target.closest('[data-story-stage]');
      if (stageCard) {
        const value = stageCard.dataset.storyStage || '';
        const select = document.querySelector('#stage');
        if (select) {
          select.value = stageNames.includes(value) ? value : 'Descoberta';
          select.dataset.storyStageChosen = value ? 'true' : 'false';
        }
        show('chat');
        return;
      }
      const chosenStage = event.target.closest('[data-option-stage]');
      if (chosenStage) {
        const select = document.querySelector('#stage');
        if (select) select.value = chosenStage.dataset.optionStage;
        setFormat('reel');
        show('form');
        return;
      }
      const chosenGoal = event.target.closest('[data-option-goal]');
      if (chosenGoal) {
        if (goalSelect) { goalSelect.value = chosenGoal.dataset.optionGoal; goalSelect.dispatchEvent(new Event('change', {bubbles:true})); }
        setFormat(hub.dataset.pendingFormat);
        show('form');
        return;
      }
    });

    formatSelect.addEventListener('change', () => {
      if (formatSelect.value !== 'stories') {
        hub.hidden = true;
        document.querySelector('#view-studio')?.classList.remove('creation-hub-active');
      }
      else if (screen !== 'chat') show(screen === 'stages' ? 'stages' : 'formats');
    });
    window.addEventListener('devil:data-ready', () => setTimeout(() => {
      if (!document.querySelector('#view-studio')?.hidden && formatSelect.value === '' && screen !== 'chat') show(screen);
    }, 0));
    document.addEventListener('click', event => {
      if (event.target.closest('#storiesNewSession')) { setTimeout(() => show('stages'), 0); return; }
      if (!event.target.closest('button[data-view="studio"]')) return;
      formatSelect.value = '';
      formatSelect.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(() => {
        if (!document.querySelector('#view-studio')?.hidden) {
          hub.hidden = false;
          show('formats');
        }
      }, 30);
    }, true);
    show('formats');
    return true;
  };
  let attempts = 0;
  const timer = setInterval(() => {
    if (mount() || ++attempts >= 200) clearInterval(timer);
  }, 50);
})();

