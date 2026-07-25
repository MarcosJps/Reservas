document.addEventListener('DOMContentLoaded', function() {
    const socket = io();

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function exibirMensagem(elemento, mensagem, sucesso) {
        if (!elemento) return;
        elemento.textContent = mensagem;
        elemento.className = sucesso ? 'message success' : 'message error';
        setTimeout(() => { elemento.className = 'message'; }, 4000);
    }

    function setMinDate() {
        const hoje = new Date().toISOString().split('T')[0];
        ['data', 'inicio', 'fim'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.min = hoje;
        });
    }

    function criarTabelaGarcons(dados) {
        if (!dados || dados.length === 0) return '<p>Nenhum garçom cadastrado.</p>';
        let tabela = '<table class="report-table"><thead><tr><th>ID</th><th>NOME</th><th>AÇÕES</th></tr></thead><tbody>';
        dados.forEach(linha => {
            tabela += `<tr><td>${escapeHTML(linha.id)}</td><td>${escapeHTML(linha.nome)}</td><td><button class="btn-delete" data-id="${escapeHTML(linha.id)}">Excluir</button></td></tr>`;
        });
        tabela += '</tbody></table>';
        return tabela;
    }

    function criarTabelaRelatorio(dados) {
        if (!dados || dados.length === 0) return '<p>Nenhum dado encontrado.</p>';
        const headers = Object.keys(dados[0]);
        let tabela = '<table class="report-table"><thead><tr>';
        headers.forEach(h => tabela += `<th>${h.toUpperCase()}</th>`);
        tabela += '</tr></thead><tbody>';
        dados.forEach(linha => {
            tabela += '<tr>';
            headers.forEach(h => tabela += `<td>${escapeHTML(linha[h])}</td>`);
            tabela += '</tr>';
        });
        tabela += '</tbody></table>';
        return tabela;
    }

    const garcomSelect = document.getElementById('garcom-select');

    function carregarGarcons() {
        socket.emit('getGarcons', (resposta) => {
            if (!resposta.success) return;
            const valorSelecionado = garcomSelect ? garcomSelect.value : ''; 
            if (garcomSelect) {
                garcomSelect.innerHTML = '<option value="">-- Selecione --</option>';
                resposta.data.forEach(g => { garcomSelect.innerHTML += `<option value="${escapeHTML(g.nome)}">${escapeHTML(g.nome)}</option>`; });
                garcomSelect.value = valorSelecionado;
            }
            const listaGerente = document.getElementById('lista-garcons');
            if (listaGerente) { listaGerente.innerHTML = criarTabelaGarcons(resposta.data); }
        });
    }

    const listaReservasGarcom = document.getElementById('lista-reservas-pendentes');

    function carregarReservasParaGarcom() {
        if (!garcomSelect || !listaReservasGarcom) return;
        const garcomLogado = garcomSelect.value;
        if (!garcomLogado) {
            listaReservasGarcom.innerHTML = '<p>Selecione seu nome para ver as reservas.</p>';
            return;
        }

        const hoje = new Date().toISOString().split('T')[0];
        socket.emit('getReservasDoDia', { dia: hoje }, (resposta) => {
            if (!resposta.success || resposta.data.length === 0) {
                listaReservasGarcom.innerHTML = '<p>Nenhuma reserva pendente ou confirmada para hoje.</p>';
                return;
            }
            listaReservasGarcom.innerHTML = resposta.data.map(reserva => {
                let botoes = '';
                if (reserva.status === 'pendente') {
                    botoes = `
                        <button class="btn-confirm" data-id="${reserva.id}">Confirmar</button>
                        <button class="btn-cancel" data-id="${reserva.id}">Cancelar</button>`;
                } else if (reserva.status === 'confirmada') {
                    botoes = `<button class="btn-finish" data-id="${reserva.id}">Finalizar</button>`;
                }

                return `
                    <div class="reserva-item-action">
                        <span>
                            <strong>${escapeHTML(reserva.nome)}</strong> - Mesa ${escapeHTML(reserva.mesa)} às ${escapeHTML(reserva.hora)}
                            <span class="status-badge status-${escapeHTML(reserva.status)}">${escapeHTML(reserva.status)}</span>
                        </span>
                        <div class="button-group-inline">${botoes}</div>
                    </div>`;
            }).join('');
        });
    }
    
    // Adicionar Event Listeners
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    const btnGerenciarGarcons = document.getElementById('btn-gerenciar-garcons');
    const btnVerRelatorios = document.getElementById('btn-ver-relatorios');
    const viewGerenciarGarcons = document.getElementById('view-gerenciar-garcons');
    const viewRelatorios = document.getElementById('view-relatorios');

    if (btnGerenciarGarcons) {
        btnGerenciarGarcons.addEventListener('click', () => {
            btnGerenciarGarcons.classList.add('active'); btnVerRelatorios.classList.remove('active');
            viewGerenciarGarcons.classList.add('active'); viewRelatorios.classList.remove('active');
        });
    }
    if (btnVerRelatorios) {
        btnVerRelatorios.addEventListener('click', () => {
            btnVerRelatorios.classList.add('active'); btnGerenciarGarcons.classList.remove('active');
            viewRelatorios.classList.add('active'); viewGerenciarGarcons.classList.remove('active');
        });
    }

    const formCadGarcom = document.getElementById('form-cad-garcom');
    if (formCadGarcom) {
        formCadGarcom.addEventListener('submit', function(e) {
            e.preventDefault();
            const nome = document.getElementById('garcom-nome-input').value.trim();
            socket.emit('cadastrarGarcom', nome, (r) => {
                exibirMensagem(document.getElementById('msg-gerente'), r.message, r.success);
                if (r.success) this.reset();
            });
        });
    }
    
    const listaGarcons = document.getElementById('lista-garcons');
    if (listaGarcons) {
        listaGarcons.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete')) {
                if (confirm(`Tem certeza que deseja excluir?`)) {
                    socket.emit('excluirGarcom', e.target.dataset.id, (r) => {
                        exibirMensagem(document.getElementById('msg-gerente'), r.message, r.success);
                    });
                }
            }
        });
    }

    const formRel1 = document.getElementById('form-rel1'); if(formRel1) formRel1.addEventListener('submit', function(e) { e.preventDefault(); socket.emit('relatorio1', { inicio: this.inicio.value, fim: this.fim.value }, (r) => { document.getElementById('rel1').innerHTML = r.success ? criarTabelaRelatorio(r.data) : '<p class="error">Erro.</p>'; }); });
    const formRel2 = document.getElementById('form-rel2'); if(formRel2) formRel2.addEventListener('submit', function(e) { e.preventDefault(); socket.emit('relatorio2', { mesa: this['mesa-gerente'].value }, (r) => { document.getElementById('rel2').innerHTML = r.success ? criarTabelaRelatorio(r.data) : '<p class="error">Erro.</p>'; }); });
    const formRel3 = document.getElementById('form-rel3'); if(formRel3) formRel3.addEventListener('submit', function(e) { e.preventDefault(); socket.emit('relatorio3', { garcom: this['garcom-gerente'].value.trim() }, (r) => { document.getElementById('rel3').innerHTML = r.success ? criarTabelaRelatorio(r.data) : '<p class="error">Erro.</p>'; }); });
    const formReserva = document.getElementById('form-reserva'); if (formReserva) { formReserva.addEventListener('submit', function(e) { e.preventDefault(); const dados = { nome: this.nome.value.trim(), data: this.data.value, hora: this.hora.value, mesa: parseInt(this.mesa.value), pessoas: parseInt(this.pessoas.value) }; socket.emit('criarReserva', dados, (r) => { exibirMensagem(document.getElementById('msg-atendente'), r.message, r.success); if (r.success) this.reset(); }); }); }
    const btnCancelarAtendente = document.getElementById('btn-cancelar-atendente'); if (btnCancelarAtendente) { btnCancelarAtendente.addEventListener('click', () => { const nome = document.getElementById('nome').value.trim(); const mesa = parseInt(document.getElementById('mesa').value); if (!nome || isNaN(mesa)) return alert('Preencha NOME e MESA.'); if (confirm(`Cancelar reserva para ${nome}?`)) { socket.emit('cancelarReservaPeloAtendente', { nome, mesa }, (r) => exibirMensagem(document.getElementById('msg-atendente'), r.message, r.success)); } }); }

    if (garcomSelect) garcomSelect.addEventListener('change', carregarReservasParaGarcom);
    if (listaReservasGarcom) {
        listaReservasGarcom.addEventListener('click', (e) => {
            const garcomLogado = garcomSelect.value;
            if (!garcomLogado) { return; }
            const id = e.target.dataset.id;
            if (!id) return;
            const msgGarcomElement = document.getElementById('msg-garcom');

            if (e.target.classList.contains('btn-confirm')) {
                socket.emit('confirmarReserva', { id, garcom: garcomLogado }, (r) => exibirMensagem(msgGarcomElement, r.message, r.success));
            }
            if (e.target.classList.contains('btn-cancel')) {
                if (confirm('Tem certeza?')) socket.emit('cancelarReserva', id, (r) => exibirMensagem(msgGarcomElement, r.message, r.success));
            }
            if (e.target.classList.contains('btn-finish')) {
                socket.emit('finalizarReserva', id, (r) => exibirMensagem(msgGarcomElement, r.message, r.success));
            }
        });
    }

    socket.on('reservaAtualizada', carregarReservasParaGarcom);
    socket.on('garconsAtualizados', carregarGarcons);

    setMinDate();
    carregarGarcons();
});