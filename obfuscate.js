/**
 * 将 index.html 进行加密处理：
 * 1. 第 1 行到第 1505 行（<script> 之前的 HTML）→ Base64 编码，由加载器运行时解码并写入
 * 2. 内联 JavaScript → 混淆后 Base64 编码，由加载器解码并写入
 * - 若存在 index.plain.html，则从该文件读取源码并输出到 index.html
 * - 若不存在，则从 index.html 读取，先备份为 index.plain.html，再输出
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const DIR = __dirname;
const SOURCE_FILE = path.join(DIR, 'index.plain.html');
const TARGET_FILE = path.join(DIR, 'index.html');
const DEFAULT_SOURCE = path.join(DIR, 'index.html');

function base64EncodeUtf8(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

function main() {
  let html;
  if (fs.existsSync(SOURCE_FILE)) {
    html = fs.readFileSync(SOURCE_FILE, 'utf8');
    console.log('从 index.plain.html 读取源码，将输出加密结果到 index.html');
  } else {
    html = fs.readFileSync(DEFAULT_SOURCE, 'utf8');
    fs.writeFileSync(SOURCE_FILE, html, 'utf8');
    console.log('已备份当前 index.html 为 index.plain.html');
    console.log('将对 index.html 进行加密并写回');
  }

  const scriptOpen = '<script>';
  const scriptClose = '</script>';
  const openIdx = html.indexOf(scriptOpen);
  const closeIdx = html.indexOf(scriptClose, openIdx);

  if (openIdx === -1 || closeIdx === -1) {
    console.error('未在 HTML 中找到 <script>...</script> 块');
    process.exit(1);
  }

  // 第 1 行到 <script> 之前：即整段 HTML 头部（含样式、结构等）
  const htmlPart = html.slice(0, openIdx);
  const scriptContent = html.slice(openIdx + scriptOpen.length, closeIdx);

  const obfuscationResult = JavaScriptObfuscator.obfuscate(scriptContent, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.2,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 5,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 1,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 2,
    stringArrayWrappersType: 'variable',
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
  });

  const obfuscatedCode = obfuscationResult.getObfuscatedCode();
  const encodedHTML = base64EncodeUtf8(htmlPart);
  const encodedScript = base64EncodeUtf8(obfuscatedCode);

  const loaderHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><script>
function _d(s){return decodeURIComponent(escape(atob(s)));}
document.open();
document.write(_d("${encodedHTML.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"));
document.write('<script>'+_d("${encodedScript.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")+'<\\/script></body></html>');
document.close();
</script></body></html>`;

  fs.writeFileSync(TARGET_FILE, loaderHtml, 'utf8');
  console.log('已写入加密后的 index.html（含 1–1505 行 HTML 与脚本的编码）');
}

main();
