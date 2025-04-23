import { parseQuasarTemplate, extractTemplateContent } from '../parser/template';
import { loadRequiredFonts } from '../utils/figma-utils';
import { PluginSettings, QuasarNode } from '../types/settings';
import { detectComponentType } from '../utils/quasar-utils';
import { componentService } from '../utils/component-service';
import { analyzeComponentColors, colorAnalysisToFigmaProps, applyQuasarColors } from '../utils/color-utils';
import { logInfo, logError, logDebug } from '../utils/logger';
import { createComponentVariants } from '../utils/variant-utils';

/**
 * Função principal de conversão, agora com processamento avançado de cores
 */
export async function convertQuasarToFigma(code: string, settings: PluginSettings) {
  // Carregar fontes antes de iniciar a conversão
  await loadRequiredFonts();
  
  try {
    // Extrair o template e criar a árvore de nós
    const templateContent = extractTemplateContent(code);
    const rootNode = parseQuasarTemplate(templateContent);
    
    // Criar o nó raiz do Figma
    const mainFrame = figma.createFrame();
    mainFrame.name = "Componente Quasar";
    // Configurações do frame...
    
    // Processar a árvore de componentes
    await processNodeTree(rootNode, mainFrame, settings);
    
    // NOVO: Gerar variantes para componentes interativos se habilitado
    if (settings.createComponentVariants) {
      // Buscar componentes interativos no frame principal
      const interactiveComponents = mainFrame.findAll(node => {
        const nodeName = node.name.toLowerCase();
        return nodeName.startsWith('q-btn') || 
               nodeName.startsWith('q-checkbox') || 
               nodeName.startsWith('q-radio') || 
               nodeName.startsWith('q-toggle') ||
               nodeName.startsWith('q-input') ||
               nodeName.startsWith('q-select');
      });
      
      // Criar variantes para cada componente interativo
      for (const component of interactiveComponents) {
        // Encontrar o nó Quasar correspondente (será necessário manter um mapeamento)
        const quasarNode = findQuasarNodeForFigmaNode(component, rootNode);
        if (quasarNode) {
          const variants = await createComponentVariants(component, quasarNode, settings);
          
          // Se foram criadas variantes (além da original), adicionar ao frame
          if (variants.length > 1) {
            // Remover a primeira variante que é o componente original
            variants.shift();
            
            // Adicionar as novas variantes ao frame principal
            for (const variant of variants) {
              mainFrame.appendChild(variant);
            }
          }
        }
      }
    }
    
    return mainFrame;
  } catch (error) {
    // Tratamento de erro...
  }
}
// Função auxiliar para encontrar o nó Quasar correspondente a um nó Figma
// Será necessário manter um mapeamento durante a conversão
function findQuasarNodeForFigmaNode(figmaNode: SceneNode, rootQuasarNode: QuasarNode): QuasarNode | null {
  // Implementação dependerá de como você estruturar o mapeamento
  // Uma abordagem é usar dados de plugin para armazenar referências
  const nodeId = figmaNode.id;
  const quasarNodeInfo = figmaNode.getPluginData('quasarNodeInfo');
  
  if (quasarNodeInfo) {
    try {
      const info = JSON.parse(quasarNodeInfo);
      // Usar info para reconstruir ou localizar o nó Quasar
      // Esta é uma implementação simplificada
      return findQuasarNodeByPath(rootQuasarNode, info.path);
    } catch (e) {
      console.error('Erro ao encontrar nó Quasar:', e);
    }
  }
  
  return null;
}

// Função para encontrar um nó Quasar por caminho na árvore
function findQuasarNodeByPath(rootNode: QuasarNode, path: number[]): QuasarNode | null {
  let currentNode = rootNode;
  
  for (const index of path) {
    if (!currentNode.childNodes || index >= currentNode.childNodes.length) {
      return null;
    }
    currentNode = currentNode.childNodes[index];
  }
  
  return currentNode;
}
/**
 * Processa a árvore de nós com suporte completo a cores
 */
async function processNodeTree(node: QuasarNode, parentFigmaNode: FrameNode, settings: PluginSettings): Promise<void> {
    // Verificar se é um componente Quasar
    const isQuasarComponent = node.tagName.toLowerCase().startsWith('q-');
    let figmaNode: FrameNode;
    
    if (isQuasarComponent) {
      // Componente Quasar - usar processador específico
      const componentType = detectComponentType(node);
      
      try {
        // Adicionar: Analisar configurações de cor antes de processar
        const colorAnalysis = analyzeComponentColors(node);
        
        // Tentar usar processador específico
        figmaNode = await componentService.processComponentByCategory(
          node,
          componentType.category,
          componentType.type,
          settings
        );
        
        // Se o processador não aplicou cores automaticamente, aplicar aqui
        const figmaProps = colorAnalysisToFigmaProps(colorAnalysis);
        
        if (figmaProps.fills) {
          figmaNode.fills = figmaProps.fills;
        }
        
        if (figmaProps.strokes) {
          figmaNode.strokes = figmaProps.strokes;
          figmaNode.strokeWeight = 1;
        }
        
        if (figmaProps.textColor && figmaNode.type === 'TEXT') {
          figmaNode.fills = [{ type: 'SOLID', color: figmaProps.textColor }];
        } else if (figmaProps.textColor && 'children' in figmaNode) {
          // Tenta aplicar a cor ao primeiro nó de texto encontrado
          applyTextColorToChildren(figmaNode.children, figmaProps.textColor);
        }
        
      } catch (error) {
        console.error(`Erro ao processar componente Quasar: ${node.tagName}`, error);
        // Fallback para processador genérico
        figmaNode = await processGenericComponent(node, settings);
      }
    } else {
      // Elemento HTML comum
      figmaNode = await processGenericComponent(node, settings);
    }
  
    // Criar nó Figma...
  let figmaNode: FrameNode;

  // NOVO: Armazenar referência ao nó Quasar no nó Figma
  if ('setPluginData' in figmaNode) {
    figmaNode.setPluginData('quasarNodeInfo', JSON.stringify({
      tagName: node.tagName,
      path: path,
      attributes: node.attributes || {}
    }));
  }
  
  // Adicionar ao nó pai
  parentFigmaNode.appendChild(figmaNode);
  
  // Processar filhos recursivamente com caminhos atualizados
  if (!isQuasarComponent && node.childNodes && node.childNodes.length > 0) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const childPath = [...path, i];
      await processNodeTree(node.childNodes[i], figmaNode, settings, childPath);
    }
  }
}
  // Ignorar nós de texto vazios
  if (node.tagName === '#text' && (!node.text || !node.text.trim())) {
    return;
  }
  
  // Processar nós de texto
  if (node.tagName === '#text' && node.text) {
    const textNode = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    textNode.characters = node.text.trim();
    parentFigmaNode.appendChild(textNode);
    return;
  }
  
  // Log para debug
  logDebug('processNode', `Processando nó: ${node.tagName}`);
  
  // Verificar se é um componente Quasar
  const isQuasarComponent = node.tagName.toLowerCase().startsWith('q-');
  let figmaNode: FrameNode;
  
  if (isQuasarComponent) {
    // Componente Quasar - usar processador específico
    const componentType = detectComponentType(node);
    logInfo('processNode', `Componente Quasar detectado: ${componentType.category}/${componentType.type}`);
    
    try {
      // Analisar configurações de cor antes de processar
      const colorAnalysis = analyzeComponentColors(node);
      logDebug('processNode', `Análise de cor: ${JSON.stringify(colorAnalysis)}`);
      
      // Tentar usar processador específico
      figmaNode = await componentService.processComponentByCategory(
        node,
        componentType.category,
        componentType.type,
        settings
      );
      
      // Se o componente não aplicou cores automaticamente, aplicá-las manualmente
      if (figmaNode && !figmaNode.getPluginData('colors_applied')) {
        applyQuasarColors(figmaNode, colorAnalysis, componentType.type);
        figmaNode.setPluginData('colors_applied', 'true');
      }
      
    } catch (error) {
      logError('processNode', `Erro ao processar componente Quasar: ${node.tagName}`, error);
      // Fallback para processador genérico
      figmaNode = await processGenericComponent(node, settings);
      
      // Aplicar cores ao componente genérico
      const colorAnalysis = analyzeComponentColors(node);
      applyQuasarColors(figmaNode, colorAnalysis, 'generic');
    }
  } else {
    // Elemento HTML comum - container genérico
    figmaNode = await processGenericComponent(node, settings);
    
    // Aplicar cores a elementos HTML comuns
    if (node.attributes && node.attributes.style) {
      // Extrair cores de estilos inline
      // (implementação existente)
    }
  }
  
  // Adicionar ao nó pai
  parentFigmaNode.appendChild(figmaNode);
  
  // Processar filhos recursivamente
  // NOTA: Apenas processa filhos para contêineres genéricos, 
  // componentes Quasar específicos devem processar seus próprios filhos
  if (!isQuasarComponent && node.childNodes && node.childNodes.length > 0) {
    for (const child of node.childNodes) {
      await processNodeTree(child, figmaNode, settings);
    }
  },

// Função auxiliar para aplicar cor de texto a filhos
function applyTextColorToChildren(nodes: ReadonlyArray<SceneNode>, color: RGB): void {
  for (const node of nodes) {
    if (node.type === 'TEXT') {
      node.fills = [{ type: 'SOLID', color }];
    } else if ('children' in node) {
      applyTextColorToChildren(node.children, color);
    }
  }
}

/**
 * Processa componente genérico com suporte a cores
 */
export async function processGenericComponent(node: QuasarNode, settings: PluginSettings): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = node.tagName || "generic-component";
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0 }];
  
  // Analisar configurações de cor
  if (node.attributes) {
    const colorAnalysis = analyzeComponentColors(node);
    const figmaColorProps = colorAnalysisToFigmaProps(colorAnalysis);
    
    // Aplicar cores
    if (figmaColorProps.fills) {
      frame.fills = figmaColorProps.fills;
    }
    
    if (figmaColorProps.strokes) {
      frame.strokes = figmaColorProps.strokes;
      frame.strokeWeight = 1;
    }
    
    // Processar atributos comuns como classe
    if (node.attributes.class) {
      frame.name = `${node.tagName} (${node.attributes.class})`;
    }
  }
  
  // Se for um elemento HTML comum (div, span, etc.)
  if (node.tagName && !node.tagName.startsWith('q-')) {
    return frame;
  }
  
  // Caso seja um componente Quasar sem processador específico
  frame.cornerRadius = 4;
  
  // Adicionar texto que indica o tipo de componente
  const headerText = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  headerText.characters = `Componente ${node.tagName}`;
  headerText.fontSize = 16;
  headerText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  
  frame.appendChild(headerText);
  
  // Processar atributos relevantes
  if (node.attributes && Object.keys(node.attributes).length > 0) {
    const attrsText = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    
    const attrStr = Object.entries(node.attributes)
      .filter(([key, _]) => key !== 'style' && key !== 'class' && !key.startsWith('v-'))
      .map(([key, value]) => `${key}="${value}"`)
      .join('\n');
    
    attrsText.characters = attrStr || "Sem atributos";
    attrsText.fontSize = 12;
    attrsText.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
    
    frame.appendChild(attrsText);
  }
  
  return frame;
}