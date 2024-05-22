import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    //auto: true // Add auto: true if you want the ID to be generated automatically
  },
  roleName: {
    type: String,
    required: true,
    unique: true, // Ensure unique role names
  },
  depId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  permissions: [
    {
      type: String,
      required: true,
      unique: true, // Ensure unique permissions within a role
    },
  ],
});

const Role = mongoose.model("Role", roleSchema);

export default Role;
