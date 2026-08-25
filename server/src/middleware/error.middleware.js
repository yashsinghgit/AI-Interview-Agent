const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  if(err.name === "CastError") {
    return res.status(400).json({     //Invalid MongoDB Object
        message : "Invalid resource ID"
    });
  }

  if(err.code === 11000) {
    return res.status(409).json({
        message : "Resource already exists" //duplicate key error
    });
  }

  if(err.name === "ZodError"){
    return res.status(400).json({
        message : "Validation failed", //Zod validation error
        errors : err.issues,
    });
  }

  return res.status(500).json({
    message: "Internal server error",
  });
};


module.exports = errorMiddleware;

