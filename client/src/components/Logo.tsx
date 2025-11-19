interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  className?: string;
}

export function Logo({ size = 'md', variant = 'full', className = '' }: LogoProps) {
  const sizes = {
    sm: { container: 'w-32', icon: 24, text: 'text-sm' },
    md: { container: 'w-48', icon: 32, text: 'text-base' },
    lg: { container: 'w-64', icon: 48, text: 'text-xl' },
    xl: { container: 'w-80', icon: 64, text: 'text-2xl' }
  };

  const colors = {
    primary: '#10B981',
    secondary: '#3B82F6',
    neutral900: '#111827'
  };

  return (
    <div className={`${sizes[size].container} flex items-center gap-3 ${className}`}>
      {/* Ícone - Cruz médica + Pulso */}
      <div className="relative flex-shrink-0" style={{ width: sizes[size].icon, height: sizes[size].icon }}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Círculo de fundo */}
          <circle cx="32" cy="32" r="30" fill={colors.primary} opacity="0.1"/>
          {/* Cruz médica */}
          <path d="M32 16V48M16 32H48" stroke={colors.primary} strokeWidth="6" strokeLinecap="round"/>
          {/* Pulso cardíaco integrado */}
          <path 
            d="M12 32 L18 32 L22 24 L28 40 L34 20 L38 32 L42 32" 
            stroke={colors.secondary} 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            opacity="0.8" 
            transform="translate(0, 8)"
          />
        </svg>
      </div>
      
      {variant === 'full' && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold ${sizes[size].text} tracking-tight text-foreground`}>
            Muni<span className="text-primary">Saúde</span>
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Integrado
          </span>
        </div>
      )}
    </div>
  );
}
