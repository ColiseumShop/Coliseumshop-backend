// api/create_preference.js

import dotenv from 'dotenv';
dotenv.config(); // Carrega variáveis de ambiente

// Importa o Firebase Admin SDK para interagir com o Firebase a partir do backend
import admin from 'firebase-admin'; // Usando 'import' para ser compatível com ES Modules

// É crucial parsear a variável de ambiente (que é uma string JSON) para um objeto JavaScript
// A chave de conta de serviço é usada para autenticar o backend com o Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Inicializa o Firebase Admin SDK se ele ainda não foi inicializado
// Esta verificação impede que o aplicativo Firebase seja inicializado múltiplas vezes
// em ambientes serverless como o Vercel.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount) // Autentica com a chave de serviço
  });
}

// Obtém uma referência ao serviço Cloud Firestore
const db = admin.firestore(); // 'db' é a sua instância do Firestore para operações de banco de dados

// Importa as classes do SDK do Mercado Pago
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configura o cliente do Mercado Pago com o token de acesso (do .env)
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN, // Seu token de acesso do Mercado Pago
  options: { timeout: 5000 } // Tempo limite para requisições
});

const preference = new Preference(client); // Cria uma instância da classe Preference

// Exporta a função assíncrona para ser usada como um endpoint de API pelo Express no server.js
export default async (req, res) => {
  try {
    const { items, payer } = req.body; // Extrai itens e dados do pagador do corpo da requisição

    // Validação básica dos itens
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items deve ser um array não vazio' });
    }

    // Mapeia e valida os itens para o formato exigido pelo Mercado Pago
    const validItems = items.map(item => ({
      title: item.title || 'Produto sem nome',
      quantity: Number(item.quantity) || 1,
      unit_price: parseFloat(item.unit_price) || 0,
      currency_id: 'BRL', // Moeda em Reais Brasileiros
      // Incluir descrição e picture_url para uma experiência de checkout mais rica
      description: item.description?.substring(0, 150) || '',
      picture_url: item.imgurl || ''
    }));

    // Dados da preferência de pagamento para o Mercado Pago
    const preferenceData = {
      items: validItems,
      back_urls: { // URLs para onde o usuário será redirecionado após o pagamento
        success: "https://coliseum-shop.netlify.app/?payment=success",
        failure: "https://coliseum-shop.netlify.app/?payment=failure",
        pending: "https://coliseum-shop.netlify.app/?payment=pending"
      },
      auto_return: "approved", // Redireciona automaticamente após pagamento aprovado
      notification_url: process.env.NOTIFICATION_URL // URL para receber notificações de status de pagamento (webhooks)
    };

    // Cria a preferência de pagamento no Mercado Pago
    const response = await preference.create({ body: preferenceData });

    // --- Início da Lógica de Salvamento no Firestore ---
    try {
        const orderData = {
            preferenceId: response.id, // ID da preferência gerado pelo Mercado Pago
            items: validItems, // Itens do pedido
            payerEmail: payer ? payer.email : 'email_nao_fornecido', // E-mail do pagador
            status: 'pending', // Status inicial do pedido (pode ser atualizado por um webhook posteriormente)
            createdAt: admin.firestore.FieldValue.serverTimestamp() // Timestamp do servidor para registro
        };
        // Adiciona um novo documento à coleção 'orders' no Firestore
        await db.collection('orders').add(orderData);
        console.log('Pedido salvo no Firestore com sucesso para preference ID:', response.id);
    } catch (firestoreError) {
        console.error('Erro ao salvar pedido no Firestore:', firestoreError);
        // Em caso de erro ao salvar no Firestore, não impede o fluxo do Mercado Pago, apenas loga o erro.
    }
    // --- Fim da Lógica de Salvamento no Firestore ---

    // Retorna a ID da preferência e o URL de inicialização para o frontend
    res.status(200).json({
      id: response.id,
      init_point: response.init_point
    });

  } catch (error) {
    console.error('Erro ao criar preferência ou processar:', error); // Loga o erro no console do backend
    // Retorna uma resposta de erro para o frontend
    res.status(500).json({ error: 'Erro ao criar preferência de pagamento', details: error.message });
  }
};
