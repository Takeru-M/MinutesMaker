#!/usr/bin/env node

/**
 * Copy PDF.js worker from node_modules to public directory
 * This script is run during dev/build to ensure the worker is available
 */

const fs = require("fs");
const path = require("path");

const possiblePaths = [
  path.join(__dirname, "../node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
  path.join(__dirname, "../node_modules/pdfjs-dist/build/pdf.worker.mjs"),
  path.join(__dirname, "../node_modules/pdfjs-dist/build/pdf.worker.min.js"),
  path.join(__dirname, "../node_modules/pdfjs-dist/build/pdf.worker.js"),
  path.join(__dirname, "../node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
  path.join(__dirname, "../node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.mjs"),
  path.join(__dirname, "../node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.js"),
  path.join(__dirname, "../node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.js"),
];

const destDir = path.join(__dirname, "../public");
const destWorkerMjs = path.join(destDir, "pdf.worker.min.mjs");
const destWorkerJs = path.join(destDir, "pdf.worker.min.js");

let sourceWorker = null;
for (const possiblePath of possiblePaths) {
  if (fs.existsSync(possiblePath)) {
    sourceWorker = possiblePath;
    break;
  }
}

try {
  if (!sourceWorker) {
    console.error("✗ PDF.js worker file not found in any expected location");
    console.error("   Checked paths:", possiblePaths);
    process.exit(1);
  }

  // Create public directory if it doesn't exist
  fs.mkdirSync(destDir, { recursive: true });

  // Copy worker file (primary: .mjs)
  fs.copyFileSync(sourceWorker, destWorkerMjs);

  // Backward compatibility: also provide .js alias
  fs.copyFileSync(sourceWorker, destWorkerJs);

  console.log("✓ PDF.js worker copied to public/pdf.worker.min.mjs (and .js alias)");
  console.log("  Source:", sourceWorker);
} catch (error) {
  console.error("✗ Failed to copy PDF.js worker:", error.message);
  process.exit(1);
}
