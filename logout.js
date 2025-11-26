const cookie = require('cookie');

module.exports = (req, res) => {
  // Set the cookie to a past date to expire it immediately
  res.setHeader('Set-Cookie', cookie.serialize('auth_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  }));

  res.writeHead(302, { Location: '/' });
  res.end();
};