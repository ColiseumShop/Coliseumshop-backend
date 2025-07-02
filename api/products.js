// api/products.js
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import cors from 'cors';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Inicializa o Firebase Admin SDK APENAS UMA VEZ
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Erro ao inicializar o Firebase Admin SDK:', error.message);
  }
}

const db = admin.firestore(); // Obtém a instância do Firestore

// Configuração CORS para esta função serverless
const corsMiddleware = cors({
  origin: ['https://coliseumshop.netlify.app', 'http://localhost:3000'], // Atualize esta origem com o seu domínio Netlify FINAL!
  methods: ['GET', 'OPTIONS'], // Apenas GET e OPTIONS para este endpoint
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
});

export default async (req, res) => {
  // Aplica o middleware CORS para esta função
  await new Promise((resolve, reject) => {
    corsMiddleware(req, res, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  // Se for uma requisição OPTIONS (preflight), responda imediatamente
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  // Apenas permite requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  console.log('--- Requisição Recebida em api/products.js ---');

  try {
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    if (snapshot.empty) {
      console.log('Nenhum produto encontrado no Firestore.');
      return res.status(200).json([]); // Retorna um array vazio se não houver produtos
    }

    const products = [];
    snapshot.forEach(doc => {
      // Adiciona o ID do documento ao objeto do produto
      products.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Produtos encontrados: ${products.length}`);
    res.status(200).json(products);

  } catch (error) {
    console.error('Erro ao buscar produtos do Firestore:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos.', details: error.message });
  }
};
