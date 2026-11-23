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
        },

        resetPasswordToken: {
            type: String,
            default: null,
        },

        resetPasswordExpires: {
            type: Date,
            default: null,
        },

        passwordChangedAt: {
            type: Date,
            default: null,
        },
    },

    {
        timestamps: true,
    }
);

userSchema.pre("save", async function() {
    if (!this.isModified("password")) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 10);
});

// Sparse indexes to optimize token verification and password reset lookups
userSchema.index({ verificationToken: 1 }, { sparse: true });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });

const user = mongoose.model("User", userSchema);

module.exports = user;