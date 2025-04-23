// src/components/basic/button-component.ts
import { QuasarNode, PluginSettings } from '../../types/settings';
import { extractStylesAndProps, getButtonText } from '../../utils/quasar-utils';
import { applyStylesToFigmaNode, createText } from '../../utils/figma-utils';
import { quasarColors } from '../../data/color-map';
import { analyzeComponentColors, applyQuasarColors } from '../../utils/color-utils';
import { processIconComponent } from './icon-component';
import { logDebug, logError } from '../../utils/logger.js';

/**
 * Retorna o tamanho de fonte adequado para um botão baseado no tamanho
 */
function getFontSizeForButtonSize(size?: string): number {
  if (!size) return 14; // tamanho padrão
  
  switch (size) {
    case 'xs': return 12;
    case 'sm': return 13;
    case 'md': return 14;
    case 'lg': return 16;
    case 'xl': return 18;
    default: return 14;
  }
}

/**
 * Processa um componente de botão Quasar (q-btn)
 */
export async function processButtonComponent(node: QuasarNode, settings: PluginSettings): Promise<FrameNode> {
  // Criar frame principal para o q-btn
  const buttonFrame = figma.createFrame();
  buttonFrame.name = "q-btn";
  
  // Configuração básica do botão
  buttonFrame.layoutMode = "HORIZONTAL";
  buttonFrame.primaryAxisSizingMode = "AUTO";
  buttonFrame.counterAxisSizingMode = "AUTO";
  buttonFrame.primaryAxisAlignItems = "CENTER";
  buttonFrame.counterAxisAlignItems = "CENTER";
  buttonFrame.cornerRadius = 4;
  
  // Extrair propriedades e estilos
  const { props, styles } = extractStylesAndProps(node);
  
  // ESTRUTURA HIERÁRQUICA CORRETA - 1. Criar o wrapper
  const wrapperNode = figma.createFrame();
  wrapperNode.name = "q-btn__wrapper";
  wrapperNode.layoutMode = "HORIZONTAL";
  wrapperNode.primaryAxisSizingMode = "AUTO";
  wrapperNode.counterAxisSizingMode = "AUTO";
  wrapperNode.primaryAxisAlignItems = "CENTER";
  wrapperNode.counterAxisAlignItems = "CENTER";
  wrapperNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0 }];
  
  // Ajustar padding com base nas propriedades
  if (props.dense === 'true' || props.dense === '') {
    wrapperNode.paddingLeft = 8;
    wrapperNode.paddingRight = 8;
    wrapperNode.paddingTop = 4;
    wrapperNode.paddingBottom = 4;
  } else if (props.size) {
    // Tamanhos do Quasar: xs, sm, md, lg, xl
    switch(props.size) {
      case 'xs':
        wrapperNode.paddingLeft = 8;
        wrapperNode.paddingRight = 8;
        wrapperNode.paddingTop = 4;
        wrapperNode.paddingBottom = 4;
        break;
      case 'sm':
        wrapperNode.paddingLeft = 10;
        wrapperNode.paddingRight = 10;
        wrapperNode.paddingTop = 6;
        wrapperNode.paddingBottom = 6;
        break;
      // ... outros casos
    }
  } else {
    // Padding padrão
    wrapperNode.paddingLeft = 16;
    wrapperNode.paddingRight = 16;
    wrapperNode.paddingTop = 8;
    wrapperNode.paddingBottom = 8;
  }
  
  // 2. Criar o content
  const contentNode = figma.createFrame();
  contentNode.name = "q-btn__content";
  contentNode.layoutMode = "HORIZONTAL";
  contentNode.primaryAxisSizingMode = "AUTO";
  contentNode.counterAxisSizingMode = "AUTO";
  contentNode.primaryAxisAlignItems = "CENTER";
  contentNode.counterAxisAlignItems = "CENTER";
  contentNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0 }];
  contentNode.itemSpacing = 8;
  
  // 3. Processar ícones e texto
  
  // Verificar ícone à esquerda
  if (props.icon) {
    const iconNode = {
      tagName: 'q-icon',
      attributes: {
        name: props.icon,
        color: props.color,
        size: props.size || 'md'
      },
      childNodes: []
    };
    
    const iconComponent = await processIconComponent(iconNode, settings);
    contentNode.appendChild(iconComponent);
  }
  
  // Verificar texto do botão
  const buttonText = props.label || getButtonText(node);
  if (buttonText) {
    let fontSize = 14; // padrão
    
    // Ajustar tamanho da fonte conforme o tamanho do botão
    if (props.size) {
      switch(props.size) {
        case 'xs': fontSize = 12; break;
        case 'sm': fontSize = 13; break;
        case 'md': fontSize = 14; break;
        case 'lg': fontSize = 16; break;
        case 'xl': fontSize = 18; break;
      }
    }
    
    const textNode = await createText(buttonText, {
      fontWeight: 'medium',
      fontSize: fontSize
    });
    
    if (textNode) {
      contentNode.appendChild(textNode);
    }
  }
  
  // Verificar ícone à direita
  if (props['icon-right']) {
    const iconNode = {
      tagName: 'q-icon',
      attributes: {
        name: props['icon-right'],
        color: props.color,
        size: props.size || 'md'
      },
      childNodes: []
    };
    
    const iconComponent = await processIconComponent(iconNode, settings);
    contentNode.appendChild(iconComponent);
  }
  
  // MONTAR A ESTRUTURA HIERÁRQUICA
  wrapperNode.appendChild(contentNode);  // content dentro do wrapper
  buttonFrame.appendChild(wrapperNode);  // wrapper dentro do button principal
  
  // APLICAR COR E ESTILO do QUASAR
  
  // Determinar cor do botão
  let btnColor = { r: 0.1, g: 0.5, b: 0.9 }; // cor primária padrão
  
  if (props.color && quasarColors[props.color] && settings.preserveQuasarColors) {
    btnColor = quasarColors[props.color];
  }
  
  // Aplicar variante de estilo
  if (props.flat === 'true' || props.flat === '') {
    // Botão flat: fundo transparente, texto colorido
    buttonFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0 }];
    
    // Buscar o nó de texto para aplicar a cor
    const textNode = findTextNodeInHierarchy(contentNode);
    if (textNode) {
      textNode.fills = [{ type: 'SOLID', color: btnColor }];
    }
    
  } else if (props.outline === 'true' || props.outline === '') {
    // Botão outline: borda colorida, fundo transparente
    buttonFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0 }];
    buttonFrame.strokes = [{ type: 'SOLID', color: btnColor }];
    buttonFrame.strokeWeight = 1;
    
    // Buscar o nó de texto para aplicar a cor
    const textNode = findTextNodeInHierarchy(contentNode);
    if (textNode) {
      textNode.fills = [{ type: 'SOLID', color: btnColor }];
    }
    
  } else if (props.unelevated === 'true' || props.unelevated === '') {
    // Botão unelevated: fundo colorido sem sombra
    buttonFrame.fills = [{ type: 'SOLID', color: btnColor }];
    
    // Sem efeito de sombra
    buttonFrame.effects = [];
    
    // Buscar o nó de texto para aplicar cor contrastante
    const textNode = findTextNodeInHierarchy(contentNode);
    if (textNode) {
      const textColor = getContrastingTextColor(btnColor);
      textNode.fills = [{ type: 'SOLID', color: textColor }];
    }
    
  } else {
    // Botão padrão: fundo colorido com sombra
    buttonFrame.fills = [{ type: 'SOLID', color: btnColor }];
    
    // Adicionar efeito de sombra
    buttonFrame.effects = [
      {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.2 },
        offset: { x: 0, y: 2 },
        radius: 4,
        visible: true,
        blendMode: 'NORMAL'
      }
    ];
    
    // Buscar o nó de texto para aplicar cor contrastante
    const textNode = findTextNodeInHierarchy(contentNode);
    if (textNode) {
      const textColor = getContrastingTextColor(btnColor);
      textNode.fills = [{ type: 'SOLID', color: textColor }];
    }
  }
  
  // Aplicar estilo de forma ao botão
  if (props.rounded === 'true' || props.rounded === '') {
    buttonFrame.cornerRadius = 28; // Botão mais arredondado
  } else if (props.round === 'true' || props.round === '') {
    // Verificar se é um botão só com ícone
    const hasIcon = props.icon || props['icon-right'];
    const hasLabel = props.label || (buttonText && buttonText.length > 0);
    
    if (hasIcon && !hasLabel) {
      // Botão circular com ícone
      const iconSize = props.size === 'xs' ? 24 : 
                      props.size === 'sm' ? 32 : 
                      props.size === 'lg' ? 48 : 
                      props.size === 'xl' ? 64 : 40; // tamanho padrão
      
      buttonFrame.resize(iconSize, iconSize);
      buttonFrame.cornerRadius = iconSize / 2;
      
      // Ajustar padding do wrapper para ter o mesmo tamanho
      wrapperNode.paddingLeft = 0;
      wrapperNode.paddingRight = 0;
      wrapperNode.paddingTop = 0;
      wrapperNode.paddingBottom = 0;
    } else {
      // Botão redondo com texto
      buttonFrame.cornerRadius = 999;
    }
  } else if (props.square === 'true' || props.square === '') {
    buttonFrame.cornerRadius = 0; // Botão quadrado
  }
  
  // Aplicar estilo disabled
  if (props.disable === 'true' || props.disable === '') {
    buttonFrame.opacity = 0.7; // Deixa o botão mais transparente
  }
  
  // Aplicar propriedades de carregamento se necessário
  if (props.loading === 'true' || props.loading === '') {
    // Criar um indicador de carregamento
    const loadingIndicator = figma.createFrame();
    loadingIndicator.name = "q-btn__loading";
    loadingIndicator.resize(24, 24);
    loadingIndicator.cornerRadius = 12;
    loadingIndicator.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.3 }];
    
    // Adicionar o indicador ao botão
    contentNode.appendChild(loadingIndicator);
  }
  
  return buttonFrame;
}

// Função auxiliar para encontrar um nó de texto na hierarquia
function findTextNodeInHierarchy(node: SceneNode): TextNode | null {
  if (node.type === 'TEXT') {
    return node as TextNode;
  }
  
  if ('children' in node) {
    for (const child of node.children) {
      const textNode = findTextNodeInHierarchy(child);
      if (textNode) return textNode;
    }
  }
  
  return null;
}