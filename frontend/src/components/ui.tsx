import { ReactNode } from 'react';

export function Button({
  children,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const styles = {
    primary: 'bg-tomato text-white border-ink shadow-crisp active:translate-y-1 active:shadow-none',
    secondary: 'bg-gold text-ink border-ink shadow-crisp active:translate-y-1 active:shadow-none',
    ghost: 'bg-white text-ink border-ink',
  };
  return (
    <button
      {...props}
      className={`min-h-12 rounded-md border-2 px-4 py-3 text-base font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${props.className ?? ''}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-black uppercase tracking-wide text-ink">
      {label}
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`min-h-12 w-full min-w-0 rounded-md border-2 border-ink bg-white px-3 text-base ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`min-h-12 w-full min-w-0 rounded-md border-2 border-ink bg-white px-3 text-base ${props.className ?? ''}`} />;
}

export function Card({ children, className = '', ...props }: React.HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <section {...props} className={`rounded-lg border-2 border-ink bg-white p-4 shadow-crisp ${className}`}>{children}</section>;
}

export function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-md border-2 border-ink bg-tomato px-3 py-2 font-bold text-white">{message}</p>;
}

export function Loading() {
  return <p className="rounded-md border-2 border-ink bg-white px-3 py-2 font-bold">Carregando...</p>;
}
