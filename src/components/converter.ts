import { parseQuasarTemplate, extractTemplateContent } from '../parser/template';
import { loadRequiredFonts } from '../utils/figma-utils';
import { PluginSettings, QuasarNode } from '../types/settings';
import { detectComponentType } from '../utils/quasar-utils';
import { componentService } from '../utils/component-service';
import { analyzeComponentColors, colorAnalysisToFigmaProps, applyQuasarColors } from '../utils/color-utils';
import { logInfo, logError, logDebug } from '../utils/logger';

/**
 * Função principal de conversão, agora com processamento avançado de cores
 */
export async function convertQuasarToFigma(code: string, settings: PluginSettings) {
  // Carregar fontes antes de iniciar a conversão
  await loadRequiredFonts();
  
  try {
    logInfo('converter', 'Iniciando conversão de código para Figma');
    
    // Extrair o template
    const templateContent = extractTemplateContent(code);
    logDebug('converter', 'Template extraído com sucesso');
    
    // Parse do template para árvore de nós
    const rootNode = parseQuasarTemplate(templateContent);
    if (!rootNode) {
      throw new Error('Falha ao analisar o template HTML');
    }
    logDebug('converter', `Árvore de nós criada com sucesso, nó raiz: ${rootNode.tagName}`);
    
    // Criar o nó raiz do Figma
    const mainFrame = figma.createFrame();
    mainFrame.name = "Componente Quasar";
    mainFrame.layoutMode = "VERTICAL";
    mainFrame.primaryAxisSizingMode = "AUTO";
    mainFrame.counterAxisSizingMode = "AUTO";
    mainFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    mainFrame.paddingLeft = 20;
    mainFrame.paddingRight = 20;
    mainFrame.paddingTop = 20;
    mainFrame.paddingBottom = 20;
    mainFrame.itemSpacing = 16;
    
    // Processar a árvore de componentes recursivamente
    await processNodeTree(rootNode, mainFrame, settings);
    
    logInfo('converter', 'Componente processado com sucesso');
    return mainFrame;
  } catch (error) {
    logError('converter', 'Erro ao processar componente', error);
    throw error;
  }
}

/**
 * Processa a árvore de nós com suporte completo a cores
 */
async function processNodeTree(node: QuasarNode, parentFigmaNode: FrameNode, settings: PluginSettings): Promise<void> {
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