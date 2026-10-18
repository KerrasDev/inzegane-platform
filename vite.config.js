import { readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

function findHtmlInputs(directory = projectRoot) {
  const inputs = {};

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || ['dist', 'node_modules', 'public'].includes(entry.name)) {
        continue;
      }

      Object.assign(inputs, findHtmlInputs(resolve(directory, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const filePath = resolve(directory, entry.name);
      const name = relative(projectRoot, filePath).replace(/\.html$/, '');
      inputs[name] = filePath;
    }
  }

  return inputs;
}

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: findHtmlInputs(),
    },
  },
});
