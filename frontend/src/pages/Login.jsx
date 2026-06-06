import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import loginBackground from '../assets/IMG20251113170442.jpg';
import loginBrandImg from '../assets/Gemini_Generated_Image_yanjdwyanjdwyanj-removebg-preview.png';

const API_URL = 'http://localhost:3000/api/auth';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setErrorMsg(result.message || 'Error en el inicio de sesión');
                setLoading(false);
                return;
            }

            // Guardar token en localStorage o sessionStorage
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('token', result.token);
            storage.setItem('user', JSON.stringify(result.user));

            // Redirigir según el rol
            if (result.user.role === 'admin') {
                navigate('/admin-dashboard');
            } else if (result.user.role === 'student' || result.user.role === 'attendee') {
                navigate('/student-dashboard');
            } else {
                navigate('/');
            }
        } catch (error) {
            setErrorMsg('Error de conexión con el servidor');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Side: Visual / Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12" style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${loginBackground})`,
                backgroundColor: '#3e690d',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}>
                <div className="relative z-10 text-white max-w-lg flex items-center justify-center">
                    <img src={loginBrandImg} alt="13va Jornada Académica y Cultural 2026" className="max-w-full h-48 object-contain" />
                </div>
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-black/20 rounded-full blur-3xl"></div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white">
                <div className="w-full max-w-[440px] space-y-8">
                    {/* Mobile Branding */}
                    <div className="lg:hidden text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-3xl">school</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Sistema Gestor de Sesiones</h1>
                    </div>

                    {/* Header */}
                    <div className="space-y-2">
                        <a className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-container transition-colors gap-1 group" href="/">
                            <span>←</span>
                            Volver al inicio
                        </a>
                        <h2 className="text-3xl font-bold text-gray-900 pt-2">Acceso al Sistema</h2>
                        <p className="text-gray-600">Ingresa tus credenciales para continuar.</p>
                    </div>

                    {/* Error Message */}
                    {errorMsg && (
                        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                            {errorMsg}
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                {/* Email */}
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
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:border-primary focus:bg-white focus:ring-0 transition-all text-gray-900 placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold text-gray-900">Contraseña</label>
                                        <Link className="text-xs font-semibold text-primary hover:underline" to="/forgot">¿Olvidó su contraseña?</Link>
                                    </div>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-xl material-symbols-outlined">lock</span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-12 py-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:border-primary focus:bg-white focus:ring-0 transition-all text-gray-900 placeholder:text-gray-400"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-xl"
                                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                        >
                                            <span className="material-symbols-outlined text-xl">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Remember Me */}
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 bg-gray-100"
                                />
                                <label className="ml-2 text-sm text-gray-600 font-medium">Mantener sesión iniciada</label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-primary hover:bg-primary-container disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <span>{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
                                <span className="material-symbols-outlined text-[20px]">login</span>
                            </button>

                            <div className="text-center pt-2">
                                <p className="text-sm text-gray-600">
                                    ¿Eres alumno?{' '}
                                    <Link className="font-semibold text-primary hover:text-primary-container hover:underline" to="/signup">
                                        Regístrate aquí
                                    </Link>
                                </p>
                            </div>

                    </form>

                    {/* Footer */}
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

            {/* Decorative Bottom Bar */}
            <div className="fixed bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-fixed-dim/50 via-primary to-primary-fixed-dim/50"></div>
        </div>
    );
}

export default Login;