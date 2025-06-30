// api/webhook.js

import dotenv from 'dotenv';
dotenv.config();

// Importe o Firebase Admin SDK (necessário para interagir com o Firestore)
import admin from 'firebase-admin';

// Reutilize a lógica de inicialização do Firebase Admin SDK
// Isso garante que o SDK só seja inicializado uma vez, mesmo em ambientes serverless
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore(); // Obtenha a instância do Firestore

// Função para lidar com o webhook
export default async (req, res) => {
  console.log('--- Webhook do Mercado Pago Recebido ---');
  console.log('Requisição:', req.body); // Loga o corpo completo da requisição do webhook

  // Verifique o tipo de notificação (ex: payment, merchant_order)
  // Para pagamentos, geralmente vem com 'data.id' que é o ID do pagamento
  const { type, data } = req.body;

  if (type === 'payment' && data && data.id) {
    const paymentId = data.id; // ID do pagamento no Mercado Pago

    try {
      // Aqui você idealmente consultaria o Mercado Pago para obter mais detalhes do pagamento
      // Ex: const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
      //     const payment = await new Payment(mpClient).get({ id: paymentId });
      //     console.log('Detalhes do pagamento:', payment);
      //     const paymentStatus = payment.status; // status: approved, pending, rejected

      // Por simplicidade, vamos apenas registrar no Firestore que uma notificação de pagamento foi recebida
      // e você precisaria de uma forma de relacionar isso ao 'preferenceId' salvo anteriormente.
      // Uma estratégia comum é, ao criar a preferência, salvar o 'orderId' no Mercado Pago
      // e vice-versa, para poder buscar o pedido correto.
      // Por enquanto, vamos logar para o Firestore apenas para demonstrar que está funcionando.

      // EX: Se você tiver um campo 'paymentId' no seu documento 'orders' no Firestore
      // e quiser atualizar o status de um pedido existente:
      // const ordersRef = db.collection('orders');
      // const q = ordersRef.where('paymentId', '==', paymentId);
      // const querySnapshot = await q.get();

      // if (!querySnapshot.empty) {
      //   const orderDoc = querySnapshot.docs[0];
      //   await orderDoc.ref.update({ status: paymentStatus, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      //   console.log(`Pedido ${orderDoc.id} atualizado para status: ${paymentStatus}`);
      // } else {
      //   console.log(`Nenhum pedido encontrado com paymentId: ${paymentId}`);
      // }

      // Para este primeiro passo, apenas salvaremos a notificação bruta no Firestore
      await db.collection('mercadoPagoWebhooks').add({
        notificationType: type,
        dataId: data.id,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        rawBody: req.body
      });
      console.log(`Notificação de webhook ${type} com ID ${data.id} salva no Firestore.`);

    } catch (error) {
      console.error('Erro ao processar webhook ou salvar no Firestore:', error);
      return res.status(500).send('Erro ao processar webhook');
    }
  } else {
    console.log('Tipo de notificação não tratado ou dados incompletos.');
  }

  // É crucial responder com status 200 OK para o Mercado Pago
  // para que ele saiba que a notificação foi recebida com sucesso.
  res.status(200).send('Webhook recebido com sucesso!');
};