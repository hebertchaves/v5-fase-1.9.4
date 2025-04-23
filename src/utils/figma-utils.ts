// src/utils/figma-utils.ts

import { RGB, RGBA, ExtractedStyles } from '../types/settings';

/**
 * Carrega as fontes necessárias para uso no Figma
 */
export async function loadRequiredFonts() {
  // Lista de fontes usadas pelo plugin
  const requiredFonts = [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Medium" },
    { family: "Inter", style: "Bold" },
    { family: "Material Icons", style: "Regular" },
    { family: "Roboto", style: "Regular" },
    { family: "Roboto", style: "Medium" },
    { family: "Roboto", style: "Bold" }
  ];
  
  // Carregar todas as fontes em paralelo
  const fontLoadPromises = requiredFonts.map(font => 
    figma.loadFontAsync(font)
  );
  
  // Aguardar o carregamento de todas as fontes
  await Promise.all(fontLoadPromises);
}

export async function createText(content: string, options: any = {}): Promise<TextNode | null> {
  try {
    const textNode = figma.createText();
    
    // Garantir que a fonte esteja carregada
    await figma.loadFontAsync({
      family: options.fontFamily || "Roboto", // MODIFICAÇÃO AQUI: usar Roboto como padrão
      style: options.fontStyle || "Regular"
    });
    
    // Definir o texto
    textNode.characters = content || '';
    
    // Definir explicitamente a fonte após carregar
    textNode.fontName = {
      family: options.fontFamily || "Roboto", // MODIFICAÇÃO AQUI: usar Roboto como padrão
      style: options.fontStyle || "Regular"
    };
    
    // Configurações de texto
    if (options.fontSize) textNode.fontSize = options.fontSize;
    if (options.fontWeight) {
      if (options.fontWeight === 'bold') {
        await figma.loadFontAsync({ family: "Roboto", style: "Bold" }); // MODIFICAÇÃO AQUI
        textNode.fontName = { family: "Roboto", style: "Bold" };
      } else if (options.fontWeight === 'medium') {
        await figma.loadFontAsync({ family: "Roboto", style: "Medium" }); // MODIFICAÇÃO AQUI
        textNode.fontName = { family: "Roboto", style: "Medium" };
      }
    }
    
    // Cor do texto
    if (options.color) {
      textNode.fills = [{ type: 'SOLID', color: options.color }];
    }
    
    // Opacidade
    if (options.opacity !== undefined && textNode.fills && Array.isArray(textNode.fills) && textNode.fills.length > 0) {
      const newFills = [];
      for (let i = 0; i < textNode.fills.length; i++) {
        const fill = textNode.fills[i];
        // Criar uma cópia do objeto fill
        const newFill = {...fill};
        // Definir opacidade na cópia
        if (newFill.type === 'SOLID') {
          newFill.opacity = options.opacity;
        }
        newFills.push(newFill);
      }
      // Atribuir os novos fills
      textNode.fills = newFills;
    }
    
    // Alinhamento
    if (options.alignment) {
      textNode.textAlignHorizontal = options.alignment;
    }
    
    if (options.verticalAlignment) {
      textNode.textAlignVertical = options.verticalAlignment;
    }
    
    return textNode;
  } catch (error) {
    console.error('Erro ao criar texto:', error);
    return null;
  }
}
// Função existente que precisa ser exportada
export function setNodeSize(node: SceneNode, width: number, height?: number) {
  if ('resize' in node) {
    node.resize(width, height !== undefined ? height : (node as any).height);
  }
}

/**
 * Aplica estilos a um nó do Figma
 */
export function applyStylesToFigmaNode(node: SceneNode, styles: Record<string, any>) {
  if (!styles || typeof styles !== 'object') return;
  
  try {
    // Processar cada propriedade de estilo
    Object.entries(styles).forEach(([key, value]) => {
      try {
        // Propriedades especiais que precisam de tratamento específico
        if (key === 'fills') {
          if ('fills' in node) {
            node.fills = value;
          }
        } else if (key === 'strokes') {
          if ('strokes' in node) {
            node.strokes = value;
          }
        } else if (key === 'effects') {
          if ('effects' in node) {
            node.effects = value;
          }
        } else if (key === 'fontName') {
          // Não aplicar fontName aqui - deve ser feito após carregar a fonte
        } else if (key === 'fontColor' && 'fills' in node) {
          // Aplicar cor de texto mantendo outros parâmetros de fill
          const fills = [...(node.fills as Paint[])];
          if (fills.length > 0 && fills[0].type === 'SOLID') {
            fills[0].color = value;
            node.fills = fills;
          } else {
            node.fills = [{ type: 'SOLID', color: value }];
          }
        } else if (key === 'textAlign' && 'textAlignHorizontal' in node) {
          // Mapear alinhamento de texto
          const alignMap: Record<string, TextAlignHorizontal> = {
            'left': 'LEFT',
            'center': 'CENTER',
            'right': 'RIGHT',
            'justify': 'JUSTIFIED'
          };
          
          if (alignMap[value]) {
            node.textAlignHorizontal = alignMap[value];
          }
        } else if (key === 'fontWeight' && node.type === 'TEXT') {
          // Será tratado separadamente
          applyFontWeight(node, value);
        } else if (key === 'letterSpacing' && 'letterSpacing' in node) {
          // Aplicar espaçamento entre letras
          const spacing = parseFloat(value);
          if (!isNaN(spacing)) {
            node.letterSpacing = {
              value: spacing,
              unit: 'PIXELS'
            };
          }
        } else if (key === 'lineHeight' && 'lineHeight' in node) {
          // Aplicar altura da linha
          const height = parseFloat(value);
          if (!isNaN(height)) {
            node.lineHeight = {
              value: height,
              unit: 'PIXELS'
            };
          }
        } else if (key === 'textTransform' && 'textCase' in node) {
          // Mapear transformação de texto
          const caseMap: Record<string, TextCase> = {
            'uppercase': 'UPPER',
            'lowercase': 'LOWER',
            'capitalize': 'TITLE'
          };
          
          if (caseMap[value]) {
            node.textCase = caseMap[value];
          }
        } else if (key === 'opacity' && 'opacity' in node) {
          // Aplicar opacidade
          const opacity = parseFloat(value);
          if (!isNaN(opacity)) {
            node.opacity = Math.max(0, Math.min(1, opacity));
          }
        } else if (key === 'cornerRadius' && 'cornerRadius' in node) {
          // Aplicar raio de canto
          const radius = parseFloat(value);
          if (!isNaN(radius)) {
            node.cornerRadius = radius;
          }
        } else if (key.startsWith('padding') && key in node) {
          // Aplicar padding
          const padding = parseFloat(value);
          if (!isNaN(padding)) {
            (node as any)[key] = padding;
          }
        } else if (key.startsWith('margin')) {
          // Não podemos aplicar margin diretamente no Figma
          // Podemos ajustar a posição, mas isso é complexo
        } else if (key === 'width' && 'resize' in node) {
          // Aplicar largura
          const width = parseFloat(value);
          if (!isNaN(width)) {
            node.resize(width, node.height);
          }
        } else if (key === 'height' && 'resize' in node) {
          // Aplicar altura
          const height = parseFloat(value);
          if (!isNaN(height)) {
            node.resize(node.width, height);
          }
        } else if (key in node) {
          // Para todas as outras propriedades, tentar aplicar diretamente
          (node as any)[key] = value;
        }
      } catch (error) {
        console.warn(`Não foi possível aplicar a propriedade ${key} ao nó:`, error);
      }
    });
  } catch (error) {
    console.error('Erro ao aplicar estilos:', error);
  }
}

/**
 * Aplica configuração de peso de fonte a um nó de texto
 */
async function applyFontWeight(node: TextNode, weight: string | number) {
  let fontStyle = 'Regular';
  
  if (weight === 'bold' || weight === 700 || weight === '700') {
    fontStyle = 'Bold';
  } else if (weight === 'medium' || weight === 500 || weight === '500') {
    fontStyle = 'Medium';
  }
  
  try {
    const currentFont = node.fontName || { family: 'Inter', style: 'Regular' };
    await figma.loadFontAsync({ family: currentFont.family, style: fontStyle });
    node.fontName = { family: currentFont.family, style: fontStyle };
  } catch (error) {
    console.warn(`Não foi possível aplicar peso de fonte:`, error);
    
    // Tentar carregar a fonte Inter como fallback
    try {
      await figma.loadFontAsync({ family: 'Inter', style: fontStyle });
      node.fontName = { family: 'Inter', style: fontStyle };
    } catch (fallbackError) {
      console.error('Erro ao carregar fonte fallback:', fallbackError);
    }
  }
}

/**
 * Tenta encontrar uma propriedade equivalente no nó Figma
 */
function findEquivalentProp(node: any, key: string): string | null {
  // Mapeamento de propriedades CSS/JS para propriedades Figma
  const propMappings: Record<string, string> = {
    // Layout
    'display': 'layoutMode',
    'flex-direction': 'layoutMode',
    'align-items': 'counterAxisAlignItems',
    'justify-content': 'primaryAxisAlignItems',
    'flex-wrap': 'layoutWrap',
    
    // Espaçamento
    'padding': 'padding',
    'margin': 'margin',
    
    // Texto
    'font-size': 'fontSize',
    'font-family': 'fontName',
    'text-align': 'textAlignHorizontal',
    'line-height': 'lineHeight',
    'letter-spacing': 'letterSpacing',
    'text-decoration': 'textDecoration',
    
    // Cores
    'color': 'fills',
    'background-color': 'fills',
    'border-color': 'strokes',
    
    // Bordas
    'border-width': 'strokeWeight',
    'border-radius': 'cornerRadius',
    
    // Dimensões
    'width': 'width',
    'height': 'height',
    'min-width': 'minWidth',
    'min-height': 'minHeight',
    'max-width': 'maxWidth',
    'max-height': 'maxHeight'
  };
  
  return propMappings[key] || null;
}

/**
 * Cria um efeito de sombra para nós Figma
 */
export function createShadowEffect(
  offsetX: number, 
  offsetY: number, 
  radius: number, 
  opacity: number, 
  color: RGB = { r: 0, g: 0, b: 0 }
): Effect {
  return {
    type: 'DROP_SHADOW',
    color: { ...color, a: opacity },
    offset: { x: offsetX, y: offsetY },
    radius: radius,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL'
  } as Effect;
}

/**
 * Determina a cor de texto contrastante com base na cor de fundo
 */
export function getContrastingTextColor(bgColor: RGB): RGB {
  // Calcular luminosidade aproximada
  const luminance = 0.299 * bgColor.r + 0.587 * bgColor.g + 0.114 * bgColor.b;
  
  // Se a luminosidade for alta, usar texto escuro, caso contrário usar texto claro
  return luminance > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 1, g: 1, b: 1 };
}

/**
 * Verifica se um Paint é do tipo SolidPaint
 */
export function isSolidPaint(paint: Paint): paint is SolidPaint {
  return paint.type === 'SOLID';
}

/**
 * Converte uma cor CSS para o formato Figma
 */
export function cssColorToFigmaColor(cssColor: string): RGB | RGBA | null {
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
    
    return { r, g, b, a };
  }
  
  // RGB/RGBA
  if (cssColor.startsWith('rgb')) {
    const values = cssColor.match(/\d+(\.\d+)?/g);
    
    if (values && values.length >= 3) {
      const r = parseInt(values[0]) / 255;
      const g = parseInt(values[1]) / 255;
      const b = parseInt(values[2]) / 255;
      const a = values.length === 4 ? parseFloat(values[3]) : 1;
      
      return { r, g, b, a };
    }
  }
  
  // Cores nomeadas comuns
  const namedColors: Record<string, RGB> = {
    'white': { r: 1, g: 1, b: 1 },
    'black': { r: 0, g: 0, b: 0 },
    'red': { r: 1, g: 0, b: 0 },
    'green': { r: 0, g: 0.8, b: 0 },
    'blue': { r: 0, g: 0, b: 1 },
    'yellow': { r: 1, g: 1, b: 0 },
    'gray': { r: 0.5, g: 0.5, b: 0.5 },
    'transparent': { r: 0, g: 0, b: 0 }
  };
  
  if (namedColors[cssColor.toLowerCase()]) {
    return namedColors[cssColor.toLowerCase()];
  }
  
  return null;
}

/**
 * Extrai estilos de uma string CSS inline
 */
export function extractInlineStyles(styleString: string): ExtractedStyles {
  const styles: ExtractedStyles = {};
  
  if (!styleString) return styles;
  
  const declarations = styleString.split(';');
  
  for (const declaration of declarations) {
    if (!declaration.trim()) continue;
    
    const colonPos = declaration.indexOf(':');
    if (colonPos === -1) continue;
    
    const property = declaration.substring(0, colonPos).trim();
    const value = declaration.substring(colonPos + 1).trim();
    
    if (!property || !value) continue;
    
    // Converter para camelCase para compatibilidade com API do Figma
    const camelProperty = property.replace(/-([a-z])/g, (_, g1) => g1.toUpperCase());
    
    // Processar valores específicos
    if (property.includes('color')) {
      const figmaColor = cssColorToFigmaColor(value);
      if (figmaColor) {
        if (property === 'color') {
          styles.fontColor = figmaColor;
        } else if (property === 'background-color') {
          styles.fills = [{ type: 'SOLID', color: figmaColor }];
        }
        continue;
      }
    }
    
    // Processar padding e margin
    if (property.startsWith('padding')) {
      processPaddingProperty(property, value, styles);
      continue;
    }
    
    if (property.startsWith('margin')) {
      processMarginProperty(property, value, styles);
      continue;
    }
    
    // Processar propriedades de texto
    if (property === 'font-size') {
      styles.fontSize = parseFontSize(value);
      continue;
    }
    
    if (property === 'font-weight') {
      styles.fontWeight = value;
      continue;
    }
    
    if (property === 'text-align') {
      styles.textAlignHorizontal = getTextAlignment(value);
      continue;
    }
    
    // Processar bordas
    if (property === 'border-radius') {
      styles.cornerRadius = parseInt(value);
      continue;
    }
    
    // Adicionar outras propriedades diretamente
    styles[camelProperty] = value;
  }
  
  return styles;
}

/**
 * Funções auxiliares para processar propriedades CSS específicas
 */
function processPaddingProperty(property: string, value: string, styles: ExtractedStyles) {
  const pixels = parsePixelValue(value);
  if (pixels === null) return;
  
  if (property === 'padding') {
    // Valor único aplica a todos os lados
    styles.paddingTop = pixels;
    styles.paddingRight = pixels;
    styles.paddingBottom = pixels;
    styles.paddingLeft = pixels;
  } else if (property === 'padding-top') {
    styles.paddingTop = pixels;
  } else if (property === 'padding-right') {
    styles.paddingRight = pixels;
  } else if (property === 'padding-bottom') {
    styles.paddingBottom = pixels;
  } else if (property === 'padding-left') {
    styles.paddingLeft = pixels;
  }
}

function processMarginProperty(property: string, value: string, styles: ExtractedStyles) {
  // Implementação similar ao padding
  // (Omitido por brevidade, já que margin geralmente não tem impacto direto no Figma)
}

/**
 * Cria um retângulo com as dimensões e propriedades especificadas
 */
export function createRectangle(width: number, height: number, options: {
  color?: RGB;
  cornerRadius?: number;
  stroke?: RGB;
  strokeWeight?: number;
} = {}): RectangleNode {
  const rect = figma.createRectangle();
  rect.resize(width, height);
  
  if (options.color) {
    rect.fills = [{ type: 'SOLID', color: options.color }];
  }
  
  if (options.cornerRadius !== undefined) {
    rect.cornerRadius = options.cornerRadius;
  }
  
  if (options.stroke) {
    rect.strokes = [{ type: 'SOLID', color: options.stroke }];
    rect.strokeWeight = options.strokeWeight || 1;
  }
  
  return rect;
}

function parsePixelValue(value: string): number | null {
  const match = value.match(/^(\d+)(px|rem|em)?$/);
  if (!match) return null;
  
  const numValue = parseInt(match[1]);
  const unit = match[2] || 'px';
  
  if (unit === 'px') {
    return numValue;
  } else if (unit === 'rem' || unit === 'em') {
    // Considerando 1rem/em = 16px (aproximação)
    return numValue * 16;
  }
  
  return numValue;
}

function parseFontSize(value: string): number {
  // Extrair valor numérico de qualquer unidade
  const pixels = parsePixelValue(value);
  if (pixels !== null) return pixels;
  
  // Valores nomeados comuns
  const fontSizes: Record<string, number> = {
    'small': 12,
    'medium': 14,
    'large': 16,
    'x-large': 20,
    'xx-large': 24
  };
  
  return fontSizes[value] || 14; // 14px como padrão
}

function getTextAlignment(value: string): 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED' {
  switch (value) {
    case 'left': return 'LEFT';
    case 'center': return 'CENTER';
    case 'right': return 'RIGHT';
    case 'justify': return 'JUSTIFIED';
    default: return 'LEFT';
  }
}