const User = require("../models/user.model");

const getProfile = async(req, res, next) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId).select("-password");

        if(!user) {
            return res.status(404).json({
                message : "User not found",
            });
        }

        return res.status(200).json({
            message : "User profile retrieved successfully",
            user : user,
        });

    }

    catch (error) {
    next(error);
}
    

};

module.exports = {
    getProfile
};
