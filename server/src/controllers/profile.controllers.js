const User = require("../models/user.model");

const getProfile = async (req, res, next) => {
    try{
        const userID = req.user.userId;

        const user = await User.findById(userID).select("name email");

        if(!user) {
            return res.status(404).json({
                message : "User not found",
            });
        }

        return res.status(200).json({
            message : "User profile fetched successfully",
            user : {
                id :  user._id,
                name : user.name,
                email : user.email,

            },
        });
    }
        catch(error) {
            next(error);    

        }
    };

    module.exports = {
        getProfile,
};