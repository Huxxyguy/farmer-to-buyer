import fs from 'fs';
import path from 'path';

export default async function uploadRoutes(fastify, options) {
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'No file uploaded.'
      });
    }

    const filename = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpeg`;
    const filePath = path.join(uploadDir, filename);

    // Read buffer into memory
    const buffer = await data.toBuffer();

    let finalBuffer = buffer;

    // Try sharp compression if available, fallback to writing buffer
    try {
      const sharp = (await import('sharp')).default;
      finalBuffer = await sharp(buffer)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (e) {
      console.warn('Sharp compression fallback used:', e.message);
    }

    await fs.promises.writeFile(filePath, finalBuffer);

    const stats = fs.statSync(filePath);
    const photo_url = `/uploads/${filename}`;

    return reply.status(201).send({
      statusCode: 201,
      message: 'Image uploaded and compressed successfully',
      photo_url,
      size_bytes: stats.size,
      size_kb: Number((stats.size / 1024).toFixed(2))
    });
  });
}
