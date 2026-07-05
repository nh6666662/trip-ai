-- 为 realtime_alerts 表添加拒绝原因字段
ALTER TABLE realtime_alerts ADD COLUMN IF NOT EXISTS dismiss_reason TEXT;
ALTER TABLE realtime_alerts ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;
