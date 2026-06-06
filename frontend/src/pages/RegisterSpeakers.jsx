import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import logoImg from '../assets/DcRO6.jpg';

const API_URL = 'http://localhost:3000/api/speakers';

function SuccessModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-slide-in">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-4xl">check_circle</span>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-center text-on-surface mb-2">¡Registro Exitoso!</h2>

                <p className="text-center text-zinc-600 mb-6">
                    Tu registro como ponente ha sido recibido correctamente. Nos pondremos en contacto pronto con los detalles de tu participación.
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-primary text-white py-3 rounded-lg font-bold hover:scale-105 transition-transform"
                    >
                        Aceptar
                    </button>
                    <Link
                        to="/"
                        className="flex-1 bg-zinc-200 text-on-surface py-3 rounded-lg font-bold hover:scale-105 transition-transform text-center"
                    >
                        Ir a Inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}

function TopNavBar() {
    return (
        <nav className="bg-white shadow-md sticky top-0 z-50 w-full">
            <div className="flex justify-between items-center px-8 h-16 w-full max-w-7xl mx-auto font-headline tracking-tight">
                <Link to="/">
                    <img src={logoImg} alt="Logo Jornada Académica" className="h-12 object-contain cursor-pointer" />
                </Link>
                <div className="hidden md:flex items-center gap-8">
                    <a className="text-primary border-b-2 border-primary px-1 py-1 transition-all" href="#programa">
                        Ver Programa
                    </a>
                    <button className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold hover:scale-105 transition-transform scale-98-active">
                        Iniciar Sesión
                    </button>
                </div>
                <button className="md:hidden material-symbols-outlined text-on-surface">menu</button>
            </div>
        </nav>
    );
}

function RegisterSpeakers() {
    const { register, handleSubmit, formState: { errors }, reset } = useForm();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const closeModal = () => {
        setSuccess(false);
    };

    const onSubmit = async (data) => {
        setLoading(true);
        setErrorMsg('');
        setSuccess(false);

        console.log('Form data:', data);

        // Validar que socialMedia no sea una URL demasiado larga
        if (data.socialMedia && data.socialMedia.length > 2048) {
            setErrorMsg('La URL de redes sociales es demasiado larga. Por favor, usa un enlace acortado.');
            setLoading(false);
            return;
        }

        try {
            // Crear FormData para manejar archivos
            const formData = new FormData();
            formData.append('full_name', data.fullName);
            formData.append('academic_level', data.academicLevel);
            formData.append('institution', data.institution || '');
            formData.append('career', data.career || '');
            formData.append('conference_name', data.conferenceName);
            formData.append('biografia', data.biography || '');
            formData.append('suggested_date', data.suggestedDate || '');
            formData.append('audience_capacity', data.audienceCapacity ? parseInt(data.audienceCapacity) : '');
            formData.append('phone', data.phone || '');
            formData.append('social_media', data.socialMedia || '');
            formData.append('accepted_terms', data.terms ? 'true' : 'false');

            // Agregar archivos si existen
            if (data.profilePhoto && data.profilePhoto.length > 0) {
                const profileFile = data.profilePhoto[0];
                if (profileFile.size > 5 * 1024 * 1024) {
                    setErrorMsg('La foto de perfil debe ser menor a 5MB');
                    setLoading(false);
                    return;
                }
                formData.append('profile_photo', profileFile);
            }

            if (data.institutionalLogo && data.institutionalLogo.length > 0) {
                const logoFile = data.institutionalLogo[0];
                if (logoFile.size > 5 * 1024 * 1024) {
                    setErrorMsg('El logo institucional debe ser menor a 5MB');
                    setLoading(false);
                    return;
                }
                formData.append('institutional_logo', logoFile);
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al enviar el formulario');
            }

            const result = await response.json();
            console.log('Success:', result);
            setSuccess(true);
            reset();
        } catch (error) {
            console.error('Error:', error);
            setErrorMsg(error.message || 'Ocurrió un error al registrar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface font-body text-on-surface">
            <TopNavBar />
            <SuccessModal isOpen={success} onClose={closeModal} />
            <main className="pt-24 pb-24 px-6 min-h-screen flex flex-col items-center">
                <div className="max-w-4xl w-full mb-12 text-center">
                    <span className="text-primary font-bold tracking-[0.2em] text-xs uppercase mb-4 block">Convocatoria 2026</span>
                    <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight mb-4">Registro de Ponentes</h1>
                    <p className="text-zinc-500 max-w-2xl mx-auto leading-relaxed">Únase a la élite académica y comparta su conocimiento en nuestra próxima Jornada Cultural.</p>
                </div>

                <div className="max-w-4xl w-full bg-white rounded-lg p-8 md:p-16 relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl"></div>

                    {errorMsg && (
                        <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                            <p className="text-red-700 font-medium">✕ {errorMsg}</p>
                        </div>
                    )}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 relative z-10">
                        <section>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">person</span>
                                </div>
                                <h2 className="text-xl font-bold tracking-tight">Información Personal</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-on-surface ml-4">Nombre Completo</label>
                                    <input
                                        {...register('fullName', { required: 'El nombre es requerido' })}
                                        className="form-input"
                                        placeholder="Ingrese su nombre"
                                        type="text"
                                    />
                                    {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-on-surface ml-4">Grado Académico</label>
                                    <select {...register('academicLevel')} className="form-input">
                                        <option>Doctorado</option>
                                        <option>Maestría</option>
                                        <option>Licenciatura</option>
                                    </select>
                                </div>
                            </div>
                        </section>
                        <section>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">account_balance</span>
                                </div>
                                <h2 className="text-xl font-bold tracking-tight">Afiliación Profesional</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <input {...register('institution')} className="form-input" placeholder="Institución" type="text" />
                                <input {...register('career')} className="form-input" placeholder="Carrera / Facultad" type="text" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-on-surface ml-4">Foto de Perfil</label>
                                    <input
                                        {...register('profilePhoto')}
                                        type="file"
                                        accept="image/jpeg,image/png"
                                        className="hidden"
                                        id="profilePhoto"
                                    />
                                    <label htmlFor="profilePhoto" className="upload-area cursor-pointer block">
                                        <span className="material-symbols-outlined">add_a_photo</span>
                                        <p className="text-xs text-zinc-500 font-medium mt-2">Subir JPG o PNG (Máx 5MB)</p>
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-on-surface ml-4">Logo Institucional</label>
                                    <input
                                        {...register('institutionalLogo')}
                                        type="file"
                                        accept="image/svg+xml,image/png"
                                        className="hidden"
                                        id="institutionalLogo"
                                    />
                                    <label htmlFor="institutionalLogo" className="upload-area cursor-pointer block">
                                        <span className="material-symbols-outlined">upload_file</span>
                                        <p className="text-xs text-zinc-500 font-medium mt-2">Subir logo vectorial o PNG</p>
                                    </label>
                                </div>
                            </div>
                        </section>

                            <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-full bg-[#76a646]/20 flex items-center justify-center text-[#3e690d]">
                                        <span className="material-symbols-outlined">article</span>
                                    </div>
                                    <h2 className="text-xl font-bold tracking-tight">Biografía</h2>
                                </div>
                                <textarea
                                    {...register('biography')}
                                    className="form-input h-32 resize-none"
                                    placeholder="Escribe una breve biografía"
                                />
                            </section>

                        <section>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">campaign</span>
                                </div>
                                <h2 className="text-xl font-bold tracking-tight">Detalles de la Ponencia</h2>
                            </div>
                            <input {...register('conferenceName')} className="form-input w-full mb-8" placeholder="Nombre de la Conferencia" type="text" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <input {...register('suggestedDate')} className="form-input" type="date" />
                                <input {...register('audienceCapacity')} className="form-input" placeholder="Capacidad de audiencia" type="number" />
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">contact_phone</span>
                                </div>
                                <h2 className="text-xl font-bold tracking-tight">Contacto y Redes</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <input {...register('phone')} className="form-input" placeholder="Teléfono" type="tel" />
                                <input {...register('socialMedia')} className="form-input" placeholder="LinkedIn/Twitter" type="url" />
                            </div>
                        </section>

                        <div className="pt-8 border-t border-[#e2e2e2] flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <input {...register('terms')} className="w-5 h-5 rounded" id="terms" type="checkbox" />
                                <label className="text-sm text-zinc-500" htmlFor="terms">Acepto los términos y condiciones</label>
                            </div>
                            <button
                                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? 'Enviando...' : 'Enviar Registro'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            <footer className="md:hidden fixed bottom-0 w-full bg-white px-6 py-4 flex justify-around items-center border-t border-zinc-100 z-50">
                <div className="flex flex-col items-center gap-1 text-[#3e690d]">
                    <span className="material-symbols-outlined">edit_document</span>
                    <span className="text-[10px] font-bold">Registro</span>
                </div>
                <Link to="/" className="flex flex-col items-center gap-1 text-zinc-400">
                    <span className="material-symbols-outlined">home</span>
                    <span className="text-[10px] font-medium">Inicio</span>
                </Link>
                <div className="flex flex-col items-center gap-1 text-zinc-400">
                    <span className="material-symbols-outlined">help</span>
                    <span className="text-[10px] font-medium">Ayuda</span>
                </div>
            </footer>
        </div>
    );
}

export default RegisterSpeakers;
