const { URLSearchParams } = require('url');
const fetch = require('node-fetch'); // You might need to add 'node-fetch' to package.json
const cookie = require('cookie');
const signature = require('cookie-signature');

module.exports = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing.' });
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const redirectUri = `${proto}://${host}/api/callback`;

  try {
    // 1. Exchange authorization code for an access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`Token exchange error: ${tokenData.error_description}`);
    }

    // 2. Use the access token to get user's profile info
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileResponse.json();

    // 3. Create a session object and sign it
    const session = {
      email: profileData.email,
      name: profileData.name,
      picture: profileData.picture,
    };

    const cookieSecret = process.env.COOKIE_SECRET;
    if (!cookieSecret) {
      throw new Error('COOKIE_SECRET environment variable is not set.');
    }

    // Sign the cookie value
    const signedSession = signature.sign(JSON.stringify(session), cookieSecret);

    // 4. Set a secure, HttpOnly cookie
    res.setHeader('Set-Cookie', cookie.serialize('auth_session', signedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    }));

    // 5. Redirect user back to the main page
    res.writeHead(302, { Location: '/' });
    res.end();

  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
};