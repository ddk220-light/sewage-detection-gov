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
    if (path === 'health' && method === 'GET') {
      response = await handleHealthCheck(request, env);
    } else if (path === 'login' && method === 'POST') {
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
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack,
        path: path,
        method: method
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Health check endpoint to verify configuration
 */
async function handleHealthCheck(request, env) {
  const status = {
    api: 'OK',
    timestamp: new Date().toISOString(),
    bindings: {
      DB: env.DB ? 'configured' : 'missing',
      ImageStore: env.ImageStore ? 'configured' : 'missing',
    },
    env_vars: {
      ADMIN_USERNAME: env.ADMIN_USERNAME ? 'set' : 'missing',
      ADMIN_PASSWORD: env.ADMIN_PASSWORD ? 'set' : 'missing',
      R2_PUBLIC_URL: env.R2_PUBLIC_URL ? 'set' : 'missing',
    }
  };

  // Test database connection if available
  if (env.DB) {
    try {
      const result = await env.DB.prepare('SELECT 1 as test').first();
      status.database = 'connected';

      // Check if complaints table exists
      const tableCheck = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='complaints'"
      ).first();
      status.complaintsTable = tableCheck ? 'exists' : 'missing - run schema.sql';
    } catch (error) {
      status.database = `error: ${error.message}`;
    }
  }

  const allOk = status.bindings.DB === 'configured' &&
                status.bindings.ImageStore === 'configured' &&
                status.database === 'connected' &&
                status.complaintsTable === 'exists';

  return new Response(
    JSON.stringify(status, null, 2),
    {
      status: allOk ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
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
    // Check if DB binding exists
    if (!env.DB) {
      throw new Error('D1 database binding (DB) not configured. Please add D1 binding in Cloudflare Pages settings.');
    }

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
      JSON.stringify({
        error: 'Failed to fetch complaints',
        message: error.message,
        hint: 'Make sure the D1 database is initialized with schema.sql'
      }),
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
    // Check bindings
    if (!env.DB) {
      throw new Error('D1 database binding (DB) not configured. Please add D1 binding in Cloudflare Pages settings.');
    }
    if (!env.ImageStore) {
      throw new Error('R2 bucket binding (ImageStore) not configured. Please add R2 binding in Cloudflare Pages settings.');
    }

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

    console.log('Uploading image to R2:', fileName);

    // Upload image to R2
    await env.ImageStore.put(fileName, imageFile.stream(), {
      httpMetadata: {
        contentType: imageFile.type,
      },
    });

    // Construct public URL for the image
    const imageUrl = `${env.R2_PUBLIC_URL}/${fileName}`;

    console.log('Image uploaded successfully:', imageUrl);
    console.log('Inserting complaint into D1 database');

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

    console.log('Complaint created successfully:', complaint);

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
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        error: 'Failed to create complaint',
        message: error.message,
        stack: error.stack,
        hint: 'Check that D1 database is initialized and R2 bucket binding is configured'
      }),
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
      await env.ImageStore.put(fileName, afterImage.stream(), {
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
