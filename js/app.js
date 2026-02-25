const STORAGE_KEY = 'controle_dividas';
let currentRecordCount = 0;
let dividas = [];
let editingId = null;

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
    renderDividas();
    calcularTotais();
}

function salvarDividas() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dividas));
    currentRecordCount = dividas.length;
    atualizarEstatisticas();
    renderDividas();
    calcularTotais();
}

function atualizarEstatisticas() {
    document.getElementById('total-devedores').textContent = dividas.length;
    const pendentes = dividas.filter(d => d.status === 'pendente').length;
    document.getElementById('total-pendentes').textContent = pendentes;
}

function calcularTotais() {
    const totalPendente = dividas
        .filter(d => d.status === 'pendente')
        .reduce((sum, d) => sum + d.valor, 0);
    
    const totalPago = dividas
        .filter(d => d.status === 'pago')
        .reduce((sum, d) => sum + d.valor, 0);

    document.getElementById('total-pendente').textContent = 
        "MT " + totalPendente.toFixed(2).replace('.', ',');
    
    document.getElementById('total-pago').textContent = 
        "MT " + totalPago.toFixed(2).replace('.', ',');
}

async function init() {
    carregarDividas();
    
    const form = document.getElementById('form-devedor');
    form.addEventListener('submit', handleSubmit);

    // Adicionar busca
    document.getElementById('search-input').addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase();
        filtrarDividas(termo);
    });
}

function filtrarDividas(termo) {
    if (!termo) {
        renderDividas();
        return;
    }

    const dividasFiltradas = dividas.filter(d => 
        d.nome.toLowerCase().includes(termo)
    );
    
    renderDividas(dividasFiltradas);
}

async function handleSubmit(e) {
    e.preventDefault();

    const nome = document.getElementById('input-nome').value.trim();
    const telefone = document.getElementById('input-telefone').value.trim();
    const valor = parseFloat(document.getElementById('input-valor').value);
    const data = document.getElementById('input-data').value;
    const observacoes = document.getElementById('input-observacoes').value;

    if (!nome || isNaN(valor) || valor <= 0) {
        showToast("⚠️ Por favor, preencha o nome e um valor válido!", "warning");
        return;
    }

    const btnSubmit = document.getElementById('btn-submit');
    const btnText = document.getElementById('btn-text-adicionar');
    const originalText = btnText.textContent;

    btnSubmit.disabled = true;
    btnText.innerHTML = '<span class="loading-spinner"></span>';

    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        const devedorExistente = dividas.find(d => 
            d.nome.toLowerCase() === nome.toLowerCase() && d.id !== editingId
        );

        if (devedorExistente) {
            devedorExistente.valor += valor;
            devedorExistente.data = data || devedorExistente.data;
            devedorExistente.telefone = telefone || devedorExistente.telefone;
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
                divida.telefone = telefone;
                divida.valor = valor;
                divida.data = data;
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
                telefone,
                valor,
                status: "pendente",
                data,
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
                <h3>Nenhuma dívida cadastrada</h3>
                <p>Adicione um devedor usando o formulário acima</p>
            </div>
        `;
        return;
    }

    const dividasOrdenadas = [...listaParaRenderizar].sort((a, b) => {
        if (a.status !== b.status) {
            return a.status === 'pendente' ? -1 : 1;
        }
        return new Date(b.criadoEm) - new Date(a.criadoEm);
    });

    container.innerHTML = dividasOrdenadas.map(divida => {
        const statusClass = divida.status === 'pago' ? 'pago' : '';
        const statusLabel = divida.status === 'pago' ? 'Pago' : 'Pendente';
        const statusBadge = divida.status === 'pago' ? 'status-pago' : 'status-pendente';
        const dataFormatada = divida.data ? new Date(divida.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
        const telefoneFormatado = divida.telefone ? formatarTelefone(divida.telefone) : '';

        return `
            <div class="divida-item ${statusClass}" data-id="${divida.id}">
                <div class="divida-info">
                    <h3>
                        <i class="fas fa-user"></i> ${divida.nome}
                        ${telefoneFormatado ? `<span class="divida-telefone"><i class="fas fa-phone"></i> ${telefoneFormatado}</span>` : ''}
                    </h3>
                    <div class="divida-detalhes">
                        ${dataFormatada ? `<span><i class="fas fa-calendar"></i> ${dataFormatada}</span>` : ''}
                        ${divida.observacoes ? `<span><i class="fas fa-comment"></i> ${divida.observacoes}</span>` : ''}
                    </div>
                </div>
                <p class="divida-valor">
                    MT ${divida.valor.toFixed(2).replace('.', ',')}
                </p>
                <span class="divida-status ${statusBadge}">
                    <i class="fas ${divida.status === 'pago' ? 'fa-check-circle' : 'fa-clock'}"></i>
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
                    
                    <button class="btn btn-small btn-whatsapp" onclick="enviarCobrancaWhatsApp('${divida.id}')">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                    
                    <button class="btn btn-small btn-edit" onclick="editarDivida('${divida.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    
                    <button class="btn btn-small btn-danger" onclick="removerDivida('${divida.id}')">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function formatarTelefone(telefone) {
    // Formata número de telefone (ex: 258846178342 -> +258 84 617 8342)
    if (telefone.length === 12 && telefone.startsWith('258')) {
        return `+${telefone.slice(0,3)} ${telefone.slice(3,5)} ${telefone.slice(5,8)} ${telefone.slice(8)}`;
    }
    return telefone;
}

function enviarCobrancaWhatsApp(id) {
    const divida = dividas.find(d => d.id === id);
    if (!divida) return;
    
    if (!divida.telefone) {
        showToast("⚠️ Este devedor não tem telefone cadastrado!", "warning");
        return;
    }

    const valorFormatado = divida.valor.toFixed(2).replace('.', ',');
    
    const mensagem = `*COBRANÇA DE DÍVIDA* 💰

Olá *${divida.nome}*, tudo bem?

Venho por meio desta lembrar sobre o pagamento pendente no valor de *MT ${valorFormatado}*.

📅 *Data de vencimento:* ${divida.data ? new Date(divida.data).toLocaleDateString('pt-BR') : 'Não informada'}
📝 *Observações:* ${divida.observacoes || 'Sem observações'}

*DADOS PARA PAGAMENTO:*
━━━━━━━━━━━━━━━━━━━━━
💰 *E-mola:* 
   📍 463391
   👤 Irado Jacinto Muabsa

💳 *M-pesa:* 
   📍 95085
   👤 Banca Supai Renato
━━━━━━━━━━━━━━━━━━━━━

*APÓS O PAGAMENTO:*
📲 Envie o comprovativo para o número *846178342*

Agradecemos desde já pela atenção! 🙏

Atenciosamente,
Equipe de Cobrança`;

    const mensagemCodificada = encodeURIComponent(mensagem);
    const telefone = divida.telefone.replace(/\D/g, '');
    
    window.open(`https://wa.me/${telefone}?text=${mensagemCodificada}`, '_blank');
    showToast("📱 Mensagem de cobrança preparada no WhatsApp!");
}

async function marcarComoPago(id) {
    const divida = dividas.find(d => d.id === id);
    if (divida) {
        divida.status = 'pago';
        
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
        document.getElementById('input-telefone').value = divida.telefone || '';
        document.getElementById('input-valor').value = divida.valor;
        document.getElementById('input-data').value = divida.data || '';
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
    
    // Resetar data atual
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('input-data').value = hoje;
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

function copiarDadosBancarios() {
    const dados = `DADOS PARA PAGAMENTO:
    
💰 E-mola: 463391 - Irado Jacinto Muabsa
💳 M-pesa: 95085 - Banca Supai Renato
📲 Enviar comprovativo: 846178342`;

    navigator.clipboard.writeText(dados).then(() => {
        showToast("📋 Dados bancários copiados!");
    }).catch(() => {
        showToast("❌ Erro ao copiar dados.", "error");
    });
}

function copiarTexto(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        showToast("📋 Copiado: " + texto);
    });
}

function showToast(message, type = "success") {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    
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
