(() => {
  const tg = window.Telegram?.WebApp;
  try { tg?.ready(); tg?.expand(); tg?.setHeaderColor?.('#09090d'); tg?.setBackgroundColor?.('#09090d'); } catch (_) {}

  const $ = (id) => document.getElementById(id);
  const store = {
    get(key, fallback=[]) { try { return JSON.parse(localStorage.getItem('musiclab_'+key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { localStorage.setItem('musiclab_'+key, JSON.stringify(value)); }
  };
  let activeTool = 'alias';
  let ideaCount = 0;

  const toolConfig = {
    alias: {kicker:'ARTIST IDENTITY / 01',title:'Найди своё имя',desc:'Задай вайб и получи идеи для артистического псевдонима.'},
    track: {kicker:'TRACK CONCEPT / 02',title:'Дай треку имя',desc:'Подбери название под жанр и настроение композиции.'},
    cover: {kicker:'VISUAL DIRECTION / 03',title:'Визуализируй звук',desc:'Создай концепцию обложки и промпт для генератора изображений.'}
  };
  const moodWords = {
    dark:['Noir','Void','Afterdark','Cold','Grave','Night','Static','Blackout','Loner','Blue','Ghost','Lowlight','Numb','Ashes'],
    dreamy:['Cloud','Sleepy','Velvet','Haze','Moon','Lucid','Drift','Slow','Dreamstate','Halo','Soft','Daze','Silver','Float'],
    energetic:['Rush','Voltage','Riot','Turbo','Flash','Wild','Fever','Chrome','Blaze','Overdrive','Pulse','Crash'],
    romantic:['Lover','Heartline','Rose','Honey','Kiss','Satin','Dear','Amour','Blush','Always','Crush'],
    minimal:['One','Mono','Plain','Zero','Still','Form','Unit','Line','Grey','N°','Archive','Room']
  };
  const genreNames = {'Cloud rap':'Cloud','Trap':'Trap','Hyperpop':'Pop','Indie':'Indie','R&B':'R&B','Phonk':'Phonk','Electronic':'Signal','Alternative':'Alt'};
  const trackTitles = {
    dark:['после трёх','не звони обратно','пустой экран','голоса в лифте','мёртвый Wi-Fi','всё ещё онлайн','чёрный снег','без адреса','ничего нового','последний автобус','не сохранено','режим полёта'],
    dreamy:['сон на повторе','медленный свет','комнаты из облаков','до рассвета','где-то между','лунный шум','пока ты спишь','плыву наверх','мягкий фокус','не просыпайся'],
    energetic:['без тормозов','на полной','красная зона','снова быстрее','искры','перегруз','вне сети','давление','вспышка','не остановить'],
    romantic:['твой силуэт','голосовое в 2:17','ближе к тебе','не отпускай','наша сторона','пахнешь дождём','вместо слов','сохрани меня'],
    minimal:['трек 04','комната','пауза','контур','нулевой','тише','поверхность','одна строка','точка','без названия']
  };
  const coverIdeas = {
    dark:[['Ночной архив','Размытый снимок пустой улицы через мокрое стекло, холодный синий свет, зерно плёнки, много отрицательного пространства.'],['Ошибка памяти','Одинокая фигура в чёрном пространстве, цифровые артефакты, почти монохромная палитра, ощущение потерянного файла.'],['Последний звонок','Старый телефон на тёмной поверхности, резкая вспышка, глубокие тени, кинематографичная композиция.']],
    dreamy:[['Мягкий фокус','Силуэт в тумане, пастельный лиловый и серебристый, засветка объектива, аналоговая фотография.'],['Сон в 4:11','Ночное окно, свет луны на простынях, мягкое размытие, плёночное зерно, спокойная композиция.']],
    energetic:[['Перегруз','Смазанное движение, кислотные акценты, жёсткая вспышка, цифровой шум, динамичная композиция.'],['Красная зона','Красный свет, металлические поверхности, экстремальный крупный план, резкий контраст.']],
    romantic:[['Невы отправленные','Размытые огни города, две тени на расстоянии, тёплая вспышка, эффект старой камеры.'],['После тебя','Один цветок на полу пустой комнаты, нежно-розовый и графитовый, мягкие тени.']],
    minimal:[['Тихая форма','Один геометрический объект на почти пустом фоне, приглушённые оттенки, тонкая текстура бумаги.'],['Нулевая точка','Маленькая точка света в большом чёрном пространстве, минимализм, строгая сетка.']]
  };

  function pick(arr, n) { const out=[]; const copy=[...arr]; while(copy.length && out.length<n) out.push(copy.splice(Math.floor(Math.random()*copy.length),1)[0]); return out; }
  function cleanSeed(s) { return (s||'').trim().replace(/[^\p{L}\p{N} _.-]/gu,'').slice(0,24); }
  function generate() {
    const genre=$('genre').value, mood=$('mood').value, seed=cleanSeed($('seed').value);
    let items=[];
    if(activeTool==='alias') {
      const words=moodWords[mood]||moodWords.dark;
      const starters=pick(words,6);
      items=starters.map((w,i)=>{
        const suffix=['',' Kid','.wav','WR','Archive',' 111'][i%6];
        let name=seed ? (i%2===0 ? seed+' '+w : w+' '+seed) : (i%3===0 ? w+suffix : w+' '+(genreNames[genre]||genre));
        return name.replace(/\s+/g,' ').trim();
      });
    } else if(activeTool==='track') {
      const titles=pick(trackTitles[mood]||trackTitles.dark,6);
      items=titles.map((t,i)=>seed && i%2===0 ? `${t} (${seed})` : t);
    } else {
      items=pick(coverIdeas[mood]||coverIdeas.dark,3).map(([title,desc])=>`${title} | ${desc} Жанр: ${genre}. Без текста и логотипов, квадратная обложка 1:1.`);
    }
    ideaCount += items.length; $('ideaCount').textContent=ideaCount;
    const results=$('results'); results.innerHTML=''; results.classList.remove('hidden');
    items.forEach((item,i)=>{
      const card=document.createElement('div'); card.className='result-card';
      const num=document.createElement('span'); num.className='result-num'; num.textContent=String(i+1).padStart(2,'0');
      const txt=document.createElement('div'); txt.className='result-text'; txt.textContent=item;
      const copy=document.createElement('button'); copy.textContent='Копировать';
      copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(item);toast('Скопировано в буфер обмена');}catch{toast(item);}});
      card.append(num,txt,copy); results.append(card);
    });
    results.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function toast(msg) { const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2200); }
  function showView(id) {
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('selected',b.dataset.view===id));
    if(id==='demosView') renderDemos(); if(id==='releasesView') renderReleases(); if(id==='profileView') loadProfile();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function setTool(tool) {
    activeTool=tool; const c=toolConfig[tool];
    $('toolKicker').textContent=c.kicker; $('toolTitle').textContent=c.title; $('toolDescription').textContent=c.desc;
    document.querySelectorAll('.tool-tab').forEach(b=>b.classList.toggle('selected',b.dataset.tool===tool));
    $('results').classList.add('hidden'); $('results').innerHTML='';
    $('generateBtn').innerHTML=({alias:'Сгенерировать псевдонимы <span>✳</span>',track:'Сгенерировать названия <span>♫</span>',cover:'Создать концепции <span>▧</span>'})[tool];
  }
  document.addEventListener('click',e=>{
    const viewBtn=e.target.closest('[data-view]'); if(viewBtn){showView(viewBtn.dataset.view);return;}
    const toolBtn=e.target.closest('[data-tool]'); if(toolBtn){setTool(toolBtn.dataset.tool);if(!toolBtn.classList.contains('tool-tab'))showView('toolsView');return;}
  });
  document.querySelectorAll('.tool-tab').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
  $('generateBtn').addEventListener('click',generate);

  function escapeText(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function renderDemos(){
    const list=$('demoList'), demos=store.get('demos');
    $('demoCount').textContent=demos.length; list.innerHTML='';
    if(!demos.length){list.innerHTML='<div class="empty-state">Каталог пока пуст.<br>Добавь первое демо выше, чтобы начать архивировать идеи.</div>';return;}
    demos.forEach(d=>{const el=document.createElement('div');el.className='item-card';el.innerHTML=`<div class="item-main"><strong>${escapeText(d.title)}</strong><div class="item-meta">${escapeText(d.genre)} · ${escapeText(d.date)}${d.notes?'<br>'+escapeText(d.notes):''}</div></div><span class="status-pill">${escapeText(d.status)}</span><button class="delete-btn" aria-label="Удалить">×</button>`;el.querySelector('.delete-btn').addEventListener('click',()=>{store.set('demos',store.get('demos').filter(x=>x.id!==d.id));renderDemos();updateStats();toast('Демо удалено');});list.append(el);});
  }
  $('demoForm').addEventListener('submit',e=>{
    e.preventDefault();const demos=store.get('demos');
    demos.unshift({id:crypto.randomUUID?.()||String(Date.now()),title:$('demoTitleInput').value.trim(),genre:$('demoGenre').value,status:$('demoStatus').value,notes:$('demoNotes').value.trim(),date:new Date().toLocaleDateString('ru-RU')});
    store.set('demos',demos);$('demoForm').reset();renderDemos();updateStats();toast('Демо добавлено в каталог');
  });
  $('exportDemos').addEventListener('click',()=>{
    const data=JSON.stringify(store.get('demos'),null,2);const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='music-lab-demos.json';a.click();URL.revokeObjectURL(url);toast('Экспорт каталога готов');
  });
  function renderReleases(){
    const list=$('releaseList'), releases=store.get('releases');$('releaseCount').textContent=releases.length;list.innerHTML='';
    if(!releases.length){list.innerHTML='<div class="empty-state">Пока нет запланированных релизов.<br>Добавь релиз и зафиксируй следующий шаг.</div>';return;}
    releases.sort((a,b)=>a.date.localeCompare(b.date)).forEach(r=>{const el=document.createElement('div');el.className='item-card';el.innerHTML=`<div class="item-main"><strong>${escapeText(r.title)}</strong><div class="item-meta">${escapeText(r.type)} · ${escapeText(new Date(r.date+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}))}</div></div><span class="status-pill">${escapeText(r.status)}</span><button class="delete-btn" aria-label="Удалить">×</button>`;el.querySelector('.delete-btn').addEventListener('click',()=>{store.set('releases',store.get('releases').filter(x=>x.id!==r.id));renderReleases();updateStats();toast('Релиз удалён');});list.append(el);});
  }
  $('releaseForm').addEventListener('submit',e=>{
    e.preventDefault();const releases=store.get('releases');releases.push({id:crypto.randomUUID?.()||String(Date.now()),title:$('releaseTitle').value.trim(),date:$('releaseDate').value,type:$('releaseType').value,status:$('releaseStatus').value});
    store.set('releases',releases);$('releaseForm').reset();renderReleases();updateStats();toast('Релиз запланирован');
  });
  function loadProfile(){const p=store.get('profile',{});$('artistName').value=p.name||'';$('artistGenres').value=p.genres||'';$('artistBio').value=p.bio||'';$('artistLink').value=p.link||'';}
  $('profileForm').addEventListener('submit',e=>{e.preventDefault();store.set('profile',{name:$('artistName').value.trim(),genres:$('artistGenres').value.trim(),bio:$('artistBio').value.trim(),link:$('artistLink').value.trim()});$('profileAvatar').textContent=$('artistName').value.trim().slice(0,1).toUpperCase()||'♪';toast('Профиль сохранён');});
  function updateStats(){$('demoCount').textContent=store.get('demos').length;$('releaseCount').textContent=store.get('releases').length;}
  $('profileAvatar').addEventListener('click',()=>showView('profileView'));
  $('releaseDate').min=new Date().toISOString().slice(0,10);
  updateStats();renderDemos();renderReleases();
  const userName=tg?.initDataUnsafe?.user?.first_name;
  if(userName){const p=$('homeView').querySelector('.hero p');p.textContent=`Привет, ${userName}. От первой идеи до даты релиза. Собери свой музыкальный мир в одном месте.`;}
})();
