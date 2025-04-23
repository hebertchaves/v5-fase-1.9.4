// src/utils/variant-utils.ts
import { QuasarNode, PluginSettings } from '../types/settings';
import { analyzeComponentColors } from './color-utils';

/**
 * Cria variantes de um componente com base em diferentes estados
 */
export async function createComponentVariants(
  componentNode: SceneNode,
  quasarNode: QuasarNode,
  settings: PluginSettings
): Promise<SceneNode[]> {
  // Se a criação de variantes não está habilitada, retornar apenas o componente original
  if (!settings.createComponentVariants) {
    return [componentNode];
  }
  
  // Verificar o tipo de componente para determinar quais variantes criar
  const componentType = quasarNode.tagName.toLowerCase();
  const variants: SceneNode[] = [componentNode]; // Adicionar o componente original como primeira variante
  
  // Criar variantes apenas para componentes interativos
  if (['q-btn', 'q-checkbox', 'q-radio', 'q-toggle', 'q-input', 'q-select'].includes(componentType)) {
    // Criar variante hover
    const hoverVariant = await createHoverVariant(componentNode, quasarNode);
    if (hoverVariant) {
      variants.push(hoverVariant);
    }
    
    // Criar variante active/pressed
    const activeVariant = await createActiveVariant(componentNode, quasarNode);
    if (activeVariant) {
      variants.push(activeVariant);
    }
    
    // Criar variante disabled
    const disabledVariant = await createDisabledVariant(componentNode, quasarNode);
    if (disabledVariant) {
      variants.push(disabledVariant);
    }
  }
  
  return variants;
}

/**
 * Cria uma variante hover de um componente
 */
async function createHoverVariant(componentNode: SceneNode, quasarNode: QuasarNode): Promise<SceneNode | null> {
  // Somente tipos específicos são suportados
  if (!['q-btn', 'q-checkbox', 'q-radio', 'q-toggle'].includes(quasarNode.tagName.toLowerCase())) {
    return null;
  }
  
  // Clonar o nó
  const hoverVariant = componentNode.clone();
  hoverVariant.name = `${componentNode.name} (hover)`;
  
  // Ajustes específicos com base no tipo de componente
  if (quasarNode.tagName.toLowerCase() === 'q-btn') {
    // Análise de cor do componente
    const colorAnalysis = analyzeComponentColors(quasarNode);
    
    // Verificar variante de cor
    if (colorAnalysis.colorVariant === 'flat' || colorAnalysis.colorVariant === 'outline') {
      // Para flat e outline, adicionar fundo com opacidade no hover
      if (hoverVariant.fills && Array.isArray(hoverVariant.fills) && hoverVariant.fills.length > 0) {
        if (colorAnalysis.mainColor) {
          const mainColor = getQuasarColor(colorAnalysis.mainColor);
          if (mainColor) {
            hoverVariant.fills = [{ type: 'SOLID', color: mainColor, opacity: 0.1 }];
          }
        }
      }
    } else {
      // Para outros tipos, escurecer levemente a cor
      if (hoverVariant.fills && Array.isArray(hoverVariant.fills) && hoverVariant.fills.length > 0) {
        const fill = hoverVariant.fills[0];
        if (fill.type === 'SOLID') {
          fill.color = darkenColor(fill.color, 0.1);
          hoverVariant.fills = [fill];
        }
      }
    }
  }
  
  return hoverVariant;
}

/**
 * Cria uma variante active/pressed de um componente
 */
async function createActiveVariant(componentNode: SceneNode, quasarNode: QuasarNode): Promise<SceneNode | null> {
  // Somente tipos específicos são suportados
  if (!['q-btn', 'q-checkbox', 'q-radio', 'q-toggle'].includes(quasarNode.tagName.toLowerCase())) {
    return null;
  }
  
  // Clonar o nó
  const activeVariant = componentNode.clone();
  activeVariant.name = `${componentNode.name} (active)`;
  
  // Ajustes específicos com base no tipo de componente
  if (quasarNode.tagName.toLowerCase() === 'q-btn') {
    // Análise de cor do componente
    const colorAnalysis = analyzeComponentColors(quasarNode);
    
    // Verificar variante de cor
    if (colorAnalysis.colorVariant === 'flat' || colorAnalysis.colorVariant === 'outline') {
      // Para flat e outline, adicionar fundo com opacidade maior no active
      if (activeVariant.fills && Array.isArray(activeVariant.fills) && activeVariant.fills.length > 0) {
        if (colorAnalysis.mainColor) {
          const mainColor = getQuasarColor(colorAnalysis.mainColor);
          if (mainColor) {
            activeVariant.fills = [{ type: 'SOLID', color: mainColor, opacity: 0.2 }];
          }
        }
      }
    } else {
      // Para outros tipos, escurecer mais a cor
      if (activeVariant.fills && Array.isArray(activeVariant.fills) && activeVariant.fills.length > 0) {
        const fill = activeVariant.fills[0];
        if (fill.type === 'SOLID') {
          fill.color = darkenColor(fill.color, 0.2);
          activeVariant.fills = [fill];
        }
      }
    }
    
    // Ajustar sombra para parecer "pressionado"
    if ('effects' in activeVariant && activeVariant.effects && Array.isArray(activeVariant.effects)) {
      const newEffects = [];
      for (const effect of activeVariant.effects) {
        if (effect.type === 'DROP_SHADOW') {
          // Reduzir o deslocamento e raio da sombra
          const newEffect = {
            ...effect,
            offset: { x: 0, y: 1 },
            radius: Math.max(1, effect.radius / 2)
          };
          newEffects.push(newEffect);
        } else {
          newEffects.push(effect);
        }
      }
      activeVariant.effects = newEffects;
    }
  }
  
  return activeVariant;
}

/**
 * Cria uma variante disabled de um componente
 */
async function createDisabledVariant(componentNode: SceneNode, quasarNode: QuasarNode): Promise<SceneNode | null> {
  // Clonar o nó
  const disabledVariant = componentNode.clone();
  disabledVariant.name = `${componentNode.name} (disabled)`;
  
  // Aplicar opacidade reduzida
  disabledVariant.opacity = 0.6;
  
  // Para componentes com caixa de seleção (checkbox, radio, toggle), desmarcar
  if (['q-checkbox', 'q-radio', 'q-toggle'].includes(quasarNode.tagName.toLowerCase())) {
    // Buscando o indicador de seleção dentro do componente
    if ('findAll' in disabledVariant) {
      const innerNodes = disabledVariant.findAll(node => {
        return node.name.includes('__inner') || node.name.includes('__check') ||
               node.name.includes('__dot') || node.name.includes('__thumb');
      });
      
      // Modificar para aparência "desmarcada"
      for (const node of innerNodes) {
        if ('fills' in node && node.fills && Array.isArray(node.fills)) {
          node.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
        }
      }
    }
  }
  
  return disabledVariant;
}

/**
 * Escurece uma cor por um fator específico
 */
function darkenColor(color: RGB, factor: number): RGB {
  return {
    r: Math.max(0, color.r - factor),
    g: Math.max(0, color.g - factor),
    b: Math.max(0, color.b - factor)
  };
}

/**
 * Obtém a cor RGB do Quasar a partir do nome da cor
 */
function getQuasarColor(colorName: string): RGB | null {
  // Importar de color-utils para evitar duplicação
  return require('./color-utils').getQuasarColor(colorName);
}
