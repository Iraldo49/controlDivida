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
      renderDividas();
      calcularTotal();
    }

    function salvarDividas() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dividas));
      currentRecordCount = dividas.length;
      renderDividas();
      calcularTotal();
    }

    async function init() {
      carregarDividas();
      
      const form = document.getElementById('form-devedor');
      form.addEventListener('submit', handleSubmit);
    }

    async function handleSubmit(e) {
      e.preventDefault();

      const nome = document.getElementById('input-nome').value.trim();
      const valor = parseFloat(document.getElementById('input-valor').value);
      const data = document.getElementById('input-data').value;
      const observacoes = document.getElementById('input-observacoes').value;

      // Validação básica
      if (!nome || isNaN(valor) || valor <= 0) {
        showToast("Por favor, preencha o nome e um valor válido!");
        return;
      }

      const btnSubmit = document.getElementById('btn-submit');
      const btnText = document.getElementById('btn-text-adicionar');
      const originalText = btnText.textContent;

      btnSubmit.disabled = true;
      btnText.innerHTML = '<span class="loading-spinner"></span>';

      // Pequeno delay para mostrar o spinner
      await new Promise(resolve => setTimeout(resolve, 300));

      try {
        // Verificar se já existe um devedor com o mesmo nome (case-insensitive)
        const devedorExistente = dividas.find(d => 
          d.nome.toLowerCase() === nome.toLowerCase() && d.id !== editingId
        );

        if (devedorExistente) {
          // Atualizar devedor existente somando o valor
          devedorExistente.valor += valor;
          devedorExistente.data = data || devedorExistente.data;
          devedorExistente.observacoes = observacoes || devedorExistente.observacoes;
          devedorExistente.status = "pendente"; // Reativar se estava pago

          salvarDividas();
          showToast("Dívida de " + nome + " atualizada! Novo valor: MT " + devedorExistente.valor.toFixed(2));
          document.getElementById('form-devedor').reset();
          if (editingId) cancelEdit();
        } else if (editingId) {
          // Editando um devedor existente
          const divida = dividas.find(d => d.id === editingId);
          if (divida) {
            divida.nome = nome;
            divida.valor = valor;
            divida.data = data;
            divida.observacoes = observacoes;

            salvarDividas();
            showToast("Devedor atualizado com sucesso!");
            cancelEdit();
          }
        } else {
          // Criar novo devedor
          if (currentRecordCount >= 999) {
            showToast("Limite de 999 devedores atingido. Por favor, remova alguns registros primeiro.");
            btnSubmit.disabled = false;
            btnText.textContent = originalText;
            return;
          }

          const novaDivida = {
            id: Date.now().toString(),
            nome,
            valor,
            status: "pendente",
            data,
            observacoes,
            criadoEm: new Date().toISOString()
          };

          dividas.push(novaDivida);
          salvarDividas();
          showToast("Devedor adicionado com sucesso!");
          document.getElementById('form-devedor').reset();
        }
      } catch (error) {
        console.error("Erro:", error);
        showToast("Erro ao processar a operação. Tente novamente.");
      } finally {
        btnSubmit.disabled = false;
        btnText.textContent = originalText;
      }
    }

    function renderDividas() {
      const container = document.getElementById('dividas-container');
      
      if (dividas.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">💰</div>
            <h3>Nenhuma dívida cadastrada</h3>
            <p>Adicione um devedor usando o formulário acima</p>
          </div>
        `;
        return;
      }

      const dividasOrdenadas = [...dividas].sort((a, b) => {
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

        return `
          <div class="divida-item ${statusClass}" data-id="${divida.id}">
            <div class="divida-info">
              <h3 class="divida-nome">${divida.nome}</h3>
              <div class="divida-detalhes">
                ${dataFormatada ? `<span>📅 ${dataFormatada}</span>` : ''}
                ${divida.observacoes ? `<span class="divida-observacoes">💬 ${divida.observacoes}</span>` : ''}
              </div>
            </div>
            <p class="divida-valor">MT ${divida.valor.toFixed(2).replace('.', ',')}</p>
            <span class="divida-status ${statusBadge}">${statusLabel}</span>
            <div class="divida-actions">
              ${divida.status === 'pendente' ? 
                `<button class="btn btn-small btn-success" onclick="marcarComoPago('${divida.id}')">✓ Pago</button>` :
                `<button class="btn btn-small btn-warning" onclick="marcarComoPendente('${divida.id}')">↻ Reativar</button>`
              }
              <button class="btn btn-small btn-edit" onclick="editarDivida('${divida.id}')">✎ Editar</button>
              <button class="btn btn-small btn-danger" onclick="removerDivida('${divida.id}')">✕ Remover</button>
            </div>
          </div>
        `;
      }).join('');
    }

    function calcularTotal() {
      const totalPendente = dividas
        .filter(d => d.status === 'pendente')
        .reduce((sum, d) => sum + d.valor, 0);
      
      document.getElementById('total-pendente').textContent = 
        " mzn " + totalPendente.toFixed(2).replace('.', ',');
    }

    async function marcarComoPago(id) {
      const divida = dividas.find(d => d.id === id);
      if (divida) {
        divida.status = 'pago';
        
        const btn = event.target;
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span>';
        
        // Pequeno delay para mostrar feedback visual
        await new Promise(resolve => setTimeout(resolve, 300));
        
        salvarDividas();
        showToast("Dívida marcada como paga!");
        
        btn.disabled = false;
      }
    }

    async function marcarComoPendente(id) {
      const divida = dividas.find(d => d.id === id);
      if (divida) {
        divida.status = 'pendente';
        
        const btn = event.target;
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span>';
        
        // Pequeno delay para mostrar feedback visual
        await new Promise(resolve => setTimeout(resolve, 300));
        
        salvarDividas();
        showToast("Dívida reativada!");
        
        btn.disabled = false;
      }
    }

    function editarDivida(id) {
      const divida = dividas.find(d => d.id === id);
      if (divida) {
        editingId = id;
        document.getElementById('input-nome').value = divida.nome;
        document.getElementById('input-valor').value = divida.valor;
        document.getElementById('input-data').value = divida.data || '';
        document.getElementById('input-observacoes').value = divida.observacoes || '';
        
        const btnText = document.getElementById('btn-text-adicionar');
        btnText.textContent = 'Atualizar Devedor';
        
        document.getElementById('form-devedor').scrollIntoView({ behavior: 'smooth' });
        showToast("Editando devedor. Altere os campos e clique em Atualizar.");
      }
    }

    function cancelEdit() {
      editingId = null;
      document.getElementById('form-devedor').reset();
      const btnText = document.getElementById('btn-text-adicionar');
      btnText.textContent = 'Adicionar Devedor';
    }

    async function removerDivida(id) {
      if (!confirm("Tem certeza que deseja remover este devedor?")) {
        return;
      }
      
      const divida = dividas.find(d => d.id === id);
      if (divida) {
        const item = document.querySelector('[data-id="' + id + '"]');
        const btns = item.querySelectorAll('button');
        btns.forEach(btn => btn.disabled = true);
        
        // Pequeno delay para mostrar feedback visual
        await new Promise(resolve => setTimeout(resolve, 300));
        
        dividas = dividas.filter(d => d.id !== id);
        salvarDividas();
        showToast("Devedor removido com sucesso!");
        
        if (editingId === id) {
          cancelEdit();
        }
      }
    }

    function showToast(message) {
      const existingToast = document.querySelector('.toast');
      if (existingToast) {
        existingToast.remove();
      }

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 3000);
    }

    // Inicializar quando a página carregar
    document.addEventListener('DOMContentLoaded', init);

    // Definir data atual como padrão
    window.onload = function() {
      const hoje = new Date().toISOString().split('T')[0];
      document.getElementById('input-data').value = hoje;

    };
