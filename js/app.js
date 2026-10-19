/* KKLCSL Playground — Neumorphism 交互层
   保留真实功能：真实年轮数据（16 专辑）、真实截图、标注可输入演示、CPA 三档切换。
   交互规则照抄样稿：hover 阴影缩小、active 转 inset、分段选中凹陷、
   输入 focus 内凹变浅、全站 300ms ease-in-out、reduced-motion 关闭动画。 */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let RINGS = [];

  /* ================================================================ 首屏舞台 */

  const stage = $("[data-stage]");
  const projectButtons = $$("[data-k]");
  let currentProject = "rings";

  const SHOTS = {
    imagora: {
      src: "assets/imagora-main.png",
      alt: "Imagora 的无限画布：提示词卡片、图片组与连线",
      name: "Imagora",
      note: "本机 AI 生图工作台，提示词与编排在同一张画布上",
      href: "https://github.com/Cogniform/imagora",
    },
    annotator: {
      src: "assets/annotator.png",
      alt: "网页标注：在页面里选中标题并写下批注",
      name: "网页标注",
      note: "在网页上圈出问题，就地写下批注",
      href: "https://github.com/cslkkl/dsh-web-annotator",
    },
    cpa: {
      src: "assets/cpa.png",
      alt: "CPA 切换器：演示账号卡与额度汇总",
      name: "CPA 切换器",
      note: "账号与额度，就在当前工作区",
      href: "https://github.com/cslkkl/dsh-cpa-switch",
    },
  };

  /* --- 首屏年轮：16 条真实凹槽 --- */
  function renderDial(rings) {
    const dial = document.createElement("div");
    dial.className = "dial";
    dial.setAttribute("role", "group");
    dial.setAttribute("aria-label", "声之年轮：一张专辑一圈，可点选");

    // 从外到内排列，凹槽间距按专辑数量均分
    const sorted = rings.slice().sort((a, b) => a.ring.r - b.ring.r);
    const OUTER = 7;
    // 中央圆盘占 inset 45%，凹槽收在它外面，选中态才看得见
    const INNER = 30;
    const step = sorted.length > 1 ? (INNER - OUTER) / (sorted.length - 1) : 0;

    // DOM 顺序必须"由外到内"：后插入的圆更小、盖在上层，
    // 这样点击某个半径时命中的正好是那条凹槽，而不是最外圈整盘。
    sorted
      .slice()
      .reverse()
      .forEach((ring, i) => {
      const g = document.createElement("div");
      g.className = "dial__groove";
      g.style.inset = `${(OUTER + step * i).toFixed(2)}%`;
      g.dataset.id = ring.id;
      g.setAttribute("role", "button");
      g.setAttribute("tabindex", "0");
      g.setAttribute("aria-pressed", "false");
      g.setAttribute("aria-label", `${ring.year} 年 ${ring.album}，${ring.tracks} 首`);
      dial.appendChild(g);
    });

    const center = document.createElement("div");
    center.className = "dial__center";
    center.innerHTML = `<strong data-dial-year>2000</strong><span data-dial-label>Jay · 10 首</span>`;
    dial.appendChild(center);

    stage.innerHTML = "";
    stage.appendChild(dial);

    const yearEl = $("[data-dial-year]", dial);
    const labelEl = $("[data-dial-label]", dial);

    function select(id) {
      const picked = sorted.find((r) => r.id === id);
      if (!picked) return;
      $$(".dial__groove", dial).forEach((g) => {
        g.setAttribute("aria-pressed", String(g.dataset.id === id));
      });
      yearEl.textContent = String(picked.year);
      labelEl.textContent = `${picked.album} · ${picked.tracks} 首`;
    }

    // 凹槽是同心圆，靠 DOM 层叠判断会有 ±1 圈的误差；
    // 这里直接按「指针到圆心的半径」找最近的那条凹槽，点哪圈就是哪圈。
    dial.addEventListener("click", (e) => {
      const rect = dial.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      const radiusPct = (dist / (rect.width / 2)) * 50; // 0 = 圆心, 50 = 外缘

      const grooves = $$(".dial__groove", dial);
      let best = null;
      let bestDelta = Infinity;
      grooves.forEach((g) => {
        const inset = parseFloat(g.style.inset);
        const grooveRadius = 50 - inset; // 该圈半径（百分比）
        const delta = Math.abs(grooveRadius - radiusPct);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = g;
        }
      });
      if (best) select(best.dataset.id);
    });
    dial.addEventListener("keydown", (e) => {
      if (!["Enter", " ", "Spacebar"].includes(e.key)) return;
      const g = e.target.closest(".dial__groove");
      if (!g) return;
      e.preventDefault();
      select(g.dataset.id);
    });

    // 默认选中最早一张
    if (sorted.length) select(sorted[0].id);
  }

  function renderShot(key) {
    const shot = SHOTS[key];

    // 截图 + 下方凹陷信息条：让非年轮状态的右栏与年轮刻度盘重量一致，
    // 同时补上首屏缺的项目入口
    const stack = document.createElement("div");
    stack.className = "stage__stack";
    stack.innerHTML = `
      <div class="screen">
        <button class="screen__zoom" type="button" data-zoom="${shot.src}" data-zoom-alt="${shot.alt}"
                aria-label="放大查看：${shot.alt}">
          <img src="${shot.src}" alt="${shot.alt}">
        </button>
      </div>
      <div class="stage-info">
        <div class="stage-info__text">
          <span class="stage-info__name">${shot.name}</span>
          <span class="stage-info__note">${shot.note}</span>
        </div>
        <a class="btn btn--sm" href="${shot.href}" target="_blank" rel="noopener">查看项目</a>
      </div>`;

    stage.innerHTML = "";
    stage.appendChild(stack);
    bindZoom($(".screen__zoom", stack));
  }

  function renderStage(key) {
    if (key === "rings") renderDial(RINGS);
    else renderShot(key);
  }

  projectButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.k;
      if (key === currentProject) return;
      currentProject = key;
      projectButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      renderStage(key);
    });
  });

  /* ================================================================ 小刻度盘（相邻三年） */

  let miniIndex = 0;

  function renderMinidial() {
    const host = $("[data-minidial]");
    if (!host || !RINGS.length) return;

    // 每次显示当前年份及其前后各一张，共三条凹槽
    const windowRings = [
      RINGS[Math.max(0, miniIndex - 1)],
      RINGS[miniIndex],
      RINGS[Math.min(RINGS.length - 1, miniIndex + 1)],
    ];

    host.innerHTML = "";
    // 外层=较早，内层=较晚；三条凹槽按 8/24/40% 由外到内
    const insets = [8, 24, 40];
    windowRings.forEach((ring, i) => {
      const g = document.createElement("div");
      g.className = "minidial__groove";
      g.style.inset = `${insets[i]}%`;
      g.dataset.id = ring.id;
      g.setAttribute("role", "button");
      g.setAttribute("tabindex", "0");
      g.setAttribute("aria-pressed", String(ring.id === RINGS[miniIndex].id));
      g.setAttribute("aria-label", `${ring.year} 年 ${ring.album}，${ring.tracks} 首`);
      host.appendChild(g);
    });

    const center = document.createElement("div");
    center.className = "minidial__center";
    const cur = RINGS[miniIndex];
    center.innerHTML = `<strong>${cur.year}</strong><span>${cur.album}</span>`;
    host.appendChild(center);

    $("[data-mini-year]").textContent = String(cur.year);
    $("[data-mini-album]").textContent = cur.album;
    $("[data-mini-tracks]").textContent = String(cur.tracks);

    const pick = (id) => {
      const idx = RINGS.findIndex((r) => r.id === id);
      if (idx < 0) return;
      miniIndex = idx;
      renderMinidial();
    };

    host.addEventListener("click", (e) => {
      const g = e.target.closest(".minidial__groove");
      if (g) pick(g.dataset.id);
    });
    host.addEventListener("keydown", (e) => {
      if (!["Enter", " ", "Spacebar"].includes(e.key)) return;
      const g = e.target.closest(".minidial__groove");
      if (!g) return;
      e.preventDefault();
      pick(g.dataset.id);
    });
  }

  /* ================================================================ 标注演示 */

  const annot = $("[data-annot]");
  if (annot) {
    const targets = $$(".page__target", annot);
    const input = $("[data-comment-input]", annot);
    const buildBtn = $("[data-build]", annot);
    const hint = $("[data-annot-hint]", annot);
    const bubble = $("[data-comment]", annot);
    const bubbleText = $("[data-comment-text]", annot);
    const result = $("[data-context-result]", annot);
    const outTarget = $("[data-out-target]", annot);
    const outComment = $("[data-out-comment]", annot);
    const outJson = $("[data-out-json]", annot);

    const META = {
      title: { label: "标题", tag: "h4", selector: ".page__text--title" },
      body: { label: "正文", tag: "p", selector: ".page__text:not(.page__text--title)" },
    };
    let selected = null;

    function sync() {
      const text = input.value.trim();
      buildBtn.disabled = !(selected && text);
      if (!selected) hint.textContent = "独立演示 · 先选一处";
      else if (!text) hint.textContent = `已选中「${META[selected].label}」· 写下批注`;
      else hint.textContent = "独立演示 · 可以生成上下文了";
    }

    targets.forEach((btn) => {
      btn.addEventListener("click", () => {
        selected = btn.dataset.target;
        targets.forEach((t) => t.setAttribute("aria-pressed", String(t === btn)));
        result.hidden = true;
        bubble.hidden = true;
        sync();
        input.focus();
      });
    });

    input.addEventListener("input", () => {
      result.hidden = true;
      const v = input.value.trim();
      bubble.hidden = !v;
      if (v) bubbleText.textContent = v;
      sync();
    });

    buildBtn.addEventListener("click", () => {
      if (!selected) return;
      const meta = META[selected];
      const text = $(`[data-target-${selected}]`, annot).textContent.trim();
      const comment = input.value.trim();

      bubbleText.textContent = comment;
      bubble.hidden = false;

      outTarget.textContent = `${meta.label}（${meta.tag}）${text}`;
      outComment.textContent = comment;
      outJson.textContent = JSON.stringify(
        { 元素: meta.tag, 选择器: meta.selector, 文本: text, 批注: comment, 范围: "本地演示页" },
        null,
        2
      );
      result.hidden = false;
      hint.textContent = "已生成 · 仅本地文本";
    });

    sync();
  }

  /* ================================================================ CPA */

  const ACCOUNTS = {
    A: { name: "Demo Account A", balance: 12000, signed: true },
    B: { name: "Demo Account B", balance: 8600, signed: false },
    C: { name: "Demo Account C", balance: 56000, signed: true },
  };

  const cpa = $("[data-cpa]");
  if (cpa) {
    const nameEl = $("[data-account-name]", cpa);
    const statusEl = $("[data-account-status]", cpa);
    const balanceEl = $("[data-account-balance]", cpa);
    const btns = $$("[data-account]", cpa);
    const fmt = (n) => n.toLocaleString("en-US");

    function paint(key) {
      const acc = ACCOUNTS[key];
      nameEl.textContent = acc.name;
      statusEl.textContent = acc.signed ? "已启用 · 已签到" : "已启用 · 未签到";
      balanceEl.textContent = fmt(acc.balance);
      btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.account === key)));
    }

    btns.forEach((b) => b.addEventListener("click", () => paint(b.dataset.account)));
    paint("A");
  }

  /* ================================================================ 索引 */

  const PROJECTS_INDEX = [
    { name: "Imagora", desc: "图像生成与画布编排", credit: "参与开发", kind: "contrib", href: "https://github.com/Cogniform/imagora", cta: "查看项目" },
    { name: "声之年轮", desc: "用时间组织唱片目录", credit: "个人作品", kind: "own", href: "https://github.com/cslkkl/discography-showcase", cta: "查看项目" },
    { name: "网页标注", desc: "带着页面上下文表达问题", credit: "个人作品", kind: "own", href: "https://github.com/cslkkl/dsh-web-annotator", cta: "查看项目" },
    { name: "CPA 切换器", desc: "把账号管理带回工作区", credit: "个人作品", kind: "own", href: "https://github.com/cslkkl/dsh-cpa-switch", cta: "查看项目" },
    { name: "WorkBuddy Bridge", desc: "额度与模型档位信息改进", credit: "上游贡献", kind: "contrib", href: "https://github.com/dsh-plugin-lab/dsh-workbuddy-bridge/pull/3", cta: "查看贡献" },
  ];

  const projectList = $("[data-project-list]");
  if (projectList) {
    projectList.innerHTML = PROJECTS_INDEX.map(
      (p) => `
      <div class="row" data-kind="${p.kind}">
        <strong>${p.name}</strong>
        <span>${p.desc}</span>
        <span class="credit">${p.credit}</span>
        <a class="btn btn--sm" href="${p.href}" target="_blank" rel="noopener">${p.cta}</a>
      </div>`
    ).join("");

    const filters = $$("[data-filter]");
    filters.forEach((btn) => {
      btn.addEventListener("click", () => {
        const f = btn.dataset.filter;
        filters.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        $$(".row", projectList).forEach((row) => {
          row.hidden = !(f === "all" || row.dataset.kind === f);
        });
      });
    });
  }

  /* ================================================================ 放大层（无位移） */

  const lightbox = $("[data-lightbox]");
  const lbImg = $("[data-lightbox-img]");
  const lbCap = $("[data-lightbox-cap]");
  const lbClose = $(".lightbox__close");
  let lastFocused = null;

  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeLightbox();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      lbClose.focus();
    }
  }

  function openLightbox(src, alt) {
    if (!lightbox || !src) return;
    lastFocused = document.activeElement;
    lbImg.src = src;
    lbImg.alt = alt || "";
    lbCap.textContent = alt || "";
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lbClose.focus({ preventScroll: true });
    document.addEventListener("keydown", onKey);
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function bindZoom(el) {
    if (!el || el.dataset.zoomBound === "1") return;
    el.dataset.zoomBound = "1";
    el.addEventListener("click", () => openLightbox(el.dataset.zoom, el.dataset.zoomAlt));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(el.dataset.zoom, el.dataset.zoomAlt);
      }
    });
  }

  $$("[data-zoom]").forEach(bindZoom);
  lightbox?.querySelectorAll("[data-lightbox-close]").forEach((el) => {
    el.addEventListener("click", closeLightbox);
  });

  /* ================================================================ 初始化 */

  fetch("data/year-rings.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((data) => {
      RINGS = data.rings || [];
      renderStage(currentProject);
      renderMinidial();
      bindZoom($(".screen__zoom"));
    })
    .catch(() => {
      // 数据失败也要可读：给出说明，其余作品仍可查看
      stage.innerHTML = `<div class="screen"><div class="note">年轮数据未载入，其余作品仍可查看。</div></div>`;
      $("[data-mini-album]").textContent = "未载入";
    });
})();
