// Importações necessárias para Firebase Admin SDK
const admin = require('firebase-admin');

// Inicializa o Firebase Admin SDK apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
    // Não precisamos do storageBucket aqui, mas é bom manter a inicialização consistente
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
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

    // Lógica para reduzir o estoque APENAS se o status for 'approved' ou 'completed'
    // E se o status anterior não era 'approved' ou 'completed' (para evitar duplicação)
    if ((newStatus === 'approved' || newStatus === 'completed') &&
        !(orderData.status === 'approved' || orderData.status === 'completed')) {
      
      const batch = db.batch(); // Usamos um batch para garantir atomicidade das operações

      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const productRef = db.collection('products').doc(item.productId); // Assumindo que o item tem productId
          
          // Obtém o produto para verificar o estoque atual
          const productSnap = await productRef.get();
          if (productSnap.exists) {
            const productData = productSnap.data();
            const currentStock = productData.estoque || 0;
            const quantityOrdered = item.quantity || 0;
            
            // Calcula o novo estoque
            const newStock = Math.max(0, currentStock - quantityOrdered); // Garante que não fica negativo

            // Adiciona a operação de atualização ao batch
            batch.update(productRef, { estoque: newStock });
          } else {
            console.warn(`Produto com ID ${item.productId} não encontrado para atualização de estoque.`);
            // Você pode decidir como lidar com isso: ignorar, retornar erro, etc.
            // Por enquanto, vamos continuar, mas logar o aviso.
          }
        }
        // Comita todas as operações de atualização de estoque de uma vez
        await batch.commit();
        console.log(`Estoque atualizado para o pedido ${orderId}.`);
      }
    }

    // Atualiza o status do pedido no Firestore
    await orderRef.update({ status: newStatus });

    res.status(200).json({ message: 'Status do pedido atualizado e estoque ajustado (se aplicável).' });

  } catch (error) {
    console.error('Erro ao atualizar status do pedido ou estoque:', error);
    res.status(500).json({ error: 'Falha ao atualizar status do pedido ou estoque.', details: error.message });
  }
};
