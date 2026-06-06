import { useState, useEffect, useCallback, useRef } from 'react';
import dashboardBrandImg from '../assets/DcRO6.jpg';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import jsPDF from 'jspdf';

const API_URL = 'http://localhost:3000/api';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── Generate PDF (función global, fuera de componentes) ────────────────────

async function toDataURL(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

async function generatePDF(speaker) {
  const doc = new jsPDF();

  // Encabezado
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setFontSize(10);
  doc.setTextColor(199, 210, 254);
  doc.text('JORNADA ACADÉMICA 2025', 105, 14, { align: 'center' });

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text(speaker.full_name || '—', 105, 27, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(199, 210, 254);
  doc.text(speaker.institution || 'Sin institución', 105, 35, { align: 'center' });

  // Añadir logo e imagen de perfil si existen (carga asíncrona)
  try {
    const base = 'http://localhost:3000';
    if (speaker.institutional_logo_url) {
      const logoData = await toDataURL(base + speaker.institutional_logo_url);
      if (logoData) {
        const fmt = speaker.institutional_logo_url.endsWith('.png') ? 'PNG' : 'JPEG';
        doc.addImage(logoData, fmt, 12, 8, 24, 24);
      }
    }
    if (speaker.profile_photo_url) {
      const profileData = await toDataURL(base + speaker.profile_photo_url);
      if (profileData) {
        const fmt = speaker.profile_photo_url.endsWith('.png') ? 'PNG' : 'JPEG';
        doc.addImage(profileData, fmt, 170, 8, 28, 28);
      }
    }
  } catch (e) {
    // ignore image errors
  }

  // Línea separadora
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(20, 48, 190, 48);

  // Campos principales
  const fields = [
    ['NIVEL ACADÉMICO', speaker.academic_level || '—'],
    ['CONFERENCIA', speaker.conference_name || '—'],
    ['CARRERA / FACULTAD', speaker.career || '—'],
    ['TELÉFONO', speaker.phone || '—'],
    ['REDES SOCIALES', speaker.social_media || '—'],
    ['FECHA SUGERIDA', speaker.suggested_date
      ? new Date(speaker.suggested_date).toLocaleDateString('es-MX')
      : '—'],
    ['AFORO ESTIMADO', speaker.audience_capacity
      ? `${speaker.audience_capacity} personas`
      : '—'],
  ];

  let y = 58;
  fields.forEach(([label, value]) => {
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.setFont(undefined, 'bold');
    doc.text(label, 20, y);

    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.setFont(undefined, 'normal');

    const maxWidth = 170;
    const lines = doc.splitTextToSize(String(value), maxWidth);
    doc.text(lines[0], 20, y + 6);

    y += 18;
  });

  // Línea separadora antes de biografía
  if (speaker.biography) {
    doc.setDrawColor(229, 231, 235);
    doc.line(20, y, 190, y);
    y += 8;

    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.setFont(undefined, 'bold');
    doc.text('BIOGRAFÍA', 20, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.setFont(undefined, 'normal');
    const bioLines = doc.splitTextToSize(speaker.biography, 170);
    doc.text(bioLines, 20, y);
    y += bioLines.length * 5 + 6;
  }

  // Pie de página
  doc.setFillColor(249, 250, 251);
  doc.rect(0, 282, 210, 15, 'F');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Generado el ${new Date().toLocaleDateString('es-MX')} · UMB Bicentenario`,
    105,
    290,
    { align: 'center' }
  );

  doc.save(`ficha_${(speaker.full_name || 'ponente').replace(/\s+/g, '_')}.pdf`);
}

// ─── Toast Notification ─────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-sky-600',
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold ${colors[type]}`}
    >
      <span className="material-symbols-outlined text-base">
        {type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
      </span>
      {message}
    </div>
  );
}

// ─── PDF Preview Modal ───────────────────────────────────────────────────────

function PDFPreviewModal({ speaker, onClose, onDownload }) {
  if (!speaker) return null;

  const levelColor = {
    Doctorado: 'bg-purple-100 text-purple-700',
    Maestría: 'bg-blue-100 text-blue-700',
    Licenciatura: 'bg-emerald-100 text-emerald-700',
  }[speaker.academic_level] || 'bg-zinc-100 text-zinc-600';
  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">picture_as_pdf</span>
            <h3 className="font-bold text-zinc-800 text-sm">Vista previa — Ficha de ponente</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Preview card */}
        <div className="p-6">
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            {/* Simulated PDF header */}
            <div className="bg-primary px-6 py-5 text-center">
              <p className="text-xs font-bold text-primary/40 tracking-widest mb-1">JORNADA ACADÉMICA 2025</p>
              <p className="text-lg font-black text-white">{speaker.full_name}</p>
              <p className="text-sm text-white/60 mt-0.5">{speaker.institution || 'Sin institución'}</p>
            </div>

            {/* Simulated PDF body */}
            <div className="bg-zinc-50 px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Nivel académico</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${levelColor}`}>
                    {speaker.academic_level}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Fecha sugerida</p>
                  <p className="text-sm font-semibold text-zinc-700">{formatDate(speaker.suggested_date)}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Conferencia</p>
                <p className="text-sm font-semibold text-zinc-700">{speaker.conference_name}</p>
              </div>

              {speaker.career && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Carrera</p>
                  <p className="text-sm text-zinc-600">{speaker.career}</p>
                </div>
              )}

              {speaker.biography && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Biografía</p>
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">{speaker.biography}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {speaker.phone && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Teléfono</p>
                    <p className="text-xs text-zinc-600">{speaker.phone}</p>
                  </div>
                )}
                {speaker.audience_capacity && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Aforo</p>
                    <p className="text-xs text-zinc-600">{speaker.audience_capacity} personas</p>
                  </div>
                )}
              </div>
            </div>

            {/* Simulated footer */}
            <div className="bg-zinc-100 px-6 py-2 text-center">
              <p className="text-[10px] text-zinc-400">
                Generado el {new Date().toLocaleDateString('es-MX')} · UMB Bicentenario
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { onDownload(speaker); onClose(); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar({ activeTab, setActiveTab }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Panel' },
    { id: 'speakers', icon: 'school', label: 'Ponentes' },
    { id: 'register-speaker', icon: 'person_add', label: 'Registrar Ponente' },
    { id: 'students', icon: 'badge', label: 'Registrar Alumnos' },
    { id: 'certificates', icon: 'workspace_premium', label: 'Certificados' },
    { id: 'calendar', icon: 'calendar_today', label: 'Calendario' },
    { id: 'settings', icon: 'settings', label: 'Ajustes' },
  ];

  return (
    <aside className="h-screen w-72 rounded-r-[3rem] sticky top-0 bg-surface-container-low flex flex-col py-10 z-40 shadow-sm">
      <div className="px-8 mb-8">
        <img src={dashboardBrandImg} alt="UMB Bicentenario" className="h-16 w-auto object-contain" />
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
  );
}

// ─── Metrics Grid ────────────────────────────────────────────────────────────

function MetricsGrid({ speakers }) {
  const total = speakers.length;
  const withConference = speakers.filter((s) => s.conference_name).length;
  const levels = speakers.reduce((acc, s) => {
    acc[s.academic_level] = (acc[s.academic_level] || 0) + 1;
    return acc;
  }, {});
  const topLevel = Object.entries(levels).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <div className="bg-white p-7 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <span className="material-symbols-outlined">school</span>
          </div>
          <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">Total</span>
        </div>
        <h3 className="text-4xl font-black text-zinc-800 mb-1">{total}</h3>
        <p className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Ponentes Registrados</p>
      </div>

      <div className="bg-primary p-7 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-white/20 rounded-xl">
            <span className="material-symbols-outlined text-white">campaign</span>
          </div>
        </div>
        <h3 className="text-3xl font-black text-white mb-1 truncate">{withConference}</h3>
        <p className="text-xs font-bold text-white/70 tracking-wider uppercase">Con Conferencia Asignada</p>
      </div>

      <div className="bg-white p-7 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-secondary/10 rounded-xl text-secondary">
            <span className="material-symbols-outlined">grade</span>
          </div>
        </div>
        <h3 className="text-2xl font-black text-zinc-800 mb-1">{topLevel}</h3>
        <p className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Nivel Más Frecuente</p>
      </div>
    </div>
  );
}

// ─── Speakers Table ──────────────────────────────────────────────────────────

function SpeakersTable({ speakers, loading, onDelete, onNavigateRegister, onGeneratePDF, onEdit }) {
  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [previewSpeaker, setPreviewSpeaker] = useState(null);

  const filtered = speakers.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.conference_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.institution?.toLowerCase().includes(search.toLowerCase())
  );

  const levelColor = (level) => {
    const map = {
      Doctorado: 'bg-purple-100 text-purple-700',
      Maestría: 'bg-blue-100 text-blue-700',
      Licenciatura: 'bg-emerald-100 text-emerald-700',
    };
    return map[level] || 'bg-zinc-100 text-zinc-600';
  };

  return (
    <>
      {/* Modal de vista previa PDF */}
      <PDFPreviewModal
        speaker={previewSpeaker}
        onClose={() => setPreviewSpeaker(null)}
        onDownload={onGeneratePDF}
      />

      <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100">
        {/* Header */}
        <div className="p-7 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-zinc-100">
          <div>
            <h3 className="text-xl font-bold text-zinc-800">Gestión de Ponentes</h3>
            <p className="text-sm text-zinc-400">{filtered.length} ponente(s) encontrado(s)</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Buscar ponente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm w-full md:w-60 transition-all"
              />
            </div>
            <button
              onClick={onNavigateRegister}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity text-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nuevo
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="ml-3 text-zinc-500 text-sm font-medium">Cargando ponentes...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl text-zinc-200 block mb-3">person_off</span>
            <p className="text-zinc-400 font-medium">
              {search ? 'No se encontraron resultados' : 'Aún no hay ponentes registrados'}
            </p>
            {!search && (
              <button
                onClick={onNavigateRegister}
                className="mt-4 text-primary font-semibold text-sm hover:underline"
              >
                Registrar el primero →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Ponente</th>
                  <th className="px-6 py-4">Conferencia</th>
                  <th className="px-6 py-4">Nivel</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.map((speaker) => (
                  <tr key={speaker.id} className="hover:bg-zinc-50/80 transition-colors group">
                    {/* Ponente */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {speaker.profile_photo_url ? (
                          <img
                            src={`http://localhost:3000${speaker.profile_photo_url}`}
                            alt={speaker.full_name}
                            className="w-9 h-9 rounded-full object-cover border-2 border-zinc-100"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border-2 border-zinc-100">
                            {speaker.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-zinc-800">{speaker.full_name}</p>
                          <p className="text-xs text-zinc-400">{speaker.institution || '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Conferencia */}
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-700 max-w-[200px] truncate">{speaker.conference_name}</p>
                      <p className="text-xs text-zinc-400">{speaker.career || '—'}</p>
                    </td>

                    {/* Nivel */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${levelColor(speaker.academic_level)}`}>
                        {speaker.academic_level}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="px-6 py-4 text-zinc-500 text-xs">
                      {formatDate(speaker.suggested_date)}
                      {speaker.audience_capacity && (
                        <p className="text-zinc-400">{speaker.audience_capacity} asist.</p>
                      )}
                    </td>

                    {/* Contacto */}
                    <td className="px-6 py-4 text-zinc-500 text-xs">
                      <p>{speaker.phone || '—'}</p>
                      {speaker.social_media && (
                        <a
                          href={speaker.social_media}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Ver perfil
                        </a>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 text-right">
                      {confirmId === speaker.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-zinc-500">¿Eliminar?</span>
                          <button
                            onClick={() => { onDelete(speaker.id); setConfirmId(null); }}
                            className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="px-3 py-1 bg-zinc-200 text-zinc-600 text-xs font-bold rounded-lg hover:bg-zinc-300 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {/* Botón Ver ficha PDF */}
                          <button
                            onClick={() => setPreviewSpeaker(speaker)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors whitespace-nowrap"
                            title="Ver ficha PDF"
                          >
                            <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                            Ver ficha
                          </button>

                          <button
                            onClick={() => onEdit(speaker)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 text-xs font-bold rounded-lg hover:bg-sky-100 border border-sky-200 transition-colors whitespace-nowrap"
                            title="Editar ponente"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            Editar
                          </button>

                          {/* Botón Eliminar */}
                          <button
                            onClick={() => setConfirmId(speaker.id)}
                            className="p-1.5 text-zinc-300 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                            title="Eliminar ponente"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ─── Register Speaker Form (inline in dashboard) ─────────────────────────────

function RegisterSpeakerPanel({ onSuccess, editingSpeaker, onCancelEdit }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      fullName: '',
      academicLevel: 'Licenciatura',
      institution: '',
      career: '',
      biography: '',
      conferenceName: '',
      suggestedDate: '',
      audienceCapacity: '',
      phone: '',
      socialMedia: '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [profileName, setProfileName] = useState('');
  const [logoName, setLogoName] = useState('');
  const profilePhotoRef = useRef(null);
  const institutionalLogoRef = useRef(null);

  useEffect(() => {
    if (editingSpeaker) {
      reset({
        fullName: editingSpeaker.full_name || '',
        academicLevel: editingSpeaker.academic_level || 'Licenciatura',
        institution: editingSpeaker.institution || '',
        career: editingSpeaker.career || '',
        biography: editingSpeaker.biography || editingSpeaker.biografia || '',
        conferenceName: editingSpeaker.conference_name || '',
        suggestedDate: editingSpeaker.suggested_date ? String(editingSpeaker.suggested_date).slice(0, 10) : '',
        audienceCapacity: editingSpeaker.audience_capacity || '',
        phone: editingSpeaker.phone || '',
        socialMedia: editingSpeaker.social_media || '',
      });
    } else {
      reset({
        fullName: '',
        academicLevel: 'Licenciatura',
        institution: '',
        career: '',
        biography: '',
        conferenceName: '',
        suggestedDate: '',
        audienceCapacity: '',
        phone: '',
        socialMedia: '',
      });
    }
    setProfileName('');
    setLogoName('');
    if (profilePhotoRef.current) profilePhotoRef.current.value = '';
    if (institutionalLogoRef.current) institutionalLogoRef.current.value = '';
  }, [editingSpeaker, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('full_name', data.fullName);
      formData.append('academic_level', data.academicLevel);
      formData.append('institution', data.institution || '');
      formData.append('career', data.career || '');
      formData.append('biografia', data.biography || '');
      formData.append('conference_name', data.conferenceName);
      formData.append('suggested_date', data.suggestedDate || '');
      formData.append('audience_capacity', data.audienceCapacity ? parseInt(data.audienceCapacity) : '');
      formData.append('phone', data.phone || '');
      formData.append('social_media', data.socialMedia || '');
      formData.append('accepted_terms', 'true');

      const profilePhotoFile = profilePhotoRef.current?.files?.[0];
      if (profilePhotoFile) {
        if (profilePhotoFile.size > 5 * 1024 * 1024) {
          setErrorMsg('La foto de perfil debe ser menor a 5MB');
          setLoading(false);
          return;
        }
        formData.append('profile_photo', profilePhotoFile);
      }

      const institutionalLogoFile = institutionalLogoRef.current?.files?.[0];
      if (institutionalLogoFile) {
        if (institutionalLogoFile.size > 5 * 1024 * 1024) {
          setErrorMsg('El logo institucional debe ser menor a 5MB');
          setLoading(false);
          return;
        }
        formData.append('institutional_logo', institutionalLogoFile);
      }

      const isEditing = Boolean(editingSpeaker?.id);
      const response = await fetch(
        isEditing ? `${API_URL}/speakers/${editingSpeaker.id}` : `${API_URL}/speakers`,
        {
        method: isEditing ? 'PUT' : 'POST',
        body: formData,
      }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || err.message || (isEditing ? 'Error al actualizar' : 'Error al registrar'));
      }

      reset();
      setProfileName('');
      setLogoName('');
      if (profilePhotoRef.current) profilePhotoRef.current.value = '';
      if (institutionalLogoRef.current) institutionalLogoRef.current.value = '';
      onSuccess?.(isEditing);
      onCancelEdit?.();
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder-zinc-400';

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-800 mb-1">
          {editingSpeaker ? 'Editar Ponente' : 'Registrar Ponente'}
        </h2>
        <p className="text-sm text-zinc-400">
          {editingSpeaker
            ? 'Actualiza la información del ponente seleccionado'
            : 'Completa el formulario para agregar un nuevo ponente al sistema'}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">error</span>
          <p className="text-red-600 text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Información Personal */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[16px]">person</span>
            </div>
            <h3 className="font-bold text-zinc-700">Información Personal</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                Nombre Completo *
              </label>
              <input
                {...register('fullName', { required: 'El nombre es requerido' })}
                className={inputClass}
                placeholder="Dr. Juan García López"
                type="text"
              />
              {errors.fullName && <p className="mt-1 text-red-500 text-xs">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                Grado Académico *
              </label>
              <select {...register('academicLevel')} className={inputClass}>
                <option value="Doctorado">Doctorado</option>
                <option value="Maestría">Maestría</option>
                <option value="Licenciatura">Licenciatura</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">
                Institución
              </label>
              <input {...register('institution')} className={inputClass} placeholder="UNAM, IPN, UMB..." type="text" />
            </div>
            <div>
              <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">
                Carrera / Facultad
              </label>
              <input {...register('career')} className={inputClass} placeholder="Ingeniería en Sistemas" type="text" />
            </div>
            {/* Biografía — campo completo, ocupa las 2 columnas */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">
                Biografía
              </label>
              <textarea
                {...register('biography')}
                className={`${inputClass} resize-none`}
                placeholder="Breve descripción académica y profesional del ponente..."
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Archivos */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[16px]">upload</span>
            </div>
            <h3 className="font-bold text-zinc-700">Archivos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                Foto de Perfil
              </label>
              <label
                htmlFor="profilePhotoAdmin"
                className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <span className="material-symbols-outlined text-zinc-300 mb-1">add_a_photo</span>
                <span className="text-xs text-zinc-400 font-medium">{profileName || 'JPG o PNG (máx 5MB)'}</span>
              </label>
              <input
                ref={profilePhotoRef}
                id="profilePhotoAdmin"
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => setProfileName(e.target.files?.[0]?.name || '')}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                Logo Institucional
              </label>
              <label
                htmlFor="institutionalLogoAdmin"
                className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <span className="material-symbols-outlined text-zinc-300 mb-1">upload_file</span>
                <span className="text-xs text-zinc-400 font-medium">{logoName || 'SVG o PNG (máx 5MB)'}</span>
              </label>
              <input
                ref={institutionalLogoRef}
                id="institutionalLogoAdmin"
                type="file"
                accept="image/svg+xml,image/png"
                className="hidden"
                onChange={(e) => setLogoName(e.target.files?.[0]?.name || '')}
              />
            </div>
          </div>
        </div>

        {/* Detalles de la Ponencia */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[16px]">campaign</span>
            </div>
            <h3 className="font-bold text-zinc-700">Detalles de la Ponencia</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                Nombre de la Conferencia *
              </label>
              <input
                {...register('conferenceName', { required: 'El nombre de la conferencia es requerido' })}
                className={inputClass}
                placeholder="Ej: Inteligencia Artificial en la Medicina Moderna"
                type="text"
              />
              {errors.conferenceName && (
                <p className="mt-1 text-red-500 text-xs">{errors.conferenceName.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Fecha Sugerida
                </label>
                <input {...register('suggestedDate')} className={inputClass} type="date" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Capacidad de Audiencia
                </label>
                <input
                  {...register('audienceCapacity')}
                  className={inputClass}
                  placeholder="Ej: 100"
                  type="number"
                  min="1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[16px]">contact_phone</span>
            </div>
            <h3 className="font-bold text-zinc-700">Contacto y Redes</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                Teléfono
              </label>
              <input
                {...register('phone')}
                className={inputClass}
                placeholder="+52 55 1234 5678"
                type="tel"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                LinkedIn / Red Social
              </label>
              <input
                {...register('socialMedia')}
                className={inputClass}
                placeholder="https://linkedin.com/in/..."
                type="url"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            {editingSpeaker && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-6 py-3 rounded-xl font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-all"
              >
                Cancelar
              </button>
            )}
            <p className="text-xs text-zinc-400">
              * Campos requeridos. Al guardar, se aceptan los términos automáticamente.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Guardando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                {editingSpeaker ? 'Actualizar Ponente' : 'Registrar Ponente'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Register Student Form (inline in dashboard) ────────────────────────────

function RegisterStudentPanel({ onSuccess }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      matricula: '',
      firstName: '',
      lastName: '',
      career: '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [students, setStudents] = useState([]);
  const [subTab, setSubTab] = useState('register'); // 'register' | 'linked' | 'unlinked'
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const clearForm = () => {
    reset({ matricula: '', firstName: '', lastName: '', career: '' });
    setEditingStudent(null);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isEditing = Boolean(editingStudent?.id);
      const response = await fetch(
        isEditing ? `${API_URL}/students/${editingStudent.id}` : `${API_URL}/students`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            matricula: data.matricula,
            first_name: data.firstName,
            last_name: data.lastName,
            career: data.career,
          }),
        }
      );

      const rawResponse = await response.text();
      let result = {};
      if (rawResponse) {
        try {
          result = JSON.parse(rawResponse);
        } catch {
          result = { message: rawResponse };
        }
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || (isEditing ? 'Error al actualizar alumno' : 'Error al registrar alumno'));
      }

      clearForm();
      setSuccessMsg(`${isEditing ? 'Alumno actualizado' : 'Alumno guardado'}. Correo institucional: ${result.institutional_email}`);
      onSuccess?.(result);
      fetchStudents();
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`${API_URL}/students`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Error al obtener alumnos');
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const startEditStudent = (student) => {
    setEditingStudent(student);
    setSubTab('register');
    setSuccessMsg('');
    setErrorMsg('');
    reset({
      matricula: student.matricula || '',
      firstName: student.first_name || '',
      lastName: student.last_name || '',
      career: student.career || '',
    });
  };

  const deleteStudent = async (student) => {
    if (!window.confirm(`¿Eliminar a ${student.full_name}?`)) return;

    try {
      const res = await fetch(`${API_URL}/students/${student.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.error || result.message || 'Error al eliminar alumno');
      }

      if (editingStudent?.id === student.id) {
        clearForm();
      }

      setSuccessMsg(result.message || 'Alumno eliminado correctamente');
      fetchStudents();
      onSuccess?.(result);
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado');
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder-zinc-400';

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-800 mb-1">Alumnos</h2>
        <p className="text-sm text-zinc-400">Gestiona alumnos: captura, ver enlazados y no enlazados</p>
        <div className="mt-4 inline-flex rounded-lg bg-white shadow-sm">
          <button type="button" onClick={() => setSubTab('register')} className={`px-4 py-2 ${subTab==='register' ? 'bg-primary text-white rounded-lg' : 'text-zinc-600'}`}>Registrar alumno</button>
          <button type="button" onClick={() => setSubTab('linked')} className={`px-4 py-2 ${subTab==='linked' ? 'bg-primary text-white rounded-lg' : 'text-zinc-600'}`}>Enlazados ({students.filter(s=>s.already_registered).length})</button>
          <button type="button" onClick={() => setSubTab('unlinked')} className={`px-4 py-2 ${subTab==='unlinked' ? 'bg-primary text-white rounded-lg' : 'text-zinc-600'}`}>No enlazados ({students.filter(s=>!s.already_registered).length})</button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">error</span>
          <p className="text-red-600 text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined text-emerald-600 text-[18px] mt-0.5">check_circle</span>
          <p className="text-emerald-700 text-sm font-medium">{successMsg}</p>
        </div>
      )}
      {subTab === 'register' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[16px]">badge</span>
            </div>
            <div>
              <h3 className="font-bold text-zinc-700">
                {editingStudent ? 'Editar información institucional' : 'Información Institucional'}
              </h3>
              {editingStudent && (
                <p className="text-xs text-zinc-400">Editando: {editingStudent.full_name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                Matrícula *
              </label>
              <input
                {...register('matricula', { required: 'La matrícula es requerida' })}
                className={inputClass}
                placeholder="Matricula"
                type="text"
              />
              {errors.matricula && <p className="mt-1 text-red-500 text-xs">{errors.matricula.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                Carrera *
              </label>
              <select
                {...register('career', { required: 'La carrera es requerida' })}
                className={inputClass}
                defaultValue=""
              >
                <option value="" disabled>Selecciona una carrera</option>
                <option value="Ingeniería en Innovación Agrícola Sustentable">Ingeniería en Innovación Agrícola Sustentable</option>
                <option value="Ingeniería en Sistemas Computacionales">Ingeniería en Sistemas Computacionales</option>
                <option value="Licenciatura en Contaduría">Licenciatura en Contaduría</option>
              </select>
              {errors.career && <p className="mt-1 text-red-500 text-xs">{errors.career.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                Nombre(s) *
              </label>
              <input
                {...register('firstName', { required: 'El nombre es requerido' })}
                className={inputClass}
                placeholder="Nombre del estudiante"
                type="text"
              />
              {errors.firstName && <p className="mt-1 text-red-500 text-xs">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                Apellidos *
              </label>
              <input
                {...register('lastName', { required: 'Los apellidos son requeridos' })}
                className={inputClass}
                placeholder="Apellidos del estudiante"
                type="text"
              />
              {errors.lastName && <p className="mt-1 text-red-500 text-xs">{errors.lastName.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            {editingStudent ? (
              <button
                type="button"
                onClick={clearForm}
                className="px-5 py-3 rounded-xl font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-all"
              >
                Cancelar edición
              </button>
            ) : null}
            <p className="text-xs text-zinc-400">
              Esta información será visible para el alumno cuando consulte su matrícula en el registro.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Guardando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                {editingStudent ? 'Actualizar Alumno' : 'Registrar Alumno'}
              </>
            )}
          </button>
        </div>
        </form>
      )}

      {subTab !== 'register' && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          {loadingStudents ? (
            <div className="py-8 text-center">Cargando alumnos...</div>
          ) : (
            <div className="space-y-3">
              {(subTab === 'linked' ? students.filter(s=>s.already_registered) : students.filter(s=>!s.already_registered)).map((s) => (
                <div key={s.id} className="p-3 rounded-lg border border-zinc-100 flex justify-between items-center gap-3">
                  <div>
                    <div className="font-semibold">{s.full_name}</div>
                    <div className="text-xs text-zinc-500">{s.matricula} · {s.career}</div>
                    <div className="text-xs text-zinc-400">{s.institutional_email}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-zinc-600">{s.already_registered ? 'Enlazado' : 'No enlazado'}</span>
                    <button
                      type="button"
                      onClick={() => startEditStudent(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStudent(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Overview ──────────────────────────────────────────────────────

function DashboardOverview({ speakers, loading, setActiveTab }) {
  const recent = [...speakers].slice(0, 5);

  return (
    <>
      <MetricsGrid speakers={speakers} />

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-zinc-50">
          <div>
            <h3 className="font-bold text-zinc-800">Ponentes Recientes</h3>
            <p className="text-xs text-zinc-400">Últimos {recent.length} registros</p>
          </div>
          <button
            onClick={() => setActiveTab('speakers')}
            className="text-primary text-sm font-semibold hover:underline flex items-center gap-1"
          >
            Ver todos{' '}
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-4xl text-zinc-200 block mb-2">group</span>
            <p className="text-zinc-400 text-sm">Aún no hay ponentes registrados</p>
            <button
              onClick={() => setActiveTab('register-speaker')}
              className="mt-3 text-primary text-sm font-semibold hover:underline"
            >
              Registrar el primero →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {recent.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 px-7 py-4 hover:bg-zinc-50/60 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {s.profile_photo_url ? (
                    <img
                      src={`http://localhost:3000${s.profile_photo_url}`}
                      alt={s.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    s.full_name?.charAt(0)?.toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-700 text-sm truncate">{s.full_name}</p>
                  <p className="text-xs text-zinc-400 truncate">{s.conference_name}</p>
                </div>
                <span className="text-xs text-zinc-400 whitespace-nowrap">{formatDate(s.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [speakers, setSpeakers] = useState([]);
  const [loadingSpeakers, setLoadingSpeakers] = useState(true);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => setToast({ message, type });

  // Auth guard
  useEffect(() => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!userStr || !token) { navigate('/login'); return; }
    const userData = JSON.parse(userStr);
    if (userData.role !== 'admin') { navigate('/'); return; }
    setUser(userData);
  }, [navigate]);

  // Fetch speakers
  const fetchSpeakers = useCallback(async () => {
    setLoadingSpeakers(true);
    try {
      const res = await fetch(`${API_URL}/speakers`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Error al obtener ponentes');
      const data = await res.json();
      const mapped = Array.isArray(data)
        ? data.map((s) => ({ ...s, biography: s.biografia || s.biography || '' }))
        : [];
      setSpeakers(mapped);
    } catch (err) {
      showToast(err.message || 'Error cargando ponentes', 'error');
    } finally {
      setLoadingSpeakers(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchSpeakers();
  }, [user, fetchSpeakers]);

  const handleDeleteSpeaker = async (id) => {
    try {
      const res = await fetch(`${API_URL}/speakers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Error al eliminar');
      setSpeakers((prev) => prev.filter((s) => s.id !== id));
      showToast('Ponente eliminado correctamente', 'success');
    } catch (err) {
      showToast(err.message || 'Error al eliminar ponente', 'error');
    }
  };

  const handleSpeakerSaved = (wasEditing = false) => {
    showToast(wasEditing ? 'Ponente actualizado correctamente' : '¡Ponente registrado exitosamente!', 'success');
    setEditingSpeaker(null);
    fetchSpeakers();
    setActiveTab('speakers');
  };

  const handleEditSpeaker = (speaker) => {
    setEditingSpeaker(speaker);
    setActiveTab('register-speaker');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const tabTitles = {
    dashboard: 'Panel de Control',
    speakers: 'Ponentes',
    'register-speaker': 'Registrar Ponente',
    students: 'Registrar Alumnos',
    certificates: 'Certificados',
    calendar: 'Calendario',
    settings: 'Configuración',
  };

  return (
    <div className="bg-zinc-50 text-zinc-800 min-h-screen flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-8 lg:p-10 overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-800">
              {tabTitles[activeTab]}
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Gestión administrativa de la Jornada Académica
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-zinc-700">{user?.name || 'Admin'}</p>
              <p className="text-xs text-zinc-400">Superusuario</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <DashboardOverview
            speakers={speakers}
            loading={loadingSpeakers}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'speakers' && (
          <SpeakersTable
            speakers={speakers}
            loading={loadingSpeakers}
            onDelete={handleDeleteSpeaker}
            onNavigateRegister={() => setActiveTab('register-speaker')}
            onGeneratePDF={generatePDF}
            onEdit={handleEditSpeaker}
          />
        )}

        {activeTab === 'register-speaker' && (
          <RegisterSpeakerPanel
            onSuccess={handleSpeakerSaved}
            editingSpeaker={editingSpeaker}
            onCancelEdit={() => setEditingSpeaker(null)}
          />
        )}

        {activeTab === 'students' && (
          <RegisterStudentPanel
            onSuccess={() => {
              showToast('Alumno registrado correctamente', 'success');
            }}
          />
        )}

        {['certificates', 'calendar', 'settings'].map((tab) =>
          activeTab === tab ? (
            <div
              key={tab}
              className="bg-white rounded-2xl p-12 text-center border border-zinc-100 shadow-sm"
            >
              <span className="material-symbols-outlined text-5xl text-zinc-200 block mb-3">
                construction
              </span>
              <h3 className="text-lg font-bold text-zinc-600 mb-1">{tabTitles[tab]}</h3>
              <p className="text-zinc-400 text-sm">Esta sección está en desarrollo</p>
            </div>
          ) : null
        )}
      </main>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}