import { useState, useEffect } from 'react';
const API_URL = 'http://localhost:3000/api';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import logoBlackImg from './assets/images/logo/UES-BLACK.png';
import heroVideo from './assets/videos/ues.mp4';
import conferencista1Img from './assets/images/conferencistas/1.png';
import conferencista2Img from './assets/images/conferencistas/2.jpg';
import conferencista3Img from './assets/images/conferencistas/3.jpg';
import conferencista4Img from './assets/images/conferencistas/4.png';
import conferencista5Img from './assets/images/conferencistas/5.jpg';
import conferencista6Img from './assets/images/conferencistas/6.jpg';
import conferencista7Img from './assets/images/conferencistas/7.jpg';
import conferencista8Img from './assets/images/conferencistas/8.jpg';
import RegisterSpeakers from './pages/RegisterSpeakers';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CambiarContraseña from './pages/CambiarContraseña';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ConferencistasSection from './sections/mosaico/ConferencistasSection';
import EscenariosSection from './sections/mosaico/EscenariosSection';
import ConferenciasSection from './sections/mosaico/ConferenciasSection';
import InstitucionesInvitadasMosaicoSection from './sections/mosaico/InstitucionesInvitadasMosaicoSection';

// TopNavBar Component
function TopNavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    
    // 1. Si no estamos en la página de inicio (ej. estamos en /login), redirigir a la principal
    if (window.location.pathname !== '/') {
      window.location.href = `/#${targetId}`;
      return;
    }

    // 2. Si ya estamos en la página principal, hacemos el scroll suave calculado
    const element = document.getElementById(targetId);
    if (element) {
      const offset = 80; // Altura aproximada de tu barra superior (navbar)
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;
      
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      
      // Actualizar la URL visualmente sin recargar la página
      window.history.pushState(null, '', `/#${targetId}`);
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#2b5000] shadow-sm border-b border-[#1a3000]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Navbar */}
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Menu Button */}
          <div className="flex items-center gap-4">
            <button
              id="menubutton"
              aria-haspopup="true"
              aria-controls="menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center text-white"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <Link to="/" className="flex items-center gap-2 min-w-0">
              <img
                src={logoBlackImg}
                alt="Logo Jornada Académica"
                className="h-9 w-auto object-contain brightness-0 invert"
              />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-8 px-8">
            <a href="/#evento" onClick={(e) => handleNavClick(e, 'evento')} className="text-sm font-medium text-white hover:text-gray-200 transition-colors">
              El Evento
            </a>
            <a href="/#programa" onClick={(e) => handleNavClick(e, 'programa')} className="text-sm font-medium text-white hover:text-gray-200 transition-colors">
              Programa por Día
            </a>
            <a href="/#instituciones" onClick={(e) => handleNavClick(e, 'instituciones')} className="text-sm font-medium text-white hover:text-gray-200 transition-colors">
              Instituciones
            </a>
            <a href="/#contacto" onClick={(e) => handleNavClick(e, 'contacto')} className="text-sm font-medium text-white hover:text-gray-200 transition-colors">
              Contacto
            </a>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#1a3000] rounded-md hover:bg-[#0f1a00] transition-colors border border-white/20"
            >
              Iniciar Sesión
              <span className="material-symbols-outlined text-base">login</span>
            </Link>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="menu" className="md:hidden border-t border-[#1a3000] bg-[#1a3000] py-4">
            <div className="space-y-2">
              <a
                href="/#evento"
                onClick={(e) => handleNavClick(e, 'evento')}
                className="block px-4 py-2 text-white hover:bg-[#2b5000] rounded"
              >
                El Evento
              </a>
              <a
                href="/#programa"
                onClick={(e) => handleNavClick(e, 'programa')}
                className="block px-4 py-2 text-white hover:bg-[#2b5000] rounded"
              >
                Programa por Día
              </a>
              <a
                href="/#instituciones"
                onClick={(e) => handleNavClick(e, 'instituciones')}
                className="block px-4 py-2 text-white hover:bg-[#2b5000] rounded"
              >
                Instituciones
              </a>
              <a
                href="/#contacto"
                onClick={(e) => handleNavClick(e, 'contacto')}
                className="block px-4 py-2 text-white hover:bg-[#2b5000] rounded"
              >
                Contacto
              </a>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block mt-4 px-4 py-2 text-center text-white bg-[#0f1a00] rounded hover:bg-black font-semibold"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// Countdown Item Component
function CountdownItem({ value, label }) {
  return (
    <div className="flex flex-col items-center m-2">
      <div className="relative group">
        <div className="absolute inset-0 bg-[#2b5000] rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
        <div className="relative bg-white border border-[#2b5000]/10 rounded-2xl w-28 h-28 md:w-36 md:h-36 flex items-center justify-center shadow-lg group-hover:-translate-y-2 group-hover:shadow-2xl transition-all duration-500 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-black/5 to-transparent"></div>
          <span className="text-5xl md:text-7xl font-black text-[#1a3000] drop-shadow-sm">
            {String(value).padStart(2, '0')}
          </span>
        </div>
      </div>
      <p className="text-[#2b5000] font-bold uppercase mt-5 tracking-[0.25em] text-sm md:text-base">{label}</p>
    </div>
  );
}

// Countdown Component
function getFirstBusinessDay(year, monthIndex = 11) {

  // monthIndex: 0-11 (default 11 = December).
  // We want the Monday of the first complete week (Sunday-Saturday) of December.
  // First, find December 1st.
  let d = new Date(year, monthIndex, 1);
  
  // Calculate days to add to reach the next Sunday (0) or stay on Sunday if it's already Sunday.
  // getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday.
  const dayOfWeek = d.getDay();
  const daysToAdd = (7 - dayOfWeek) % 7; // If it's Sunday (0), daysToAdd is 0. If Monday (1), daysToAdd is 6.
  
  // d is now the Sunday of the first complete week that starts on or after Dec 1st.
  d.setDate(d.getDate() + daysToAdd);
  
  // Add 1 day to get the Monday of that week.
  d.setDate(d.getDate() + 1);
  // normalize to start of day
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeTimeLeft(target) {
  const now = new Date();
  let diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  diff -= days * 1000 * 60 * 60 * 24;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * 1000 * 60 * 60;
  const minutes = Math.floor(diff / (1000 * 60));
  diff -= minutes * 1000 * 60;
  const seconds = Math.floor(diff / 1000);
  return { days, hours, minutes, seconds };
}

function formatProgramDate(dateValue) {
  if (typeof dateValue !== 'string') {
    return null;
  }

  const parts = dateValue.split('-').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  const [year, month, dayOfMonth] = parts;
  const date = new Date(year, month - 1, dayOfMonth);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
  const day = String(date.getDate()).padStart(2, '0');
  return {
    dayName: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    dateLabel: `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day}`,
    key: date.toISOString().slice(0, 10),
  };
}

function groupSpeakersByDate(speakers) {
  const grouped = new Map();

  speakers.forEach((speaker) => {
    const formatted = formatProgramDate(speaker.suggested_date);
    if (!formatted) {
      return;
    }

    const entry = grouped.get(formatted.key) || {
      dayName: formatted.dayName,
      date: formatted.dateLabel,
      theme: 'Ponencias registradas',
      borderColor: 'border-primary',
      activities: [],
    };

    entry.activities.push({
      time: 'Pendiente',
      title: speaker.conference_name || 'Ponencia registrada',
      location: [speaker.full_name, speaker.institution, speaker.career].filter(Boolean).join(' · '),
      details: [
        speaker.biografia,
        speaker.phone ? `Tel: ${speaker.phone}` : null,
        speaker.social_media ? `Red: ${speaker.social_media}` : null,
        speaker.audience_capacity ? `Cupo: ${speaker.audience_capacity}` : null,
      ].filter(Boolean).join(' | '),
      tag: speaker.academic_level || 'Ponencia',
      tagBg: 'bg-secondary-container',
      tagText: 'text-on-secondary-container',
    });

    grouped.set(formatted.key, entry);
  });

  return Array.from(grouped.entries())
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([, value]) => value);
}

function Countdown() {
  const target = getFirstBusinessDay(new Date().getFullYear(), 11); // first business day of December of the current year
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(target));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(computeTimeLeft(target));
    }, 1000);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-8 lg:gap-12 mt-12">
      <CountdownItem value={timeLeft.days} label="Días" />
      <CountdownItem value={timeLeft.hours} label="Horas" />
      <CountdownItem value={timeLeft.minutes} label="Minutos" />
      <CountdownItem value={timeLeft.seconds} label="Segundos" />
    </div>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden px-6 py-16 bg-black">
      <figure className="absolute inset-0 w-full h-full m-0 p-0 pointer-events-none">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src={heroVideo} type="video/mp4" />
          Tu navegador no soporta video HTML5.
        </video>
      </figure>
      
    </section>
  );
}

// Mosaico Section
function MosaicoSection() {
  const tiles = [
    {
      id: 0,
      title: "Conferencistas",
      mobileImg: conferencista1Img,
      desktopImg: conferencista1Img,
      alt: "Conferencistas",
      overlayColor: "bg-green-700/60",
      hoverColor: "group-hover:bg-[#73243c]/70",
      href: "#conferencistas"
    },
    {
      id: 1,
      title: "Escenarios",
      mobileImg: conferencista2Img,
      desktopImg: conferencista2Img,
      alt: "Escenarios",
      overlayColor: "bg-green-700/60",
      hoverColor: "group-hover:bg-[#73243c]/70",
      href: "#escenarios"
    },
    {
      id: 2,
      title: "Conferencias",
      mobileImg: conferencista3Img,
      desktopImg: conferencista3Img,
      alt: "Conferencias",
      overlayColor: "bg-green-700/60",
      hoverColor: "group-hover:bg-[#73243c]/70",
      href: "#conferencias"
    },
    {
      id: 3,
      title: "Instituciones Invitadas",
      mobileImg: conferencista4Img,
      desktopImg: conferencista4Img,
      alt: "Instituciones Invitadas",
      overlayColor: "bg-green-700/60",
      hoverColor: "group-hover:bg-[#73243c]/70",
      href: "#instituciones-invitadas"
    }
  ];

  return (
    <section className="py-8 bg-white relative z-20 -mt-4 shadow-xl rounded-t-3xl scroll-mt-20" id="mosaico">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mosaico grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" formato="grid" escala="chica" coloractivo="blue" colorinactivo="blue" controlesocultos="0" anchosfijos="0" role="rowgroup">
          {tiles.map((tile) => (
            <div 
              key={tile.id}
              className="azulejo relative overflow-hidden rounded-xl aspect-[4/3] group" 
              tipo-de-fondo="imagen" 
              estado="inactivo" 
              funcionalidad="enlace" 
              etiqueta="texto-centrado" 
              role="row" 
              orden_lg="0" 
              orden_md="0" 
              orden_sm={tile.id < 2 ? "0" : "2"} 
              azulejo-id={tile.id} 
              style={{ order: 0 }}
            >
              <div className="azulejo__contenedor azulejo__contenedor-- w-full h-full">
                <a href={tile.href || "#"} className="w-full h-full block">
                  <div className="azulejo__imagen_de_fondo azulejo__imagen_de_fondo-- w-full h-full">
                    <img 
                      className="azulejo__imagen_de_fondo__img azulejo__imagen_de_fondo__img--chica w-full h-full object-cover md:hidden" 
                      src={tile.mobileImg} 
                      alt={tile.alt} 
                    />
                    <img 
                      className="azulejo__imagen_de_fondo__img azulejo__imagen_de_fondo__img--grande w-full h-full object-cover hidden md:block group-hover:scale-105 transition-transform duration-500" 
                      src={tile.desktopImg} 
                      alt={tile.alt} 
                    />
                  </div>
                  <span className={`azulejo__contenido azulejo__contenido-- absolute inset-0 flex items-center justify-center text-white font-bold text-xl transition-colors ${tile.overlayColor} ${tile.hoverColor}`}>
                    {tile.title}
                  </span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


// El Evento Section
function ElEventoSection() {
  const [activeTab, setActiveTab] = useState('conferencias');

  const tabsContent = {
    conferencias: {
      icon: "record_voice_over",
      title: "Conferencias",
      description: "Diálogos con expertos nacionales e internacionales sobre los retos de la tecnología y la sociedad actual.",
      details: "Nuestras conferencias reúnen a especialistas y líderes de opinión que comparten sus experiencias, investigaciones y perspectivas sobre temas relevantes en tecnología, innovación y desarrollo social. Un espacio para aprender de los mejores.",
      image: conferencista8Img
    },
    talleres: {
      icon: "architecture",
      title: "Talleres",
      description: "Sesiones prácticas diseñadas para potenciar habilidades técnicas y el pensamiento creativo.",
      details: "Talleres interactivos donde podrás adquirir nuevas competencias, experimentar con herramientas innovadoras y trabajar de la mano con profesionales en ambientes colaborativos. Aprende haciendo.",
      image: conferencista6Img
    },
    certamenes: {
      icon: "emoji_events",
      title: "Certámenes y Competencias",
      description: "Espacios de competición que permiten demostrar tus habilidades y conocimientos frente a pares.",
      details: "Participa en competiciones académicas, hackathons y desafíos diseñados para poner a prueba tus capacidades. Estos eventos ofrecen oportunidades de reconocimiento, networking y premios para los destacados.",
      image: conferencista5Img
    },
    actividades: {
      icon: "theater_comedy",
      title: "Actividades Culturales",
      description: "Presentaciones artísticas que celebran la identidad mexiquense y la expresión cultural universitaria.",
      details: "Expresión artística que complementa el conocimiento académico. Música, danza, teatro y otras manifestaciones culturales que enriquecen la experiencia de los participantes.",
      image: conferencista7Img
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center scroll-mt-20" id="evento">
      <div className="max-w-7xl mx-auto px-6 w-full">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-headline font-extrabold mt-2 text-gray-900 mb-4">La Jornada Académica y Cultural</h2>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg">
            Un espacio de convergencia para el talento, la investigación, inovación y el arte.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          {Object.entries(tabsContent).map(([key, tab]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === key
                  ? 'bg-[#2b5000] text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#2b5000]'
              }`}
            >
              <span className="material-symbols-outlined">{tab.icon}</span>
              <span>{tab.title}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="relative min-h-[400px]">
          {Object.entries(tabsContent).map(([key, tab]) => (
            activeTab === key && (
              <div
                key={key}
                className="animate-fadeIn"
              >
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left Content */}
                    <div className="p-12 flex flex-col justify-center">
                      <div className="mb-8">
                        <div className="w-16 h-16 bg-[#2b5000]/10 rounded-xl flex items-center justify-center text-[#2b5000] mb-6">
                          <span className="material-symbols-outlined text-4xl">{tab.icon}</span>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900 mb-4">{tab.title}</h3>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">{tab.description}</p>
                        <div className="w-12 h-1 bg-[#2b5000] rounded mb-6"></div>
                        <p className="text-gray-700 leading-relaxed">{tab.details}</p>
                      </div>
                    </div>

                    {/* Right Visual */}
                    <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-[#2b5000]/5 to-[#2b5000]/10 p-12 overflow-hidden">
                      <img 
                        src={tab.image} 
                        alt="Jornada Académica" 
                        className="w-full h-full object-cover rounded-lg shadow-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </section>
  );
}

// Countdown Section
function CountdownSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Elementos decorativos */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#2b5000] opacity-5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-4xl font-headline font-extrabold mt-2 text-gray-900 mb-4 text-center">El evento empieza en:</h2>
        <p className="text-gray-500 max-w-2xl mx-auto mb-8">Prepárate para vivir una experiencia única llena de aprendizaje, innovación y cultura.</p>
        <Countdown />
      </div>
    </section>
  );
}

// Programa Section
function ProgramaSection() {
  const [selectedDay, setSelectedDay] = useState(0);

  const defaultDays = [
    {
      dayName: 'Martes',
      date: 'Martes 09',
      theme: 'Ponencias registradas',
      borderColor: 'border-primary',
      activities: [
        {
          time: 'Pendiente',
          title: 'A Presentación de arte, del CSS como pincel y HTML como lienzo',
          location: 'Alejadra Moreno Leon · Secretaria de Cultura · Ingeneria de sistemas',
          details: 'SOCIOLOGA | Tel: +525633470252 | Red: https://www.google.com/ | Cupo: 150',
          tag: 'Maestría',
          tagBg: 'bg-secondary-container',
          tagText: 'text-on-secondary-container',
        },
        {
          time: 'Pendiente',
          title: 'Modelos educativos de l NEM',
          location: 'Mtro.. Edgar Cruz · IPN · Ingeneria de sistemas',
          details: 'Profesional del àrea... | Tel: +525633470252 | Red: https://www.google.com/ | Cupo: 50',
          tag: 'Maestría',
          tagBg: 'bg-secondary-container',
          tagText: 'text-on-secondary-container',
        },
      ],
    },
  ];

  // Load registered speakers: try backend `/api/speakers`, then localStorage, then defaults
  const [days, setDays] = useState(() => {
    try {
      const raw = localStorage.getItem('registeredEvents');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {
      // ignore parse errors
    }
    return defaultDays;
  });

  useEffect(() => {
    let mounted = true;
    async function loadProgram() {
      try {
        const res = await fetch(`${API_URL}/speakers`);
        if (!res.ok) {
          return; // keep current days (localStorage or defaults)
        }
        const speakers = await res.json();
        const groupedDays = groupSpeakersByDate(Array.isArray(speakers) ? speakers : []);
        if (mounted && groupedDays.length) {
          setDays(groupedDays);
        }
      } catch (err) {
        // network or parse error: silently ignore and keep fallback
        console.warn('Could not fetch speakers from API, using local data', err);
      }
    }

    loadProgram();
    return () => { mounted = false; };
  }, []);

  const currentDay = days[selectedDay];

  return (
    <section className="py-24 scroll-mt-20" id="programa">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-headline font-extrabold">Programa por Día</h2>
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {days.map((d, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedDay(idx)}
                className={`px-8 py-3 rounded-full font-bold transition-all scale-98-active ${
                  idx === selectedDay
                    ? "bg-primary text-on-primary shadow-lg"
                    : "bg-secondary-container text-on-secondary-container hover:bg-primary-fixed-dim"
                }`}
              >
                {d.dayName}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
              <div className={`md:col-span-1 py-4 border-l-4 ${currentDay.borderColor} pl-6`}>
                <h3 className="text-2xl font-bold text-primary">{currentDay.date}</h3>
                <p className="text-on-surface-variant font-medium">{currentDay.theme}</p>
              </div>
              <div className="md:col-span-3 space-y-4">
                {currentDay.activities.map((activity, idx) => (
                  <div key={idx} className="bg-surface-container flex flex-col md:flex-row items-center p-6 rounded-xl group hover:bg-white transition-colors border border-transparent hover:border-primary/10">
                    <span className="text-lg font-black text-primary w-24">{activity.time}</span>
                    <div className="flex-grow">
                      <h4 className="text-xl font-bold">{activity.title}</h4>
                      <p className="text-on-surface-variant text-sm">{activity.location}</p>
                      {activity.details ? (
                        <p className="text-on-surface-variant text-sm mt-1">{activity.details}</p>
                      ) : null}
                    </div>
                    <span className={`px-4 py-1 ${activity.tagBg} ${activity.tagText} rounded-full text-xs font-bold uppercase mt-4 md:mt-0`}>
                      {activity.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Instituciones Invitadas Section
function InstitucionesInvitadasSection() {
  const logos = [
    { id: 1, name: "Institución 1" },
    { id: 2, name: "Institución 2" },
    { id: 3, name: "Institución 3" },
    { id: 4, name: "Institución 4" },
    { id: 5, name: "Institución 5" },
    { id: 6, name: "Institución 6" },
    { id: 7, name: "Institución 7" },
    { id: 8, name: "Institución 8" },
  ];

  return (
    <section className="py-16 bg-white overflow-hidden scroll-mt-20 border-t border-gray-100" id="instituciones">
      <div className="max-w-7xl mx-auto px-6 mb-10 text-center">
        <span className="inline-block py-1 px-3 rounded-full bg-[#2b5000]/10 text-[#2b5000] text-sm font-bold tracking-wider mb-4 uppercase">Aliados</span>
        <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-gray-900 tracking-tight">Instituciones Invitadas</h2>
        <div className="w-24 h-1 bg-[#2b5000] mx-auto mt-6 rounded-full"></div>
      </div>
      
      {/* Carrusel infinito */}
      <div className="relative w-full flex items-center mt-12">
        {/* Gradientes para difuminar los bordes */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
        
        <div className="flex animate-marquee whitespace-nowrap">
          {/* Primer set de logos */}
          {logos.map((logo) => (
            <div key={`logo-1-${logo.id}`} className="flex-none w-56 h-28 mx-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer group">
              <span className="font-bold text-gray-400 group-hover:text-[#2b5000] transition-colors">{logo.name}</span>
            </div>
          ))}
          {/* Segundo set de logos (duplicado para el efecto infinito) */}
          {logos.map((logo) => (
            <div key={`logo-2-${logo.id}`} className="flex-none w-56 h-28 mx-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer group">
              <span className="font-bold text-gray-400 group-hover:text-[#2b5000] transition-colors">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}



// Footer Component - Mejorado
function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { href: "https://www.facebook.com/UMBSanJosedelRincon", label: "Facebook", iconPath: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
    { href: "https://www.tiktok.com/@umb_ues_sjr?is_from_webapp=1&sender_device=pc", label: "TikTok", iconPath: "M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" }
  ];

  return (
    <footer className="bg-primary pt-20 pb-12 text-white scroll-mt-20" id="contacto">
      <div className="max-w-7xl mx-auto px-6">
        {/* Grid principal */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Columna 1: Info + Redes */}
          <div className="md:col-span-2">
            <div className="text-2xl font-black mb-6 tracking-tight">
            Jornada Académica
            </div>
            <p className="text-primary-fixed-dim max-w-sm mb-8">
              Un evento organizado por la Universidad Mexiquense del Bicentenario
              Unidad de Estudios Superiores San José del Rincón.
            </p>
            <nav aria-label="Redes sociales">
              <div className="flex gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer me"
                    aria-label={social.label}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d={social.iconPath} />
                    </svg>
                  </a>
                ))}
                {/* Correo y teléfono como iconos rápidos (opcional) */}
                <a
                  href="mailto:uessanjosedelrincon@umb.mx"
                  aria-label="Enviar correo"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">mail</span>
                </a>
                <a
                  href="tel:+527121242234"
                  aria-label="Llamar por teléfono"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">call</span>
                </a>
              </div>
            </nav>
          </div>

          {/* Columna 2: Enlaces */}
          <div>
            <h4 className="font-bold mb-6 text-primary-fixed uppercase tracking-widest text-sm">
              Enlaces
            </h4>
            <nav aria-label="Enlaces principales">
              <ul className="space-y-4 text-primary-fixed-dim">
                <li><a href="#" className="hover:text-white transition-colors">Ver Programa</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Conferencistas</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Registro</a></li>
                <li><a href="#contacto" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </nav>
          </div>

          {/* Columna 3: Contacto */}
          <div>
            <h4 className="font-bold mb-6 text-primary-fixed uppercase tracking-widest text-sm">
              Contacto
            </h4>
            <address className="not-italic">
              <ul className="space-y-4 text-primary-fixed-dim">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-xl shrink-0" aria-hidden="true">call</span>
                  <a href="tel:+527121242234" className="hover:text-white transition-colors">
                    712 124 2234
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-xl shrink-0" aria-hidden="true">mail</span>
                  <a href="mailto:uessanjosedelrincon@umb.mx" className="hover:text-white transition-colors break-words">
                    uessanjosedelrincon@umb.mx
                  </a>
                </li>
              </ul>
            </address>
          </div>
        </div>

        {/* Fila inferior: copyright + crédito */}
        <div className="border-t border-white/20 pt-8 text-center text-primary-fixed-dim text-sm flex flex-col md:flex-row justify-between gap-4">
          <p>
            © {currentYear} Universidad Mexiquense del Bicentenario – UES San José del Rincón.
          </p>
          <p>
            developed with ❤ by <a href="https://github.com/cristoferpina" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">@cristoferpina</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

// HomePage Component
function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-[#2b5000] selection:text-white">
      <TopNavBar />
      <main className="flex-grow">
        <HeroSection />
        <MosaicoSection />
        <ConferencistasSection />
        <EscenariosSection />
        <ConferenciasSection />
        <InstitucionesInvitadasMosaicoSection />
        <CountdownSection />
        <ElEventoSection />
        <ProgramaSection />
        <InstitucionesInvitadasSection />
      </main>
      <Footer />
    </div>
  );
}

// App Component
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/change-password" element={<CambiarContraseña />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/register-speakers" element={<RegisterSpeakers />} />
      </Routes>
    </Router>
  );
}

export default App;
