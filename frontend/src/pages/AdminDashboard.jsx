import { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import dashboardBrandImg from '../assets/DcRO6.jpg';
import pdfBannerImg from '../assets/images/logo/umb_all.png';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { API_URL, BASE_URL } from '../config';
const AUTH_URL = `${API_URL}/auth`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
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

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

const EMPTY_PINS = Array(8).fill('');

function MatriculaPinInput({ value, onChange, label, colorClass = "text-zinc-400" }) {
  const [pins, setPins] = useState(EMPTY_PINS);
  const safeLabel = label.replace(/\s+/g, '-').toLowerCase();

  useEffect(() => {
    const currentStr = pins.join('');
    if (!value) {
      if (currentStr !== '') setPins(EMPTY_PINS);
    } else if (value.length === 8 && value !== currentStr) {
      setPins(value.split(''));
    }
  }, [value, pins]);

  const handlePinChange = (index, char) => {
    const val = char.slice(-1);
    if (val && !/^\d$/.test(val)) return;

    const newPins = [...pins];
    newPins[index] = val;
    setPins(newPins);

    const fullValue = newPins.join('');
    onChange(fullValue);

    if (val && index < 7) {
      document.getElementById(`pin-${safeLabel}-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pins[index] && index > 0) {
      document.getElementById(`pin-${safeLabel}-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    if (!pasteData) return;

    const newPins = Array(8).fill('');
    pasteData.split('').forEach((char, i) => {
      newPins[i] = char;
    });
    setPins(newPins);
    onChange(newPins.join(''));
    
    const lastIndex = Math.min(pasteData.length, 7);
    document.getElementById(`pin-${safeLabel}-${lastIndex}`)?.focus();
  };

  return (
    <div className="space-y-2">
      <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${colorClass}`}>
        {label}
      </label>
      <div className="flex gap-1.5 sm:gap-2">
        {pins.map((pin, i) => (
          <input
            key={i}
            id={`pin-${safeLabel}-${i}`}
            type="text"
            value={pin}
            onChange={(e) => handlePinChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="w-full aspect-square text-center bg-zinc-50 border border-zinc-100 rounded-xl outline-none text-base sm:text-lg font-bold text-zinc-700 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all p-0"
            autoComplete="off"
          />
        ))}
      </div>
    </div>
  );
}

// ─── Generate PDF — Edición Especial (Reemplaza la función generatePDF anterior) ────

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

async function toDataURL(url) {
  try {
    const img = await getImageDataProportional(url);
    return img ? img.data : null;
  } catch (e) { return null; }
}

// ── Utilidades de dibujo ──────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

/**
 * Dibuja un rectángulo con esquinas redondeadas individualmente.
 * tl, tr, br, bl = radio de cada esquina
 */
function roundedRectCustom(doc, x, y, w, h, tl=0, tr=0, br=0, bl=0, style='F') {
  const k = doc.internal.scaleFactor;
  doc.internal.write(
    `q`,
    `${x * k} ${(doc.internal.pageSize.height - y) * k} m`,
    `${(x + tl) * k} ${(doc.internal.pageSize.height - y) * k} l`,
    `${(x + w - tr) * k} ${(doc.internal.pageSize.height - y) * k} l`,
    `${(x + w) * k} ${(doc.internal.pageSize.height - y) * k} ${(x + w) * k} ${(doc.internal.pageSize.height - y - tr) * k} v`,
    `${(x + w) * k} ${(doc.internal.pageSize.height - y - h + br) * k} l`,
    `${(x + w) * k} ${(doc.internal.pageSize.height - y - h) * k} ${(x + w - br) * k} ${(doc.internal.pageSize.height - y - h) * k} v`,
    `${(x + bl) * k} ${(doc.internal.pageSize.height - y - h) * k} l`,
    `${x * k} ${(doc.internal.pageSize.height - y - h) * k} ${x * k} ${(doc.internal.pageSize.height - y - h + bl) * k} v`,
    `${x * k} ${(doc.internal.pageSize.height - y - tl) * k} l`,
    `${x * k} ${(doc.internal.pageSize.height - y) * k} ${(x + tl) * k} ${(doc.internal.pageSize.height - y) * k} v`,
    style === 'F' ? 'f' : style === 'D' ? 'S' : 'B',
    'Q'
  );
}

// ── Función principal ─────────────────────────────────────────────────────────

async function getPDFDocument(speaker) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Paleta ──────────────────────────────────────────────────────────────────
  const C = {
    bg:          [252, 251, 248],   // crema cálido
    dark:        [18,  22,  30],    // casi negro
    ink:         [38,  42,  54],    // grafito
    gray:        [110, 115, 130],   // gris medio
    lightGray:   [220, 222, 228],   // gris claro
    ultraLight:  [242, 241, 238],   // gris ultra claro
    green:       [128, 186, 38],    // verde marca (80ba26)
    greenLight:  [244, 249, 235],   // verde muy claro (#f4f9eb)
    greenMid:    [157, 204, 82],    // verde medio (#9dcc52)
    wine:        [105, 30,  55],    // guinda oscuro
    wineLight:   [248, 235, 240],   // guinda muy claro
    gold:        [195, 155, 75],    // oro apagado
    white:       [255, 255, 255],
  };

  const W = 210;
  const H = 297;

  // ── FONDO ────────────────────────────────────────────────────────────────────
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, W, H, 'F');

  // ── COLUMNA LATERAL IZQUIERDA (oscura, 58mm) ──────────────────────────────
  const COL = 58;

  doc.setFillColor(...C.dark);
  doc.rect(0, 0, COL, H, 'F');

  // Bloque de acento verde en la parte inferior de la columna
  doc.setFillColor(...C.green);
  doc.rect(0, H - 60, COL, 60, 'F');

  // Línea dorada decorativa vertical
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.5);
  doc.line(COL - 3, 0, COL - 3, H - 60);

  // ── FOTO DE PERFIL (en la columna lateral) ────────────────────────────────
  const photoSize = 44;
  const photoX = (COL - photoSize) / 2;
  const photoY = 22;

  // Marco dorado
  doc.setFillColor(...C.gold);
  doc.rect(photoX - 2, photoY - 2, photoSize + 4, photoSize + 4, 'F');

  try {
    if (speaker.profile_photo_url) {
      const profileData = await toDataURL(BASE_URL + speaker.profile_photo_url);
      if (profileData) {
        const fmt = speaker.profile_photo_url.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
        doc.addImage(profileData, fmt, photoX, photoY, photoSize, photoSize);
      }
    } else {
      doc.setFillColor(40, 46, 62);
      doc.rect(photoX, photoY, photoSize, photoSize, 'F');
      doc.setFontSize(20);
      doc.setTextColor(...C.gold);
      doc.setFont('helvetica', 'bold');
      doc.text(
        (speaker.full_name || 'P').charAt(0).toUpperCase(),
        photoX + photoSize / 2, photoY + photoSize / 2 + 7,
        { align: 'center' }
      );
    }
  } catch (_) {}

  // ── ETIQUETA "FICHA TÉCNICA" (columna lateral, debajo de la foto) ─────────
  let cy = photoY + photoSize + 14;

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.setCharSpace(0.3);
  doc.text('FICHA TÉCNICA', COL / 2, cy, { align: 'center' });
  doc.setCharSpace(0);

  cy += 4;
  // Línea dorada
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.3);
  doc.line(8, cy, COL - 8, cy);
  cy += 6;

  // ── DATOS CLAVE (columna lateral) ────────────────────────────────────────
  function sideLabel(label, value, yPos) {
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.greenMid);
    doc.setCharSpace(0.3);
    doc.text(label, 6, yPos);
    doc.setCharSpace(0);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    const lines = doc.splitTextToSize(value || '—', COL - 12);
    doc.text(lines.slice(0, 2), 6, yPos + 5);
    return yPos + 5 + lines.slice(0, 2).length * 4.2 + 5;
  }

  cy = sideLabel('GRADO ACADÉMICO', speaker.academic_level || '—', cy);
  cy = sideLabel('INSTITUCIÓN', (speaker.institution || '—').toUpperCase(), cy);
  if (speaker.career) cy = sideLabel('CARRERA', speaker.career, cy);
  if (speaker.phone)  cy = sideLabel('TELÉFONO', speaker.phone, cy);

  // ── LOGO INSTITUCIONAL (columna lateral inferior) ─────────────────────────
  if (speaker.institutional_logo_url) {
    try {
      const logo = await getImageDataProportional(BASE_URL + speaker.institutional_logo_url);
      if (logo) {
        const mw = COL - 16;
        const mh = 22;
        const ratio = Math.min(mw / logo.w, mh / logo.h);
        const fw = logo.w * ratio;
        const fh = logo.h * ratio;
        const lx = (COL - fw) / 2;
        doc.addImage(logo.data, logo.format, lx, H - 50, fw, fh, undefined, 'FAST');
      }
    } catch (_) {}
  }

  // ── REDES SOCIALES (columna lateral, arriba del verde) ───────────────────
  if (speaker.social_media) {
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.greenMid);
    doc.setCharSpace(0.3);
    doc.text('WEB / REDES', 6, H - 66);
    doc.setCharSpace(0);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 200);
    const smLines = doc.splitTextToSize(speaker.social_media, COL - 12);
    doc.text(smLines.slice(0, 2), 6, H - 62);
  }

  // ── ÁREA PRINCIPAL (derecha) ──────────────────────────────────────────────
  const MX = COL + 12; // margen izquierdo del área principal
  const MW = W - MX - 10; // ancho del área principal

  // ── BANNER SUPERIOR (logos institucionales) ───────────────────────────────
  try {
    const bannerImg = await getImageDataProportional(pdfBannerImg);
    if (bannerImg) {
      const bW = MW;
      const bH = (bW * bannerImg.h) / bannerImg.w;
      const bY = 8;

      // Fondo blanco redondeado para el banner
      doc.setFillColor(...C.white);
      doc.roundedRect(MX - 1, bY - 1, bW + 2, bH + 2, 2, 2, 'F');
      doc.addImage(bannerImg.data, bannerImg.format, MX, bY, bW, bH);
    }
  } catch (_) {}

  // ── NOMBRE DEL PONENTE ────────────────────────────────────────────────────
  let ry = 38;

  // Línea de acento verde antes del nombre
  doc.setFillColor(...C.green);
  doc.rect(MX, ry, 2.5, 22, 'F');

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  const nameLines = doc.splitTextToSize(speaker.full_name || 'Ponente', MW - 4);
  doc.text(nameLines.slice(0, 2), MX + 7, ry + 9);

  ry += nameLines.slice(0, 2).length <= 1 ? 10 : 18;

  // Separador fino
  ry += 4;
  doc.setDrawColor(...C.lightGray);
  doc.setLineWidth(0.3);
  doc.line(MX, ry, W - 10, ry);
  ry += 8;

  // ── TARJETA: CONFERENCIA ──────────────────────────────────────────────────
  const confH = 40;
  doc.setFillColor(...C.dark);
  doc.roundedRect(MX, ry, MW, confH, 3, 3, 'F');

  // Borde izquierdo dorado
  doc.setFillColor(...C.gold);
  doc.rect(MX, ry, 3, confH, 'F');

  // Etiqueta
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.setCharSpace(0.3);
  doc.text('TÍTULO DE LA CONFERENCIA', MX + 8, ry + 9);
  doc.setCharSpace(0);

  // Línea dorada
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.25);
  doc.line(MX + 8, ry + 11, MX + MW - 6, ry + 11);

  // Título conferencia
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  const confLines = doc.splitTextToSize(speaker.conference_name || 'Sin título asignado', MW - 18);
  doc.text(confLines.slice(0, 2), MX + 8, ry + 20);

  ry += confH + 8;

  // ── GRID: FECHA / HORA / AFORO ────────────────────────────────────────────
  const cols3 = 3;
  const cellGap = 4;
  const cellW = (MW - cellGap * (cols3 - 1)) / cols3;
  const cellH = 26;

  const gridItems = [
    { icon: '📅', label: 'FECHA',   value: formatDate(speaker.suggested_date)  },
    { icon: '🕐', label: 'HORARIO', value: speaker.suggested_time || 'Por definir' },
    { icon: '👥', label: 'AFORO',   value: speaker.audience_capacity ? `${speaker.audience_capacity} pers.` : '—' },
  ];

  gridItems.forEach((item, i) => {
    const cx = MX + i * (cellW + cellGap);

    // Fondo celda
    doc.setFillColor(...C.ultraLight);
    doc.roundedRect(cx, ry, cellW, cellH, 2, 2, 'F');

    // Borde superior verde
    doc.setFillColor(...C.green);
    doc.rect(cx, ry, cellW, 2, 'F');

    // Label
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.green);
    doc.setCharSpace(0.3);
    doc.text(item.label, cx + 6, ry + 9);
    doc.setCharSpace(0);

    // Value
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    const vl = doc.splitTextToSize(String(item.value), cellW - 10);
    doc.text(vl.slice(0, 1), cx + 6, ry + 18);
  });

  ry += cellH + 8;

  // ── RECINTO ───────────────────────────────────────────────────────────────
  if (speaker.venue) {
    doc.setFillColor(...C.wine);
    doc.roundedRect(MX, ry, MW, 28, 3, 3, 'F');

    // Patrón de puntos decorativo
    doc.setFillColor(255, 255, 255);
    for (let px = MX + MW - 30; px < MX + MW - 4; px += 5) {
      for (let py = ry + 4; py < ry + 24; py += 5) {
        doc.circle(px, py, 0.5, 'F');
      }
    }

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 170, 185);
    doc.setCharSpace(0.3);
    doc.text('RECINTO ASIGNADO', MX + 8, ry + 9);
    doc.setCharSpace(0);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(speaker.venue.name || '', MX + 8, ry + 18);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(210, 175, 190);
    const venueDetail = [speaker.venue.building, speaker.venue.floor].filter(Boolean).join('  ·  ');
    doc.text(venueDetail, MX + 8, ry + 24);

    ry += 36;
  }

  // ── SEMBLANZA ─────────────────────────────────────────────────────────────
  const bio = speaker.biografia || speaker.biography || '';
  if (bio) {
    // Encabezado de sección estilo editorial
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.green);
    doc.setCharSpace(0.3);
    doc.text('SEMBLANZA CURRICULAR', MX, ry + 5);
    doc.setCharSpace(0);

    // Línea decorativa: dorada corta + gris larga
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.6);
    doc.line(MX, ry + 7, MX + 18, ry + 7);
    doc.setDrawColor(...C.lightGray);
    doc.setLineWidth(0.3);
    doc.line(MX + 20, ry + 7, MX + MW, ry + 7);

    ry += 12;

    // Comilla decorativa
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.greenLight[0] !== undefined ? C.greenLight : [235,245,238]);
    doc.setTextColor(210, 230, 215);
    doc.text('"', MX, ry + 6);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.gray);
    const bioLines = doc.splitTextToSize(bio, MW - 8);
    const displayBio = bioLines.slice(0, 7);
    doc.text(displayBio, MX + 6, ry + 2);
    ry += displayBio.length * 5 + 10;
  }

  // ── PIE DE PÁGINA ─────────────────────────────────────────────────────────

  // Franja verde inferior en área principal
  doc.setFillColor(...C.green);
  doc.rect(COL, H - 16, W - COL, 16, 'F');

  // Texto centrado pie
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 215, 190);
  doc.text(
    `13va Jornada Académica y Cultural · Universidad Mexiquense del Bicentenario · ${new Date().toLocaleDateString('es-MX')}`,
    W - 12, H - 7,
    { align: 'right' }
  );

  // Línea dorada sobre el pie
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.line(COL, H - 16, W, H - 16);

  return doc;
}

async function generatePDF(speaker) {
  const doc = await getPDFDocument(speaker);
  doc.save(`FICHA_${(speaker.full_name || 'ponente').replace(/\s+/g, '_')}.pdf`);
}

async function generateSpeakersPDF(speakers) {
  const doc = new jsPDF();
  
  // Banner Logo
  try {
    const bannerImg = await getImageDataProportional(pdfBannerImg);
    if (bannerImg) {
      const bW = 182;
      const bH = (bW * bannerImg.h) / bannerImg.w;
      doc.addImage(bannerImg.data, bannerImg.format, 14, 10, bW, bH);
    }
  } catch (_) {}

  // Header
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text('Lista de Ponentes Registrados', 14, 50);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Total de ponentes: ${speakers.length}`, 14, 58);
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 63);

  const tableColumn = ["Nombre", "Institución", "Conferencia", "Nivel", "Fecha", "Aforo"];
  const tableRows = [];

  speakers.forEach(speaker => {
    const speakerData = [
      speaker.full_name,
      speaker.institution || '—',
      speaker.conference_name || '—',
      speaker.academic_level || '—',
      speaker.suggested_date ? new Date(speaker.suggested_date).toLocaleDateString() : '—',
      speaker.audience_capacity || '—'
    ];
    tableRows.push(speakerData);
  });

  // @ts-ignore
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 73,
    theme: 'striped',
    headStyles: { fillColor: [96, 140, 29] }, // Color primario #608c1d
    styles: { fontSize: 9 }
  });

  // Logos Institucionales
  const logoUrls = new Set();
  speakers.forEach(s => {
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
    
    // Si la tabla terminó muy abajo (menos de 45mm de margen inferior), agregamos otra página
    if (tableFinalY > pageHeight - 45) {
      doc.addPage();
    }

    // Fijamos la posición Y cerca de la parte inferior de la hoja
    let footerY = pageHeight - 30; 

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Instituciones Participantes', 14, footerY - 5);
    
    let currentX = 14;
    const maxLogoHeight = 12; // Altura máxima restringida
    const maxLogoWidth = 25;  // Anchura máxima restringida
    const spacing = 8;
    const maxWidth = pageWidth - 14; 

    for (const logoUrl of uniqueLogos) {
      try {
        const logoData = await getImageDataProportional(logoUrl);
        if (logoData) {
          // Escalar proporcionalmente manteniendo los límites máximos
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
             // Si no cabe, saltamos de línea hacia abajo
             currentX = 14;
             footerY += maxLogoHeight + 5;
             // Por seguridad, si de alguna forma nos salimos de la hoja:
             if (footerY > pageHeight - 5) {
               break; 
             }
          }
          
          // Alinear verticalmente los logos al centro de la "fila"
          const yOffset = footerY + (maxLogoHeight - drawH) / 2;
          doc.addImage(logoData.data, logoData.format, currentX, yOffset, drawW, drawH);
          currentX += drawW + spacing;
        }
      } catch (err) {
        console.warn("Could not load logo for PDF", err);
      }
    }
  }

  doc.save("Reporte_Ponentes.pdf");
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
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url = null;
    async function loadPDF() {
      if (!speaker) return;
      setLoading(true);
      try {
        const doc = await getPDFDocument(speaker);
        const blob = doc.output('blob');
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (e) {
        console.error("Error rendering preview:", e);
      } finally {
        setLoading(false);
      }
    }
    loadPDF();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [speaker]);

  if (!speaker) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-slide-in flex flex-col h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
            </div>
            <div>
              <h3 className="font-black text-zinc-800 text-lg leading-tight">Vista Previa Real del Documento</h3>
              <p className="text-xs text-zinc-400">Así es exactamente como se verá el PDF final</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 rounded-full hover:bg-zinc-200 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-zinc-800 relative overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
              <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              <p className="text-sm font-bold tracking-widest opacity-50 uppercase">Generando vista previa...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full border-none"
              title="PDF Preview"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
              Error al generar la vista previa
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => { onDownload(speaker); onClose(); }}
            className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({ speakers: true });
  const [systemLogo, setSystemLogo] = useState(null);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const res = await fetch(`${API_URL}/system/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.sidebar_logo) {
            setSystemLogo(`${BASE_URL}${data.sidebar_logo}`);
          }
        }
      } catch (err) {
        console.error("Error fetching system logo:", err);
      }
    };
    fetchLogo();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const toggleMenu = (id) => {
    setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Panel' },
    { id: 'speakers', icon: 'school', label: 'Ponentes' },
    { id: 'venues', icon: 'apartment', label: 'Recintos' },
    { id: 'students', icon: 'badge', label: 'Gestión de Alumnos' },
    { id: 'admins', icon: 'admin_panel_settings', label: 'Administradores' },
    { id: 'certificates', icon: 'workspace_premium', label: 'Certificados' },
    { id: 'calendar', icon: 'calendar_today', label: 'Calendario' },
    { id: 'stationery', icon: 'inventory_2', label: 'Material de Papeleria' },
    { id: 'contests', icon: 'emoji_events', label: 'Certamenes' },
    { id: 'settings', icon: 'settings', label: 'Ajustes' },
  ];

  return (
    <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 rounded-r-[3rem] bg-surface-container-low flex flex-col py-10 z-50 shadow-sm transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="px-8 mb-8 flex items-center justify-between">
        <img src={systemLogo || dashboardBrandImg} alt="Universidad Mexiquense del Bicentenario" className="h-16 w-auto object-contain" />
        <button onClick={onClose} className="lg:hidden p-2 text-zinc-400 hover:text-zinc-700">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 px-4 pr-3">
        {navItems.map((item) => (
          <div key={item.id} className="flex flex-col gap-1">
            {item.children ? (
              <>
                <button
                  onClick={() => toggleMenu(item.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-left w-full ${
                    item.children.some(c => c.id === activeTab)
                      ? 'text-primary font-bold'
                      : 'text-zinc-500 hover:bg-zinc-200/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="font-body text-sm font-medium">{item.label}</span>
                  </div>
                  <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${openMenus[item.id] ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
                <div className={`flex flex-col gap-1 pl-4 overflow-hidden transition-all duration-300 ${openMenus[item.id] ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                  {item.children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => setActiveTab(child.id)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-left w-full ${
                        activeTab === child.id
                          ? 'bg-primary text-white font-bold shadow-sm'
                          : 'text-zinc-400 hover:bg-zinc-200/40'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{child.icon}</span>
                      <span className="font-body text-[13px] font-medium">{child.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left w-full ${
                  activeTab === item.id
                    ? 'bg-primary text-white font-bold shadow-md'
                    : 'text-zinc-500 hover:bg-zinc-200/60'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-body text-sm font-medium">{item.label}</span>
              </button>
            )}
          </div>
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

function BottomNav({ activeTab, setActiveTab }) {
  const items = [
    { id: 'dashboard', icon: 'dashboard', label: 'Inicio' },
    { id: 'speakers', icon: 'school', label: 'Ponentes' },
    { id: 'students', icon: 'badge', label: 'Alumnos' },
    { id: 'contests', icon: 'emoji_events', label: 'Certámenes' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-6 py-3 z-40 flex justify-between items-center shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === item.id ? 'text-primary scale-110' : 'text-zinc-400'
          }`}
        >
          <span className={`material-symbols-outlined text-[24px] ${activeTab === item.id ? 'fill-1' : ''}`}>
            {item.icon}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
        </button>
      ))}
    </nav>
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
            <button
              onClick={() => generateSpeakersPDF(filtered)}
              className="bg-zinc-800 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-zinc-700 transition-colors text-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              Reporte PDF
            </button>
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
                            src={`${BASE_URL}${speaker.profile_photo_url}`}
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
                      {speaker.suggested_time && (
                        <span className="block text-zinc-400 mt-0.5">{speaker.suggested_time}</span>
                      )}
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
                        <div className="flex items-center justify-end gap-2">
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
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({
    defaultValues: {
      fullName: '',
      academicLevel: 'Licenciatura',
      institution: '',
      career: '',
      biography: '',
      conferenceName: '',
      suggestedDate: '',
      suggestedTime: '',
      audienceCapacity: '',
      phone: '',
      socialMedia: '',
      venueId: '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [profilePreview, setProfilePreview] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [venues, setVenues] = useState([]);
  const [selectedVenuePreview, setSelectedVenuePreview] = useState(null);
  const profilePhotoRef = useRef(null);
  const institutionalLogoRef = useRef(null);

  const watchVenueId = watch('venueId');

  const fetchVenues = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/venues`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setVenues(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching venues:', err);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

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
        suggestedTime: editingSpeaker.suggested_time || '',
        audienceCapacity: editingSpeaker.audience_capacity || '',
        phone: editingSpeaker.phone || '',
        socialMedia: editingSpeaker.social_media || '',
        venueId: editingSpeaker.venue_id ? String(editingSpeaker.venue_id) : '',
      });
      setProfilePreview(editingSpeaker.profile_photo_url ? `${BASE_URL}${editingSpeaker.profile_photo_url}` : null);
      setLogoPreview(editingSpeaker.institutional_logo_url ? `${BASE_URL}${editingSpeaker.institutional_logo_url}` : null);
    } else {
      reset({
        fullName: '',
        academicLevel: 'Licenciatura',
        institution: '',
        career: '',
        biography: '',
        conferenceName: '',
        suggestedDate: '',
        suggestedTime: '',
        audienceCapacity: '',
        phone: '',
        socialMedia: '',
        venueId: '',
      });
      setProfilePreview(null);
      setLogoPreview(null);
    }
  }, [editingSpeaker, reset]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'profile') setProfilePreview(reader.result);
        if (type === 'logo') setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVenueChange = async (e) => {
    const newVenueId = e.target.value;
    setValue('venueId', newVenueId);

    // Si estamos editando un ponente, registrar el cambio inmediatamente en la BD
    if (editingSpeaker?.id) {
      try {
        const formData = new FormData();
        formData.append('venue_id', newVenueId || 'null');
        
        const response = await fetch(`${API_URL}/speakers/${editingSpeaker.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: formData
        });

        if (!response.ok) throw new Error('Error al registrar recinto en la base de datos');
        console.log('Recinto actualizado inmediatamente en la BD');
      } catch (err) {
        console.error(err);
        setErrorMsg('Error al guardar el recinto automáticamente');
      }
    }
  };

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
      formData.append('suggested_time', data.suggestedTime || '');
      formData.append('audience_capacity', data.audienceCapacity ? parseInt(data.audienceCapacity) : '');
      formData.append('phone', data.phone || '');
      formData.append('social_media', data.socialMedia || '');
      formData.append('venue_id', data.venueId || '');
      formData.append('accepted_terms', 'true');

      const profilePhotoFile = profilePhotoRef.current?.files?.[0];
      if (profilePhotoFile) formData.append('profile_photo', profilePhotoFile);

      const institutionalLogoFile = institutionalLogoRef.current?.files?.[0];
      if (institutionalLogoFile) formData.append('institutional_logo', institutionalLogoFile);

      const isEditing = Boolean(editingSpeaker?.id);
      const response = await fetch(
        isEditing ? `${API_URL}/speakers/${editingSpeaker.id}` : `${API_URL}/speakers`,
        { 
          method: isEditing ? 'PUT' : 'POST', 
          body: formData,
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || err.message || 'Error al guardar');
      }

      onSuccess?.(isEditing);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showVenueDetails = () => {
    const venue = venues.find(v => String(v.id) === String(watchVenueId));
    if (venue) setSelectedVenuePreview(venue);
  };

  const inputClass =
    'w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder-zinc-400';

  return (
    <div className="max-w-3xl w-full">
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
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Nombre Completo *</label>
              <input {...register('fullName', { required: 'El nombre es requerido' })} className={inputClass} placeholder="Ej: Dr. Juan García López" />
              {errors.fullName && <p className="mt-1 text-red-500 text-xs">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Grado Académico *</label>
              <select {...register('academicLevel')} className={inputClass}>
                <option value="Doctorado">Doctorado</option>
                <option value="Maestría">Maestría</option>
                <option value="Licenciatura">Licenciatura</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">Institución</label>
              <input {...register('institution')} className={inputClass} placeholder="Ej: Universidad Mexiquense del Bicentenario" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">Carrera / Especialidad</label>
              <input {...register('career')} className={inputClass} placeholder="Ej: Ingeniería en Sistemas" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">Biografía</label>
              <textarea {...register('biography')} className={`${inputClass} resize-none`} rows={3} placeholder="Semblanza profesional..." />
            </div>
          </div>
        </div>

        {/* Archivos (Previews) */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[16px]">upload</span>
            </div>
            <h3 className="font-bold text-zinc-700">Archivos y Previsualización</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Foto de Perfil</label>
              <div 
                onClick={() => profilePhotoRef.current?.click()}
                className="aspect-square w-32 mx-auto bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-3xl flex items-center justify-center cursor-pointer hover:border-primary/40 overflow-hidden relative group"
              >
                {profilePreview ? (
                  <img src={profilePreview} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-zinc-300 text-3xl">add_a_photo</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">CAMBIAR</div>
              </div>
              <input ref={profilePhotoRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'profile')} />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Logo Institucional</label>
              <div 
                onClick={() => institutionalLogoRef.current?.click()}
                className="aspect-square w-32 mx-auto bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-3xl flex items-center justify-center cursor-pointer hover:border-primary/40 overflow-hidden relative group"
              >
                {logoPreview ? (
                  <img src={logoPreview} className="w-full h-full object-contain p-4" />
                ) : (
                  <span className="material-symbols-outlined text-zinc-300 text-3xl">upload_file</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">CAMBIAR</div>
              </div>
              <input ref={institutionalLogoRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
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
              <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Título de la Conferencia *</label>
              <input {...register('conferenceName', { required: 'Título requerido' })} className={inputClass} placeholder="Ej: El impacto de la IA en la educación" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Recinto / Espacio Asignado</label>
                <div className="flex gap-2">
                  <select 
                    {...register('venueId')} 
                    onChange={handleVenueChange}
                    className={`${inputClass} flex-1`}
                  >
                    <option value="">-- No asignar aún --</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.building})</option>
                    ))}
                  </select>
                </div>

                {/* Visualización inmediata del recinto seleccionado */}
                {(() => {
                  const v = venues.find(val => String(val.id) === String(watchVenueId));
                  if (!v) return null;
                  return (
                    <div className="mt-4 p-4 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl flex items-center gap-4 animate-slide-in">
                      <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-emerald-100 shadow-sm shrink-0">
                        {v.image_url ? (
                          <img src={`${BASE_URL}${v.image_url}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-emerald-200">
                            <span className="material-symbols-outlined text-3xl">apartment</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <p className="text-sm font-black text-emerald-900 truncate">{v.name}</p>
                        </div>
                        <p className="text-[10px] text-emerald-600/70 font-bold uppercase tracking-widest mt-0.5">
                          {v.building} {v.floor ? `· Piso ${v.floor}` : ''}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                           <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700/50">
                             <span className="material-symbols-outlined text-[14px]">groups</span>
                             {v.capacity || 0} PERS.
                           </span>
                           <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700/50">
                             <span className="material-symbols-outlined text-[14px]">meeting_room</span>
                             {v.type}
                           </span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={showVenueDetails}
                        className="p-2 text-emerald-400 hover:text-emerald-600 transition-colors"
                        title="Ver detalles completos"
                      >
                        <span className="material-symbols-outlined">open_in_new</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Fecha Tentativa</label>
                  <input {...register('suggestedDate')} type="date" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Hora Tentativa</label>
                  <input {...register('suggestedTime')} type="time" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Aforo Esperado</label>
                <input {...register('audienceCapacity')} type="number" min="1" placeholder="Ej: 100" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Teléfono de Contacto</label>
                <input {...register('phone')} type="tel" placeholder="Ej: 5512345678" className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Redes Sociales / LinkedIn</label>
                <input {...register('socialMedia')} type="url" placeholder="https://linkedin.com/in/..." className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            {editingSpeaker && (
              <button type="button" onClick={onCancelEdit} className="px-6 py-3 rounded-xl font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-all">Cancelar</button>
            )}
          </div>
          <button type="submit" disabled={loading} className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-md disabled:opacity-50">
            {loading ? 'Guardando...' : (editingSpeaker ? 'Actualizar Ponente' : 'Registrar Ponente')}
          </button>
        </div>
      </form>

      {/* Mini Modal Preview Recinto */}
      {selectedVenuePreview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-in">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h4 className="font-bold text-zinc-800">Detalles del Recinto</h4>
              <button onClick={() => setSelectedVenuePreview(null)} className="p-1 hover:bg-zinc-200 rounded-full"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-video bg-zinc-100 rounded-xl overflow-hidden border border-zinc-100">
                {selectedVenuePreview.image_url ? (
                  <img src={`${BASE_URL}${selectedVenuePreview.image_url}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300"><span className="material-symbols-outlined text-4xl">apartment</span></div>
                )}
              </div>
              <div>
                <p className="text-lg font-black text-zinc-800 leading-tight">{selectedVenuePreview.name}</p>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{selectedVenuePreview.building} · {selectedVenuePreview.floor}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Capacidad</p>
                  <p className="text-sm font-bold text-zinc-700 flex items-center gap-1"><span className="material-symbols-outlined text-primary text-[14px]">groups</span> {selectedVenuePreview.capacity} pers.</p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Tipo</p>
                  <p className="text-sm font-bold text-zinc-700">{selectedVenuePreview.type}</p>
                </div>
              </div>
              {selectedVenuePreview.amenities?.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Equipamiento</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedVenuePreview.amenities.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-zinc-50 border-t border-zinc-100">
              <button onClick={() => setSelectedVenuePreview(null)} className="w-full py-2 bg-white border border-zinc-200 text-zinc-600 font-bold rounded-xl text-xs hover:bg-zinc-100 transition-all">Cerrar vista previa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Students Section (Alumnos) ─────────────────────────────────────────────

function StudentsPanel() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [search, setSearch] = useState('');
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/students`, { headers: getAuthHeaders() });
      if (handleAuthError(res, navigate)) return;
      if (!res.ok) throw new Error('Error al obtener alumnos');
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  }, [navigate]);

  useEffect(() => { 
    fetchStudents(); 
  }, [fetchStudents]);

  const openModal = (student = null) => {
    setEditingStudent(student);
    if (student) {
      reset({
        matricula: student.matricula,
        firstName: student.first_name,
        lastName: student.last_name,
        career: student.career
      });
    } else {
      reset({ matricula: '', firstName: '', lastName: '', career: '' });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      const isEditing = Boolean(editingStudent?.id);
      const url = isEditing ? `${API_URL}/students/${editingStudent.id}` : `${API_URL}/students`;
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          matricula: data.matricula,
          first_name: data.firstName,
          last_name: data.lastName,
          career: data.career,
        }),
      });
      if (!res.ok) throw new Error('Error al guardar alumno');
      setIsModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: isEditing ? 'Actualizado' : 'Registrado',
        text: 'Información del alumno guardada correctamente',
        timer: 1500,
        showConfirmButton: false
      });
      fetchStudents();
    } catch (err) { 
      Swal.fire({ icon: 'error', title: 'Error', text: err.message }); 
    }
  };

  const deleteStudent = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#608c1d',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/students/${id}`, { 
        method: 'DELETE', 
        headers: getAuthHeaders() 
      });
      if (!res.ok) throw new Error('Error al eliminar');
      Swal.fire('Eliminado', 'El alumno ha sido removido del sistema', 'success');
      fetchStudents();
    } catch (err) { 
      Swal.fire('Error', err.message, 'error'); 
    }
  };

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.matricula?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: students.length,
    linked: students.filter(s => s.already_registered).length,
    unlinked: students.filter(s => !s.already_registered).length
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Metrics */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-white p-7 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-zinc-50 rounded-xl text-zinc-400">
                <span className="material-symbols-outlined">group</span>
              </div>
           </div>
           <h4 className="text-3xl font-black text-zinc-800">{stats.total}</h4>
           <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Alumnos</p>
         </div>

         <div className="bg-white p-7 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
                <span className="material-symbols-outlined">how_to_reg</span>
              </div>
              <span className="text-[9px] font-black text-emerald-500 px-2 py-0.5 bg-emerald-50 rounded-full">ENLAZADOS</span>
           </div>
           <h4 className="text-3xl font-black text-emerald-600">{stats.linked}</h4>
           <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Con cuenta de acceso</p>
         </div>

         <div className="bg-white p-7 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
                <span className="material-symbols-outlined">person_search</span>
              </div>
              <span className="text-[9px] font-black text-emerald-500 px-2 py-0.5 bg-emerald-50 rounded-full">PENDIENTES</span>
           </div>
           <h4 className="text-3xl font-black text-emerald-600">{stats.unlinked}</h4>
           <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sin registro previo</p>
         </div>
       </div>

       {/* Actions Header */}
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="relative w-full md:w-96">
           <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-[20px]">search</span>
           <input
             type="text"
             placeholder="Buscar por nombre o matrícula..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm shadow-sm"
           />
         </div>
         <button
           onClick={() => openModal()}
           className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-2xl font-black hover:bg-[#608c1d] transition-all shadow-lg shadow-primary/20 text-sm uppercase tracking-wider"
         >
           <span className="material-symbols-outlined">person_add</span>
           Registrar Alumno
         </button>
       </div>

       {/* Main Table */}
       <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
         {loading ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-sm font-bold text-zinc-400 uppercase tracking-widest">Consultando padrón...</p>
            </div>
         ) : filtered.length > 0 ? (
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-zinc-50/50 border-b border-zinc-100 text-zinc-400 font-black uppercase tracking-widest text-[10px]">
                 <tr>
                   <th className="px-8 py-5">Estudiante</th>
                   <th className="px-8 py-5">Identificación</th>
                   <th className="px-8 py-5">Carrera</th>
                   <th className="px-8 py-5 text-center">Estatus</th>
                   <th className="px-8 py-5 text-right">Acciones</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-zinc-50">
                 {filtered.map(s => (
                   <tr key={s.id} className="hover:bg-zinc-50/30 transition-colors group">
                     <td className="px-8 py-4">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-500 font-black text-sm uppercase border border-zinc-200 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300">
                           {s.first_name?.charAt(0)}
                         </div>
                         <div>
                           <p className="font-bold text-zinc-800 leading-tight">{s.full_name}</p>
                           <p className="text-[10px] text-zinc-400 font-medium">Estudiante Regular</p>
                         </div>
                       </div>
                     </td>
                     <td className="px-8 py-4">
                       <p className="font-black text-zinc-700 text-xs">{s.matricula}</p>
                       <p className="text-[10px] text-primary font-mono mt-0.5">{s.institutional_email}</p>
                     </td>
                     <td className="px-8 py-4">
                       <p className="text-xs text-zinc-500 font-medium leading-tight max-w-[200px]">{s.career}</p>
                     </td>
                     <td className="px-8 py-4 text-center">
                       <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${s.already_registered ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-400'}`}>
                         <span className={`w-1.5 h-1.5 rounded-full ${s.already_registered ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`}></span>
                         {s.already_registered ? 'Vinculado' : 'Pendiente'}
                       </div>
                     </td>
                     <td className="px-8 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openModal(s)} className="p-2 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all" title="Editar datos"><span className="material-symbols-outlined text-[20px]">edit_square</span></button>
                          <button onClick={() => deleteStudent(s.id)} className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Dar de baja"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                        </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         ) : (
           <div className="py-24 text-center">
             <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-inner">
               <span className="material-symbols-outlined text-4xl text-zinc-200">person_off</span>
             </div>
             <h4 className="text-lg font-bold text-zinc-400">Sin resultados</h4>
             <p className="text-sm text-zinc-300 max-w-xs mx-auto">No hay alumnos que coincidan con los criterios de búsqueda.</p>
           </div>
         )}
       </div>

       {/* Modal Student Form */}
       {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
             <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-slide-in">
                <div className="px-10 py-8 bg-zinc-50/80 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shadow-primary/5">
                      <span className="material-symbols-outlined text-[28px]">{editingStudent ? 'edit_note' : 'person_add'}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-800 leading-tight">{editingStudent ? 'Editar Estudiante' : 'Nuevo Registro'}</h3>
                      <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Captura de información institucional</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400"><span className="material-symbols-outlined">close</span></button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-8">
                   <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Matrícula Escolar *</label>
                        <input {...register('matricula', { required: true })} className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all" placeholder="Ej: 22090001" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-1 gap-1">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nombre(s) *</label>
                          <input {...register('firstName', { required: true })} className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all" placeholder="Nombre" />
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Apellidos *</label>
                          <input {...register('lastName', { required: true })} className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all" placeholder="Apellidos" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Carrera / Programa Académico *</label>
                        <select {...register('career', { required: true })} className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all appearance-none cursor-pointer">
                           <option value="">Selecciona una carrera</option>
                           <option value="Ingeniería en Innovación Agrícola Sustentable">Ingeniería en Innovación Agrícola Sustentable</option>
                           <option value="Ingeniería en Sistemas Computacionales">Ingeniería en Sistemas Computacionales</option>
                           <option value="Licenciatura en Contaduría">Licenciatura en Contaduría</option>
                        </select>
                      </div>
                   </div>

                   <div className="flex items-center justify-between pt-4 gap-4">
                     <p className="text-[9px] text-zinc-400 font-bold max-w-[200px]">Los datos deben coincidir con los registros oficiales de la UMB.</p>
                     <div className="flex gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-black text-zinc-400 hover:text-zinc-600 transition-colors">CANCELAR</button>
                        <button type="submit" className="bg-primary text-white px-10 py-3 rounded-2xl font-black shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-wider">
                           {editingStudent ? 'GUARDAR CAMBIOS' : 'CREAR REGISTRO'}
                        </button>
                     </div>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
}

function AdminsPanel() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  const currentUser = JSON.parse(userStr || '{}');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users`, { headers: getAuthHeaders() });
      if (handleAuthError(res, navigate)) return;
      if (!res.ok) throw new Error('Error al obtener administradores');
      const data = await res.json();
      setAdmins(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const onSubmit = async (data) => {
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          role: 'admin'
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al registrar administrador');
      }
      setIsModalOpen(false);
      reset();
      Swal.fire({
        icon: 'success',
        title: 'Registrado',
        text: 'Nuevo administrador creado correctamente',
        timer: 1500,
        showConfirmButton: false
      });
      fetchAdmins();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  const deleteAdmin = async (id) => {
    // Restriction: Only can delete self
    if (id !== currentUser.id) {
        Swal.fire({
            icon: 'error',
            title: 'Acción no permitida',
            text: 'Solo puedes eliminar tu propia cuenta de administrador por motivos de seguridad.',
            confirmButtonColor: '#608c1d',
        });
        return;
    }

    const result = await Swal.fire({
      title: '¿ESTÁS SEGURO DE ELIMINAR TU CUENTA?',
      text: "ESTA ACCIÓN ES IRREVERSIBLE. Perderás el acceso al sistema inmediatamente y no se podrá recuperar la cuenta.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#608c1d',
      confirmButtonText: 'SÍ, ELIMINAR MI CUENTA',
      cancelButtonText: 'CANCELAR',
      customClass: {
        title: 'text-red-600 font-black',
        popup: 'rounded-[2rem]'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Error al eliminar');
      
      await Swal.fire({
          icon: 'success',
          title: 'Cuenta Eliminada',
          text: 'Tu acceso ha sido revocado. Serás redirigido al inicio.',
          timer: 2000,
          showConfirmButton: false
      });

      // Logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      navigate('/login');
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const filtered = admins.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Actions Header */}
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="relative w-full md:w-96">
           <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-[20px]">search</span>
           <input
             type="text"
             placeholder="Buscar administrador..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm shadow-sm"
           />
         </div>
         <button
           onClick={() => setIsModalOpen(true)}
           className="w-full md:w-auto flex items-center justify-center gap-2 bg-zinc-800 text-white px-6 py-2.5 rounded-2xl font-black hover:bg-black transition-all shadow-lg text-sm uppercase tracking-wider"
         >
           <span className="material-symbols-outlined">person_add</span>
           Nuevo Administrador
         </button>
       </div>

       {/* Table */}
       <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
         {loading ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-sm font-bold text-zinc-400 uppercase tracking-widest">Cargando equipo...</p>
            </div>
         ) : (
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-zinc-50/50 border-b border-zinc-100 text-zinc-400 font-black uppercase tracking-widest text-[10px]">
                 <tr>
                   <th className="px-8 py-5">Nombre</th>
                   <th className="px-8 py-5">Correo Electrónico</th>
                   <th className="px-8 py-5">Registro</th>
                   <th className="px-8 py-5 text-right">Acciones</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-zinc-50">
                 {filtered.map(a => (
                   <tr key={a.id} className={`hover:bg-zinc-50/30 transition-colors group ${a.id === currentUser.id ? 'bg-primary/5' : ''}`}>
                     <td className="px-8 py-4">
                       <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm uppercase border ${a.id === currentUser.id ? 'bg-primary text-white border-primary' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                           {a.name?.charAt(0)}
                         </div>
                         <div>
                           <p className="font-bold text-zinc-800 leading-tight">
                             {a.name} {a.id === currentUser.id && <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-full ml-1">TÚ</span>}
                           </p>
                           <p className="text-[10px] text-zinc-400 font-medium">Administrador del Sistema</p>
                         </div>
                       </div>
                     </td>
                     <td className="px-8 py-4">
                       <p className="font-medium text-zinc-600">{a.email}</p>
                     </td>
                     <td className="px-8 py-4">
                        <p className="text-xs text-zinc-400 font-medium">{new Date(a.created_at).toLocaleDateString()}</p>
                     </td>
                     <td className="px-8 py-4 text-right">
                        {a.id === currentUser.id ? (
                          <button 
                            onClick={() => deleteAdmin(a.id)} 
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all" 
                            title="Eliminar mi cuenta"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest px-4">Protegido</span>
                        )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         )}
       </div>

       {/* Modal Create Admin */}
       {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
             <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-slide-in">
                <div className="px-10 py-8 bg-zinc-50/80 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-white shadow-lg">
                      <span className="material-symbols-outlined text-[28px]">admin_panel_settings</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-800 leading-tight">Nuevo Administrador</h3>
                      <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Acceso total al sistema</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400"><span className="material-symbols-outlined">close</span></button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-8">
                   <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nombre Completo *</label>
                        <input {...register('name', { required: true })} className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-zinc-800/10 focus:border-zinc-800/30 transition-all" placeholder="Ej: Lic. Maria Perez" />
                      </div>

                      <div className="grid grid-cols-1 gap-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Correo Electrónico *</label>
                        <input {...register('email', { required: true })} type="email" className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-zinc-800/10 focus:border-zinc-800/30 transition-all" placeholder="admin@ejemplo.com" />
                      </div>

                      <div className="grid grid-cols-1 gap-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Contraseña Temporal *</label>
                        <input {...register('password', { required: true, minLength: 8 })} type="password" className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-zinc-800/10 focus:border-zinc-800/30 transition-all" placeholder="Mínimo 8 caracteres" />
                        {password && <PasswordStrengthMeter password={password} />}
                      </div>
                   </div>

                   <div className="flex items-center justify-end gap-3 pt-4">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-black text-zinc-400 hover:text-zinc-600 transition-colors">CANCELAR</button>
                      <button type="submit" className="bg-zinc-800 text-white px-10 py-3 rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-wider">
                         CREAR ACCESO
                      </button>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
}

// ─── Venues Section (Recintos) ───────────────────────────────────────────────

function VenuesPanel() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [search, setSearch] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const imageInputRef = useRef(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/venues`, {
        headers: getAuthHeaders(),
      });
      if (handleAuthError(res, navigate)) return;
      if (!res.ok) throw new Error('Error al obtener recintos');
      const data = await res.json();
      setVenues(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const amenityOptions = ['Proyector', 'Sonido', 'A/C', 'Internet', 'PCs', 'Pizarrón', 'Gas', 'Microscopios', 'Cámaras', 'Pantalla LED'];

  const openModal = (venue = null, isView = false) => {
    setEditingVenue(venue);
    setViewMode(isView);
    setImageFile(null);
    if (venue) {
      setPreviewImage(venue.image_url ? `${BASE_URL}${venue.image_url}` : null);
      reset({
        name: venue.name,
        type: venue.type,
        building: venue.building || '',
        floor: venue.floor || '',
        capacity: venue.capacity || '',
        status: venue.status,
        amenities: venue.amenities || [],
        observations: venue.observations || ''
      });
    } else {
      setPreviewImage(null);
      reset({ name: '', type: 'Aula', building: '', floor: '', capacity: '', status: 'Disponible', amenities: [], observations: '' });
    }
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('type', data.type);
    formData.append('building', data.building || '');
    formData.append('floor', data.floor || '');
    formData.append('capacity', data.capacity || '');
    formData.append('status', data.status);
    formData.append('observations', data.observations || '');
    
    if (data.amenities) {
      data.amenities.forEach(a => formData.append('amenities', a));
    }
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const isEditing = Boolean(editingVenue?.id);
      const url = isEditing 
        ? `${API_URL}/venues/${editingVenue.id}` 
        : `${API_URL}/venues`;
      
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Error al guardar recinto');
      
      setIsModalOpen(false);
      reset();
      Swal.fire({
        icon: 'success',
        title: isEditing ? 'Actualizado' : 'Registrado',
        text: 'El recinto ha sido guardado exitosamente',
        timer: 1500,
        showConfirmButton: false
      });
      fetchVenues();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const deleteVenue = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar recinto?',
      text: "Se perderá toda la información asociada a este espacio",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#608c1d',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/venues/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Error al eliminar');
      Swal.fire('Eliminado', 'El recinto ha sido removido', 'success');
      fetchVenues();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const filteredVenues = venues.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    (v.building && v.building.toLowerCase().includes(search.toLowerCase())) ||
    v.type.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors = {
    'Disponible': 'bg-emerald-100 text-emerald-700',
    'En Mantenimiento': 'bg-emerald-100 text-emerald-700',
    'Ocupado': 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">search</span>
          <input 
            type="text" 
            placeholder="Buscar por nombre, tipo o edificio..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm shadow-sm"
          />
        </div>
        <button 
          onClick={() => openModal()}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#608c1d] transition-all shadow-md shadow-primary/10"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          Agregar recinto nuevo
        </button>
      </div>

      {/* Venues Table/List */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
             <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
             <p className="mt-4 text-zinc-400">Cargando recintos...</p>
          </div>
        ) : filteredVenues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4 text-zinc-800">Recinto</th>
                  <th className="px-6 py-4">Ubicación</th>
                  <th className="px-6 py-4">Capacidad</th>
                  <th className="px-6 py-4">Amenidades</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredVenues.map((venue) => (
                  <tr key={venue.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-zinc-100 overflow-hidden flex items-center justify-center text-zinc-400 shrink-0 border border-zinc-100">
                          {venue.image_url ? (
                            <img src={`${BASE_URL}${venue.image_url}`} alt={venue.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined">
                              {venue.type === 'Auditorio' ? 'theater_comedy' : 
                               venue.type === 'Aula de Cómputo' ? 'computer' : 
                               venue.type === 'Laboratorio' ? 'biotech' : 'meeting_room'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-800">{venue.name}</p>
                          <p className="text-xs text-zinc-400">{venue.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-700">{venue.building || '—'}</p>
                      <p className="text-xs text-zinc-400">{venue.floor || '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-zinc-400">groups</span>
                        <span className="font-semibold text-zinc-700">{venue.capacity || '0'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {venue.amenities?.slice(0, 2).map((a, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-md whitespace-nowrap">{a}</span>
                        ))}
                        {venue.amenities?.length > 2 && <span className="text-[10px] text-zinc-400">+{venue.amenities.length - 2}</span>}
                        {(!venue.amenities || venue.amenities.length === 0) && <span className="text-xs text-zinc-300">Sin amenidades</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[venue.status] || 'bg-zinc-100 text-zinc-600'}`}>
                        {venue.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openModal(venue, true)} className="p-2 text-zinc-400 hover:text-emerald-500 transition-colors hover:bg-emerald-50 rounded-lg" title="Ver Detalles">
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button onClick={() => openModal(venue)} className="p-2 text-zinc-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-lg" title="Editar">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => deleteVenue(venue.id)} className="p-2 text-zinc-400 hover:text-rose-500 transition-colors hover:bg-rose-50 rounded-lg" title="Eliminar">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-inner">
              <span className="material-symbols-outlined text-4xl text-zinc-200">apartment</span>
            </div>
            <h4 className="text-lg font-bold text-zinc-400">No se encontraron recintos</h4>
            <p className="text-sm text-zinc-300 max-w-xs mx-auto mt-2">No hay espacios registrados o no coinciden con tu búsqueda.</p>
            <button 
              onClick={() => openModal()}
              className="mt-6 text-primary font-bold hover:underline inline-flex items-center gap-2"
            >
              Registrar nuevo recinto →
            </button>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-in">
            <div className="px-8 py-6 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-zinc-800">
                  {viewMode ? 'Detalles del Recinto' : editingVenue ? 'Editar Recinto' : 'Nuevo Recinto'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {viewMode ? 'Consulta la información del espacio' : 'Completa los datos del espacio físico'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <form id="venue-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <fieldset disabled={viewMode} className="grid grid-cols-1 md:grid-cols-3 gap-8 border-none p-0 m-0">
                  {/* Left: Image Upload */}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">Imagen del Recinto</label>
                    <div 
                      onClick={() => !viewMode && imageInputRef.current?.click()}
                      className={`aspect-[4/3] w-full bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center ${!viewMode ? 'cursor-pointer hover:bg-zinc-100 hover:border-primary/40' : ''} transition-all overflow-hidden relative group`}
                    >
                      {previewImage ? (
                        <>
                          <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                          {!viewMode && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-white text-xs font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">edit</span> Cambiar
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <span className="material-symbols-outlined text-3xl text-zinc-300 mb-2">add_a_photo</span>
                          <p className="text-[10px] text-zinc-400 font-medium">{viewMode ? 'Sin imagen' : 'Click para subir foto'}</p>
                        </div>
                      )}
                    </div>
                    {!viewMode && (
                      <input 
                        type="file" 
                        ref={imageInputRef} 
                        onChange={handleImageChange} 
                        className="hidden" 
                        accept="image/*"
                      />
                    )}
                  </div>

                  {/* Right: Info */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">Nombre del Recinto *</label>
                        <input 
                          {...register('name', { required: true })} 
                          className={`w-full px-4 py-3 bg-zinc-50 border ${errors.name ? 'border-rose-300' : 'border-zinc-100'} rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all`}
                          placeholder="Ej: Aula de Cómputo 5"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">Tipo de Recinto</label>
                        <select {...register('type')} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all">
                          <option value="Aula">Aula</option>
                          <option value="Aula de Cómputo">Aula de Cómputo</option>
                          <option value="Laboratorio">Laboratorio</option>
                          <option value="Auditorio">Auditorio</option>
                          <option value="Salón de Usos Múltiples">Salón de Usos Múltiples</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">Estado</label>
                        <select {...register('status')} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all">
                          <option value="Disponible">Disponible</option>
                          <option value="En Mantenimiento">En Mantenimiento</option>
                          <option value="Ocupado">Ocupado</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Amenities (Full Width) */}
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 ml-1">Amenidades / Equipamiento</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                      {amenityOptions.map((option) => (
                        <label key={option} className={`flex items-center gap-2 ${!viewMode ? 'cursor-pointer group' : ''}`}>
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              value={option}
                              {...register('amenities')}
                              className="w-5 h-5 rounded-lg border-zinc-300 text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                            />
                          </div>
                          <span className="text-xs text-zinc-600 font-medium transition-colors">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Location & Capacity */}
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">Edificio</label>
                      <input {...register('building')} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all" placeholder="Ej: Edificio C" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">Piso</label>
                      <input {...register('floor')} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all" placeholder="Ej: 1er Piso" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">Capacidad</label>
                      <input {...register('capacity')} type="number" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all" placeholder="Ej: 50" />
                    </div>
                  </div>

                  {/* Observations */}
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">Observaciones</label>
                    <textarea {...register('observations')} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all h-24 resize-none" placeholder="Detalles adicionales..." />
                  </div>
                </fieldset>
              </form>
            </div>

            <div className="px-8 py-6 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 text-zinc-500 font-bold hover:text-zinc-700 transition-colors"
              >
                {viewMode ? 'Cerrar' : 'Cancelar'}
              </button>
              {!viewMode && (
                <button 
                  type="submit" 
                  form="venue-form"
                  className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold hover:bg-[#608c1d] transition-all shadow-lg shadow-primary/20"
                >
                  {editingVenue ? 'Guardar Cambios' : 'Registrar Recinto'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CertificatesPanel({ speakers }) {
  const [search, setSearch] = useState('');

  const filtered = speakers.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="max-w-md">
            <h3 className="text-xl font-black text-zinc-800 mb-2">Sección de Certificados</h3>
            <p className="text-sm text-zinc-400">Genera diplomas de participación para los ponentes de la jornada.</p>
          </div>
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">search</span>
            <input
              type="text"
              placeholder="Buscar ponente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(speaker => (
          <div key={speaker.id} className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">workspace_premium</span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-zinc-800 truncate">{speaker.full_name}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">{speaker.academic_level}</p>
              </div>
            </div>
            
            <div className="p-4 bg-zinc-50 rounded-2xl mb-6">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Conferencia</p>
              <p className="text-xs font-medium text-zinc-600 line-clamp-2">{speaker.conference_name || 'Sin título'}</p>
            </div>

            <button
              onClick={() => generateSpeakerDiploma(speaker)}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#608c1d] transition-all shadow-lg shadow-primary/10"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Descargar Diploma
            </button>
          </div>
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[2rem] border border-zinc-100">
           <span className="material-symbols-outlined text-5xl text-zinc-200 block mb-3">search_off</span>
           <p className="text-zinc-400 font-medium">No se encontraron ponentes para generar certificados</p>
        </div>
      )}
    </div>
  );
}

// ─── Calendar Section (Calendario) ───────────────────────────────────────────

function CalendarPanel({ speakers }) {
  // Extract and group speakers by date
  const groupedSpeakers = new Map();

  speakers.forEach((speaker) => {
    if (!speaker.suggested_date) return;
    const dateStr = speaker.suggested_date.split('T')[0];
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return;

    const [year, month, dayOfMonth] = parts;
    const dateObj = new Date(year, month - 1, dayOfMonth);
    if (Number.isNaN(dateObj.getTime())) return;

    const weekday = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
    const day = String(dateObj.getDate()).padStart(2, '0');
    const formattedKey = dateStr;
    const displayDate = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day}`;

    if (!groupedSpeakers.has(formattedKey)) {
      groupedSpeakers.set(formattedKey, {
        dateLabel: displayDate,
        dateObj,
        activities: [],
      });
    }

    const entry = groupedSpeakers.get(formattedKey);
    entry.activities.push({
      id: speaker.id,
      time: speaker.suggested_time || 'Pendiente',
      title: speaker.conference_name || 'Sin título',
      speakerName: speaker.full_name,
      venue: speaker.venue?.name || 'Recinto no asignado',
      capacity: speaker.audience_capacity || 0,
      level: speaker.academic_level
    });
  });

  const sortedDays = Array.from(groupedSpeakers.values())
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  sortedDays.forEach(day => {
    day.activities.sort((a, b) => {
      if (a.time === 'Pendiente') return 1;
      if (b.time === 'Pendiente') return -1;
      return a.time.localeCompare(b.time);
    });
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-black text-zinc-800">Programa de la Jornada</h2>
           <p className="text-zinc-500 text-sm mt-1">Vista cronológica de todas las ponencias confirmadas.</p>
        </div>
      </div>

      {sortedDays.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2rem] border border-zinc-100 shadow-sm">
          <span className="material-symbols-outlined text-5xl text-zinc-200 block mb-3">event_busy</span>
          <p className="text-zinc-400 font-medium">No hay ponencias programadas con fecha asignada.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedDays.map((day, idx) => (
            <div key={idx} className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
               <div className="bg-zinc-50 border-b border-zinc-100 px-8 py-5">
                  <h3 className="text-xl font-black text-zinc-800">{day.dateLabel}</h3>
               </div>
               <div className="divide-y divide-zinc-50">
                  {day.activities.map((act) => (
                    <div key={act.id} className="p-8 flex flex-col md:flex-row md:items-center gap-6 hover:bg-zinc-50/50 transition-colors">
                       <div className="w-32 shrink-0">
                         <span className="text-2xl font-black text-primary tracking-tighter">{act.time}</span>
                       </div>
                       <div className="flex-1">
                         <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-lg font-bold text-zinc-800">{act.title}</h4>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-zinc-100 text-zinc-500">{act.level}</span>
                         </div>
                         <p className="text-sm font-medium text-zinc-600 mb-2">{act.speakerName}</p>
                         <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">location_on</span> {act.venue}</span>
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">groups</span> {act.capacity} lugares</span>
                         </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContestsPanel() {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContest, setSelectedContest] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const fetchContests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/contests`, {
        headers: getAuthHeaders(),
      });
      if (handleAuthError(res, navigate)) return;
      if (!res.ok) throw new Error('Error al obtener certámenes');
      const data = await res.json();
      setContests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  const onSubmit = async (data) => {
    try {
      const res = await fetch(`${API_URL}/contests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: data.name,
          category: data.category,
          date: new Date(data.date).toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Error al crear certamen');
      setIsModalOpen(false);
      reset();
      Swal.fire('¡Creado!', 'El certamen ha sido registrado correctamente', 'success');
      fetchContests();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleDeleteContest = async (id, name) => {
    if (name === 'Señorita y Joven UES') {
      Swal.fire('Acción denegada', 'Este certamen es permanente y no puede ser eliminado.', 'info');
      return;
    }
    
    const result = await Swal.fire({
      title: `¿Eliminar "${name}"?`,
      text: "Se perderán todos los registros de participantes de este concurso",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar permanentemente',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;
    
    try {
      const res = await fetch(`${API_URL}/contests/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Error al eliminar certamen');
      Swal.fire('Eliminado', 'El certamen ha sido removido del sistema', 'success');
      fetchContests();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  if (selectedContest) {
    if (selectedContest.name === 'Señorita y Joven UES') {
      return <PageantDetailPanel onBack={() => setSelectedContest(null)} />;
    }
    return <ContestDetailPanel contest={selectedContest} onBack={() => setSelectedContest(null)} />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="max-w-md">
          <h3 className="text-xl font-black text-zinc-800 mb-2">Gestión de Certámenes</h3>
          <p className="text-sm text-zinc-400">Organiza y supervisa los concursos y certámenes de la jornada académica.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-2xl font-black hover:bg-[#608c1d] transition-all shadow-lg shadow-primary/20 text-sm uppercase tracking-wider"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nuevo Certamen
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-zinc-400">Cargando certámenes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contests.map((contest) => (
            <div 
              key={contest.id} 
              className={`p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${
                contest.name === 'Señorita y Joven UES' 
                ? 'bg-gradient-to-br from-white to-emerald-50/30 border-emerald-100 ring-2 ring-emerald-500/10' 
                : 'bg-white border-zinc-100'
              }`}
            >
              {contest.name === 'Señorita y Joven UES' && (
                <div className="absolute top-4 right-4">
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-4 mb-6 relative">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  contest.name === 'Señorita y Joven UES' 
                  ? 'bg-emerald-100 text-emerald-600 border-amber-200' 
                  : 'bg-primary/5 text-primary border-primary/10'
                }`}>
                  <span className="material-symbols-outlined">{contest.name === 'Señorita y Joven UES' ? 'stars' : 'emoji_events'}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-zinc-800 truncate">{contest.name}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">{contest.category}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Estatus:</span>
                  <span className={`font-bold ${contest.status === 'Inscripciones Abiertas' ? 'text-emerald-500' : 'text-emerald-500'}`}>{contest.status}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Fecha:</span>
                  <span className="font-bold text-zinc-600">{formatDate(contest.date)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedContest(contest)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${
                    contest.name === 'Señorita y Joven UES'
                    ? 'bg-emerald-500 text-white hover:bg-amber-600'
                    : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {contest.name === 'Señorita y Joven UES' ? 'Gestionar Candidatos' : 'Gestionar Participantes'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-slide-in">
            <div className="px-10 py-8 bg-zinc-50/80 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm shadow-emerald-500/5">
                  <span className="material-symbols-outlined text-[28px]">emoji_events</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-800 leading-tight">Nuevo Certamen</h3>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Configuración de concurso</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nombre del Certamen *</label>
                <input {...register('name', { required: true })} className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all" placeholder="Ej: Señorita y Joven UES" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Categoría</label>
                <select {...register('category')} className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all appearance-none cursor-pointer">
                  <option value="Certamen Especial">Certamen Especial</option>
                  <option value="Académico">Académico</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Deportivo">Deportivo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Fecha del Evento</label>
                <input {...register('date')} type="date" className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all" />
              </div>

              <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-wider">
                Crear Certamen
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PageantDetailPanel({ onBack }) {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [student, setStudent] = useState(null);
  const [partner, setPartner] = useState(null);
  const [category, setCategory] = useState('Pareja');
  const [representativeOf, setRepresentativeOf] = useState('');
  const [artisticActivity, setArtisticActivity] = useState('');
  const [lookup, setLookup] = useState('');
  const [partnerLookup, setPartnerLookup] = useState('');

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/pageant/candidates`, {
        headers: getAuthHeaders(),
      });
      if (handleAuthError(res, navigate)) return;
      const data = await res.json();
      setCandidates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleLookup = async (matricula, setter) => {
    if (matricula.length < 5) {
      setter(null);
      return;
    }
    try {
      // Usar el endpoint de auth para el lookup rápido (no requiere token)
      const res = await fetch(`${AUTH_URL}/student-lookup?matricula=${matricula}`);
      if (res.ok) {
        const studentData = await res.json();
        
        // Ahora necesitamos el ID real de la base de datos (que no viene en el lookup público por seguridad)
        // Lo buscamos en la lista maestra de alumnos que ya tenemos en memoria o consultamos
        const resAdmin = await fetch(`${API_URL}/students`, { headers: getAuthHeaders() });
        const allStudents = await resAdmin.json();
        const found = allStudents.find(s => s.matricula === matricula);
        
        if (found) {
          setter(found);
          // Si es el primer estudiante (Señorita), auto-completar representación
          if (setter === setStudent && !representativeOf) {
            setRepresentativeOf(found.career);
          }
        }
      } else {
        setter(null);
      }
    } catch (err) {
      setter(null);
    }
  };

  const handleRegister = async () => {
    if (!student) return;
    try {
      const res = await fetch(`${API_URL}/pageant/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          student_id: student.id,
          partner_id: partner ? partner.id : null,
          category,
          representative_of: representativeOf || student.career,
          artistic_activity: artisticActivity,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || 'Error al registrar candidatos');
      }
      Swal.fire('¡Registrado!', 'La pareja ha sido inscrita en el certamen', 'success');
      setStudent(null);
      setPartner(null);
      setLookup('');
      setPartnerLookup('');
      setRepresentativeOf('');
      setArtisticActivity('');
      setIsRegistering(false);
      fetchCandidates();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar registro?',
      text: "Se borrará la inscripción de esta pareja",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      await fetch(`${API_URL}/pageant/candidates/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      Swal.fire('Eliminado', 'El registro ha sido removido', 'success');
      fetchCandidates();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h3 className="text-xl font-black text-zinc-800">Señorita y Joven UES</h3>
          <p className="text-sm text-zinc-400">Gestión independiente de parejas y representantes</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h4 className="font-bold text-zinc-700">Candidatos Registrados</h4>
          <button 
            onClick={() => setIsRegistering(true)}
            className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all"
          >
            <span className="material-symbols-outlined">group_add</span>
            Registrar Pareja
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <div className="w-6 h-6 border-4 border-amber-200 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-10 text-center text-zinc-400 italic">No hay candidatos registrados aún</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {candidates.map(cand => (
              <div key={cand.id} className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full opacity-5 bg-emerald-500"></div>
                <div className="relative">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600">
                      {cand.category}
                    </span>
                    <button 
                      onClick={() => handleDelete(cand.id)}
                      className="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-6 mb-4">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Candidata (Señorita):</p>
                      <p className="font-bold text-zinc-800">{cand.student.first_name} {cand.student.last_name}</p>
                      <p className="text-[10px] text-zinc-500">{cand.student.matricula}</p>
                    </div>
                    {cand.partner && (
                      <>
                        <div className="w-px h-10 bg-zinc-200"></div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Candidato (Joven):</p>
                          <p className="font-bold text-zinc-800">{cand.partner.first_name} {cand.partner.last_name}</p>
                          <p className="text-[10px] text-zinc-500">{cand.partner.matricula}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Representación:</p>
                      <p className="text-xs font-bold text-zinc-600">{cand.representative_of}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Actividad Artística:</p>
                      <p className="text-xs font-bold text-emerald-600">{cand.artistic_activity || 'No especificada'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isRegistering && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-in">
            <div className="px-10 py-8 bg-zinc-50 border-b border-zinc-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-zinc-800">Registro de Pareja</h3>
                <p className="text-xs text-zinc-400">Inscripción para Señorita y Joven UES</p>
              </div>
              <button onClick={() => setIsRegistering(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Estudiante 1 (Señorita) */}
                <div className="space-y-4">
                  <MatriculaPinInput 
                    label="Matrícula Señorita"
                    colorClass="text-pink-500"
                    value={lookup}
                    onChange={(val) => {
                      setLookup(val);
                      handleLookup(val, setStudent);
                    }}
                  />
                  {student && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-slide-in">
                      <p className="text-sm font-bold text-zinc-800">{student.first_name} {student.last_name}</p>
                      <p className="text-[10px] text-emerald-600 font-bold">{student.career}</p>
                    </div>
                  )}
                </div>

                {/* Estudiante 2 (Joven) */}
                <div className="space-y-4">
                  <MatriculaPinInput 
                    label="Matrícula Joven"
                    colorClass="text-blue-500"
                    value={partnerLookup}
                    onChange={(val) => {
                      setPartnerLookup(val);
                      handleLookup(val, setPartner);
                    }}
                  />
                  {partner && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-slide-in">
                      <p className="text-sm font-bold text-zinc-800">{partner.first_name} {partner.last_name}</p>
                      <p className="text-[10px] text-emerald-600 font-bold">{partner.career}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Representación (Carrera / Facultad)</label>
                  <input 
                    value={representativeOf}
                    onChange={(e) => setRepresentativeOf(e.target.value)}
                    className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700"
                    placeholder="Ej: Ingeniería en Sistemas"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Demostración de Actividad Artística / Talento</label>
                  <textarea 
                    value={artisticActivity}
                    onChange={(e) => setArtisticActivity(e.target.value)}
                    className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 h-24 resize-none"
                    placeholder="Describe el talento (Canto, baile, etc.)"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsRegistering(false)}
                  className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-black uppercase tracking-wider hover:bg-zinc-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRegister}
                  disabled={!student || !partner}
                  className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-xl shadow-amber-200 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-wider disabled:opacity-50 disabled:scale-100"
                >
                  Confirmar Registro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContestDetailPanel({ contest, onBack }) {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [student1, setStudent1] = useState(null);
  const [student2, setStudent2] = useState(null);
  const [lookup1, setLookup1] = useState('');
  const [lookup2, setLookup2] = useState('');

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/contests/${contest.id}/registrations`, {
        headers: getAuthHeaders(),
      });
      if (handleAuthError(res, navigate)) return;
      const data = await res.json();
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [contest.id, navigate]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleLookup = async (matricula, setter) => {
    if (matricula.length < 5) return;
    try {
      const res = await fetch(`${AUTH_URL}/student-lookup?matricula=${matricula}`);
      if (res.ok) {
        const data = await res.json();
        // Necesitamos el ID real del alumno para la inscripción, el lookup normal no lo da.
        // Pero tenemos el endpoint de admin para buscar alumnos.
        const resAdmin = await fetch(`${API_URL}/students`, { headers: getAuthHeaders() });
        const allStudents = await resAdmin.json();
        const found = allStudents.find(s => s.matricula === matricula);
        setter(found);
      } else {
        setter(null);
      }
    } catch (err) {
      setter(null);
    }
  };

  const handleRegister = async () => {
    if (!student1) return;
    try {
      const res = await fetch(`${API_URL}/contests/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          contest_id: contest.id,
          student1_id: student1.id,
          student2_id: student2 ? student2.id : null,
        }),
      });
      if (!res.ok) throw new Error('Error al inscribir');
      
      Swal.fire('¡Éxito!', 'Inscripción realizada correctamente', 'success');
      setStudent1(null);
      setStudent2(null);
      setLookup1('');
      setLookup2('');
      setIsRegistering(false);
      fetchRegistrations();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleDeleteReg = async (regId) => {
    const result = await Swal.fire({
      title: '¿Eliminar inscripción?',
      text: "Esta acción removerá a los alumnos de este certamen",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      await fetch(`${API_URL}/contests/registrations/${regId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      Swal.fire('Eliminado', 'La inscripción ha sido cancelada', 'success');
      fetchRegistrations();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h3 className="text-xl font-black text-zinc-800">{contest.name}</h3>
          <p className="text-sm text-zinc-400">Gestionando participantes e inscripciones</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h4 className="font-bold text-zinc-700">Participantes Inscritos</h4>
          <button 
            onClick={() => setIsRegistering(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-[#608c1d] transition-all"
          >
            <span className="material-symbols-outlined">person_add</span>
            Inscribir Pareja / Alumno
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          </div>
        ) : registrations.length === 0 ? (
          <div className="py-10 text-center text-zinc-400 italic">No hay inscripciones aún</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {registrations.map(reg => (
              <div key={reg.id} className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 flex justify-between items-center group">
                <div className="flex items-center gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary uppercase">Alumno 1</p>
                    <p className="font-bold text-zinc-800">{reg.student1.first_name} {reg.student1.last_name}</p>
                    <p className="text-[10px] text-zinc-400">{reg.student1.matricula}</p>
                  </div>
                  {reg.student2 && (
                    <>
                      <div className="h-10 w-px bg-zinc-200"></div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-emerald-500 uppercase">Alumno 2</p>
                        <p className="font-bold text-zinc-800">{reg.student2.first_name} {reg.student2.last_name}</p>
                        <p className="text-[10px] text-zinc-400">{reg.student2.matricula}</p>
                      </div>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => handleDeleteReg(reg.id)}
                  className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isRegistering && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-in">
            <div className="px-10 py-8 bg-zinc-50 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-zinc-800">Inscripción al Certamen</h3>
              <button onClick={() => setIsRegistering(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Alumno 1 */}
                <div className="space-y-4">
                  <MatriculaPinInput 
                    label="Matrícula Alumno 1"
                    value={lookup1}
                    onChange={(val) => {
                      setLookup1(val);
                      handleLookup(val, setStudent1);
                    }}
                  />
                  {student1 && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-slide-in">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Confirmado:</p>
                      <p className="text-sm font-bold text-zinc-800">{student1.first_name} {student1.last_name}</p>
                      <p className="text-[10px] text-zinc-500">{student1.career}</p>
                    </div>
                  )}
                </div>

                {/* Alumno 2 (Opcional / Pareja) */}
                <div className="space-y-4">
                  <MatriculaPinInput 
                    label="Matrícula Alumno 2 (Pareja)"
                    value={lookup2}
                    onChange={(val) => {
                      setLookup2(val);
                      handleLookup(val, setStudent2);
                    }}
                  />
                  {student2 && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-slide-in">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Confirmado:</p>
                      <p className="text-sm font-bold text-zinc-800">{student2.first_name} {student2.last_name}</p>
                      <p className="text-[10px] text-zinc-500">{student2.career}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsRegistering(false)}
                  className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-black uppercase tracking-wider hover:bg-zinc-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRegister}
                  disabled={!student1}
                  className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-wider disabled:opacity-50 disabled:scale-100"
                >
                  Confirmar Inscripción
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Stationery Section (Material de Papelería) ─────────────────────────────

async function generatePamphlet(speaker) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const H = 210;
  const COL = W / 3;

  const C = {
    primary: [128, 186, 38],
    dark: [18, 22, 30],
    white: [255, 255, 255],
    gold: [195, 155, 75]
  };

  // Banner Logo en Panel Central
  try {
    const bannerImg = await getImageDataProportional(pdfBannerImg);
    if (bannerImg) {
      const bW = COL - 20;
      const bH = (bW * bannerImg.h) / bannerImg.w;
      doc.addImage(bannerImg.data, bannerImg.format, COL + 10, 10, bW, bH);
    }
  } catch (_) {}

  // Carátula (Panel Derecho)
  doc.setFillColor(...C.dark);
  doc.rect(COL * 2, 0, COL, H, 'F');
  doc.setFillColor(...C.primary);
  doc.rect(COL * 2, H - 20, COL, 20, 'F');
  
  doc.setTextColor(...C.white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('13va JORNADA ACADÉMICA', COL * 2.5, 40, { align: 'center' });
  doc.text('Y CULTURAL', COL * 2.5, 48, { align: 'center' });
  
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(1);
  doc.line(COL * 2 + 10, 55, COL * 3 - 10, 55);

  doc.setFontSize(22);
  const nameLines = doc.splitTextToSize(speaker.full_name || 'PONENTE', COL - 20);
  doc.text(nameLines, COL * 2.5, 80, { align: 'center' });

  // Panel Central (Detalles)
  doc.setFillColor(250, 250, 250);
  doc.rect(COL, 0, COL, H, 'F');
  doc.setTextColor(...C.dark);
  doc.setFontSize(12);
  doc.text('CONFERENCIA:', COL + 10, 45); // Ajustado para logo
  doc.setFontSize(16);
  const confLines = doc.splitTextToSize(speaker.conference_name || 'Sin título', COL - 20);
  doc.text(confLines, COL + 10, 55);

  // Panel Izquierdo (Info Institucional)
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, COL, H, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(10);
  doc.text('UNIVERSIDAD MEXIQUENSE DEL BICENTENARIO', COL / 2, 180, { align: 'center' });

  doc.save(`PANFLETO_${speaker.full_name.replace(/\s+/g, '_')}.pdf`);
}

async function generateNamePlate(speaker) {
  // Formato tipo carpa (folded)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const H = 210;
  
  // Línea de doblez central
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(0, H/2, W, H/2);
  doc.setLineDashPattern([], 0);

  const drawFace = async (yOffset, rotate = false) => {
    if (rotate) {
      // Cara superior (invertida para que al doblar se vea bien)
      doc.saveGraphicsState();
      doc.setFontSize(40);
      doc.setTextColor(128, 186, 38);
      doc.setFont('helvetica', 'bold');
      doc.text(speaker.full_name.toUpperCase(), W/2, yOffset + 40, { align: 'center', angle: 180 });
      doc.restoreGraphicsState();
    } else {
      // Cara inferior
      try {
        const bannerImg = await getImageDataProportional(pdfBannerImg);
        if (bannerImg) {
          const bW = 60;
          const bH = (bW * bannerImg.h) / bannerImg.w;
          doc.addImage(bannerImg.data, bannerImg.format, (W - bW) / 2, yOffset + 10, bW, bH);
        }
      } catch (_) {}

      doc.setFontSize(40);
      doc.setTextColor(128, 186, 38);
      doc.setFont('helvetica', 'bold');
      doc.text(speaker.full_name.toUpperCase(), W/2, yOffset + 60, { align: 'center' });
      doc.setFontSize(16);
      doc.setTextColor(100, 100, 100);
      doc.text(speaker.academic_level || '', W/2, yOffset + 75, { align: 'center' });
    }
  };

  await drawFace(0, true);
  await drawFace(H/2, false);

  doc.save(`PORTANOMBRE_${speaker.full_name.replace(/\s+/g, '_')}.pdf`);
}

async function generateBottleLabel(speaker) {
  // Etiquetas de 20cm x 5cm (aprox)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [200, 50] });
  
  doc.setFillColor(128, 186, 38);
  doc.rect(0, 0, 200, 50, 'F');
  
  doc.setFillColor(255, 255, 255);
  doc.rect(10, 5, 180, 40, 'F');

  try {
    const bannerImg = await getImageDataProportional(pdfBannerImg);
    if (bannerImg) {
      const bW = 40;
      const bH = (bW * bannerImg.h) / bannerImg.w;
      doc.addImage(bannerImg.data, bannerImg.format, 15, 15, bW, bH);
    }
  } catch (_) {}

  doc.setTextColor(18, 22, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(speaker.full_name, 110, 20, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text('13va JORNADA ACADÉMICA Y CULTURAL', 110, 30, { align: 'center' });
  doc.text('UNIVERSIDAD MEXIQUENSE DEL BICENTENARIO', 110, 35, { align: 'center' });

  doc.save(`ETIQUETA_BOTELLA_${speaker.full_name.replace(/\s+/g, '_')}.pdf`);
}

async function generateVisitorBadge(speaker) {
  // Credencial estándar de 85mm x 55mm en una hoja A4 para facilitar impresión
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const badgeW = 85;
  const badgeH = 55;
  const marginX = (210 - badgeW) / 2;
  const marginY = 40;

  const drawBadge = async (x, y) => {
    // Marcas de recorte
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    // Esquina superior izquierda
    doc.line(x - 5, y, x - 1, y);
    doc.line(x, y - 5, x, y - 1);
    // Esquina superior derecha
    doc.line(x + badgeW + 1, y, x + badgeW + 5, y);
    doc.line(x + badgeW, y - 5, x + badgeW, y - 1);
    // Esquina inferior izquierda
    doc.line(x - 5, y + badgeH, x - 1, y + badgeH);
    doc.line(x, y + badgeH + 1, x, y + badgeH + 5);
    // Esquina inferior derecha
    doc.line(x + badgeW + 1, y + badgeH, x + badgeW + 5, y + badgeH);
    doc.line(x + badgeW, y + badgeH + 1, x + badgeW, y + badgeH + 5);

    // Fondo blanco
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, badgeW, badgeH, 'F');
    
    // Borde decorativo principal
    doc.setDrawColor(128, 186, 38);
    doc.setLineWidth(1);
    doc.rect(x + 2, y + 2, badgeW - 4, badgeH - 4, 'D');

    // Franja superior (Header)
    doc.setFillColor(128, 186, 38);
    doc.rect(x + 2, y + 2, badgeW - 4, 12, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('VISITANTE / PONENTE', x + badgeW / 2, y + 10, { align: 'center' });

    // Logo en credencial
    try {
      const bannerImg = await getImageDataProportional(pdfBannerImg);
      if (bannerImg) {
        const bW = 25;
        const bH = (bW * bannerImg.h) / bannerImg.w;
        doc.addImage(bannerImg.data, bannerImg.format, x + 5, y + 15, bW, bH);
      }
    } catch (_) {}

    // Nombre
    doc.setTextColor(40, 46, 62);
    doc.setFontSize(14);
    const nameLines = doc.splitTextToSize(speaker.full_name.toUpperCase(), badgeW - 10);
    doc.text(nameLines, x + badgeW / 2, y + 35, { align: 'center' });

    // Info Jornada (Footer)
    doc.setFillColor(40, 46, 62);
    doc.rect(x + 2, y + badgeH - 10, badgeW - 4, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('13va JORNADA ACADÉMICA Y CULTURAL', x + badgeW / 2, y + badgeH - 6.5, { align: 'center' });
    doc.setFontSize(5);
    doc.text('UNIVERSIDAD MEXIQUENSE DEL BICENTENARIO - UES SAN JOSÉ DEL RINCÓN', x + badgeW / 2, y + badgeH - 4, { align: 'center' });
  };

  await drawBadge(marginX, marginY);
  // Dibujamos una segunda para aprovechar el papel
  await drawBadge(marginX, marginY + badgeH + 20);

  doc.save(`CREDENCIAL_${speaker.full_name.replace(/\s+/g, '_')}.pdf`);
}

async function generateSpeakerDiploma(speaker) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const H = 210;

  // Fondo y bordes decorativos
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');
  
  // Marco principal verde
  doc.setDrawColor(128, 186, 38);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, W - 20, H - 20, 'D');
  
  // Marco secundario gris fino
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(12, 12, W - 24, H - 24, 'D');

  // Banner Logo
  try {
    const bannerImg = await getImageDataProportional(pdfBannerImg);
    if (bannerImg) {
      const bW = 100;
      const bH = (bW * bannerImg.h) / bannerImg.w;
      doc.addImage(bannerImg.data, bannerImg.format, (W - bW) / 2, 15, bW, bH);
    }
  } catch (_) {}

  // Encabezado
  doc.setTextColor(40, 46, 62);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('Universidad Mexiquense del Bicentenario', W / 2, 55, { align: 'center' });
  
  doc.setFontSize(18);
  doc.text('Unidad de Estudios Superiores San José del Rincón', W / 2, 65, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text('Entrega el presente Diploma a', W / 2, 85, { align: 'center' });

  // Nombre del ponente
  doc.setTextColor(128, 186, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.text(speaker.full_name.toUpperCase(), W / 2, 105, { align: 'center' });

  // Texto de conclusión
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text('Por haber concluido con el tema', W / 2, 125, { align: 'center' });

  // Tema
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  const topicLines = doc.splitTextToSize(speaker.conference_name || 'Sin título asignado', W - 60);
  doc.text(topicLines, W / 2, 135, { align: 'center' });

  // Pie de página con fecha y lugar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const dateStr = speaker.suggested_date ? formatDate(speaker.suggested_date) : 'el día estipulado'; 
  const footerText = `Llevado a cabo en la treceava jornada académica y cultural el día ${dateStr} en San José del Rincón Estado de México`;
  doc.text(footerText, W / 2, 155, { align: 'center' });

  // Firma
  const sigY = 180;
  doc.setDrawColor(128, 186, 38);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - 40, sigY, W / 2 + 40, sigY);
  
  doc.setTextColor(40, 46, 62);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma del Coordinador', W / 2, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Luis Ramon Vega Ramirez', W / 2, sigY + 10, { align: 'center' });

  doc.save(`DIPLOMA_${speaker.full_name.replace(/\s+/g, '_')}.pdf`);
}

function StationeryPanel({ speakers }) {
  const [search, setSearch] = useState('');
  
  const filtered = speakers.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const items = [
    { id: 'pamphlet', label: 'Panfleto Tríptico', icon: 'auto_stories', action: generatePamphlet, color: 'bg-blue-50 text-blue-600' },
    { id: 'nameplate', label: 'Portanombre Mesa', icon: 'badge', action: generateNamePlate, color: 'bg-emerald-50 text-emerald-600' },
    { id: 'bottle', label: 'Etiqueta Botella', icon: 'Water_Drop', action: generateBottleLabel, color: 'bg-emerald-50 text-emerald-600' },
    { id: 'badge', label: 'Credencial Visitante', icon: 'contact_mail', action: generateVisitorBadge, color: 'bg-indigo-50 text-indigo-600' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="max-w-md">
            <h3 className="text-xl font-black text-zinc-800 mb-2">Generador de Papelería</h3>
            <p className="text-sm text-zinc-400">Selecciona un ponente para generar su material personalizado listo para impresión.</p>
          </div>
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">search</span>
            <input 
              type="text" 
              placeholder="Buscar ponente..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map(speaker => (
          <div key={speaker.id} className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 font-black text-xl border border-zinc-50 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                 {speaker.full_name?.charAt(0)}
               </div>
               <div>
                 <p className="font-black text-zinc-800 leading-tight">{speaker.full_name}</p>
                 <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-0.5">{speaker.institution}</p>
               </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    Swal.fire({
                      title: 'Generando Documento',
                      text: `Preparando ${item.label}...`,
                      allowOutsideClick: false,
                      didOpen: () => Swal.showLoading()
                    });
                    item.action(speaker).then(() => Swal.close());
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${item.color}`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ user }) {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Logo Upload State
  const [sidebarLogo, setSidebarLogo] = useState(null);
  const [loginLogo, setLoginLogo] = useState(null);
  const [uploadingLogos, setUploadingLogos] = useState(false);
  const [logoMessage, setLogoMessage] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
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
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar contraseña');

      setMessage('✓ Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    e.preventDefault();
    if (!sidebarLogo && !loginLogo) return;

    setUploadingLogos(true);
    setLogoMessage('');
    
    const formData = new FormData();
    if (sidebarLogo) formData.append('sidebar_logo', sidebarLogo);
    if (loginLogo) formData.append('login_logo', loginLogo);

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL.replace('/api', '')}/api/admin/settings/logos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (handleAuthError(res, navigate)) return;
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir logos');

      setLogoMessage('✓ Logos actualizados. Refresca para ver los cambios.');
      setSidebarLogo(null);
      setLoginLogo(null);
    } catch (err) {
      setLogoMessage(`Error: ${err.message}`);
    } finally {
      setUploadingLogos(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Perfil del Administrador */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border-4 border-white shadow-md">
            <span className="material-symbols-outlined text-4xl">admin_panel_settings</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-zinc-800 leading-tight">{user?.name}</h3>
            <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest mt-1">Administrador del Sistema</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-full w-fit border border-zinc-100">
              <span className="material-symbols-outlined text-sm">alternate_email</span>
              {user?.email}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Formulario de Cambio de Contraseña */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400">
              <span className="material-symbols-outlined">lock_reset</span>
            </div>
            <h4 className="text-lg font-black text-zinc-800">Seguridad</h4>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-5 flex-1">
            {message && <div className="p-4 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-2xl border border-emerald-100 animate-slide-in">{message}</div>}
            {error && <div className="p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl border border-rose-100 animate-slide-in">{error}</div>}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Contraseña Actual</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all"
                placeholder="Min. 8 caracteres"
              />
              {newPassword && <PasswordStrengthMeter password={newPassword} />}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all"
                placeholder="Repite la contraseña"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-800 text-white py-4 rounded-2xl font-black shadow-xl shadow-zinc-200 hover:bg-zinc-700 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  Actualizar Acceso
                </>
              )}
            </button>
          </form>
        </div>

        {/* Actualizar Logos */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400">
              <span className="material-symbols-outlined">image</span>
            </div>
            <h4 className="text-lg font-black text-zinc-800">Identidad Visual</h4>
          </div>

          <form onSubmit={handleLogoUpload} className="space-y-6 flex-1">
            {logoMessage && <div className={`p-4 text-xs font-bold rounded-2xl border animate-slide-in ${logoMessage.startsWith('Error') ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{logoMessage}</div>}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Logo Sidebar (Universidad Mexiquense del Bicentenario)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSidebarLogo(e.target.files[0])}
                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Logo Login (13va Jornada)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLoginLogo(e.target.files[0])}
                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={uploadingLogos || (!sidebarLogo && !loginLogo)}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 mt-auto disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
            >
              {uploadingLogos ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">upload</span>
                  Actualizar Logos
                </>
              )}
            </button>
          </form>
        </div>
      </div>
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
                      src={`${BASE_URL}${s.profile_photo_url}`}
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [speakers, setSpeakers] = useState([]);
  const [loadingSpeakers, setLoadingSpeakers] = useState(true);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
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
      if (handleAuthError(res, navigate)) return;
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
  }, [navigate]);

  useEffect(() => {
    if (user) fetchSpeakers();
  }, [user, fetchSpeakers]);

  const handleDeleteSpeaker = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar ponente?',
      text: "Esta acción eliminará permanentemente al ponente y su conferencia",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#608c1d',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/speakers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Error al eliminar');
      setSpeakers((prev) => prev.filter((s) => s.id !== id));
      Swal.fire('¡Eliminado!', 'El ponente ha sido removido del sistema', 'success');
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleSpeakerSaved = (wasEditing = false) => {
    showToast(wasEditing ? 'Ponente actualizado correctamente' : '¡Ponente registrado exitosamente!', 'success');
    setEditingSpeaker(null);
    setIsSidebarOpen(false);
    setIsSpeakerModalOpen(false);
    fetchSpeakers();
  };

  const handleEditSpeaker = (speaker) => {
    setEditingSpeaker(speaker);
    setIsSpeakerModalOpen(true);
  };

  const handleOpenNewSpeaker = () => {
    setEditingSpeaker(null);
    setIsSpeakerModalOpen(true);
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
    students: 'Gestión de Alumnos',
    admins: 'Administradores',
    certificates: 'Certificados',
    calendar: 'Calendario',
    venues: 'Recintos',
    stationery: 'Material de Papeleria',
    contests: 'Certamenes',
    settings: 'Configuración',
  };

  return (
    <div className="bg-zinc-50 text-zinc-800 min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar Responsive */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 min-h-screen overflow-y-auto flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-100 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="text-lg font-black text-zinc-800 tracking-tight">
              {tabTitles[activeTab]}
            </h2>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
        </header>

        <div className="p-4 sm:p-8 lg:p-10 flex-1">
          {/* Desktop Header (Hidden on Mobile) */}
          <header className="hidden lg:flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-zinc-800">
                {tabTitles[activeTab]}
              </h2>
              <p className="text-sm text-zinc-400 mt-0.5">
                Gestión administrativa de la 13va Jornada Academica y Cultural
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
            onNavigateRegister={handleOpenNewSpeaker}
            onGeneratePDF={generatePDF}
            onEdit={handleEditSpeaker}
          />
        )}

        {activeTab === 'students' && (
          <StudentsPanel />
        )}

        {activeTab === 'admins' && (
          <AdminsPanel />
        )}

        {activeTab === 'venues' && (
          <VenuesPanel />
        )}

        {activeTab === 'calendar' && (
          <CalendarPanel speakers={speakers} />
        )}

        {activeTab === 'stationery' && (
          <StationeryPanel speakers={speakers} />
        )}

        {activeTab === 'certificates' && (
          <CertificatesPanel speakers={speakers} />
        )}

        {activeTab === 'contests' && (
          <ContestsPanel />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel user={user} />
        )}

        </div>
      </main>

      {/* Modal Ponente */}
      {isSpeakerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-in">
            <div className="px-8 py-6 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-zinc-800">
                  {editingSpeaker ? 'Editar Ponente' : 'Nuevo Ponente'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {editingSpeaker ? 'Actualiza los datos del ponente' : 'Registra un nuevo ponente en el sistema'}
                </p>
              </div>
              <button 
                onClick={() => { setIsSpeakerModalOpen(false); setEditingSpeaker(null); }} 
                className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex justify-center">
                <RegisterSpeakerPanel
                  onSuccess={handleSpeakerSaved}
                  editingSpeaker={editingSpeaker}
                  onCancelEdit={() => { setIsSpeakerModalOpen(false); setEditingSpeaker(null); }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Bottom Navigation (Mobile Only) */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
