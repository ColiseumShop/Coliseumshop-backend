// server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Configuração CORS mais robusta para lidar com OPTIONS requests
const corsOptions = {
  origin: ['https://coliseum-shop.netlify.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'], // Explicitamente permite GET, POST e OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization'], // Adicione outros cabeçalhos se usar (ex: Authorization)
  preflightContinue: false, // Não passa a requisição preflight para as rotas
  optionsSuccessStatus: 204 // Retorna status 204 (No Content) para preflight bem-sucedido
};
app.use(cors(corsOptions)); // Aplica esta configuração CORS a TODAS as rotas


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importa sua rota de criação de preferência
import createPreference from './api/create_preference.js';

// Importa o handler do webhook (que está simplificado para teste)
import webhookHandler from './api/webhook.js';


// Defina a rota para o create_preference
// O CORS já foi aplicado globalmente com app.use(cors(corsOptions));
app.all('/api/create_preference', createPreference);

// --- ROTA PARA O WEBHOOK DO MERCADO PAGO ---
// Para o webhook, aplicamos o middleware 'cors()' sem opções,
// o que permite requisições de QUALQUER origem para esta rota específica.
// Isso é necessário porque as notificações vêm dos servidores do Mercado Pago.
app.post('/api/webhook', cors(), webhookHandler);


// Rota de saúde
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'online', timestamp: new Date() });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err.stack);
  res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
});

export default app;
