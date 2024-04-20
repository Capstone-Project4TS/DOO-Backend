import jwt from 'jsonwebtoken';


const generateToken = ( res,userId) => {
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

export default generateToken;
