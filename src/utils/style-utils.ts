// src/utils/style-utils.ts - Substituir o conteúdo existente

import { quasarColors } from '../data/color-map';
// Atualização da função processQuasarClass em src/utils/style-utils.ts

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
       'justify-start', 'justify-center', 'justify-end', 'justify-between',
       'content-start', 'content-center', 'content-end', 'content-stretch',
       'self-start', 'self-center', 'self-end', 'self-stretch'].includes(className)) {
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
  
  // Classes de dimensão
  if (className.match(/^(fit|full-height|full-width|non-selectable)$/)) {
    return processDimensionClass(className);
  }
  
  // Classes de borda
  if (className.match(/^(rounded-borders|no-border-radius|no-box-shadow|no-outline)$/)) {
    return processBorderClass(className);
  }
  
  // Classes de posição
  if (className.match(/^(fixed|absolute|relative|sticky)(-top|-right|-bottom|-left)?$/)) {
    return processPositionClass(className);
  }
  
  // Não conseguiu processar a classe
  return null;
}