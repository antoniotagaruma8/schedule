const cookie = require('cookie');
const signature = require('cookie-signature');

module.exports = (req, res) => {
  const cookies = cookie.parse(req.headers.cookie || '');
  const sessionCookie = cookies.auth_session;
  const cookieSecret = process.env.COOKIE_SECRET;

  if (!sessionCookie || !cookieSecret) {
    return res.status(200).json({ user: null });
  }

  const unsignedSession = signature.unsign(sessionCookie, cookieSecret);

  if (unsignedSession) {
    try {
      const user = JSON.parse(unsignedSession);
      return res.status(200).json({ user });
    } catch (e) {
      return res.status(200).json({ user: null });
    }
  }

  return res.status(200).json({ user: null });
};