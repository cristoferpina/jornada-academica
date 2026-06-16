import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gasAuthService } from '../services/gasAuthService';
import loginBackground from '../assets/IMG20251113170442.jpg';
import loginBrandImg from '../assets/Gemini_Generated_Image_yanjdwyanjdwyanj-removebg-preview.png';

function ForgotPassword() {
    const [step, setStep] = useState(1); // 1: Email, 2: PIN, 3: New Password
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const navigate = useNavigate();

    // PASO 1: Solicitar PIN
    const handleRequestReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        const result = await gasAuthService.requestReset(email);
        
        if (result.success) {
            setMessage({ type: 'success', text: result.message });
            setStep(2);
        } else {
            setMessage({ type: 'error', text: result.message });
        }
        setLoading(false);
    };

    // PASO 2: Verificar PIN
    const handleVerifyPin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        const result = await gasAuthService.verifyPin(email, pin);
        
        if (result.success) {
            setStep(3);
        } else {
            setMessage({ type: 'error', text: result.message });
        }
        setLoading(false);
    };

    // PASO 3: Actualizar Contraseña
    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        const result = await gasAuthService.updatePassword(email, pin, newPassword);
        
        if (result.success) {
            setMessage({ type: 'success', text: 'Contraseña actualizada con éxito. Redirigiendo...' });
            setTimeout(() => navigate('/login'), 3000);
        } else {
            setMessage({ type: 'error', text: result.message });
        }
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Side: Visual / Branding (Consistent with Login) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12" style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${loginBackground})`,
                backgroundColor: '#80ba26',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}>
                <div className="relative z-10 text-white max-w-lg flex items-center justify-center">
                    <img src={loginBrandImg} alt="13va Jornada Academica y Cultural" className="max-w-full h-48 object-contain" />
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white">
                <div className="w-full max-w-[440px] space-y-8">
                    
                    {/* Header */}
                    <div className="space-y-2">
                        <Link className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-container transition-colors gap-1 group" to="/login">
                            <span>←</span>
                            Volver al inicio de sesión
                        </Link>
                        <h2 className="text-3xl font-bold text-gray-900 pt-2">Recuperar Contraseña</h2>
                        <p className="text-gray-600">
                            {step === 1 && "Ingresa tu correo para recibir un PIN de seguridad."}
                            {step === 2 && "Ingresa el código de 8 dígitos enviado a tu correo."}
                            {step === 3 && "Establece tu nueva contraseña de acceso."}
                        </p>
                    </div>

                    {/* Feedback Message */}
                    {message.text && (
                        <div className={`p-4 rounded-lg text-sm border ${
                            message.type === 'success' 
                            ? 'bg-green-100 border-green-400 text-green-700' 
                            : 'bg-red-100 border-red-400 text-red-700'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    {/* STEP 1: Email Form */}
                    {step === 1 && (
                        <form onSubmit={handleRequestReset} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-900">Correo Institucional</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-xl material-symbols-outlined">mail</span>
                                    <input
                                        type="email"
                                        placeholder="ejemplo@umb.mx"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:border-primary focus:bg-white focus:ring-0 transition-all text-gray-900"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-primary hover:bg-primary-container disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <span>{loading ? 'Enviando...' : 'Enviar PIN de recuperación'}</span>
                                <span className="material-symbols-outlined text-[20px]">send</span>
                            </button>
                        </form>
                    )}

                    {/* STEP 2: PIN Form */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyPin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-900">Código de Verificación (PIN)</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-xl material-symbols-outlined">pin</span>
                                    <input
                                        type="text"
                                        placeholder="12345678"
                                        maxLength="8"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:border-primary focus:bg-white focus:ring-0 transition-all text-gray-900 text-center tracking-[0.5em] font-bold text-xl"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 text-center">Revisa tu bandeja de entrada y spam.</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-1/3 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                                >
                                    Atrás
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-2/3 py-4 bg-primary hover:bg-primary-container disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <span>{loading ? 'Verificando...' : 'Verificar PIN'}</span>
                                    <span className="material-symbols-outlined text-[20px]">verified</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STEP 3: New Password Form */}
                    {step === 3 && (
                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-900">Nueva Contraseña</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-xl material-symbols-outlined">lock</span>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:border-primary focus:bg-white focus:ring-0 transition-all text-gray-900"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-900">Confirmar Contraseña</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-xl material-symbols-outlined">lock_reset</span>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:border-primary focus:bg-white focus:ring-0 transition-all text-gray-900"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-primary hover:bg-primary-container disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <span>{loading ? 'Actualizando...' : 'Cambiar Contraseña'}</span>
                                <span className="material-symbols-outlined text-[20px]">save</span>
                            </button>
                        </form>
                    )}

                    {/* Footer */}
                    <div className="pt-8 border-t border-gray-100 text-center mt-8">
                        <p className="text-xs text-gray-500 mb-4">
                            ¿Necesitas ayuda? Contacta a <span className="font-bold text-primary">soporte@umb.mx</span>
                        </p>
                    </div>
                    </div>
                    </div>
                    </div>
                    );
}

export default ForgotPassword;

