'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button, Input, Label } from '@/components/ui'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from '@/lib/hooks'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  )
}

function LoginForm() {
  const t = useTranslations('auth')
  const tc = useTranslations('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/trips'

  const [mode, setMode] = React.useState<Mode>('signin')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [displayName, setDisplayName] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [oauthLoading, setOauthLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const supabase = React.useMemo(() => createBrowserClient(), [])

  /** 邮箱密码登录/注册 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError(t('errorFields'))
      return
    }
    if (mode === 'signup' && password.length < 6) {
      setError(t('errorPasswordShort'))
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: displayName.trim()
              ? { display_name: displayName.trim() }
              : undefined,
          },
        })
        if (err) throw err
        // 如果需要邮箱验证
        if (data.user && !data.session) {
          toast({ title: t('verifyEmail') })
          setMode('signin')
          setLoading(false)
          return
        }
        toast({ title: tc('confirm'), description: t('signupSuccess') })
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (err) throw err
      }
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t('errorGeneric')
      setError(mode === 'signin' ? t('errorSignin') : t('errorSignup'))
      // Supabase 错误消息更具体
      if (err instanceof Error && err.message) {
        const supaMsg = err.message.toLowerCase()
        if (supaMsg.includes('invalid login')) {
          setError(t('errorInvalid'))
        } else if (supaMsg.includes('already registered')) {
          setError(t('errorExists'))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  /** Google OAuth */
  const handleGoogle = async () => {
    setError('')
    setOauthLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${redirectTo}` },
      })
      if (err) throw err
      // OAuth 会重定向，不需要手动 router.push
    } catch {
      setError(t('errorGoogle'))
      setOauthLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-canvas via-surface-muted to-surface-canvas p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover shadow-lg shadow-accent-shadow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-h3 font-bold text-accent">
              {tc('appName')}
            </span>
          </Link>
        </div>

        {/* 登录卡片 */}
        <div className="rounded-2xl border border-border bg-surface-elevated p-8 shadow-xl shadow-sm">
          {/* 模式切换 */}
          <div className="mb-6 flex rounded-lg bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError('') }}
              className={`flex-1 rounded-md py-2 text-body-sm font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-surface-elevated text-ink-primary shadow-sm'
                  : 'text-ink-tertiary hover:text-ink-secondary'
              }`}
            >
              {t('signin')}
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError('') }}
              className={`flex-1 rounded-md py-2 text-body-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-surface-elevated text-ink-primary shadow-sm'
                  : 'text-ink-tertiary hover:text-ink-secondary'
              }`}
            >
              {t('signup')}
            </button>
          </div>

          <h1 className="text-h4 font-bold text-ink-primary">
            {mode === 'signin' ? t('signinTitle') : t('signupTitle')}
          </h1>
          <p className="mt-1 text-body-sm text-ink-tertiary">
            {mode === 'signin' ? t('signinSubtitle') : t('signupSubtitle')}
          </p>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="display-name">{t('displayName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-quaternary" />
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('displayNamePlaceholder')}
                    className="pl-9"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">{t('email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-quaternary" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t('password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-quaternary" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                />
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3 py-2 text-body-sm text-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || oauthLoading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? t('signin') : t('signup')}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* 分隔线 */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-caption text-ink-quaternary">{t('or')}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            disabled={loading || oauthLoading}
            onClick={handleGoogle}
            className="w-full"
          >
            {oauthLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="h-4 w-4" />
            )}
            {t('googleSignin')}
          </Button>
        </div>

        {/* 返回首页 */}
        <p className="mt-6 text-center text-body-sm text-ink-quaternary">
          <Link href="/" className="transition-colors hover:text-ink-secondary">
            {t('backHome')}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

/** Google 图标（官方多色 SVG） */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
