// Centralized JSON error response helpers
// Always returns { error: string } so clients have a consistent shape.

const send = (res, status, message) => res.status(status).json({ error: message });

exports.badRequest   = (res, msg = 'Bad request')             => send(res, 400, msg);
exports.unauthorized = (res, msg = 'Unauthorized')             => send(res, 401, msg);
exports.forbidden    = (res, msg = 'Forbidden')                => send(res, 403, msg);
exports.notFound     = (res, msg = 'Resource not found')       => send(res, 404, msg);
exports.conflict     = (res, msg = 'Conflict')                 => send(res, 409, msg);
exports.serverError  = (res, msg = 'Internal server error')    => send(res, 500, msg);
