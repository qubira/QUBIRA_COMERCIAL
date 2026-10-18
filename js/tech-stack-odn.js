/**
 * QUBIRA ODN - Tech Stack & Cotizaciones Builder Component
 * Visual interactive tree ramification diagram for ODN/Comercial.
 */
(function(window) {
  'use strict';

  let _stacks = [];
  let _activeStack = null;
  let _techCatalog = { language: [], tool: [] };
  let _container = null;
  let _resizeObserver = null;

  const CURRENCY_SYMBOLS = { PEN: 'S/', USD: '$', EUR: '€' };
  function getSym(m) { return CURRENCY_SYMBOLS[m] || '$'; }

  function thumbUrl(url, size = 64) {
    if (!url) return '';
    if (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/image/upload/') && !url.includes('/image/upload/w_')) {
      return url.replace('/image/upload/', `/image/upload/w_${size},h_${size},c_fit,f_auto,q_auto/`);
    }
    return url;
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Inyectar estilos autónomos si no existen
  function ensureStyles() {
    if (document.getElementById('ts-odn-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'ts-odn-injected-styles';
    style.textContent = `
      .ts-odn-wrap {
        background: #ffffff;
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        display: flex;
        flex-direction: column;
        min-height: 640px;
        font-family: inherit;
        overflow: hidden;
      }
      .ts-odn-toolbar {
        padding: 12px 18px;
        border-bottom: 1px solid var(--border, #e5e7eb);
        background: #f9fafb;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .ts-odn-meta-bar {
        padding: 10px 18px;
        border-bottom: 1px solid var(--border, #e5e7eb);
        background: #ffffff;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 14px;
        font-size: 12px;
      }
      .ts-odn-canvas {
        flex: 1;
        overflow: auto;
        padding: 24px;
        background: radial-gradient(#e5e7eb 1px, transparent 1px) 0 0 / 22px 22px, #f8fafc;
        position: relative;
        min-height: 480px;
      }
      .ts-odn-columns {
        display: flex;
        align-items: flex-start;
        gap: 28px;
        min-width: max-content;
        position: relative;
        z-index: 10;
      }
      .ts-odn-column {
        width: 250px;
        background: #ffffff;
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        transition: border-color 0.2s;
      }
      .ts-odn-column:hover {
        border-color: #cbd5e1;
      }
      .ts-odn-col-header {
        padding: 10px 12px;
        border-bottom: 1px solid #f1f5f9;
        background: #f8fafc;
        border-radius: 12px 12px 0 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .ts-odn-node {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px 12px;
        position: relative;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: all 0.2s ease;
      }
      .ts-odn-node:hover {
        border-color: #0f766e;
        box-shadow: 0 4px 12px rgba(15,118,110,0.08);
      }
      .ts-odn-port-in, .ts-odn-port-out {
        position: absolute;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #ffffff;
        top: 50%;
        transform: translateY(-50%);
        box-shadow: 0 1px 2px rgba(0,0,0,0.12);
        z-index: 10;
      }
      .ts-odn-port-in { left: -7px; border: 2.5px solid #0f766e; }
      .ts-odn-port-out { right: -7px; border: 2.5px solid #10b981; }
      .ts-odn-footer {
        padding: 14px 20px;
        border-top: 1px solid #1f2937;
        background: #111827;
        color: #ffffff;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }
      .ts-odn-badge-curr {
        background: #1f2937;
        border: 1px solid #374151;
        padding: 6px 12px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ts-modal-back {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .ts-modal-box {
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15);
        width: 100%;
        max-width: 540px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }

  async function initTechStackOdn(mountEl) {
    _container = mountEl;
    ensureStyles();
    _container.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text-muted);font-size:13px">Cargando Tech Stacks…</div>`;

    try {
      const [stacks, catalog] = await Promise.all([
        window.qcApiFetch('/api/comercial/tech-stacks'),
        window.qcApiFetch('/api/comercial/tech-catalog'),
      ]);

      _stacks = Array.isArray(stacks) ? stacks : [];
      const catList = Array.isArray(catalog) ? catalog : [];
      _techCatalog = {
        language: catList.filter(c => c.category === 'language'),
        tool: catList.filter(c => c.category === 'tool'),
      };

      if (_stacks.length > 0) {
        _activeStack = JSON.parse(JSON.stringify(_stacks[0]));
      } else {
        _activeStack = createEmptyStack('Nuevo Tech Stack', 'Web');
      }

      renderBuilder();
    } catch (err) {
      _container.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--danger);font-size:13px">
          <p>Error al cargar Tech Stacks: ${esc(err.message)}</p>
        </div>`;
    }
  }

  function createEmptyStack(name, type = 'Web', isQuotation = false) {
    return {
      id: 'stack_' + Date.now(),
      name: name,
      project_type: type,
      description: '',
      stages: [
        { id: 'stg_1', title: 'HERRAMIENTA', category: 'tool', items: [] },
        { id: 'stg_2', title: 'LENGUAJE', category: 'language', items: [] },
        { id: 'stg_3', title: 'HERRAMIENTA', category: 'tool', items: [] },
        { id: 'stg_4', title: 'HERRAMIENTA', category: 'tool', items: [] },
        { id: 'stg_5', title: 'PRODUCTO', category: 'product', items: [] },
      ],
      is_quotation: isQuotation,
      quotation_margin: 0,
    };
  }

  function renderBuilder() {
    if (!_container || !_activeStack) return;

    const stackOptions = _stacks.map(s => `
      <option value="${esc(s.id)}" ${s.id === _activeStack.id ? 'selected' : ''}>
        [${esc(s.project_type || 'Web')}] ${esc(s.name)}${s.is_quotation ? ' 🏷️ (Cotización ODN)' : ''}
      </option>
    `).join('');

    _container.innerHTML = `
      <div class="ts-odn-wrap">
        <!-- Toolbar superior -->
        <div class="ts-odn-toolbar">
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px">
            <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Ramificación:</span>
            <select id="ts-odn-select" style="padding:6px 12px;font-size:12px;font-weight:600;border:1px solid var(--border);border-radius:8px;background:#fff;max-width:280px;cursor:pointer">
              ${stackOptions || '<option value="">(Sin ramificaciones)</option>'}
            </select>
            <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;${_activeStack.is_quotation ? 'background:#fef3c7;color:#92400e;border:1px solid #fde68a' : 'background:#ecfdf5;color:#0f766e;border:1px solid #a7f3d0'}">
              ${esc(_activeStack.project_type || 'Web')}
            </span>
            ${_activeStack.is_quotation ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;background:#d97706;color:#fff">Cotización Activa</span>' : ''}
          </div>

          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">
            <button type="button" id="ts-odn-btn-new" class="btn btn-outline" style="padding:5px 12px;font-size:12px">
              + Nueva Ramificación
            </button>
            <button type="button" id="ts-odn-btn-clone" class="btn btn-outline" style="padding:5px 12px;font-size:12px;background:#fffbeb;color:#92400e;border-color:#fcd34d">
              📋 Clonar para Cotización
            </button>
            <button type="button" id="ts-odn-btn-add-col" class="btn btn-outline" style="padding:5px 12px;font-size:12px">
              + Agregar Columna
            </button>
            <button type="button" id="ts-odn-btn-save" class="btn btn-primary" style="padding:5px 16px;font-size:12px;font-weight:700">
              Guardar Cambios
            </button>
            <button type="button" id="ts-odn-btn-delete" class="btn btn-outline" style="padding:5px 10px;font-size:12px;color:var(--danger);border-color:#fca5a5" title="Eliminar ramificación">
              🗑️
            </button>
          </div>
        </div>

        <!-- Barra de Metadatos -->
        <div class="ts-odn-meta-bar">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:240px">
            <span style="color:var(--text-muted);font-weight:600">Nombre:</span>
            <input type="text" id="ts-odn-name" value="${esc(_activeStack.name)}" style="padding:4px 10px;font-size:12px;font-weight:600;border:1px solid var(--border);border-radius:6px;width:100%;max-width:320px" placeholder="Ej: Stack Web E-Commerce">
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="color:var(--text-muted);font-weight:600">Tipo:</span>
            <select id="ts-odn-type" style="padding:4px 10px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:#fff">
              <option value="Web" ${_activeStack.project_type === 'Web' ? 'selected' : ''}>Web</option>
              <option value="Móvil" ${_activeStack.project_type === 'Móvil' ? 'selected' : ''}>Móvil (App)</option>
              <option value="API / Backend" ${_activeStack.project_type === 'API / Backend' ? 'selected' : ''}>API / Backend</option>
              <option value="Escritorio" ${_activeStack.project_type === 'Escritorio' ? 'selected' : ''}>Escritorio</option>
              <option value="E-Commerce" ${_activeStack.project_type === 'E-Commerce' ? 'selected' : ''}>E-Commerce</option>
              <option value="Full-Stack" ${_activeStack.project_type === 'Full-Stack' ? 'selected' : ''}>Full-Stack</option>
              <option value="Multi-Plataforma" ${_activeStack.project_type === 'Multi-Plataforma' ? 'selected' : ''}>Multi-Plataforma</option>
              <option value="Otro" ${_activeStack.project_type === 'Otro' ? 'selected' : ''}>Otro</option>
            </select>
          </div>
          <div style="font-size:11.5px;color:var(--primary);margin-left:auto;font-weight:600;display:flex;align-items:center;gap:4px">
            <span>💼</span> ODN Cotizaciones: Puedes ajustar planes y calcular costos de inversión en vivo.
          </div>
        </div>

        <!-- Canvas horizontal con ramificaciones SVG -->
        <div class="ts-odn-canvas" id="ts-odn-canvas">
          <svg id="ts-odn-svg" style="position:absolute;inset:0;pointer-events:none;width:100%;height:100%;min-width:100%;min-height:100%;z-index:5">
            <defs>
              <linearGradient id="ts-odn-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#0f766e" />
                <stop offset="50%" stop-color="#059669" />
                <stop offset="100%" stop-color="#10b981" />
              </linearGradient>
              <marker id="ts-odn-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#059669" />
              </marker>
            </defs>
            <g id="ts-odn-paths"></g>
          </svg>

          <div class="ts-odn-columns" id="ts-odn-cols-wrapper">
            ${(_activeStack.stages || []).map((stage, sIdx) => renderStageColumn(stage, sIdx)).join('')}
          </div>
        </div>

        <!-- Barra inferior: Costo Total de Inversión -->
        ${renderInvestmentFooter()}
      </div>
    `;

    setupEvents();
    requestAnimationFrame(() => updateSvg());
  }

  function renderStageColumn(stage, sIdx) {
    const items = stage.items || [];
    const isLast = sIdx === (_activeStack.stages.length - 1);

    return `
      <div class="ts-odn-column" data-stage-index="${sIdx}">
        <div class="ts-odn-col-header">
          <div style="display:flex;align-items:center;gap:6px;overflow:hidden;flex:1">
            <span style="font-size:10px;font-weight:700;color:var(--text-muted);background:#e2e8f0;padding:2px 5px;border-radius:4px">C${sIdx + 1}</span>
            <input type="text" class="ts-odn-col-title" value="${esc(stage.title)}" data-stage-index="${sIdx}" style="font-size:12px;font-weight:700;color:#1e293b;border:none;background:transparent;width:100%;outline:none;cursor:pointer" title="Clic para renombrar">
          </div>
          <div style="display:flex;align-items:center;gap:2px">
            <button type="button" class="ts-odn-btn-add-item" data-stage-index="${sIdx}" style="background:none;border:none;color:#059669;cursor:pointer;font-size:15px;padding:2px 4px;font-weight:700" title="Añadir tecnología">+</button>
            ${_activeStack.stages.length > 2 ? `
            <button type="button" class="ts-odn-btn-del-col" data-stage-index="${sIdx}" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:13px;padding:2px 4px" title="Eliminar columna">&times;</button>` : ''}
          </div>
        </div>

        <div style="padding:10px;display:flex;flex-direction:column;gap:10px;min-height:200px">
          ${items.length === 0 ? `
            <div style="border:1px dashed #cbd5e1;border-radius:8px;padding:18px 10px;text-align:center;color:var(--text-muted);font-size:11px;background:#f8fafc">
              <p style="margin-bottom:6px">Sin tecnologías</p>
              <button type="button" class="ts-odn-btn-add-item" data-stage-index="${sIdx}" style="color:var(--primary);background:none;border:none;font-size:11px;font-weight:700;cursor:pointer">+ Añadir elemento</button>
            </div>` :
            items.map((it, itIdx) => renderNodeCard(it, sIdx, itIdx, isLast)).join('')}
        </div>
      </div>
    `;
  }

  function renderNodeCard(item, sIdx, itIdx, isLast) {
    const avatar = item.image_url
      ? `<div style="width:28px;height:28px;border-radius:6px;background:#fff;border:1px solid #e2e8f0;display:inline-flex;align-items:center;justify-content:center;padding:2px;flex-shrink:0"><img src="${esc(thumbUrl(item.image_url, 64))}" style="max-width:100%;max-height:100%;object-fit:contain" alt="${esc(item.name)}"></div>`
      : `<span style="width:28px;height:28px;border-radius:6px;background:#ecfdf5;border:1px solid #a7f3d0;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0f766e;flex-shrink:0">${esc((item.name || '?').charAt(0).toUpperCase())}</span>`;

    const catalogMatch = (_techCatalog.tool || []).concat(_techCatalog.language || []).find(c => c.name.toLowerCase() === (item.name || '').toLowerCase());
    const plans = (catalogMatch && Array.isArray(catalogMatch.plans) && catalogMatch.plans.length)
      ? catalogMatch.plans
      : [{ name: 'Free / Gratis', costo: 0, moneda: 'USD', periodo: 'mes' }];

    const currentPlan = item.plan_name || 'Free';
    const sym = getSym(item.moneda || 'USD');
    const costNum = Number(item.costo) || 0;
    const costLabel = costNum === 0 ? 'Gratis' : `${sym} ${costNum.toFixed(2)} / ${item.periodo === 'año' ? 'año' : 'mes'}`;

    const nextStage = _activeStack.stages[sIdx + 1];
    const nextItems = nextStage ? (nextStage.items || []) : [];
    const targets = Array.isArray(item.targets) ? item.targets : [];

    return `
      <div class="ts-odn-node" id="${esc(item.id)}" data-stage-index="${sIdx}" data-item-index="${itIdx}">
        <div class="ts-odn-port-in ${sIdx === 0 ? 'ts-hide' : ''}" style="${sIdx === 0 ? 'display:none' : ''}"></div>
        <div class="ts-odn-port-out ${isLast ? 'ts-hide' : ''}" style="${isLast ? 'display:none' : ''}"></div>

        <!-- Cabecera Card -->
        <div style="display:flex;align-items:center;gap:8px">
          ${avatar}
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(item.name)}</div>
            <div style="font-size:10px;color:var(--text-muted);text-transform:capitalize">${esc(item.category || 'tecnología')}</div>
          </div>
          <button type="button" class="ts-odn-del-node" data-stage-index="${sIdx}" data-item-index="${itIdx}" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:13px;padding:2px" title="Quitar">&times;</button>
        </div>

        <!-- Plan selector y costo -->
        <div style="padding-top:6px;border-top:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;gap:6px">
          <select class="ts-odn-plan-sel" data-stage-index="${sIdx}" data-item-index="${itIdx}" style="font-size:11px;padding:3px 6px;border:1px solid var(--border);border-radius:4px;background:#f8fafc;flex:1;min-width:0;cursor:pointer">
            ${plans.map(p => `
              <option value="${esc(p.name)}" ${p.name === currentPlan ? 'selected' : ''}>
                ${esc(p.name)} (${getSym(p.moneda || 'USD')} ${Number(p.costo || 0).toFixed(2)})
              </option>
            `).join('')}
          </select>
          <span style="font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:4px;${costNum === 0 ? 'background:#ecfdf5;color:#059669' : 'background:#f1f5f9;color:#1e293b'};white-space:nowrap">
            ${costLabel}
          </span>
        </div>

        <!-- Conexiones -->
        ${!isLast && nextItems.length > 0 ? `
        <div style="margin-top:2px;padding-top:6px;border-top:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;font-size:10.5px">
          <button type="button" class="ts-odn-btn-targets" data-stage-index="${sIdx}" data-item-index="${itIdx}" style="background:none;border:none;color:var(--primary);font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px">
            <span>⇄</span> Ramificar a (${targets.length ? targets.length : 'Todos'})
          </button>
        </div>` : ''}
      </div>
    `;
  }

  function renderInvestmentFooter() {
    const totals = { USD: 0, PEN: 0, EUR: 0 };
    let itemCount = 0;

    (_activeStack.stages || []).forEach(stage => {
      (stage.items || []).forEach(it => {
        itemCount++;
        const c = Number(it.costo) || 0;
        const m = it.moneda || 'USD';
        if (totals[m] !== undefined) totals[m] += c;
        else totals.USD += c;
      });
    });

    return `
      <div class="ts-odn-footer">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:8px;background:rgba(16,185,129,0.15);color:#34d399;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold">
            💰
          </div>
          <div>
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#e2e8f0">Costo Total de Inversión</div>
            <div style="font-size:11px;color:#94a3b8">${itemCount} tecnologías en este Tech Stack</div>
          </div>
        </div>

        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:12px">
          <div class="ts-odn-badge-curr">
            <span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase">Dólares:</span>
            <span style="font-size:14px;font-weight:800;color:#34d399;font-family:monospace">$ ${totals.USD.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="ts-odn-badge-curr">
            <span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase">Soles:</span>
            <span style="font-size:14px;font-weight:800;color:#38bdf8;font-family:monospace">S/ ${totals.PEN.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="ts-odn-badge-curr">
            <span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase">Euros:</span>
            <span style="font-size:14px;font-weight:800;color:#fbbf24;font-family:monospace">€ ${totals.EUR.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    `;
  }

  function updateSvg() {
    const svgGroup = document.getElementById('ts-odn-paths');
    const canvas = document.getElementById('ts-odn-canvas');
    if (!svgGroup || !canvas || !_activeStack) return;

    svgGroup.innerHTML = '';
    const canvasRect = canvas.getBoundingClientRect();
    const stages = _activeStack.stages || [];

    for (let s = 0; s < stages.length - 1; s++) {
      const currentStage = stages[s];
      const nextStage = stages[s + 1];
      const nextItems = nextStage.items || [];
      if (!nextItems.length) continue;

      (currentStage.items || []).forEach(srcItem => {
        const srcEl = document.getElementById(srcItem.id);
        if (!srcEl) return;
        const outPort = srcEl.querySelector('.ts-odn-port-out');
        if (!outPort) return;
        const outRect = outPort.getBoundingClientRect();

        const x1 = outRect.left + outRect.width / 2 - canvasRect.left + canvas.scrollLeft;
        const y1 = outRect.top + outRect.height / 2 - canvasRect.top + canvas.scrollTop;

        let targetIds = Array.isArray(srcItem.targets) && srcItem.targets.length ? srcItem.targets : nextItems.map(n => n.id);

        targetIds.forEach(tId => {
          const tgtEl = document.getElementById(tId);
          if (!tgtEl) return;
          const inPort = tgtEl.querySelector('.ts-odn-port-in');
          if (!inPort) return;
          const inRect = inPort.getBoundingClientRect();

          const x2 = inRect.left + inRect.width / 2 - canvasRect.left + canvas.scrollLeft;
          const y2 = inRect.top + inRect.height / 2 - canvasRect.top + canvas.scrollTop;

          const dx = Math.max(30, (x2 - x1) * 0.45);
          const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', d);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', 'url(#ts-odn-grad)');
          path.setAttribute('stroke-width', '2.5');
          path.setAttribute('stroke-dasharray', 'none');
          path.setAttribute('opacity', '0.85');
          path.setAttribute('marker-end', 'url(#ts-odn-arrow)');
          svgGroup.appendChild(path);
        });
      });
    }
  }

  function setupEvents() {
    const sel = document.getElementById('ts-odn-select');
    if (sel) {
      sel.addEventListener('change', e => {
        const found = _stacks.find(s => s.id === e.target.value);
        if (found) {
          _activeStack = JSON.parse(JSON.stringify(found));
          renderBuilder();
        }
      });
    }

    document.getElementById('ts-odn-name')?.addEventListener('input', e => {
      _activeStack.name = e.target.value;
    });

    document.getElementById('ts-odn-type')?.addEventListener('change', e => {
      _activeStack.project_type = e.target.value;
    });

    document.getElementById('ts-odn-btn-new')?.addEventListener('click', () => {
      const name = prompt('Nombre de la nueva ramificación:', 'Nuevo Tech Stack');
      if (!name || !name.trim()) return;
      const newStack = createEmptyStack(name.trim(), 'Web', false);
      _stacks.push(newStack);
      _activeStack = JSON.parse(JSON.stringify(newStack));
      renderBuilder();
    });

    document.getElementById('ts-odn-btn-clone')?.addEventListener('click', () => {
      const cloned = JSON.parse(JSON.stringify(_activeStack));
      cloned.id = 'stack_odn_' + Date.now();
      cloned.name = `[Cotización] ${cloned.name}`;
      cloned.is_quotation = true;
      _stacks.push(cloned);
      _activeStack = cloned;
      renderBuilder();
      if (window.toast) window.toast('success', 'Cotización Creada', 'Se clonó la ramificación para cotizar precios.');
    });

    document.getElementById('ts-odn-btn-add-col')?.addEventListener('click', () => {
      const num = (_activeStack.stages || []).length + 1;
      _activeStack.stages.push({
        id: 'stg_' + Date.now(),
        title: 'HERRAMIENTA',
        category: 'tool',
        items: []
      });
      renderBuilder();
    });

    document.getElementById('ts-odn-btn-save')?.addEventListener('click', async () => {
      try {
        const payload = {
          name: _activeStack.name,
          project_type: _activeStack.project_type,
          description: _activeStack.description || '',
          stages: _activeStack.stages,
          is_quotation: !!_activeStack.is_quotation,
          quotation_margin: _activeStack.quotation_margin || 0,
        };

        const existing = _stacks.find(s => s.id === _activeStack.id);
        const isPersisted = existing && !String(existing.id).startsWith('stack_') && !String(existing.id).startsWith('stack_odn_');

        if (isPersisted) {
          await window.qcApiFetch('/api/comercial/tech-stacks/' + encodeURIComponent(_activeStack.id), {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
        } else {
          const created = await window.qcApiFetch('/api/comercial/tech-stacks', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          _activeStack.id = created.id;
        }

        const freshStacks = await window.qcApiFetch('/api/comercial/tech-stacks');
        _stacks = freshStacks || [];
        const match = _stacks.find(s => s.id === _activeStack.id) || _stacks[0];
        if (match) _activeStack = JSON.parse(JSON.stringify(match));
        renderBuilder();
        if (window.toast) window.toast('success', 'Tech Stack Guardado', 'Se guardó la ramificación correctamente en la base de datos.');
      } catch (err) {
        alert('Error al guardar: ' + err.message);
      }
    });

    document.getElementById('ts-odn-btn-delete')?.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar la ramificación "${_activeStack.name}"?`)) return;
      try {
        if (!String(_activeStack.id).startsWith('stack_')) {
          await window.qcApiFetch('/api/comercial/tech-stacks/' + encodeURIComponent(_activeStack.id), {
            method: 'DELETE'
          });
        }
        _stacks = _stacks.filter(s => s.id !== _activeStack.id);
        _activeStack = _stacks.length ? JSON.parse(JSON.stringify(_stacks[0])) : createEmptyStack('Nuevo Tech Stack', 'Web');
        renderBuilder();
      } catch (err) {
        alert('Error al eliminar: ' + err.message);
      }
    });

    // Column titles
    document.querySelectorAll('.ts-odn-col-title').forEach(inp => {
      inp.addEventListener('change', e => {
        const sIdx = Number(e.target.dataset.stageIndex);
        if (_activeStack.stages[sIdx]) {
          _activeStack.stages[sIdx].title = e.target.value.toUpperCase();
          renderBuilder();
        }
      });
    });

    // Add item buttons
    document.querySelectorAll('.ts-odn-btn-add-item').forEach(btn => {
      btn.addEventListener('click', e => {
        const sIdx = Number(e.currentTarget.dataset.stageIndex);
        openAddItemModal(sIdx);
      });
    });

    // Delete column buttons
    document.querySelectorAll('.ts-odn-btn-del-col').forEach(btn => {
      btn.addEventListener('click', e => {
        const sIdx = Number(e.currentTarget.dataset.stageIndex);
        if (_activeStack.stages.length <= 2) return;
        _activeStack.stages.splice(sIdx, 1);
        renderBuilder();
      });
    });

    // Delete node
    document.querySelectorAll('.ts-odn-del-node').forEach(btn => {
      btn.addEventListener('click', e => {
        const sIdx = Number(e.currentTarget.dataset.stageIndex);
        const itIdx = Number(e.currentTarget.dataset.itemIndex);
        if (_activeStack.stages[sIdx]) {
          _activeStack.stages[sIdx].items.splice(itIdx, 1);
          renderBuilder();
        }
      });
    });

    // Plan selection change
    document.querySelectorAll('.ts-odn-plan-sel').forEach(sel => {
      sel.addEventListener('change', e => {
        const sIdx = Number(e.target.dataset.stageIndex);
        const itIdx = Number(e.target.dataset.itemIndex);
        const item = _activeStack.stages[sIdx]?.items[itIdx];
        if (!item) return;

        const catalogMatch = (_techCatalog.tool || []).concat(_techCatalog.language || []).find(c => c.name.toLowerCase() === (item.name || '').toLowerCase());
        const plans = (catalogMatch && Array.isArray(catalogMatch.plans)) ? catalogMatch.plans : [];
        const chosen = plans.find(p => p.name === e.target.value);

        if (chosen) {
          item.plan_name = chosen.name;
          item.costo = Number(chosen.costo) || 0;
          item.moneda = chosen.moneda || 'USD';
          item.periodo = chosen.periodo || 'mes';
        } else {
          item.plan_name = e.target.value;
        }

        renderBuilder();
      });
    });

    // Target modal
    document.querySelectorAll('.ts-odn-btn-targets').forEach(btn => {
      btn.addEventListener('click', e => {
        const sIdx = Number(e.currentTarget.dataset.stageIndex);
        const itIdx = Number(e.currentTarget.dataset.itemIndex);
        openTargetsModal(sIdx, itIdx);
      });
    });

    // Canvas scroll updates SVG
    const canvas = document.getElementById('ts-odn-canvas');
    if (canvas) {
      canvas.addEventListener('scroll', () => updateSvg());
    }

    if (_resizeObserver) _resizeObserver.disconnect();
    _resizeObserver = new ResizeObserver(() => updateSvg());
    if (canvas) _resizeObserver.observe(canvas);
  }

  function openAddItemModal(sIdx) {
    const all = [
      ...(_techCatalog.language || []).map(l => ({ ...l, isLang: true })),
      ...(_techCatalog.tool || []).map(t => ({ ...t, isLang: false })),
    ];

    const modal = document.createElement('div');
    modal.className = 'ts-modal-back';
    modal.innerHTML = `
      <div class="ts-modal-box">
        <div style="padding:16px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
          <h3 style="font-size:15px;font-weight:700;color:#0f172a">Añadir Tecnología a la Columna</h3>
          <button type="button" id="ts-mod-close" style="background:none;border:none;font-size:18px;color:#94a3b8;cursor:pointer">&times;</button>
        </div>
        <div style="padding:12px 20px;border-bottom:1px solid #f1f5f9;background:#f8fafc">
          <input type="text" id="ts-mod-search" placeholder="Buscar tecnología o lenguaje…" style="width:100%;padding:8px 12px;font-size:12px;border:1px solid var(--border);border-radius:8px">
        </div>
        <div id="ts-mod-list" style="padding:14px 20px;overflow-y:auto;flex:1;max-height:360px;display:flex;flex-direction:column;gap:6px">
          ${renderModalItems(all)}
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('ts-mod-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    document.getElementById('ts-mod-search').addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = all.filter(item => (item.name || '').toLowerCase().includes(q));
      document.getElementById('ts-mod-list').innerHTML = renderModalItems(filtered);
      attachModalItemClicks();
    });

    function attachModalItemClicks() {
      document.querySelectorAll('.ts-mod-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tName = btn.dataset.name;
          const match = all.find(x => x.name === tName);
          if (match) {
            const plans = Array.isArray(match.plans) && match.plans.length ? match.plans : [{ name: 'Free / Gratis', costo: 0, moneda: 'USD', periodo: 'mes' }];
            const defaultPlan = plans[0] || {};
            _activeStack.stages[sIdx].items.push({
              id: 'node_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
              tech_id: match.id,
              name: match.name,
              category: match.category || (match.isLang ? 'lenguaje' : 'herramienta'),
              image_url: match.image_url || '',
              plan_name: defaultPlan.name || 'Free',
              costo: Number(defaultPlan.costo) || 0,
              moneda: defaultPlan.moneda || 'USD',
              periodo: defaultPlan.periodo || 'mes',
              targets: [],
            });
            close();
            renderBuilder();
          }
        });
      });
    }

    attachModalItemClicks();
  }

  function renderModalItems(items) {
    if (!items.length) {
      return '<p style="text-align:center;color:#94a3b8;font-size:12px;padding:20px">No se encontraron tecnologías</p>';
    }
    return items.map(t => {
      const avatar = t.image_url
        ? `<div style="width:28px;height:28px;border-radius:6px;background:#fff;border:1px solid #e2e8f0;display:inline-flex;align-items:center;justify-content:center;padding:2px"><img src="${esc(thumbUrl(t.image_url, 64))}" style="max-width:100%;max-height:100%;object-fit:contain" alt=""></div>`
        : `<span style="width:28px;height:28px;border-radius:6px;background:#ecfdf5;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0f766e">${esc((t.name || '?').charAt(0).toUpperCase())}</span>`;

      return `
        <button type="button" class="ts-mod-item-btn" data-name="${esc(t.name)}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid #f1f5f9;border-radius:8px;background:#fff;cursor:pointer;text-align:left;width:100%;transition:background 0.15s">
          ${avatar}
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700;color:#1e293b">${esc(t.name)}</div>
            <div style="font-size:10px;color:var(--text-muted);text-transform:capitalize">${esc(t.category || (t.isLang ? 'lenguaje' : 'herramienta'))}</div>
          </div>
          <span style="font-size:11px;font-weight:700;color:#059669">+ Seleccionar</span>
        </button>
      `;
    }).join('');
  }

  function openTargetsModal(sIdx, itIdx) {
    const item = _activeStack.stages[sIdx]?.items[itIdx];
    const nextStage = _activeStack.stages[sIdx + 1];
    if (!item || !nextStage) return;

    const nextItems = nextStage.items || [];
    const currentTargets = Array.isArray(item.targets) ? item.targets : [];

    const modal = document.createElement('div');
    modal.className = 'ts-modal-back';
    modal.innerHTML = `
      <div class="ts-modal-box">
        <div style="padding:16px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
          <div>
            <h3 style="font-size:15px;font-weight:700;color:#0f172a">Ramificar "${esc(item.name)}"</h3>
            <p style="font-size:11px;color:var(--text-muted);margin-top:2px">Selecciona a qué tecnologías de la siguiente columna se conecta:</p>
          </div>
          <button type="button" id="ts-tgt-close" style="background:none;border:none;font-size:18px;color:#94a3b8;cursor:pointer">&times;</button>
        </div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto">
          ${nextItems.map(tgt => {
            const isChecked = currentTargets.length === 0 || currentTargets.includes(tgt.id);
            return `
              <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid #f1f5f9;border-radius:8px;background:#f8fafc;cursor:pointer">
                <input type="checkbox" class="ts-tgt-check" value="${esc(tgt.id)}" ${isChecked ? 'checked' : ''} style="accent-color:#0f766e">
                <span style="font-size:12px;font-weight:700;color:#1e293b">${esc(tgt.name)}</span>
              </label>
            `;
          }).join('')}
        </div>
        <div style="padding:12px 20px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;gap:8px">
          <button type="button" id="ts-tgt-apply" class="btn btn-primary" style="padding:6px 14px;font-size:12px">Aplicar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('ts-tgt-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    document.getElementById('ts-tgt-apply').addEventListener('click', () => {
      const checked = Array.from(modal.querySelectorAll('.ts-tgt-check:checked')).map(cb => cb.value);
      if (checked.length === nextItems.length) {
        item.targets = [];
      } else {
        item.targets = checked;
      }
      close();
      renderBuilder();
    });
  }

  window.initTechStackOdn = initTechStackOdn;
})(window);
