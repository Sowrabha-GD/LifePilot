import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get user profile for home location
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('home_location, cooking_time, getting_ready_time, travel_buffer_time, wake_up_margin')
      .eq('id', user.id)
      .single()

    if (!profile?.home_location) {
      throw new Error('Home location not set in profile')
    }

    // Get events with locations
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .not('location', 'is', null)
      .gte('start_time', new Date().toISOString())

    if (eventsError) throw eventsError

    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    const updates = []

    for (const event of events || []) {
      try {
        const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json')
        directionsUrl.searchParams.set('origin', profile.home_location)
        directionsUrl.searchParams.set('destination', event.location)
        directionsUrl.searchParams.set('key', googleMapsApiKey!)
        directionsUrl.searchParams.set('departure_time', 'now')

        const response = await fetch(directionsUrl.toString())
        const data = await response.json()

        if (data.status === 'OK' && data.routes.length > 0) {
          const travelSeconds = data.routes[0].legs[0].duration.value
          const travelWithBuffer = travelSeconds + (profile.travel_buffer_time * 60)

          // Calculate recommended leave time
          const eventStart = new Date(event.start_time)
          const leaveTime = new Date(eventStart.getTime() - (travelWithBuffer * 1000))

          // Calculate get ready time
          const getReadyTime = new Date(leaveTime.getTime() - (profile.getting_ready_time * 60 * 1000))

          // Calculate cook start time
          const cookStartTime = new Date(getReadyTime.getTime() - (profile.cooking_time * 60 * 1000))

          // Calculate wake up time
          const wakeUpTime = new Date(cookStartTime.getTime() - (profile.wake_up_margin * 60 * 1000))

          updates.push({
            id: event.id,
            travel_time_seconds: travelSeconds,
            recommended_leave_time: leaveTime.toISOString(),
          })
        }
      } catch (error) {
        console.error(`Error calculating travel for event ${event.id}:`, error)
      }
    }

    // Update events with travel times
    for (const update of updates) {
      await supabaseAdmin
        .from('calendar_events')
        .update({
          travel_time_seconds: update.travel_time_seconds,
          recommended_leave_time: update.recommended_leave_time,
        })
        .eq('id', update.id)
    }

    return new Response(
      JSON.stringify({ updated: updates.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in calculate-travel:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})