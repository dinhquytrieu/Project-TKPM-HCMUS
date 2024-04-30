const jwt = require('jsonwebtoken');
const JWT_SECRET = 'jwt secret';

// sign Function: This function is used to generate a new JWT for a user based on their email. 
// It embeds user identification into the token and sets an expiration time (defaulting to 30 minutes). 
// This token can then be used to authenticate subsequent requests from the client without needing to send the username and password again, 
// thereby reducing exposure of sensitive credentials.
function sign(email, expiresIn = '30m') {
  return jwt.sign({ email }, process.env.JWT_SECRET || JWT_SECRET, {
    expiresIn,
  });
}

// verify Function: This function checks the validity of a provided token using the same secret key used to sign the tokens. 
// It attempts to verify the integrity and authenticity of the token, ensuring it hasn't been altered. 
// If the token is valid, it confirms the user's authentication status; if not, it indicates token tampering or expiration.
function verify(token) {
  try {
    jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET);
    return true;
  } catch (error) {
    return false;
  }
}

// module.exports = { sign, verify };
