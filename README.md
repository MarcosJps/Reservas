
# Sistema de Reservas para Restaurante

## 📝 Relatório do Projeto

**Objetivo:**  
Sistema de reservas para restaurante, usando Node.js, SQLite e Socket.IO, com interface via navegador.

---

## 🔧 Componentes

- `server.js`: Backend em Node.js.
- `reservas.db`: Banco de dados SQLite.
- `public/`: Interface web (HTML/CSS/JS).
- `package.json`: Dependências.
- `reservas.sqbpro`: Projeto do banco de dados (usado em SQLiteStudio).
- `README.md`: Documentação do projeto.

---

## 🧪 Funcionalidades

- Criar reserva com data, hora, nome, mesa e pessoas.
- Cancelar reserva.
- Confirmar reserva (com garçom).
- Gerar relatórios:
  - Por período (entre datas)
  - Por mesa
  - Por garçom

---

## 🧰 Tecnologias

- Node.js
- Express
- Socket.IO
- SQLite
- HTML/CSS/JS

---

## 📦 Passo a Passo de Instalação

### 1. Requisitos

- Node.js instalado ([https://nodejs.org](https://nodejs.org))
- SQLite (opcional, para visualizar o banco)

### 2. Obter o Projeto

Descompacte o arquivo ZIP ou clone via Git:

```bash
git clone https://github.com/SEU_USUARIO/Reservas.git
cd Reservas
```

### 3. Instalar Dependências

```bash
npm install
```

### 4. Executar o Servidor

```bash
node server.js
```

Acesse no navegador:

```
http://localhost:3000
```

---

## ✅ Uso do Sistema

- Crie reservas na interface
- Atualizações em tempo real com Socket.IO
- Gere relatórios na aba do gerente

--COMPONENTES--

- Alisson gabriel 12724127191  
- Guilherme Silva 12724135253
- Lucas Wu 12724130877
- João Marcos 12724132409
- Caue Silva 12724155736
- Ednaldo Andrade 12724146825