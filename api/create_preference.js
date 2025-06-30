// api/create_preference.js
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import admin from 'firebase-admin';
import cors from 'cors'; // Importa o middleware cors

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
  origin: ['https://coliseum-shop.netlify.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
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

  // --- ADICIONADO PARA DEPURAR O ERRO 400 ---
  console.log('--- Requisição Recebida em create_preference.js ---');
  console.log('Corpo da Requisição (req.body):', JSON.stringify(req.body, null, 2));
  // --- FIM DA ADIÇÃO PARA DEPURAR ---

  try {
    // Vercel já faz o parsing do body para JSON para funções serverless
    const { cartItems, payerEmail } = req.body;

    if (!cartItems || cartItems.length === 0) {
      console.error('Erro: Carrinho de compras vazio ou inválido recebido.');
      return res.status(400).json({ error: 'Carrinho de compras vazio.' });
    }

    if (!payerEmail) {
      console.error('Erro: Email do comprador em falta.');
      return res.status(400).json({ error: 'Email do comprador é obrigatório.' });
    }

    // 1. Salvar o pedido no Firestore PRIMEIRO para obter um ID
    const orderData = {
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity)
      })),
      payerEmail: payerEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
    };

    const docRef = await db.collection('orders').add(orderData);
    const orderId = docRef.id;

    console.log(`Pedido salvo no Firestore com sucesso para ID: ${orderId}`);

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

    const preferenceData = {
      items: cartItems.map(item => ({
        title: item.name,
        unit_price: parseFloat(item.price),
        quantity: parseInt(item.quantity)
      })),
      back_urls: {
        success: process.env.FRONTEND_URL,
        failure: process.env.FRONTEND_URL,
        pending: process.env.FRONTEND_URL
      },
      notification_url: process.env.NOTIFICATION_URL,
      external_reference: orderId,
      payer: {
        email: payerEmail,
      },
      auto_return: 'approved',
    };

    const preference = new Preference(client);
    const result = await preference.create({ body: preferenceData });

    res.status(200).json({
      init_point: result.init_point,
      orderId: orderId
    });

  } catch (error) {
    console.error('Erro ao criar preferência ou salvar pedido no Firestore:', error);
    if (error.code && error.details) {
      console.error(`Erro ao salvar pedido no Firestore: Error: ${error.code} ${error.details}`);
    }
    const statusCode = error.message.includes('Carrinho de compras vazio') || error.message.includes('Email do comprador é obrigatório') ? 400 : 500;
    res.status(statusCode).json({ error: 'Erro ao processar o pagamento.', details: error.message });
  }
};
