const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  // Temporarily allow all requests without token verification
  // TODO: Implement JWT token verification later
  console.log('Protect middleware - Bypassing token check for now');
  next();

  /*
  // Future implementation with token verification
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      console.error('Protect middleware - Token verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token invalid' });
    }
  } else {
    console.log('Protect middleware - No token provided');
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
  */
};

module.exports = protect;


// const jwt = require("jsonwebtoken");

// const protect = async (req, res, next) => {
//   let token;

//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer")
//   ) {
//     try {
//       token = req.headers.authorization.split(" ")[1];
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       // Add admin check if needed (e.g., decoded.isAdmin)
//       next();
//     } catch (error) {
//       return res.status(401).json({ message: "Not authorized" });
//     }
//   } else {
//     return res.status(401).json({ message: "No token provided" });
//   }
// };

// module.exports = protect;
