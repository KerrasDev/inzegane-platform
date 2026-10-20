import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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

const NOT_FOUND_PAGE = 'pages/not-found.html';

function isMissingHtmlRequest(req, rootDirectory) {
  if (!['GET', 'HEAD'].includes(req.method) || !req.headers.accept?.includes('text/html')) return false;
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname.startsWith('/@') || pathname.startsWith('/__')) return false;
  const filePath = resolve(rootDirectory, `.${pathname}`);
  if (!filePath.startsWith(rootDirectory)) return true;
  if (existsSync(filePath) && statSync(filePath).isFile()) return false;
  return !(existsSync(resolve(filePath, 'index.html')));
}

// Serves pages/not-found.html with HTTP 404 for unknown HTML routes in
// `vite` (dev) and `vite preview`. Production hosting needs its own rule
// (see netlify.toml).
function notFoundPage() {
  return {
    name: 'inzegane-not-found-page',
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          if (!isMissingHtmlRequest(req, projectRoot)) return next();
          try {
            const html = await server.transformIndexHtml(
              `/${NOT_FOUND_PAGE}`,
              readFileSync(resolve(projectRoot, NOT_FOUND_PAGE), 'utf8'),
              req.originalUrl,
            );
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
          } catch (error) {
            next(error);
          }
        });
      };
    },
    configurePreviewServer(server) {
      const outDir = resolve(projectRoot, server.config.build.outDir);
      return () => {
        server.middlewares.use((req, res, next) => {
          const page = resolve(outDir, NOT_FOUND_PAGE);
          if (!existsSync(page) || !isMissingHtmlRequest(req, outDir)) return next();
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(readFileSync(page));
        });
      };
    },
  };
}

export default defineConfig({
  base: '/',
  appType: 'mpa',
  plugins: [notFoundPage()],
  build: {
    rollupOptions: {
      input: findHtmlInputs(),
    },
  },
});
