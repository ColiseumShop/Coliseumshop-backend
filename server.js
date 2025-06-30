// server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Configuração CORS mais robusta para lidar com OPTIONS requests
const corsOptions = {
  origin: ['https://coliseum-shop.netlify.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'], // Explicitamente permite OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization'], // Adicione outros cabeçalhos se usar (ex: Authorization)
  preflightContinue: false, // Não passa a requisição preflight para as rotas
  optionsSuccessStatus: 204 // Retorna status 204 (No Content) para preflight bem-sucedido
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importa sua rota de criação de preferência
import createPreference from './api/create_preference.js';

// Defina a rota para o create_preference
// A rota agora usa app.all para responder a todos os métodos, incluindo OPTIONS
app.all('/api/create_preference', createPreference);


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