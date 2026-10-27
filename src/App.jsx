import { useState } from 'react';
import {
  Ghost, House, Mail, Plus, Bell, UserRound, Send, Clock3, Globe2,
  Shuffle, Heart, MessageCircle, Sparkles, ArrowUpRight, ShieldCheck,
  Moon, ChevronRight, Check, X, Compass, Flame, LockKeyhole
} from 'lucide-react';

const initialMessages = [
  { id: 1, from: 'Тихий незнакомец', initials: 'ТН', time: '2 мин назад', text: 'Если ты читаешь это — пусть сегодня случится что-то хорошее. Даже маленькое.', type: 'inbox', unread: true, replies: 2 },
  { id: 2, from: 'Призрак № 024', initials: '👻', time: '18 мин назад', text: 'Какую песню ты бы хотел услышать впервые ещё раз?', type: 'inbox', unread: true, replies: 0 },
  { id: 3, from: 'Ночной странник', initials: 'НС', time: '1 ч назад', text: 'Иногда незнакомец может сказать то, что давно нужно было услышать.', type: 'inbox', unread: false, replies: 1 }
];
const feedSeed = [
  { id: 11, from: 'без имени', time: 'только что', text: 'Интересно, сколько людей сейчас смотрят в потолок и думают о жизни.', likes: 28, replies: 7 },
  { id: 12, from: 'послание в 03:17', time: '12 мин назад', text: 'Ты не опаздываешь. У каждого своя скорость.', likes: 46, replies: 12 },
  { id: 13, from: 'кто-то рядом', time: '36 мин назад', text: 'Оставь это здесь: однажды ты будешь скучать даже по сегодняшнему дню.', likes: 19, replies: 4 }
];

export default function App() {
  const [tab, setTab] = useState('home');
  const [messages, setMessages] = useState(initialMessages);
  const [feed, setFeed] = useState(feedSeed);
  const [mode, setMode] = useState('random');
  const [delay, setDelay] = useState('now');
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState('');
  const [liked, setLiked] = useState([]);
  const [activeMessage, setActiveMessage] = useState(null);
  const [reply, setReply] = useState('');
  const [sentCount, setSentCount] = useState(0);

  const notify = (text) => { setToast(text); window.setTimeout(() => setToast(''), 2600); };
  const go = (next) => { setTab(next); setActiveMessage(null); };
  const sendMessage = (e) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean) { notify('Сначала напиши послание 👻'); return; }
    if (mode === 'public') {
      setFeed([{ id: Date.now(), from: 'ты · анонимно', time: 'только что', text: clean, likes: 0, replies: 0 }, ...feed]);
      notify('Послание появилось в общей ленте');
    } else {
      const wait = delay === 'now' ? 'доставлено сейчас' : delay === 'hour' ? 'доставка через час' : delay === 'midnight' ? 'откроется в полночь' : 'доставка запланирована';
      setMessages([{ id: Date.now(), from: 'Моё послание', initials: '👻', time: wait, text: clean, type: 'sent', unread: false, replies: 0 }, ...messages]);
      notify(delay === 'now' ? 'Послание отправлено в неизвестность' : 'Послание поставлено в очередь');
    }
    setDraft(''); setSentCount(n => n + 1); setTab('messages');
  };
  const toggleLike = (id) => setLiked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const sendReply = (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setMessages(prev => [{ id: Date.now(), from: 'Твоя цепочка', initials: '↗', time: 'только что', text: reply.trim(), type: 'sent', unread: false, replies: 0 }, ...prev]);
    setReply(''); setActiveMessage(null); notify('Ответ отправлен. Цепочка продолжается.');
  };

  const nav = [
    { id: 'home', label: 'Главная', icon: House },
    { id: 'messages', label: 'Послания', icon: Mail, badge: messages.filter(m => m.unread).length },
    { id: 'send', label: 'Отправить', icon: Plus },
    { id: 'notifications', label: 'События', icon: Bell },
    { id: 'profile', label: 'Профиль', icon: UserRound }
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => go('home')}><span className="brand-mark"><Ghost size={24}/></span><span>GHOST<span className="brand-light">MESSAGE</span><small>ИЗ НЕИЗВЕСТНОСТИ</small></span></button>
      <div className="side-label">ТВОЁ ПРОСТРАНСТВО</div>
      <nav>{nav.map(({id,label,icon:Icon,badge}) => <button key={id} className={'nav-item '+(tab===id?'active':'')} onClick={() => go(id)}><Icon size={19}/><span>{label}</span>{badge>0&&<b className="nav-badge">{badge}</b>}{id==='send'&&<span className="nav-plus">+</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="online-dot"></div><span>Ты в мире призраков</span><div className="mini-ghost"><Ghost size={18}/></div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="mobile-brand"><Ghost size={22}/><b>GHOST<span>MESSAGE</span></b></div><div className="breadcrumb"><span>МИР ПРИЗРАКОВ</span><ChevronRight size={13}/><b>{nav.find(n=>n.id===tab)?.label.toUpperCase() || 'ГЛАВНАЯ'}</b></div><button className="icon-button top-bell" onClick={() => go('notifications')} aria-label="Уведомления"><Bell size={19}/><i/></button></header>

      {tab === 'home' && <section className="page fade-in">
        <div className="hero-card"><div className="hero-orbit orbit-one"></div><div className="hero-orbit orbit-two"></div><div className="hero-copy"><div className="eyebrow"><span className="pulse"></span> ТВОЯ ТАЙНАЯ ВСЕЛЕННАЯ</div><h1>У каждого есть<br/>что <em>сказать.</em></h1><p>Оставь послание в неизвестности.<br/>Возможно, оно найдёт именно того.</p><button className="primary-button" onClick={() => go('send')}>Отправить послание <ArrowUpRight size={17}/></button><div className="hero-note"><LockKeyhole size={13}/> Твоя личность останется скрытой</div></div><div className="hero-ghost"><div className="ghost-halo"></div><Ghost size={128} strokeWidth={1.15}/><span className="float-star star-a">✦</span><span className="float-star star-b">✧</span><span className="float-star star-c">·</span></div><div className="hero-index">№ 001 <span>— THE UNKNOWN</span></div></div>

        <div className="section-heading"><div><span className="section-kicker">ПРОСТРАНСТВО</span><h2>Твоя активность</h2></div><button className="text-button" onClick={() => go('profile')}>Мой профиль <ChevronRight size={16}/></button></div>
        <div className="stats-grid"><div className="stat-card"><span className="stat-icon violet"><Mail size={18}/></span><span className="stat-value">{messages.length + sentCount}</span><span className="stat-label">Посланий у тебя</span><span className="stat-trend">Твоя история</span></div><div className="stat-card"><span className="stat-icon pink"><Shuffle size={18}/></span><span className="stat-value">{messages.filter(m=>m.unread).length}</span><span className="stat-label">Нераскрытых тайн</span><span className="stat-trend">Ждут твоего ответа</span></div><div className="stat-card"><span className="stat-icon blue"><Compass size={18}/></span><span className="stat-value">{sentCount + 3}</span><span className="stat-label">Следов оставлено</span><span className="stat-trend">Каждое слово имеет вес</span></div></div>

        <div className="section-heading feed-heading"><div><span className="section-kicker">ГОЛОСА ИЗ ТЕМНОТЫ</span><h2>Общая лента <span className="live-pill"><span/> LIVE</span></h2></div><button className="text-button" onClick={() => go('feed')}>Все послания <ChevronRight size={16}/></button></div>
        <div className="feed-list">{feed.slice(0,3).map((item,i)=><article className="feed-card" key={item.id}><div className={'feed-avatar avatar-'+i}><Ghost size={20}/></div><div className="feed-body"><div className="feed-meta"><b>{item.from}</b><span>{item.time}</span></div><p>{item.text}</p><div className="feed-actions"><button className={liked.includes(item.id)?'liked':''} onClick={()=>toggleLike(item.id)}><Heart size={15} fill={liked.includes(item.id)?'currentColor':'none'}/>{item.likes+(liked.includes(item.id)?1:0)}</button><button onClick={()=>{setActiveMessage(item);setReply('')}}><MessageCircle size={15}/>{item.replies} ответа</button><span className="anon-tag"><ShieldCheck size={13}/> Анонимно</span></div></div></article>)}</div>
        <div className="quote-banner"><Sparkles size={20}/><span>«Некоторые встречи начинаются ещё до того, как вы узнаете друг друга»</span><span className="quote-sign">— GHOST</span></div>
      </section>}

      {tab === 'send' && <section className="page narrow-page fade-in"><div className="page-title"><span className="section-kicker">ВЫПУСТИ СЛОВА НА ВОЛЮ</span><h1>Отправить <em>послание</em></h1><p>Иногда легче сказать что-то тому, кто тебя не знает.</p></div><form className="compose-card" onSubmit={sendMessage}><label className="field-label">ВЫБЕРИ СПОСОБ</label><div className="mode-switch"><button type="button" className={mode==='random'?'selected':''} onClick={()=>setMode('random')}><Shuffle size={18}/><b>В неизвестность</b><small>Случайному человеку</small></button><button type="button" className={mode==='public'?'selected':''} onClick={()=>setMode('public')}><Globe2 size={18}/><b>В общую ленту</b><small>Для всех призраков</small></button></div><label className="field-label message-label" htmlFor="message">ТВОЁ ПОСЛАНИЕ <span>{draft.length}/500</span></label><textarea id="message" maxLength={500} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Напиши то, что давно хотел сказать..." rows={6}/><div className="compose-footer"><span><LockKeyhole size={14}/> Без имени и личных данных</span><span>{draft.length<20?'Коротко тоже имеет значение':'Красиво сказано ✨'}</span></div>{mode==='random'&&<><label className="field-label delay-label">КОГДА ДОСТАВИТЬ?</label><div className="delay-options"><button type="button" className={delay==='now'?'chosen':''} onClick={()=>setDelay('now')}><Send size={15}/>Сейчас</button><button type="button" className={delay==='hour'?'chosen':''} onClick={()=>setDelay('hour')}><Clock3 size={15}/>Через час</button><button type="button" className={delay==='midnight'?'chosen':''} onClick={()=>setDelay('midnight')}><Moon size={15}/>В полночь</button></div><p className="prototype-note"><ShieldCheck size={15}/> В демо-версии задержка отмечается в интерфейсе. Реальная доставка заработает после подключения сервера.</p></>}<button className="primary-button send-button" type="submit">Отправить в неизвестность <Send size={17}/></button></form></section>}

      {(tab==='messages'||tab==='feed') && <section className="page fade-in"><div className="page-title"><span className="section-kicker">{tab==='messages'?'ЛИЧНЫЕ ПОСЛАНИЯ':'СЛОВА БЕЗ ИМЁН'}</span><h1>{tab==='messages'?'Твои послания':'Общая лента'}</h1><p>{tab==='messages'?'Каждое сообщение — чей-то маленький секрет.':'Мы все незнакомцы, пока не начнём говорить.'}</p></div>{tab==='messages'?<div className="message-list">{messages.map(m=><article key={m.id} className={'message-card '+(m.unread?'unread':'')} onClick={()=>{setActiveMessage(m);setMessages(prev=>prev.map(x=>x.id===m.id?{...x,unread:false}:x))}}><div className="message-avatar"><Ghost size={22}/></div><div className="message-content"><div className="message-top"><b>{m.from}</b><span>{m.time}</span></div><p>{m.text}</p><div className="message-bottom"><span className="anon-tag"><ShieldCheck size={13}/> Анонимно</span>{m.replies>0&&<span><MessageCircle size={13}/> {m.replies} ответа</span>}</div></div>{m.unread&&<span className="unread-dot"/>}</article>)}{messages.length===0&&<div className="empty-state"><Ghost size={42}/><h3>Пока тихо...</h3><p>Первое послание уже где-то в пути.</p></div>}</div>:<div className="feed-list full-feed">{feed.map((item,i)=><article className="feed-card" key={item.id}><div className={'feed-avatar avatar-'+(i%3)}><Ghost size={20}/></div><div className="feed-body"><div className="feed-meta"><b>{item.from}</b><span>{item.time}</span></div><p>{item.text}</p><div className="feed-actions"><button className={liked.includes(item.id)?'liked':''} onClick={()=>toggleLike(item.id)}><Heart size={15} fill={liked.includes(item.id)?'currentColor':'none'}/>{item.likes+(liked.includes(item.id)?1:0)}</button><button onClick={()=>{setActiveMessage(item);setReply('')}}><MessageCircle size={15}/>{item.replies} ответа</button><span className="anon-tag"><ShieldCheck size={13}/> Анонимно</span></div></div></article>)}</div>}</section>}

      {tab==='notifications' && <section className="page narrow-page fade-in"><div className="page-title"><span className="section-kicker">ЧТО-ТО ПРОИСХОДИТ</span><h1>Следы в <em>темноте</em></h1><p>Мир призраков иногда подаёт знаки.</p></div><div className="notification-card"><div className="notification-icon"><Mail size={19}/></div><div><b>Два послания ждут тебя</b><p>Открой входящие и узнай, что тебе хотели сказать.</p><button className="inline-link" onClick={()=>go('messages')}>Открыть послания <ChevronRight size={14}/></button></div></div><div className="notification-card"><div className="notification-icon pink"><Flame size={19}/></div><div><b>Общая лента не спит</b><p>Новые мысли появляются каждую минуту.</p><button className="inline-link" onClick={()=>go('feed')}>Заглянуть в ленту <ChevronRight size={14}/></button></div></div><div className="privacy-card"><ShieldCheck size={22}/><div><b>Твоя безопасность важна</b><p>Не публикуй адрес, телефон, пароли или другие личные данные. Если сообщение неприятное — не отвечай.</p></div></div></section>}

      {tab==='profile' && <section className="page narrow-page fade-in"><div className="page-title"><span className="section-kicker">ТВОЯ ЦИФРОВАЯ ТЕНЬ</span><h1>Мой <em>призрак</em></h1><p>Имя не обязательно, чтобы оставить след.</p></div><div className="profile-card"><div className="profile-ghost"><Ghost size={52}/><span className="profile-online"/></div><div className="profile-name">Незнакомец <span>№ 001</span></div><div className="profile-subtitle">Тихий голос в большом мире</div><div className="profile-stats"><div><b>{sentCount}</b><span>Отправлено</span></div><div><b>{messages.filter(m=>m.unread).length}</b><span>Нераскрыто</span></div><div><b>1</b><span>Уровень</span></div></div><div className="profile-progress"><div><span>Уровень 1</span><span>До следующего: 100 XP</span></div><div className="progress-track"><span style={{width:Math.min(100,sentCount*12)+'%'}}/></div></div><div className="profile-note"><ShieldCheck size={18}/><span>В этой демо-версии профиль хранится только в текущем сеансе. Регистрация появится после подключения backend.</span></div></div></section>}

      {activeMessage && <div className="modal-backdrop" onClick={()=>setActiveMessage(null)}><div className="reply-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setActiveMessage(null)}><X size={18}/></button><div className="modal-symbol"><Ghost size={30}/></div><span className="section-kicker">ЦЕПОЧКА НЕЗНАКОМЦЕВ</span><h2>{activeMessage.from}</h2><p className="modal-message">{activeMessage.text}</p><div className="chain-status"><span className="chain-line"/> <span><Sparkles size={14}/> Твой ответ продолжит историю</span></div><form onSubmit={sendReply}><textarea value={reply} onChange={e=>setReply(e.target.value)} placeholder="Ответь анонимно..." rows={3} maxLength={500}/><button className="primary-button send-button" type="submit">Продолжить цепочку <Send size={16}/></button></form></div></div>}
      {toast&&<div className="toast"><Check size={17}/>{toast}</div>}
      <footer className="footer"><span>GHOST MESSAGE <i>©</i> 2026</span><span><span className="footer-dot"/> ВСЁ СКАЗАННОЕ ОСТАЁТСЯ В ТЕНИ</span></footer>
    </main>
    <nav className="mobile-nav">{nav.map(({id,label,icon:Icon,badge})=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><Icon size={20}/><span>{id==='send'?'Отправить':label}</span>{badge>0&&<i/>}</button>)}</nav>
  </div>;
}