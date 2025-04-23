// src/utils/icon-utils.ts
import { logDebug, logError } from './logger.js';
import { materialIconsMap } from '../data/icon-map';

async function checkMaterialIconsAvailability(): Promise<boolean> {
  try {
    // Tenta carregar a fonte
    await figma.loadFontAsync({ family: "Material Icons", style: "Regular" });
    console.log("Material Icons disponível e carregada com sucesso");
    return true;
  } catch (error) {
    console.error("Material Icons não está disponível:", error);
    return false;
  }
}

/**
 * Carrega a fonte Material Icons para uso nos ícones
 * Retorna true se a carga foi bem-sucedida
 */
export async function loadIconFonts(): Promise<boolean> {
  try {
    await figma.loadFontAsync({ family: "Material Icons", style: "Regular" });
    console.log('Fonte Material Icons carregada com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao carregar fonte Material Icons:', error);
    return false;
  }
}

/**
 * Cria um nó de ícone no Figma com base no nome do ícone
 */
export async function createIconNode(
  iconName: string, 
  options: { 
    size?: number | string, 
    color?: RGB | string,
    library?: string
  } = {}
): Promise<SceneNode> {
  // Configurar opções padrão
  const library = options.library || getIconLibrary(iconName);
  const normalizedName = normalizeIconName(iconName);
  
  // Determinar tamanho
  let size = 24; // tamanho padrão
  if (typeof options.size === 'number') {
    size = options.size;
  } else if (typeof options.size === 'string') {
    switch (options.size) {
      case 'xs': size = 16; break;
      case 'sm': size = 20; break;
      case 'md': size = 24; break;
      case 'lg': size = 32; break;
      case 'xl': size = 40; break;
      default:
        // Tentar extrair valor numérico
        const sizeNum = parseInt(options.size);
        if (!isNaN(sizeNum)) {
          size = sizeNum;
        }
    }
  }
  
  try {
    // Tentar criar um nó de texto com o ícone Unicode
    await loadIconFonts();
    
    const textNode = figma.createText();
    textNode.name = `icon-${normalizedName}`;
    textNode.fontSize = size;
    textNode.characters = getIconUnicode(library, normalizedName);
    
    // Aplicar cor
    if (options.color) {
      const color = typeof options.color === 'string' 
        ? getColorFromString(options.color) 
        : options.color;
      
      textNode.fills = [{ type: 'SOLID', color }];
    }
    
    return textNode;
  } catch (error) {
    logError('icons', `Erro ao criar nó de ícone: ${error}`);
    
    // Fallback: criar um frame colorido como placeholder
    const frame = figma.createFrame();
    frame.name = `icon-placeholder-${normalizedName}`;
    frame.resize(size, size);
    frame.cornerRadius = size / 4;
    
    if (options.color) {
      const color = typeof options.color === 'string'
        ? getColorFromString(options.color)
        : options.color;
      
      frame.fills = [{ type: 'SOLID', color }];
    } else {
      frame.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    }
    
    return frame;
  }
}

/**
 * Identifica a biblioteca baseada no prefixo do nome do ícone
 */
export function getIconLibrary(iconName: string): string {
  if (!iconName) return 'material';
  
  if (iconName.startsWith('fa-') || iconName.startsWith('fas ') || 
      iconName.startsWith('far ') || iconName.startsWith('fab ')) {
    return 'fontawesome';
  } else if (iconName.startsWith('ion-')) {
    return 'ionicons';
  } else if (iconName.startsWith('eva-')) {
    return 'eva';
  } else if (iconName.startsWith('ti-')) {
    return 'themify';
  } else if (iconName.startsWith('la-')) {
    return 'lineawesome';
  } else if (iconName.startsWith('mdi-')) {
    return 'mdi';
  } else {
    return 'material'; // Padrão do Quasar
  }
}

/**
 * Remove prefixos para obter o nome normalizado do ícone
 */
export function normalizeIconName(iconName: string): string {
  if (!iconName) return '';
  
  // Remover prefixos conhecidos
  const prefixes = ['fa-', 'fas ', 'far ', 'fab ', 'ion-', 'eva-', 'ti-', 'la-', 'mdi-'];
  
  let normalizedName = iconName;
  for (const prefix of prefixes) {
    if (normalizedName.startsWith(prefix)) {
      normalizedName = normalizedName.substring(prefix.length);
      break;
    }
  }
  
  return normalizedName;
}

/**
 * Mapeia o nome do ícone para o caractere Unicode
 */
export function getIconUnicode(library: string, iconName: string): string {
  // Para Material Design Icons
  if (library === 'material' && materialIconsMap[iconName]) {
    return materialIconsMap[iconName];
  }
  
  // Para outras bibliotecas, adicionar mapeamentos conforme necessário
  
  // Fallback para um ícone genérico
  return '\uE5CC'; // dots_horizontal como fallback
}

/**
 * Converte uma string de cor em formato RGB
 */
function getColorFromString(colorStr: string): RGB {
  // Implementar conversão de cores nomeadas ou cores hexadecimais para RGB
  // Este é um exemplo simplificado
  const defaultColors: Record<string, RGB> = {
    'primary': { r: 0.1, g: 0.5, b: 0.9 },
    'secondary': { r: 0.15, g: 0.65, b: 0.6 },
    'accent': { r: 0.6, g: 0.15, b: 0.7 },
    'positive': { r: 0.1, g: 0.7, b: 0.3 },
    'negative': { r: 0.8, g: 0.1, b: 0.1 },
    'info': { r: 0.2, g: 0.8, b: 0.9 },
    'warning': { r: 0.95, g: 0.75, b: 0.2 },
    'dark': { r: 0.2, g: 0.2, b: 0.2 },
    'black': { r: 0, g: 0, b: 0 },
    'white': { r: 1, g: 1, b: 1 }
  };
  
  return defaultColors[colorStr] || { r: 0, g: 0, b: 0 };
}
