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
    username: Joi.string().min(5).max(15).required(),
    email: Joi.string().min(10).max(50).required(),
    password: Joi.string().min(5).max(255).required(),
  });


  return schema.validate(input);
}

export function validateRegisterInput(input) {
  const usernameRegex = /^[a-zA-Z]+$/; // Regex to match only alpha characters
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[!@#$%^&*])(?=.*[0-9]).{5,}$/; // Regex to match strong password with at least one special character

  const schema = Joi.object({
    password: Joi.string().pattern(passwordRegex).min(8).max(255).required().messages({
      'string.pattern.base': 'Password must be strong.',
    }),
    email: Joi.string().min(5).max(255).required().email(),
    role: Joi.string().pattern(usernameRegex).min(5).max(50).required().messages({
      'string.pattern.base': 'Role must contain only alpha characters.Shoud not be a number!',
    }),
    username: Joi.string().pattern(usernameRegex).min(5).max(15).required().messages({
      'string.pattern.base': 'Username must contain only alpha characters.Shoud not be a number!',
    }),
  });

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

export default{
  validateUser,
  validateLoginInput,
  validateRegisterInput,
  validateEmail,
  validatePassword,
};
