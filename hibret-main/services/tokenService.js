import jwt from 'jsonwebtoken';
import  Token from  "../models/token.model.js";
import crypto from "crypto";
import { Schema } from "mongoose";

const generateToken = async (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  if (res) { // Check if res is present (for cookie setting)
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  return token; // Return the token in any case
};



export const createToken = () => {
  return new Token({
    token: crypto.randomBytes(16).toString("hex"),
  });
};

export const findTokenBy = async (prop, value) => {
  return await Token.findOne({ [prop]: value });
};

export const setUserId = (token, userId) => {
  token._userId = userId;
};

export const saveToken = (token) => {
  return token.save();
};


export default generateToken;
