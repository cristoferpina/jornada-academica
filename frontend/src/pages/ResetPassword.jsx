import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api/auth';

function ResetPassword() {
  const [matricula, setMatricula] = useState('');
  const [secretQuestion, setSecretQuestion] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (newPassword !== confirmPassword) {
      setMessage('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      if (step === 1) {
        const res = await fetch(`${API_URL}/forgot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matricula })
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.message || 'Error al consultar la pregunta secreta');
          setLoading(false);
          return;
        }
        if (!data.recovery_enabled || !data.secret_question) {
          setMessage(data.message || 'No hay una pregunta secreta configurada para esta cuenta');
          setLoading(false);
          return;
        }
        setSecretQuestion(data.secret_question);
        setStep(2);
        setMessage('Responde la pregunta secreta para continuar.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula,
          secret_answer: secretAnswer,
          new_password: newPassword,
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Error al restablecer contraseña');
        setLoading(false);
        return;
      }
      setMessage('Contraseña restablecida correctamente. Redirigiendo a inicio de sesión...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMessage('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface py-16">
      <div className="w-full max-w-md bg-white rounded-xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Restablecer contraseña</h2>
        {message && <div className="mb-4 text-zinc-700">{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Matrícula</label>
                <input required type="text" value={matricula} onChange={e=>setMatricula(e.target.value)} className="form-input" />
              </div>
              <button disabled={loading} className="w-full py-3 bg-primary text-white rounded-lg font-bold">
                {loading ? 'Consultando...' : 'Ver pregunta secreta'}
              </button>
            </>
          ) : (
            <>
              <div className="p-3 bg-secondary-container/20 border-l-4 border-primary text-sm rounded-r-lg">
                <strong>Pregunta secreta:</strong>
                <div className="mt-1">{secretQuestion}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Respuesta secreta</label>
                <input required value={secretAnswer} onChange={e=>setSecretAnswer(e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nueva contraseña</label>
                <input required type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirmar nueva contraseña</label>
                <input required type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="form-input" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep(1); setMessage(''); setSecretAnswer(''); setNewPassword(''); setConfirmPassword(''); }} className="w-1/2 py-3 bg-zinc-200 text-on-surface rounded-lg font-bold">
                  Volver
                </button>
                <button disabled={loading} className="w-1/2 py-3 bg-primary text-white rounded-lg font-bold">
                  {loading ? 'Aplicando...' : 'Restablecer contraseña'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
