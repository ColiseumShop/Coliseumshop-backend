import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
// O módulo 'path' não está sendo usado, então podemos removê-lo para limpar o código.
// import path from 'path'; 
import createPreference from './api/create_preference.js'; // Importa com a extensão .js para ESM

const app = express();
// A porta (PORT) é gerenciada automaticamente pelo Vercel, então removemos o app.listen.
// const PORT = process.env.PORT || 3000;

// Configurações de segurança
app.use(cors({
  origin: ['https://coliseum-shop.netlify.app', 'http://localhost:3000'], // Mantenha ou ajuste se seu frontend estiver em outro domínio
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

// Remova a parte de inicialização do servidor com app.listen(), pois o Vercel faz isso.
// const server = app.listen(PORT, () => {
//   console.log(`🟢 Servidor rodando na porta ${PORT}`);
// });
// server.on('error', (error) => { ... });

// Exporta o aplicativo Express para uso pelo Vercel
export default app;