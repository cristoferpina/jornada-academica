import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import dashboardBrandImg from '../assets/DcRO6.jpg';

const API_URL = 'http://localhost:3000/api';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });


  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Panel' },
    { id: 'my-events', icon: 'event_available', label: 'Mis Eventos' },
    { id: 'certificates', icon: 'workspace_premium', label: 'Certificados' },
    { id: 'calendar', icon: 'calendar_today', label: 'Calendario' },
    { id: 'change-password', icon: 'lock', label: 'Cambiar Contraseña', href: '/cambiar-contraseña' },
    { id: 'settings', icon: 'settings', label: 'Ajustes' },
  ];

  return (
    <div className="bg-surface text-on-surface flex min-h-screen">
      <aside className="h-screen w-72 rounded-r-[3rem] sticky top-0 bg-surface-container-low flex flex-col py-10 z-40 shadow-sm">
        <div className="px-8 mb-8">
          <img src={dashboardBrandImg} alt="UMB Bicentenario" className="h-16 w-auto object-contain" />
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-4">
          {navItems.map((item) =>
            item.href ? (
              <Link
                key={item.id}
                to={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left w-full text-zinc-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/40"
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-body text-sm font-medium">{item.label}</span>
              </Link>
            ) : (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left w-full ${
                  activeTab === item.id
                    ? 'bg-primary text-white font-bold shadow-md'
                    : 'text-zinc-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/40'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-body text-sm font-medium">{item.label}</span>
              </button>
            )
          )}
        </nav>

        <div className="px-8 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-red-500 font-semibold py-3 px-4 rounded-xl hover:bg-red-50 transition-all w-full justify-center"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 px-12 py-10 overflow-y-auto">
        <section className="mb-8 rounded-[2rem] border border-[#3e690d]/15 bg-gradient-to-r from-[#f4f8ee] via-white to-[#eef6df] p-6 shadow-[0_12px_50px_rgba(62,105,13,0.08)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.1em] text-[#3e690d] uppercase">Cuenta del alumno</p>
              <h3 className="text-2xl font-black text-on-surface mt-1">Cambiar contraseña</h3>
              <p className="text-sm text-zinc-600 mt-2 max-w-2xl">
                Actualiza tu contraseña desde esta sesión. Si no recuerdas tu contraseña actual, usa recuperación de acceso.
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 backdrop-blur px-4 py-3 border border-white/60">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sesión actual</p>
              <p className="text-sm font-semibold text-zinc-800">{currentUser?.name || 'Alumno'}</p>
              <p className="text-xs text-zinc-500">{currentUser?.email || 'Cuenta institucional'}</p>
            </div>
          </div>

          <div className="mt-6">
            <Link
              to="/cambiar-contraseña"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#3e690d] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#3e690d]/20 hover:bg-[#2a4f0a] transition-all"
            >
              <span className="material-symbols-outlined text-lg">lock</span>
              Gestionar contraseña
            </Link>
          </div>
        </section>

        <div className="mb-6 rounded-2xl border border-[#3e690d]/25 bg-[#f4f8ee] p-4 text-sm text-[#2b5000] font-semibold">
          Aviso: los datos mostrados son ficticios y este dashboard esta en desarrollo.
        </div>

        <header className="flex justify-between items-end mb-10">
          <div>
            <span className="text-xs font-bold tracking-[0.1em] text-primary uppercase">Bienvenido de nuevo</span>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface mt-1">Panel de Alumno</h2>
          </div>
          <div className="flex gap-4">
            <div className="bg-surface-container-low px-6 py-3 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">notifications</span>
              <span className="text-xs font-bold text-zinc-600">2 Avisos</span>
            </div>
            <div className="bg-primary px-8 py-3 rounded-full flex items-center gap-2 shadow-[0_10px_40px_rgba(62,105,13,0.15)]">
              <span className="material-symbols-outlined text-white text-xl">add</span>
              <span className="text-xs font-bold text-white">Inscribirse</span>
            </div>
          </div>
        </header>

        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-on-surface">Mis Inscripciones</h3>
            <a className="text-sm font-semibold text-primary hover:underline" href="#">Ver todas</a>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4">
            <div className="min-w-[320px] bg-white rounded-lg p-6 shadow-[0_10px_40px_rgba(13,13,13,0.03)] border-b-4 border-primary">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-primary-container/20 text-on-primary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Academico</span>
                <span className="text-zinc-400 text-xs font-medium">ID: 8821</span>
              </div>
              <h4 className="text-lg font-bold text-on-surface leading-tight mb-2">Seminario de Inteligencia Artificial Aplicada</h4>
              <div className="flex items-center gap-2 text-zinc-500 mb-6">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                <span className="text-xs">Manana, 10:00 AM</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  <img className="h-8 w-8 rounded-full border-2 border-white" alt="Ponente 1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCu_ih0-dKqCyf9ZBtIICfZqcwZwUF1Md07KoLfNvmjPnvbgHv267VkdgtpiYShpGMPH2vvzuAVrxId4-zSwPmSQW12zopkQJ2gaf2Zaw7jXb_8EJYaHxwZWMUrc8pdNsuC1S4DXI-ET4tcCHZ4KOcA6ucnxTO3q9vPrhEItXqNlpmOxmh7oub__ZH_GXcKcdQFO7yqY9DKF7dgQr8PlRaIBJtUUDjclQRcmScDf5cvn66L9Zfy1CSlfo9FL6dIhcd69t4Vj0RfE6E" />
                  <img className="h-8 w-8 rounded-full border-2 border-white" alt="Ponente 2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyNahAUlrkkPhAukBieQ_SR-bAZ6C9bdcsiEspXYoUnQuIJBhGaKA3pE6V4DhjQ-ThLgDHT_004U8aJVYyiKrMny9zN06MWD8VEIBZLGVi2BbfQh9oyzA_bl47XBMya1le1s5LGnBaZoiAwNiRF5L2nYi-QwdM59rpopTpuRFG1gbHZd6AEiu_S-au4ZtCBbQFcEJSgl3xO3qCwhPDSTU5BGWUu_Q3aDQxihZFNsEKaldNykZEu7v0g8wu4V0dAdyG2r6ZMlRAYkQ" />
                  <div className="h-8 w-8 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500">+12</div>
                </div>
                <button className="bg-surface-container-high px-4 py-2 rounded-full text-[11px] font-bold hover:bg-zinc-200 transition-colors">Entrar</button>
              </div>
            </div>

            <div className="min-w-[320px] bg-white rounded-lg p-6 shadow-[0_10px_40px_rgba(13,13,13,0.03)] border-b-4 border-secondary">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-secondary-container/20 text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Cultural</span>
                <span className="text-zinc-400 text-xs font-medium">ID: 4410</span>
              </div>
              <h4 className="text-lg font-bold text-on-surface leading-tight mb-2">Taller de Fotografia Digital y Composicion</h4>
              <div className="flex items-center gap-2 text-zinc-500 mb-6">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                <span className="text-xs">Jueves, 04:00 PM</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  <img className="h-8 w-8 rounded-full border-2 border-white" alt="Tallerista" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTJ2YyL9hlu0lxENA0gTKc457J5kvNFlTMJ9FdF6zwAo8b1juG7vF3Hq4EhCscVktjXDsggdmSwfdNrFRk4jKdHGmrFH3BQ0VVMrR9_xzM9B4MUPzxvF98ypzbven4Tdn3l5tXW4E7VmlJWbKTwCx6Wc_Dmh0GsWsaAsuYlGtsIqm0uzgaZtbouTOxUUGnwg7CX8HImu4OK5U1HHY-rnVY_VaGBuCKx2lk4NJ9CI4uu52IKOX2AUVPppuHKCabAXIKa40xpGaLCyo" />
                  <div className="h-8 w-8 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500">+45</div>
                </div>
                <button className="bg-surface-container-high px-4 py-2 rounded-full text-[11px] font-bold hover:bg-zinc-200 transition-colors">Entrar</button>
              </div>
            </div>

            <div className="min-w-[320px] bg-white rounded-lg p-6 shadow-[0_10px_40px_rgba(13,13,13,0.03)] border-b-4 border-tertiary-container">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-tertiary-container/20 text-on-tertiary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Investigacion</span>
                <span className="text-zinc-400 text-xs font-medium">ID: 1092</span>
              </div>
              <h4 className="text-lg font-bold text-on-surface leading-tight mb-2">Congreso Bicentenario de Ciencia Local</h4>
              <div className="flex items-center gap-2 text-zinc-500 mb-6">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                <span className="text-xs">Viernes, 09:00 AM</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="h-8 w-8 rounded-full border-2 border-white bg-primary-container/50 flex items-center justify-center text-[10px] font-bold text-white">UP</div>
                  <div className="h-8 w-8 rounded-full border-2 border-white bg-secondary/50 flex items-center justify-center text-[10px] font-bold text-white">RG</div>
                </div>
                <button className="bg-surface-container-high px-4 py-2 rounded-full text-[11px] font-bold hover:bg-zinc-200 transition-colors">Entrar</button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-on-surface">Horario Semanal</h3>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                  <span className="material-symbols-outlined text-zinc-400">chevron_left</span>
                </button>
                <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                  <span className="material-symbols-outlined text-zinc-400">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="bg-surface-container-low rounded-xl p-2">
              <div className="grid grid-cols-6 gap-px">
                <div className="bg-surface-container-low p-4 text-center"></div>
                <div className="bg-surface-container-low p-4 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Lun</div>
                <div className="bg-white p-4 text-center rounded-t-xl"><span className="text-[10px] font-black text-primary uppercase tracking-widest">Mar</span></div>
                <div className="bg-surface-container-low p-4 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Mie</div>
                <div className="bg-surface-container-low p-4 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Jue</div>
                <div className="bg-surface-container-low p-4 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Vie</div>

                <div className="p-4 text-right text-[10px] font-bold text-zinc-400 py-10">09:00</div>
                <div className="bg-white/40 p-2"></div>
                <div className="bg-white p-2"></div>
                <div className="bg-white/40 p-2">
                  <div className="bg-tertiary-container/10 border-l-2 border-tertiary text-tertiary p-2 rounded-md h-full">
                    <p className="text-[9px] font-black leading-none">Lab</p>
                    <p className="text-[8px] font-medium leading-tight">Quimica</p>
                  </div>
                </div>
                <div className="bg-white/40 p-2"></div>
                <div className="bg-white/40 p-2">
                  <div className="bg-primary-container/10 border-l-2 border-primary text-primary p-2 rounded-md h-full">
                    <p className="text-[9px] font-black leading-none">Congr.</p>
                    <p className="text-[8px] font-medium leading-tight">Ciencia</p>
                  </div>
                </div>

                <div className="p-4 text-right text-[10px] font-bold text-zinc-400 py-10">11:00</div>
                <div className="bg-white/40 p-2"></div>
                <div className="bg-white p-2">
                  <div className="bg-primary-container/20 border-l-4 border-primary text-primary p-4 rounded-lg h-full shadow-sm">
                    <p className="text-[10px] font-black leading-none mb-1">IA Sem.</p>
                    <p className="text-[9px] font-semibold opacity-70">Salon B2</p>
                  </div>
                </div>
                <div className="bg-white/40 p-2"></div>
                <div className="bg-white/40 p-2"></div>
                <div className="bg-white/40 p-2"></div>

                <div className="p-4 text-right text-[10px] font-bold text-zinc-400 py-10">13:00</div>
                <div className="bg-white/40 p-2">
                  <div className="bg-secondary-container/10 border-l-2 border-secondary text-secondary p-2 rounded-md h-full">
                    <p className="text-[9px] font-black leading-none">Hist.</p>
                    <p className="text-[8px] font-medium leading-tight">Arte</p>
                  </div>
                </div>
                <div className="bg-white p-2"></div>
                <div className="bg-white/40 p-2"></div>
                <div className="bg-white/40 p-2"></div>
                <div className="bg-white/40 p-2"></div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-on-surface">Tu Progreso</h3>
            <div className="bg-white rounded-lg p-6 shadow-[0_10px_40px_rgba(13,13,13,0.03)]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Asistencia Total</span>
                <span className="text-xl font-black text-primary">84%</span>
              </div>
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '84%' }}></div>
              </div>
              <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed">Te faltan 2 sesiones para obtener tu certificado de participacion general.</p>
            </div>

            <div className="bg-zinc-900 rounded-lg p-6 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container opacity-20 blur-[60px] rounded-full -mr-16 -mt-16"></div>
              <h4 className="text-sm font-bold mb-2">Proxima Evaluacion</h4>
              <p className="text-2xl font-black mb-4">Mesa Redonda: Bioetica</p>
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary-fixed-dim text-sm">schedule</span>
                <span className="text-xs font-medium text-zinc-400">Hoy, 18:00 - Virtual</span>
              </div>
              <button className="w-full bg-white text-zinc-900 py-3 rounded-full text-xs font-bold hover:bg-primary-fixed transition-colors relative z-10">
                Unirse a la Sesion
              </button>
            </div>

            <div className="bg-surface-container-low rounded-lg p-6 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Enlaces Rapidos</h4>
              <button className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center group-hover:bg-primary transition-colors">
                  <span className="material-symbols-outlined text-zinc-400 group-hover:text-white transition-colors">description</span>
                </div>
                <span className="text-sm font-semibold text-on-surface">Guia Academica</span>
              </button>
              <button className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center group-hover:bg-primary transition-colors">
                  <span className="material-symbols-outlined text-zinc-400 group-hover:text-white transition-colors">support_agent</span>
                </div>
                <span className="text-sm font-semibold text-on-surface">Soporte Tecnico</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
