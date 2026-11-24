import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'bin', 'mvx.js');
const HOST = '127.0.0.1';
const PORT = Number(process.env.MVX_UI_PORT || 4173);
const MAX_UPLOAD = 100_000_000;
const MAX_OUTPUT = 32_000_000;

const PAGE = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MVX Audit - Local</title>
<style nonce="__NONCE__">
:root{color-scheme:dark;--bg:#0d141b;--panel:#151f29;--line:#283744;--text:#ecf3f8;--muted:#98aab8;--blue:#69a9ff;--teal:#69e0c1;--red:#ff747b;--amber:#ffd071}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 80% 0,#182a3a 0,transparent 42%),var(--bg);color:var(--text);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1000px;margin:0 auto;padding:28px 22px 70px}.top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding:16px 24px;color:var(--muted);font-size:13px;letter-spacing:.08em}.brand{font-weight:800;color:var(--text);font-size:16px}.local{color:var(--teal)}h1{font-size:clamp(32px,6vw,54px);line-height:1.06;margin:12px 0}h1 span{color:var(--blue)}h2{font-size:22px;margin:2px 0 14px}h3{margin:0;font-size:17px}.intro{padding:42px 0 26px}.eyebrow{font-size:11px;letter-spacing:.16em;color:var(--teal);font-weight:700}.muted{color:var(--muted)}.panel,.card{background:linear-gradient(145deg,#17232e,#121b24);border:1px solid var(--line);border-radius:16px;padding:22px;margin:16px 0;box-shadow:0 14px 36px #0003}.drop{border:1px dashed #52728c;background:#101a23;border-radius:13px;text-align:center;padding:34px 14px;cursor:pointer;transition:.2s}.drop.over{border-color:var(--teal);background:#14282c}.drop strong{display:block;font-size:18px}.drop small{color:var(--muted)}button,.button{border:1px solid #36536a;border-radius:9px;background:#1d3243;color:var(--text);padding:11px 15px;font:inherit;cursor:pointer}button:hover{border-color:var(--blue)}button:disabled{opacity:.45;cursor:not-allowed}.primary{background:var(--blue);border-color:var(--blue);color:#091522;font-weight:800;width:100%;margin-top:14px}.row{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}.file{margin-top:14px;padding:12px;background:#0e1820;border:1px solid var(--line);border-radius:9px;overflow-wrap:anywhere}.ack{display:flex;gap:10px;align-items:flex-start;margin-top:18px;color:var(--muted);font-size:13px}.ack input{margin-top:4px}.status{padding:12px;margin-top:14px;border-radius:9px;background:#111d26;color:var(--muted)}.status.error{color:#ff9ca0;border:1px solid #7e3b42}.status.busy{color:var(--blue)}.results{margin-top:38px}.score{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}.rating{font-size:13px;font-weight:800;letter-spacing:.1em;padding:7px 10px;border-radius:7px;background:#263442}.rating.critical,.sev.critical{color:var(--red)}.rating.high,.sev.high{color:#ff9d73}.rating.medium,.sev.medium{color:var(--amber)}.rating.low,.sev.low{color:var(--teal)}.rating.clean,.sev.info{color:var(--teal)}.big{font-size:34px;font-weight:800}.stats,.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.stat,.meta-item{padding:13px;border:1px solid var(--line);border-radius:10px;background:#101922}.stat b,.meta-item b{display:block;font-size:19px}.stat span,.meta-item span{color:var(--muted);font-size:12px}.hash{font:12px/1.5 ui-monospace,monospace;overflow-wrap:anywhere}.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.chip{font:12px ui-monospace,monospace;background:#20303b;color:#c9dce8;border-radius:6px;padding:5px 8px;overflow-wrap:anywhere}.finding{border:1px solid var(--line);border-radius:12px;margin:10px 0;background:#131d26;overflow:hidden}.finding summary{cursor:pointer;list-style:none;padding:15px}.finding summary::-webkit-details-marker{display:none}.finding-body{padding:0 15px 16px}.sev{font-weight:800;font-size:11px;letter-spacing:.08em}.finding p{color:#c3d0d9}.evidence{border-left:2px solid #466278;padding:8px 12px;margin:8px 0;color:var(--muted);font-size:13px;overflow-wrap:anywhere}.snippet{white-space:pre-wrap;overflow-wrap:anywhere;background:#0c141b;padding:10px;border-radius:7px;font:12px/1.5 ui-monospace,monospace;color:#b5c8d5}.disclaimer{border-top:1px solid var(--line);padding-top:16px;color:var(--muted);font-size:12px;margin-top:25px}.hidden{display:none!important}.toolbar{display:flex;gap:8px;flex-wrap:wrap}
@media(max-width:600px){main{padding:18px 14px 48px}.panel,.card{padding:16px}.intro{padding-top:30px}}
@page {
  size: A4;
  margin: 14mm;
}

@media print {
  body {
    background: #fff !important;
    color: #111 !important;
    font: 10pt/1.45 Arial, sans-serif;
  }

  .top, .intro, .panel, .toolbar {
    display: none !important;
  }

  main {
    max-width: none;
    padding: 0;
  }

  #results {
    display: block !important;
    margin: 0;
  }

  #results::before {
    content: "MVX Audit - Báo cáo phân tích tĩnh";
    display: block;
    color: #14243a;
    font-size: 20pt;
    font-weight: bold;
    margin-bottom: 14pt;
  }

  .card, .meta-item, .stat, .finding {
    background: #fff !important;
    color: #111 !important;
    border-color: #aaa !important;
    box-shadow: none !important;
  }

  .meta-item span, .stat span, .finding p, .disclaimer {
    color: #333 !important;
  }

  .finding, .meta-item {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .finding summary {
    color: #111 !important;
  }

  .snippet {
    background: #f3f3f3 !important;
    color: #111 !important;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
}
</style>
</head>
<body>
<div class="top"><div class="brand">MVX AUDIT</div><div class="local">● LOCAL · KHÔNG CLOUD</div></div>
<main>
<section class="intro"><div class="eyebrow">CHROME EXTENSION SECURITY REVIEW</div><h1>Phân tích mẫu<br><span>trước khi tin dùng.</span></h1><div class="muted">Tải CRX hoặc ZIP để chạy audit tĩnh. Mã extension không được cài đặt hay thực thi.</div></section>
<section class="panel">
<div class="eyebrow">01 / CHỌN MẪU</div><h2>Kéo thả file cần phân tích</h2>
<div id="drop" class="drop" tabindex="0"><strong>Thả file .crx hoặc .zip vào đây</strong><small>hoặc nhấn để chọn từ máy · tối đa 100 MB</small></div>
<input id="pick" type="file" accept=".crx,.zip" hidden>
<div id="file" class="file hidden"></div>
<label class="ack"><input id="ack" type="checkbox"><span>Tôi hiểu mẫu có thể chứa mã độc. Chỉ phân tích tĩnh, không cài hoặc chạy extension.</span></label>
<button id="run" class="primary" disabled>Phân tích mẫu</button>
<div id="status" class="status hidden" role="status"></div>
</section>
<section id="results" class="results hidden">
<div class="toolbar">
  <button id="pdf">Xuất PDF</button>
  <button id="json">Tải JSON</button>
  <button id="reset">Phân tích file khác</button>
</div>
<div id="summary" class="card"></div><div id="meta" class="meta"></div><div id="caps" class="card hidden"></div>
<h2 style="margin-top:28px">Phát hiện bảo mật</h2><div id="findings"></div>
<p class="disclaimer">Phân tích tĩnh cho biết quyền năng và mẫu mã cần rà soát; không tự nó chứng minh ý đồ độc hại. Không có phát hiện cũng không đảm bảo extension an toàn.</p>
</section>
</main>
<script nonce="__NONCE__">
const $=id=>document.getElementById(id);
const drop=$('drop'),pick=$('pick'),ack=$('ack'),run=$('run'),status=$('status');
let file=null,lastReport=null;
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n}
function size(n){return n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB'}
function setStatus(text,kind){status.textContent=text;status.className='status '+(kind||'');status.classList.remove('hidden')}
function choose(f){if(!f)return;const ext=f.name.toLowerCase().split('.').pop();if(!['crx','zip'].includes(ext)){setStatus('Chỉ nhận file .crx hoặc .zip.','error');return}if(f.size>100000000){setStatus('File vượt quá giới hạn 100 MB.','error');return}file=f;$('file').textContent=f.name+' · '+size(f.size);$('file').classList.remove('hidden');run.disabled=!ack.checked;status.classList.add('hidden')}
drop.addEventListener('click',()=>pick.click());
drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick.click()}});
pick.addEventListener('change',()=>choose(pick.files[0]));
for(const name of ['dragenter','dragover'])drop.addEventListener(name,e=>{e.preventDefault();drop.classList.add('over')});
for(const name of ['dragleave','drop'])drop.addEventListener(name,e=>{e.preventDefault();drop.classList.remove('over')});
drop.addEventListener('drop',e=>choose(e.dataTransfer.files[0]));
ack.addEventListener('change',()=>{run.disabled=!file||!ack.checked});
function metaItem(title,value,mono){const d=el('div','meta-item');d.append(el('span','',title),el('div',mono?'hash':'',value??'Không có'));return d}
function chips(title,items){const box=el('div','');box.append(el('b','',title));const row=el('div','chips');if(!items||!items.length)row.append(el('span','muted','Không khai báo'));else for(const item of items)row.append(el('span','chip',typeof item==='string'?item:JSON.stringify(item)));box.append(row);return box}
function render(report,filename){
 lastReport=report;$('results').classList.remove('hidden');
 const s=report.summary||{},rating=String(s.rating||'unknown').toLowerCase();
 const summary=$('summary');summary.replaceChildren();
 const top=el('div','score');const left=el('div','');left.append(el('div','eyebrow','MỨC RỦI RO MVX'),el('div','big',(s.riskScore??0)+'/100'));top.append(left,el('span','rating '+rating,rating.toUpperCase()));summary.append(top);
 const stats=el('div','stats');for(const sev of ['critical','high','medium','low','info']){const card=el('div','stat');card.append(el('b','sev '+sev,(s.counts&&s.counts[sev])||0),el('span','',sev.toUpperCase()));stats.append(card)}summary.append(stats);
 const meta=$('meta');meta.replaceChildren();
 meta.append(metaItem('Extension',report.target?.name||filename),metaItem('Phiên bản',report.target?.version||'Không rõ'),metaItem('Manifest','V'+(report.target?.manifestVersion??'?')),metaItem('Số phát hiện',s.total??0));
 meta.append(metaItem('SHA-256 archive',report.artifact?.sha256||report.package?.sha256||'Không có',true));
 if(report.artifact?.authenticity)meta.append(metaItem('Xác minh CRX',report.artifact.authenticity.status+(report.artifact.authenticity.extensionId?' · '+report.artifact.authenticity.extensionId:'')));
 const caps=$('caps');caps.replaceChildren();caps.append(el('h3','','Quyền và phạm vi host'));caps.append(chips('Permissions',report.capabilities?.permissions||[]),el('div','', ''),chips('Host permissions',report.capabilities?.hostPermissions||[]));caps.classList.remove('hidden');
 const list=$('findings');list.replaceChildren();
 if(!report.findings?.length){list.append(el('div','card','Không phát hiện mẫu rủi ro được hỗ trợ. Điều này không đảm bảo extension an toàn.'))}
 else for(const f of report.findings){const d=el('details','finding');const sum=el('summary','');const row=el('div','row');const t=el('strong','',f.id+' · '+f.title);row.append(t,el('span','sev '+String(f.severity).toLowerCase(),String(f.severity).toUpperCase()));sum.append(row);d.append(sum);const body=el('div','finding-body');body.append(el('p','',f.description||''));for(const ev of (f.evidence||[]).slice(0,12)){const e=el('div','evidence');e.append(el('b','',(ev.file||ev.scope||'package')+(ev.line?':'+ev.line:'')));if(ev.field)e.append(el('span','', ' · '+ev.field));if(ev.snippet)e.append(el('pre','snippet',String(ev.snippet).slice(0,1600)));body.append(e)}if(f.remediation){body.append(el('b','','Khuyến nghị'));body.append(el('p','',f.remediation))}d.append(body);list.append(d)}
}
run.addEventListener('click',async()=>{
 if(!file||!ack.checked)return;run.disabled=true;setStatus('Đang gửi file tạm và chạy audit tĩnh…','busy');$('results').classList.add('hidden');
 try{const url='/api/audit?filename='+encodeURIComponent(file.name);const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});const data=await res.json();if(!res.ok)throw new Error(data.error||'Audit thất bại.');render(data.report,data.filename);setStatus('Phân tích hoàn tất. File tạm đã được xóa.','');$('results').scrollIntoView({behavior:'smooth'})}
 catch(e){setStatus(e.message||'Không kết nối được MVX.','error')}
 finally{run.disabled=!file||!ack.checked}
});
$('reset').addEventListener('click',()=>{file=null;lastReport=null;pick.value='';ack.checked=false;run.disabled=true;$('file').classList.add('hidden');$('results').classList.add('hidden');status.classList.add('hidden');window.scrollTo({top:0,behavior:'smooth'})});
$('json').addEventListener('click',()=>{if(!lastReport)return;const blob=new Blob([JSON.stringify(lastReport,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mvx-audit-report.json';a.click();URL.revokeObjectURL(a.href)});
$('pdf').addEventListener('click', () => {
  const findings = [...document.querySelectorAll('#findings details')];
  const previousStates = findings.map(item => item.open);
  const oldTitle = document.title;

  findings.forEach(item => { item.open = true; });

  const name = String(lastReport?.target?.name || 'extension')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .toLowerCase();

  document.title = 'mvx-audit-' + name + '-report';

  window.addEventListener('afterprint', () => {
    findings.forEach((item, index) => { item.open = previousStates[index]; });
    document.title = oldTitle;
  }, { once: true });

  window.print();
});
</script>
</body>
</html>`;

function json(response, status, data) {
  const body = Buffer.from(JSON.stringify(data));
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(body);
}

function html(response) {
  const nonce = randomBytes(18).toString('base64');
  const body = Buffer.from(PAGE.replaceAll('__NONCE__', nonce));
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; script-src 'nonce-" + nonce + "'; style-src 'nonce-" + nonce + "'; connect-src 'self'; img-src data:; base-uri 'none'; frame-ancestors 'none'"
  });
  response.end(body);
}

async function bodyBuffer(req) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > MAX_UPLOAD) throw new Error('File vượt quá giới hạn 100 MB.');
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_UPLOAD) throw new Error('File vượt quá giới hạn 100 MB.');
    chunks.push(chunk);
  }
  if (!total) throw new Error('File tải lên đang trống.');
  return Buffer.concat(chunks, total);
}

function auditFile(inputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, 'audit', inputPath, '--acknowledge-risk', '--format', 'json'], {
      cwd: ROOT, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let bytes = 0;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, 120000);
    child.stdout.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_OUTPUT) child.kill('SIGTERM');
      else stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', chunk => { if (stderr.length < 100000) stderr += chunk.toString('utf8'); });
    child.on('error', err => { clearTimeout(timeout); reject(err); });
    child.on('close', code => {
      clearTimeout(timeout);
      if (timedOut) return reject(new Error('Audit quá thời gian 120 giây.'));
      if (bytes > MAX_OUTPUT) return reject(new Error('Kết quả audit quá lớn để hiển thị.'));
      let report;
      try { report = JSON.parse(stdout); }
      catch { return reject(new Error(stderr.trim() || 'MVX không trả về JSON hợp lệ.')); }
      if (code !== 0) return reject(new Error(stderr.trim() || 'MVX audit thất bại.'));
      resolve(report);
    });
  });
}

const server = createServer(async (req, res) => {
  try {
    const origin = 'http://' + HOST + ':' + PORT;
    if (!['127.0.0.1:' + PORT, 'localhost:' + PORT].includes(req.headers.host || '')) {
      return json(res, 421, { error: 'Chỉ cho phép kết nối local.' });
    }
    if (req.headers.origin && ![origin, 'http://localhost:' + PORT].includes(req.headers.origin)) {
      return json(res, 403, { error: 'Origin không được phép.' });
    }
    const url = new URL(req.url || '/', origin);
    if (req.method === 'GET' && url.pathname === '/') return html(res);
    if (req.method !== 'POST' || url.pathname !== '/api/audit') {
      return json(res, 404, { error: 'Không tìm thấy đường dẫn.' });
    }
    const name = url.searchParams.get('filename') || '';
    if (
  name.includes('/') ||
  name.includes('\\') ||
  name.length > 200 ||
  !['.crx', '.zip'].includes(name.toLowerCase().slice(name.lastIndexOf('.')))
) {
  return json(res, 400, { error: 'Chỉ nhận file .crx hoặc .zip.' });
}
    if (!req.headers['content-type']?.startsWith('application/octet-stream')) {
      return json(res, 415, { error: 'Định dạng tải lên không hợp lệ.' });
    }
    const bytes = await bodyBuffer(req);
    const dir = await mkdtemp(path.join(os.tmpdir(), 'mvx-ui-'));
    const input = path.join(dir, 'sample' + path.extname(name).toLowerCase());
    try {
      await writeFile(input, bytes, { flag: 'wx', mode: 0o600 });
      const report = await auditFile(input);
      if (report.target) report.target.root = name;
      if (report.artifact) report.artifact.path = name;
      json(res, 200, { filename: name, report });
    } finally {
      bytes.fill(0);
      await rm(dir, { recursive: true, force: true });
    }
  } catch (err) {
    json(res, 400, { error: err.message || 'Có lỗi khi phân tích.' });
  }
});

if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error('MVX_UI_PORT phải trong khoảng 1024-65535.');
}
server.listen(PORT, HOST, () => {
  console.log('MVX Audit UI: http://' + HOST + ':' + PORT);
  console.log('Chỉ phân tích tĩnh. Nhấn Ctrl+C để dừng.');
});