const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema (
    {
        name : {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        isVerified: {
            type: Boolean,
            default: false
        },

        verificationToken: {
            type: String,
        },

        verificationTokenExpires: {
            type: Date,
        }
    },

    {
        timestamps: true,
    }
);

userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) {
        return ;
    }

    this.password = await bcrypt.hash(this.password, 10);

    
});

const user = mongoose.model("User", userSchema);

module.exports = user;