import mongoose from 'mongoose';
import dayjs from "dayjs";
import bcrypt from 'bcrypt';
const Schema = mongoose.Schema;

// Define the User schema
const userSchema = new Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
  username: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50,
  },
  password: { type: String, required: true, minlength: 6 , maxlength: 1024,default: "" }, // Minimum password length
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 5,
    maxlength: 255,
    trim: true, // Add trim option to remove whitespace
    lowercase: true, // Convert email to lowercase
  },
  emailToken: { type: String },
  token: { type: String , default: ""},
  role: { type: String, required: true, trim: true }, // Add trim option to remove whitespace
  passwordResetToken: { type: String ,default: ""},
  passwordResetExpires: { type: Date , default: dayjs().toDate() },
  // isActive: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Inactive'
},

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


userSchema.methods.comparePassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

userSchema.methods.hashPassword = function () {
  const user = this;
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        reject(err);
        return;
      }
      bcrypt.hash(user.password, salt, (err, hash) => {
        if (err) {
          reject(err);
          return;
        }
        user.password = hash;
        resolve(hash);
      });
    });
  });
};

userSchema.methods.hidePassword = function () {
  return omit(["password", "__v", "_id"], this.toObject({ virtuals: true }));
};
// Define the User model
const User = mongoose.model('User', userSchema);

export default User;
