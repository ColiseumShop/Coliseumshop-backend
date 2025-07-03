// Importações necessárias para Firebase Admin SDK
const admin = require('firebase-admin');

// Inicializa o Firebase Admin SDK apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  // --- CORREÇÃO CORS ---
  // Permite requisições de localhost para desenvolvimento
  const allowedOrigins = [
    'https://coliseumshop.netlify.app',
    'http://localhost:8000' // Adicionado para desenvolvimento local do admin.html
  ];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true); // Se você usar cookies ou credenciais

  // Lida com requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  // --- FIM CORREÇÃO CORS ---

  // Apenas permite requisições POST
  if (req.method !== 'POST') {
    return res.status(405).send('Método não permitido. Apenas POST é suportado.');
  }

  const { orderId, newStatus } = req.body;

  if (!orderId || !newStatus) {
    return res.status(400).json({ error: 'ID do pedido e novo status são obrigatórios.' });
  }

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const orderData = orderSnap.data();

    if ((newStatus === 'approved' || newStatus === 'completed') &&
        !(orderData.status === 'approved' || orderData.status === 'completed')) {
      
      const batch = db.batch();

      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const productRef = db.collection('products').doc(item.productId);
          
          const productSnap = await productRef.get();
          if (productSnap.exists) {
            const productData = productSnap.data();
            const currentStock = productData.estoque || 0;
            const quantityOrdered = item.quantity || 0;
            
            const newStock = Math.max(0, currentStock - quantityOrdered);

            batch.update(productRef, { estoque: newStock });
          } else {
            console.warn(`Produto com ID ${item.productId} não encontrado para atualização de estoque.`);
          }
        }
        await batch.commit();
        console.log(`Estoque atualizado para o pedido ${orderId}.`);
      }
    }

    await orderRef.update({ status: newStatus });

    res.status(200).json({ message: 'Status do pedido atualizado e estoque ajustado (se aplicável).' });

  } catch (error) {
    console.error('Erro ao atualizar status do pedido ou estoque:', error);
    res.status(500).json({ error: 'Falha ao atualizar status do pedido ou estoque.', details: error.message });
  }
};
