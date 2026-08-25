const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const JWT = require("jsonwebtoken");

const registerUser = async (req, res, next) => {
  try {
    // 1. Get data from the request
    const { name, email, password } = req.body;

    // 2. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // 3. Check whether the email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    // 4. Create the user
    const user = new User({
      name,
      email,
      password,
    });

    // 5. Save the user
    await user.save();

    // 6. Send success response
    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

  } 
  catch (error) {
  next(error);
}
};


const loginUser = async (req, res, next) => {
    try{
        const { email, password } = req.body;

        if(!email || !password) {
            return res.status(400).json({
                message : "Email and password are required" ,
            });
        }

        const user = await User.findOne({email}) ;

        if(!user) {
            return res.status(401).json({
                message : "Invalid email or password" ,
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if(!isPasswordValid) {
            return res.status(401).json({
                message : "Invalid email or password",
            })
        }

        const token = JWT.sign(
            {userId : user._id},
            process.env.JWT_SECRET,
            {expiresIn : process.env.JWT_EXPIRES_IN || "1h" }
        );

        return res.status(200).json({
            message : "Login Sucessful",
            user: {
                id : user._id,
                name : user.name,
                email : user.email
            },
            token : token
        });

    }
     catch (error) {
  next(error);
}

};



module.exports = {
  registerUser,
  loginUser,
};


