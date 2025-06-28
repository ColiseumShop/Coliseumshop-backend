import dotenv from 'dotenv';
dotenv.config();
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

const preference = new Preference(client);

// Altera de module.exports para export default para ser compatível com ES Modules
export default async (req, res, next) => {
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
      // Se quiser webhook, ative essa linha (já está ativada no seu código original, apenas mantive):
      notification_url: process.env.NOTIFICATION_URL
    };

    const response = await preference.create({ body: preferenceData });

    res.status(200).json({
      id: response.id,
      init_point: response.init_point
    });

  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    // Adicione um detalhe do erro na resposta para facilitar o debug se ocorrer novamente
    res.status(500).json({ error: 'Erro ao criar preferência de pagamento', details: error.message });
  }
};