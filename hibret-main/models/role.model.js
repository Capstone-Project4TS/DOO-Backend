import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    //auto: true // Add auto: true if you want the ID to be generated automatically
  },
  roleName: {
    type: String,
    required: true,
    unique: true // Ensure unique role names
  },
  permissions: {
    type: Object,
    required: true,
    default: {} // Set default to empty object to avoid validation errors
  },
});

const Role = mongoose.model('Role', roleSchema);

export default Role;
