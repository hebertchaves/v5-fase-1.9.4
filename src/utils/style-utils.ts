import { quasarColors } from '../data/color-map';

/**
 * Processa uma classe do Quasar para extrair valores de estilo
 */
export function processQuasarClass(className: string): Record<string, any> | null {
  // Classes de espaçamento (q-pa-*, q-ma-*)
  if (className.match(/^q-([mp])([atrblxy])?-([a-z]+)$/)) {
    return processSpacingClass(className);
  }
  
  // Classes de texto (text-h1, text-caption, etc)
  if (className.match(/^text-([a-h][1-6]|body[12]|subtitle[12]|caption|overline)$/)) {
    return processTextClass(className);
  }
  
  // Classes de cor de fundo (bg-primary, bg-red-5, etc)
  if (className.match(/^bg-([a-z]+)(\-\d+)?$/)) {
    return processColorClass(className, 'background');
  }
  
  // Classes de cor de texto (text-primary, text-red-5, etc)
  if (className.match(/^text-([a-z]+)(\-\d+)?$/) && 
      !className.match(/^text-([a-h][1-6]|body[12]|subtitle[12]|caption|overline)$/)) {
    return processColorClass(className, 'text');
  }
  
  // Classes flexbox (row, column, etc)
  if (['row', 'column', 'items-start', 'items-center', 'items-end',
       'justify-start', 'justify-center', 'justify-end', 'justify-between'].includes(className)) {
    return processFlexboxClass(className);
  }
  
  // Classes de alinhamento de texto
  if (['text-left', 'text-center', 'text-right', 'text-justify'].includes(className)) {
    return processTextAlignmentClass(className);
  }
  
  // Classes de visibilidade e display
  if (className.match(/^(hidden|visible|invisible|display-none|display-block|display-inline|display-inline-block)$/)) {
    return processVisibilityClass(className);
  }
  
  // Outras classes não implementadas
  return null;
}

// Nova função para processar classes de visibilidade
function processVisibilityClass(className: string): Record<string, any> | null {
  switch (className) {
    case 'hidden':
    case 'invisible':
    case 'display-none':
      return { visible: false };
    case 'visible':
    case 'display-block':
    case 'display-inline':
    case 'display-inline-block':
      return { visible: true };
    default:
      return null;
  }
}

/**
 * Processa classes de espaçamento (margin e padding)
 */
function processSpacingClass(className: string): Record<string, number> | null {
  const match = className.match(/^q-([mp])([atrblxy])?-([a-z]+)$/);
  if (!match) return null;
  
  const [, type, direction, size] = match;
  
  // Mapear tamanhos para valores em pixels
  const sizeValues: Record<string, number> = {
    'none': 0,
    'xs': 4,
    'sm': 8,
    'md': 16,
    'lg': 24,
    'xl': 32
  };
  
  const sizeValue = sizeValues[size] || 0;
  const result: Record<string, number> = {};
  
  // Aplicar em todas as direções
  if (type === 'm') {
    // Margins
    if (!direction || direction === 'a') {
      result.marginTop = sizeValue;
      result.marginRight = sizeValue;
      result.marginBottom = sizeValue;
      result.marginLeft = sizeValue;
      return result;
    }
    
    // Direções específicas para margin
    if (direction === 't' || direction === 'y') {
      result.marginTop = sizeValue;
    }
    if (direction === 'r' || direction === 'x') {
      result.marginRight = sizeValue;
    }
    if (direction === 'b' || direction === 'y') {
      result.marginBottom = sizeValue;
    }
    if (direction === 'l' || direction === 'x') {
      result.marginLeft = sizeValue;
    }
  } else {
    // Paddings
    if (!direction || direction === 'a') {
      result.paddingTop = sizeValue;
      result.paddingRight = sizeValue;
      result.paddingBottom = sizeValue;
      result.paddingLeft = sizeValue;
      return result;
    }
    
    // Direções específicas para padding
    if (direction === 't' || direction === 'y') {
      result.paddingTop = sizeValue;
    }
    if (direction === 'r' || direction === 'x') {
      result.paddingRight = sizeValue;
    }
    if (direction === 'b' || direction === 'y') {
      result.paddingBottom = sizeValue;
    }
    if (direction === 'l' || direction === 'x') {
      result.paddingLeft = sizeValue;
    }
  }
  
  return result;
}

/**
 * Processa classes de texto (text-h1, text-body1, etc)
 */
function processTextClass(className: string) {
  switch (className) {
    case 'text-h1':
      return { fontSize: 48, fontWeight: 'bold', letterSpacing: -0.5 };
    case 'text-h2':
      return { fontSize: 40, fontWeight: 'bold', letterSpacing: -0.4 };
    case 'text-h3':
      return { fontSize: 34, fontWeight: 'bold', letterSpacing: -0.3 };
    case 'text-h4':
      return { fontSize: 28, fontWeight: 'bold', letterSpacing: -0.2 };
    case 'text-h5':
      return { fontSize: 24, fontWeight: 'bold', letterSpacing: -0.1 };
    case 'text-h6':
      return { fontSize: 20, fontWeight: 'bold', letterSpacing: 0 };
    case 'text-subtitle1':
      return { fontSize: 16, fontWeight: 'regular', letterSpacing: 0.15 };
    case 'text-subtitle2':
      return { fontSize: 14, fontWeight: 'medium', letterSpacing: 0.1 };
    case 'text-body1':
      return { fontSize: 16, fontWeight: 'regular', letterSpacing: 0.5 };
    case 'text-body2':
      return { fontSize: 14, fontWeight: 'regular', letterSpacing: 0.25 };
    case 'text-caption':
      return { fontSize: 12, fontWeight: 'regular', letterSpacing: 0.4 };
    case 'text-overline':
      return { fontSize: 10, fontWeight: 'medium', letterSpacing: 1.5, textTransform: 'uppercase' };
    default:
      return null;
  }
}



/**
 * Processa classes de cor (bg-primary, text-red, etc)
 */
export function processColorClass(className: string, type: 'background' | 'text'): Record<string, any> | null {
  // Verificar se é uma classe de cor
  const match = className.match(/^(bg|text)-([a-z-]+)(\-\d+)?$/);
  if (!match) return null;

  const [, prefix, colorName, toneStr] = match;
  const isTextClass = prefix === 'text';
  const tone = toneStr ? parseInt(toneStr.substring(1)) : null;
  
  // Construir o nome completo da cor
  const fullColorName = tone ? `${colorName}-${tone}` : colorName;
  
  // Verificar se a cor existe no mapa de cores
  if (!quasarColors[fullColorName]) {
    // Se for uma variação tonal não reconhecida, tentar a cor base
    if (!quasarColors[colorName]) {
      return null;
    }
    
    // Usar a cor base
    const color = quasarColors[colorName];
    
    if (isTextClass) {
      return { fontColor: color };
    } else {
      return { fills: [{ type: 'SOLID', color }] };
    }
  }
  
  // Usar a cor completa
  const color = quasarColors[fullColorName];
  
  if (isTextClass) {
    return { fontColor: color };
  } else {
    return { fills: [{ type: 'SOLID', color }] };
  }
}
/**
 * Processa classes flexbox (row, column, etc)
 */
function processFlexboxClass(className: string) {
  switch (className) {
    case 'row':
      return { layoutMode: 'HORIZONTAL' };
    case 'column':
      return { layoutMode: 'VERTICAL' };
    case 'items-start':
      return { counterAxisAlignItems: 'MIN' };
    case 'items-center':
      return { counterAxisAlignItems: 'CENTER' };
    case 'items-end':
      return { counterAxisAlignItems: 'MAX' };
    case 'justify-start':
      return { primaryAxisAlignItems: 'MIN' };
    case 'justify-center':
      return { primaryAxisAlignItems: 'CENTER' };
    case 'justify-end':
      return { primaryAxisAlignItems: 'MAX' };
    case 'justify-between':
      return { primaryAxisAlignItems: 'SPACE_BETWEEN' };
    default:
      return null;
  }
}

/**
 * Processa classes de alinhamento de texto
 */
function processTextAlignmentClass(className: string) {
  switch (className) {
    case 'text-left':
      return { textAlignHorizontal: 'LEFT' };
    case 'text-center':
      return { textAlignHorizontal: 'CENTER' };
    case 'text-right':
      return { textAlignHorizontal: 'RIGHT' };
    case 'text-justify':
      return { textAlignHorizontal: 'JUSTIFIED' };
    default:
      return null;
  }
}

/**
 * Converte uma cor CSS para o formato Figma RGB
 */
export function cssColorToFigmaColor(cssColor: string) {
  // Hex
  if (cssColor.startsWith('#')) {
    let hex = cssColor.substring(1);
    
    // Converter #RGB para #RRGGBB
    if (hex.length === 3) {
      hex = hex.split('').map(h => h + h).join('');
    }
    
    // Extrair componentes RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    // Extrair alpha se disponível (#RRGGBBAA)
    let a = 1;
    if (hex.length === 8) {
      a = parseInt(hex.substring(6, 8), 16) / 255;
    }
    
    return a < 1 ? { r, g, b, a } : { r, g, b };
  }
  
  // RGB/RGBA
  if (cssColor.startsWith('rgb')) {
    const values = cssColor.match(/\d+(\.\d+)?/g);
    
    if (values && values.length >= 3) {
      const r = parseInt(values[0]) / 255;
      const g = parseInt(values[1]) / 255;
      const b = parseInt(values[2]) / 255;
      const a = values.length === 4 ? parseFloat(values[3]) : 1;
      
      return a < 1 ? { r, g, b, a } : { r, g, b };
    }
  }
  
  // Cores nomeadas comuns
  const namedColors = {
    'white': { r: 1, g: 1, b: 1 },
    'black': { r: 0, g: 0, b: 0 },
    'red': { r: 1, g: 0, b: 0 },
    'green': { r: 0, g: 0.8, b: 0 },
    'blue': { r: 0, g: 0, b: 1 },
    'yellow': { r: 1, g: 1, b: 0 },
    'purple': { r: 0.5, g: 0, b: 0.5 },
    'orange': { r: 1, g: 0.65, b: 0 },
    'gray': { r: 0.5, g: 0.5, b: 0.5 },
    'transparent': { r: 0, g: 0, b: 0, a: 0 }
  };
  
  return namedColors[cssColor.toLowerCase()];
}