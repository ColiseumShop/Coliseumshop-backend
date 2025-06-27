require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const createPreference = require('./api/create_preference');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações de segurança
app.use(cors({
  origin: ['https://coliseum-shop.netlify.app', 'http://localhost:3000'],
  methods: ['GET', 'POST']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.post('/api/create_preference', createPreference);

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date() });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
  res.status(500).json({ error: 'Erro interno' });
});

// Inicialização
const server = app.listen(PORT, () => {
  console.log(`🟢 Servidor rodando na porta ${PORT}`);
});

// Tratamento de erros de inicialização
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Porta ${PORT} já em uso`);
  } else {
    console.error('Erro ao iniciar servidor:', error);
  }
  process.exit(1);
});