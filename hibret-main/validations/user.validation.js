import Joi from "joi";

export function validateUser(user) {
  const schema = Joi.object({
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(5).max(255).required(),
    isVerified: Joi.boolean().required(),
  });

  return schema.validate(user);
}

export function validateLoginInput(input) {
  const schema = Joi.object({
    // username: Joi.string().min(5).max(15).required(),
    email: Joi.string().min(10).max(50).required(),
    password: Joi.string().min(5).max(255).required(),
  });

  return schema.validate(input);
}

// Define the validation schema
const schema = Joi.object({
  username: Joi.string().alphanum().min(5).max(50).required(),
  email: Joi.string().email().required(),
  role_id: Joi.string().pattern(new RegExp("^[0-9a-fA-F]{24}$")).required(), // Assuming role_id is a valid MongoDB ObjectId
});

// Function to validate input against the schema
export function validateRegisterInput(input) {
  return schema.validate(input);
}

export function validateEmail(input) {
  const schema = Joi.object({
    email: Joi.string().min(5).max(255).required().email(),
  });

  return schema.validate(input);
}

export function validatePassword(input) {
  const schema = Joi.object({
    password: Joi.string().min(5).max(255).required(),
  });
  return schema.validate(input);
}

export default {
  validateUser,
  validateLoginInput,
  validateRegisterInput,
  validateEmail,
  validatePassword,
};
