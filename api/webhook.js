// api/webhook.js
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import cors from 'cors'; // Importa o middleware cors

dotenv.config();

// Inicializa o Firebase Admin SDK APENAS UMA VEZ
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Erro ao inicializar o Firebase Admin SDK:', error.message);
  }
}

const db = admin.firestore();

// Configuração CORS para o webhook (permite qualquer origem)
const corsMiddleware = cors(); // Sem opções, permite todas as origens

export default async (req, res) => {
  // Aplica o middleware CORS para esta função
  await new Promise((resolve, reject) => {
    corsMiddleware(req, res, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  console.log('--- Webhook do Mercado Pago Recebido ---');
  console.log('Requisição:', req.body);

  const { type, data } = req.body;

  if (type === 'payment' && data && data.id) {
    await db.collection('mercadoPagoWebhooks').add({
      notificationType: type,
      dataId: data.id,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      rawBody: req.body
    });
    console.log(`Notificação de webhook ${type} com ID ${data.id} salva no Firestore.`);
  } else {
    console.log('Tipo de notificação não tratado ou dados incompletos.');
  }

  res.status(200).send('Webhook recebido com sucesso!');
};
