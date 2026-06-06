import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api/auth';

function CambiarContraseña() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('authenticated'); // 'authenticated' or 'recovery'
  
  // Authenticated mode state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Recovery mode state
  const [matricula, setMatricula] = useState('');
  const [secretQuestion, setSecretQuestion] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  
  // Common state
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // For recovery mode
  
  const [currentUser] = useState(() => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  // Authenticated password change
  const handleAuthenticatedChange = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'No se pudo actualizar la contraseña');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('✓ Contraseña actualizada correctamente');
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Recovery password change - Step 1: Get secret question
  const handleRecoveryStep1 = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Error al consultar la pregunta secreta');
        setLoading(false);
        return;
      }
      if (!data.recovery_enabled || !data.secret_question) {
        setError(data.message || 'No hay una pregunta secreta configurada para esta cuenta');
        setLoading(false);
        return;
      }
      setSecretQuestion(data.secret_question);
      setStep(2);
      setMessage('Responde la pregunta secreta para continuar.');
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Recovery password change - Step 2: Reset password
  const handleRecoveryStep2 = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula,
          secret_answer: secretAnswer,
          new_password: recoveryNewPassword,
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Error al restablecer contraseña');
        setLoading(false);
        return;
      }
      setMessage('✓ Contraseña restablecida correctamente. Redirigiendo a inicio de sesión...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8 sm:py-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8 rounded-xl sm:rounded-2xl border border-[#3e690d]/15 bg-gradient-to-r from-[#f4f8ee] via-white to-[#eef6df] p-4 sm:p-6 shadow-[0_12px_50px_rgba(62,105,13,0.08)]">
          <p className="text-xs font-bold tracking-[0.1em] text-[#3e690d] uppercase">Cuenta del alumno</p>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface mt-1">Cambiar contraseña</h1>
          <p className="text-xs sm:text-sm text-zinc-600 mt-2 sm:mt-3 max-w-2xl">
            Actualiza tu contraseña desde esta sesión. Si no recuerdas tu contraseña actual, usa recuperación de acceso.
          </p>
          
          {currentUser && (
            <div className="mt-3 sm:mt-4 rounded-lg sm:rounded-xl bg-white/80 backdrop-blur px-3 sm:px-4 py-2 sm:py-3 border border-white/60 inline-block max-w-full">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sesión actual</p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-800 truncate">{currentUser.name || 'Alumno'}</p>
              <p className="text-xs text-zinc-500 truncate">{currentUser.email || 'Cuenta institucional'}</p>
            </div>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1 sm:gap-2 mb-6 sm:mb-8 border-b border-zinc-200 overflow-x-auto">
          <button
            onClick={() => {
              setMode('authenticated');
              setStep(1);
              setMessage('');
              setError('');
            }}
            className={`px-3 sm:px-4 py-2 font-semibold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap ${
              mode === 'authenticated'
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Con contraseña actual
          </button>
          <button
            onClick={() => {
              setMode('recovery');
              setStep(1);
              setMessage('');
              setError('');
            }}
            className={`px-3 sm:px-4 py-2 font-semibold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap ${
              mode === 'recovery'
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Recuperación de acceso
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-3 sm:p-4 rounded-lg sm:rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs sm:text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 p-3 sm:p-4 rounded-lg sm:rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Authenticated Mode */}
        {mode === 'authenticated' && (
          <form onSubmit={handleAuthenticatedChange} className="bg-white rounded-lg sm:rounded-2xl p-4 sm:p-8 shadow-lg border border-zinc-100">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-2">Contraseña actual</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                  className="w-full rounded-lg sm:rounded-xl border border-zinc-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-zinc-900 focus:border-primary focus:ring-0 placeholder-zinc-400"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-2">Nueva contraseña</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ingresa tu nueva contraseña"
                  className="w-full rounded-lg sm:rounded-xl border border-zinc-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-zinc-900 focus:border-primary focus:ring-0 placeholder-zinc-400"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-2">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma tu nueva contraseña"
                  className="w-full rounded-lg sm:rounded-xl border border-zinc-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-zinc-900 focus:border-primary focus:ring-0 placeholder-zinc-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 sm:mt-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </div>
          </form>
        )}

        {/* Recovery Mode */}
        {mode === 'recovery' && (
          <form
            onSubmit={step === 1 ? handleRecoveryStep1 : handleRecoveryStep2}
            className="bg-white rounded-lg sm:rounded-2xl p-4 sm:p-8 shadow-lg border border-zinc-100"
          >
            <div className="space-y-3 sm:space-y-4">
              {step === 1 ? (
                <>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-2">Matrícula</label>
                    <input
                      type="text"
                      required
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      placeholder="Ingresa tu matrícula (ej: 13220030)"
                      className="w-full rounded-lg sm:rounded-xl border border-zinc-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-zinc-900 focus:border-primary focus:ring-0 placeholder-zinc-400"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Te mostraremos tu pregunta secreta para verificar tu identidad</p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 sm:mt-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Consultando...' : 'Ver pregunta secreta'}
                  </button>
                </>
              ) : (
                <>
                  <div className="p-3 sm:p-4 bg-secondary-container/20 border-l-4 border-primary text-xs sm:text-sm rounded-lg">
                    <strong className="block mb-2 text-xs sm:text-sm">Pregunta secreta:</strong>
                    <div className="text-zinc-700 text-xs sm:text-sm">{secretQuestion}</div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-2">Tu respuesta</label>
                    <input
                      type="text"
                      required
                      value={secretAnswer}
                      onChange={(e) => setSecretAnswer(e.target.value)}
                      placeholder="Ingresa tu respuesta"
                      className="w-full rounded-lg sm:rounded-xl border border-zinc-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-zinc-900 focus:border-primary focus:ring-0 placeholder-zinc-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-2">Nueva contraseña</label>
                    <input
                      type="password"
                      required
                      value={recoveryNewPassword}
                      onChange={(e) => setRecoveryNewPassword(e.target.value)}
                      placeholder="Ingresa tu nueva contraseña"
                      className="w-full rounded-lg sm:rounded-xl border border-zinc-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-zinc-900 focus:border-primary focus:ring-0 placeholder-zinc-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-zinc-700 mb-2">Confirmar nueva contraseña</label>
                    <input
                      type="password"
                      required
                      value={recoveryConfirmPassword}
                      onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                      placeholder="Confirma tu nueva contraseña"
                      className="w-full rounded-lg sm:rounded-xl border border-zinc-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-zinc-900 focus:border-primary focus:ring-0 placeholder-zinc-400"
                    />
                  </div>
                  <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setSecretAnswer('');
                        setRecoveryNewPassword('');
                        setRecoveryConfirmPassword('');
                        setMessage('');
                      }}
                      className="flex-1 py-2.5 sm:py-3 border border-zinc-200 text-zinc-700 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:bg-zinc-50 transition-all"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 sm:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default CambiarContraseña;
