// api/create_preference.js
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import admin from 'firebase-admin';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Inicializa o Firebase Admin SDK APENAS UMA VEZ
// Verifica se já existe uma instância do app Firebase para evitar inicializações duplicadas
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Erro ao inicializar o Firebase Admin SDK:', error.message);
    // Em produção, você pode querer lançar o erro ou lidar com ele de forma diferente
    // Para depuração, um console.error é suficiente.
  }
}

const db = admin.firestore(); // Obtém a instância do Firestore

export default async (req, res) => {
  if (req.method === 'OPTIONS') {
    // CORS Preflight - já deve ser tratado pelo middleware cors no server.js,
    // mas é bom ter uma redundância para esta rota específica
    res.status(204).send('');
    return;
  }

  try {
    const { cartItems, payerEmail } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Carrinho de compras vazio.' });
    }

    if (!payerEmail) {
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // Adiciona um timestamp do servidor
      status: 'pending', // Status inicial do pedido
    };

    const docRef = await db.collection('orders').add(orderData);
    const orderId = docRef.id; // <<< AQUI PEGAMOS O ID GERADO PELO FIRESTORE

    console.log(`Pedido salvo no Firestore com sucesso para ID: ${orderId}`);

    // Configura o cliente do Mercado Pago com seu Access Token
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
      // >>> ADICIONAMOS O external_reference AQUI! <<<
      external_reference: orderId, // Usa o ID do pedido do Firestore
      payer: {
        email: payerEmail,
      },
      auto_return: 'approved', // Redireciona o usuário automaticamente após pagamento aprovado
    };

    const preference = new Preference(client);
    const result = await preference.create({ body: preferenceData });

    res.status(200).json({
      init_point: result.init_point,
      orderId: orderId // Também é útil retornar o orderId para o frontend
    });

  } catch (error) {
    console.error('Erro ao criar preferência ou salvar pedido no Firestore:', error);
    // Verifique se o erro é do Firestore (por exemplo, permissão negada)
    if (error.code && error.details) {
      console.error(`Erro ao salvar pedido no Firestore: Error: ${error.code} ${error.details}`);
    }
    res.status(500).json({ error: 'Erro ao processar o pagamento.', details: error.message });
  }
};