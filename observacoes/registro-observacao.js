// ============================================================================
// MÓDULO DE REGISTRO DE OBSERVAÇÕES E CALIBRAÇÕES POR CÂMERA
// ============================================================================

const CONFIG_CAMERAS = {
    qhy: {
        nomeExibicao: "QHYCCD (Vídeo / CMOS)",
        fovOpcoes: ["Full Frame", "1920x1200", "1024x1024", "512x512", "256x256", "ROI Personalizado"],
        binOpcoes: ["1x1", "2x2", "3x3", "4x4"],
        ganhoPadrao: ""
    }
    // Futuramente adicionaremos: sparc4, ikonl, ixon, goodman...
};

let abaAtualRegistro = "objeto"; // "objeto" ou "calibracao"

function inicializarModuloRegistro(telescopioNome, corTema, corFundoClaro, corBorda) {
    const container = document.getElementById("containerRegistro");
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const detParam = (params.get("det") || "qhy").toLowerCase();
    const dia = params.get("d");
    const mes = params.get("m");
    const ano = params.get("a");

    // Seleciona a configuração da câmera (usa QHY como padrão caso ainda não cadastrada)
    const camKey = Object.keys(CONFIG_CAMERAS).find(k => detParam.includes(k)) || "qhy";
    const camConfig = CONFIG_CAMERAS[camKey];

    const chaveNoite = (ano && mes && dia) ? `${parseInt(ano)}-${parseInt(mes)}-${parseInt(dia)}` : "sem-data";
    const GITHUB_OWNER = "giuliano-margoti";
    const GITHUB_REPO = "registros-observacoes";
    const CAMINHO_ARQUIVO = "registros.json";
    const urlAPI = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CAMINHO_ARQUIVO}`;

    // Estilos internos das abas e formulário
    const estiloAbas = `
        <style>
            .tabs-reg { display: flex; gap: 6px; margin-bottom: 12px; border-bottom: 2px solid ${corBorda}; padding-bottom: 8px; }
            .tab-btn-reg { flex: 1; padding: 8px; border: 1px solid ${corBorda}; background: white; color: ${corTema}; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 13px; transition: 0.2s; }
            .tab-btn-reg.active { background: ${corTema}; color: white; border-color: ${corTema}; }
            .grid-reg { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
            .grid-reg label { font-size: 12px; font-weight: bold; color: #333; }
            .grid-reg input, .grid-reg select, .grid-reg textarea { width: 95%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: white; }
            .full-col { grid-column: span 2; }
            .badge-tipo { padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; color: white; display: inline-block; }
        </style>
    `;

    // Monta as opções de FOV e Binagem da câmera
    const datalistFov = camConfig.fovOpcoes.map(op => `<option value="${op}">`).join("");
    const selectBin = camConfig.binOpcoes.map(op => `<option value="${op}">${op}</option>`).join("");

    container.innerHTML = `
        ${estiloAbas}
        <div class="aux-box" style="margin-top: 15px;">
            <span class="solar-title" style="color: ${corTema}; margin-bottom: 8px;">
                Relatório de Observação — Detector: ${detParam.toUpperCase()}
            </span>

            <!-- Abas: Objeto vs Calibração -->
            <div class="tabs-reg">
                <button type="button" id="tab_btn_obj" class="tab-btn-reg active" onclick="alternarAbaRegistro('objeto')">
                    Observação de Objeto
                </button>
                <button type="button" id="tab_btn_cal" class="tab-btn-reg" onclick="alternarAbaRegistro('calibracao')">
                    ⚙️ Calibração (Dark / Bias / Flat)
                </button>
            </div>

            <div class="grid-reg">
                <!-- Campo exclusivo da aba Objeto -->
                <div id="campo_nome_obj" class="full-col">
                    <label>Nome do Objeto:</label><br>
                    <input type="text" id="reg_obj" placeholder="Ex: 2000 TG64">
                </div>

                <!-- Campo exclusivo da aba Calibração -->
                <div id="campo_tipo_cal" class="full-col" style="display: none;">
                    <label>Tipo de Calibração:</label><br>
                    <select id="reg_tipo_cal">
                        <option value="Flat">Flat</option>
                        <option value="Dark">Dark</option>
                        <option value="Bias">Bias</option>
                    </select>
                </div>

                <div>
                    <label>Início da Aquisição (UTC):</label><br>
                    <input type="text" id="reg_ini" placeholder="Ex: 01:40:00">
                </div>
                <div>
                    <label>T. Observação ou Nº Imagens:</label><br>
                    <input type="text" id="reg_duracao" placeholder="Ex: 600s ou 1500 img">
                </div>

                <div>
                    <label>Tempo de Exposição (s):</label><br>
                    <input type="text" id="reg_texp" placeholder="Ex: 0.2s">
                </div>
                <div>
                    <label>Ganho (Gain):</label><br>
                    <input type="text" id="reg_gain" value="${camConfig.ganhoPadrao}" placeholder="Ex: 150 ou High">
                </div>

                <div>
                    <label>FOV (Tamanho do Campo):</label><br>
                    <input type="text" id="reg_fov" list="lista_fov_cam" placeholder="Selecione ou digite">
                    <datalist id="lista_fov_cam">${datalistFov}</datalist>
                </div>
                <div>
                    <label>Binagem:</label><br>
                    <select id="reg_bin">${selectBin}</select>
                </div>

                <!-- Campos exclusivos da aba Objeto -->
                <div id="campo_xy">
                    <label>Posição do Alvo (X, Y):</label><br>
                    <input type="text" id="reg_xy" placeholder="Ex: 512, 512">
                </div>
                <div id="campo_foco_wrapper">
                    <label>Foco do Telescópio:</label><br>
                    <input type="text" id="reg_foco" placeholder="Ex: 12450">
                </div>

                <div id="campo_mag_obj">
                    <label>Magnitude da Estrela / Objeto:</label><br>
                    <input type="text" id="reg_mag_obj" placeholder="Ex: 13.4">
                </div>
                <div id="campo_mag_ast">
                    <label>Magnitude do Asteroide:</label><br>
                    <input type="text" id="reg_mag_ast" placeholder="Ex: 18.2">
                </div>

                <div class="full-col">
                    <label>Nome do Arquivo / Pasta:</label><br>
                    <input type="text" id="reg_arquivo" placeholder="Ex: 2000TG64_20261028_0140.ser">
                </div>

                <div class="full-col">
                    <label>Comentários / Condições do Céu:</label><br>
                    <textarea id="reg_comentarios" rows="2" placeholder="Ex: Céu limpo, vento fraco, passagem de nuvens finas..."></textarea>
                </div>

                <div class="full-col">
                    <label style="font-size: 11px; color: #555;">Chave GitHub (Token - salvo automaticamente após a 1ª vez):</label><br>
                    <input type="password" id="reg_token" placeholder="github_pat_... ou ghp_..." style="font-size: 12px;">
                </div>
            </div>

            <button type="button" id="btnSalvarRegistro" class="btn-download" style="width: 100%; border: none; cursor: pointer; padding: 10px;">
                Salvar Registro no GitHub
            </button>
            <div id="statusRegistro" style="font-size: 12px; margin-top: 8px; font-weight: bold; text-align: center;"></div>

            <!-- Tabela de Registros da Noite -->
            <div id="areaTabelaRegistros" style="margin-top: 15px; display: none;">
                <strong style="font-size: 14px; color: ${corTema};">Registros Gravados nesta Noite:</strong>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 8px; background: white; text-align: center;">
                        <thead>
                            <tr style="background: ${corFundoClaro}; color: ${corTema};">
                                <th style="border: 1px solid ${corBorda}; padding: 5px;">Tipo / Alvo</th>
                                <th style="border: 1px solid ${corBorda}; padding: 5px;">Início</th>
                                <th style="border: 1px solid ${corBorda}; padding: 5px;">Duração/Imgs</th>
                                <th style="border: 1px solid ${corBorda}; padding: 5px;">T. Exp / Gain</th>
                                <th style="border: 1px solid ${corBorda}; padding: 5px;">FOV / Bin</th>
                                <th style="border: 1px solid ${corBorda}; padding: 5px;">X, Y / Foco</th>
                                <th style="border: 1px solid ${corBorda}; padding: 5px;">Mag (Est/Ast)</th>
                                <th style="border: 1px solid ${corBorda}; padding: 5px;">Arquivo / Notas</th>
                            </tr>
                        </thead>
                        <tbody id="corpoTabelaRegistros"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Recupera o token salvo no navegador
    if (localStorage.getItem("gh_token_obs")) {
        document.getElementById("reg_token").value = localStorage.getItem("gh_token_obs");
    }

    // Associa o clique do botão à função de salvamento
    document.getElementById("btnSalvarRegistro").addEventListener("click", () => {
        salvarNoGitHub(urlAPI, chaveNoite, telescopioNome, detParam, corTema, corBorda);
    });

    // Carrega os registros já existentes na noite
    carregarRegistrosExistentes(urlAPI, chaveNoite, telescopioNome, corTema, corBorda);
}

// Alterna entre a aba de Objeto e a aba de Calibração
window.alternarAbaRegistro = function(aba) {
    abaAtualRegistro = aba;
    const isObj = (aba === "objeto");

    document.getElementById("tab_btn_obj").classList.toggle("active", isObj);
    document.getElementById("tab_btn_cal").classList.toggle("active", !isObj);

    document.getElementById("campo_nome_obj").style.display = isObj ? "block" : "none";
    document.getElementById("campo_tipo_cal").style.display = isObj ? "none" : "block";
    document.getElementById("campo_xy").style.display = isObj ? "block" : "none";
    document.getElementById("campo_mag_obj").style.display = isObj ? "block" : "none";
    document.getElementById("campo_mag_ast").style.display = isObj ? "block" : "none";

    // Na aba calibração, o campo de Foco ocupa as duas colunas para manter o alinhamento
    document.getElementById("campo_foco_wrapper").className = isObj ? "" : "full-col";
};

async function carregarRegistrosExistentes(urlAPI, chaveNoite, telescopioNome, corTema, corBorda) {
    try {
        const resp = await fetch(urlAPI, { cache: "no-store" });
        if (!resp.ok) return;
        const fileData = await resp.json();
        const conteudoTexto = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ""))));
        const dados = JSON.parse(conteudoTexto || "{}");

        const lista = (dados[chaveNoite] || []).filter(item => item.telescopio === telescopioNome);
        renderizarTabelaRegistros(lista, corTema, corBorda);
    } catch (e) {
        console.log("Nenhum registro anterior encontrado para esta noite.");
    }
}

function renderizarTabelaRegistros(lista, corTema, corBorda) {
    const tbody = document.getElementById("corpoTabelaRegistros");
    const area = document.getElementById("areaTabelaRegistros");
    tbody.innerHTML = "";

    if (!lista || lista.length === 0) {
        area.style.display = "none";
        return;
    }

    area.style.display = "block";
    lista.forEach(r => {
        const isCal = r.categoria === "Calibração";
        const corBadge = isCal ? "#555" : corTema;
        const tituloAlvo = isCal ? `<span class="badge-tipo" style="background:${corBadge}">CAL: ${r.objeto}</span>` 
                                 : `<span class="badge-tipo" style="background:${corBadge}">ALVO</span><br><b>${r.objeto}</b>`;
        const xyFoco = isCal ? `Foco: ${r.foco || "---"}` : `XY: ${r.xy || "---"}<br>Foco: ${r.foco || "---"}`;
        const mags = isCal ? "---" : `${r.mag_obj || "---"} / ${r.mag_ast || "---"}`;
        const arqNotas = `<b>${r.arquivo || "---"}</b>` + (r.comentarios ? `<br><i style="color:#555;">"${r.comentarios}"</i>` : "");

        tbody.innerHTML += `
            <tr>
                <td style="border: 1px solid ${corBorda}; padding: 5px;">${tituloAlvo}</td>
                <td style="border: 1px solid ${corBorda}; padding: 5px;">${r.inicio || "---"}</td>
                <td style="border: 1px solid ${corBorda}; padding: 5px;">${r.duracao || "---"}</td>
                <td style="border: 1px solid ${corBorda}; padding: 5px;">${r.texp || "---"}<br><small>G: ${r.gain || "---"}</small></td>
                <td style="border: 1px solid ${corBorda}; padding: 5px;">${r.fov || "---"}<br><small>Bin: ${r.bin || "---"}</small></td>
                <td style="border: 1px solid ${corBorda}; padding: 5px;">${xyFoco}</td>
                <td style="border: 1px solid ${corBorda}; padding: 5px;">${mags}</td>
                <td style="border: 1px solid ${corBorda}; padding: 5px; text-align: left;">${arqNotas}</td>
            </tr>
        `;
    });
}

async function salvarNoGitHub(urlAPI, chaveNoite, telescopioNome, detectorNome, corTema, corBorda) {
    const isObj = (abaAtualRegistro === "objeto");
    const nomeAlvoOuCal = isObj ? document.getElementById("reg_obj").value.trim() 
                                : document.getElementById("reg_tipo_cal").value;

    const inicio = document.getElementById("reg_ini").value.trim() || "---";
    const duracao = document.getElementById("reg_duracao").value.trim() || "---";
    const texp = document.getElementById("reg_texp").value.trim() || "---";
    const gain = document.getElementById("reg_gain").value.trim() || "---";
    const fov = document.getElementById("reg_fov").value.trim() || "Full Frame";
    const bin = document.getElementById("reg_bin").value;
    const xy = isObj ? (document.getElementById("reg_xy").value.trim() || "---") : "---";
    const foco = document.getElementById("reg_foco").value.trim() || "---";
    const mag_obj = isObj ? (document.getElementById("reg_mag_obj").value.trim() || "---") : "---";
    const mag_ast = isObj ? (document.getElementById("reg_mag_ast").value.trim() || "---") : "---";
    const arquivo = document.getElementById("reg_arquivo").value.trim() || "---";
    const comentarios = document.getElementById("reg_comentarios").value.trim() || "";
    const token = document.getElementById("reg_token").value.trim();
    const status = document.getElementById("statusRegistro");

    if (isObj && !nomeAlvoOuCal) {
        status.style.color = "#d32f2f";
        status.innerText = "Digite o nome do objeto observado!";
        return;
    }
    if (!token) {
        status.style.color = "#d32f2f";
        status.innerText = "Insira a chave do GitHub (Token) para salvar!";
        return;
    }

    localStorage.setItem("gh_token_obs", token);
    status.style.color = corTema;
    status.innerText = "Enviando registro para o GitHub...";

    try {
        let sha = null;
        let jsonAtual = {};

        const getResp = await fetch(urlAPI, {
            headers: { "Authorization": `Bearer ${token}` },
            cache: "no-store"
        });

        if (getResp.status === 200) {
            const fileData = await getResp.json();
            sha = fileData.sha;
            const conteudoTexto = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ""))));
            jsonAtual = JSON.parse(conteudoTexto || "{}");
        } else if (getResp.status !== 404) {
            throw new Error("Verifique se o Token e o repositório estão corretos.");
        }

        if (!jsonAtual[chaveNoite]) jsonAtual[chaveNoite] = [];

        jsonAtual[chaveNoite].push({
            telescopio: telescopioNome,
            detector: detectorNome,
            categoria: isObj ? "Observação" : "Calibração",
            objeto: nomeAlvoOuCal,
            inicio: inicio,
            duracao: duracao,
            texp: texp,
            gain: gain,
            fov: fov,
            bin: bin,
            xy: xy,
            foco: foco,
            mag_obj: mag_obj,
            mag_ast: mag_ast,
            arquivo: arquivo,
            comentarios: comentarios,
            timestamp_envio: new Date().toISOString()
        });

        const novoTexto = JSON.stringify(jsonAtual, null, 2);
        const novoBase64 = btoa(unescape(encodeURIComponent(novoTexto)));

        const bodyPayload = {
            message: `Registro ${telescopioNome} (${isObj ? "Alvo" : "Calib"}): ${nomeAlvoOuCal} em ${chaveNoite}`,
            content: novoBase64
        };
        if (sha) bodyPayload.sha = sha;

        const putResp = await fetch(urlAPI, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(bodyPayload)
        });

        if (!putResp.ok) throw new Error("Falha ao gravar no GitHub.");

        status.style.color = "#2e7d32";
        status.innerText = "Registro salvo com sucesso!";

        if (isObj) document.getElementById("reg_obj").value = "";
        document.getElementById("reg_arquivo").value = "";
        document.getElementById("reg_comentarios").value = "";

        const registrosTel = jsonAtual[chaveNoite].filter(item => item.telescopio === telescopioNome);
        renderizarTabelaRegistros(registrosTel, corTema, corBorda);

    } catch (erro) {
        console.error(erro);
        status.style.color = "#d32f2f";
        status.innerText = "Erro: " + erro.message;
    }
}
