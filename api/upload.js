// Importações necessárias para Firebase Admin SDK e manipulação de ficheiros
const admin = require('firebase-admin');
const Busboy = require('busboy'); // Biblioteca para lidar com uploads de ficheiros multipart/form-data
const path = require('path');
const os = require('os');
const fs = require('fs');

// Inicializa o Firebase Admin SDK apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

const bucket = admin.storage().bucket();

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

  // Apenas permite requisições POST para upload
  if (req.method !== 'POST') {
    return res.status(405).send('Método não permitido. Apenas POST é suportado.');
  }

  if (!req.headers['content-type'] || !req.headers['content-type'].startsWith('multipart/form-data')) {
    return res.status(400).send('Tipo de conteúdo inválido. Esperado multipart/form-data.');
  }

  const busboy = Busboy({ headers: req.headers });
  let fileBuffer;
  let filename;
  let mimetype;

  busboy.on('file', (fieldname, file, info) => {
    filename = info.filename;
    mimetype = info.mimeType;

    const chunks = [];
    file.on('data', (chunk) => {
      chunks.push(chunk);
    });
    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
    });
  });

  busboy.on('finish', async () => {
    if (!fileBuffer) {
      return res.status(400).send('Nenhum ficheiro recebido.');
    }

    const uniqueFileName = `${Date.now()}_${filename}`;
    const fileUpload = bucket.file(`produtos/${uniqueFileName}`);

    const options = {
      metadata: {
        contentType: mimetype,
      },
      public: true,
    };

    try {
      await fileUpload.save(fileBuffer, options);

      const [url] = await fileUpload.getSignedUrl({
        action: 'read',
        expires: '03-09-2491',
      });

      console.log(`Ficheiro ${uniqueFileName} carregado com sucesso. URL: ${url}`);
      res.status(200).json({ url });
    } catch (error) {
      console.error('Erro ao fazer upload para o Firebase Storage:', error);
      res.status(500).json({ error: 'Falha no upload da imagem.', details: error.message });
    }
  });

  req.pipe(busboy);
};
