import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import umbAllLogo from '../assets/images/logo/umb_all.png';
import dashboardBrandImg from '../assets/DcRO6.jpg';

import { API_URL, BASE_URL } from '../config';

async function getImageDataProportional(url) {
  try {
    const absoluteUrl = (url.startsWith('http') ? url : window.location.origin + url) + "?t=" + Date.now();
    const res = await fetch(absoluteUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataURL = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        try {
          if ('decode' in img) await img.decode();
          resolve({
            data: dataURL,
            w: img.naturalWidth,
            h: img.naturalHeight,
            format: url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG'
          });
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = dataURL;
    });
  } catch (e) { return null; }
}

function handleAuthError(res, navigate) {
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    if (navigate) navigate('/login');
    else window.location.href = '/login';
    return true;
  }
  return false;
}

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
  const [registrations, setRegistrations] = useState([]);
  const [availableSpeakers, setAvailableSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    try {
      // 1. Verificar usuario y obtener info de estudiante
      const verifyRes = await fetch(`${API_URL}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (handleAuthError(verifyRes, navigate)) return;
      if (verifyRes.ok) {
        const data = await verifyRes.json();
        if (data.student) {
          setStudentInfo(data.student);
        }
      }

      // 2. Obtener inscripciones reales
      const regRes = await fetch(`${API_URL}/speakers/my-registrations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (handleAuthError(regRes, navigate)) return;
      if (regRes.ok) {
        const data = await regRes.json();
        setRegistrations(data);
      }

      // 3. Obtener conferencias disponibles
      const speakRes = await fetch(`${API_URL}/speakers`);
      if (speakRes.ok) {
        const data = await speakRes.json();
        setAvailableSpeakers(data);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (speakerId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/speakers/${speakerId}/register`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (handleAuthError(res, navigate)) return;
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: '¡Inscripción exitosa!',
          text: data.status,
          timer: 2000,
          showConfirmButton: false
        });
        fetchData(); // Recargar datos
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || "Error al inscribirse"
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo contactar con el servidor'
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const generateCertificate = async (reg) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Fondo / Marco
    doc.setDrawColor(96, 140, 29); // #608c1d
    doc.setLineWidth(2);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    doc.setLineWidth(0.5);
    doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

    // Logo UMB (Importado)
    try {
      const imgData = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = umbAllLogo;
      });
      if (imgData) {
        doc.addImage(imgData, 'PNG', (pageWidth - 80) / 2, 18, 80, 22);
      }
    } catch (e) { console.error(e); }

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(45, 66, 13); // #2d420d
    doc.text('RECONOCIMIENTO', pageWidth / 2, 55, { align: 'center' });

    doc.setFontSize(16);
    doc.setTextColor(60, 60, 60);
    doc.text('La Universidad Mexiquense del Bicentenario otorga el presente a:', pageWidth / 2, 72, { align: 'center' });

    // Nombre Alumno
    doc.setFontSize(32);
    doc.setTextColor(115, 36, 60); // Guinda institucional
    doc.text(currentUser?.name || 'ESTUDIANTE', pageWidth / 2, 92, { align: 'center' });

    // Texto Participación
    doc.setFontSize(16);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    const msg = `Por su valiosa participación en la conferencia:\n"${reg.speaker.conference_name}"`;
    doc.text(msg, pageWidth / 2, 112, { align: 'center' });

    doc.text(`Impartida por: ${reg.speaker.full_name}`, pageWidth / 2, 125, { align: 'center' });

    // Footer del diploma
    doc.setFontSize(12);
    doc.text(`Expedido el día ${new Date().toLocaleDateString()} en la 13ª Jornada Académica y Cultural`, pageWidth / 2, 150, { align: 'center' });

    // Línea de firma
    doc.line(pageWidth / 2 - 40, 175, pageWidth / 2 + 40, 175);
    doc.setFontSize(10);
    doc.text('Comité Organizador', pageWidth / 2, 182, { align: 'center' });

    doc.save(`Reconocimiento_${reg.speaker.conference_name.replace(/\s+/g, '_')}.pdf`);
  };

  const generateSchedulePDF = async () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Mi Calendario de Eventos', 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Alumno: ${currentUser?.name || 'Estudiante'}`, 14, 28);
    doc.text(`Total de conferencias: ${registrations.length}`, 14, 33);

    const tableColumn = ["Fecha", "Hora", "Conferencia", "Ponente", "Recinto", "Estatus"];
    const tableRows = [];

    const sortedRegs = [...registrations].sort((a, b) => {
      const dateA = new Date(a.speaker.date).getTime();
      const dateB = new Date(b.speaker.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.speaker.time || '').localeCompare(b.speaker.time || '');
    });

    sortedRegs.forEach(reg => {
      tableRows.push([
        new Date(reg.speaker.date).toLocaleDateString(),
        reg.speaker.time || '—',
        reg.speaker.conference_name || '—',
        reg.speaker.full_name || '—',
        reg.speaker.venue || '—',
        reg.status === 'confirmed' ? 'Confirmado' : 'Lista de Espera'
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'striped',
      headStyles: { fillColor: [96, 140, 29] }, // Color primario #608c1d
      styles: { fontSize: 9 }
    });

    // Logos Institucionales
    const logoUrls = new Set();
    availableSpeakers.forEach(s => {
      if (s.institutional_logo_url) {
        logoUrls.add(`${BASE_URL}${s.institutional_logo_url}`);
      }
    });

    const uniqueLogos = Array.from(logoUrls);
    
    if (uniqueLogos.length > 0) {
      const pageHeight = doc.internal.pageSize.height || 297;
      const pageWidth = doc.internal.pageSize.width || 210;
      
      // @ts-ignore
      let tableFinalY = doc.lastAutoTable.finalY || 200;
      
      if (tableFinalY > pageHeight - 45) {
        doc.addPage();
      }

      let footerY = pageHeight - 30; 

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Instituciones Participantes', 14, footerY - 5);
      
      let currentX = 14;
      const maxLogoHeight = 12;
      const maxLogoWidth = 25;
      const spacing = 8;
      const maxWidth = pageWidth - 14; 

      for (const logoUrl of uniqueLogos) {
        try {
          const logoData = await getImageDataProportional(logoUrl);
          if (logoData) {
            let drawW = logoData.w;
            let drawH = logoData.h;
            
            if (drawH > maxLogoHeight) {
               drawW = (maxLogoHeight * drawW) / drawH;
               drawH = maxLogoHeight;
            }
            if (drawW > maxLogoWidth) {
               drawH = (maxLogoWidth * drawH) / drawW;
               drawW = maxLogoWidth;
            }

            if (currentX + drawW > maxWidth) {
               currentX = 14;
               footerY += maxLogoHeight + 5;
               if (footerY > pageHeight - 5) break; 
            }
            
            const yOffset = footerY + (maxLogoHeight - drawH) / 2;
            doc.addImage(logoData.data, logoData.format, currentX, yOffset, drawW, drawH);
            currentX += drawW + spacing;
          }
        } catch (err) {
          console.warn("Could not load logo for PDF", err);
        }
      }
    }

    doc.save("Mi_Calendario.pdf");
  };

  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Panel' },
    { id: 'my-events', icon: 'event_available', label: 'Mis Eventos' },
    { id: 'certificates', icon: 'workspace_premium', label: 'Certificados' },
    { id: 'calendar', icon: 'calendar_today', label: 'Calendario' },
    { id: 'change-password', icon: 'lock', label: 'Cambiar Contraseña' },
  ];

  // State for Change Password tab
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState({ type: '', text: '' });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    setPwdLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      if (handleAuthError(res, navigate)) return;
      if (res.ok) {
        setPwdMessage({ type: 'success', text: 'Contraseña actualizada exitosamente' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdMessage({ type: 'error', text: data.message || 'Error al cambiar la contraseña' });
      }
    } catch (error) {
      setPwdMessage({ type: 'error', text: 'Error de conexión con el servidor' });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface flex flex-col md:flex-row min-h-screen">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex h-screen w-72 rounded-r-[3rem] sticky top-0 bg-surface-container-low flex-col py-10 z-40 shadow-sm">
        <div className="px-8 mb-8">
          <img src={dashboardBrandImg} alt="Universidad Mexiquense del Bicentenario" className="h-16 w-auto object-contain" />
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-4">
          {navItems.map((item) => (
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
          ))}
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

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 md:px-12 md:py-10 overflow-y-auto mb-20 md:mb-0">
        {/* Mobile Header (Only visible on small screens) */}
        <header className="md:hidden flex justify-between items-center mb-6">
          <img src={dashboardBrandImg} alt="Universidad Mexiquense del Bicentenario" className="h-10 w-auto object-contain" />
          <button onClick={handleLogout} className="p-2 text-red-500 bg-red-50 rounded-full">
             <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </header>

        {/* Global Student Info Banner */}
        <section className="mb-8 rounded-[2rem] border border-zinc-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.1em] text-primary uppercase">Bienvenido al Portal</p>
              <h3 className="text-2xl font-black text-on-surface mt-1">Hola, {currentUser?.name || 'Alumno'}</h3>
              <p className="text-sm text-zinc-500 mt-1">
                Desde aquí puedes gestionar tu participación en la 13ª Jornada Académica y Cultural.
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-50 px-4 py-3 border border-zinc-100">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sesión activa</p>
              <p className="text-sm font-semibold text-zinc-800">{currentUser?.email || 'Cuenta institucional'}</p>
            </div>
          </div>
        </section>

        {activeTab === 'dashboard' && (
          <>
            <header className="flex justify-between items-end mb-10">
              <div>
                <span className="text-xs font-bold tracking-[0.1em] text-primary uppercase">Bienvenido de nuevo</span>
                <h2 className="text-4xl font-extrabold tracking-tight text-on-surface mt-1">Panel de Alumno</h2>
              </div>
            </header>

            <section className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-on-surface">Mis Inscripciones Reales</h3>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-4">
                {registrations.length > 0 ? registrations.map((reg) => (
                  <div key={reg.id} className={`min-w-[320px] bg-white rounded-lg p-6 shadow-[0_10px_40px_rgba(13,13,13,0.03)] border-b-4 ${reg.status === 'confirmed' ? 'border-primary' : 'border-amber-500'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${reg.status === 'confirmed' ? 'bg-primary-container/20 text-on-primary-container' : 'bg-amber-100 text-amber-700'}`}>
                        {reg.status === 'confirmed' ? 'Confirmado' : 'Lista de Espera'}
                      </span>
                      <span className="text-zinc-400 text-xs font-medium">ID: {reg.speaker.id}</span>
                    </div>
                    <h4 className="text-lg font-bold text-on-surface leading-tight mb-2">{reg.speaker.conference_name}</h4>
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                      <span className="material-symbols-outlined text-sm">person</span>
                      <span className="text-xs">{reg.speaker.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <span className="material-symbols-outlined text-sm">calendar_month</span>
                      <span className="text-xs">{new Date(reg.speaker.date).toLocaleDateString()} - {reg.speaker.time}</span>
                    </div>
                  </div>
                )) : (
                  <div className="bg-zinc-50 rounded-xl p-8 border-2 border-dashed border-zinc-200 w-full text-center">
                    <p className="text-zinc-500 text-sm italic">No tienes inscripciones activas todavía.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-on-surface">Conferencias Disponibles</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableSpeakers.map((speaker) => {
                  const isRegistered = registrations.some(r => r.speaker.id === speaker.id);
                  return (
                    <div key={speaker.id} className="bg-white rounded-xl p-6 shadow-sm border border-zinc-100 hover:shadow-md transition-all flex flex-col">
                      <h4 className="text-lg font-bold text-on-surface mb-2 h-14 overflow-hidden">{speaker.conference_name}</h4>
                      <p className="text-sm text-zinc-600 mb-4">{speaker.full_name}</p>
                      <div className="mt-auto">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          <span>{speaker.venue?.name || 'Recinto por asignar'}</span>
                        </div>
                        <button
                          disabled={isRegistered}
                          onClick={() => handleRegister(speaker.id)}
                          className={`w-full py-3 rounded-xl text-xs font-bold transition-all ${
                            isRegistered 
                              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                              : 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20'
                          }`}
                        >
                          {isRegistered ? 'Ya estás inscrito' : 'Inscribirse ahora'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {activeTab === 'my-events' && (
          <div className="animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h2 className="text-3xl font-black text-on-surface">Mis Conferencias</h2>
              {registrations.length > 0 && (
                <button
                  onClick={generateSchedulePDF}
                  className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary-dark transition-all shadow-md"
                >
                  <span className="material-symbols-outlined">download</span>
                  Descargar Calendario PDF
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4">
              {registrations.length > 0 ? registrations.map((reg) => (
                <div key={reg.id} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex-1">
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase mb-2 ${reg.status === 'confirmed' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'}`}>
                      {reg.status === 'confirmed' ? 'Confirmado' : 'En espera'}
                    </span>
                    <h3 className="text-xl font-bold text-on-surface">{reg.speaker.conference_name}</h3>
                    <p className="text-zinc-500 text-sm">{reg.speaker.full_name} · {reg.speaker.venue || 'UMB'}</p>
                  </div>
                  <div className="flex items-center gap-6 px-6 border-l border-zinc-100">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Fecha</p>
                      <p className="font-bold text-zinc-700">{new Date(reg.speaker.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Hora</p>
                      <p className="font-bold text-zinc-700">{reg.speaker.time}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                  <span className="material-symbols-outlined text-6xl text-zinc-300">event_busy</span>
                  <p className="mt-4 text-zinc-500 font-medium">Aún no te has inscrito a ninguna conferencia.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="animate-fadeIn">
            <h2 className="text-3xl font-black mb-2 text-on-surface">Mis Reconocimientos</h2>
            <p className="text-zinc-500 mb-8">Descarga tus constancias de participación de las conferencias asistidas.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {registrations.filter(r => r.status === 'confirmed').length > 0 ? (
                registrations.filter(r => r.status === 'confirmed').map((reg) => (
                  <div key={reg.id} className="bg-[#2d420d] text-white p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                    <span className="material-symbols-outlined text-5xl mb-6 text-[#80ba26]">workspace_premium</span>
                    <h3 className="text-xl font-bold mb-2 pr-10">{reg.speaker.conference_name}</h3>
                    <p className="text-white/60 text-sm mb-8">Certificado de participación</p>
                    <button 
                      onClick={() => generateCertificate(reg)}
                      className="w-full py-4 bg-[#80ba26] hover:bg-white hover:text-[#2d420d] text-[#1a2608] font-black rounded-2xl transition-all flex items-center justify-center gap-3"
                    >
                      <span className="material-symbols-outlined">download</span>
                      DESCARGAR PDF
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                  <span className="material-symbols-outlined text-6xl text-zinc-300">workspace_premium</span>
                  <p className="mt-4 text-zinc-500 font-medium">Los certificados estarán disponibles cuando se confirme tu asistencia.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="animate-fadeIn">
            <h2 className="text-3xl font-black mb-8 text-on-surface">Calendario de la Jornada</h2>
            <div className="space-y-8 relative before:absolute before:left-8 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
              {availableSpeakers
                .sort((a, b) => new Date(a.suggested_date) - new Date(b.suggested_date))
                .map((speaker, idx) => (
                  <div key={speaker.id} className="relative pl-20 group">
                    <div className="absolute left-6 top-2 w-4 h-4 rounded-full bg-white border-4 border-primary z-10 group-hover:scale-125 transition-transform"></div>
                    <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <p className="text-primary font-black text-sm uppercase tracking-widest mb-1">
                            {new Date(speaker.suggested_date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                          <h3 className="text-xl font-bold text-on-surface">{speaker.conference_name}</h3>
                          <p className="text-zinc-500 font-medium">{speaker.full_name} · {speaker.suggested_time || 'Por confirmar'}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-100">
                          <span className="material-symbols-outlined text-primary text-sm">location_on</span>
                          <span className="text-xs font-bold text-zinc-600">{speaker.venue?.name || 'Por asignar'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'change-password' && (
          <div className="max-w-xl mx-auto">
            <header className="mb-10 text-center">
              <h2 className="text-3xl font-black text-on-surface tracking-tight">Seguridad de la cuenta</h2>
              <p className="text-zinc-500 mt-2">Actualiza tu contraseña periódicamente para mantener tu cuenta segura.</p>
            </header>

            <form onSubmit={handlePasswordChange} className="bg-white rounded-3xl p-8 shadow-xl border border-zinc-100 space-y-6">
              {pwdMessage.text && (
                <div className={`p-4 rounded-xl text-sm font-bold border ${
                  pwdMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {pwdMessage.text}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Contraseña Actual</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:border-primary focus:bg-white focus:ring-0 transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>

                <div className="h-px bg-zinc-100 my-2"></div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:border-primary focus:bg-white focus:ring-0 transition-all text-sm"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:border-primary focus:bg-white focus:ring-0 transition-all text-sm"
                    placeholder="Repite tu nueva contraseña"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:bg-zinc-200 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-3"
              >
                {pwdLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">save</span>
                    Actualizar Contraseña
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 px-6 py-4 flex justify-between items-center pb-safe">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'text-primary scale-110' 
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <span className={`material-symbols-outlined ${activeTab === item.id ? 'font-fill' : ''}`}>
              {item.icon}
            </span>
            {activeTab === item.id && (
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label.split(' ')[0]}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
