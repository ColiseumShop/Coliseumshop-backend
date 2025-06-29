// api/create_preference.js

import dotenv from 'dotenv';
dotenv.config();

// Importe o Firebase Admin SDK
import admin from 'firebase-admin'; // Usando import para ES Modules

// É crucial parsear a variável de ambiente como um objeto JSON
// Lembre-se que o valor da variável FIREBASE_SERVICE_ACCOUNT_KEY é uma string JSON completa
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Inicializa o Firebase Admin SDK se ele ainda não foi inicializado
// Isso é importante para evitar erros de "Firebase app already initialized" em ambientes serverless como Vercel
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Obtenha uma referência ao serviço Firestore
const db = admin.firestore(); // Agora 'db' é a sua instância do Firestore!

import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

const preference = new Preference(client);

// Altera de module.exports para export default para ser compatível com ES Modules
export default async (req, res) => { // Removi 'next' já que não está sendo usado
  try {
    const { items, payer } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items deve ser um array' });
    }

    const validItems = items.map(item => ({
      title: item.title || 'Produto sem nome',
      quantity: Number(item.quantity) || 1,
      unit_price: parseFloat(item.unit_price) || 0,
      currency_id: 'BRL'
    }));

    const preferenceData = {
      items: validItems,
      back_urls: {
        success: "https://coliseum-shop.netlify.app/?payment=success",
        failure: "https://coliseum-shop.netlify.app/?payment=failure",
        pending: "https://coliseum-shop.netlify.app/?payment=pending"
      },
      auto_return: "approved",
      notification_url: process.env.NOTIFICATION_URL
    };

    const response = await preference.create({ body: preferenceData });

    // Exemplo de como você poderia salvar um pedido no Firestore após criar a preferência
    // Este é um exemplo, você pode adaptar onde e como salvar o pedido.
    try {
        const orderData = {
            preferenceId: response.id,
            items: validItems,
            payerEmail: payer ? payer.email : 'email_nao_fornecido',
            status: 'pending', // Status inicial do pedido
            createdAt: admin.firestore.FieldValue.serverTimestamp() // Data e hora do servidor
        };
        await db.collection('orders').add(orderData);
        console.log('Pedido salvo no Firestore com sucesso para preference ID:', response.id);
    } catch (firestoreError) {
        console.error('Erro ao salvar pedido no Firestore:', firestoreError);
        // Não impeça o fluxo do Mercado Pago se houver erro no Firestore, apenas logue
    }

    res.status(200).json({
      id: response.id,
      init_point: response.init_point
    });

  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    res.status(500).json({ error: 'Erro ao criar preferência de pagamento', details: error.message });
  }
};