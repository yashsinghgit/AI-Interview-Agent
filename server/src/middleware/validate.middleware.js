/**
 * Reusable Express request validation middleware using Zod.
 * Validates req.body, req.query, and req.params against provided Zod schemas.
 * Standardizes consistent HTTP 400 error responses and sanitizes input data.
 */
const validate = ({ body, query, params } = {}) => {
  return (req, res, next) => {
    try {
      if (body) {
        req.body = body.parse(req.body);
      }
      if (query) {
        const parsedQuery = query.parse(req.query);
        // In Express 5, req.query has only a getter by default; redefine it as a writable value property
        Object.defineProperty(req, "query", {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (params) {
        req.params = params.parse(req.params);
      }
      next();
    } catch (err) {
      if (err.name === "ZodError") {
        return res.status(400).json({
          message: "Validation failed",
          errors: err.issues.map((issue) => ({
            field: issue.path.join(".") || "payload",
            message: issue.message,
            code: issue.code,
          })),
        });
      }
      next(err);
    }
  };
};

module.exports = validate;
