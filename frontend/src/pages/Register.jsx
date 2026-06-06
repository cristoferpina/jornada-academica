import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import loginBackground from '../assets/IMG20251113170442.jpg';
import loginBrandImg from '../assets/Gemini_Generated_Image_yanjdwyanjdwyanj-removebg-preview.png';

const API_URL = 'http://localhost:3000/api/auth';

function Register() {
  const [matricula, setMatricula] = useState('');
  const [student, setStudent] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const institutionalEmail = student?.institutional_email || '';

  const handleLookup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanMatricula = matricula.trim();
    if (!cleanMatricula) {
      setErrorMsg('Ingresa tu matrícula para continuar');
      return;
    }

    setLookupLoading(true);
    try {
      const res = await fetch(`${API_URL}/student-lookup?matricula=${encodeURIComponent(cleanMatricula)}`);
      const data = await res.json();

      if (!res.ok) {
        setStudent(null);
        setErrorMsg(data.message || data.error || 'No se encontró tu información institucional');
        return;
      }

      setStudent(data);
      setSuccessMsg('Datos institucionales cargados. Confirma con tu contraseña.');
    } catch (err) {
      setErrorMsg('Error de conexión');
      console.error(err);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!student) {
      setErrorMsg('Primero consulta tu matrícula para cargar tus datos');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/register-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula: matricula.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || data.error || 'Error al registrar');
        setLoading(false);
        return;
      }

      setSuccessMsg('Registro exitoso. Redirigiendo al inicio de sesión...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setErrorMsg('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${loginBackground})`,
          backgroundColor: '#3e690d',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative z-10 text-white max-w-lg flex items-center justify-center">
          <img src={loginBrandImg} alt="13va Jornada Académica y Cultural 2026" className="max-w-full h-48 object-contain" />
        </div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-black/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white">
        <div className="w-full max-w-[440px] space-y-8">
          <div className="lg:hidden text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-3xl">how_to_reg</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Sistema Gestor de Sesiones</h1>
          </div>

          <div className="space-y-2">
            <Link className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-container transition-colors gap-1 group" to="/login">
              <span>←</span>
              Volver al inicio
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 pt-2">Registro de alumno</h2>
            <p className="text-gray-600">Consulta tu matrícula y confirma tus datos para crear tu acceso.</p>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-100 border border-emerald-400 text-emerald-700 rounded-lg text-sm">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleLookup} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">Matrícula</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-xl material-symbols-outlined">badge</span>
                  <input
                    value={matricula}
                    onChange={(e) => {
                      setMatricula(e.target.value);
                      setStudent(null);
                      setSuccessMsg('');
                      setErrorMsg('');
                    }}
                    placeholder="Matricula"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:border-primary focus:bg-white focus:ring-0 transition-all text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full py-4 bg-primary hover:bg-primary-container disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>{lookupLoading ? 'Consultando...' : 'Consultar datos'}</span>
                <span className="material-symbols-outlined text-[20px]">manage_search</span>
              </button>
            </div>
          </form>

          {student && (
            <div className="space-y-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Nombre(s)</label>
                  <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 text-gray-900">
                    {student.first_name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Apellidos</label>
                  <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 text-gray-900">
                    {student.last_name}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Carrera</label>
                  <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 text-gray-900">
                    {student.career}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Correo institucional</label>
                  <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 text-gray-900 break-all">
                    {institutionalEmail}
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Confirma el alta con tu contraseña. Si los datos no son correctos, contacta a administración.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">Contraseña</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-xl material-symbols-outlined">lock</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Crea tu contraseña"
                    required
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:border-primary focus:bg-white focus:ring-0 transition-all text-gray-900 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-xl"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">Confirmar contraseña</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-xl material-symbols-outlined">verified_user</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    required
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:border-primary focus:bg-white focus:ring-0 transition-all text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            <button
              disabled={loading || !student}
              className="w-full py-4 bg-primary hover:bg-primary-container disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Registrando...' : 'Confirmar registro'}</span>
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link className="font-semibold text-primary hover:text-primary-container hover:underline" to="/login">
                Inicia sesión
              </Link>
            </p>
          </div>

          <div className="pt-8 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-600 font-medium mb-4">
              Soporte Técnico: <a className="text-primary hover:underline font-bold" href="mailto:soporte@umb.mx">soporte@umb.mx</a>
            </p>
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Universidad Mexiquense del Bicentenario</p>
              <p className="text-[9px] text-gray-400">© 2025 Todos los derechos reservados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
