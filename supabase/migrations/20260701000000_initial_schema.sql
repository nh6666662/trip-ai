-- 初始数据库迁移 — 核心表结构
-- 对应《项目总纲.md》4.4 Supabase 数据库设计

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表（扩展 Supabase Auth 的 auth.users）
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  travel_preferences TEXT[],
  reputation_score FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 行程表
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  departure TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pace TEXT DEFAULT 'relaxed',
  traveler_count INT DEFAULT 1,
  preferences TEXT[],
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 行程节点表
CREATE TABLE trip_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  spot_id UUID REFERENCES spots(id),
  name TEXT NOT NULL,
  node_type TEXT DEFAULT 'spot',
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL,
  transit_minutes INT DEFAULT 0,
  sort_order INT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- 景点表
CREATE TABLE spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  min_visit_minutes INT DEFAULT 60,
  recommended_minutes INT DEFAULT 120,
  rating FLOAT DEFAULT 0,
  tags TEXT[],
  opening_time TIME,
  closing_time TIME
);

-- UGC 上报表
CREATE TABLE ugc_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES spots(id),
  trip_id UUID REFERENCES trips(id),
  content TEXT,
  photos TEXT[],
  rating INT CHECK (rating BETWEEN 0 AND 5),
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  status TEXT DEFAULT 'pending',
  confidence FLOAT,
  upvotes INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 实时预警表
CREATE TABLE realtime_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  confidence FLOAT NOT NULL DEFAULT 0.5,
  suggestion TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_trip_nodes_trip ON trip_nodes(trip_id);
CREATE INDEX idx_trip_nodes_sort ON trip_nodes(trip_id, sort_order);
CREATE INDEX idx_ugc_spot ON ugc_reports(spot_id);
CREATE INDEX idx_ugc_user ON ugc_reports(user_id);
CREATE INDEX idx_alerts_trip ON realtime_alerts(trip_id);

-- RLS 行级安全策略
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_alerts ENABLE ROW LEVEL SECURITY;

-- user_profiles: 公开可读，仅本人可改
CREATE POLICY "Profiles readable by all" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Profiles modifiable by owner" ON user_profiles FOR ALL USING (auth.uid() = id);

-- trips: 仅本人可访问
CREATE POLICY "Users can view own trips" ON trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own trips" ON trips FOR ALL USING (auth.uid() = user_id);

-- trip_nodes: 跟随 trip 权限
CREATE POLICY "Nodes readable via trip" ON trip_nodes FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_nodes.trip_id AND trips.user_id = auth.uid())
);
CREATE POLICY "Nodes modifiable via trip" ON trip_nodes FOR ALL USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_nodes.trip_id AND trips.user_id = auth.uid())
);

-- ugc_reports: 公开可读，仅作者可改
CREATE POLICY "UGC readable by all" ON ugc_reports FOR SELECT USING (true);
CREATE POLICY "UGC modifiable by author" ON ugc_reports FOR ALL USING (auth.uid() = user_id);

-- realtime_alerts: 跟随 trip 权限
CREATE POLICY "Alerts readable via trip" ON realtime_alerts FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = realtime_alerts.trip_id AND trips.user_id = auth.uid())
);
