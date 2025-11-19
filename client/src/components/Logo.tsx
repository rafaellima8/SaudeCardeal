interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  colorScheme?: 'color' | 'monochrome' | 'inverse';
  className?: string;
}

export function Logo({ size = 'md', variant = 'full', colorScheme = 'color', className = '' }: LogoProps) {
  const sizes = {
    sm: { container: 'w-32', icon: 24, text: 'text-sm' },
    md: { container: 'w-48', icon: 32, text: 'text-base' },
    lg: { container: 'w-64', icon: 48, text: 'text-xl' },
    xl: { container: 'w-80', icon: 64, text: 'text-2xl' }
  };

  // Definir cores conforme esquema
  const getColors = () => {
    if (colorScheme === 'monochrome') {
      return {
        primary: '#000000',
        secondary: '#666666',
        bgOpacity: '0.05',
        textPrimary: '#000000',
        textSecondary: '#666666'
      };
    }
    if (colorScheme === 'inverse') {
      return {
        primary: '#FFFFFF',
        secondary: '#E0E0E0',
        bgOpacity: '0.1',
        textPrimary: '#FFFFFF',
        textSecondary: '#E0E0E0'
      };
    }
    // color (padrão)
    return {
      primary: '#10B981',
      secondary: '#3B82F6',
      bgOpacity: '0.1',
      textPrimary: '#111827',
      textSecondary: '#10B981'
    };
  };

  const colors = getColors();

  return (
    <div className={`${sizes[size].container} flex items-center gap-3 ${className}`}>
      {/* Ícone - Cruz médica + Pulso */}
      <div className="relative flex-shrink-0" style={{ width: sizes[size].icon, height: sizes[size].icon }}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Círculo de fundo */}
          <circle cx="32" cy="32" r="30" fill={colors.primary} opacity={colors.bgOpacity}/>
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
          <span 
            className={`font-bold ${sizes[size].text} tracking-tight`}
            style={{ color: colors.textPrimary }}
          >
            Muni<span style={{ color: colors.textSecondary }}>Saúde</span>
          </span>
          <span 
            className="text-xs font-medium" 
            style={{ color: colorScheme === 'inverse' ? colors.secondary : '#6B7280' }}
          >
            Integrado
          </span>
        </div>
      )}
    </div>
  );
}
