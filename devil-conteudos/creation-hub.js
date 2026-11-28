(() => {
  const formats = ['reel', 'carousel', 'stories', 'static'];
  let mounted = false;

  const mount = () => {
    if (mounted) return true;
    const chat = document.querySelector('#devilChat.devil-chat') || document.querySelector('#devilChat');
    const conversation = chat?.querySelector('#storiesConversation');
    const formatSelect = document.querySelector('#contentFormat');
    if (!chat || !conversation || !formatSelect) return false;
    mounted = true;

    const hub = document.createElement('section');
    hub.id = 'storiesCreationHub';
    hub.className = 'stories-creation-hub';
    hub.setAttribute('aria-label', 'Escolha o formato e a estrutura do conteúdo');
    hub.innerHTML = `
      <div class="creation-hub-screen" data-creation-screen="formats">
        <div class="creation-hub-orbit" aria-hidden="true"></div>
        <p class="creation-hub-kicker">ESTÚDIO CRIATIVO · DIVA REBEL</p>
        <h1>E aí, Diva! Devil na área. Qual é a sua ideia para hoje?</h1>
        <p class="creation-hub-intro">Escolha um formato. Depois, a gente define o caminho juntas.</p>
        <div class="creation-format-grid">
          <button type="button" class="creation-format-card" data-create-format="reel"><span class="creation-format-icon" aria-hidden="true">▶</span><span class="creation-format-name">Reels</span><span class="creation-format-copy">Roteiros com diferentes estruturas e jeitos de contar.</span><span class="creation-format-link">Escolher estrutura <b aria-hidden="true">↗</b></span></button>
          <button type="button" class="creation-format-card" data-create-format="carousel"><span class="creation-format-icon" aria-hidden="true">▤</span><span class="creation-format-name">Carrossel</span><span class="creation-format-copy">Uma ideia conduzida por telas que fazem sentido juntas.</span><span class="creation-format-link">Escolher estrutura <b aria-hidden="true">↗</b></span></button>
          <button type="button" class="creation-format-card creation-format-featured" data-create-format="stories"><span class="creation-format-icon" aria-hidden="true">◉</span><span class="creation-format-name">Stories</span><span class="creation-format-copy">Uma conversa estratégica para construir sua sequência.</span><span class="creation-format-link">Escolher estrutura <b aria-hidden="true">↗</b></span></button>
          <button type="button" class="creation-format-card" data-create-format="static"><span class="creation-format-icon" aria-hidden="true">▣</span><span class="creation-format-name">Post estático</span><span class="creation-format-copy">Uma peça direta, com uma mensagem central.</span><span class="creation-format-link">Escolher estrutura <b aria-hidden="true">↗</b></span></button>
        </div>
        <div class="creation-hub-foot"><span class="creation-hub-live-dot"></span>Seu perfil e sua identidade já estão conectados</div>
      </div>
      <div class="creation-hub-screen" data-creation-screen="types" hidden>
        <button type="button" class="creation-back" data-creation-back="formats"><span aria-hidden="true">←</span> Formatos</button>
        <p class="creation-hub-kicker" id="creation-types-kicker"></p>
        <h1 id="creation-types-title"></h1>
        <p class="creation-hub-intro" id="creation-types-intro"></p>
        <div class="creation-stage-grid creation-type-grid" id="creation-types-grid"></div>
      </div>`;
    conversation.before(hub);

    let screen = 'formats';
    let choosingFormat = false;
    const view = document.querySelector('#view-studio');
    const chatRoot = conversation.closest('.devil-chat');

    const show = next => {
      screen = next;
      const hubMode = next === 'formats' || next === 'types';
      view?.classList.toggle('creation-hub-active', hubMode);
      chatRoot?.classList.toggle('stories-conversation-mode', hubMode || formatSelect.value === 'stories');
      hub.hidden = !hubMode;
      conversation.hidden = next !== 'chat';
      hub.querySelectorAll('[data-creation-screen]').forEach(el => { el.hidden = el.dataset.creationScreen !== next; });
      if (next === 'chat') {
        conversation.scrollIntoView({ block: 'start', behavior: 'smooth' });
        document.querySelector('#devilConversation')?.focus({ preventScroll: true });
      } else if (next === 'handoff') {
        document.querySelector('#devilConversation')?.focus({ preventScroll: true });
      }
    };

    const setFormat = value => {
      if (!formats.includes(value)) return;
      formatSelect.value = value;
      formatSelect.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const describeType = option => {
      const label = String(option.textContent || option.value).trim();
      const parts = label.split(' — ');
      return { value: option.value, title: parts[0], description: parts.slice(1).join(' — ') };
    };

    const renderTypes = format => {
      const feedFormat = document.querySelector('#feedFormat');
      const source = Array.from(feedFormat?.options || []).filter(option => option.value);
      const kicker = hub.querySelector('#creation-types-kicker');
      const title = hub.querySelector('#creation-types-title');
      const intro = hub.querySelector('#creation-types-intro');
      const grid = hub.querySelector('#creation-types-grid');
      const names = { stories: 'STORIES · SUA ESTRUTURA', carousel: 'CARROSSEL · SUA ESTRUTURA', reel: 'REELS · SEU FORMATO', static: 'POST ESTÁTICO · SUA ESTRUTURA' };
      const questions = { stories: 'Que tipo de Stories você quer criar?', carousel: 'Que tipo de carrossel combina com sua ideia?', reel: 'Que tipo de roteiro você quer gravar?', static: 'Que formato de post faz sentido hoje?' };
      kicker.textContent = names[format] || 'ESTRUTURA DO CONTEÚDO';
      title.textContent = questions[format] || 'Escolha uma estrutura';
      intro.textContent = format === 'stories'
        ? 'Escolha uma estrutura do seu método. Ela orienta o começo da conversa; a Devil ainda considera seu objetivo e seleciona a sequência adequada.'
        : 'Escolha um ponto de partida. Você pode explicar a ideia com suas palavras quando a conversa abrir.';
      grid.replaceChildren();
      source.forEach((option, index) => {
        const type = describeType(option);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'creation-stage-card';
        button.dataset.creationType = type.value;
        button.setAttribute('aria-label', `${type.title}${type.description ? ': ' + type.description : ''}`);
        const number = document.createElement('span');
        number.className = 'creation-stage-index';
        number.textContent = String(index + 1).padStart(2, '0');
        const heading = document.createElement('span');
        heading.className = 'creation-stage-title';
        heading.textContent = type.title;
        const detail = document.createElement('span');
        detail.className = 'creation-stage-copy';
        detail.textContent = type.description;
        const arrow = document.createElement('span');
        arrow.className = 'creation-stage-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '↗';
        button.append(number, heading, detail, arrow);
        grid.append(button);
      });
    };

    const openFormatChoice = format => {
      choosingFormat = true;
      setFormat(format);
      choosingFormat = false;
      hub.dataset.pendingFormat = format;
      renderTypes(format);
      show('types');
    };

    const setComposerStarter = (format, type) => {
      const composer = document.querySelector('#devilConversation');
      if (!composer) return;
      const label = { stories: 'Stories', carousel: 'carrossel', reel: 'Reel', static: 'post estático' }[format] || 'conteúdo';
      composer.value = `Quero criar ${label} com a estrutura “${type}”. `;
      composer.dispatchEvent(new Event('input', { bubbles: true }));
      composer.focus({ preventScroll: true });
      composer.setSelectionRange(composer.value.length, composer.value.length);
    };

    hub.addEventListener('click', event => {
      const formatCard = event.target.closest('[data-create-format]');
      if (formatCard) { openFormatChoice(formatCard.dataset.createFormat); return; }
      const back = event.target.closest('[data-creation-back]');
      if (back) { show(back.dataset.creationBack); return; }
      const typeCard = event.target.closest('[data-creation-type]');
      if (!typeCard) return;
      const format = hub.dataset.pendingFormat;
      const type = typeCard.dataset.creationType;
      const feedFormat = document.querySelector('#feedFormat');
      if (feedFormat) feedFormat.value = type;
      setComposerStarter(format, type);
      show(format === 'stories' ? 'chat' : 'handoff');
    });

    formatSelect.addEventListener('change', () => {
      if (choosingFormat) return;
      if (formatSelect.value !== 'stories') {
        if (screen !== 'types') show('handoff');
      } else if (screen !== 'chat' && screen !== 'types') {
        openFormatChoice('stories');
      }
    });

    window.addEventListener('devil:data-ready', () => setTimeout(() => {
      if (!view?.hidden && formatSelect.value === '' && screen !== 'chat') show('formats');
    }, 0));

    document.addEventListener('click', event => {
      if (event.target.closest('#storiesNewSession')) {
        setTimeout(() => { renderTypes('stories'); show('types'); }, 0);
        return;
      }
      if (!event.target.closest('button[data-view="studio"]')) return;
      formatSelect.value = '';
      choosingFormat = true;
      formatSelect.dispatchEvent(new Event('change', { bubbles: true }));
      choosingFormat = false;
      setTimeout(() => { if (!view?.hidden) show('formats'); }, 30);
    }, true);

    show('formats');
    return true;
  };

  let attempts = 0;
  const timer = setInterval(() => { if (mount() || ++attempts >= 200) clearInterval(timer); }, 50);
})();

