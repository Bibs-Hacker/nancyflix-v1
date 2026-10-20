import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDown, ArrowLeft, ArrowRight, Bookmark, Check, Clapperboard,
  Compass, Film, Heart, Info, LoaderCircle, LockKeyhole, LogIn, Menu, Play,
  Search, Settings2, ShieldCheck, Sparkles, Star, TrendingUp, UserRound, X
} from 'lucide-react'
import { supabase, supabaseConfigured } from './lib/supabase'
import { Movie, MoviePage, posterUrl, tmdb } from './lib/tmdb'

type User = { id: string; email?: string }
type Genre = { id: number; name: string }
const genres: Genre[] = [
  {id:28,name:'Action'},{id:12,name:'Adventure'},{id:16,name:'Animation'},{id:35,name:'Comedy'},
  {id:80,name:'Crime'},{id:99,name:'Documentary'},{id:18,name:'Drama'},{id:10751,name:'Family'},
  {id:14,name:'Fantasy'},{id:36,name:'History'},{id:27,name:'Horror'},{id:10402,name:'Music'},
  {id:9648,name:'Mystery'},{id:10749,name:'Romance'},{id:878,name:'Sci-Fi'},{id:10770,name:'TV Movie'},
  {id:53,name:'Thriller'},{id:10752,name:'War'},{id:37,name:'Western'}
]
const image = (movie: Movie, size = 'w500') => posterUrl(movie.poster_path, size)
const year = (date?: string) => date?.slice(0,4) || 'Year unknown'
const score = (n?: number) => typeof n === 'number' ? n.toFixed(1) : '—'

function App() {
  const [splash, setSplash] = useState(true)
  const [activeNav, setActiveNav] = useState('Discover')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [genre, setGenre] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Record<string, Movie[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Movie | null>(null)
  const [trailers, setTrailers] = useState<{ key: string; site: string; name: string; type?: string }[]>([])
  const [trailerLoading, setTrailerLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [watchlist, setWatchlist] = useState<Movie[]>([])
  const [watchlistIds, setWatchlistIds] = useState<number[]>([])
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login'|'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState('midnight')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setSplash(false), 2100)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({data}) => setUser(data.session?.user ? {id:data.session.user.id,email:data.session.user.email} : null))
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ? {id:session.user.id,email:session.user.email} : null
      setUser(next)
      if (next) void loadSaved(next.id)
      else { setWatchlist([]); setWatchlistIds([]) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadSaved = useCallback(async (userId: string) => {
    if (!supabase) return
    const {data, error: savedError} = await supabase.from('watchlist').select('movie_id,movie_data').eq('user_id', userId).order('created_at', {ascending:false})
    if (savedError) { setNotice('Could not sync watchlist. Check your Supabase SQL setup.'); return }
    const movies = (data || []).map((x:any) => x.movie_data as Movie).filter(Boolean)
    setWatchlist(movies)
    setWatchlistIds((data || []).map((x:any) => Number(x.movie_id)))
  }, [])

  const requestKey = `${activeNav}|${submittedQuery}|${genre ?? 'all'}|${page}`
  const fetchMovies = useCallback(async () => {
    if (activeNav === 'My List') return
    setLoading(true); setError('')
    try {
      let result: MoviePage
      if (submittedQuery.trim()) {
        result = await tmdb('search', {query: submittedQuery.trim(), page})
      } else if (genre !== undefined) {
        result = await tmdb('discover', {with_genres: genre, sort_by:'popularity.desc', page})
      } else if (activeNav === 'Trending') {
        result = await tmdb('trending', {time_window:'week', page})
      } else if (activeNav === 'Top Rated') {
        result = await tmdb('discover', {sort_by:'vote_average.desc', 'vote_count.gte':250, page})
      } else if (activeNav === 'Coming Soon') {
        result = await tmdb('discover', {sort_by:'primary_release_date.asc', 'primary_release_date.gte':new Date().toISOString().slice(0,10), page})
      } else {
        result = await tmdb('discover', {sort_by:'popularity.desc', page})
      }
      setRows(prev => ({...prev, [requestKey]: result.results || []}))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load movies.')
      setRows(prev => ({...prev, [requestKey]: []}))
    } finally { setLoading(false) }
  }, [activeNav, submittedQuery, genre, page, requestKey])

  useEffect(() => { if (!splash && activeNav !== 'My List') void fetchMovies() }, [splash, fetchMovies, activeNav])

  const currentMovies = useMemo(() => activeNav === 'My List' ? watchlist : (rows[requestKey] || []), [activeNav, watchlist, rows, requestKey])
  const hero = currentMovies.find(m => m.backdrop_path) || currentMovies[0]
  const visibleTitle = submittedQuery ? `Results for “${submittedQuery}”` : genre !== undefined ? genres.find(g=>g.id===genre)?.name || 'Movies' : activeNav
  const changeNav = (nav: string) => {
    setActiveNav(nav); setSubmittedQuery(''); setQuery(''); setGenre(undefined); setPage(1); setMobileMenu(false)
  }
  const runSearch = (e: FormEvent) => { e.preventDefault(); setSubmittedQuery(query.trim()); setGenre(undefined); setPage(1); setActiveNav('Discover') }
  const selectGenre = (id: number) => { setGenre(id); setSubmittedQuery(''); setPage(1); setActiveNav('Discover'); window.scrollTo({top:0,behavior:'smooth'}) }

  const toggleWatchlist = async (movie: Movie) => {
    const exists = watchlistIds.includes(movie.id)
    if (exists) {
      setWatchlist(prev=>prev.filter(m=>m.id!==movie.id)); setWatchlistIds(prev=>prev.filter(id=>id!==movie.id))
      if (supabase && user) {
        const {error:e} = await supabase.from('watchlist').delete().eq('user_id',user.id).eq('movie_id',movie.id)
        if (e) { setNotice('Could not remove item from cloud watchlist.'); void loadSaved(user.id) }
      }
      return
    }
    setWatchlist(prev=>[movie,...prev]); setWatchlistIds(prev=>[...prev,movie.id])
    if (supabase && user) {
      const {error:e} = await supabase.from('watchlist').upsert({user_id:user.id,movie_id:movie.id,movie_data:movie},{onConflict:'user_id,movie_id'})
      if (e) { setNotice('Saved locally for this session, but cloud sync failed. Check the SQL migration.'); }
    } else {
      setNotice('Sign in to sync your list across devices.')
    }
  }

  const openMovie = async (movie: Movie) => {
    setSelected(movie); setTrailers([]); setTrailerLoading(true)
    try {
      const data = await tmdb('videos', {id:movie.id})
      const videos = (data.results || []).filter((v:any)=>v.site==='YouTube' && ['Trailer','Teaser'].includes(v.type))
      setTrailers(videos.slice(0,6))
    } catch { setTrailers([]) }
    finally { setTrailerLoading(false) }
  }

  const submitAuth = async (e: FormEvent) => {
    e.preventDefault(); setAuthBusy(true); setAuthMessage('')
    if (!supabase) { setAuthMessage('Supabase is not configured yet. Add your project URL and publishable key to .env.'); setAuthBusy(false); return }
    try {
      if (authMode === 'signup') {
        const {error:e} = await supabase.auth.signUp({email,password})
        if (e) throw e
        setAuthMessage('Account request sent. If email confirmation is enabled, check your inbox to verify your account.')
      } else {
        const {error:e} = await supabase.auth.signInWithPassword({email,password})
        if (e) throw e
        setAuthOpen(false); setPassword('')
      }
    } catch(e) { setAuthMessage(e instanceof Error ? e.message : 'Authentication failed.') }
    finally { setAuthBusy(false) }
  }
  const resetPassword = async () => {
    if (!supabase) { setAuthMessage('Connect Supabase first.'); return }
    if (!email) { setAuthMessage('Enter your email first.'); return }
    const {error:e} = await supabase.auth.resetPasswordForEmail(email, {redirectTo:window.location.origin})
    setAuthMessage(e ? e.message : 'Password reset email requested. Check your inbox.')
  }

  return <div className={`app theme-${theme}`}>
    {splash && <div className="splash" aria-label="NANCYFLIX loading">
      <div className="splash-orbit orbit-one"/><div className="splash-orbit orbit-two"/>
      <div className="splash-logo"><span className="logo-mark"><Clapperboard size={31}/></span><span>NANCY<span className="logo-light">FLIX</span></span></div>
      <div className="splash-line"/><p>EVERY STORY DESERVES A SCREEN.</p><div className="splash-loading"><i/></div>
    </div>}
    <header className="topbar">
      <button className="brand" onClick={()=>changeNav('Discover')} aria-label="NANCYFLIX home"><span className="brand-icon"><Clapperboard size={23}/></span><span>NANCY<span>FLIX</span></span></button>
      <nav className={`nav-links ${mobileMenu?'nav-open':''}`}>
        {['Discover','Trending','Top Rated','Coming Soon','My List'].map((item)=><button key={item} className={activeNav===item?'nav-active':''} onClick={()=>changeNav(item)}>{item==='Discover'?<Compass size={15}/>:item==='Trending'?<TrendingUp size={15}/>:item==='Top Rated'?<Star size={15}/>:item==='Coming Soon'?<Film size={15}/>:<Bookmark size={15}/>}<span>{item}</span></button>)}
      </nav>
      <div className="top-actions">
        <form className="searchbox" onSubmit={runSearch}><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search titles..." aria-label="Search movies"/>{query&&<button type="button" onClick={()=>{setQuery('');setSubmittedQuery('')}} aria-label="Clear search"><X size={14}/></button>}</form>
        <button className="icon-button" title="Appearance settings" onClick={()=>setSettingsOpen(v=>!v)}><Settings2 size={18}/></button>
        {user ? <button className="profile-button" onClick={async()=>{await supabase?.auth.signOut();setNotice('Signed out.')}} title={user.email||'Account'}><UserRound size={17}/><span>Account</span></button> : <button className="sign-in" onClick={()=>{setAuthMode('login');setAuthMessage('');setAuthOpen(true)}}><LogIn size={16}/><span>Sign in</span></button>}
        <button className="icon-button mobile-toggle" onClick={()=>setMobileMenu(v=>!v)} aria-label="Open navigation">{mobileMenu?<X size={20}/>:<Menu size={20}/>}</button>
      </div>
    </header>

    {settingsOpen && <div className="settings-popover"><div className="settings-heading">Appearance <button onClick={()=>setSettingsOpen(false)}><X size={15}/></button></div><p>Choose your cinema atmosphere</p><div className="theme-options">{[['midnight','Midnight'],['violet','Violet haze'],['ember','Ember'],['ocean','Deep ocean']].map(([id,name])=><button key={id} className={theme===id?'theme-selected':''} onClick={()=>setTheme(id)}><i className={`theme-dot ${id}`}/>{name}{theme===id&&<Check size={14}/>}</button>)}</div><div className="config-status"><span className={supabaseConfigured?'status-good':'status-warn'}/>{supabaseConfigured?'Supabase configured':'Supabase setup required'}</div></div>}

    <main>
      {activeNav !== 'My List' && !submittedQuery && genre===undefined && hero && <section className="hero">
        {hero.backdrop_path && <img className="hero-backdrop" src={posterUrl(hero.backdrop_path,'original')} alt="" />}
        <div className="hero-shade"/>
        <div className="hero-content"><div className="eyebrow"><span className="eyebrow-dot"/><Sparkles size={13}/> YOUR NEXT OBSESSION STARTS HERE</div>
          <div className="hero-kicker">{activeNav==='Trending'?'TRENDING NOW':activeNav==='Top Rated'?'CRITIC & FAN FAVOURITES':'THE CINEMA UNIVERSE'}</div>
          <h1>{hero.title || 'A universe of stories.'}</h1>
          <div className="hero-meta"><span>{year(hero.release_date)}</span><span className="meta-divider"/><span className="rating"><Star size={14} fill="currentColor"/>{score(hero.vote_average)}</span><span className="meta-divider"/><span>Movie discovery</span></div>
          <p className="hero-overview">{hero.overview || 'Find your next favourite story in a universe of films, genres, and unforgettable moments.'}</p>
          <div className="hero-buttons"><button className="primary-button" onClick={()=>void openMovie(hero)}><Play size={17} fill="currentColor"/> Explore title</button><button className="secondary-button" onClick={()=>void toggleWatchlist(hero)}>{watchlistIds.includes(hero.id)?<Check size={17}/>:<Bookmark size={17}/>} {watchlistIds.includes(hero.id)?'In My List':'Add to My List'}</button></div>
          <div className="hero-footnote"><ShieldCheck size={14}/> Metadata and trailers from TMDB</div>
        </div>
        <div className="hero-index"><span>01</span><i/><span>DISCOVER</span></div>
        <button className="hero-next" onClick={()=>document.getElementById('catalogue')?.scrollIntoView({behavior:'smooth'})} aria-label="Browse catalogue"><ArrowDown size={19}/></button>
      </section>}

      <section className="catalogue" id="catalogue">
        <div className="section-heading"><div><div className="section-overline"><span/> THE COLLECTION</div><h2>{activeNav==='My List'?'Your watchlist':visibleTitle}<span className="title-period">.</span></h2><p>{activeNav==='My List'?'The stories you have saved for later.':submittedQuery?'Explore matching titles from the live catalogue.':'Curated by your curiosity. Discovered in real time.'}</p></div>
          {activeNav!=='My List'&&<div className="catalogue-controls"><span className="live-label"><i/> LIVE CATALOGUE</span><button className="sort-button" onClick={()=>{setPage(p=>p===1?2:1)}}><ArrowDown size={14}/>{page===1?'More results':'Back to page 1'}</button></div>}
        </div>
        <div className="genre-strip"><span className="genre-label">EXPLORE BY GENRE</span><div className="genre-scroll"><button className={!genre?'genre-chip genre-active':'genre-chip'} onClick={()=>{setGenre(undefined);setPage(1);setSubmittedQuery('')}}>All genres</button>{genres.map(g=><button key={g.id} className={genre===g.id?'genre-chip genre-active':'genre-chip'} onClick={()=>selectGenre(g.id)}>{g.name}</button>)}</div></div>
        {loading && <div className="loading-state"><LoaderCircle className="spin" size={26}/><span>Opening the cinema universe…</span></div>}
        {!loading && error && <div className="empty-state"><div className="empty-icon"><Clapperboard size={26}/></div><h3>Your cinema universe is waiting.</h3><p>{error}</p><div className="setup-steps"><span><b>01</b> Create a TMDB account and API key</span><span><b>02</b> Deploy the included Supabase Edge Function</span><span><b>03</b> Add the function URL to <code>.env</code> and redeploy</span></div><button className="primary-button" onClick={()=>void fetchMovies()}>Try again <ArrowRight size={16}/></button></div>}
        {!loading && !error && currentMovies.length===0 && <div className="empty-state"><div className="empty-icon"><Bookmark size={25}/></div><h3>{activeNav==='My List'?'Your story shelf is empty.':'No titles found this time.'}</h3><p>{activeNav==='My List'?'Explore films and save titles here. Sign in to sync your list across devices.':'Try another search or choose a different genre.'}</p>{activeNav==='My List'&&<button className="primary-button" onClick={()=>changeNav('Discover')}>Discover films <Compass size={16}/></button>}</div>}
        {!loading && !error && currentMovies.length>0 && <div className="movie-grid">{currentMovies.map((movie,index)=><article className="movie-card" key={movie.id} style={{animationDelay:`${Math.min(index*35,280)}ms`}}>
          <button className="poster-button" onClick={()=>void openMovie(movie)} aria-label={`View ${movie.title}`}>
            {image(movie)?<img src={image(movie)} alt={`${movie.title} poster`} loading="lazy"/>:<div className="poster-fallback"><Film size={30}/><span>{movie.title}</span></div>}
            <div className="poster-overlay"><span className="quick-view"><Play size={16} fill="currentColor"/> Quick view</span></div>
            <span className="poster-rating"><Star size={12} fill="currentColor"/>{score(movie.vote_average)}</span>
          </button>
          <div className="movie-card-info"><div><h3 title={movie.title}>{movie.title}</h3><p>{year(movie.release_date)} <span>·</span> {movie.original_language?.toUpperCase()||'FILM'}</p></div><button className={`save-button ${watchlistIds.includes(movie.id)?'saved':''}`} onClick={()=>void toggleWatchlist(movie)} title={watchlistIds.includes(movie.id)?'Remove from My List':'Add to My List'}>{watchlistIds.includes(movie.id)?<Heart size={17} fill="currentColor"/>:<Bookmark size={16}/>}</button></div>
        </article>)}</div>}
        {!loading && !error && activeNav!=='My List' && currentMovies.length>0 && <div className="pagination"><span>Page {page} of the live catalogue</span><div><button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ArrowLeft size={15}/> Previous</button><button onClick={()=>setPage(p=>Math.min(500,p+1))}>Next page <ArrowRight size={15}/></button></div></div>}
      </section>

      <section className="feature-strip"><div className="feature"><span><Compass size={19}/></span><div><h3>Explore without limits</h3><p>Browse live titles across 19 core movie genres.</p></div></div><div className="feature"><span><Play size={19}/></span><div><h3>Trailer-first discovery</h3><p>Find available official trailer references on title details.</p></div></div><div className="feature"><span><Bookmark size={19}/></span><div><h3>Your list, your universe</h3><p>Save titles and sync your watchlist when signed in.</p></div></div></section>
      <footer><button className="footer-brand" onClick={()=>changeNav('Discover')}><Clapperboard size={19}/> NANCY<span>FLIX</span></button><p>EVERY STORY DESERVES A SCREEN.</p><div className="footer-right"><span>Movie metadata by TMDB</span><a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">Visit TMDB <ArrowRight size={12}/></a></div></footer>
    </main>

    {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)} role="presentation"><section className="movie-modal" role="dialog" aria-modal="true" aria-label={`${selected.title} details`} onClick={e=>e.stopPropagation()}>
      <button className="modal-close" onClick={()=>setSelected(null)} aria-label="Close details"><X size={20}/></button>
      {selected.backdrop_path&&<div className="modal-backdrop-image"><img src={posterUrl(selected.backdrop_path,'w1280')} alt=""/></div>}
      <div className="modal-body"><div className="modal-label"><span/> TITLE SPOTLIGHT</div><h2>{selected.title}</h2><div className="hero-meta"><span>{year(selected.release_date)}</span><span className="meta-divider"/><span className="rating"><Star size={14} fill="currentColor"/>{score(selected.vote_average)}</span><span className="meta-divider"/><span>{selected.original_language?.toUpperCase()||'MOVIE'}</span></div><p className="modal-overview">{selected.overview||'No synopsis is available for this title yet.'}</p>
        <div className="modal-actions"><button className="primary-button" onClick={()=>void toggleWatchlist(selected)}>{watchlistIds.includes(selected.id)?<Check size={16}/>:<Bookmark size={16}/>} {watchlistIds.includes(selected.id)?'Saved to My List':'Add to My List'}</button><a className="secondary-button link-button" href={`https://www.themoviedb.org/movie/${selected.id}`} target="_blank" rel="noreferrer"><Info size={16}/> TMDB details <ArrowRight size={15}/></a></div>
        <div className="trailer-heading"><div><span className="section-overline"><span/> WATCH A PREVIEW</span><h3>Trailers & teasers</h3></div>{trailerLoading&&<LoaderCircle size={19} className="spin"/>}</div>
        {!trailerLoading&&trailers.length===0&&<div className="trailer-empty">No trailer reference is currently available for this title.</div>}
        <div className="trailer-list">{trailers.map(v=><a key={v.key} href={`https://www.youtube.com/watch?v=${v.key}`} target="_blank" rel="noreferrer" className="trailer-item"><span className="trailer-play"><Play size={14} fill="currentColor"/></span><span><b>{v.name||'Official preview'}</b><small>{v.type||'Video'} · YouTube</small></span><ArrowRight size={15}/></a>)}</div>
        <p className="rights-note"><ShieldCheck size={14}/> NANCYFLIX provides discovery metadata and links to available trailers. It does not host or provide full-length films.</p>
      </div>
    </section></div>}

    {authOpen && <div className="modal-backdrop" onClick={()=>setAuthOpen(false)} role="presentation"><section className="auth-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setAuthOpen(false)} aria-label="Close"><X size={19}/></button><div className="auth-symbol"><LockKeyhole size={22}/></div><div className="section-overline"><span/> YOUR PERSONAL CINEMA</div><h2>{authMode==='login'?'Welcome back.':'Create your account.'}</h2><p className="auth-description">Keep your saved films close, wherever you watch.</p><form onSubmit={submitAuth}><label>Email address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label><button className="primary-button auth-submit" disabled={authBusy}>{authBusy?<LoaderCircle size={16} className="spin"/>:authMode==='login'?<LogIn size={16}/>:<UserRound size={16}/>} {authMode==='login'?'Sign in':'Create account'}</button></form>{authMessage&&<p className="auth-message">{authMessage}</p>}<div className="auth-bottom"><button onClick={()=>{setAuthMode(v=>v==='login'?'signup':'login');setAuthMessage('')}}>{authMode==='login'?'New here? Create an account':'Already have an account? Sign in'}</button><button onClick={()=>void resetPassword()}>Forgot password?</button></div><p className="auth-footnote"><ShieldCheck size={13}/> Secure authentication powered by Supabase</p></section></div>}

    {notice && <div className="toast"><Info size={16}/>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss notice"><X size={14}/></button></div>}
    <a className="tmdb-credit" href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a>
  </div>
}
export default App
