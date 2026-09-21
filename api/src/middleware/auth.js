export async function requireAuth(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required. Please provide a valid token.',
    });
  }

  // Ensure user still exists in the database
  const user = await request.server.prisma.user.findUnique({
    where: { id: request.user.id }
  });

  if (!user) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'User session expired or user no longer exists. Please log in again.'
    });
  }
}

export function requireRole(allowedRoles) {
  return async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}].`,
      });
    }
  };
}
