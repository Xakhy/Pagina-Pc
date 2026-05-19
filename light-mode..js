javascript
const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      // Reemplazos de colores para soportar light mode
      content = content.replace(/bg-zinc-950/g, 'bg-zinc-50 dark:bg-zinc-950');
      content = content.replace(/bg-zinc-900/g, 'bg-zinc-100 dark:bg-zinc-900');
      content = content.replace(/border-zinc-800/g, 'border-zinc-300 dark:border-zinc-800');
      content = content.replace(/text-white/g, 'text-zinc-900 dark:text-white');
      content = content.replace(/text-zinc-400/g, 'text-zinc-600 dark:text-zinc-400');
      content = content.replace(/text-zinc-500/g, 'text-zinc-600 dark:text-zinc-500');
      content = content.replace(/bg-\[\#050506\]/g, 'bg-zinc-50 dark:bg-[#050506]');
      content = content.replace(/bg-\[\#0c0c0e\]/g, 'bg-zinc-100 dark:bg-[#0c0c0e]');
      content = content.replace(/bg-\[\#0a0a0c\]/g, 'bg-zinc-200 dark:bg-[#0a0a0c]');
      content = content.replace(/border-white\/5/g, 'border-zinc-300 dark:border-white/5');

      // Evitar duplicaciones accidentales si ya existen (opcional, pero con Regex es más complejo, 
      // confiaremos en que el código original no tenía dark: todavía masivamente)
      // Limpiar dobles dark:dark:
      content = content.replace(/dark:dark:/g, 'dark:');
      content = content.replace(/text-zinc-900 dark:text-zinc-900 dark:text-white/g, 'text-zinc-900 dark:text-white');

      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(path.join(__dirname, 'src', 'app'));
processDir(path.join(__dirname, 'src', 'components'));
console.log('Reemplazos de modo claro completados.');