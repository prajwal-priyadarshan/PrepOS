import { pdfjs } from 'react-pdf';

/**
 * Take pdfjs from react-pdf, never from a direct 'pdfjs-dist' import.
 *
 * react-pdf pins pdfjs-dist to an exact version (5.4.296 today) and re-exports
 * it. Installing pdfjs-dist alongside resolves a different major and yields two
 * copies of pdf.js, which fails as "API version does not match Worker version".
 *
 * The URL below is resolved by Vite at build time; a bare specifier breaks in
 * production builds.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export { pdfjs };
