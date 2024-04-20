import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// Define the User schema
const userSchema = new Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
  username: { type: String, required: true, unique: true, trim: true }, // Add trim option to remove whitespace
  password: { type: String, required: true, minlength: 6 }, // Minimum password length
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, // Add trim option to remove whitespace
    lowercase: true, // Convert email to lowercase
  },
  role: { type: String, required: true, trim: true }, // Add trim option to remove whitespace
  token: { type: String }, 
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  isActive: { type: Boolean, default: true },
  emailToken :{ type: String }, 
},
 {
  timestamps: true,
 }
);

// Define the User model
const User = mongoose.model('User', userSchema);

export default  User;
