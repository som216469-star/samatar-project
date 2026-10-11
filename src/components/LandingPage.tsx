import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (route: 'login' | 'signup' | 'dashboard') => void;
  isAuthenticated?: boolean;
  userEmail?: string;
}

const modules = [
  {
    number: '01',
    icon: Users,
    title: 'Maamulka ardayda',
    description: 'Diiwaangelin, xogta ardayga iyo profile-kiisa—si xogta muhiimka ahi hal meel uga muuqato.',
    tags: ['Diiwaangelin', 'Profiles'],
  },
  {
    number: '02',
    icon: CalendarCheck,
    title: 'Xaadirinta',
    description: 'Diiwaangeli imaanshaha maalinlaha ah, kala soco maqnaanshaha, kuna noqo taariikhda xaadirinta.',
    tags: ['Xaadirin maalinle', 'Taariikh'],
  },
  {
    number: '03',
    icon: WalletCards,
    title: 'Maaliyadda dugsiga',
    description: 'La soco khidmadaha ardayda iyo dhaqdhaqaaqa maaliyadeed adigoo xogta si nidaamsan u habeeya.',
    tags: ['Khidmadaha', 'Diiwaannada'],
  },
  {
    number: '04',
    icon: BookOpen,
    title: 'Fasalada iyo imtixaannada',
    description: 'Isku dubbarid fasallada, maaddooyinka, jadwalka iyo dhibcaha imtixaannada.',
    tags: ['Fasallo', 'Natiijooyin'],
  },
  {
    number: '05',
    icon: GraduationCap,
    title: 'Macallimiinta iyo shaqaalaha',
    description: 'Maamul xogta kooxdaada, doorarka shaqada iyo xaadirinta shaqaalaha.',
    tags: ['Kooxda', 'Doorarka'],
  },
  {
    number: '06',
    icon: BarChart3,
    title: 'Warbixinno iyo xog-koob',
    description: 'Ka hel xogta ardayda, xaadirinta, maaliyadda iyo waxbarashada warbixinno la fahmi karo.',
    tags: ['Warbixinno', 'Xog-koob'],
  },
];

const extraModules = [
  'Jadwalka casharrada',
  'Diiwaangelinta cusub',
  'Maktabadda',
  'Agabka dugsiga',
  'Ogeysiisyada',
  'Dejinta nidaamka',
];

const faqs = [
  {
    question: 'Yaa loogu talagalay QUANTORA?',
    answer: 'QUANTORA waxaa loogu talagalay maamulka dugsiga iyo macallimiinta. Shaqooyinka maalinlaha ah waxaa lagu habeeyaa qaybo isku xiran si kooxda dugsigu ugu shaqeyso si nidaamsan.',
  },
  {
    question: 'Ardayda ama waalidiintu ma leeyihiin login?',
    answer: 'Maya. Habka isticmaalka ee hadda jira wuxuu diiradda saarayaa labada door ee gudaha: maamulka iyo macallinka. Portal arday ama waalid laguma soo bandhigayo boggan.',
  },
  {
    question: 'Ma ku jiraa xaadirin, khidmadaha iyo natiijooyinka?',
    answer: 'Haa. Nidaamku wuxuu leeyahay qaybo loogu talagalay xaadirinta, maaliyadda, fasallada, maaddooyinka, imtixaannada iyo warbixinnada.',
  },
  {
    question: 'Sidee macallin loogu daraa nidaamka?',
    answer: 'Maamulka dugsigu wuxuu maamulaa gelitaanka kooxda. Socodka macallinka waxaa ku jira casuumaad iyo hawlgelin akoon, kadibna macallinku wuxuu ku geli karaa akoonkiisa.',
  },
  {
    question: 'Muuqaalka dashboard-ku ma muujinayaa xog dhab ah?',
    answer: 'Maya. Muuqaalka boggan ku jira waa tusaale naqshadeed oo sharxaya sida xogta loo habeeyo; tirooyinku ma aha xog toos ah oo laga soo qaaday dugsigaaga.',
  },
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function LandingPage({
  onNavigate,
  isAuthenticated = false,
  userEmail,
}: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const navigate = (route: 'login' | 'signup' | 'dashboard') => {
    setMenuOpen(false);
    onNavigate(route);
  };

  const goTo = (id: string) => {
    setMenuOpen(false);
    scrollToSection(id);
  };

  return (
    <div className="landing-root public-site min-h-screen antialiased">
      <a href="#main-content" className="public-skip-link">U gudub nuxurka</a>

      <header className="public-header">
        <div className="public-container public-nav">
          <a
            href="#top"
            className="public-brand"
            aria-label="QUANTORA — bogga hore"
            onClick={(event) => {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <span className="public-brand-mark" aria-hidden="true"><img src="/brand-mark.svg" alt="" /></span>
            <span className="public-brand-copy">
              <strong>QUANTORA</strong>
              <small>MAAMULKA DUGSIYADA</small>
            </span>
          </a>

          <nav className={'public-nav-links ' + (menuOpen ? 'is-open' : '')} aria-label="Hagidda bogga">
            <a href="#features" onClick={(event) => { event.preventDefault(); goTo('features'); }}>Astaamaha</a>
            <a href="#how-it-works" onClick={(event) => { event.preventDefault(); goTo('how-it-works'); }}>Sida uu u shaqeeyo</a>
            <a href="#access" onClick={(event) => { event.preventDefault(); goTo('access'); }}>Gelitaanka</a>
            <a href="#faq" onClick={(event) => { event.preventDefault(); goTo('faq'); }}>Su'aalaha</a>
            <div className="public-mobile-actions">
              {isAuthenticated ? (
                <button className="public-btn public-btn-primary" onClick={() => navigate('dashboard')}>Fur nidaamka <ArrowRight size={16} /></button>
              ) : (
                <>
                  <button className="public-btn public-btn-quiet" onClick={() => navigate('login')}>Gal akoonka</button>
                  <button className="public-btn public-btn-primary" onClick={() => navigate('signup')}>Bilow <ArrowRight size={16} /></button>
                </>
              )}
            </div>
          </nav>

          <div className="public-nav-actions">
            {isAuthenticated ? (
              <button className="public-btn public-btn-primary" onClick={() => navigate('dashboard')}>Fur nidaamka <ArrowUpRight size={16} /></button>
            ) : (
              <>
                <button className="public-btn public-btn-quiet public-desktop-login" onClick={() => navigate('login')}>Gal akoonka</button>
                <button className="public-btn public-btn-primary public-desktop-start" onClick={() => navigate('signup')}>Bilow <ArrowRight size={16} /></button>
              </>
            )}
          </div>

          <button
            className="public-menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Xir menu-ga' : 'Fur menu-ga'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main id="main-content">
        <section className="public-hero public-section" id="top">
          <div className="public-container public-hero-grid">
            <div className="public-hero-copy">
              <div className="public-eyebrow"><span className="public-eyebrow-dot" /> HAL NIDAAM • SHAQOOYIN ISKU XIRAN</div>
              <h1>Maamul dugsigaaga.<span> Hal meel. Si cad.</span></h1>
              <p className="public-hero-lead">
                QUANTORA wuxuu isku keenaa xogta ardayda, xaadirinta, maaliyadda,
                waxbarashada iyo shaqaalaha—si hawlaha dugsigaagu u noqdaan kuwo
                sahlan in la habeeyo lana raaco.
              </p>
              <div className="public-hero-actions">
                <button className="public-btn public-btn-primary public-btn-large" onClick={() => navigate(isAuthenticated ? 'dashboard' : 'signup')}>
                  {isAuthenticated ? 'Fur dashboard-ka' : 'Bilow dejinta dugsiga'} <ArrowRight size={18} />
                </button>
                <button className="public-btn public-btn-outline public-btn-large" onClick={() => goTo('product-preview')}>
                  Eeg muuqaalka <span className="public-play-icon">↗</span>
                </button>
              </div>
              <div className="public-hero-note"><ShieldCheck size={17} /><span>Gelitaan loogu talagalay maamulka iyo macallimiinta.</span></div>
              <div className="public-hero-tags" aria-label="Qaybaha muhiimka ah">
                <span>Arday</span><i /><span>Xaadirin</span><i /><span>Maaliyad</span><i /><span>Natiijooyin</span>
              </div>
            </div>

            <div className="public-hero-visual" id="product-preview">
              <div className="public-glow public-glow-one" aria-hidden="true" />
              <div className="public-glow public-glow-two" aria-hidden="true" />
              <div className="public-dashboard-window">
                <div className="public-window-top">
                  <div className="public-window-brand">
                    <span className="public-window-icon"><LayoutDashboard size={15} /></span>
                    <span>QUANTORA <small>WORKSPACE</small></span>
                  </div>
                  <span className="public-demo-pill"><span /> MUUQAAL TUSAALE AH</span>
                </div>
                <div className="public-demo-body">
                  <aside className="public-demo-sidebar" aria-label="Tusaale navigation">
                    <div className="public-demo-side-brand"><img src="/brand-mark.svg" alt="" /></div>
                    <div className="public-demo-side-item is-active"><LayoutDashboard size={16} /></div>
                    <div className="public-demo-side-item"><Users size={16} /></div>
                    <div className="public-demo-side-item"><CalendarCheck size={16} /></div>
                    <div className="public-demo-side-item"><WalletCards size={16} /></div>
                    <div className="public-demo-side-item"><BarChart3 size={16} /></div>
                  </aside>
                  <div className="public-demo-main">
                    <div className="public-demo-heading">
                      <div><span className="public-demo-overline">GUUDMAR</span><h3>Aragtida dugsiga</h3></div>
                      <div className="public-demo-avatar">DP</div>
                    </div>
                    <div className="public-demo-stat-grid">
                      <div className="public-demo-stat"><span>Ardayda</span><strong>1,248</strong><small><Users size={12} /> Tusaale xog</small></div>
                      <div className="public-demo-stat"><span>Xaadirinta</span><strong>92%</strong><small><CalendarCheck size={12} /> Tusaale xog</small></div>
                      <div className="public-demo-stat"><span>Khidmadaha</span><strong>$4,860</strong><small><WalletCards size={12} /> Tusaale xog</small></div>
                    </div>
                    <div className="public-demo-lower-grid">
                      <div className="public-demo-chart">
                        <div className="public-demo-card-heading"><span>Isbeddelka xaadirinta</span><span>7 maalmood</span></div>
                        <div className="public-chart-bars" aria-label="Jaantus tusaale ah">
                          {[42, 67, 52, 80, 62, 92, 74].map((height, index) => (
                            <div className="public-chart-bar-wrap" key={index}>
                              <span className="public-chart-bar" style={{ height: String(height) + '%' }} />
                              <small>{['Is', 'T', 'Ar', 'Kh', 'J', 'Sb', 'Ax'][index]}</small>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="public-demo-activity">
                        <div className="public-demo-card-heading"><span>Hawlaha</span><span>Maanta</span></div>
                        <div className="public-demo-activity-row">
                          <span className="public-activity-icon cyan"><Users size={13} /></span>
                          <span><b>Arday</b><small>Xogta ardayga</small></span><Check size={14} />
                        </div>
                        <div className="public-demo-activity-row">
                          <span className="public-activity-icon blue"><CalendarCheck size={13} /></span>
                          <span><b>Xaadirin</b><small>Diiwaanka maalinta</small></span><Check size={14} />
                        </div>
                        <div className="public-demo-activity-row">
                          <span className="public-activity-icon amber"><WalletCards size={13} /></span>
                          <span><b>Maaliyad</b><small>Diiwaanka khidmadaha</small></span><ArrowUpRight size={14} />
                        </div>
                      </div>
                    </div>
                    <p className="public-demo-disclaimer">Tani waa tusaale muuqaal ah; tirooyinku ma aha xog dugsi oo dhab ah.</p>
                  </div>
                </div>
              </div>
              <div className="public-float-note public-float-note-top">
                <span className="public-float-icon"><Sparkles size={17} /></span>
                <span><b>Shaqooyin isku xiran</b><small>Hal meel oo laga maamulo</small></span>
              </div>
              <div className="public-float-note public-float-note-bottom">
                <span className="public-float-icon public-float-icon-check"><Check size={17} /></span>
                <span><b>Hab shaqo oo cad</b><small>Macluumaad si nidaamsan u habaysan</small></span>
              </div>
            </div>
          </div>
        </section>

        <section className="public-capability-strip" aria-label="Qaybaha nidaamka">
          <div className="public-container public-capability-inner">
            <span className="public-capability-label">HAL NIDAAM OO ISKU KEENA</span>
            <span><Users size={17} /> Ardayda</span>
            <span><CalendarCheck size={17} /> Xaadirinta</span>
            <span><WalletCards size={17} /> Maaliyadda</span>
            <span><BookOpen size={17} /> Waxbarashada</span>
            <span><BarChart3 size={17} /> Warbixinnada</span>
          </div>
        </section>

        <section className="public-section public-features" id="features">
          <div className="public-container">
            <div className="public-section-heading">
              <div className="public-eyebrow"><span className="public-eyebrow-dot" /> QAYBAHA NIDAAMKA</div>
              <h2>Wax kasta oo muhiim ah,<br /><span>meel si fiican loo habeeyey.</span></h2>
              <p>U kala maamul hawlaha dugsiga qaybo cad—adigoo ka fogaanaya in xogta muhiimka ahi ku kala firdhato faylal iyo habab kala duwan.</p>
            </div>
            <div className="public-module-grid">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <article className="public-module-card" key={module.number}>
                    <div className="public-module-card-top">
                      <span className="public-module-icon"><Icon size={22} strokeWidth={1.8} /></span>
                      <span className="public-module-number">{module.number}</span>
                    </div>
                    <h3>{module.title}</h3>
                    <p>{module.description}</p>
                    <div className="public-module-tags">{module.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  </article>
                );
              })}
            </div>
            <div className="public-extra-modules">
              <span className="public-extra-label">QAYBO KALE OO KU JIRA</span>
              <div className="public-extra-tags">{extraModules.map((module) => <span key={module}><Check size={13} />{module}</span>)}</div>
            </div>
          </div>
        </section>

        <section className="public-section public-access" id="access">
          <div className="public-container public-access-grid">
            <div className="public-access-copy">
              <div className="public-eyebrow"><span className="public-eyebrow-dot" /> GELITAAN IYO MAS'UULIYAD</div>
              <h2>Qof kastaa ha arko<br /><span>waxa shaqadiisa khuseeya.</span></h2>
              <p>Khibradda isticmaalka waxaa loo habeeyey laba door oo gudaha ah. Maamulka ayaa isku dubbarida hawlaha dugsiga, macallinkuna wuxuu ka shaqeeyaa qaybaha la xiriira shaqadiisa.</p>
              <div className="public-access-points">
                <div><span className="public-check-mark"><Check size={15} /></span><span><b>Maamulka dugsiga</b><small>Dejinta iyo isku dubbaridka shaqada dugsiga.</small></span></div>
                <div><span className="public-check-mark"><Check size={15} /></span><span><b>Macallinka</b><small>Gelitaan akoon oo ku salaysan habka hawlgelinta macallinka.</small></span></div>
                <div><span className="public-check-mark"><Check size={15} /></span><span><b>Hal meel oo shaqo</b><small>Qaybaha muhiimka ah oo ku jira isla nidaamka.</small></span></div>
              </div>
              <button className="public-text-link" onClick={() => goTo('how-it-works')}>Baro sida loo bilaabo <ArrowRight size={16} /></button>
            </div>

            <div className="public-access-visual">
              <div className="public-access-card public-access-card-admin">
                <span className="public-access-card-icon"><ShieldCheck size={22} /></span>
                <div><span className="public-access-label">DOOR 01</span><h3>Maamulka</h3><p>Aragti guud iyo maamul hawleed.</p></div>
                <span className="public-role-status">Admin</span>
              </div>
              <div className="public-access-connector"><span /><span /><span /></div>
              <div className="public-access-card public-access-card-teacher">
                <span className="public-access-card-icon"><GraduationCap size={22} /></span>
                <div><span className="public-access-label">DOOR 02</span><h3>Macallinka</h3><p>Shaqada waxbarashada iyo diiwaannada.</p></div>
                <span className="public-role-status">Teacher</span>
              </div>
              <div className="public-access-note"><ShieldCheck size={16} /><span>Ma jiro portal arday ama waalid oo lagu xayeysiinayo halkan.</span></div>
            </div>
          </div>
        </section>

        <section className="public-section public-workflow" id="how-it-works">
          <div className="public-container">
            <div className="public-section-heading public-section-heading-centered">
              <div className="public-eyebrow"><span className="public-eyebrow-dot" /> BILOW SI NIDAAMSAN</div>
              <h2>Ka bilow aasaaska.<br /><span>U gudub shaqada maalinlaha ah.</span></h2>
              <p>Hab kooban oo kaa caawinaya inaad si habaysan u dejiso isticmaalka nidaamka.</p>
            </div>
            <div className="public-workflow-grid">
              <article className="public-workflow-step">
                <div className="public-workflow-top"><span className="public-step-number">01</span><span className="public-step-icon"><LayoutDashboard size={21} /></span></div>
                <h3>Deji dugsiga</h3><p>Bilow xogta aasaasiga ah, fasallada iyo maaddooyinka loo baahan yahay.</p>
              </article>
              <article className="public-workflow-step">
                <div className="public-workflow-top"><span className="public-step-number">02</span><span className="public-step-icon"><Users size={21} /></span></div>
                <h3>Diyaari kooxda iyo xogta</h3><p>Habee xogta ardayda, maamul akoonnada shaqaalaha, una diyaari macallimiinta gelitaanka.</p>
              </article>
              <article className="public-workflow-step">
                <div className="public-workflow-top"><span className="public-step-number">03</span><span className="public-step-icon"><BarChart3 size={21} /></span></div>
                <h3>Maamul oo dib u eeg</h3><p>La soco xaadirinta, khidmadaha, imtixaannada iyo warbixinnada marka shaqadu socoto.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="public-section public-faq" id="faq">
          <div className="public-container public-faq-grid">
            <div className="public-faq-intro">
              <div className="public-eyebrow"><span className="public-eyebrow-dot" /> SU'AALO BADAN LA IS WEYDIIYO</div>
              <h2>Waxyaabaha aad<br /><span>rabto inaad ogaato.</span></h2>
              <p>Faahfaahin kooban oo ku saabsan isticmaalka iyo qaybaha QUANTORA.</p>
              <div className="public-faq-help"><span><ShieldCheck size={19} /></span><div><b>Gelitaan cad</b><small>Habka koontooyinka waxaa maamula nidaamka gelitaanka.</small></div></div>
            </div>
            <div className="public-faq-list">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <article className={'public-faq-item ' + (isOpen ? 'is-open' : '')} key={faq.question}>
                    <button className="public-faq-question" aria-expanded={isOpen} onClick={() => setOpenFaq(isOpen ? null : index)}>
                      <span>{faq.question}</span><ChevronDown size={18} />
                    </button>
                    {isOpen && <p className="public-faq-answer">{faq.answer}</p>}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="public-final-cta">
          <div className="public-container public-final-cta-inner">
            <div className="public-final-cta-glow" aria-hidden="true" />
            <span className="public-final-icon"><img src="/brand-mark.svg" alt="" /></span>
            <div className="public-final-copy">
              <div className="public-eyebrow"><span className="public-eyebrow-dot" /> QUANTORA</div>
              <h2>Diyaar u ah inaad habayso<br /><span>shaqada dugsigaaga?</span></h2>
              <p>Ka bilow nidaamka, ama gal akoonkaaga haddii dugsigaagu hore u isticmaalo.</p>
            </div>
            <div className="public-final-actions">
              <button className="public-btn public-btn-primary public-btn-large" onClick={() => navigate(isAuthenticated ? 'dashboard' : 'signup')}>
                {isAuthenticated ? 'Fur nidaamka' : 'Bilow hadda'} <ArrowRight size={17} />
              </button>
              <button className="public-btn public-btn-outline public-btn-large" onClick={() => navigate('login')}>Gal akoonka</button>
            </div>
          </div>
        </section>

        <section className="public-section public-contact" id="contact">
          <div className="public-container">
            <div className="public-contact-heading">
              <div className="public-eyebrow"><span className="public-eyebrow-dot" /> CONTACT US</div>
              <h2>Su'aal ma qabtaa?<br /><span>Waan kula joognaa.</span></h2>
              <p>Nala soo xiriir si aad wax uga ogaato QUANTORA, una hesho caawimaad ama macluumaad dheeraad ah.</p>
            </div>

            <div className="public-contact-grid">
              <a className="public-contact-card public-contact-whatsapp" href="https://wa.me/252636270866" target="_blank" rel="noreferrer" aria-label="Nagala soo xiriir WhatsApp">
                <span className="public-contact-icon"><MessageCircle size={22} /></span>
                <span className="public-contact-label">WHATSAPP</span>
                <strong>+252 63 6270866</strong>
                <small>Farriin noo soo dir WhatsApp</small>
                <span className="public-contact-action">WhatsApp kala xiriir <ArrowUpRight size={15} /></span>
              </a>

              <a className="public-contact-card" href="tel:+252636270866" aria-label="Wac Telesom">
                <span className="public-contact-icon"><Phone size={22} /></span>
                <span className="public-contact-label">TELESOM</span>
                <strong>+252 63 6270866</strong>
                <small>Telefoonka Telesom</small>
                <span className="public-contact-action">Hadda wac <ArrowRight size={15} /></span>
              </a>

              <a className="public-contact-card" href="tel:+252656270866" aria-label="Wac Somtel">
                <span className="public-contact-icon"><Phone size={22} /></span>
                <span className="public-contact-label">SOMTEL</span>
                <strong>+252 65 6270866</strong>
                <small>Telefoonka Somtel</small>
                <span className="public-contact-action">Hadda wac <ArrowRight size={15} /></span>
              </a>

              <a className="public-contact-card public-contact-email" href="mailto:dugsipro1@gmail.com" aria-label="Email u dir QUANTORA">
                <span className="public-contact-icon"><Mail size={22} /></span>
                <span className="public-contact-label">EMAIL</span>
                <strong>dugsipro1@gmail.com</strong>
                <small>Nagu soo dir email</small>
                <span className="public-contact-action">Email noo dir <ArrowUpRight size={15} /></span>
              </a>
            </div>

            <div className="public-contact-bottom">
              <span className="public-contact-bottom-icon"><ShieldCheck size={18} /></span>
              <span><strong>Si toos ah noola xiriir.</strong><small>Dooro habka adiga kuugu habboon—WhatsApp, telefoon ama email.</small></span>
            </div>
          </div>
        </section>

      </main>

      <footer className="public-footer">
        <div className="public-container">
          <div className="public-footer-main">
            <div className="public-footer-brand">
              <a href="#top" className="public-brand" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <span className="public-brand-mark" aria-hidden="true"><img src="/brand-mark.svg" alt="" /></span>
                <span className="public-brand-copy"><strong>QUANTORA</strong><small>MAAMULKA DUGSIYADA</small></span>
              </a>
              <p>Qalab mideysan oo loogu talagalay maareynta hawlaha dugsiga.</p>
            </div>
            <div className="public-footer-col"><b>NIDAAMKA</b><a href="#features" onClick={(event) => { event.preventDefault(); goTo('features'); }}>Astaamaha</a><a href="#how-it-works" onClick={(event) => { event.preventDefault(); goTo('how-it-works'); }}>Sida uu u shaqeeyo</a><a href="#access" onClick={(event) => { event.preventDefault(); goTo('access'); }}>Gelitaanka</a></div>
            <div className="public-footer-col"><b>AKOONKA</b><a href="#contact" onClick={(event) => { event.preventDefault(); goTo('contact'); }}>Contact Us</a><button onClick={() => navigate('login')}>Gal akoonka</button><button onClick={() => navigate('signup')}>Bilow dejinta</button><a href="#faq" onClick={(event) => { event.preventDefault(); goTo('faq'); }}>Su'aalaha</a></div>
          </div>
          <div className="public-footer-bottom">
            <span>© 2026 QUANTORA. Dhammaan xuquuqdu way dhawran tahay.</span>
            <span className="public-footer-status"><span /> Nidaam maamul dugsi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
