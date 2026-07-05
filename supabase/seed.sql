-- ================================================================
-- 旅智 TripAI — 完整数据库初始化脚本
-- 包含：建表 + 索引 + RLS + 种子数据
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ================================================================

-- ========== 1. 扩展 ==========
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== 2. 景点表（先创建，因为其他表引用它）==========
CREATE TABLE IF NOT EXISTS spots (
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

-- ========== 3. 用户表 ==========
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  travel_preferences TEXT[],
  reputation_score FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 4. 行程表 ==========
CREATE TABLE IF NOT EXISTS trips (
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

-- ========== 5. 行程节点表 ==========
CREATE TABLE IF NOT EXISTS trip_nodes (
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

-- ========== 6. UGC 上报表 ==========
CREATE TABLE IF NOT EXISTS ugc_reports (
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

-- ========== 7. 实时预警表 ==========
CREATE TABLE IF NOT EXISTS realtime_alerts (
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

-- ========== 8. 索引 ==========
CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_nodes_trip ON trip_nodes(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_nodes_sort ON trip_nodes(trip_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_ugc_spot ON ugc_reports(spot_id);
CREATE INDEX IF NOT EXISTS idx_ugc_user ON ugc_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_trip ON realtime_alerts(trip_id);

-- ========== 9. RLS 行级安全策略 ==========
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_alerts ENABLE ROW LEVEL SECURITY;

-- 景点：公开可读
DROP POLICY IF EXISTS "Spots readable by all" ON spots;
CREATE POLICY "Spots readable by all" ON spots FOR SELECT USING (true);

-- 用户资料：公开可读，仅本人可改
DROP POLICY IF EXISTS "Profiles readable by all" ON user_profiles;
DROP POLICY IF EXISTS "Profiles modifiable by owner" ON user_profiles;
CREATE POLICY "Profiles readable by all" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Profiles modifiable by owner" ON user_profiles FOR ALL USING (auth.uid() = id);

-- 行程：仅本人可访问
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can modify own trips" ON trips;
CREATE POLICY "Users can view own trips" ON trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own trips" ON trips FOR ALL USING (auth.uid() = user_id);

-- 行程节点：跟随行程权限
DROP POLICY IF EXISTS "Nodes readable via trip" ON trip_nodes;
DROP POLICY IF EXISTS "Nodes modifiable via trip" ON trip_nodes;
CREATE POLICY "Nodes readable via trip" ON trip_nodes FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_nodes.trip_id AND trips.user_id = auth.uid())
);
CREATE POLICY "Nodes modifiable via trip" ON trip_nodes FOR ALL USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_nodes.trip_id AND trips.user_id = auth.uid())
);

-- UGC：公开可读，仅作者可改
DROP POLICY IF EXISTS "UGC readable by all" ON ugc_reports;
DROP POLICY IF EXISTS "UGC modifiable by author" ON ugc_reports;
CREATE POLICY "UGC readable by all" ON ugc_reports FOR SELECT USING (true);
CREATE POLICY "UGC modifiable by author" ON ugc_reports FOR ALL USING (auth.uid() = user_id);

-- 实时预警：跟随行程权限
DROP POLICY IF EXISTS "Alerts readable via trip" ON realtime_alerts;
DROP POLICY IF EXISTS "Alerts modifiable via trip" ON realtime_alerts;
CREATE POLICY "Alerts readable via trip" ON realtime_alerts FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = realtime_alerts.trip_id AND trips.user_id = auth.uid())
);
CREATE POLICY "Alerts modifiable via trip" ON realtime_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = realtime_alerts.trip_id AND trips.user_id = auth.uid())
);

-- ========== 10. 种子数据 ==========

-- 10.1 景点数据（北京热门景点）
INSERT INTO spots (id, name, description, latitude, longitude, min_visit_minutes, recommended_minutes, rating, tags, opening_time, closing_time) VALUES
  ('a1111111-1111-1111-1111-111111111111', '故宫博物院', '中国明清两代的皇家宫殿，世界上现存规模最大、保存最为完整的木质结构古建筑之一', 39.9163, 116.3972, 120, 180, 4.8, ARRAY['历史', '文化', '世界遗产', '亲子'], '08:30', '17:00'),
  ('a2222222-2222-2222-2222-222222222222', '景山公园', '位于北京城中心，是俯瞰故宫全景和北京中轴线的绝佳地点', 39.9227, 116.3967, 45, 90, 4.5, ARRAY['公园', '自然', '摄影'], '06:00', '21:00'),
  ('a3333333-3333-3333-3333-333333333333', '王府井步行街', '北京最著名的商业街之一，汇聚各类商铺和小吃', 39.9148, 116.4107, 60, 120, 4.2, ARRAY['购物', '美食', '休闲'], '09:00', '22:00'),
  ('a4444444-4444-4444-4444-444444444444', '天坛公园', '明清两代皇帝祭祀天地之神的场所，世界文化遗产', 39.8822, 116.4066, 90, 150, 4.7, ARRAY['历史', '文化', '公园', '世界遗产'], '06:00', '22:00'),
  ('a5555555-5555-5555-5555-555555555555', '颐和园', '中国现存最大的皇家园林，以万寿山和昆明湖为基础', 39.9999, 116.2755, 120, 240, 4.9, ARRAY['园林', '历史', '世界遗产', '亲子'], '06:30', '18:00'),
  ('b1111111-1111-1111-1111-111111111111', '南锣鼓巷', '北京最古老的街区之一，充满老北京风情的胡同文化', 39.9371, 116.4037, 45, 90, 4.3, ARRAY['文化', '美食', '购物', '胡同'], '00:00', '23:59'),
  ('b2222222-2222-2222-2222-222222222222', '中国国家博物馆', '世界上单体建筑面积最大的博物馆，藏品超过140万件', 39.9055, 116.3976, 120, 180, 4.6, ARRAY['博物馆', '文化', '免费', '亲子'], '09:00', '17:00'),
  ('b3333333-3333-3333-3333-333333333333', '北海公园', '中国现存最古老、最完整的皇家园林之一', 39.9245, 116.3892, 60, 120, 4.5, ARRAY['公园', '历史', '园林'], '06:00', '21:00'),
  ('b4444444-4444-4444-4444-444444444444', '798艺术区', '原国营798厂等电子工业老厂区改造而成的艺术社区', 39.9842, 116.4946, 90, 150, 4.4, ARRAY['艺术', '文化', '摄影', '展览'], '10:00', '18:00'),
  ('b5555555-5555-5555-5555-555555555555', '长城·慕田峪段', '万里长城的精华段落，以秀丽的自然风光著称', 40.4319, 116.5704, 180, 300, 4.9, ARRAY['历史', '自然', '世界遗产', '户外'], '07:30', '17:30');

-- 10.2 景点图片（占位 URL）
UPDATE spots SET image_url = 'https://images.unsplash.com/photo-1584646098378-0874589d76b1?w=800' WHERE id = 'a1111111-1111-1111-1111-111111111111';
UPDATE spots SET image_url = 'https://images.unsplash.com/photo-1599571244227-bf26a7b38538?w=800' WHERE id = 'a2222222-2222-2222-2222-222222222222';
UPDATE spots SET image_url = 'https://images.unsplash.com/photo-1567449790598-243c7de77805?w=800' WHERE id = 'a3333333-3333-3333-3333-333333333333';
UPDATE spots SET image_url = 'https://images.unsplash.com/photo-1597655601841-214a4cfe3a6c?w=800' WHERE id = 'a4444444-4444-4444-4444-444444444444';
UPDATE spots SET image_url = 'https://images.unsplash.com/photo-1599571244227-bf26a7b38538?w=800' WHERE id = 'a5555555-5555-5555-5555-555555555555';

SELECT '✓ 建表完成：6 张核心表 + 索引 + RLS + 10 个景点种子数据' AS result;
