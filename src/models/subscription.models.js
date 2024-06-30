import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    subcriber: {
      type: mongoose.Schema.Types.ObjectId, // subscriber of channel
      ref: "User",
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId, // to whom subscriber is sunscribing
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
