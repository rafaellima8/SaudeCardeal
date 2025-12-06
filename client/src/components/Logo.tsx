import argoLogo from "@/assets/argo-logo.png";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  colorScheme?: 'color' | 'monochrome' | 'inverse';
  className?: string;
}

export function Logo({ size = 'md', variant = 'full', className = '' }: LogoProps) {
  const sizes = {
    sm: { container: 'w-32', icon: 24, text: 'text-sm', logoHeight: 28 },
    md: { container: 'w-48', icon: 32, text: 'text-base', logoHeight: 36 },
    lg: { container: 'w-64', icon: 48, text: 'text-xl', logoHeight: 48 },
    xl: { container: 'w-80', icon: 64, text: 'text-2xl', logoHeight: 64 }
  };

  return (
    <div className={`${sizes[size].container} flex items-center gap-3 ${className}`}>
      <div className="relative flex-shrink-0" style={{ width: sizes[size].icon, height: sizes[size].icon }}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="30" fill="#10B981" opacity="0.1"/>
          <path d="M32 16V48M16 32H48" stroke="#10B981" strokeWidth="6" strokeLinecap="round"/>
          <path 
            d="M12 32 L18 32 L22 24 L28 40 L34 20 L38 32 L42 32" 
            stroke="#3B82F6" 
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
            Argo<span className="text-primary">Saude</span>
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Gestao Municipal
          </span>
        </div>
      )}
    </div>
  );
}

export function ArgoTechLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={argoLogo} 
        alt="Argo Tech Brasil" 
        className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity"
      />
    </div>
  );
}
