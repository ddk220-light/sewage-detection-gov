// Cloudflare Pages Functions API Router
// Universal handler for all API routes

/**
 * Main request handler
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS request for CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    let response;

    // Route handling
    if (path === 'login' && method === 'POST') {
      response = await handleLogin(request, env);
    } else if (path === 'complaints' && method === 'GET') {
      response = await handleGetComplaints(request, env);
    } else if (path === 'complaints' && method === 'POST') {
      response = await handleCreateComplaint(request, env);
    } else if (path.startsWith('complaints/') && method === 'PUT') {
      const id = path.split('/')[1];
      response = await handleUpdateComplaint(request, env, id);
    } else {
      response = new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Add CORS headers to response
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle admin login
 */
async function handleLogin(request, env) {
  try {
    const { username, password } = await request.json();

    // Validate credentials against environment variables
    const validUsername = env.ADMIN_USERNAME || 'admin';
    const validPassword = env.ADMIN_PASSWORD || 'admin123';

    if (username === validUsername && password === validPassword) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Login successful',
          user: { username }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request format' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get all complaints from D1 database
 */
async function handleGetComplaints(request, env) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM complaints ORDER BY id DESC'
    ).all();

    return new Response(JSON.stringify({ complaints: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Database error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch complaints', message: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Create a new complaint with image upload to R2
 */
async function handleCreateComplaint(request, env) {
  try {
    const formData = await request.formData();

    const location = formData.get('location');
    const description = formData.get('description');
    const contact = formData.get('contact');
    const imageFile = formData.get('image');

    // Validate required fields
    if (!location || !description || !imageFile) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: location, description, and image are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate unique filename for image
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExtension = imageFile.name.split('.').pop();
    const fileName = `before-${timestamp}-${randomStr}.${fileExtension}`;

    // Upload image to R2
    await env.R2_BUCKET.put(fileName, imageFile.stream(), {
      httpMetadata: {
        contentType: imageFile.type,
      },
    });

    // Construct public URL for the image
    const imageUrl = `${env.R2_PUBLIC_URL}/${fileName}`;

    // Insert complaint into D1 database
    const result = await env.DB.prepare(
      `INSERT INTO complaints (location, description, contact, status, before_image_url, submitted_at)
       VALUES (?, ?, ?, 'pending', ?, datetime('now'))
       RETURNING *`
    ).bind(location, description, contact, imageUrl).first();

    // If the database doesn't support RETURNING, fetch the last inserted row
    let complaint = result;
    if (!result) {
      complaint = await env.DB.prepare(
        'SELECT * FROM complaints WHERE id = last_insert_rowid()'
      ).first();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Complaint created successfully',
        complaint: complaint
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Create complaint error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create complaint', message: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Update a complaint (assign officer or mark complete)
 */
async function handleUpdateComplaint(request, env, id) {
  try {
    const formData = await request.formData();

    const status = formData.get('status');
    const assignedTo = formData.get('assigned_to');
    const afterImage = formData.get('after_image');

    // Build dynamic update query based on provided fields
    let updateFields = [];
    let values = [];

    if (status) {
      updateFields.push('status = ?');
      values.push(status);
    }

    if (assignedTo) {
      updateFields.push('assigned_to = ?');
      values.push(assignedTo);
    }

    // Handle after image upload if provided
    let afterImageUrl = null;
    if (afterImage) {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileExtension = afterImage.name.split('.').pop();
      const fileName = `after-${timestamp}-${randomStr}.${fileExtension}`;

      // Upload to R2
      await env.R2_BUCKET.put(fileName, afterImage.stream(), {
        httpMetadata: {
          contentType: afterImage.type,
        },
      });

      afterImageUrl = `${env.R2_PUBLIC_URL}/${fileName}`;
      updateFields.push('after_image_url = ?');
      values.push(afterImageUrl);
    }

    // Add completed_at timestamp if status is completed
    if (status === 'completed') {
      updateFields.push("completed_at = datetime('now')");
    }

    if (updateFields.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No fields to update' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Add id to values for WHERE clause
    values.push(id);

    // Execute update
    const query = `UPDATE complaints SET ${updateFields.join(', ')} WHERE id = ?`;
    await env.DB.prepare(query).bind(...values).run();

    // Fetch updated complaint
    const updatedComplaint = await env.DB.prepare(
      'SELECT * FROM complaints WHERE id = ?'
    ).bind(id).first();

    if (!updatedComplaint) {
      return new Response(
        JSON.stringify({ error: 'Complaint not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Complaint updated successfully',
        complaint: updatedComplaint
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Update complaint error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update complaint', message: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
