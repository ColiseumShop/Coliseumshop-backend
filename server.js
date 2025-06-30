// server.js

import express from 'express';
import cors from 'cors'; // Importa o pacote cors
import dotenv from 'dotenv'; // Importa dotenv para carregar variáveis de ambiente

dotenv.config(); // Carrega as variáveis de ambiente do arquivo .env

const app = express(); // Inicializa o aplicativo Express

// Configuração CORS para permitir requisições do seu frontend Netlify
const corsOptions = {
  // Define as origens permitidas (seu domínio Netlify e localhost para desenvolvimento)
  origin: ['https://coliseum-shop.netlify.app', 'http://localhost:3000'],
  methods: ['GET', 'POST'], // Permite os métodos HTTP GET e POST
  allowedHeaders: ['Content-Type'], // Permite o cabeçalho Content-Type
};
app.use(cors(corsOptions)); // Aplica o middleware CORS com as opções configuradas

app.use(express.json()); // Habilita o Express para parsear corpos de requisição JSON
app.use(express.urlencoded({ extended: true })); // Habilita o Express para parsear corpos de requisição URL-encoded

// Importa sua rota de criação de preferência do Mercado Pago
import createPreference from './api/create_preference.js';

// Define a rota POST para criar preferências de pagamento
app.post('/api/create_preference', createPreference);

// Rota de saúde para verificar se o backend está online
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'online', timestamp: new Date() });
});

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err.stack); // Loga o erro completo
  res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
});

// Exporta o aplicativo Express para uso pelo Vercel como uma função serverless
export default app;
