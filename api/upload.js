// Importações necessárias para Firebase Admin SDK e manipulação de ficheiros
const admin = require('firebase-admin');
const Busboy = require('busboy'); // Biblioteca para lidar com uploads de ficheiros multipart/form-data
const path = require('path');
const os = require('os');
const fs = require('fs');

// Inicializa o Firebase Admin SDK apenas uma vez
// Verifica se a aplicação Firebase já foi inicializada
if (!admin.apps.length) {
  // As credenciais de serviço são carregadas a partir de variáveis de ambiente do Vercel
  // Certifique-se de ter FIREBASE_SERVICE_ACCOUNT_KEY configurada no Vercel
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET // Ex: "coliseumshop-baedf.appspot.com"
  });
}

const bucket = admin.storage().bucket();

module.exports = async (req, res) => {
  // Apenas permite requisições POST para upload
  if (req.method !== 'POST') {
    return res.status(405).send('Método não permitido. Apenas POST é suportado.');
  }

  // Verifica se o corpo da requisição é multipart/form-data
  if (!req.headers['content-type'] || !req.headers['content-type'].startsWith('multipart/form-data')) {
    return res.status(400).send('Tipo de conteúdo inválido. Esperado multipart/form-data.');
  }

  const busboy = Busboy({ headers: req.headers });
  let fileBuffer;
  let filename;
  let mimetype;

  // Evento 'file' é acionado quando um ficheiro é recebido
  busboy.on('file', (fieldname, file, info) => {
    filename = info.filename;
    mimetype = info.mimeType;

    // Concatena os chunks do ficheiro num buffer
    const chunks = [];
    file.on('data', (chunk) => {
      chunks.push(chunk);
    });
    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
    });
  });

  // Evento 'finish' é acionado quando o Busboy terminou de processar o formulário
  busboy.on('finish', async () => {
    if (!fileBuffer) {
      return res.status(400).send('Nenhum ficheiro recebido.');
    }

    // Cria um nome de ficheiro único para evitar colisões
    const uniqueFileName = `${Date.now()}_${filename}`;
    const fileUpload = bucket.file(`produtos/${uniqueFileName}`); // Pasta 'produtos' no Storage

    // Opções para o upload, incluindo o tipo de conteúdo
    const options = {
      metadata: {
        contentType: mimetype,
      },
      public: true, // Torna o ficheiro publicamente acessível
    };

    try {
      // Faz o upload do buffer para o Firebase Storage
      await fileUpload.save(fileBuffer, options);

      // Obtém a URL de download pública
      const [url] = await fileUpload.getSignedUrl({
        action: 'read',
        expires: '03-09-2491', // Data de expiração muito distante para ser praticamente permanente
      });

      console.log(`Ficheiro ${uniqueFileName} carregado com sucesso. URL: ${url}`);
      res.status(200).json({ url });
    } catch (error) {
      console.error('Erro ao fazer upload para o Firebase Storage:', error);
      res.status(500).json({ error: 'Falha no upload da imagem.', details: error.message });
    }
  });

  // Pipe a requisição para o Busboy para ele processar o corpo
  req.pipe(busboy);
};
