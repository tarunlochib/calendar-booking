const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Shopify Calendar App Backend Running!');
});

// Test route to fetch businesses
app.get('/api/businesses', async (req, res) => {
  const { data, error } = await supabase.from('businesses').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get all services for a specific business
app.get('/api/services', async (req, res) => {
  const { business_id } = req.query;
  if (!business_id) return res.status(400).json({ error: 'Missing business_id' });
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get all bookings for a specific business
app.get('/api/bookings', async (req, res) => {
  const { business_id } = req.query;
  if (!business_id) return res.status(400).json({ error: 'Missing business_id' });
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('business_id', business_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create a new booking
app.post('/api/bookings', async (req, res) => {
  const { business_id, customer_name, service_ids, start_time } = req.body;
  if (!business_id || !customer_name || !service_ids || !start_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 1. Fetch durations for all selected services
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('duration')
    .in('id', service_ids);
  if (servicesError) return res.status(500).json({ error: servicesError.message });
  if (!services || services.length !== service_ids.length) {
    return res.status(400).json({ error: 'One or more services not found' });
  }

  // 2. Calculate total duration + 15 min buffer
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
  const buffer = 15;
  const totalTime = totalDuration + buffer;
  const start = new Date(start_time);
  const end = new Date(start.getTime() + totalTime * 60000);

  // 3. Check for overlapping bookings (including buffer)
  const { data: overlapping, error: overlapError } = await supabase
    .from('bookings')
    .select('*')
    .eq('business_id', business_id)
    .or(`start_time.lt.${end.toISOString()},end_time.gt.${start.toISOString()}`);
  if (overlapError) return res.status(500).json({ error: overlapError.message });
  if (overlapping && overlapping.length > 0) {
    return res.status(409).json({ error: 'Time slot overlaps with an existing booking' });
  }

  // 4. Insert the booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert([
      {
        business_id,
        customer_name,
        service_ids,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      },
    ])
    .select()
    .single();
  if (bookingError) return res.status(500).json({ error: bookingError.message });
  res.status(201).json(booking);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 