import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

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

    const ext = path.extname(data.filename) || '.jpg';
    const filename = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await pipeline(data.file, fs.createWriteStream(filePath));

    const photo_url = `/uploads/${filename}`;

    return reply.status(201).send({
      statusCode: 201,
      message: 'Image uploaded successfully',
      photo_url
    });
  });
}
