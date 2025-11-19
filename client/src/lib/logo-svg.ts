/**
 * Utilitário para gerar logo SVG como Data URI
 * Usado em PDFs e outros contextos onde precisamos do logo como string
 */

export interface LogoSvgOptions {
  width?: number;
  height?: number;
  variant?: 'color' | 'monochrome';
  primaryColor?: string;
  secondaryColor?: string;
}

export function generateLogoSvg(options: LogoSvgOptions = {}): string {
  const {
    width = 64,
    height = 64,
    variant = 'color',
    primaryColor = '#10B981',
    secondaryColor = '#3B82F6'
  } = options;

  const crossColor = variant === 'monochrome' ? '#000000' : primaryColor;
  const pulseColor = variant === 'monochrome' ? '#666666' : secondaryColor;
  const bgOpacity = variant === 'monochrome' ? '0.05' : '0.1';

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="${crossColor}" opacity="${bgOpacity}"/>
      <path d="M32 16V48M16 32H48" stroke="${crossColor}" stroke-width="6" stroke-linecap="round"/>
      <path 
        d="M12 32 L18 32 L22 24 L28 40 L34 20 L38 32 L42 32" 
        stroke="${pulseColor}" 
        stroke-width="2.5" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        opacity="0.8" 
        transform="translate(0, 8)"
      />
    </svg>
  `.trim();

  return svg;
}

/**
 * Converte SVG para Data URI (para uso em <img src="...">)
 */
export function generateLogoDataUri(options?: LogoSvgOptions): string {
  const svg = generateLogoSvg(options);
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Gera logo completo (ícone + texto) como SVG
 */
export function generateFullLogoSvg(options: LogoSvgOptions & { fontSize?: number } = {}): string {
  const {
    width = 200,
    height = 64,
    variant = 'color',
    primaryColor = '#10B981',
    fontSize = 24
  } = options;

  const textColor = variant === 'monochrome' ? '#000000' : '#111827';

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 200 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0, 0)">
        ${generateLogoSvg({ width: 64, height: 64, variant, primaryColor })}
      </g>
      <text x="75" y="32" font-family="Inter, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${textColor}">
        Muni<tspan fill="${variant === 'monochrome' ? '#666666' : primaryColor}">Saúde</tspan>
      </text>
      <text x="75" y="48" font-family="Inter, sans-serif" font-size="12" font-weight="500" fill="#666666">
        Integrado
      </text>
    </svg>
  `.trim();

  return svg;
}
