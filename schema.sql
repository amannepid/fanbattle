-- FanBattle Database Schema
-- PostgreSQL 15+
-- Initial Schema for NPL Fantasy Predictor Application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types
CREATE TYPE auth_provider_type AS ENUM ('facebook', 'google');
CREATE TYPE tournament_status_type AS ENUM ('draft', 'registration_open', 'active', 'completed');
CREATE TYPE match_type AS ENUM ('league', 'playoff', 'final');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'completed', 'cancelled');
CREATE TYPE player_role AS ENUM ('batsman', 'bowler', 'all-rounder', 'wicket-keeper');
CREATE TYPE transaction_type AS ENUM ('entry_fee', 'penalty', 'refund', 'payout');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE notification_type AS ENUM ('match_result', 'prediction_reminder', 'leaderboard', 'payment', 'announcement');
CREATE TYPE admin_role AS ENUM ('super_admin', 'tournament_admin');

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_picture_url TEXT,
    auth_provider auth_provider_type NOT NULL,
    auth_provider_id VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    CONSTRAINT unique_auth_provider UNIQUE (auth_provider, auth_provider_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id);

COMMENT ON TABLE users IS 'Stores user account information and authentication details';

-- ============================================================================
-- TOURNAMENTS TABLE
-- ============================================================================
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    entry_fee DECIMAL(10, 2) DEFAULT 50.00,
    status tournament_status_type DEFAULT 'draft',
    prize_pool DECIMAL(12, 2),
    total_matches INTEGER DEFAULT 32,
    league_matches INTEGER DEFAULT 28,
    playoff_matches INTEGER DEFAULT 4,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_match_count CHECK (total_matches = league_matches + playoff_matches)
);

CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_dates ON tournaments(start_date, end_date);

COMMENT ON TABLE tournaments IS 'Stores tournament metadata and configuration';

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_code VARCHAR(10),
    logo_url TEXT,
    home_ground VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_team_per_tournament UNIQUE (tournament_id, name)
);

CREATE INDEX idx_teams_tournament ON teams(tournament_id);

COMMENT ON TABLE teams IS 'Cricket teams participating in tournaments';

-- ============================================================================
-- PLAYERS TABLE
-- ============================================================================
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    photo_url TEXT,
    role player_role NOT NULL,
    jersey_number INTEGER,
    batting_stats JSONB DEFAULT '{}',
    bowling_stats JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_role ON players(role);

COMMENT ON TABLE players IS 'Cricket players with their stats and team assignments';
COMMENT ON COLUMN players.batting_stats IS 'JSON: {runs, average, strike_rate, centuries, fifties}';
COMMENT ON COLUMN players.bowling_stats IS 'JSON: {wickets, average, economy, best_figures}';

-- ============================================================================
-- MATCHES TABLE
-- ============================================================================
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    match_number INTEGER NOT NULL,
    match_type match_type NOT NULL,
    team_a_id UUID NOT NULL REFERENCES teams(id),
    team_b_id UUID NOT NULL REFERENCES teams(id),
    venue VARCHAR(255),
    match_date TIMESTAMP NOT NULL,
    prediction_deadline TIMESTAMP NOT NULL,
    status match_status DEFAULT 'scheduled',
    
    -- Results (populated after match completion)
    winner_team_id UUID REFERENCES teams(id),
    man_of_match_id UUID REFERENCES players(id),
    first_innings_score INTEGER,
    first_innings_wickets INTEGER CHECK (first_innings_wickets BETWEEN 0 AND 10),
    is_reduced_overs BOOLEAN DEFAULT false,
    is_super_over BOOLEAN DEFAULT false,
    match_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_match_number UNIQUE (tournament_id, match_number),
    CONSTRAINT different_teams CHECK (team_a_id != team_b_id),
    CONSTRAINT valid_wickets CHECK (first_innings_wickets IS NULL OR first_innings_wickets BETWEEN 0 AND 10)
);

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_teams ON matches(team_a_id, team_b_id);

COMMENT ON TABLE matches IS 'Match schedule and results';
COMMENT ON COLUMN matches.is_reduced_overs IS 'If true, first innings score/wickets predictions are void';

-- ============================================================================
-- USER ENTRIES TABLE
-- ============================================================================
CREATE TABLE user_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    season_team_id UUID REFERENCES teams(id),
    
    -- Tournament-end predictions
    highest_run_getter_id UUID REFERENCES players(id),
    highest_wicket_taker_id UUID REFERENCES players(id),
    player_of_tournament_id UUID REFERENCES players(id),
    
    -- Financial tracking
    entry_fee_paid BOOLEAN DEFAULT false,
    entry_fee_amount DECIMAL(10, 2) DEFAULT 50.00,
    payment_transaction_id VARCHAR(255),
    
    -- Scoring
    total_points INTEGER DEFAULT 0,
    total_penalties DECIMAL(10, 2) DEFAULT 0.00,
    current_rank INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_per_tournament UNIQUE (user_id, tournament_id)
);

CREATE INDEX idx_user_entries_user ON user_entries(user_id);
CREATE INDEX idx_user_entries_tournament ON user_entries(tournament_id);
CREATE INDEX idx_user_entries_rank ON user_entries(tournament_id, current_rank);
CREATE INDEX idx_user_entries_season_team ON user_entries(season_team_id);

COMMENT ON TABLE user_entries IS 'User participation in tournaments with season team selection and scoring';

-- ============================================================================
-- PREDICTIONS TABLE
-- ============================================================================
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_entry_id UUID NOT NULL REFERENCES user_entries(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    
    -- Required prediction
    predicted_winner_id UUID NOT NULL REFERENCES teams(id),
    
    -- Optional predictions
    predicted_mom_id UUID REFERENCES players(id),
    predicted_score_category CHAR(1) CHECK (predicted_score_category IN ('A','B','C','D','E','F')),
    predicted_wickets INTEGER CHECK (predicted_wickets BETWEEN 0 AND 10),
    
    -- Scoring results (calculated after match)
    points_earned INTEGER DEFAULT 0,
    penalty_fee DECIMAL(10, 2) DEFAULT 0.00,
    is_correct_winner BOOLEAN,
    is_correct_mom BOOLEAN,
    is_correct_score_category BOOLEAN,
    is_correct_wickets BOOLEAN,
    season_team_adjustment INTEGER DEFAULT 0,
    
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scored_at TIMESTAMP,
    
    CONSTRAINT unique_prediction_per_match UNIQUE (user_entry_id, match_id)
);

CREATE INDEX idx_predictions_user_entry ON predictions(user_entry_id);
CREATE INDEX idx_predictions_match ON predictions(match_id);
CREATE INDEX idx_predictions_submitted ON predictions(submitted_at);

COMMENT ON TABLE predictions IS 'User predictions for each match with scoring results';
COMMENT ON COLUMN predictions.predicted_score_category IS 'A: 0-100, B: 101-130, C: 131-160, D: 161-190, E: 191-220, F: 221+';
COMMENT ON COLUMN predictions.season_team_adjustment IS '+1 if season team wins with correct prediction, -1 if season team loses';

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    user_entry_id UUID REFERENCES user_entries(id),
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status transaction_status DEFAULT 'pending',
    payment_provider VARCHAR(50),
    payment_transaction_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_user_entry ON transactions(user_entry_id);
CREATE INDEX idx_transactions_type_status ON transactions(transaction_type, status);
CREATE INDEX idx_transactions_created ON transactions(created_at);

COMMENT ON TABLE transactions IS 'Financial transactions including entry fees, penalties, refunds, and payouts';

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

COMMENT ON TABLE notifications IS 'Push notifications and in-app messages for users';

-- ============================================================================
-- ADMIN USERS TABLE
-- ============================================================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id),
    role admin_role DEFAULT 'tournament_admin',
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_users_user ON admin_users(user_id);

COMMENT ON TABLE admin_users IS 'Admin users with elevated permissions';
COMMENT ON COLUMN admin_users.permissions IS 'JSON: {tournaments: [id1, id2], features: ["results", "users"]}';

-- ============================================================================
-- AUDIT LOG TABLE (for tracking admin actions)
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

COMMENT ON TABLE audit_logs IS 'Audit trail for sensitive operations (especially admin actions)';

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_entries_updated_at BEFORE UPDATE ON user_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate leaderboard ranks
CREATE OR REPLACE FUNCTION update_leaderboard_ranks(p_tournament_id UUID)
RETURNS void AS $$
BEGIN
    WITH ranked_users AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY total_points DESC, created_at ASC) as new_rank
        FROM user_entries
        WHERE tournament_id = p_tournament_id
    )
    UPDATE user_entries ue
    SET current_rank = ru.new_rank
    FROM ranked_users ru
    WHERE ue.id = ru.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_leaderboard_ranks IS 'Recalculates and updates ranks for all users in a tournament';

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Insert a sample tournament
INSERT INTO tournaments (id, name, country, start_date, end_date, status)
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-111111111111',
    'Nepal Premier League 2025',
    'Nepal',
    '2025-12-01',
    '2025-12-31',
    'draft'
);

-- Insert sample teams
INSERT INTO teams (id, tournament_id, name, short_code) VALUES
    ('bbbbbbbb-cccc-dddd-eeee-111111111111', 'aaaaaaaa-bbbb-cccc-dddd-111111111111', 'Kathmandu Kings', 'KTK'),
    ('bbbbbbbb-cccc-dddd-eeee-222222222222', 'aaaaaaaa-bbbb-cccc-dddd-111111111111', 'Pokhara Rhinos', 'PKR'),
    ('bbbbbbbb-cccc-dddd-eeee-333333333333', 'aaaaaaaa-bbbb-cccc-dddd-111111111111', 'Chitwan Tigers', 'CWT'),
    ('bbbbbbbb-cccc-dddd-eeee-444444444444', 'aaaaaaaa-bbbb-cccc-dddd-111111111111', 'Karnali Yaks', 'KRN'),
    ('bbbbbbbb-cccc-dddd-eeee-555555555555', 'aaaaaaaa-bbbb-cccc-dddd-111111111111', 'Lalitpur Patriots', 'LTP'),
    ('bbbbbbbb-cccc-dddd-eeee-666666666666', 'aaaaaaaa-bbbb-cccc-dddd-111111111111', 'Biratnagar Warriors', 'BRT'),
    ('bbbbbbbb-cccc-dddd-eeee-777777777777', 'aaaaaaaa-bbbb-cccc-dddd-111111111111', 'Bhairahawa Gladiators', 'BHG'),
    ('bbbbbbbb-cccc-dddd-eeee-888888888888', 'aaaaaaaa-bbbb-cccc-dddd-111111111111', 'Janakpur Bolts', 'JNK');

-- Note: Additional sample data (players, matches) should be added via admin panel or migration scripts

-- ============================================================================
-- VIEWS (for common queries)
-- ============================================================================

-- View: User standings with complete stats
CREATE OR REPLACE VIEW v_user_standings AS
SELECT 
    ue.id,
    ue.tournament_id,
    u.id as user_id,
    u.name as user_name,
    u.email,
    t.name as season_team_name,
    ue.total_points,
    ue.total_penalties,
    ue.current_rank,
    ue.entry_fee_paid,
    COUNT(p.id) as total_predictions,
    COUNT(p.id) FILTER (WHERE p.is_correct_winner = true) as correct_predictions,
    ROUND((COUNT(p.id) FILTER (WHERE p.is_correct_winner = true)::NUMERIC / NULLIF(COUNT(p.id), 0)) * 100, 2) as accuracy_percentage
FROM user_entries ue
JOIN users u ON ue.user_id = u.id
LEFT JOIN teams t ON ue.season_team_id = t.id
LEFT JOIN predictions p ON p.user_entry_id = ue.id
GROUP BY ue.id, u.id, u.name, u.email, t.name, ue.total_points, ue.total_penalties, ue.current_rank, ue.entry_fee_paid;

COMMENT ON VIEW v_user_standings IS 'Complete user standings with prediction stats and accuracy';

-- View: Upcoming matches requiring predictions
CREATE OR REPLACE VIEW v_upcoming_matches AS
SELECT 
    m.id as match_id,
    m.tournament_id,
    m.match_number,
    m.match_type,
    ta.name as team_a_name,
    ta.short_code as team_a_code,
    tb.name as team_b_name,
    tb.short_code as team_b_code,
    m.venue,
    m.match_date,
    m.prediction_deadline,
    EXTRACT(EPOCH FROM (m.prediction_deadline - CURRENT_TIMESTAMP)) as seconds_until_deadline
FROM matches m
JOIN teams ta ON m.team_a_id = ta.id
JOIN teams tb ON m.team_b_id = tb.id
WHERE m.status = 'scheduled'
  AND m.prediction_deadline > CURRENT_TIMESTAMP
ORDER BY m.match_date ASC;

COMMENT ON VIEW v_upcoming_matches IS 'Matches that are upcoming and accepting predictions';

-- View: Match results summary
CREATE OR REPLACE VIEW v_match_results AS
SELECT 
    m.id as match_id,
    m.tournament_id,
    m.match_number,
    m.match_type,
    ta.name as team_a_name,
    tb.name as team_b_name,
    tw.name as winner_name,
    p.name as man_of_match_name,
    m.first_innings_score,
    m.first_innings_wickets,
    m.match_date,
    m.is_reduced_overs,
    m.is_super_over,
    m.match_notes
FROM matches m
JOIN teams ta ON m.team_a_id = ta.id
JOIN teams tb ON m.team_b_id = tb.id
LEFT JOIN teams tw ON m.winner_team_id = tw.id
LEFT JOIN players p ON m.man_of_match_id = p.id
WHERE m.status = 'completed'
ORDER BY m.match_date DESC;

COMMENT ON VIEW v_match_results IS 'Completed matches with results';

-- ============================================================================
-- GRANTS (adjust as needed for your user roles)
-- ============================================================================

-- For application user (limited permissions)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- For admin user (full permissions)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin_user;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

COMMENT ON SCHEMA public IS 'FanBattle NPL Fantasy Predictor Application - Database Schema v1.0';

