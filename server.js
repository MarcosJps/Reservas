const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const db = new sqlite3.Database('./reservas.db', (err) => {
  if (err) console.error("Erro ao abrir o banco de dados:", err.message);
  else console.log("Conectado ao banco de dados SQLite.");
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS reservas (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, data TEXT NOT NULL, hora TEXT NOT NULL, mesa INTEGER NOT NULL, pessoas INTEGER NOT NULL, status TEXT DEFAULT 'pendente', garcom TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS garcons (id INTEGER PRIMARY KEY, nome TEXT NOT NULL UNIQUE)`);
});

io.on('connection', (socket) => {
  // Eventos de Garçons (sem alteração)
  socket.on('cadastrarGarcom', (nome, callback) => { db.run(`INSERT INTO garcons (nome) VALUES (?)`, [nome], function (err) { if (err) return callback({ success: false, message: 'Este nome já existe.' }); callback({ success: true, message: 'Garçom cadastrado!' }); io.emit('garconsAtualizados'); }); });
  socket.on('getGarcons', (callback) => { db.all(`SELECT * FROM garcons ORDER BY nome`, [], (err, rows) => { if (err) return callback({ success: false, data: [] }); callback({ success: true, data: rows }); }); });
  socket.on('excluirGarcom', (id, callback) => { db.run(`DELETE FROM garcons WHERE id = ?`, [id], function(err) { if (err) return callback({ success: false, message: 'Erro ao excluir.' }); callback({ success: true, message: 'Garçom excluído.' }); io.emit('garconsAtualizados'); }); });

  // --- Eventos de Reserva ATUALIZADOS ---

  // LÓGICA DE CONFLITO ATUALIZADA
  socket.on('criarReserva', (dados, callback) => {
    // Verifica conflitos em uma janela de 2 horas
    const DURACAO_MINUTOS = 120;
    db.all(
        `SELECT * FROM reservas WHERE mesa = ? AND data = ? AND status NOT IN ('cancelada', 'cancelada_auto', 'cancelada_garcom', 'finalizada')
         AND time(?, '+${DURACAO_MINUTOS} minutes') > time(hora) 
         AND time(?) < time(hora, '+${DURACAO_MINUTOS} minutes')`,
        [dados.mesa, dados.data, dados.hora, dados.hora],
        (err, rows) => {
            if (err) {
                console.error(err);
                return callback({ success: false, message: 'Erro no servidor.' });
            }
            if (rows.length > 0) {
                return callback({ success: false, message: `Conflito! A mesa ${dados.mesa} já está ocupada neste intervalo de tempo.` });
            }

            // Se não houver conflitos, cria a reserva
            db.run(`INSERT INTO reservas (nome, data, hora, mesa, pessoas) VALUES (?, ?, ?, ?, ?)`, [dados.nome, dados.data, dados.hora, dados.mesa, dados.pessoas], function (err) {
                if (err) return callback({ success: false, message: 'Erro ao criar reserva.' });
                callback({ success: true, message: 'Reserva criada com sucesso!' });
                io.emit('reservaAtualizada');
            });
        }
    );
  });
  
  // NOVO EVENTO: Finalizar Reserva
  socket.on('finalizarReserva', (id, callback) => {
    db.run(`UPDATE reservas SET status = 'finalizada' WHERE id = ? AND status = 'confirmada'`, [id], function(err) {
        if (err || this.changes === 0) return callback({ success: false, message: 'Erro ao finalizar.' });
        callback({ success: true, message: 'Reserva finalizada. Mesa liberada!' });
        io.emit('reservaAtualizada');
    });
  });

  // ATUALIZADO: Lista do garçom agora busca reservas pendentes E confirmadas do dia
  socket.on('getReservasDoDia', (data, callback) => {
    db.all(`SELECT * FROM reservas WHERE data = ? AND status IN ('pendente', 'confirmada') ORDER BY hora`, [data.dia], (err, rows) => {
        if (err) return callback({ success: false });
        callback({ success: true, data: rows });
    });
  });
  
  // Eventos de confirmar, cancelar e relatórios (sem alteração na lógica)
  socket.on('confirmarReserva', (dados, callback) => { db.run(`UPDATE reservas SET status = 'confirmada', garcom = ? WHERE id = ? AND status = 'pendente'`, [dados.garcom, dados.id], function (err) { if (err || this.changes === 0) return callback({ success: false, message: 'Erro ao confirmar.' }); callback({ success: true, message: 'Reserva confirmada!' }); io.emit('reservaAtualizada'); }); });
  socket.on('cancelarReserva', (id, callback) => { db.run(`UPDATE reservas SET status = 'cancelada_garcom' WHERE id = ? AND status = 'pendente'`,[id], function(err) { if (err || this.changes === 0) return callback({ success: false, message: 'Erro ao cancelar.' }); callback({ success: true, message: 'Reserva cancelada.' }); io.emit('reservaAtualizada'); }); });
  socket.on('cancelarReservaPeloAtendente', (dados, callback) => { db.run(`UPDATE reservas SET status = 'cancelada' WHERE nome = ? AND mesa = ? AND status = 'pendente'`, [dados.nome, dados.mesa], function(err) { if (this.changes === 0) return callback({ success: false, message: 'Reserva não encontrada.' }); callback({ success: true, message: 'Reserva cancelada.' }); io.emit('reservaAtualizada'); }); });
  socket.on('relatorio1', (dados, callback) => { db.all(`SELECT * FROM reservas WHERE data BETWEEN ? AND ? ORDER BY data, hora`, [dados.inicio, dados.fim], (err, rows) => callback({ success: !err, data: rows })); });
  socket.on('relatorio2', (dados, callback) => { db.all(`SELECT * FROM reservas WHERE mesa = ? ORDER BY data, hora`, [dados.mesa], (err, rows) => callback({ success: !err, data: rows })); });
  socket.on('relatorio3', (dados, callback) => { db.all(`SELECT * FROM reservas WHERE garcom = ? AND status = 'confirmada' ORDER BY data, hora`, [dados.garcom], (err, rows) => callback({ success: !err, data: rows })); });
});

setInterval(() => {
  const agora = new Date();
  agora.setHours(agora.getHours() - 3);
  const agoraFormatado = agora.toISOString().replace('T', ' ').substring(0, 19);
  db.run(`UPDATE reservas SET status = 'cancelada_auto' WHERE status = 'pendente' AND datetime(data || ' ' || hora) < datetime(?, '-30 minutes')`, [agoraFormatado], function(err) {
      if (err) { console.error("Erro no cancelamento automático:", err.message); return; }
      if (this.changes > 0) {
        console.log(`${this.changes} reserva(s) cancelada(s) automaticamente.`);
        io.emit('reservaAtualizada');
      }
  });
}, 60000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));