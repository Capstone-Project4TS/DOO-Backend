import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const userSchema = new Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
  username: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50,
  },
  otp:{type:String, maxlength: 6, },
  password: { type: String, required: true, minlength: 6 , maxlength: 1024}, // Minimum password length
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 5,
    maxlength: 255,
    trim: true, 
    lowercase: true, 
  },
  token: { type: String , default: ""},
  role_id:  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }, 

  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Inactive'
},
archivedWorkflows: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Workflow'
}],

accountCreationStatus: {
  type: String,
  enum: ['Sent', 'Not Sent'],
  default: 'Not Sent'
},
activationStatus: {
  type: String,
  enum: ['Activated', 'Deactivated'],
  default: 'Activated'
},
lastLoginDate: {
  type: Date,
  default: null
},
loginAttempts: {
  type: Number,
  default: 0
},
lockUntil: {
  type: Date,
  default: null
}
},
  {
    timestamps: true,
  }, 
  
);


const User = mongoose.model('User', userSchema);

export default User;
