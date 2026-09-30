/* =========================================================
   UDev Engine v1.1 — multi-arquivos + ferramentas
   ========================================================= */

const STORAGE_PROJECTS = "udev_projects";
const $ = id => document.getElementById(id);
const $$ = sel => [...document.querySelectorAll(sel)];

const LANGS = { html: "html", css: "css", js: "javascript" };
const extOf = n => (n.split(".").pop() || "").toLowerCase();
const baseName = p => p.split("/").pop();

/* =========================================================
   MÓDULOS PRONTOS (viram arquivos .js do projeto)
   ========================================================= */

const MODULES = {

    udev: {
        icon: "⚙", title: "Núcleo do jogo", file: "udev.js",
        desc: "Canvas responsivo + game loop com delta time. Base de todos os outros módulos.",
        code: `// UDev Core — cria o canvas e o loop do jogo
const UDev = {
    create({ width = 960, height = 540, update = () => {}, draw = () => {}, canvas } = {}) {
        const c = canvas || document.getElementById("game") || document.body.appendChild(document.createElement("canvas"));
        c.width = width;
        c.height = height;
        c.style.cssText = "display:block;margin:0 auto;background:#0b1220;width:min(100vw," + (100 * width / height) + "vh);height:auto";
        const ctx = c.getContext("2d");
        const game = { canvas: c, ctx, width, height, paused: false, time: 0 };
        let last = performance.now();
        function loop(t) {
            const dt = Math.min((t - last) / 1000, 0.05);
            last = t;
            if (!game.paused) { game.time += dt; update(dt); }
            ctx.clearRect(0, 0, width, height);
            draw(ctx);
            if (typeof Input !== "undefined") Input.endFrame();
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
        return game;
    }
};`
    },

    input: {
        icon: "🎮", title: "Controles", file: "input.js",
        desc: "Teclado, mouse e toque. Input.down('a'), Input.pressed('space'), Input.axisX() e botões de toque para celular.",
        code: `// Input — teclado, mouse e toque
const Input = (() => {
    const S = { down: {}, pressed: {}, released: {} };
    const mouse = { x: 0, y: 0, down: false, clicked: false };
    const name = e => e.key === " " ? "space" : e.key.toLowerCase();

    addEventListener("keydown", e => {
        const k = name(e);
        if (!S.down[k]) S.pressed[k] = true;
        S.down[k] = true;
        if (["space", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    });
    addEventListener("keyup", e => { const k = name(e); S.down[k] = false; S.released[k] = true; });

    const pos = e => {
        const c = document.querySelector("canvas");
        if (!c) return;
        const r = c.getBoundingClientRect();
        mouse.x = (e.clientX - r.left) * c.width / r.width;
        mouse.y = (e.clientY - r.top) * c.height / r.height;
    };
    addEventListener("pointermove", pos);
    addEventListener("pointerdown", e => { pos(e); mouse.down = true; mouse.clicked = true; });
    addEventListener("pointerup", () => mouse.down = false);

    const any = (...k) => k.some(x => S.down[x]);

    return {
        mouse,
        down: k => !!S.down[k],
        pressed: k => !!S.pressed[k],
        released: k => !!S.released[k],
        axisX: () => (any("d", "arrowright") ? 1 : 0) - (any("a", "arrowleft") ? 1 : 0),
        axisY: () => (any("s", "arrowdown") ? 1 : 0) - (any("w", "arrowup") ? 1 : 0),
        endFrame() { S.pressed = {}; S.released = {}; mouse.clicked = false; },

        // Botões na tela para celular (use touchControls(true) para testar no PC)
        touchControls(force) {
            if (!force && !("ontouchstart" in window) && !navigator.maxTouchPoints) return;
            if (document.getElementById("udev-touch")) return;
            const box = document.createElement("div");
            box.id = "udev-touch";
            box.style.cssText = "position:fixed;bottom:16px;left:0;right:0;display:flex;justify-content:space-between;padding:0 16px;pointer-events:none;z-index:9";
            const btn = (label, keys) => {
                const b = document.createElement("button");
                b.textContent = label;
                b.style.cssText = "width:64px;height:64px;border-radius:50%;border:0;background:rgba(255,255,255,.18);color:#fff;font-size:24px;pointer-events:auto;touch-action:none";
                const set = v => keys.forEach(k => S.down[k] = v);
                b.addEventListener("pointerdown", e => { e.preventDefault(); keys.forEach(k => { if (!S.down[k]) S.pressed[k] = true; }); set(true); });
                ["pointerup", "pointerleave", "pointercancel"].forEach(t => b.addEventListener(t, () => set(false)));
                return b;
            };
            const left = document.createElement("div");
            left.style.cssText = "display:flex;gap:10px";
            left.append(btn("◀", ["arrowleft"]), btn("▶", ["arrowright"]));
            const right = document.createElement("div");
            right.append(btn("⤒", ["space"]));
            box.append(left, right);
            document.body.append(box);
        }
    };
})();`
    },

    physics: {
        icon: "🧱", title: "Física e colisão", file: "physics.js",
        desc: "Gravidade, colisão retangular (AABB) e resolução automática contra plataformas e paredes.",
        code: `// Physics — colisão AABB e gravidade
// Corpo: { x, y, w, h, vx, vy, onGround }
const Physics = {
    hit(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    },

    step(body, solids, dt, gravity = 1800) {
        body.vy += gravity * dt;

        body.x += body.vx * dt;
        for (const s of solids) {
            if (!this.hit(body, s)) continue;
            if (body.vx > 0) body.x = s.x - body.w;
            else if (body.vx < 0) body.x = s.x + s.w;
        }

        body.y += body.vy * dt;
        body.onGround = false;
        for (const s of solids) {
            if (!this.hit(body, s)) continue;
            if (body.vy > 0) { body.y = s.y - body.h; body.onGround = true; }
            else if (body.vy < 0) body.y = s.y + s.h;
            body.vy = 0;
        }
    }
};`
    },

    audio: {
        icon: "🔊", title: "Sons automáticos", file: "audio.js",
        desc: "Efeitos sonoros gerados por código, sem precisar de arquivos: jump, coin, hit, explosion, shoot, powerup.",
        code: `// Sfx — efeitos sonoros gerados na hora
// Uso: Sfx.play("jump")
const Sfx = (() => {
    let ctx;
    const presets = {
        jump:      [300, 700, 0.15, "square"],
        coin:      [900, 1500, 0.12, "square"],
        hit:       [300, 60, 0.25, "sawtooth"],
        explosion: [200, 30, 0.5, "sawtooth"],
        shoot:     [900, 200, 0.12, "square"],
        powerup:   [400, 1200, 0.3, "triangle"]
    };

    function play(name, volume = 0.15) {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        const [f0, f1, d, type] = presets[name] || presets.coin;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const t = ctx.currentTime;
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + d);
        g.gain.setValueAtTime(volume, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(t + d);
    }

    return { play, presets };
})();`
    },

    particles: {
        icon: "✨", title: "Partículas", file: "particles.js",
        desc: "Explosões e faíscas prontas: Particles.burst(x, y, { color }). Chame update(dt) e draw(ctx).",
        code: `// Particles — efeitos de explosão
const Particles = (() => {
    const list = [];
    return {
        burst(x, y, { count = 20, color = "#ffffff", speed = 220, life = 0.6, size = 4 } = {}) {
            for (let i = 0; i < count; i++) {
                const a = Math.random() * Math.PI * 2;
                const s = Math.random() * speed;
                list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size });
            }
        },
        update(dt) {
            for (let i = list.length - 1; i >= 0; i--) {
                const p = list[i];
                p.life -= dt;
                if (p.life <= 0) { list.splice(i, 1); continue; }
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 400 * dt;
            }
        },
        draw(ctx) {
            for (const p of list) {
                ctx.globalAlpha = p.life / p.max;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }
            ctx.globalAlpha = 1;
        }
    };
})();`
    },

    camera: {
        icon: "🎥", title: "Câmera", file: "camera.js",
        desc: "Câmera que segue o jogador com suavidade e tremor de tela (Camera.shake).",
        code: `// Camera — siga o alvo e trema a tela
// update: Camera.follow(player, game.width, game.height); Camera.update(dt);
// draw:   Camera.begin(ctx); ...desenhe o mundo...; Camera.end(ctx);
const Camera = {
    x: 0, y: 0, shakeTime: 0, shakePower: 0,

    follow(t, w, h, lerp = 0.1) {
        this.x += (t.x + t.w / 2 - w / 2 - this.x) * lerp;
        this.y += (t.y + t.h / 2 - h / 2 - this.y) * lerp;
    },
    shake(power = 8, time = 0.3) { this.shakePower = power; this.shakeTime = time; },
    update(dt) { if (this.shakeTime > 0) this.shakeTime -= dt; },
    begin(ctx) {
        ctx.save();
        let sx = 0, sy = 0;
        if (this.shakeTime > 0) {
            sx = (Math.random() - 0.5) * this.shakePower;
            sy = (Math.random() - 0.5) * this.shakePower;
        }
        ctx.translate(-Math.round(this.x) + sx, -Math.round(this.y) + sy);
    },
    end(ctx) { ctx.restore(); }
};`
    },

    save: {
        icon: "💾", title: "Salvar progresso", file: "save.js",
        desc: "Recordes e progresso do jogador: Save.get('best', 0) e Save.set('best', 10).",
        code: `// Save — guarda dados no navegador do jogador
const Save = {
    get(key, fallback) {
        try {
            const v = localStorage.getItem("udev_game_" + key);
            return v === null ? fallback : JSON.parse(v);
        } catch (e) { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem("udev_game_" + key, JSON.stringify(value)); } catch (e) {}
    }
};`
    }
};

/* =========================================================
   GERADORES
   ========================================================= */

function genPlayer(type, speed, jump, color) {

    if (type === "topdown") {
        return `// Personagem visto de cima (gerado pela UDev Engine)
const PLAYER_SPEED = ${speed};
const PLAYER_COLOR = "${color}";

function makePlayer(x, y) {
    return {
        x, y, w: 32, h: 32,

        update(dt) {
            this.x += Input.axisX() * PLAYER_SPEED * dt;
            this.y += Input.axisY() * PLAYER_SPEED * dt;
        },

        draw(ctx) {
            ctx.fillStyle = PLAYER_COLOR;
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    };
}`;
    }

    return `// Personagem de plataforma (gerado pela UDev Engine)
const PLAYER_SPEED = ${speed};
const PLAYER_JUMP = ${jump};
const PLAYER_COLOR = "${color}";

function makePlayer(x, y) {
    return {
        x, y, w: 36, h: 44, vx: 0, vy: 0, onGround: false,

        update(dt, solids) {
            this.vx = Input.axisX() * PLAYER_SPEED;

            const wantsJump = Input.pressed("w") || Input.pressed("arrowup") || Input.pressed("space");
            if (wantsJump && this.onGround) {
                this.vy = -PLAYER_JUMP;
                if (typeof Sfx !== "undefined") Sfx.play("jump");
            }

            Physics.step(this, solids, dt);
        },

        draw(ctx) {
            ctx.fillStyle = PLAYER_COLOR;
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    };
}`;
}

function genAssetsManifest() {

    const paths = assets
        .filter(a => a.type === "image" || a.type === "audio")
        .map(a => `        "${a.name}": "assets/${a.name}"`)
        .join(",\n");

    return `// Manifesto de assets (gerado pela UDev Engine)
// Uso:  await Assets.load();  ctx.drawImage(Assets.img("hero.png"), x, y);
//       Assets.sound("music.mp3").play();
const Assets = {
    paths: {
${paths}
    },
    images: {},

    load() {
        const jobs = Object.keys(this.paths)
            .filter(n => /\\.(png|jpe?g|gif|webp|svg)$/i.test(n))
            .map(n => new Promise(resolve => {
                const img = new Image();
                img.onload = img.onerror = resolve;
                img.src = this.paths[n];
                this.images[n] = img;
            }));
        return Promise.all(jobs);
    },

    img(name) { return this.images[name]; },
    sound(name) { return new Audio(this.paths[name]); }
};`;
}

/* =========================================================
   TEMPLATES
   ========================================================= */

const baseHTML = title => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="game"></canvas>
    <script src="game.js"></script>
</body>
</html>`;

const baseCSS = `* { box-sizing: border-box; }

html, body {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #05070b;
    color: white;
    font-family: Arial, sans-serif;
}`;

const mod = id => ({ name: MODULES[id].file, content: MODULES[id].code });
const file = (name, content) => ({ name, content });

function getTemplate(type) {

    if (type === "platformer") {
        return [
            file("index.html", baseHTML("Platformer")),
            file("style.css", baseCSS),
            mod("udev"), mod("input"), mod("physics"), mod("audio"),
            file("player.js", genPlayer("platformer", 260, 680, "#1683ff")),
            file("game.js", `const game = UDev.create({ width: 960, height: 540, update, draw });
Input.touchControls();

const solids = [
    { x: 0,   y: 500, w: 960, h: 40 },
    { x: 180, y: 400, w: 200, h: 16 },
    { x: 520, y: 310, w: 220, h: 16 },
    { x: 780, y: 220, w: 140, h: 16 }
];

const coins = [{ x: 280, y: 370 }, { x: 630, y: 280 }, { x: 850, y: 190 }];
const player = makePlayer(80, 300);
let score = 0;

function update(dt) {
    player.update(dt, solids);

    for (const c of coins) {
        if (!c.got && Physics.hit(player, { x: c.x - 8, y: c.y - 8, w: 16, h: 16 })) {
            c.got = true;
            score++;
            Sfx.play("coin");
        }
    }

    // caiu da fase: volta ao começo
    if (player.y > game.height + 200) {
        player.x = 80; player.y = 300; player.vy = 0;
    }
}

function draw(ctx) {
    ctx.fillStyle = "#ffffff";
    solids.forEach(s => ctx.fillRect(s.x, s.y, s.w, s.h));

    ctx.fillStyle = "#ffd43b";
    coins.forEach(c => {
        if (c.got) return;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
        ctx.fill();
    });

    player.draw(ctx);

    ctx.fillStyle = "#9aa4b2";
    ctx.font = "18px Arial";
    ctx.fillText("Moedas: " + score + "   (A/D move, W ou Espaço pula)", 20, 30);
}`)
        ];
    }

    if (type === "arcade") {
        return [
            file("index.html", baseHTML("Arcade")),
            file("style.css", baseCSS),
            mod("udev"), mod("input"), mod("physics"), mod("audio"), mod("particles"), mod("save"),
            file("player.js", genPlayer("topdown", 320, 0, "#1683ff")),
            file("game.js", `const game = UDev.create({ width: 960, height: 540, update, draw });

let player, coin, enemies, score, timer, over;
const best = () => Save.get("best", 0);

function restart() {
    player = makePlayer(464, 254);
    coin = spawnCoin();
    enemies = [];
    score = 0;
    timer = 0;
    over = false;
}

function spawnCoin() {
    return { x: 40 + Math.random() * 880, y: 40 + Math.random() * 460, r: 10 };
}

function update(dt) {
    Particles.update(dt);

    if (over) {
        if (Input.pressed("space")) restart();
        return;
    }

    player.update(dt);
    player.x = Math.max(0, Math.min(game.width - player.w, player.x));
    player.y = Math.max(0, Math.min(game.height - player.h, player.y));

    timer += dt;
    if (timer > 1.5) {
        timer = 0;
        enemies.push({ x: Math.random() * (game.width - 24), y: -24, w: 24, h: 24, vy: 120 + score * 8 });
    }

    enemies.forEach(e => e.y += e.vy * dt);
    enemies = enemies.filter(e => e.y < game.height + 30);

    if (Physics.hit(player, { x: coin.x - coin.r, y: coin.y - coin.r, w: coin.r * 2, h: coin.r * 2 })) {
        Particles.burst(coin.x, coin.y, { color: "#ffd43b" });
        Sfx.play("coin");
        score++;
        coin = spawnCoin();
    }

    if (enemies.some(e => Physics.hit(player, e))) {
        over = true;
        Sfx.play("explosion");
        Particles.burst(player.x + 16, player.y + 16, { count: 40, color: "#ff5c5c" });
        if (score > best()) Save.set("best", score);
    }
}

function draw(ctx) {
    ctx.fillStyle = "#ffd43b";
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff5c5c";
    enemies.forEach(e => ctx.fillRect(e.x, e.y, e.w, e.h));

    if (!over) player.draw(ctx);
    Particles.draw(ctx);

    ctx.fillStyle = "#9aa4b2";
    ctx.font = "18px Arial";
    ctx.fillText("Pontos: " + score + "   Recorde: " + best(), 20, 30);

    if (over) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Fim de jogo", game.width / 2, game.height / 2);
        ctx.font = "18px Arial";
        ctx.fillText("Espaço para recomeçar", game.width / 2, game.height / 2 + 36);
        ctx.textAlign = "left";
    }
}

restart();`)
        ];
    }

    return [
        file("index.html", baseHTML("Meu jogo")),
        file("style.css", baseCSS),
        mod("udev"),
        file("game.js", `const game = UDev.create({ width: 960, height: 540, update, draw });

function update(dt) {
    // lógica do jogo (dt = segundos desde o último frame)
}

function draw(ctx) {
    ctx.fillStyle = "#1683ff";
    ctx.font = "28px Arial";
    ctx.fillText("Meu jogo — edite o game.js", 40, 60);
}`)
    ];
}

const NEW_FILE_DEFAULTS = {
    html: n => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${n}</title>
</head>
<body>

</body>
</html>`,
    css: n => `/* ${n} */\n`,
    js: n => `// ${n}\n`
};

/* =========================================================
   STATE
   ========================================================= */

let projects = [];
try { projects = JSON.parse(localStorage.getItem(STORAGE_PROJECTS) || "[]"); } catch (e) { projects = []; }

// migra projetos antigos (html/css/js) para a lista de arquivos
projects.forEach(migrate);

function migrate(p) {
    if (!p.files) {
        p.files = [
            file("index.html", p.html || ""),
            file("style.css", p.css || ""),
            file("game.js", p.js || "")
        ];
        delete p.html; delete p.css; delete p.js;
    }
    p.assets = p.assets || [];
}

let current = null;
let activeFile = null;
let assets = [];
let assetFilter = "all";
let previewPage = "index.html";
let saveTimer = null;

/* =========================================================
   MONACO
   ========================================================= */

let editor = null;
const models = new WeakMap();
let modelList = [];

require.config({
    paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs" }
});

require(["vs/editor/editor.main"], function () {

    editor = monaco.editor.create($("codeEditor"), {
        model: null,
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: true },
        fontSize: 14,
        padding: { top: 15 },
        smoothScrolling: true,
        wordWrap: "on"
    });

    registerSnippets();
    if (activeFile) showFile(activeFile);
});

function registerSnippets() {

    const snippets = [
        ["udevGame", "Cria o jogo com canvas e loop",
            "const game = UDev.create({ width: 960, height: 540, update, draw });\n\nfunction update(dt) {\n\t$0\n}\n\nfunction draw(ctx) {\n\t\n}"],
        ["udevRect", "Desenha um retângulo",
            "ctx.fillStyle = \"${1:#1683ff}\";\nctx.fillRect(${2:x}, ${3:y}, ${4:w}, ${5:h});"],
        ["udevCollide", "Testa colisão entre dois objetos",
            "if (Physics.hit(${1:a}, ${2:b})) {\n\t$0\n}"],
        ["udevSound", "Toca um efeito sonoro",
            "Sfx.play(\"${1|jump,coin,hit,explosion,shoot,powerup|}\");"]
    ];

    monaco.languages.registerCompletionItemProvider("javascript", {
        provideCompletionItems(model, position) {
            const w = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
                startColumn: w.startColumn, endColumn: w.endColumn
            };
            return {
                suggestions: snippets.map(([label, documentation, insertText]) => ({
                    label, documentation, insertText, range,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                }))
            };
        }
    });
}

/* =========================================================
   NAVEGAÇÃO
   ========================================================= */

const navButtons = $$(".nav-btn");

navButtons.forEach(b => b.addEventListener("click", () => openPage(b.dataset.page)));

function openPage(page) {

    $$(".page").forEach(p => p.classList.remove("active"));

    const target = $(`page-${page}`);
    if (target) target.classList.add("active");

    navButtons.forEach(b => b.classList.toggle("active", b.dataset.page === page));

    if (page === "preview") updatePreview();
    if (page === "tools") renderTools();
}

/* =========================================================
   MODAL DE PROJETO
   ========================================================= */

const modal = $("projectModal");

function openProjectModal() {
    modal.classList.add("show");
    $("projectNameInput").focus();
}

function closeProjectModal() { modal.classList.remove("show"); }

$("closeModal").addEventListener("click", closeProjectModal);
["newProjectHero", "newProjectHome", "newProjectSidebar"]
    .forEach(id => $(id).addEventListener("click", openProjectModal));

$("createProjectBtn").addEventListener("click", createProject);

function createProject() {

    const name = $("projectNameInput").value.trim() || "Meu jogo";
    const template = $("projectTemplateInput").value;

    const project = {
        id: Date.now(),
        name,
        created: new Date().toLocaleDateString("pt-BR"),
        files: getTemplate(template),
        assets: []
    };

    projects.unshift(project);
    saveProjects();
    openProject(project);
    closeProjectModal();
    $("projectNameInput").value = "";
}

/* =========================================================
   ABRIR PROJETO
   ========================================================= */

function openProject(project) {

    migrate(project);

    modelList.forEach(m => m.dispose());
    modelList = [];

    current = project;
    assets = project.assets;
    activeFile = project.files[0];
    previewPage = mainPage();

    $("currentProjectName").textContent = project.name;
    $("currentProjectStatus").textContent = "Projeto aberto";

    renderProjects();
    renderAssets();
    renderFileList();
    openPage("editor");
    showFile(activeFile);
}

function mainPage() {
    const f = current && current.files.find(f => extOf(f.name) === "html");
    return f ? f.name : "index.html";
}

/* =========================================================
   ARQUIVOS DO PROJETO
   ========================================================= */

function needProject() {
    if (!current) { alert("Crie ou abra um projeto primeiro."); return false; }
    return true;
}

function renderFileList() {

    const list = $("codeFileList");
    if (!current) { list.innerHTML = ""; return; }

    const icons = { html: ["html-icon", "H"], css: ["css-icon", "C"], js: ["js-icon", "J"] };

    list.innerHTML = current.files.map((f, i) => {
        const [cls, letter] = icons[extOf(f.name)] || ["js-icon", "?"];
        const removable = f.name !== mainPage();
        return `
            <button class="code-tab ${f === activeFile ? "active" : ""}" data-i="${i}" title="Duplo clique para renomear">
                <span class="${cls}">${letter}</span>${escapeHTML(f.name)}
                ${removable ? `<span class="file-remove" data-del="${i}" title="Excluir">×</span>` : ""}
            </button>`;
    }).join("");
}

$("codeFileList").addEventListener("click", e => {

    const del = e.target.closest("[data-del]");
    if (del) { e.stopPropagation(); deleteFile(current.files[del.dataset.del]); return; }

    const tab = e.target.closest(".code-tab");
    if (tab) showFile(current.files[tab.dataset.i]);
});

$("codeFileList").addEventListener("dblclick", e => {
    const tab = e.target.closest(".code-tab");
    if (tab) renameFile(current.files[tab.dataset.i]);
});

$("addFileBtn").addEventListener("click", () => {

    if (!needProject()) return;

    const name = prompt("Nome do novo arquivo (.html, .css ou .js):", "novo.js");
    if (name) addFile(name.trim(), null);
});

function validName(name, ignore) {

    if (!/^[\w\-]+\.(html|css|js)$/i.test(name)) {
        alert("Use um nome simples terminando em .html, .css ou .js (ex: inimigo.js).");
        return false;
    }
    if (current.files.some(f => f !== ignore && f.name.toLowerCase() === name.toLowerCase())) {
        alert("Já existe um arquivo com esse nome.");
        return false;
    }
    return true;
}

// content = null → usa o conteúdo inicial do tipo; before = nome do arquivo antes do qual inserir
function addFile(name, content, before) {

    if (!needProject() || !validName(name)) return null;

    const f = file(name, content !== null ? content : NEW_FILE_DEFAULTS[extOf(name)](name));

    const idx = before ? current.files.findIndex(x => x.name === before) : -1;
    if (idx >= 0) current.files.splice(idx, 0, f);
    else current.files.push(f);

    markDirty();
    showFile(f);
    return f;
}

function renameFile(f) {

    if (f.name === mainPage()) { alert("O arquivo principal não pode ser renomeado."); return; }

    const name = prompt("Novo nome:", f.name);
    if (!name || name === f.name || !validName(name.trim(), f)) return;

    f.name = name.trim();

    const m = models.get(f);
    if (m && editor) monaco.editor.setModelLanguage(m, LANGS[extOf(f.name)]);

    markDirty();
    showFile(f);
}

function deleteFile(f) {

    if (!confirm(`Excluir ${f.name}?`)) return;

    const m = models.get(f);
    if (m) { m.dispose(); modelList = modelList.filter(x => x !== m); }

    current.files = current.files.filter(x => x !== f);
    if (previewPage === f.name) previewPage = mainPage();

    markDirty();
    showFile(current.files[0]);
}

function showFile(f) {

    activeFile = f;
    renderFileList();
    if (!f) return;

    $("activeFile").textContent = f.name;

    if (!editor) return;

    let m = models.get(f);

    if (!m) {
        m = monaco.editor.createModel(f.content, LANGS[extOf(f.name)]);
        m.onDidChangeContent(() => { f.content = m.getValue(); markDirty(); });
        models.set(f, m);
        modelList.push(m);
    }

    editor.setModel(m);
}

function markDirty() {
    $("editorStatus").textContent = "Alterações não salvas";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveCurrentProject(true), 1500);   // salvamento automático
}

/* =========================================================
   SALVAR
   ========================================================= */

$("saveBtn").addEventListener("click", () => saveCurrentProject());

function saveCurrentProject(silent) {

    if (!current) {
        if (!silent) alert("Crie ou abra um projeto primeiro.");
        return;
    }

    clearTimeout(saveTimer);
    current.assets = assets;

    if (!saveProjects()) return;

    $("editorStatus").textContent = "Salvo";
    $("currentProjectStatus").textContent = "Salvo localmente";
    renderProjects();
}

function saveProjects() {
    try {
        localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(projects));
        return true;
    } catch (e) {
        alert("Armazenamento cheio. Remova assets grandes para continuar salvando.");
        return false;
    }
}

function renderProjects() {

    const grid = $("projectsGrid");

    if (!projects.length) {
        grid.innerHTML = `
            <div class="project-card" id="emptyProject">
                <div class="project-thumbnail">+</div>
                <div class="project-card-info">
                    <strong>Criar seu primeiro projeto</strong>
                    <small>Comece agora</small>
                </div>
            </div>`;
        $("emptyProject").onclick = openProjectModal;
        return;
    }

    grid.innerHTML = projects.map(p => `
        <div class="project-card" data-id="${p.id}">
            <div class="project-thumbnail">U</div>
            <div class="project-card-info">
                <strong>${escapeHTML(p.name)}</strong>
                <small>${p.created} · ${p.files.length} arquivos</small>
            </div>
        </div>`).join("");

    $$(".project-card[data-id]").forEach(card => {
        card.addEventListener("click", () => {
            const p = projects.find(p => p.id == card.dataset.id);
            if (p) openProject(p);
        });
    });
}

/* =========================================================
   ASSETS
   ========================================================= */

$("importAssetBtn").addEventListener("click", () => {
    if (needProject()) $("assetInput").click();
});

$("assetInput").addEventListener("change", e => {

    Array.from(e.target.files).forEach(f => {

        const reader = new FileReader();

        reader.onload = () => {
            assets.push({
                id: Date.now() + Math.random(),
                name: f.name,
                type: f.type.startsWith("image/") ? "image" : f.type.startsWith("audio/") ? "audio" : "other",
                size: f.size,
                data: reader.result
            });
            renderAssets();
            saveCurrentProject(true);
        };

        reader.readAsDataURL(f);
    });

    e.target.value = "";
});

function renderAssets() {

    const grid = $("assetsGrid");
    const list = assetFilter === "all" ? assets : assets.filter(a => a.type === assetFilter);

    if (!list.length) {
        grid.innerHTML = `
            <div class="asset-card">
                <div class="asset-preview">+</div>
                <div class="asset-info">
                    <strong>Nenhum asset</strong>
                    <small>Importe imagens ou sons.</small>
                </div>
            </div>`;
        return;
    }

    grid.innerHTML = list.map(a => `
        <div class="asset-card" data-copy="${escapeHTML(a.name)}" title="Clique para copiar o caminho">
            <div class="asset-preview">${a.type === "image" ? `<img src="${a.data}">` : a.type === "audio" ? "🔊" : "📄"}</div>
            <div class="asset-info">
                <strong>${escapeHTML(a.name)}</strong>
                <small>assets/${escapeHTML(a.name)} · ${formatBytes(a.size)}</small>
                <small class="asset-del" data-del="${escapeHTML(a.name)}">🗑 Remover</small>
            </div>
        </div>`).join("");
}

$("assetsGrid").addEventListener("click", e => {

    const del = e.target.closest("[data-del]");
    if (del) {
        e.stopPropagation();
        assets = assets.filter(a => a.name !== del.dataset.del);
        renderAssets();
        saveCurrentProject(true);
        return;
    }

    const card = e.target.closest("[data-copy]");
    if (card && navigator.clipboard) {
        navigator.clipboard.writeText("assets/" + card.dataset.copy);
        $("currentProjectStatus").textContent = "Caminho copiado: assets/" + card.dataset.copy;
    }
});

$$(".asset-filter").forEach(b => b.addEventListener("click", () => {
    $$(".asset-filter").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    assetFilter = b.dataset.filter;
    renderAssets();
}));

/* =========================================================
   FERRAMENTAS
   ========================================================= */

function renderTools() {

    const root = $("toolsRoot");
    const has = n => current && current.files.some(f => f.name === n);

    root.innerHTML = `
        <div class="tool-title">Módulos prontos</div>
        <div class="settings-grid">
            ${Object.entries(MODULES).map(([id, m]) => `
                <div class="settings-card tool-card">
                    <h2>${m.icon} ${m.title}</h2>
                    <p>${m.desc}</p>
                    <button class="${has(m.file) ? "secondary-btn" : "primary-btn"}" data-module="${id}">
                        ${has(m.file) ? "✓ No projeto (reinstalar)" : "+ Adicionar " + m.file}
                    </button>
                </div>`).join("")}
        </div>

        <div class="tool-title">Geradores automáticos</div>
        <div class="settings-grid">

            <div class="settings-card tool-card">
                <h2>🧍 Personagem</h2>
                <p>Gera o player.js com movimento pronto e instala os módulos necessários.</p>
                <label>Tipo
                    <select id="genType">
                        <option value="platformer">Plataforma (pula)</option>
                        <option value="topdown">Visto de cima</option>
                    </select>
                </label>
                <label>Velocidade <input type="number" id="genSpeed" value="260"></label>
                <label>Força do pulo <input type="number" id="genJump" value="680"></label>
                <label>Cor <input type="color" id="genColor" value="#1683ff"></label>
                <button class="primary-btn full" id="genPlayerBtn">Gerar player.js</button>
            </div>

            <div class="settings-card tool-card">
                <h2>🗂 Manifesto de assets</h2>
                <p>Cria o assets.js com todos os seus assets já mapeados e um carregador de imagens e sons.</p>
                <button class="primary-btn full" id="genAssetsBtn">Gerar assets.js</button>
            </div>

            <div class="settings-card tool-card">
                <h2>📄 Nova página HTML</h2>
                <p>Adicione menus, telas de game over ou fases em outras páginas. Links para arquivos .html funcionam no Preview.</p>
                <button class="primary-btn full" id="genPageBtn">Criar menu.html + menu.css</button>
            </div>

        </div>

        <div class="tool-note">
            Arquivos CSS e JS do projeto são incluídos automaticamente no jogo, mesmo sem tag &lt;link&gt; ou &lt;script&gt;.
            Módulos ficam antes do game.js. Digite <code>udev</code> no editor JS para snippets.
        </div>`;

    $$("[data-module]").forEach(b => b.addEventListener("click", () => installModule(b.dataset.module)));
    $("genPlayerBtn").addEventListener("click", generatePlayer);
    $("genAssetsBtn").addEventListener("click", () => putFile("assets.js", genAssetsManifest()));
    $("genPageBtn").addEventListener("click", generateMenuPage);
}

// cria o arquivo ou pergunta se pode sobrescrever
function putFile(name, content, before) {

    if (!needProject()) return null;

    const existing = current.files.find(f => f.name === name);

    if (existing) {
        if (!confirm(`${name} já existe. Substituir?`)) return null;
        existing.content = content;
        const m = models.get(existing);
        if (m) m.setValue(content);
        markDirty();
        showFile(existing);
        return existing;
    }

    return addFile(name, content, before);
}

function installModule(id) {
    if (!needProject()) return;
    const m = MODULES[id];
    putFile(m.file, m.code, "game.js");
    renderTools();
}

function ensureModules(ids) {
    ids.forEach(id => {
        if (!current.files.some(f => f.name === MODULES[id].file)) {
            addFile(MODULES[id].file, MODULES[id].code, "game.js");
        }
    });
}

function generatePlayer() {

    if (!needProject()) return;

    const type = $("genType").value;
    ensureModules(type === "platformer" ? ["udev", "input", "physics"] : ["udev", "input"]);

    putFile("player.js", genPlayer(type, +$("genSpeed").value || 260, +$("genJump").value || 680, $("genColor").value), "game.js");
    renderTools();
}

function generateMenuPage() {

    if (!needProject()) return;

    putFile("menu.css", `body {
    margin: 0;
    height: 100vh;
    display: grid;
    place-items: center;
    background: #05070b;
    color: white;
    font-family: Arial, sans-serif;
    text-align: center;
}

h1 { font-size: 48px; color: #1683ff; margin-bottom: 24px; }

a {
    display: inline-block;
    padding: 14px 32px;
    background: #1683ff;
    color: white;
    border-radius: 10px;
    text-decoration: none;
    font-weight: bold;
}`);

    putFile("menu.html", `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Menu</title>
    <link rel="stylesheet" href="menu.css">
</head>
<body>
    <div>
        <h1>${escapeHTML(current.name)}</h1>
        <a href="index.html">▶ Jogar</a>
    </div>
</body>
</html>`);

    previewPage = "menu.html";
    renderTools();
}

/* =========================================================
   BUILD / PREVIEW / EXPORT
   ========================================================= */

const BRIDGE = `<script>(function () {
    const send = (type, args) => parent.postMessage({ udev: 1, type, args }, "*");
    const text = x => { try { return typeof x === "object" ? JSON.stringify(x) : String(x); } catch (e) { return String(x); } };
    ["log", "info", "warn", "error"].forEach(k => {
        const original = console[k];
        console[k] = (...a) => { send(k, a.map(text)); original.apply(console, a); };
    });
    addEventListener("error", e => send("error", [e.message + (e.lineno ? " (linha " + e.lineno + ")" : "")]));
    addEventListener("unhandledrejection", e => send("error", [text(e.reason)]));
    document.addEventListener("click", e => {
        const a = e.target.closest && e.target.closest("a[href]");
        if (!a) return;
        const h = a.getAttribute("href");
        if (/\\.html$/i.test(h) && !/^https?:/i.test(h)) { e.preventDefault(); send("goto", [h.split("/").pop()]); }
    });
    window.UDevGoto = n => send("goto", [n]);
})();</script>`;

function buildPage(pageName, withBridge) {

    const files = current.files;
    const fx = t => assets.reduce((s, a) => s.split("assets/" + a.name).join(a.data), t);
    const safe = t => t.replace(/<\/script/gi, "<\\/script");
    const find = p => files.find(f => f.name === baseName(p));

    const page = files.find(f => f.name === pageName) || files.find(f => extOf(f.name) === "html");
    if (!page) return "<h1>Nenhum arquivo HTML no projeto.</h1>";

    const usedCss = new Set();
    const usedJs = new Set();

    let html = fx(page.content);

    html = html.replace(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (m, h) => {
        const f = find(h);
        if (!f) return m;
        usedCss.add(f);
        return `<style data-file="${f.name}">\n${fx(f.content)}\n</style>`;
    });

    html = html.replace(/<script[^>]*src=["']([^"']+\.js)["'][^>]*>\s*<\/script>/gi, (m, h) => {
        const f = find(h);
        if (!f) return m;
        usedJs.add(f);
        return `<script data-file="${f.name}">\n${safe(fx(f.content))}\n</script>`;
    });

    // arquivos não referenciados entram automaticamente
    const autoCss = files
        .filter(f => extOf(f.name) === "css" && !usedCss.has(f))
        .map(f => `<style data-file="${f.name}">\n${fx(f.content)}\n</style>`).join("\n");

    const autoJs = files
        .filter(f => extOf(f.name) === "js" && !usedJs.has(f))
        .map(f => `<script data-file="${f.name}">\n${safe(fx(f.content))}\n</script>`).join("\n");

    if (autoCss) {
        html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => autoCss + "\n</head>") : autoCss + html;
    }

    if (autoJs) {
        const first = html.search(/<script data-file=/i);
        if (first >= 0) html = html.slice(0, first) + autoJs + "\n" + html.slice(first);
        else html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => autoJs + "\n</body>") : html + autoJs;
    }

    if (withBridge) {
        html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + BRIDGE) : BRIDGE + html;
    }

    return html;
}

function updatePreview() {

    if (!current) return;

    if (!current.files.some(f => f.name === previewPage)) previewPage = mainPage();

    $("consoleLines").innerHTML = "";
    $("previewUrl").textContent = "udev://game/" + previewPage;
    $("gameFrame").srcdoc = buildPage(previewPage, true);
}

function logConsole(type, text) {

    const box = $("consoleLines");
    const line = document.createElement("div");
    line.className = "console-line " + type;
    line.textContent = (type === "error" ? "✖ " : type === "warn" ? "⚠ " : "› ") + text;
    box.appendChild(line);

    while (box.children.length > 200) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
}

addEventListener("message", e => {

    const d = e.data;
    if (!d || !d.udev || e.source !== $("gameFrame").contentWindow) return;

    if (d.type === "goto") {
        if (current && current.files.some(f => f.name === d.args[0])) {
            previewPage = d.args[0];
            updatePreview();
        } else {
            logConsole("error", "Página não encontrada: " + d.args[0]);
        }
        return;
    }

    logConsole(d.type, d.args.join(" "));
});

$("clearConsole").addEventListener("click", () => $("consoleLines").innerHTML = "");

function run() {
    if (!needProject()) return;
    saveCurrentProject(true);
    previewPage = mainPage();
    openPage("preview");
}

$("runBtn").addEventListener("click", run);
$("runEditor").addEventListener("click", run);
$("refreshPreview").addEventListener("click", updatePreview);

$("exportBtn").addEventListener("click", () => {

    if (!needProject()) return;

    const blob = new Blob([buildPage(mainPage(), false)], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = current.name.replace(/[^\w\-]+/g, "_") + ".html";
    a.click();
    URL.revokeObjectURL(a.href);
});

$("fullscreenBtn").addEventListener("click", () => {
    const frame = $("gameFrame");
    if (frame.requestFullscreen) frame.requestFullscreen();
});

/* =========================================================
   EXEMPLO E MODELOS
   ========================================================= */

$("exampleProjectBtn").addEventListener("click", () => {

    let example = projects.find(p => p.name === "UDev Platformer");

    if (!example) {
        example = {
            id: Date.now(),
            name: "UDev Platformer",
            created: new Date().toLocaleDateString("pt-BR"),
            files: getTemplate("platformer"),
            assets: []
        };
        projects.unshift(example);
        saveProjects();
    }

    openProject(example);
});

$$(".template-card").forEach(card => card.addEventListener("click", () => {
    $("projectTemplateInput").value = card.dataset.template;
    openProjectModal();
}));

$$(".use-template").forEach(btn => btn.addEventListener("click", () => {
    $("projectTemplateInput").value = btn.dataset.template;
    openProjectModal();
}));

/* =========================================================
   HELPERS
   ========================================================= */

function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
}

function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener("keydown", e => {

    if (!(e.ctrlKey || e.metaKey)) return;

    const k = e.key.toLowerCase();

    if (k === "s") { e.preventDefault(); saveCurrentProject(); }
    if (k === "enter") { e.preventDefault(); run(); }
});

/* =========================================================
   START
   ========================================================= */

renderProjects();