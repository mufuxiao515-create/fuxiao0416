/* =========================================
   FUXIAO0416::HUB — Core Engine
   登录验证 / 文件管理 / 音效 / 粒子 / 全交互
   ========================================= */

const AUTHORIZED_EMAIL = 'fuxiao0416@qq.com';
const STORAGE_PREFIX = 'fuxiao0416_';

// ==========================================
// STORAGE LAYER
// ==========================================
const Store = {
    get(key, fallback = null) {
        try {
            const v = localStorage.getItem(STORAGE_PREFIX + key);
            return v ? JSON.parse(v) : fallback;
        } catch { return fallback; }
    },
    set(key, val) {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
    },
    remove(key) {
        localStorage.removeItem(STORAGE_PREFIX + key);
    },
    clearAll() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k.startsWith(STORAGE_PREFIX)) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
    }
};

// ==========================================
// SOUND ENGINE — Web Audio API 音效
// ==========================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = { click: true, hover: true, action: true };
        this.loadSettings();
    }

    loadSettings() {
        this.enabled.click = Store.get('sfx_click', true);
        this.enabled.hover = Store.get('sfx_hover', true);
        this.enabled.action = Store.get('sfx_action', true);
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    play(type) {
        if (!this.ctx) return;
        try {
            switch (type) {
                case 'click': if (this.enabled.click) this._click(); break;
                case 'hover': if (this.enabled.hover) this._hover(); break;
                case 'success': if (this.enabled.action) this._success(); break;
                case 'error': if (this.enabled.action) this._error(); break;
                case 'upload': if (this.enabled.action) this._upload(); break;
                case 'delete': if (this.enabled.action) this._delete(); break;
                case 'navigate': if (this.enabled.click) this._navigate(); break;
            }
        } catch (e) { /* silent */ }
    }

    _osc(freq, dur, type = 'sine', vol = 0.08) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, this.ctx.currentTime);
        g.gain.setValueAtTime(vol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start();
        o.stop(this.ctx.currentTime + dur);
    }

    _click() {
        this._osc(800, 0.08, 'square', 0.04);
        this._osc(1200, 0.05, 'sine', 0.03);
    }

    _hover() {
        this._osc(600, 0.06, 'sine', 0.02);
    }

    _success() {
        this._osc(523, 0.1, 'sine', 0.06);
        setTimeout(() => this._osc(659, 0.1, 'sine', 0.06), 80);
        setTimeout(() => this._osc(784, 0.15, 'sine', 0.06), 160);
    }

    _error() {
        this._osc(200, 0.15, 'sawtooth', 0.06);
        setTimeout(() => this._osc(180, 0.2, 'sawtooth', 0.05), 120);
    }

    _upload() {
        this._osc(400, 0.08, 'sine', 0.05);
        setTimeout(() => this._osc(600, 0.08, 'sine', 0.05), 60);
        setTimeout(() => this._osc(900, 0.12, 'sine', 0.05), 120);
    }

    _delete() {
        this._osc(600, 0.1, 'square', 0.04);
        setTimeout(() => this._osc(300, 0.2, 'square', 0.04), 80);
    }

    _navigate() {
        this._osc(500, 0.06, 'triangle', 0.04);
        this._osc(700, 0.06, 'triangle', 0.03);
    }
}

const sfx = new SoundEngine();

// ==========================================
// TOAST
// ==========================================
function toast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ==========================================
// LOADING
// ==========================================
class Loader {
    constructor() {
        this.el = document.getElementById('loading-screen');
        this.bar = document.getElementById('loader-bar');
        this.pct = document.getElementById('loader-pct');
        this.status = document.getElementById('loader-status');
    }
    run() {
        return new Promise(resolve => {
            // 安全检查：如果关键元素不存在，直接跳过加载动画
            if (!this.el || !this.bar || !this.pct) {
                if (this.el) this.el.classList.add('done');
                resolve();
                return;
            }

            const msgs = ['CONNECTING...', 'LOADING ASSETS...', 'INIT RENDER ENGINE...', 'DECRYPTING...', 'CALIBRATING...', 'READY.'];
            let p = 6; // 让进度条一开始就动起来，避免 0% 停留
            const start = performance.now();
            const MAX = 1600; // 最长 1.6s 内结束
            const STEP_MIN = 14;
            const STEP_MAX = 22;

            const apply = (val) => {
                this.bar.style.width = val + '%';
                this.pct.textContent = Math.floor(val) + '%';
                if (this.status) this.status.textContent = msgs[Math.min(Math.floor(val / 18), msgs.length - 1)];
            };

            const tick = () => {
                try {
                    const elapsed = performance.now() - start;
                    const target = Math.max(p + (Math.random() * (STEP_MAX - STEP_MIN) + STEP_MIN), (elapsed / MAX) * 100);
                    p = Math.min(target, 100);
                    apply(p);

                    if (p >= 99 || elapsed >= MAX) {
                        apply(100);
                        setTimeout(() => { this.el.classList.add('done'); resolve(); }, 320);
                        return;
                    }
                    setTimeout(tick, 90);
                } catch (e) {
                    console.error('[Loader] Error:', e);
                    this.el.classList.add('done');
                    resolve();
                }
            };

            apply(p);
            setTimeout(tick, 90);
        });
    }

}

// ==========================================
// LOGIN
// ==========================================
class Login {
    constructor(onSuccess) {
        this.screen = document.getElementById('login-screen');
        this.emailInput = document.getElementById('login-email');
        this.btn = document.getElementById('login-btn');
        this.error = document.getElementById('login-error');
        this.onSuccess = onSuccess;
        this.initParticles();
        this.bind();
    }

    bind() {
        this.btn.addEventListener('click', () => this.verify());
        this.emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.verify(); });

        // 点击登录面板外部关闭
        this.screen.addEventListener('click', (e) => {
            const loginFrame = this.screen.querySelector('.login-frame');
            if (loginFrame && !loginFrame.contains(e.target)) {
                this.screen.classList.add('hidden');
            }
        });
    }

    verify() {
        sfx.init();
        sfx.play('click');
        const email = this.emailInput.value.trim().toLowerCase();
        if (email === AUTHORIZED_EMAIL) {
            sfx.play('success');
            Store.set('logged_in', true);
            document.body.classList.add('logged-in');
            this.screen.classList.add('hidden');
            this.onSuccess();
        } else {
            sfx.play('error');
            this.error.classList.remove('hidden');
            this.emailInput.style.borderBottomColor = '#ff4455';
            setTimeout(() => {
                this.error.classList.add('hidden');
                this.emailInput.style.borderBottomColor = '';
            }, 3000);
        }
    }

    initParticles() {
        const canvas = document.getElementById('login-particles');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let w, h, particles = [];
        const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
                s: Math.random() * 1.5 + 0.5, o: Math.random() * 0.4 + 0.1
            });
        }
        const draw = () => {
            if (this.screen.classList.contains('hidden')) return;
            ctx.clearRect(0, 0, w, h);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
                ctx.fillStyle = '#1e90ff'; ctx.globalAlpha = p.o; ctx.fill();
            });
            ctx.globalAlpha = 1;
            requestAnimationFrame(draw);
        };
        draw();
    }
}

// ==========================================
// PARTICLE SYSTEM (main)
// ==========================================
class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('particle-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mx = 0; this.my = 0;
        this.active = true;
        this.resize();
        this.create();
        window.addEventListener('resize', () => { this.resize(); this.create(); });
        document.addEventListener('mousemove', e => { this.mx = e.clientX; this.my = e.clientY; });
        this.animate();
    }
    resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }
    create() {
        const n = Math.floor((this.canvas.width * this.canvas.height) / 18000);
        this.particles = [];
        const colors = ['#1e90ff', '#00e5ff', '#b44dff', '#ffffff'];
        for (let i = 0; i < n; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width, y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
                s: Math.random() * 1.5 + 0.5, o: Math.random() * 0.5 + 0.1,
                c: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }
    animate() {
        if (!this.active) { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); requestAnimationFrame(() => this.animate()); return; }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles.forEach((p, i) => {
            const dx = this.mx - p.x, dy = this.my - p.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 120) { const f = (120 - d) / 120; p.vx -= (dx / d) * f * 0.02; p.vy -= (dy / d) * f * 0.02; }
            p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99;
            if (p.x < 0) p.x = this.canvas.width; if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height; if (p.y > this.canvas.height) p.y = 0;
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
            this.ctx.fillStyle = p.c; this.ctx.globalAlpha = p.o; this.ctx.fill();
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dd = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
                if (dd < 90) {
                    this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y); this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = '#1e90ff'; this.ctx.globalAlpha = (1 - dd / 90) * 0.12;
                    this.ctx.lineWidth = 0.5; this.ctx.stroke();
                }
            }
        });
        this.ctx.globalAlpha = 1;
        requestAnimationFrame(() => this.animate());
    }
}

// ==========================================
// INTERACTIVE EFFECTS - 交互式动态效果
// ==========================================
class InteractiveEffects {
    constructor() {
        this.initMouseParallax();
        this.initCardGlow();
        this.initCollapseToggle();
        this.initHazardStripes();
        this.initClickRipple();
    }

    // 点击波纹
    initClickRipple() {
        const cursorLight = document.getElementById('cursor-light');

        // 光标光源跟随
        if (cursorLight) {
            document.addEventListener('mousemove', (e) => {
                cursorLight.style.left = e.clientX + 'px';
                cursorLight.style.top = e.clientY + 'px';
                cursorLight.style.backgroundPosition = `${-e.clientX + 250}px ${-e.clientY + 250}px`;
                if (!cursorLight.classList.contains('active')) {
                    cursorLight.classList.add('active');
                }
            });

            document.addEventListener('mouseleave', () => {
                cursorLight.classList.remove('active');
            });
        }

        // 点击波纹
        document.addEventListener('click', (e) => {
            const ripple = document.createElement('div');
            ripple.className = 'click-ripple';
            ripple.style.left = e.clientX + 'px';
            ripple.style.top = e.clientY + 'px';
            document.body.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    }

    // 生成独立警示条纹
    initHazardStripes() {
        const titleBars = document.querySelectorAll('.panel-title-bar');
        const MAX_W = 18;
        const MIN_W = 3;
        const STRIPE_FILL = 3 / 5;
        const DENSITY = 30;

        titleBars.forEach(bar => {
            const container = bar.querySelector('.panel-hazard-line');
            if (!container) return;
            let stripes = [], finalPos = [];
            const state = { hovering: false, expanded: false, enterAnim: null, exitAnim: null };
            function getBarWidth() { return bar.offsetWidth || 1200; }
            function buildStripes() {
                const bw = getBarWidth();
                const isMobile = window.innerWidth <= 768;
                const totalSpace = bw * STRIPE_FILL;
                container.innerHTML = ''; stripes = []; finalPos = [];

                // 手机端：只保留最右侧一根条纹
                if (isMobile) {
                    const w = MAX_W + 20;
                    const tx = bw - w + 20;
                    finalPos.push({ tx, w });
                    const el = document.createElement('span'); el.className = 'hazard-stripe';
                    el.style.width = w + 'px'; container.appendChild(el);
                    stripes.push({ el, arrived: false, opacity: 1 });
                    return;
                }

                const count = Math.max(6, Math.min(20, Math.round(totalSpace / DENSITY)));
                const widths = [], gaps = [];
                for (let i = 0; i < count; i++) { const t = i / Math.max(count - 1, 1); widths.push(MAX_W - t * (MAX_W - MIN_W)); }
                for (let i = 0; i < count; i++) gaps.push(widths[count - 1 - i]);
                const rawTotal = widths.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
                const sc = totalSpace / rawTotal;
                const sW = widths.map(w => Math.max(2, w * sc)), sG = gaps.map(g => Math.max(1, g * sc));
                let cr = 0;
                for (let i = 0; i < count; i++) {
                    let w = sW[i], tx;
                    if (i === 0) { w += 20; tx = bw - cr - w + 20; } else { tx = bw - cr - w; }
                    finalPos.push({ tx, w }); cr += (i === 0 ? sW[i] : w) + sG[i];
                }
                for (let i = 0; i < count; i++) {
                    const el = document.createElement('span'); el.className = 'hazard-stripe';
                    el.style.width = finalPos[i].w + 'px'; container.appendChild(el);
                    stripes.push({ el, arrived: false, opacity: 1 - (i / count) * 0.9 });
                }
            }
            buildStripes();
            function landStripe(i) {
                const s = stripes[i], p = finalPos[i];
                const tf = `translateX(${p.tx}px) skewX(-25deg)`;
                s.el.style.setProperty('--land-transform', tf);
                s.el.style.transform = tf; s.el.style.width = p.w + 'px'; s.el.style.opacity = s.opacity;
                s.el.classList.remove('landing'); void s.el.offsetWidth; s.el.classList.add('landing');
            }
            function resetStripe(i) {
                stripes[i].arrived = false; stripes[i].el.classList.remove('landing');
                stripes[i].el.style.transform = 'translateX(0) skewX(-25deg)'; stripes[i].el.style.opacity = '0';
            }
            function animateIn(cb) {
                if (state.exitAnim) { clearTimeout(state.exitAnim); state.exitAnim = null; }
                let i = 0;
                function next() {
                    if (i >= stripes.length) { if (cb) cb(); return; }
                    if (!state.hovering && !state.expanded) return;
                    stripes[i].arrived = true; landStripe(i); i++;
                    state.enterAnim = setTimeout(next, 10);
                }
                next();
            }
            function animateOut(cb) {
                if (state.enterAnim) { clearTimeout(state.enterAnim); state.enterAnim = null; }
                const bw = getBarWidth(); let i = 0;
                function next() {
                    while (i < stripes.length && !stripes[i].arrived) i++;
                    if (i >= stripes.length) { if (cb) cb(); return; }
                    stripes[i].arrived = false; stripes[i].el.classList.remove('landing');
                    stripes[i].el.style.transform = `translateX(${bw + 30}px) skewX(-25deg)`;
                    stripes[i].el.style.opacity = '0'; i++;
                    state.exitAnim = setTimeout(next, 7);
                }
                next();
            }
            bar.addEventListener('mouseenter', () => {
                state.hovering = true;
                if (!state.expanded) { stripes.forEach((_, i) => { if (!stripes[i].arrived) resetStripe(i); }); animateIn(); }
            });
            bar.addEventListener('mouseleave', () => { state.hovering = false; if (!state.expanded) animateOut(); });
            const panel = bar.closest('.section-panel');
            const obs = new MutationObserver(() => {
                const exp = panel.classList.contains('expanded');
                if (exp && !state.expanded) { state.expanded = true; if (!stripes.every(s => s.arrived)) animateIn(); }
                else if (!exp && state.expanded) { state.expanded = false; animateOut(); }
            });
            obs.observe(panel, { attributes: true, attributeFilter: ['class'] });
            window.addEventListener('resize', () => {
                const was = state.expanded; buildStripes();
                if (was) { stripes.forEach((s, i) => { s.arrived = true; const p = finalPos[i]; s.el.style.transform = `translateX(${p.tx}px) skewX(-25deg)`; s.el.style.width = p.w + 'px'; s.el.style.opacity = s.opacity; }); }
            });
        });
    }

    // 鼠标视差效果
    initMouseParallax() {
        let mouseX = 0, mouseY = 0;
        let targetX = 0, targetY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX - window.innerWidth / 2) / 50;
            mouseY = (e.clientY - window.innerHeight / 2) / 50;
        });

        const animate = () => {
            targetX += (mouseX - targetX) * 0.05;
            targetY += (mouseY - targetY) * 0.05;

            // 移动滑块
            document.querySelectorAll('.sliding-panel').forEach((panel, i) => {
                const speed = (i + 1) * 0.3;
                panel.style.transform = `translate(${targetX * speed}px, ${targetY * speed}px)`;
            });

            // 移动几何图形
            document.querySelectorAll('.geo-shape').forEach((shape, i) => {
                const speed = (i + 1) * 0.2;
                shape.style.transform = `translate(${targetX * speed}px, ${targetY * speed}px) rotate(${(Date.now() / 1000 + i * 72) % 360}deg)`;
            });

            // 移动渐变球体
            document.querySelectorAll('.gradient-orb').forEach((orb, i) => {
                const speed = (i + 1) * 0.5;
                orb.style.transform = `translate(${targetX * speed}px, ${targetY * speed}px) scale(${1 + Math.sin(Date.now() / 1500 + i) * 0.1})`;
            });

            requestAnimationFrame(animate);
        };

        animate();
    }

    // 卡片发光效果
    initCardGlow() {
        document.addEventListener('mousemove', (e) => {
            const cards = document.querySelectorAll('.glass-card');
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
        });
    }

    // 折叠/展开交互 - 工业风面板
    initCollapseToggle() {
        const panels = document.querySelectorAll('.section-panel');
        const titleBars = document.querySelectorAll('.panel-title-bar');
        const isLoggedIn = Store.get('logged_in', false);

        // 访客模式：禁用标题编辑
        if (!isLoggedIn) {
            document.querySelectorAll('.panel-title').forEach(title => {
                title.contentEditable = 'false';
            });
        }

        titleBars.forEach(bar => {
            bar.addEventListener('click', (e) => {
                // 登录状态下，如果正在编辑标题，不触发折叠
                if (isLoggedIn && e.target.classList.contains('panel-title')) {
                    if (document.activeElement === e.target) return;
                }

                const panel = bar.closest('.section-panel');
                const isExpanded = panel.classList.contains('expanded');

                if (isExpanded) {
                    panel.classList.remove('expanded');
                    panel.classList.add('collapsed');
                } else {
                    panel.classList.remove('collapsed');
                    panel.classList.add('expanded');

                    setTimeout(() => {
                        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            });
        });

        // 标题编辑 - 仅登录后生效
        if (isLoggedIn) {
            document.querySelectorAll('.panel-title').forEach(title => {
                title.addEventListener('click', (e) => {
                    if (document.activeElement === title) {
                        e.stopPropagation();
                    }
                });

                title.addEventListener('focus', (e) => {
                    e.stopPropagation();
                });

                title.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        title.blur();
                    }
                });

                title.addEventListener('blur', () => {
                    const sectionId = title.closest('.panel-title-bar').dataset.section;
                    const text = title.textContent.trim();
                    if (text) {
                        Store.set('panel_title_' + sectionId, text);
                    }
                });
            });
        }

        // 加载已保存的标题
        document.querySelectorAll('.panel-title').forEach(title => {
            const sectionId = title.closest('.panel-title-bar').dataset.section;
            const saved = Store.get('panel_title_' + sectionId);
            if (saved) {
                title.textContent = saved;
            }
        });
    }
}

// ==========================================
// CURSOR
// ==========================================
class Cursor {
    constructor() {
        this.dot = document.getElementById('cursor-dot');
        this.ring = document.getElementById('cursor-ring');
        if (window.innerWidth <= 768) return;
        this.mx = 0; this.my = 0; this.dx = 0; this.dy = 0; this.rx = 0; this.ry = 0;
        document.addEventListener('mousemove', e => { this.mx = e.clientX; this.my = e.clientY; });
        this.bindHover();
        this.loop();
    }
    bindHover() {
        document.addEventListener('mouseover', e => {
            if (e.target.closest('a,button,.file-item,.filter-btn,.upload-tab,.toggle-switch,.nav-music-ctrl,.nav-user,.stat-card,.channel-item,input,textarea,select,.upload-browse,.avatar-frame-large,.quick-upload-zone,.upload-dropzone')) {
                document.body.classList.add('cursor-hover');
            }
        });
        document.addEventListener('mouseout', e => {
            if (e.target.closest('a,button,.file-item,.filter-btn,.upload-tab,.toggle-switch,.nav-music-ctrl,.nav-user,.stat-card,.channel-item,input,textarea,select,.upload-browse,.avatar-frame-large,.quick-upload-zone,.upload-dropzone')) {
                document.body.classList.remove('cursor-hover');
            }
        });
    }
    loop() {
        this.dx += (this.mx - this.dx) * 0.15; this.dy += (this.my - this.dy) * 0.15;
        this.rx += (this.mx - this.rx) * 0.08; this.ry += (this.my - this.ry) * 0.08;
        if (this.dot) { this.dot.style.left = this.dx + 'px'; this.dot.style.top = this.dy + 'px'; }
        if (this.ring) { this.ring.style.left = this.rx + 'px'; this.ring.style.top = this.ry + 'px'; }
        requestAnimationFrame(() => this.loop());
    }
}

// ==========================================
// NAV
// ==========================================
class Nav {
    constructor() {
        this.nav = document.getElementById('main-nav');
        this.links = document.querySelectorAll('.nav-link');
        this.mobileBtn = document.getElementById('nav-menu-btn');
        this.mobileMenu = document.getElementById('mobile-menu');
        this.mobileLinks = document.querySelectorAll('.mobile-link');
        this.timeEl = document.getElementById('nav-time');
        this.secInd = document.getElementById('section-ind');
        this.lastY = 0;
        this.updateTime(); setInterval(() => this.updateTime(), 1000);
        window.addEventListener('scroll', () => this.onScroll());
        if (this.mobileBtn) this.mobileBtn.addEventListener('click', () => this.toggleMobile());
        [...this.links, ...this.mobileLinks].forEach(l => {
            l.addEventListener('click', e => {
                e.preventDefault();
                sfx.play('navigate');
                const s = l.getAttribute('data-section');
                document.getElementById(s)?.scrollIntoView({ behavior: 'smooth' });
                this.closeMobile();
            });
        });
    }
    updateTime() {
        const n = new Date();
        this.timeEl.textContent = [n.getHours(), n.getMinutes(), n.getSeconds()].map(v => String(v).padStart(2, '0')).join(':');
    }
    onScroll() {
        const y = window.scrollY;
        if (y > this.lastY && y > 100) this.nav.classList.add('nav-hide');
        else this.nav.classList.remove('nav-hide');
        this.lastY = y;
        const secs = ['dashboard', 'uploads', 'profile', 'settings', 'notes', 'bookmarks', 'journal'];
        let cur = 'dashboard';
        secs.forEach(id => { const el = document.getElementById(id); if (el && y >= el.offsetTop - 200) cur = id; });
        this.links.forEach(l => l.classList.toggle('active', l.getAttribute('data-section') === cur));
        this.secInd.textContent = `SECTION::0${secs.indexOf(cur) + 1}`;
    }
    toggleMobile() { this.mobileBtn.classList.toggle('active'); this.mobileMenu.classList.toggle('active'); document.body.style.overflow = this.mobileMenu.classList.contains('active') ? 'hidden' : ''; }
    closeMobile() { this.mobileBtn.classList.remove('active'); this.mobileMenu.classList.remove('active'); document.body.style.overflow = ''; }
}

// ==========================================
// FILE MANAGER
// ==========================================
class FileManager {
    constructor() {
        this.files = Store.get('files', []);
        this.bindUploads();
        this.bindTabs();
        this.bindFilters();
        this.bindCodeEditor();
        this.render();
    }

    bindUploads() {
        // Quick upload
        const qz = document.getElementById('quick-upload-zone');
        const qi = document.getElementById('quick-upload-input');
        const qb = document.getElementById('quick-upload-browse');
        if (qz) {
            qz.addEventListener('click', () => qi.click());
            qb?.addEventListener('click', e => { e.stopPropagation(); qi.click(); });
            qi.addEventListener('change', () => this.handleFiles(qi.files));
            qz.addEventListener('dragover', e => { e.preventDefault(); qz.classList.add('dragover'); });
            qz.addEventListener('dragleave', () => qz.classList.remove('dragover'));
            qz.addEventListener('drop', e => { e.preventDefault(); qz.classList.remove('dragover'); this.handleFiles(e.dataTransfer.files); });
        }
        // File dropzone
        const fz = document.getElementById('file-dropzone');
        const fi = document.getElementById('file-upload-input');
        if (fz) {
            fz.addEventListener('click', () => fi.click());
            fi.addEventListener('change', () => this.handleFiles(fi.files));
            fz.addEventListener('dragover', e => { e.preventDefault(); fz.classList.add('dragover'); });
            fz.addEventListener('dragleave', () => fz.classList.remove('dragover'));
            fz.addEventListener('drop', e => { e.preventDefault(); fz.classList.remove('dragover'); this.handleFiles(e.dataTransfer.files); });
        }
        // Text save
        document.getElementById('save-text-btn')?.addEventListener('click', () => this.saveText());
        // Code save
        document.getElementById('save-code-btn')?.addEventListener('click', () => this.saveCode());
    }

    bindTabs() {
        document.querySelectorAll('.upload-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                sfx.play('click');
                document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.upload-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('panel-' + tab.getAttribute('data-type'))?.classList.add('active');
            });
        });
    }

    bindFilters() {
        document.querySelectorAll('.content-filter .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                sfx.play('click');
                document.querySelectorAll('.content-filter .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.render(btn.getAttribute('data-filter'));
            });
        });
    }

    bindCodeEditor() {
        const ta = document.getElementById('code-content');
        const ln = document.getElementById('code-line-nums');
        if (ta && ln) {
            ta.addEventListener('input', () => {
                const lines = ta.value.split('\n').length;
                ln.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
            });
            ta.addEventListener('keydown', e => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const s = ta.selectionStart;
                    ta.value = ta.value.substring(0, s) + '    ' + ta.value.substring(ta.selectionEnd);
                    ta.selectionStart = ta.selectionEnd = s + 4;
                }
            });
        }
    }

    getFileType(name) {
        const ext = name.split('.').pop().toLowerCase();
        const map = {
            image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
            video: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv'],
            audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'],
            code: ['js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'rs', 'go', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'sh', 'bat', 'sql', 'rb', 'php', 'swift', 'kt'],
            archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
            text: ['txt', 'md', 'log', 'csv']
        };
        for (const [type, exts] of Object.entries(map)) {
            if (exts.includes(ext)) return type;
        }
        return 'other';
    }

    getFileIcon(type) {
        const icons = { image: '🖼️', video: '🎬', audio: '🎵', code: '💻', archive: '📦', text: '📄', other: '📎' };
        return icons[type] || '📎';
    }

    handleFiles(fileList) {
        sfx.play('upload');
        Array.from(fileList).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const entry = {
                    id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                    name: file.name,
                    type: this.getFileType(file.name),
                    size: file.size,
                    mime: file.type,
                    data: e.target.result,
                    date: new Date().toISOString()
                };
                this.files.unshift(entry);
                this.save();
                this.render();
                toast(`已上传: ${file.name}`, 'success');
            };
            if (file.size > 10 * 1024 * 1024) {
                toast('文件过大（>10MB），存储空间有限', 'error');
                sfx.play('error');
                return;
            }
            reader.readAsDataURL(file);
        });
    }

    saveText() {
        const title = document.getElementById('text-title').value.trim() || '未命名文本';
        const content = document.getElementById('text-content').value;
        if (!content) { toast('请输入内容', 'error'); sfx.play('error'); return; }
        sfx.play('success');
        const entry = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: title + '.txt',
            type: 'text',
            size: new Blob([content]).size,
            mime: 'text/plain',
            data: 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(content))),
            textContent: content,
            date: new Date().toISOString()
        };
        this.files.unshift(entry);
        this.save();
        this.render();
        document.getElementById('text-title').value = '';
        document.getElementById('text-content').value = '';
        toast('文本已保存', 'success');
    }

    saveCode() {
        const filename = document.getElementById('code-filename').value.trim() || 'untitled.js';
        const lang = document.getElementById('code-lang').value;
        const content = document.getElementById('code-content').value;
        if (!content) { toast('请输入代码', 'error'); sfx.play('error'); return; }
        sfx.play('success');
        const entry = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: filename,
            type: 'code',
            lang: lang,
            size: new Blob([content]).size,
            mime: 'text/plain',
            data: 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(content))),
            textContent: content,
            date: new Date().toISOString()
        };
        this.files.unshift(entry);
        this.save();
        this.render();
        document.getElementById('code-filename').value = '';
        document.getElementById('code-content').value = '';
        document.getElementById('code-line-nums').textContent = '1';
        toast('代码已保存', 'success');
    }

    deleteFile(id) {
        sfx.play('delete');
        this.files = this.files.filter(f => f.id !== id);
        this.save();
        this.render();
        toast('文件已删除', 'info');
    }

    save() {
        try { Store.set('files', this.files); }
        catch (e) {
            toast('存储空间不足，请清理旧文件', 'error');
        }
    }

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    render(filter = 'all') {
        const isLoggedIn = Store.get('logged_in', false);
        const filtered = filter === 'all' ? this.files : this.files.filter(f => f.type === filter);

        // Stats
        document.getElementById('stat-files').textContent = this.files.length;
        document.getElementById('stat-images').textContent = this.files.filter(f => f.type === 'image').length;
        document.getElementById('stat-videos').textContent = this.files.filter(f => f.type === 'video').length;
        document.getElementById('stat-code').textContent = this.files.filter(f => f.type === 'code').length;

        // Recent files
        const recentEl = document.getElementById('recent-files-list');
        const recent = this.files.slice(0, 6);
        if (recent.length === 0) {
            recentEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📂</div><p>暂无文件，快上传你的第一个内容吧</p></div>';
        } else {
            recentEl.innerHTML = recent.map(f => this._fileItemHTML(f, isLoggedIn)).join('');
        }

        // Content grid
        const gridEl = document.getElementById('content-grid');
        const emptyEl = document.getElementById('content-empty');
        if (filtered.length === 0) {
            gridEl.innerHTML = '<div class="empty-state" id="content-empty"><div class="empty-icon">🗃️</div><p>没有匹配的文件</p></div>';
        } else {
            gridEl.innerHTML = filtered.map(f => this._fileItemHTML(f, isLoggedIn)).join('');
        }

        // Bind events
        document.querySelectorAll('.fi-view').forEach(btn => {
            btn.addEventListener('click', (e) => { e.stopPropagation(); this.preview(btn.dataset.id); });
        });
        document.querySelectorAll('.fi-del').forEach(btn => {
            btn.addEventListener('click', (e) => { e.stopPropagation(); this.deleteFile(btn.dataset.id); });
        });
        document.querySelectorAll('.file-item').forEach(el => {
            el.addEventListener('click', () => this.preview(el.dataset.id));
        });
    }

    _fileItemHTML(f, isLoggedIn = true) {
        const d = new Date(f.date);
        const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
        return `
            <div class="file-item" data-id="${f.id}">
                <div class="fi-icon">${this.getFileIcon(f.type)}</div>
                <div class="fi-info">
                    <div class="fi-name">${f.name}</div>
                    <div class="fi-meta">${f.type.toUpperCase()} · ${this.formatSize(f.size)} · ${dateStr}</div>
                </div>
                <div class="fi-actions">
                    <button class="fi-btn fi-view" data-id="${f.id}" title="预览">👁</button>
                    ${isLoggedIn ? `<button class="fi-btn fi-del delete" data-id="${f.id}" title="删除">🗑</button>` : ''}
                </div>
            </div>
        `;
    }

    preview(id) {
        sfx.play('click');
        const f = this.files.find(x => x.id === id);
        if (!f) return;
        const modal = document.getElementById('file-modal');
        document.getElementById('fm-tag').textContent = f.type.toUpperCase();
        document.getElementById('fm-name').textContent = f.name;
        const body = document.getElementById('fm-body');

        if (f.type === 'image') {
            body.innerHTML = `<img class="fm-image" src="${f.data}" alt="${f.name}">`;
        } else if (f.type === 'video') {
            body.innerHTML = `<video class="fm-video" controls src="${f.data}"></video>`;
        } else if (f.type === 'audio') {
            body.innerHTML = `<div style="text-align:center;padding:40px"><div style="font-size:64px;margin-bottom:20px">🎵</div><p style="color:var(--t2);margin-bottom:20px">${f.name}</p><audio class="fm-audio" controls src="${f.data}"></audio></div>`;
        } else if (f.type === 'code') {
            const text = f.textContent || atob(f.data.split(',')[1]);
            body.innerHTML = `<pre class="fm-code">${this._escapeHtml(text)}</pre>`;
        } else if (f.type === 'text') {
            const text = f.textContent || decodeURIComponent(escape(atob(f.data.split(',')[1])));
            body.innerHTML = `<div class="fm-text">${this._escapeHtml(text)}</div>`;
        } else {
            body.innerHTML = `<div style="text-align:center;padding:60px"><div style="font-size:64px;margin-bottom:20px">${this.getFileIcon(f.type)}</div><p style="color:var(--t2)">${f.name}</p><p style="color:var(--t4);font-size:12px;margin-top:8px">${this.formatSize(f.size)}</p></div>`;
        }

        // Download
        document.getElementById('fm-download').onclick = () => {
            const a = document.createElement('a');
            a.href = f.data; a.download = f.name; a.click();
        };
        // Delete
        document.getElementById('fm-delete').onclick = () => {
            this.deleteFile(id);
            modal.classList.remove('active');
        };
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    _escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

// Close file modal
document.getElementById('fm-close')?.addEventListener('click', () => {
    document.getElementById('file-modal').classList.remove('active');
    document.body.style.overflow = '';
});
document.querySelector('.file-modal-backdrop')?.addEventListener('click', () => {
    document.getElementById('file-modal').classList.remove('active');
    document.body.style.overflow = '';
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.getElementById('file-modal').classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ==========================================
// PROFILE
// ==========================================
class Profile {
    constructor() {
        this.nickname = Store.get('nickname', 'OPERATOR');
        this.signature = Store.get('signature', '');
        this.avatar = Store.get('avatar', null);
        this.apply();
        this.bind();
    }

    bind() {
        const nn = document.getElementById('profile-nickname');
        const sig = document.getElementById('profile-signature');
        const saveBtn = document.getElementById('save-profile-btn');
        const avatarBtn = document.getElementById('avatar-edit-btn');
        const avatarInput = document.getElementById('avatar-input');

        if (nn) nn.value = this.nickname;
        if (sig) sig.value = this.signature;

        // Live preview
        nn?.addEventListener('input', () => {
            document.getElementById('preview-name').textContent = nn.value || 'OPERATOR';
            const letter = (nn.value || 'F')[0].toUpperCase();
            document.getElementById('preview-avatar-letter').textContent = letter;
        });
        sig?.addEventListener('input', () => {
            document.getElementById('preview-sig').textContent = sig.value || '// 还没有设置签名';
        });

        saveBtn?.addEventListener('click', () => {
            sfx.play('success');
            this.nickname = nn.value.trim() || 'OPERATOR';
            this.signature = sig.value.trim();
            Store.set('nickname', this.nickname);
            Store.set('signature', this.signature);
            this.apply();
            toast('资料已保存', 'success');
        });

        avatarBtn?.addEventListener('click', () => avatarInput.click());
        avatarInput?.addEventListener('change', () => {
            const file = avatarInput.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { toast('头像文件过大（>2MB）', 'error'); return; }
            const reader = new FileReader();
            reader.onload = (e) => {
                sfx.play('success');
                this.avatar = e.target.result;
                Store.set('avatar', this.avatar);
                this.apply();
                toast('头像已更新', 'success');
            };
            reader.readAsDataURL(file);
        });
    }

    apply() {
        // Dashboard name
        const dashName = document.getElementById('dash-username');
        if (dashName) { dashName.textContent = this.nickname; dashName.setAttribute('data-glitch', this.nickname); }

        // Nav avatar
        const navAv = document.getElementById('nav-user-avatar');
        if (navAv) {
            if (this.avatar) {
                navAv.querySelector('.nav-avatar-placeholder').innerHTML = `<img src="${this.avatar}">`;
            } else {
                navAv.querySelector('.nav-avatar-placeholder').textContent = (this.nickname || 'F')[0].toUpperCase();
            }
        }

        // Profile avatar
        const profAv = document.getElementById('profile-avatar');
        if (profAv) {
            if (this.avatar) {
                profAv.innerHTML = `<img src="${this.avatar}">`;
            } else {
                profAv.innerHTML = `<span class="avatar-letter">${(this.nickname || 'F')[0].toUpperCase()}</span>`;
            }
        }
        const avLetter = document.getElementById('avatar-letter');
        if (avLetter) avLetter.textContent = (this.nickname || 'F')[0].toUpperCase();

        // Preview
        document.getElementById('preview-name').textContent = this.nickname;
        document.getElementById('preview-sig').textContent = this.signature || '// 还没有设置签名';
        const prevAv = document.getElementById('preview-avatar');
        if (prevAv) {
            if (this.avatar) {
                prevAv.innerHTML = `<img src="${this.avatar}">`;
            } else {
                prevAv.innerHTML = `<span id="preview-avatar-letter">${(this.nickname || 'F')[0].toUpperCase()}</span>`;
            }
        }
    }
}

// ==========================================
// BGM PLAYER
// ==========================================
class BGMPlayer {
    constructor() {
        this.player = document.getElementById('bgm-player');
        this.toggle = document.getElementById('music-toggle');
        this.uploadBtn = document.getElementById('bgm-upload-btn');
        this.input = document.getElementById('bgm-input');
        this.controls = document.getElementById('bgm-controls');
        this.playBtn = document.getElementById('bgm-play-btn');
        this.removeBtn = document.getElementById('bgm-remove-btn');
        this.volSlider = document.getElementById('bgm-volume');
        this.nameEl = document.getElementById('bgm-name');
        this.progressFill = document.getElementById('bgm-progress-fill');
        this.currentEl = document.getElementById('bgm-current');
        this.playing = false;
        this.load();
        this.bind();
    }

    load() {
        const bgm = Store.get('bgm', null);
        if (bgm) {
            this.player.src = bgm.data;
            this.nameEl.textContent = bgm.name;
            this.controls.classList.remove('hidden');
            this.currentEl.querySelector('.bgm-status').textContent = bgm.name;
            this.player.volume = (Store.get('bgm_volume', 30)) / 100;
        }
    }

    bind() {
        this.uploadBtn?.addEventListener('click', () => this.input.click());
        this.input?.addEventListener('change', () => {
            const file = this.input.files[0];
            if (!file) return;
            sfx.play('upload');
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    Store.set('bgm', { name: file.name, data: e.target.result });
                } catch { toast('音频文件过大', 'error'); return; }
                this.player.src = e.target.result;
                this.nameEl.textContent = file.name;
                this.controls.classList.remove('hidden');
                this.currentEl.querySelector('.bgm-status').textContent = file.name;
                toast('背景音乐已设置', 'success');
            };
            reader.readAsDataURL(file);
        });

        this.toggle?.addEventListener('click', () => {
            sfx.play('click');
            if (!this.player.src || this.player.src === window.location.href) { toast('请先上传背景音乐', 'info'); return; }
            if (this.playing) { this.pause(); } else { this.play(); }
        });

        this.playBtn?.addEventListener('click', () => {
            sfx.play('click');
            if (this.playing) this.pause(); else this.play();
        });

        this.removeBtn?.addEventListener('click', () => {
            sfx.play('delete');
            this.pause();
            this.player.src = '';
            Store.remove('bgm');
            this.controls.classList.add('hidden');
            this.currentEl.querySelector('.bgm-status').textContent = '未设置背景音乐';
            this.nameEl.textContent = '--';
            toast('背景音乐已移除', 'info');
        });

        this.volSlider?.addEventListener('input', () => {
            this.player.volume = this.volSlider.value / 100;
            Store.set('bgm_volume', parseInt(this.volSlider.value));
        });

        this.player.addEventListener('timeupdate', () => {
            if (this.player.duration) {
                this.progressFill.style.width = (this.player.currentTime / this.player.duration * 100) + '%';
            }
        });
    }

    play() {
        this.player.play().then(() => {
            this.playing = true;
            this.toggle.classList.add('playing');
            this.playBtn.textContent = '⏸';
        }).catch(() => {});
    }

    pause() {
        this.player.pause();
        this.playing = false;
        this.toggle.classList.remove('playing');
        this.playBtn.textContent = '▶';
    }
}

// ==========================================
// SETTINGS
// ==========================================
class Settings {
    constructor(particles) {
        this.particles = particles;
        this.bind();
    }

    bind() {
        // SFX toggles
        document.getElementById('sfx-click-toggle')?.addEventListener('change', function () { sfx.enabled.click = this.checked; Store.set('sfx_click', this.checked); });
        document.getElementById('sfx-hover-toggle')?.addEventListener('change', function () { sfx.enabled.hover = this.checked; Store.set('sfx_hover', this.checked); });
        document.getElementById('sfx-action-toggle')?.addEventListener('change', function () { sfx.enabled.action = this.checked; Store.set('sfx_action', this.checked); });

        // Restore
        document.getElementById('sfx-click-toggle').checked = sfx.enabled.click;
        document.getElementById('sfx-hover-toggle').checked = sfx.enabled.hover;
        document.getElementById('sfx-action-toggle').checked = sfx.enabled.action;

        // FX toggles
        document.getElementById('fx-particles-toggle')?.addEventListener('change', function () {
            if (this.particles) this.particles.active = this.checked;
        }.bind(this));
        document.getElementById('fx-scanlines-toggle')?.addEventListener('change', function () {
            document.querySelector('.scanlines-overlay').style.display = this.checked ? '' : 'none';
        });
        document.getElementById('fx-glitch-toggle')?.addEventListener('change', function () {
            window._glitchEnabled = this.checked;
        });
        window._glitchEnabled = true;

        // Data management
        document.getElementById('clear-data-btn')?.addEventListener('click', () => {
            if (confirm('确定清除所有本地数据？此操作不可撤销。')) {
                sfx.play('delete');
                Store.clearAll();
                toast('数据已清除，即将重新加载', 'info');
                setTimeout(() => location.reload(), 1500);
            }
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            sfx.play('click');
            Store.remove('logged_in');
            location.reload();
        });
    }
}

// ==========================================
// GLITCH ENGINE
// ==========================================
class GlitchEngine {
    constructor() {
        setInterval(() => {
            if (window._glitchEnabled && Math.random() > 0.75) this.flash();
        }, 5000);
    }
    flash() {
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;inset:0;z-index:899;pointer-events:none;animation:screenFlash .15s ease;';
        if (!document.getElementById('glitch-css')) {
            const s = document.createElement('style');
            s.id = 'glitch-css';
            s.textContent = '@keyframes screenFlash{0%{opacity:0}10%{opacity:1;background:rgba(30,144,255,.02);transform:translateX(-2px)}20%{transform:translateX(2px) skewX(.3deg)}30%{background:rgba(180,77,255,.02);transform:translateX(-1px)}100%{opacity:0}}';
            document.head.appendChild(s);
        }
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 200);
    }
}

// ==========================================
// NOTES - 笔记模块
// ==========================================
class Notes {
    constructor() {
        this.content = Store.get('notes', '');
        const textarea = document.getElementById('notes-content');
        const saveBtn = document.getElementById('save-notes-btn');
        if (textarea) textarea.value = this.content;
        saveBtn?.addEventListener('click', () => {
            this.content = textarea.value;
            Store.set('notes', this.content);
            sfx.play('success');
            toast('笔记已保存', 'success');
        });
    }
}

// ==========================================
// BOOKMARKS - 书签模块
// ==========================================
class Bookmarks {
    constructor() {
        this.items = Store.get('bookmarks', []);
        this.render();
        document.getElementById('add-bookmark-btn')?.addEventListener('click', () => this.add());
    }

    add() {
        const title = document.getElementById('bookmark-title').value.trim();
        const url = document.getElementById('bookmark-url').value.trim();
        if (!url) { toast('请输入链接', 'error'); sfx.play('error'); return; }
        sfx.play('success');
        this.items.unshift({
            id: Date.now().toString(36),
            title: title || url,
            url: url,
            date: new Date().toISOString()
        });
        Store.set('bookmarks', this.items);
        document.getElementById('bookmark-title').value = '';
        document.getElementById('bookmark-url').value = '';
        this.render();
        toast('书签已添加', 'success');
    }

    remove(id) {
        sfx.play('delete');
        this.items = this.items.filter(b => b.id !== id);
        Store.set('bookmarks', this.items);
        this.render();
        toast('书签已删除', 'info');
    }

    render() {
        const el = document.getElementById('bookmarks-list');
        if (!el) return;
        if (this.items.length === 0) {
            el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔗</div><p>还没有收藏书签</p></div>';
            return;
        }
        el.innerHTML = this.items.map(b => `
            <div class="file-item" style="cursor:pointer;" onclick="window.open('${b.url}','_blank')">
                <div class="fi-icon">🔗</div>
                <div class="fi-info">
                    <div class="fi-name">${this._esc(b.title)}</div>
                    <div class="fi-meta">${this._esc(b.url)}</div>
                </div>
                <div class="fi-actions">
                    <button class="fi-btn fi-del delete" data-bmid="${b.id}" title="删除" onclick="event.stopPropagation()">🗑</button>
                </div>
            </div>
        `).join('');
        el.querySelectorAll('.fi-del').forEach(btn => {
            btn.addEventListener('click', () => this.remove(btn.dataset.bmid));
        });
    }

    _esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
}

// ==========================================
// JOURNAL - 日志模块
// ==========================================
class Journal {
    constructor() {
        this.entries = Store.get('journal', []);
        this.render();
        document.getElementById('add-journal-btn')?.addEventListener('click', () => this.add());
    }

    add() {
        const title = document.getElementById('journal-title').value.trim();
        const content = document.getElementById('journal-content').value.trim();
        if (!content) { toast('请输入日志内容', 'error'); sfx.play('error'); return; }
        sfx.play('success');
        const now = new Date();
        this.entries.unshift({
            id: Date.now().toString(36),
            title: title || now.toLocaleDateString('zh-CN'),
            content: content,
            date: now.toISOString()
        });
        Store.set('journal', this.entries);
        document.getElementById('journal-title').value = '';
        document.getElementById('journal-content').value = '';
        this.render();
        toast('日志已记录', 'success');
    }

    remove(id) {
        sfx.play('delete');
        this.entries = this.entries.filter(e => e.id !== id);
        Store.set('journal', this.entries);
        this.render();
        toast('日志已删除', 'info');
    }

    render() {
        const el = document.getElementById('journal-entries');
        if (!el) return;
        if (this.entries.length === 0) {
            el.innerHTML = '<div class="empty-state"><div class="empty-icon">📔</div><p>还没有日志记录</p></div>';
            return;
        }
        el.innerHTML = this.entries.map(e => {
            const d = new Date(e.date);
            const dateStr = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            return `
            <div class="glass-card" style="padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <div>
                        <span style="font-weight:600; font-size:15px;">${this._esc(e.title)}</span>
                        <span style="font-size:11px; color:var(--t4); margin-left:12px; font-family:var(--font-m);">${dateStr}</span>
                    </div>
                    <button class="fi-btn fi-del delete" data-jid="${e.id}" title="删除" style="flex-shrink:0;">🗑</button>
                </div>
                <div style="font-size:14px; color:var(--t2); line-height:1.8; white-space:pre-wrap;">${this._esc(e.content)}</div>
            </div>`;
        }).join('');
        el.querySelectorAll('.fi-del').forEach(btn => {
            btn.addEventListener('click', () => this.remove(btn.dataset.jid));
        });
    }

    _esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
}

// ==========================================
// SFX BINDING — hover & click sounds
// ==========================================
function bindGlobalSfx() {
    document.addEventListener('click', e => {
        const t = e.target.closest('a,button,.file-item,.filter-btn,.upload-tab,.toggle-switch,.nav-music-ctrl');
        if (t) {
            sfx.init();
            // Only play click if not already handled
            if (!t.classList.contains('btn-login') && !t.id?.includes('save') && !t.id?.includes('bgm')) {
                sfx.play('click');
            }
        }
    }, true);

    document.addEventListener('mouseenter', e => {
        const t = e.target.closest?.('a,button,.file-item,.stat-card,.settings-card');
        if (t) sfx.play('hover');
    }, true);
}

// ==========================================
// INIT
// ==========================================
async function init() {
    try {
        const loader = new Loader();
        await loader.run();
    } catch(e) {
        console.error('[init] Loader error:', e);
        const ls = document.getElementById('loading-screen');
        if (ls) ls.classList.add('done');
    }

    try {
        const isLoggedIn = Store.get('logged_in', false);

    // 未登录用户可以直接浏览，登录用户解锁全部功能
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    bootApp();

    // 如果已登录，添加 logged-in 类
    if (isLoggedIn) {
        document.body.classList.add('logged-in');
        // 已登录，隐藏登录入口
        const loginBtn = document.getElementById('nav-user-avatar');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                if (confirm('确定要退出登录？')) {
                    Store.remove('logged_in');
                    document.body.classList.remove('logged-in');
                    location.reload();
                }
            });
            loginBtn.style.cursor = 'pointer';
            loginBtn.title = '点击退出登录';
        }
    } else {
        // 未登录，显示提示横幅
        showGuestBanner();
    }
    } catch(e) {
        console.error('[init] Error:', e);
        // 确保loading screen消失
        const ls = document.getElementById('loading-screen');
        if (ls) ls.classList.add('done');
        const app = document.getElementById('main-app');
        if (app) app.classList.remove('hidden');
    }
}

function showGuestBanner() {
    const banner = document.createElement('div');
    banner.className = 'guest-banner';
    banner.innerHTML = `
        <span>👤 访客模式</span>
        <button id="guest-login-btn" class="laser-btn" title="登录解锁全部功能">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
                <circle cx="12" cy="16" r="1"/>
            </svg>
        </button>
    `;
    document.body.appendChild(banner);

    document.getElementById('guest-login-btn')?.addEventListener('click', () => {
        document.getElementById('login-screen').classList.remove('hidden');
        new Login(() => {
            banner.remove();
            // 重新渲染以显示删除按钮
            const fm = new FileManager();
            // 登录后重建手机端轮播，将设置面板加入滚动队列
            if (window.innerWidth <= 768 && window._mobileCarousel) {
                window._mobileCarousel.destroy();
                window._mobileCarousel = new MobileCarousel();
            }
        });
    });
}

// ==========================================
// STAR TRAIL - 星轨天体运动
// ==========================================
class StarTrail {
    constructor() {
        this.canvas = document.getElementById('star-trail-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.orbits = [];
        this.particles = [];
        this.time = 0;
        this.resize();
        this.createOrbits();
        this.createParticles();
        window.addEventListener('resize', () => { this.resize(); this.createOrbits(); });
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createOrbits() {
        const cx = this.canvas.width * 0.7;
        const cy = this.canvas.height * 0.3;
        this.orbits = [];
        // 多个同心椭圆轨道
        for (let i = 0; i < 5; i++) {
            const rx = 120 + i * 90;
            const ry = 60 + i * 50;
            const tilt = -15 + i * 5; // 度
            this.orbits.push({
                cx, cy, rx, ry,
                tilt: tilt * Math.PI / 180,
                speed: 0.0003 + i * 0.00008,
                opacity: 0.12 - i * 0.015,
                bodyAngle: Math.random() * Math.PI * 2,
                bodySpeed: 0.002 - i * 0.0003,
                bodySize: 2.5 - i * 0.3
            });
        }
    }

    createParticles() {
        // 星尘粒子 - 沿轨道分布
        this.particles = [];
        for (let i = 0; i < 40; i++) {
            const orbitIdx = Math.floor(Math.random() * this.orbits.length);
            this.particles.push({
                orbitIdx,
                angle: Math.random() * Math.PI * 2,
                speed: (0.001 + Math.random() * 0.002) * (Math.random() > 0.5 ? 1 : -1),
                size: Math.random() * 1.2 + 0.3,
                opacity: Math.random() * 0.4 + 0.1,
                trail: [] // 尾迹点
            });
        }
    }

    animate() {
        this.time++;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // 绘制轨道线（极细）
        this.orbits.forEach(o => {
            ctx.save();
            ctx.translate(o.cx, o.cy);
            ctx.rotate(o.tilt);
            ctx.beginPath();
            ctx.ellipse(0, 0, o.rx, o.ry, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,200,0,${o.opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.restore();
        });

        // 绘制天体（轨道上的亮点）
        this.orbits.forEach(o => {
            o.bodyAngle += o.bodySpeed;
            const bx = Math.cos(o.bodyAngle) * o.rx;
            const by = Math.sin(o.bodyAngle) * o.ry;

            ctx.save();
            ctx.translate(o.cx, o.cy);
            ctx.rotate(o.tilt);

            // 天体拖尾
            for (let t = 1; t <= 8; t++) {
                const ta = o.bodyAngle - t * 0.04;
                const tx = Math.cos(ta) * o.rx;
                const ty = Math.sin(ta) * o.ry;
                ctx.beginPath();
                ctx.arc(tx, ty, o.bodySize * (1 - t * 0.1), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,220,100,${0.15 - t * 0.015})`;
                ctx.fill();
            }

            // 天体本体
            ctx.beginPath();
            ctx.arc(bx, by, o.bodySize, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,240,200,0.7)';
            ctx.fill();

            // 发光
            ctx.beginPath();
            ctx.arc(bx, by, o.bodySize * 3, 0, Math.PI * 2);
            const glow = ctx.createRadialGradient(bx, by, 0, bx, by, o.bodySize * 3);
            glow.addColorStop(0, 'rgba(255,220,100,0.15)');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fill();

            ctx.restore();
        });

        // 绘制星尘粒子及尾迹
        this.particles.forEach(p => {
            const o = this.orbits[p.orbitIdx];
            if (!o) return;
            p.angle += p.speed;

            const px = Math.cos(p.angle) * o.rx;
            const py = Math.sin(p.angle) * o.ry;

            // 转换到世界坐标
            const cos = Math.cos(o.tilt);
            const sin = Math.sin(o.tilt);
            const wx = o.cx + px * cos - py * sin;
            const wy = o.cy + px * sin + py * cos;

            // 记录尾迹
            p.trail.push({ x: wx, y: wy });
            if (p.trail.length > 12) p.trail.shift();

            // 绘制尾迹线
            if (p.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let t = 1; t < p.trail.length; t++) {
                    ctx.lineTo(p.trail[t].x, p.trail[t].y);
                }
                ctx.strokeStyle = `rgba(200,220,255,${p.opacity * 0.5})`;
                ctx.lineWidth = 0.3;
                ctx.stroke();
            }

            // 粒子本体
            ctx.beginPath();
            ctx.arc(wx, wy, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220,230,255,${p.opacity})`;
            ctx.fill();
        });

        requestAnimationFrame(() => this.animate());
    }
}

// ==========================================
// MOBILE CAROUSEL - 纵向循环轮播（LOL皮肤选择器风格）
// ==========================================
class MobileCarousel {
    constructor() {
        if (window.innerWidth > 768) return;
        this.carousel = document.getElementById('mobile-carousel');
        if (!this.carousel) return;
        this.active = true;

        // 明确列出所有 section id，确保全部获取
        const sectionIds = ['dashboard', 'uploads', 'profile', 'settings', 'notes', 'bookmarks', 'journal'];
        const isLoggedIn = document.body.classList.contains('logged-in') || Store.get('logged_in', false);

        this.visibleSections = [];
        sectionIds.forEach(id => {
            // 访客模式隐藏设置
            if (id === 'settings' && !isLoggedIn) return;
            const el = document.getElementById(id);
            if (el) this.visibleSections.push(el);
        });

        if (this.visibleSections.length === 0) return;

        this.centerIndex = 0;
        this.isExpanded = false;
        this.isAnimating = false;
        this.MAX_SHOW = 5;
        this.CARD_H = 70;
        this.CENTER_Y = 0;

        this.calcCenterY();
        this.createDots();
        this.applyLayout();
        this.bindTouch();
        this.bindPanelClick();

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) return;
            this.calcCenterY();
            if (!this.isExpanded) this.applyLayout();
        });
    }

    calcCenterY() {
        const vh = window.innerHeight;
        const navH = 48 + (document.body.classList.contains('logged-in') ? 0 : 40);
        this.CENTER_Y = navH + (vh - navH) * 0.35;
    }

    createDots() {
        this.dotsContainer = document.createElement('div');
        this.dotsContainer.className = 'carousel-dots';
        this.dots = [];
        this.visibleSections.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
            dot.addEventListener('click', () => {
                if (this.isExpanded || this.isAnimating) return;
                this.goTo(i);
            });
            this.dotsContainer.appendChild(dot);
            this.dots.push(dot);
        });
        document.body.appendChild(this.dotsContainer);
    }

    // 循环轮播布局
    applyLayout() {
        if (this.isExpanded) return;
        const count = this.visibleSections.length;
        const half = Math.floor(this.MAX_SHOW / 2);

        this.visibleSections.forEach((sec, i) => {
            // 环形距离
            let diff = i - this.centerIndex;
            if (diff > count / 2) diff -= count;
            if (diff < -count / 2) diff += count;
            const absDiff = Math.abs(diff);

            // 超出窗口隐藏
            if (absDiff > half) {
                sec.style.visibility = 'hidden';
                sec.style.opacity = '0';
                sec.style.pointerEvents = 'none';
                sec.classList.remove('carousel-center');
                return;
            }

            sec.style.visibility = 'visible';
            sec.style.pointerEvents = diff === 0 ? 'auto' : 'none';

            const top = this.CENTER_Y + diff * this.CARD_H;
            const scale = 1 - absDiff * 0.06;
            const opacity = absDiff === 0 ? 1 : absDiff === 1 ? 0.5 : 0.2;
            const zIndex = 100 - absDiff * 10;

            sec.style.top = top + 'px';
            sec.style.transform = `scale(${scale})`;
            sec.style.opacity = opacity;
            sec.style.zIndex = zIndex;

            if (diff === 0) {
                if (!sec.classList.contains('carousel-center')) {
                    sec.classList.add('carousel-center');
                    this.triggerStripes(sec, true);
                }
            } else {
                if (sec.classList.contains('carousel-center')) {
                    sec.classList.remove('carousel-center');
                    this.triggerStripes(sec, false);
                }
            }
        });

        if (this.dots) {
            this.dots.forEach((d, i) => d.classList.toggle('active', i === this.centerIndex));
        }
    }

    // 循环取模
    goTo(index) {
        if (this.isAnimating) return;
        const count = this.visibleSections.length;
        this.isAnimating = true;
        this.centerIndex = ((index % count) + count) % count;
        this.applyLayout();
        setTimeout(() => { this.isAnimating = false; }, 350);
    }

    next() { this.goTo(this.centerIndex + 1); }
    prev() { this.goTo(this.centerIndex - 1); }

    bindTouch() {
        let startY = 0, startX = 0, moved = false;

        this.carousel.addEventListener('touchstart', (e) => {
            if (this.isExpanded) return;
            startY = e.touches[0].clientY;
            startX = e.touches[0].clientX;
            moved = false;
        }, { passive: true });

        this.carousel.addEventListener('touchmove', (e) => {
            if (this.isExpanded) return;
            moved = true;
            e.preventDefault();
        }, { passive: false });

        this.carousel.addEventListener('touchend', (e) => {
            if (this.isExpanded) return;
            const endY = e.changedTouches[0].clientY;
            const endX = e.changedTouches[0].clientX;
            const dy = endY - startY;
            const dx = endX - startX;

            // 滑动手势
            if (moved && Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) {
                if (dy < 0) this.next();
                else this.prev();
                return;
            }

            // 点击（非滑动）
            if (!moved || (Math.abs(dy) < 10 && Math.abs(dx) < 10)) {
                this.handleTap(endX, endY);
            }
        }, { passive: true });

        this.carousel.addEventListener('wheel', (e) => {
            if (this.isExpanded) return;
            e.preventDefault();
            if (e.deltaY > 0) this.next();
            else this.prev();
        }, { passive: false });

        // 桌面端点击支持
        this.carousel.addEventListener('click', (e) => {
            if (this.isExpanded || window.innerWidth > 768) return;
            this.handleTap(e.clientX, e.clientY);
        });
    }

    // 点击处理：点到高亮→展开，点到半透明→跳转，点到空白→按方向移动
    handleTap(x, y) {
        if (this.isAnimating || this.isExpanded) return;

        // 检查是否点击到了中心高亮折叠块 → 展开它
        const centerSec = this.visibleSections[this.centerIndex];
        if (centerSec) {
            const centerRect = centerSec.getBoundingClientRect();
            if (x >= centerRect.left && x <= centerRect.right && y >= centerRect.top && y <= centerRect.bottom) {
                // 点击高亮折叠块，触发展开
                const titleBar = centerSec.querySelector('.panel-title-bar');
                if (titleBar) titleBar.click();
                return;
            }
        }

        // 检查是否点击到了某个半透明的折叠块 → 跳转
        for (let i = 0; i < this.visibleSections.length; i++) {
            if (i === this.centerIndex) continue;
            const sec = this.visibleSections[i];
            if (sec.style.visibility === 'hidden') continue;
            const rect = sec.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                this.goTo(i);
                return;
            }
        }

        // 没点到任何折叠块，按点击位置的上下方向移动一次
        const centerSec = this.visibleSections[this.centerIndex];
        if (centerSec) {
            const centerRect = centerSec.getBoundingClientRect();
            const centerMid = centerRect.top + centerRect.height / 2;
            if (y < centerMid) {
                this.prev(); // 点击在中心上方
            } else {
                this.next(); // 点击在中心下方
            }
        }
    }

    triggerStripes(section, enter) {
        const bar = section.querySelector('.panel-title-bar');
        if (!bar) return;
        bar.dispatchEvent(new MouseEvent(enter ? 'mouseenter' : 'mouseleave', { bubbles: true }));
    }

    bindPanelClick() {
        this.visibleSections.forEach(sec => {
            const panel = sec.querySelector('.section-panel');
            if (!panel) return;
            const obs = new MutationObserver(() => {
                const expanded = panel.classList.contains('expanded');
                if (expanded && !this.isExpanded) this.enterExpanded(sec);
                else if (!expanded && this.isExpanded) this.exitExpanded();
            });
            obs.observe(panel, { attributes: true, attributeFilter: ['class'] });
        });
    }

    enterExpanded(section) {
        this.isExpanded = true;
        section.classList.add('section-expanded');
        this.carousel.classList.add('has-expanded');
        if (this.dotsContainer) this.dotsContainer.style.display = 'none';
    }

    exitExpanded() {
        this.isExpanded = false;
        this.visibleSections.forEach(s => {
            s.classList.remove('section-expanded');
            s.style.visibility = '';
            s.style.pointerEvents = '';
        });
        this.carousel.classList.remove('has-expanded');
        if (this.dotsContainer) this.dotsContainer.style.display = '';
        setTimeout(() => this.applyLayout(), 50);
    }

    destroy() {
        if (this.dotsContainer) this.dotsContainer.remove();
        this.visibleSections.forEach(s => {
            s.classList.remove('carousel-center', 'section-expanded');
            s.style.top = '';
            s.style.transform = '';
            s.style.opacity = '';
            s.style.zIndex = '';
            s.style.visibility = '';
            s.style.pointerEvents = '';
        });
        this.carousel.classList.remove('has-expanded');
        this.active = false;
    }
}

function bootApp() {
    try {
        sfx.init();
        const ps = new ParticleSystem();
        new StarTrail();
        new InteractiveEffects();
        new Cursor();
        new Nav();
        new FileManager();
        new Profile();
        new BGMPlayer();
        new Settings(ps);
        new GlitchEngine();
        new Notes();
        new Bookmarks();
        new Journal();
        window._mobileCarousel = new MobileCarousel();
        bindGlobalSfx();
    } catch(e) {
        console.error('[bootApp] Error:', e);
    }
}

// 全局安全网：无论发生什么，5 秒后强制移除 loading screen
setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls && !ls.classList.contains('done')) {
        console.warn('[Safety] Force removing loading screen after 5s timeout');
        ls.classList.add('done');
        const app = document.getElementById('main-app');
        if (app) app.classList.remove('hidden');
    }
}, 5000);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
