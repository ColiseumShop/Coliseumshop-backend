// server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Configuração CORS para o frontend (com origens específicas)
const corsOptionsFrontend = {
  origin: ['https://coliseum-shop.netlify.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Aplica o CORS para o frontend em todas as rotas por padrão
app.use(cors(corsOptionsFrontend));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importa sua rota de criação de preferência
import createPreference from './api/create_preference.js';

// Importa o handler do webhook (que está simplificado para teste)
import webhookHandler from './api/webhook.js';


// Defina a rota para o create_preference
app.all('/api/create_preference', createPreference);

// --- NOVA ROTA PARA O WEBHOOK DO MERCADO PAGO ---
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