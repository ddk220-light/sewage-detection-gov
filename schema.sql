CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    contact TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_to TEXT,
    before_image_url TEXT NOT NULL,
    after_image_url TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);
