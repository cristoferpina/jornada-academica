import React from 'react';

export const passwordRequirements = [
  { label: 'Al menos 8 caracteres', test: (pwd) => pwd.length >= 8 },
  { label: 'Una letra mayúscula', test: (pwd) => /[A-Z]/.test(pwd) },
  { label: 'Una letra minúscula', test: (pwd) => /[a-z]/.test(pwd) },
  { label: 'Un número', test: (pwd) => /[0-9]/.test(pwd) },
  { label: 'Un carácter especial (!@#$%^&*)', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
];

const PasswordStrengthMeter = ({ password }) => {
  const strength = passwordRequirements.filter(req => req.test(password)).length;
  
  const getStrengthColor = () => {
    if (strength === 0) return 'bg-gray-200';
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strength === 0) return 'Muy débil';
    if (strength <= 2) return 'Débil';
    if (strength <= 4) return 'Media';
    return 'Fuerte';
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-700">Seguridad: {getStrengthText()}</span>
        <span className="text-xs text-gray-500">{strength}/5</span>
      </div>
      
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1 w-full rounded-full transition-colors duration-300 ${
              level <= strength ? getStrengthColor() : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <ul className="text-[10px] space-y-1 mt-2">
        {passwordRequirements.map((req, index) => {
          const isMet = req.test(password);
          return (
            <li key={index} className={`flex items-center gap-2 ${isMet ? 'text-green-600' : 'text-gray-500'}`}>
              <span className={`w-3 h-3 flex items-center justify-center rounded-full border ${isMet ? 'bg-green-100 border-green-500' : 'border-gray-300'}`}>
                {isMet && (
                  <svg className="w-2 h-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordStrengthMeter;
