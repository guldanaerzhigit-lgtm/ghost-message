import { useCallback, useEffect, useState } from 'react';
import {
  Ghost, House, Mail, Plus, Bell, UserRound, Send, Clock3, Globe2,
  Shuffle, Heart, MessageCircle, Sparkles, ArrowUpRight, ShieldCheck,
  Moon, ChevronRight, Check, X, Compass, Flame, LockKeyhole, RefreshCw, LogOut
} from 'lucide-react';

const TOKEN_KEY = 'ghost_message_token';
const API = '/api';
const relativeTime = (value) => {
  if (!value) return 'сейчас';
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'только что';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' мин назад';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' ч назад';
  return date.toLocaleDateString('ru-RU');
};
const mapMessage = (m, type = 'inbox') => ({
  ...m, from: type === 'sent' ? 'Моё послание' : (m.from || 'Незнакомец'),
  text: m.text, time: relativeTime(m.time || m.created_at),
  unread: false, type, likes: Number(m.likes || 0), replies: Number(m.replies || 0)
});

export default function App() {
  const [tab, setTab] = useState('home');
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sent, setSent] = useState([]);
  const [feed, setFeed] = useState([]);
  const [mode, setMode] = useState('random');
  const [delay, setDelay] = useState('now');
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState('');
  const [liked, setLiked] = useState([]);
  const [activeMessage, setActiveMessage] = useState(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const notify = (text) => { setToast(text); window.setTimeout(() => setToast(''), 2800); };
  const go = (next) => { setTab(next); setActiveMessage(null); setError(''); };
  const request = useCallback(async (path, options = {}) => {
    const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
    if (token) headers.authorization = 'Bearer ' + token;
    const response = await fetch(API + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Ошибка сервера (' + response.status + ')');
    return data;
  }, [token]);

  const createSession = useCallback(async () => {
    const data = await fetch(API + '/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(async r => {
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.error || 'Не удалось создать анонимную сессию');
      return json;
    });
    if (!data.token) throw new Error('Сервер не вернул токен сессии');
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.token;
  }, []);

  const loadAll = useCallback(async (activeToken = token) => {
    if (!activeToken) return;
    setLoading(true); setError('');
    try {
      const headers = { authorization: 'Bearer ' + activeToken };
      const get = async (path) => {
        const r = await fetch(API + path, { headers, cache: 'no-store' });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Ошибка загрузки');
        return d;
      };
      const [me, inbox, outgoing, publicFeed] = await Promise.all([
        get('/me'), get('/messages'), get('/messages?kind=sent'), get('/feed')
      ]);
      setUser(me.user);
      setMessages((inbox.messages || []).map(m => mapMessage(m, 'inbox')));
      setSent((outgoing.messages || []).map(m => mapMessage(m, 'sent')));
      setFeed((publicFeed.messages || []).map(m => mapMessage(m, 'public')));
    } catch (e) {
      if (/Сессия не найдена/i.test(e.message)) {
        localStorage.removeItem(TOKEN_KEY); setToken(''); setUser(null);
        setError('Анонимная сессия истекла. Создай новую.');
      } else setError(e.message);
      throw e;
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let activeToken = localStorage.getItem(TOKEN_KEY) || token;
        if (!activeToken) activeToken = await createSession();
        if (!cancelled) await loadAll(activeToken);
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  // Initial session bootstrap only; explicit refresh uses loadAll.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    try { await loadAll(token); notify('Данные обновлены'); } catch (e) { setError(e.message); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean) { notify('Сначала напиши послание 👻'); return; }
    setBusy(true); setError('');
    try {
      await request('/messages', { method: 'POST', body: JSON.stringify({
        text: clean, mode, delay: mode === 'random' ? delay : 'now'
      }) });
      setDraft('');
      await loadAll(token);
      setTab(mode === 'public' ? 'feed' : 'messages');
      notify(mode === 'public' ? 'Послание опубликовано в общей ленте' : 'Послание сохранено на сервере');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !activeMessage) return;
    setBusy(true); setError('');
    try {
      await request('/messages', { method: 'POST', body: JSON.stringify({
        text: reply.trim(), mode: 'random', parentId: String(activeMessage.id)
      }) });
      setReply(''); setActiveMessage(null);
      await loadAll(token);
      notify('Ответ сохранён. Цепочка продолжается.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const toggleLike = async (item) => {
    const id = String(item.id);
    if (liked.includes(id)) { notify('Реакция уже отмечена в этом сеансе'); return; }
    try {
      await request('/messages/' + encodeURIComponent(id) + '/reactions', {
        method: 'POST', body: JSON.stringify({ reaction: 'heart' })
      });
      setLiked(prev => [...prev, id]);
      await loadAll(token);
      notify('❤️ Реакция сохранена');
    } catch (e) { notify(e.message); }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY); setToken(''); setUser(null);
    setMessages([]); setSent([]); setFeed([]); setLiked([]);
    notify('Сессия удалена с этого устройства');
  };

  const nav = [
    { id: 'home', label: 'Главная', icon: House },
    { id: 'messages', label: 'Послания', icon: Mail, badge: messages.length },
    { id: 'send', label: 'Отправить', icon: Plus },
    { id: 'notifications', label: 'События', icon: Bell },
    { id: 'profile', label: 'Профиль', icon: UserRound }
  ];

  const feedCard = (item, i) => <article className="feed-card" key={item.id}>
    <div className={'feed-avatar avatar-' + (i % 3)}><Ghost size={20}/></div>
    <div className="feed-body"><div className="feed-meta"><b>{item.from || 'без имени'}</b><span>{item.time}</span></div>
      <p>{item.text}</p><div className="feed-actions">
        <button className={liked.includes(String(item.id)) ? 'liked' : ''} onClick={() => toggleLike(item)}><Heart size={15} fill={liked.includes(String(item.id)) ? 'currentColor' : 'none'}/>{item.likes + (liked.includes(String(item.id)) ? 1 : 0)}</button>
        <button onClick={() => { setActiveMessage(item); setReply(''); }}><MessageCircle size={15}/>{item.replies} ответа</button>
        <span className="anon-tag"><ShieldCheck size={13}/> Анонимно</span>
      </div>
    </div>
  </article>;

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => go('home')}><span className="brand-mark"><Ghost size={24}/></span><span>GHOST<span className="brand-light">MESSAGE</span><small>ИЗ НЕИЗВЕСТНОСТИ</small></span></button>
      <div className="side-label">ТВОЁ ПРОСТРАНСТВО</div>
      <nav>{nav.map(({id,label,icon:Icon,badge}) => <button key={id} className={'nav-item ' + (tab===id?'active':'')} onClick={() => go(id)}><Icon size={19}/><span>{label}</span>{badge>0&&<b className="nav-badge">{badge}</b>}{id==='send'&&<span className="nav-plus">+</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="online-dot"></div><span>{user?.displayName || 'Твой анонимный профиль'}</span><div className="mini-ghost"><Ghost size={18}/></div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="mobile-brand"><Ghost size={22}/><b>GHOST<span>MESSAGE</span></b></div><div className="breadcrumb"><span>МИР ПРИЗРАКОВ</span><ChevronRight size={13}/><b>{nav.find(n=>n.id===tab)?.label.toUpperCase() || 'ГЛАВНАЯ'}</b></div><button className="icon-button top-bell" onClick={refresh} aria-label="Обновить"><RefreshCw size={18}/></button></header>

      {error && <div className="privacy-card" role="alert"><ShieldCheck size={20}/><div><b>Не удалось выполнить действие</b><p>{error}</p><button className="inline-link" onClick={refresh}>Повторить <ChevronRight size={14}/></button></div></div>}
      {loading && <div className="empty-state"><Ghost size={32}/><p>Подключаемся к миру призраков…</p></div>}

      {!loading && tab === 'home' && <section className="page fade-in">
        <div className="hero-card"><div className="hero-orbit orbit-one"></div><div className="hero-orbit orbit-two"></div><div className="hero-copy"><div className="eyebrow"><span className="pulse"></span> ТВОЯ ТАЙНАЯ ВСЕЛЕННАЯ</div><h1>У каждого есть<br/>что <em>сказать.</em></h1><p>Оставь послание в неизвестности.<br/>Возможно, оно найдёт именно того.</p><button className="primary-button" onClick={() => go('send')}>Отправить послание <ArrowUpRight size={17}/></button><div className="hero-note"><LockKeyhole size={13}/> Анонимная сессия на этом устройстве</div></div><div className="hero-ghost"><div className="ghost-halo"></div><Ghost size={128} strokeWidth={1.15}/><span className="float-star star-a">✦</span><span className="float-star star-b">✧</span><span className="float-star star-c">·</span></div><div className="hero-index">№ 001 <span>— THE UNKNOWN</span></div></div>
        <div className="section-heading"><div><span className="section-kicker">ПРОСТРАНСТВО</span><h2>Твоя активность</h2></div><button className="text-button" onClick={() => go('profile')}>Мой профиль <ChevronRight size={16}/></button></div>
        <div className="stats-grid"><div className="stat-card"><span className="stat-icon violet"><Mail size={18}/></span><span className="stat-value">{sent.length + messages.length}</span><span className="stat-label">Посланий у тебя</span><span className="stat-trend">Из базы данных</span></div><div className="stat-card"><span className="stat-icon pink"><Shuffle size={18}/></span><span className="stat-value">{messages.length}</span><span className="stat-label">Входящие</span><span className="stat-trend">Личные послания</span></div><div className="stat-card"><span className="stat-icon blue"><Compass size={18}/></span><span className="stat-value">{sent.length}</span><span className="stat-label">Отправлено</span><span className="stat-trend">Твоя история</span></div></div>
        <div className="section-heading feed-heading"><div><span className="section-kicker">ГОЛОСА ИЗ ТЕМНОТЫ</span><h2>Общая лента <span className="live-pill"><span/> LIVE</span></h2></div><button className="text-button" onClick={() => go('feed')}>Все послания <ChevronRight size={16}/></button></div>
        <div className="feed-list">{feed.slice(0,3).map(feedCard)}{feed.length===0&&<div className="empty-state"><Ghost size={32}/><p>Лента пока пуста. Оставь первое послание.</p></div>}</div>
        <div className="quote-banner"><Sparkles size={20}/><span>«Некоторые встречи начинаются ещё до того, как вы узнаете друг друга»</span><span className="quote-sign">— GHOST</span></div>
      </section>}

      {!loading && tab === 'send' && <section className="page narrow-page fade-in"><div className="page-title"><span className="section-kicker">ВЫПУСТИ СЛОВА НА ВОЛЮ</span><h1>Отправить <em>послание</em></h1><p>Сообщения сохраняются на сервере.</p></div><form className="compose-card" onSubmit={sendMessage}><label className="field-label">ВЫБЕРИ СПОСОБ</label><div className="mode-switch"><button type="button" className={mode==='random'?'selected':''} onClick={()=>setMode('random')}><Shuffle size={18}/><b>В неизвестность</b><small>Случайному пользователю</small></button><button type="button" className={mode==='public'?'selected':''} onClick={()=>setMode('public')}><Globe2 size={18}/><b>В общую ленту</b><small>Для всех призраков</small></button></div><label className="field-label message-label" htmlFor="message">ТВОЁ ПОСЛАНИЕ <span>{draft.length}/500</span></label><textarea id="message" maxLength={500} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Напиши то, что давно хотел сказать..." rows={6}/><div className="compose-footer"><span><LockKeyhole size={14}/> Без имени и личных данных</span><span>{draft.length<20?'Коротко тоже имеет значение':'Красиво сказано ✨'}</span></div>{mode==='random'&&<><label className="field-label delay-label">КОГДА ДОСТАВИТЬ?</label><div className="delay-options"><button type="button" className={delay==='now'?'chosen':''} onClick={()=>setDelay('now')}><Send size={15}/>Сейчас</button><button type="button" className={delay==='hour'?'chosen':''} onClick={()=>setDelay('hour')}><Clock3 size={15}/>Через час</button><button type="button" className={delay==='midnight'?'chosen':''} onClick={()=>setDelay('midnight')}><Moon size={15}/>В полночь</button></div><p className="prototype-note"><ShieldCheck size={15}/> Отложенная доставка сохранится в очереди; автоматическое раскрытие по времени требует отдельного планировщика.</p></>}<button className="primary-button send-button" type="submit" disabled={busy}>{busy?'Отправляем…':'Отправить послание'} <Send size={17}/></button></form></section>}

      {!loading && (tab==='messages'||tab==='feed') && <section className="page fade-in"><div className="page-title"><span className="section-kicker">{tab==='messages'?'ЛИЧНЫЕ ПОСЛАНИЯ':'СЛОВА БЕЗ ИМЁН'}</span><h1>{tab==='messages'?'Твои послания':'Общая лента'}</h1><p>{tab==='messages'?'Сообщения загружены из D1.':'Публикации всех пользователей.'}</p></div>{tab==='messages'?<div className="message-list">{messages.map(m=><article key={m.id} className="message-card" onClick={()=>{setActiveMessage(m);setReply('');}}><div className="message-avatar"><Ghost size={22}/></div><div className="message-content"><div className="message-top"><b>{m.from}</b><span>{m.time}</span></div><p>{m.text}</p><div className="message-bottom"><span className="anon-tag"><ShieldCheck size={13}/> Анонимно</span>{m.replies>0&&<span><MessageCircle size={13}/> {m.replies} ответа</span>}</div></div></article>)}{messages.length===0&&<div className="empty-state"><Ghost size={42}/><h3>Пока тихо…</h3><p>Входящие появятся, когда другие пользователи отправят тебе послания.</p></div>}</div>:<div className="feed-list full-feed">{feed.map(feedCard)}{feed.length===0&&<div className="empty-state"><Ghost size={42}/><h3>Лента пока пуста</h3><p>Опубликуй первое послание.</p></div>}</div>}</section>}

      {!loading && tab==='notifications' && <section className="page narrow-page fade-in"><div className="page-title"><span className="section-kicker">ЧТО-ТО ПРОИСХОДИТ</span><h1>Следы в <em>темноте</em></h1><p>События твоего анонимного пространства.</p></div><div className="notification-card"><div className="notification-icon"><Mail size={19}/></div><div><b>Входящие: {messages.length}</b><p>Личные послания, сохранённые в базе.</p><button className="inline-link" onClick={()=>go('messages')}>Открыть послания <ChevronRight size={14}/></button></div></div><div className="notification-card"><div className="notification-icon pink"><Flame size={19}/></div><div><b>Общая лента: {feed.length}</b><p>Публичные публикации пользователей.</p><button className="inline-link" onClick={()=>go('feed')}>Заглянуть в ленту <ChevronRight size={14}/></button></div></div><div className="privacy-card"><ShieldCheck size={22}/><div><b>Твоя безопасность важна</b><p>Не публикуй адрес, телефон, пароли или другие личные данные. Анонимность не исключает технических журналов сервиса.</p></div></div></section>}

      {!loading && tab==='profile' && <section className="page narrow-page fade-in"><div className="page-title"><span className="section-kicker">ТВОЯ ЦИФРОВАЯ ТЕНЬ</span><h1>Мой <em>призрак</em></h1><p>Анонимная сессия хранится на этом устройстве.</p></div><div className="profile-card"><div className="profile-ghost"><Ghost size={52}/><span className="profile-online"/></div><div className="profile-name">{user?.displayName || 'Незнакомец'}</div><div className="profile-subtitle">Тихий голос в большом мире</div><div className="profile-stats"><div><b>{sent.length}</b><span>Отправлено</span></div><div><b>{messages.length}</b><span>Входящие</span></div><div><b>{feed.length}</b><span>В ленте</span></div></div><div className="profile-note"><ShieldCheck size={18}/><span>Токен сессии хранится в localStorage. Очистка данных браузера может привести к потере доступа к этому анонимному профилю.</span></div><button className="primary-button send-button" onClick={refresh}><RefreshCw size={16}/> Обновить данные</button><button className="text-button" onClick={logout}><LogOut size={16}/> Удалить сессию с устройства</button></div></section>}

      {activeMessage && <div className="modal-backdrop" onClick={()=>setActiveMessage(null)}><div className="reply-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setActiveMessage(null)}><X size={18}/></button><div className="modal-symbol"><Ghost size={30}/></div><span className="section-kicker">ЦЕПОЧКА НЕЗНАКОМЦЕВ</span><h2>{activeMessage.from || 'Незнакомец'}</h2><p className="modal-message">{activeMessage.text}</p><div className="chain-status"><span className="chain-line"/> <span><Sparkles size={14}/> Твой ответ продолжит историю</span></div><form onSubmit={sendReply}><textarea value={reply} onChange={e=>setReply(e.target.value)} placeholder="Ответь анонимно..." rows={3} maxLength={500}/><button className="primary-button send-button" type="submit" disabled={busy}>{busy?'Отправляем…':'Продолжить цепочку'} <Send size={16}/></button></form></div></div>}
      {toast&&<div className="toast"><Check size={17}/>{toast}</div>}
      <footer className="footer"><span>GHOST MESSAGE <i>©</i> 2026</span><span><span className="footer-dot"/> ДАННЫЕ ИЗ СЕРВЕРА</span></footer>
    </main>
    <nav className="mobile-nav">{nav.map(({id,label,icon:Icon,badge})=><button key={id} className={tab===id?'active':''} onClick={() => go(id)}><Icon size={20}/><span>{id==='send'?'Отправить':label}</span>{badge>0&&<i/>}</button>)}</nav>
  </div>;
}
