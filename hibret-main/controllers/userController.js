import UserModel from '../models/users.model.js';
import bcrypt  from 'bcrypt';
import crypto from 'crypto';
import {sendVerificationEmail} from './mailer.js'
export async function createAccounts(req, res) {
    const users = req.body;
    try {
      // Check if request body contains user data array
      if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ message: 'Please provide an array of user objects in the request body.' });
      }
  
      // Loop through each user object in the request body
      const createdUsers = [];
      for (const user of users) {
        const newUser = await createUser(user); // Call the existing createUser function
        if (newUser.error) {
            // Handle error
            return res.status(400).json({ message: newUser.error });
          }
        createdUsers.push(newUser);
      }
  
      res.status(201).json({ message: 'Accounts created successfully.', data: createdUsers });
    } catch (error) {
      console.error('Error creating users:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

// Route to create a new user with email verification

export async function createUser(user){
    try {
      // Check if the username is already taken
      const existingUser = await UserModel.findOne({ email: user.email });
      if (existingUser) {
        return  'Email is already taken';
      }
  
    async function hashPassword(password) {
        const salt = await bcrypt.genSalt(10); // Generate a random salt
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
      }
      
      const defaultPassword = crypto.randomBytes (10).toString("hex");
      const hashedPassword = await hashPassword(defaultPassword);
      const defaultUsername = crypto.randomBytes (5).toString("hex");
      const verificationToken= crypto.randomBytes (64).toString("hex");
    
      // Create a new user object with verification token
      const newUser = new UserModel({
        username: defaultUsername,
        password: hashedPassword,
        email: user.email,
        role: user.role,
        isActive: false, // Set isActive to false until user verifies email
        emailToken: verificationToken,
      });
  
      // Save the user to the database
      await newUser.save();
  
      // Send verification email
      await sendVerificationEmail(newUser);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      return  'Internal server error';
    }
  }