import { NextRequest, NextResponse } from 'next/server';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/azure-supporter?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/azure-supporter?error=missing_code', request.url)
      );
    }

    // Exchange code for access token
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL('/azure-supporter?error=config_error', request.url)
      );
    }

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        new URL('/azure-supporter?error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();

    // Get user information
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(
        new URL('/azure-supporter?error=user_fetch_failed', request.url)
      );
    }

    const userData = await userResponse.json();

    // Redirect to azure-supporter page with Discord user ID
    const redirectUrl = new URL('/azure-supporter', request.url);
    redirectUrl.searchParams.set('discordUserId', userData.id);
    redirectUrl.searchParams.set('discordUsername', userData.username);
    redirectUrl.searchParams.set('success', 'true');

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error in Discord OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/azure-supporter?error=unexpected_error', request.url)
    );
  }
}
