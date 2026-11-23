const mongoose = require("mongoose");

const rateLimitSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    hits: {
      type: Number,
      required: true,
      default: 1,
    },
    resetAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// TTL index to automatically remove expired rate limit records
rateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit = mongoose.models.RateLimit || mongoose.model("RateLimit", rateLimitSchema);

module.exports = RateLimit;
