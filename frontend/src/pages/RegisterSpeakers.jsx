import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { API_URL } from '../config';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function RegisterSpeakers() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  const formRef = useRef(null);
  const profileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const [formData, setFormData] = useState({
    full_name: '',
    academic_level: 'Licenciatura',
    institution: '',
    career: '',
    biografia: '',
    conference_name: '',
    suggested_date: '',
    suggested_time: '',
    audience_capacity: '',
    phone: '',
    social_media: '',
    accepted_terms: 'true',
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoName, setProfilePhotoName] = useState('');
  const [institutionalLogo, setInstitutionalLogo] = useState(null);
  const [institutionalLogoName, setInstitutionalLogoName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar error del campo al modificar
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const handleFileChange = useCallback((e) => {
    const { name, files } = e.target;
    const file = files[0];
    if (!file) return;

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      Swal.fire({
        icon: 'error',
        title: 'Archivo demasiado grande',
        text: `El archivo "${file.name}" supera el límite de 5 MB.`
      });
      e.target.value = '';
      return;
    }

    // Validar tipo (opcional, el accept ya filtra pero reforzamos)
    const allowedTypes = {
      profile_photo: ['image/jpeg', 'image/png'],
      institutional_logo: ['image/svg+xml', 'image/png'],
    };
    if (name === 'profile_photo' && !allowedTypes.profile_photo.includes(file.type)) {
      Swal.fire({
        icon: 'warning',
        title: 'Formato no válido',
        text: 'La foto de perfil debe ser JPG o PNG.'
      });
      e.target.value = '';
      return;
    }
    if (name === 'institutional_logo' && !allowedTypes.institutional_logo.includes(file.type)) {
      Swal.fire({
        icon: 'warning',
        title: 'Formato no válido',
        text: 'El logo debe ser SVG o PNG.'
      });
      e.target.value = '';
      return;
    }

    if (name === 'profile_photo') {
      setProfilePhoto(file);
      setProfilePhotoName(file.name);
    }
    if (name === 'institutional_logo') {
      setInstitutionalLogo(file);
      setInstitutionalLogoName(file.name);
    }
    setError(null);
  }, []);

  const resetForm = useCallback(() => {
    formRef.current?.reset();
    setFormData({
      full_name: '',
      academic_level: 'Licenciatura',
      institution: '',
      career: '',
      biografia: '',
      conference_name: '',
      suggested_date: '',
      suggested_time: '',
      audience_capacity: '',
      phone: '',
      social_media: '',
      accepted_terms: 'true',
    });
    setProfilePhoto(null);
    setProfilePhotoName('');
    setInstitutionalLogo(null);
    setInstitutionalLogoName('');
    setFieldErrors({});
    if (profileInputRef.current) profileInputRef.current.value = '';
    if (logoInputRef.current) logoInputRef.current.value = '';
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);
      setFieldErrors({});
      setSuccess(false);

      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        submitData.append(key, formData[key]);
      });
      if (profilePhoto) submitData.append('profile_photo', profilePhoto);
      if (institutionalLogo) submitData.append('institutional_logo', institutionalLogo);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 s de timeout

      try {
        const response = await fetch(`${API_URL}/speakers`, {
          method: 'POST',
          body: submitData,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // Si el backend devuelve errores por campo
          if (errorData.errors && typeof errorData.errors === 'object') {
            setFieldErrors(errorData.errors);
            throw new Error('Por favor corrige los errores en el formulario.');
          }
          throw new Error(errorData.message || 'Error al registrar ponente');
        }

        Swal.fire({
          icon: 'success',
          title: '¡Registro Exitoso!',
          text: 'El ponente ha sido registrado correctamente en el sistema.',
          timer: 2500,
          showConfirmButton: false
        });
        resetForm();
        setTimeout(() => navigate('/admin-dashboard'), 2500);
      } catch (err) {
        setIsLoading(false);
        if (err.name === 'AbortError') {
          Swal.fire('Error de Tiempo', 'La petición tardó demasiado. Intenta de nuevo.', 'error');
        } else {
          Swal.fire('Error de Registro', err.message, 'error');
        }
      } finally {
        // isLoading ya se maneja en el catch/success
      }
    },
    [formData, profilePhoto, institutionalLogo, token, navigate, resetForm]
  );

  // Nombre del usuario (puede venir vacío; se muestra un placeholder)
  const userName = user?.name || 'Administrador';
  const userRole = user?.role === 'superuser' ? 'Superusuario' : 'Usuario';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header Admin */}
        <div className="bg-[#2d420d] px-6 py-5 text-white flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              Gestión administrativa de la 13va Jornada Academica y Cultural
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm">{userName}</p>
              <p className="text-xs text-[#a5c953]">{userRole}</p>
            </div>
            <div
              className="w-10 h-10 rounded-full bg-[#608c1d] flex items-center justify-center text-lg font-bold border-2 border-[#a5c953]"
              aria-label={`Avatar de ${userName}`}
            >
              {userInitial}
            </div>
          </div>
        </div>

        {/* Contenido del Formulario */}
        <div className="p-6 md:p-10">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900">Registrar Ponente</h2>
            <p className="text-gray-500 mt-2 text-lg">
              Completa el formulario para agregar un nuevo ponente al sistema
            </p>
          </div>

          {success && (
            <div
              className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg font-medium"
              role="status"
              aria-live="polite"
            >
              ¡Ponente registrado exitosamente! Redirigiendo...
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-8" noValidate>
            {/* Información Personal */}
            <fieldset className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
              <legend className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-3 w-full">
                <span className="material-symbols-outlined text-[#608c1d] text-2xl">person</span>
                <h3 className="text-xl font-bold text-gray-800">Información Personal</h3>
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre Completo <span aria-hidden="true">*</span>
                  </label>
                  <input
                    required
                    id="full_name"
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    placeholder="Dr. Juan García López"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608c1d] focus:border-transparent outline-none transition-all"
                    onChange={handleChange}
                    aria-required="true"
                    aria-describedby={fieldErrors.full_name ? 'full_name_error' : undefined}
                  />
                  {fieldErrors.full_name && (
                    <p id="full_name_error" className="text-red-600 text-sm mt-1" role="alert">
                      {fieldErrors.full_name}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="academic_level" className="block text-sm font-semibold text-gray-700 mb-2">
                    Grado Académico <span aria-hidden="true">*</span>
                  </label>
                  <select
                    required
                    id="academic_level"
                    name="academic_level"
                    value={formData.academic_level}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608c1d] focus:border-transparent outline-none transition-all"
                    onChange={handleChange}
                    aria-required="true"
                  >
                    <option value="Licenciatura">Licenciatura</option>
                    <option value="Maestría">Maestría</option>
                    <option value="Doctorado">Doctorado</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="institution" className="block text-sm font-semibold text-gray-700 mb-2">
                    Institución
                  </label>
                  <input
                    id="institution"
                    type="text"
                    name="institution"
                    value={formData.institution}
                    placeholder="UNAM, IPN, Universidad Mexiquense del Bicentenario..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608c1d] focus:border-transparent outline-none transition-all"
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="career" className="block text-sm font-semibold text-gray-700 mb-2">
                    Carrera / Facultad
                  </label>
                  <input
                    id="career"
                    type="text"
                    name="career"
                    value={formData.career}
                    placeholder="Ingeniería en Sistemas"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608c1d] focus:border-transparent outline-none transition-all"
                    onChange={handleChange}
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="biografia" className="block text-sm font-semibold text-gray-700 mb-2">
                    Biografía
                  </label>
                  <textarea
                    id="biografia"
                    name="biografia"
                    value={formData.biografia}
                    rows="3"
                    placeholder="Breve descripción académica y profesional del ponente..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608c1d] focus:border-transparent outline-none transition-all resize-none"
                    onChange={handleChange}
                  />
                </div>
              </div>
            </fieldset>

            {/* Archivos */}
            <fieldset className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
              <legend className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-3 w-full">
                <span className="material-symbols-outlined text-[#608c1d] text-2xl">upload</span>
                <h3 className="text-xl font-bold text-gray-800">Archivos</h3>
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="profile_photo" className="block text-sm font-semibold text-gray-700 mb-2">
                    Foto de Perfil
                  </label>
                  <div className="border-2 border-dashed border-gray-300 bg-white rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">add_a_photo</span>
                    <p className="text-sm text-gray-500 font-medium">
                      {profilePhotoName || 'JPG o PNG (máx 5MB)'}
                    </p>
                    <input
                      id="profile_photo"
                      ref={profileInputRef}
                      type="file"
                      name="profile_photo"
                      accept="image/jpeg, image/png"
                      className="mt-4 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#608c1d]/10 file:text-[#608c1d] hover:file:bg-[#608c1d]/20 cursor-pointer"
                      onChange={handleFileChange}
                      aria-describedby="profile_photo_hint"
                    />
                    <p id="profile_photo_hint" className="sr-only">
                      Selecciona una imagen JPG o PNG de máximo 5 MB
                    </p>
                  </div>
                </div>
                <div>
                  <label htmlFor="institutional_logo" className="block text-sm font-semibold text-gray-700 mb-2">
                    Logo Institucional
                  </label>
                  <div className="border-2 border-dashed border-gray-300 bg-white rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">upload_file</span>
                    <p className="text-sm text-gray-500 font-medium">
                      {institutionalLogoName || 'SVG o PNG (máx 5MB)'}
                    </p>
                    <input
                      id="institutional_logo"
                      ref={logoInputRef}
                      type="file"
                      name="institutional_logo"
                      accept="image/svg+xml, image/png"
                      className="mt-4 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#608c1d]/10 file:text-[#608c1d] hover:file:bg-[#608c1d]/20 cursor-pointer"
                      onChange={handleFileChange}
                      aria-describedby="logo_hint"
                    />
                    <p id="logo_hint" className="sr-only">
                      Selecciona un logo en formato SVG o PNG de máximo 5 MB
                    </p>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Detalles de la Ponencia */}
            <fieldset className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
              <legend className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-3 w-full">
                <span className="material-symbols-outlined text-[#608c1d] text-2xl">campaign</span>
                <h3 className="text-xl font-bold text-gray-800">Detalles de la Ponencia</h3>
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="conference_name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre de la Conferencia <span aria-hidden="true">*</span>
                  </label>
                  <input
                    required
                    id="conference_name"
                    type="text"
                    name="conference_name"
                    value={formData.conference_name}
                    placeholder="Ej: Inteligencia Artificial en la Medicina Moderna"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608c1d] focus:border-transparent outline-none transition-all"
                    onChange={handleChange}
                    aria-required="true"
                    aria-describedby={fieldErrors.conference_name ? 'conference_name_error' : undefined}
                  />
                  {fieldErrors.conference_name && (
                    <p id="conference_name_error" className="text-red-600 text-sm mt-1" role="alert">
                      {fieldErrors.conference_name}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="suggested_date" className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha Sugerida
                  </label>
                  <input
                    id="suggested_date"
                    type="date"
                    name="suggested_date"
                    value={formData.suggested_date}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608c1d] focus:border-transparent outline-none transition-all cursor-pointer"
                    onChange={handleChange}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  />
                </div>
                <div>
                  <label htmlFor="suggested_time" className="block text-sm font-semibold text-gray-700 mb-2">
                    Hora Sugerida
                  </label>
                  <input
                    id="suggested_time"
                    type="time"
                    name="suggested_time"
                    value={formData.suggested_time}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608c1d] focus:border-transparent outline-none transition-all cursor-pointer"
                    onChange={handleChange}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  />
                </div>
                <div>
                  <label htmlFor="audience_capacity" className="block text-sm font-semibold text-gray-700 mb-2">
                    Capacidad de Audiencia
                  </label>
                  <input
                    id="audience_capacity"
                    type="number"
                    name="audience_capacity"
                    value={formData.audience_capacity}
                    placeholder="Ej: 100"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608c1d] focus:border-transparent outline-none transition-all"
                    onChange={handleChange}
                    min="1"
                  />
                </div>
              </div>
            </fieldset>

            {/* Contacto y Redes */}
            <fieldset className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
              <legend className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-3 w-full">
                <span className="material-symbols-outlined text-[#608c1d] text-2xl">contact_phone</span>
                <h3 className="text-xl font-bold text-gray-800">Contacto y Redes</h3>
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    placeholder="+52 55 1234 5678"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608c1d] focus:border-transparent outline-none transition-all"
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="social_media" className="block text-sm font-semibold text-gray-700 mb-2">
                    LinkedIn / Red Social
                  </label>
                  <input
                    id="social_media"
                    type="url"
                    name="social_media"
                    value={formData.social_media}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608c1d] focus:border-transparent outline-none transition-all"
                    onChange={handleChange}
                  />
                </div>
              </div>
            </fieldset>

            {/* Submit */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                <span aria-hidden="true">*</span> Campos requeridos. Al guardar, se aceptan los términos automáticamente.
              </p>
              <button
                disabled={isLoading}
                type="submit"
                className="w-full md:w-auto px-8 py-3.5 bg-[#608c1d] text-white font-bold rounded-lg hover:bg-[#4d7017] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
              >
                <span className="material-symbols-outlined" aria-hidden="true">save</span>
                {isLoading ? 'Registrando...' : 'Registrar Ponente'}
              </button>
            </div>

            {error && (
              <div className="text-red-600 text-sm font-semibold mt-2" role="alert">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}