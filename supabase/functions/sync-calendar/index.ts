import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function refreshTokenIfNeeded(profile: any, supabaseAdmin: any) {
  const now = new Date()
  const expiry = new Date(profile.google_token_expiry)

  if (expiry <= now) {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: profile.google_refresh_token,
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: 'refresh_token',
      }),
    })

    const tokens = await response.json()
    const newExpiry = new Date()
    newExpiry.setSeconds(newExpiry.getSeconds() + tokens.expires_in)

    await supabaseAdmin
      .from('profiles')
      .update({
        google_access_token: tokens.access_token,
        google_token_expiry: newExpiry.toISOString(),
      })
      .eq('id', profile.id)

    return tokens.access_token
  }

  return profile.google_access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.google_access_token) {
      throw new Error('Google Calendar not connected')
    }

    const accessToken = await refreshTokenIfNeeded(profile, supabaseAdmin)

    // Fetch events from Google Calendar
    const now = new Date().toISOString()
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=50&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const calendarData = await calendarResponse.json()

    if (!calendarData.items) {
      return new Response(
        JSON.stringify({ events: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store events in database
    const eventsToStore = calendarData.items.map((event: any) => ({
      user_id: user.id,
      google_event_id: event.id,
      title: event.summary || 'Untitled',
      description: event.description || null,
      start_time: event.start.dateTime || event.start.date,
      end_time: event.end.dateTime || event.end.date,
      location: event.location || null,
    }))

    // Upsert events
    const { error: upsertError } = await supabaseAdmin
      .from('calendar_events')
      .upsert(eventsToStore, { onConflict: 'user_id,google_event_id' })

    if (upsertError) {
      console.error('Error upserting events:', upsertError)
      throw upsertError
    }

    return new Response(
      JSON.stringify({ events: eventsToStore, count: eventsToStore.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in sync-calendar:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})