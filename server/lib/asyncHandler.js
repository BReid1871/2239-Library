// Express 4 doesn't catch a rejected promise thrown by an `async` route
// handler — without this, an unhandled rejection just hangs the request
// until the platform's proxy (e.g. Railway) times it out as a 502, instead
// of a clear error response. Wrap every async handler with this.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
