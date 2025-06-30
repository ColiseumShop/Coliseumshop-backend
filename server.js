// server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Configuração CORS robusta
const corsOptions = {
  origin: ['https://coliseum-shop.netlify.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importa sua rota de criação de preferência (já existente)
import createPreference from './api/create_preference.js';

// Importa o novo handler do webhook
import webhookHandler from './api/webhook.js';


// Defina a rota para o create_preference
app.all('/api/create_preference', createPreference);

// --- NOVA ROTA PARA O WEBHOOK DO MERCADO PAGO ---
app.post('/api/webhook', webhookHandler);


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
