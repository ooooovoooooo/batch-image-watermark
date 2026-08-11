const state = {
  files: [], selected: 0, mode: 'text', logo: null, logoUrl: '', rotation: 0,
  layout: 'tile', position: 'center', images: new Map(), rendering: false
};

const $ = (id) => document.getElementById(id);
const els = {
  imageInput: $('imageInput'), dropzone: $('dropzone'), thumbs: $('thumbs'), fileCount: $('fileCount'),
  clearButton: $('clearButton'), canvas: $('previewCanvas'), empty: $('emptyPreview'), text: $('watermarkText'),
  fontSize: $('fontSize'), color: $('textColor'), colorValue: $('colorValue'), opacity: $('opacity'),
  opacityValue: $('opacityValue'), logoInput: $('logoInput'), logoName: $('logoName'), logoSize: $('logoSize'),
  logoSizeValue: $('logoSizeValue'), rotation: $('rotation'), rotationValue: $('rotationValue'),
  gap: $('gap'), gapValue: $('gapValue'), gapField: $('gapField'),
  process: $('processButton'), status: $('status'), positionField: $('positionField')
};

const readImage = (url) => new Promise((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = url;
});

function setStatus(title, detail, ready = false) {
  els.status.classList.toggle('ready', ready);
  els.status.innerHTML = `<span class="status-dot">${ready ? '✓' : 'i'}</span><div><strong>${title}</strong><small>${detail}</small></div>`;
}

async function addFiles(list) {
  const incoming = [...list].filter(file => /^image\/(jpeg|png|webp)$/.test(file.type));
  if (!incoming.length) return setStatus('没有可用图片', '请选择 JPG、PNG 或 WebP 文件');
  for (const file of incoming) {
    const url = URL.createObjectURL(file);
    state.files.push({ file, url });
  }
  state.selected = Math.max(0, state.files.length - incoming.length);
  renderThumbs(); updateUi(); await renderPreview();
}

function renderThumbs() {
  els.thumbs.innerHTML = '';
  state.files.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `thumb${index === state.selected ? ' active' : ''}`;
    button.innerHTML = `<img src="${item.url}" alt="${item.file.name}"><em>${index + 1}</em>`;
    button.onclick = async () => { state.selected = index; renderThumbs(); await renderPreview(); };
    els.thumbs.append(button);
  });
}

function updateUi() {
  const count = state.files.length;
  els.fileCount.textContent = count ? `已上传 ${count} 张图片` : '尚未上传图片';
  els.clearButton.disabled = !count; els.process.disabled = !count || (state.mode === 'logo' && !state.logo);
  if (count) setStatus('图片已就绪', `共 ${count} 张图片，可调整设置后导出`, true);
  else setStatus('等待上传图片', '选择图片后即可实时预览');
}

function watermarkMetrics(ctx, baseWidth) {
  const opacity = Number(els.opacity.value) / 100;
  if (state.mode === 'text') {
    const size = Math.max(12, Number(els.fontSize.value));
    ctx.font = `600 ${size}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
    const metrics = ctx.measureText(els.text.value || '水印');
    return { kind: 'text', width: metrics.width + size * .45, height: size * 1.35, opacity, size };
  }
  if (!state.logo) return null;
  const width = baseWidth * Number(els.logoSize.value) / 100;
  return { kind: 'logo', width, height: width * state.logo.height / state.logo.width, opacity };
}

function drawOne(ctx, metrics, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(state.rotation * Math.PI / 180); ctx.globalAlpha = metrics.opacity;
  if (metrics.kind === 'text') {
    ctx.fillStyle = els.color.value; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(els.text.value || '水印', 0, 0);
  } else ctx.drawImage(state.logo, -metrics.width / 2, -metrics.height / 2, metrics.width, metrics.height);
  ctx.restore();
}

function renderToCanvas(image, canvas) {
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0);
  const metrics = watermarkMetrics(ctx, canvas.width); if (!metrics) return;
  if (state.layout === 'tile') {
    const spacing = Number(els.gap.value);
    const angle = state.rotation * Math.PI / 180;
    const rotatedWidth = Math.abs(metrics.width * Math.cos(angle)) + Math.abs(metrics.height * Math.sin(angle));
    const rotatedHeight = Math.abs(metrics.width * Math.sin(angle)) + Math.abs(metrics.height * Math.cos(angle));
    const stepX = Math.max(1, rotatedWidth + spacing);
    const stepY = Math.max(1, rotatedHeight + spacing);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const startX = centerX - Math.ceil((centerX + stepX) / stepX) * stepX;
    const startY = centerY - Math.ceil((centerY + stepY) / stepY) * stepY;
    for (let y = startY; y <= canvas.height + stepY; y += stepY) {
      for (let x = startX; x <= canvas.width + stepX; x += stepX) drawOne(ctx, metrics, x, y);
    }
  } else {
    const margin = Math.min(canvas.width, canvas.height) * .06;
    const points = {
      'top-left': [margin + metrics.width/2, margin + metrics.height/2], 'top-center': [canvas.width/2, margin + metrics.height/2],
      'top-right': [canvas.width-margin-metrics.width/2, margin+metrics.height/2], 'center-left': [margin+metrics.width/2, canvas.height/2],
      center: [canvas.width/2, canvas.height/2], 'center-right': [canvas.width-margin-metrics.width/2, canvas.height/2],
      'bottom-left': [margin+metrics.width/2, canvas.height-margin-metrics.height/2], 'bottom-center': [canvas.width/2, canvas.height-margin-metrics.height/2],
      'bottom-right': [canvas.width-margin-metrics.width/2, canvas.height-margin-metrics.height/2]
    };
    drawOne(ctx, metrics, ...points[state.position]);
  }
}

async function renderPreview() {
  if (!state.files.length) { els.canvas.hidden = true; els.empty.hidden = false; return; }
  const current = state.files[state.selected];
  let image = state.images.get(current.url);
  if (!image) { image = await readImage(current.url); state.images.set(current.url, image); }
  renderToCanvas(image, els.canvas); els.empty.hidden = true; els.canvas.hidden = false;
}

async function processAll() {
  if (state.rendering || !state.files.length) return;
  state.rendering = true; els.process.disabled = true; els.process.textContent = '正在处理…';
  setStatus('正在处理', `0 / ${state.files.length} 张图片`);
  try {
    const zip = new JSZip();
    for (let i = 0; i < state.files.length; i++) {
      const item = state.files[i]; let image = state.images.get(item.url);
      if (!image) { image = await readImage(item.url); state.images.set(item.url, image); }
      const canvas = document.createElement('canvas'); renderToCanvas(image, canvas);
      const isJpeg = item.file.type === 'image/jpeg'; const type = isJpeg ? 'image/jpeg' : 'image/png';
      const ext = isJpeg ? '.jpg' : '.png'; const base = item.file.name.replace(/\.[^.]+$/, '');
      const blob = await new Promise(resolve => canvas.toBlob(resolve, type, .92));
      zip.file(`${base}-watermarked${ext}`, blob); setStatus('正在处理', `${i + 1} / ${state.files.length} 张图片`);
    }
    const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const link = document.createElement('a'); link.href = URL.createObjectURL(archive); link.download = 'watermarked-images.zip'; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    setStatus('处理完成', `共 ${state.files.length} 张图片，ZIP 已开始下载`, true);
  } catch (error) { console.error(error); setStatus('处理失败', '请重试或减少单次图片数量'); }
  finally { state.rendering = false; els.process.disabled = false; els.process.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 18v2h14v-2"/></svg>处理并下载 ZIP'; }
}

els.imageInput.onchange = e => addFiles(e.target.files);
['dragenter','dragover'].forEach(name => els.dropzone.addEventListener(name, e => { e.preventDefault(); els.dropzone.classList.add('dragging'); }));
['dragleave','drop'].forEach(name => els.dropzone.addEventListener(name, e => { e.preventDefault(); els.dropzone.classList.remove('dragging'); }));
els.dropzone.addEventListener('drop', e => addFiles(e.dataTransfer.files));
els.clearButton.onclick = () => { state.files.forEach(item => URL.revokeObjectURL(item.url)); state.files=[]; state.images.clear(); els.imageInput.value=''; renderThumbs(); updateUi(); renderPreview(); };

document.querySelectorAll('.tab').forEach(tab => tab.onclick = async () => {
  state.mode = tab.dataset.mode; document.querySelectorAll('.tab').forEach(t => { t.classList.toggle('active', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
  document.querySelector('.text-settings').hidden = state.mode !== 'text'; document.querySelector('.logo-settings').hidden = state.mode !== 'logo';
  updateUi(); await renderPreview();
});

els.logoInput.onchange = async e => { const file=e.target.files[0]; if(!file) return; if(state.logoUrl) URL.revokeObjectURL(state.logoUrl); state.logoUrl=URL.createObjectURL(file); state.logo=await readImage(state.logoUrl); els.logoName.textContent=file.name; updateUi(); renderPreview(); };
[els.text, els.fontSize, els.color, els.logoSize].forEach(input => input.addEventListener('input', () => {
  els.colorValue.textContent=els.color.value.toUpperCase(); els.logoSizeValue.textContent=`${els.logoSize.value}%`; renderPreview();
}));

function bindNumberRange(range, number, onChange) {
  const apply = (source, target) => {
    if (source.value === '') return;
    const min = Number(source.min); const max = Number(source.max);
    const value = Math.min(max, Math.max(min, Number(source.value)));
    source.value = value; target.value = value; onChange(value); renderPreview();
  };
  range.addEventListener('input', () => apply(range, number));
  number.addEventListener('input', () => apply(number, range));
  number.addEventListener('blur', () => { if (number.value === '') { number.value = range.value; } });
}

bindNumberRange(els.opacity, els.opacityValue, () => {});
bindNumberRange(els.rotation, els.rotationValue, value => { state.rotation = value; });
bindNumberRange(els.gap, els.gapValue, () => {});

function bindChoice(id, key, callback) { document.querySelectorAll(`#${id} button`).forEach(button => button.onclick = () => { state[key] = key === 'rotation' ? Number(button.dataset.value) : button.dataset.value; document.querySelectorAll(`#${id} button`).forEach(b => b.classList.toggle('active', b === button)); if(callback) callback(); renderPreview(); }); }
bindChoice('layoutChoices','layout', () => { els.positionField.hidden = state.layout === 'tile'; els.gapField.hidden = state.layout !== 'tile'; });
bindChoice('positionGrid','position');
els.process.onclick = processAll;
updateUi();
