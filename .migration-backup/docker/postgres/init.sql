-- CodeClash Database Initialization
-- This runs automatically when the PostgreSQL container starts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE rank_type AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend');
CREATE TYPE difficulty_type AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE battle_mode_type AS ENUM ('deathmatch', 'royal', 'bestof3', 'survival', 'speedrun', 'topicdraft', 'chaos');
CREATE TYPE battle_status_type AS ENUM ('waiting', 'active', 'completed', 'cancelled');
CREATE TYPE submission_status_type AS ENUM ('pending', 'accepted', 'wrong_answer', 'time_limit', 'runtime_error', 'compilation_error');

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE codeclash TO codeclash;
