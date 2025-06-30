// api/webhook.js (Simplificado para Teste)

// Não precisamos de dotenv ou admin para este teste simples
// import dotenv from 'dotenv';
// dotenv.config();
// import admin from 'firebase-admin';

export default async (req, res) => {
  console.log('--- Webhook do Mercado Pago Recebido (Teste Simplificado) ---');
  console.log('Requisição Recebida:', req.body); // Loga o corpo completo da requisição do webhook

  // Sempre responda com status 200 OK para o Mercado Pago
  // para que ele saiba que a notificação foi recebida com sucesso.
  res.status(200).send('Webhook de teste recebido com sucesso!');
};