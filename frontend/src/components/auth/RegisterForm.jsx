import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import clsx from 'clsx';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { validateEmail, validatePassword } from '../../utils/validators';

const PASSWORD_RULES = [
  { key: 'length', label: 'Al menos 8 caracteres', test: (value) => value.length >= 8 },
  { key: 'upper', label: 'Una letra mayúscula', test: (value) => /[A-Z]/.test(value) },
  { key: 'lower', label: 'Una letra minúscula', test: (value) => /[a-z]/.test(value) },
  { key: 'number', label: 'Un número', test: (value) => /[0-9]/.test(value) },
];

export default function RegisterForm({ onSuccess, className }) {
  const register = useAuthStore((state) => state.register);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Ingresá un email válido.');
      return;
    }
    if (validatePassword(password).length > 0) {
      setError('La contraseña no cumple los requisitos mínimos.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
      onSuccess?.();
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 409) {
        setError('Ya existe una cuenta registrada con ese email.');
      } else {
        setError('No se pudo crear la cuenta. Intentá de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={clsx('flex flex-col gap-4', className)}>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Nombre"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          required
          autoComplete="given-name"
        />
        <Input
          label="Apellido"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          required
          autoComplete="family-name"
        />
      </div>

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        autoComplete="email"
      />

      <Input
        label="Contraseña"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        autoComplete="new-password"
      />

      {password.length > 0 && (
        <ul className="flex flex-col gap-1">
          {PASSWORD_RULES.map((rule) => {
            const passes = rule.test(password);
            return (
              <li
                key={rule.key}
                className={clsx(
                  'flex items-center gap-1.5 text-xs',
                  passes ? 'text-emerald-600' : 'text-ink-soft',
                )}
              >
                {passes ? <Check size={14} /> : <X size={14} />}
                {rule.label}
              </li>
            );
          })}
        </ul>
      )}

      <Input
        label="Confirmar contraseña"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
        autoComplete="new-password"
        error={
          confirmPassword.length > 0 && confirmPassword !== password
            ? 'Las contraseñas no coinciden'
            : undefined
        }
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" loading={isSubmitting} className="w-full">
        Crear cuenta
      </Button>

      <p className="text-center text-sm text-ink-soft">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Iniciá sesión
        </Link>
      </p>
    </form>
  );
}
