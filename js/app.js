const STORAGE_KEY = 'controle_dividas';
let currentRecordCount = 0;
let dividas = [];
let editingId = null;
let statusChart, vencimentoChart;

// Temas
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeIcon = document.querySelector('#theme-toggle i');
    themeIcon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    const themeIcon = document.querySelector('#theme-toggle i');
    themeIcon.className = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// Saudação dinâmica
function atualizarSaudacao() {
    const hora = new Date().getHours();
    const greeting = document.getElementById('greeting');
    
    if (hora < 12) {
        greeting.textContent = 'Bom dia! 🌅';
    } else if (hora < 18) {
        greeting.textContent = 'Boa tarde! ☀️';
    } else {
        greeting.textContent = 'Boa noite! 🌙';
    }
}

// Funções para gerenciar localStorage
function carregarDividas() {
    const dados = localStorage.getItem(STORAGE_KEY);
    if (dados) {
        dividas = JSON.parse(dados);
        currentRecordCount = dividas.length;
    } else {
        dividas = [];
        currentRecordCount = 0;
    }
    atualizarEstatisticas();
    verificarVencimentos();
    renderDividas();
    calcularTotais();
    atualizarGraficos();
}

function salvarDividas() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dividas));
    currentRecordCount = dividas.length;
    atualizarEstatisticas();
    verificarVencimentos();
    renderDividas();
    calcularTotais();
    atualizarGraficos();
}

function verificarVencimentos() {
    const hoje = new Date();
    dividas.forEach(divida => {
        if (divida.status === 'pendente' && divida.dataVencimento) {
            const vencimento = new Date(divida.dataVencimento);
            const diffTime = vencimento - hoje;
            const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            divida.diasRestantes = diffDias;
            divida.estaVencida = diffDias < 0;
        }
    });
}

function atualizarEstatisticas() {
    document.getElementById('total-devedores').textContent = dividas.length;
    
    const vencidas = dividas.filter(d => d.estaVencida && d.status === 'pendente').length;
    const avencer = dividas.filter(d => !d.estaVencida && d.status === 'pendente').length;
    
    document.getElementById('total-vencidas').textContent = vencidas;
    document.getElementById('total-avencer').textContent = avencer;
}

function calcularTotais() {
    const totalPendente = dividas
        .filter(d => d.status === 'pendente')
        .reduce((sum, d) => sum + d.valor, 0);
    
    const totalPago = dividas
        .filter(d => d.status === 'pago')
        .reduce((sum, d) => sum + d.valor, 0);

    const totalVencidas = dividas
        .filter(d => d.estaVencida && d.status === 'pendente')
        .reduce((sum, d) => sum + d.valor, 0);

    document.getElementById('total-pendente').textContent = 
        "MT " + totalPendente.toFixed(2).replace('.', ',');
    
    document.getElementById('total-pago').textContent = 
        "MT " + totalPago.toFixed(2).replace('.', ',');
    
    document.getElementById('total-vencidas-valor').textContent = 
        "MT " + totalVencidas.toFixed(2).replace('.', ',');
}

// Gráficos
function inicializarGraficos() {
    const ctx1 = document.getElementById('statusChart').getContext('2d');
    const ctx2 = document.getElementById('vencimentoChart').getContext('2d');
    
    statusChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Pendentes', 'Pagos'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#ed8936', '#48bb78'],
                borderColor: ['#dd6b20', '#38a169'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: document.body.getAttribute('data-theme') === 'dark' ? '#fff' : '#2d3748'
                    }
                },
                title: {
                    display: true,
                    text: 'Status das Dívidas',
                    color: document.body.getAttribute('data-theme') === 'dark' ? '#fff' : '#2d3748'
                }
            }
        }
    });

    vencimentoChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['A Vencer', 'Vencidas'],
            datasets: [{
                label: 'Quantidade',
                data: [0, 0],
                backgroundColor: ['#4299e1', '#f56565'],
                borderColor: ['#3182ce', '#e53e3e'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Dívidas por Vencimento',
                    color: document.body.getAttribute('data-theme') === 'dark' ? '#fff' : '#2d3748'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: document.body.getAttribute('data-theme') === 'dark' ? '#fff' : '#2d3748'
                    },
                    grid: {
                        color: document.body.getAttribute('data-theme') === 'dark' ? '#4a5568' : '#e2e8f0'
                    }
                },
                x: {
                    ticks: {
                        color: document.body.getAttribute('data-theme') === 'dark' ? '#fff' : '#2d3748'
                    },
                    grid: {
                        color: document.body.getAttribute('data-theme') === 'dark' ? '#4a5568' : '#e2e8f0'
                    }
                }
            }
        }
    });
}

function atualizarGraficos() {
    if (!statusChart || !vencimentoChart) {
        inicializarGraficos();
    }

    const pendentes = dividas.filter(d => d.status === 'pendente').length;
    const pagos = dividas.filter(d => d.status === 'pago').length;
    const vencidas = dividas.filter(d => d.estaVencida && d.status === 'pendente').length;
    const avencer = dividas.filter(d => !d.estaVencida && d.status === 'pendente').length;

    statusChart.data.datasets[0].data = [pendentes, pagos];
    statusChart.update();

    vencimentoChart.data.datasets[0].data = [avencer, vencidas];
    vencimentoChart.update();
}

async function init() {
    loadTheme();
    atualizarSaudacao();
    carregarDividas();
    inicializarGraficos();
    
    const form = document.getElementById('form-devedor');
    form.addEventListener('submit', handleSubmit);

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Busca e filtros
    document.getElementById('search-input').addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase();
        filtrarDividas(termo, document.getElementById('filter-status').value);
    });

    document.getElementById('filter-status').addEventListener('change', function(e) {
        const termo = document.getElementById('search-input').value.toLowerCase();
        filtrarDividas(termo, e.target.value);
    });

    // Atualizar saudação a cada minuto
    setInterval(atualizarSaudacao, 60000);
}

function filtrarDividas(termo, status) {
    let dividasFiltradas = [...dividas];

    if (termo) {
        dividasFiltradas = dividasFiltradas.filter(d => 
            d.nome.toLowerCase().includes(termo)
        );
    }

    if (status !== 'todos') {
        if (status === 'vencido') {
            dividasFiltradas = dividasFiltradas.filter(d => d.estaVencida && d.status === 'pendente');
        } else {
            dividasFiltradas = dividasFiltradas.filter(d => d.status === status);
        }
    }
    
    renderDividas(dividasFiltradas);
}

function calcularDataVencimento(dataBase, prazoDias) {
    const data = new Date(dataBase);
    data.setDate(data.getDate() + prazoDias);
    return data.toISOString().split('T')[0];
}

function getMensagemDecepcionante(nome, diasAtraso) {
    const mensagens = [
        `😔 Olá ${nome}, estou realmente decepcionado... Já se passaram ${diasAtraso} dias do prazo e ainda não recebi seu pagamento.`,
        `💔 É uma pena ter que cobrar novamente, ${nome}. Sua dívida está há ${diasAtraso} dias vencida.`,
        `😢 Fico triste em ver que você não cumpriu com o combinado, ${nome}. ${diasAtraso} dias de atraso já passaram.`,
        `🤔 ${nome}, você sempre foi uma pessoa de palavra. Por que deixou a dívida vencer há ${diasAtraso} dias?`,
        `💔 Isso não é legal, ${nome}. Sua dívida está vencida há ${diasAtraso} dias e ainda sem pagamento.`
    ];
    return mensagens[Math.floor(Math.random() * mensagens.length)];
}

async function handleSubmit(e) {
    e.preventDefault();

    const nome = document.getElementById('input-nome').value.trim();
    const email = document.getElementById('input-email').value.trim();
    const telefone = document.getElementById('input-telefone').value.trim();
    const valor = parseFloat(document.getElementById('input-valor').value);
    const data = document.getElementById('input-data').value;
    const prazo = parseInt(document.getElementById('input-prazo').value);
    const observacoes = document.getElementById('input-observacoes').value;

    if (!nome || isNaN(valor) || valor <= 0 || !prazo) {
        showToast("⚠️ Por favor, preencha todos os campos obrigatórios!", "warning");
        return;
    }

    const dataVencimento = calcularDataVencimento(data, prazo);

    const btnSubmit = document.getElementById('btn-submit');
    const btnText = document.getElementById('btn-text-adicionar');
    const originalText = btnText.textContent;

    btnSubmit.disabled = true;
    btnText.innerHTML = '<span class="loading-spinner"></span>';

    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        const devedorExistente = dividas.find(d => 
            d.nome.toLowerCase() === nome.toLowerCase() && d.id !== editingId && d.status === 'pendente'
        );

        if (devedorExistente && !editingId) {
            devedorExistente.valor += valor;
            devedorExistente.email = email || devedorExistente.email;
            devedorExistente.telefone = telefone || devedorExistente.telefone;
            devedorExistente.data = data;
            devedorExistente.dataVencimento = dataVencimento;
            devedorExistente.prazo = prazo;
            devedorExistente.observacoes = observacoes || devedorExistente.observacoes;
            devedorExistente.status = "pendente";

            salvarDividas();
            showToast("✅ Dívida de " + nome + " atualizada! Novo valor: MT " + devedorExistente.valor.toFixed(2));
            document.getElementById('form-devedor').reset();
            if (editingId) cancelEdit();
        } else if (editingId) {
            const divida = dividas.find(d => d.id === editingId);
            if (divida) {
                divida.nome = nome;
                divida.email = email;
                divida.telefone = telefone;
                divida.valor = valor;
                divida.data = data;
                divida.prazo = prazo;
                divida.dataVencimento = dataVencimento;
                divida.observacoes = observacoes;

                salvarDividas();
                showToast("✅ Devedor atualizado com sucesso!");
                cancelEdit();
            }
        } else {
            if (currentRecordCount >= 999) {
                showToast("⚠️ Limite de 999 devedores atingido!", "warning");
                btnSubmit.disabled = false;
                btnText.textContent = originalText;
                return;
            }

            const novaDivida = {
                id: Date.now().toString(),
                nome,
                email,
                telefone,
                valor,
                status: "pendente",
                data,
                prazo,
                dataVencimento,
                observacoes,
                criadoEm: new Date().toISOString()
            };

            dividas.push(novaDivida);
            salvarDividas();
            showToast("✅ Devedor adicionado com sucesso!");
            document.getElementById('form-devedor').reset();
        }
    } catch (error) {
        console.error("Erro:", error);
        showToast("❌ Erro ao processar a operação. Tente novamente.", "error");
    } finally {
        btnSubmit.disabled = false;
        btnText.textContent = originalText;
    }
}

function renderDividas(listaParaRenderizar = dividas) {
    const container = document.getElementById('dividas-container');
    
    if (listaParaRenderizar.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <h3>Nenhuma dívida encontrada</h3>
                <p>Adicione um devedor usando o formulário acima</p>
            </div>
        `;
        return;
    }

    const dividasOrdenadas = [...listaParaRenderizar].sort((a, b) => {
        if (a.status !== b.status) {
            return a.status === 'pendente' ? -1 : 1;
        }
        if (a.estaVencida && !b.estaVencida) return -1;
        if (!a.estaVencida && b.estaVencida) return 1;
        return new Date(b.criadoEm) - new Date(a.criadoEm);
    });

    container.innerHTML = dividasOrdenadas.map(divida => {
        const hoje = new Date();
        const vencimento = divida.dataVencimento ? new Date(divida.dataVencimento) : null;
        const diasAtraso = vencimento ? Math.ceil((hoje - vencimento) / (1000 * 60 * 60 * 24)) : 0;
        
        const statusClass = divida.status === 'pago' ? 'pago' : (divida.estaVencida ? 'vencida' : '');
        const statusLabel = divida.status === 'pago' ? 'Pago' : (divida.estaVencida ? 'Vencida' : 'Pendente');
        const statusBadge = divida.status === 'pago' ? 'status-pago' : (divida.estaVencida ? 'status-vencido' : 'status-pendente');
        
        const dataFormatada = divida.data ? new Date(divida.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
        const vencimentoFormatado = divida.dataVencimento ? new Date(divida.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '';
        const telefoneFormatado = divida.telefone ? formatarTelefone(divida.telefone) : '';

        return `
            <div class="divida-item ${statusClass}" data-id="${divida.id}">
                <div class="divida-info">
                    <h3>
                        <span class="divida-nome">
                            <i class="fas fa-user"></i> ${divida.nome}
                            ${divida.estaVencida ? '<span class="status-badge"><i class="fas fa-exclamation-triangle"></i> VENCIDA</span>' : ''}
                        </span>
                    </h3>
                    
                    ${divida.estaVencida && divida.status === 'pendente' ? 
                        `<div class="mensagem-decepcionante">
                            <i class="fas fa-frown"></i>
                            ${getMensagemDecepcionante(divida.nome, diasAtraso)}
                        </div>` : ''
                    }
                    
                    <div class="divida-detalhes">
                        ${dataFormatada ? `<span><i class="fas fa-calendar-alt"></i> Criada: ${dataFormatada}</span>` : ''}
                        ${vencimentoFormatado ? `<span><i class="fas fa-hourglass-end"></i> Vence: ${vencimentoFormatado}</span>` : ''}
                        ${divida.prazo ? `<span><i class="fas fa-clock"></i> Prazo: ${divida.prazo} dias</span>` : ''}
                    </div>
                    
                    <div class="divida-contato">
                        ${divida.email ? `<span class="contato-item"><i class="fas fa-envelope"></i> ${divida.email}</span>` : ''}
                        ${telefoneFormatado ? `<span class="contato-item"><i class="fas fa-phone"></i> ${telefoneFormatado}</span>` : ''}
                    </div>
                    
                    ${divida.observacoes ? `
                        <div class="divida-detalhes">
                            <span><i class="fas fa-comment"></i> ${divida.observacoes}</span>
                        </div>
                    ` : ''}
                </div>
                
                <p class="divida-valor">
                    MT ${divida.valor.toFixed(2).replace('.', ',')}
                </p>
                
                <span class="divida-status ${statusBadge}">
                    <i class="fas ${divida.status === 'pago' ? 'fa-check-circle' : (divida.estaVencida ? 'fa-exclamation-circle' : 'fa-clock')}"></i>
                    ${statusLabel}
                </span>
                
                <div class="divida-actions">
                    ${divida.status === 'pendente' ? 
                        `<button class="btn btn-small btn-success" onclick="marcarComoPago('${divida.id}')">
                            <i class="fas fa-check"></i> Pago
                        </button>` :
                        `<button class="btn btn-small btn-warning" onclick="marcarComoPendente('${divida.id}')">
                            <i class="fas fa-undo"></i> Reativar
                        </button>`
                    }
                    
                    <div class="btn-group">
                        <button class="btn btn-small btn-whatsapp" onclick="enviarCobrancaWhatsApp('${divida.id}')" ${!divida.telefone ? 'disabled' : ''}>
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        
                        <button class="btn btn-small btn-email" onclick="enviarCobrancaEmail('${divida.id}')" ${!divida.email ? 'disabled' : ''}>
                            <i class="fas fa-envelope"></i>
                        </button>
                        
                        <button class="btn btn-small btn-sms" onclick="enviarCobrancaSMS('${divida.id}')" ${!divida.telefone ? 'disabled' : ''}>
                            <i class="fas fa-sms"></i>
                        </button>
                    </div>
                    
                    <button class="btn btn-small btn-edit" onclick="editarDivida('${divida.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    
                    <button class="btn btn-small btn-danger" onclick="removerDivida('${divida.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function formatarTelefone(telefone) {
    if (telefone.length === 12 && telefone.startsWith('258')) {
        return `+${telefone.slice(0,3)} ${telefone.slice(3,5)} ${telefone.slice(5,8)} ${telefone.slice(8)}`;
    }
    return telefone;
}

function getMensagemCobranca(divida, tipo) {
    const valorFormatado = divida.valor.toFixed(2).replace('.', ',');
    const hoje = new Date();
    const vencimento = divida.dataVencimento ? new Date(divida.dataVencimento) : null;
    const diasAtraso = vencimento ? Math.ceil((hoje - vencimento) / (1000 * 60 * 60 * 24)) : 0;
    const estaVencida = diasAtraso > 0;

    let mensagemBase = estaVencida ? 
        getMensagemDecepcionante(divida.nome, diasAtraso) + '\n\n' : 
        `Olá ${divida.nome}, tudo bem? Passando para lembrar sobre o pagamento.\n\n`;

    const dadosPagamento = `
DADOS PARA PAGAMENTO:
━━━━━━━━━━━━━━━━━━━━━
💰 E-mola: 463391 - Irado Jacinto Muabsa
💳 M-pesa: 95085 - Banca Supai Renato
━━━━━━━━━━━━━━━━━━━━━

📲 Após o pagamento, envie o comprovativo para 846178342

Atenciosamente,
Equipe de Cobrança`;

    const mensagemCompleta = mensagemBase +
        `💰 Valor: MT ${valorFormatado}\n` +
        `📅 Vencimento: ${divida.dataVencimento ? new Date(divida.dataVencimento).toLocaleDateString('pt-BR') : 'Não informado'}\n` +
        `${divida.observacoes ? `📝 Obs: ${divida.observacoes}\n` : ''}` +
        `${dadosPagamento}`;

    if (tipo === 'sms') {
        // SMS mais curto
        return `Cobranca ${divida.nome}: MT ${valorFormatado} ${estaVencida ? `VENCIDA HA ${diasAtraso} DIAS` : ''}. E-mola:463391, M-pesa:95085. Comprovativo:846178342`;
    }

    return mensagemCompleta;
}

function enviarCobrancaWhatsApp(id) {
    const divida = dividas.find(d => d.id === id);
    if (!divida) return;
    
    if (!divida.telefone) {
        showToast("⚠️ Este devedor não tem telefone cadastrado!", "warning");
        return;
    }

    const mensagem = getMensagemCobranca(divida, 'whatsapp');
    const mensagemCodificada = encodeURIComponent(mensagem);
    const telefone = divida.telefone.replace(/\D/g, '');
    
    window.open(`https://wa.me/${telefone}?text=${mensagemCodificada}`, '_blank');
    showToast("📱 Mensagem preparada no WhatsApp!");
}

function enviarCobrancaEmail(id) {
    const divida = dividas.find(d => d.id === id);
    if (!divida) return;
    
    if (!divida.email) {
        showToast("⚠️ Este devedor não tem e-mail cadastrado!", "warning");
        return;
    }

    const mensagem = getMensagemCobranca(divida, 'email');
    const assunto = `Cobrança de Dívida - ${divida.nome}`;
    
    window.location.href = `mailto:${divida.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`;
    showToast("📧 Cliente de e-mail aberto!");
}

function enviarCobrancaSMS(id) {
    const divida = dividas.find(d => d.id === id);
    if (!divida) return;
    
    if (!divida.telefone) {
        showToast("⚠️ Este devedor não tem telefone cadastrado!", "warning");
        return;
    }

    const mensagem = getMensagemCobranca(divida, 'sms');
    const telefone = divida.telefone.replace(/\D/g, '');
    
    window.location.href = `sms:${telefone}?body=${encodeURIComponent(mensagem)}`;
    showToast("📱 Aplicativo de SMS aberto!");
}

function mostrarPreviewMensagem(tipo) {
    const modal = document.getElementById('mensagemModal');
    const preview = document.getElementById('mensagemPreview');
    
    // Usar o primeiro devedor pendente como exemplo, ou criar um exemplo genérico
    const devedorExemplo = dividas.find(d => d.status === 'pendente') || {
        nome: 'João Silva',
        valor: 1500.00,
        dataVencimento: new Date(Date.now() - 5*24*60*60*1000).toISOString().split('T')[0],
        observacoes: 'Pagamento atrasado'
    };
    
    const mensagem = getMensagemCobranca(devedorExemplo, tipo);
    preview.textContent = mensagem;
    
    modal.classList.add('show');
    
    document.getElementById('copiarMensagemBtn').onclick = () => {
        copiarTexto(mensagem);
        showToast("📋 Mensagem copiada!");
    };
}

function fecharModal() {
    document.getElementById('mensagemModal').classList.remove('show');
}

async function marcarComoPago(id) {
    const divida = dividas.find(d => d.id === id);
    if (divida) {
        divida.status = 'pago';
        divida.dataPagamento = new Date().toISOString();
        
        const btn = event.target.closest('button');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span>';
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        salvarDividas();
        showToast("✅ Dívida marcada como paga!");
        
        btn.disabled = false;
    }
}

async function marcarComoPendente(id) {
    const divida = dividas.find(d => d.id === id);
    if (divida) {
        divida.status = 'pendente';
        delete divida.dataPagamento;
        
        const btn = event.target.closest('button');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span>';
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        salvarDividas();
        showToast("🔄 Dívida reativada!");
        
        btn.disabled = false;
    }
}

function editarDivida(id) {
    const divida = dividas.find(d => d.id === id);
    if (divida) {
        editingId = id;
        document.getElementById('input-nome').value = divida.nome;
        document.getElementById('input-email').value = divida.email || '';
        document.getElementById('input-telefone').value = divida.telefone || '';
        document.getElementById('input-valor').value = divida.valor;
        document.getElementById('input-data').value = divida.data || '';
        document.getElementById('input-prazo').value = divida.prazo || 30;
        document.getElementById('input-observacoes').value = divida.observacoes || '';
        
        const btnText = document.getElementById('btn-text-adicionar');
        btnText.textContent = 'Atualizar Devedor';
        
        document.getElementById('form-devedor').scrollIntoView({ behavior: 'smooth' });
        showToast("✏️ Editando devedor. Altere os campos e clique em Atualizar.");
    }
}

function cancelEdit() {
    editingId = null;
    document.getElementById('form-devedor').reset();
    const btnText = document.getElementById('btn-text-adicionar');
    btnText.textContent = 'Adicionar Devedor';
    
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('input-data').value = hoje;
    document.getElementById('input-prazo').value = 30;
}

async function removerDivida(id) {
    if (!confirm("🗑️ Tem certeza que deseja remover este devedor?")) {
        return;
    }
    
    const divida = dividas.find(d => d.id === id);
    if (divida) {
        const item = document.querySelector(`[data-id="${id}"]`);
        item.style.opacity = '0.5';
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        dividas = dividas.filter(d => d.id !== id);
        salvarDividas();
        showToast("🗑️ Devedor removido com sucesso!");
        
        if (editingId === id) {
            cancelEdit();
        }
    }
}

function copiarTexto(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        showToast("📋 Copiado!");
    });
}

function showToast(message, type = "success") {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '✅';
    if (type === "warning") icon = '⚠️';
    if (type === "error") icon = '❌';
    
    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Inicializar
document.addEventListener('DOMContentLoaded', init);

// Definir data atual
window.onload = function() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('input-data').value = hoje;
};

// Fechar modal com ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        fecharModal();
    }
});
