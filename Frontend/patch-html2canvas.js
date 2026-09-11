import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filesToPatch = [
  path.join(__dirname, 'node_modules', 'html2canvas', 'dist', 'html2canvas.js'),
  path.join(__dirname, 'node_modules', 'html2canvas', 'dist', 'html2canvas.esm.js'),
  path.join(__dirname, 'node_modules', '.vite', 'deps', 'html2canvas.js')
];

// Also check for any other vite cache files
const viteDepsDir = path.join(__dirname, 'node_modules', '.vite', 'deps');
if (fs.existsSync(viteDepsDir)) {
  const viteFiles = fs.readdirSync(viteDepsDir);
  for (const f of viteFiles) {
    if (f.startsWith('html2canvas') && f.endsWith('.js') && !filesToPatch.includes(path.join(viteDepsDir, f))) {
      filesToPatch.push(path.join(viteDepsDir, f));
    }
  }
}

const OKL_HELPERS = `
var _oklabMath = function(L, a, b, alpha) {
  var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  var l = Math.pow(l_, 3), m = Math.pow(m_, 3), s = Math.pow(s_, 3);
  var rLin = 4.0767434036 * l - 3.3077115913 * m + 0.2309699292 * s;
  var gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  var bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  var gamma = function(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055; };
  var R = Math.round(Math.max(0, Math.min(255, gamma(rLin) * 255)));
  var G = Math.round(Math.max(0, Math.min(255, gamma(gLin) * 255)));
  var B = Math.round(Math.max(0, Math.min(255, gamma(bLin) * 255)));
  return pack(R, G, B, alpha !== undefined ? alpha : 1);
};
var oklabFunc = function(_context, args) {
  var tokens = args.filter(nonFunctionArgSeparator);
  if (tokens.length < 3) return 0;
  var L = tokens[0].type === 16 ? tokens[0].number / 100 : tokens[0].number;
  var a = tokens[1].number;
  var b = tokens[2].number;
  var alpha = tokens.length > 3 ? (tokens[3].type === 16 ? tokens[3].number / 100 : tokens[3].number) : 1;
  return _oklabMath(L, a, b, alpha);
};
var oklchFunc = function(_context, args) {
  var tokens = args.filter(nonFunctionArgSeparator);
  if (tokens.length < 3) return 0;
  var L = tokens[0].type === 16 ? tokens[0].number / 100 : tokens[0].number;
  var C = tokens[1].number;
  var H = tokens[2].number;
  var alpha = tokens.length > 3 ? (tokens[3].type === 16 ? tokens[3].number / 100 : tokens[3].number) : 1;
  var hRad = (H * Math.PI) / 180;
  var a = C * Math.cos(hRad);
  var b = C * Math.sin(hRad);
  return _oklabMath(L, a, b, alpha);
};
`;

let patchedCount = 0;

for (const filePath of filesToPatch) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // 1. Replace unsupported color function throw with returning 0 (transparent)
  const throwRegex = /if\s*\(\s*typeof\s+colorFunction\s*===\s*['"]undefined['"]\s*\)\s*\{\s*throw\s+new\s+Error\([^)]+\);\s*\}/g;
  if (throwRegex.test(code)) {
    code = code.replace(throwRegex, 'if (typeof colorFunction === "undefined") { return 0; }');
    changed = true;
  }

  // 2. Add oklch and oklab parsers to SUPPORTED_COLOR_FUNCTIONS if not already present
  if (!code.includes('oklchFunc') && code.includes('SUPPORTED_COLOR_FUNCTIONS')) {
    // Insert helper functions right before SUPPORTED_COLOR_FUNCTIONS
    code = code.replace(/(var\s+SUPPORTED_COLOR_FUNCTIONS\s*=\s*\{)/, OKL_HELPERS + '\n$1\n  oklch: oklchFunc,\n  oklab: oklabFunc,');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, code, 'utf-8');
    console.log(`Successfully patched: ${filePath}`);
    patchedCount++;
  } else {
    console.log(`Already up-to-date: ${filePath}`);
  }
}

console.log(`html2canvas patch complete. Total processed: ${filesToPatch.length}, patched now: ${patchedCount}`);
