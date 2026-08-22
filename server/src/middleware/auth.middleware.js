const jwt = require("jsonwebtoken");
const authMiddleware = (req,res,next) => {
    try{
        const authHeader = req.headers.authorization;
        console.log("Authorization Header:", authHeader);

        if(!authHeader )
        {
            return res.status(401).json({
                message : "Authorization header missing",
            });
        }

        if(!authHeader.startsWith("Bearer "))
        {
            return res.status(401).json({
                message : "Invalid authorization header format",
            });

        }
        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } 
    catch(error) {
        console.error('Authentication error:', error);

        return res.status(401).json({
            message : "Invalid or expired token",
        });
    }  
};

module.exports = authMiddleware;