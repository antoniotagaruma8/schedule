const { URLSearchParams } = require('url');

module.exports = (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'http';

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${proto}://${host}/api/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // Redirect the user to the Google OAuth consent screen
  res.writeHead(302, {
    Location: googleLoginUrl,
  });
  res.end();
};