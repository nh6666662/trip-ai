'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings2,
  Plus,
  Check,
  Trash2,
  Pencil,
  Sparkles,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAiSettingsStore } from '@/lib/stores/ai-settings-store'
import { BUILTIN_PROVIDERS, type CustomProvider } from '@/lib/ai/providers'
import { cn, uuid } from '@/lib/utils'
import { toast } from '@/lib/hooks/use-toast'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function AiSettingsDialog({ open, onOpenChange }: Props) {
  const t = useTranslations('aiSettings')
  const tc = useTranslations('common')
  const {
    activeProviderId,
    customProviders,
    setActiveProvider,
    addCustomProvider,
    updateCustomProvider,
    removeCustomProvider,
  } = useAiSettingsStore()

  const [showForm, setShowForm] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({
    name: '',
    endpoint: '',
    model: '',
    apiKey: '',
  })

  const resetForm = () => {
    setForm({ name: '', endpoint: '', model: '', apiKey: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const openAddForm = () => {
    resetForm()
    setShowForm(true)
  }

  const openEditForm = (p: CustomProvider) => {
    setForm({
      name: p.name,
      endpoint: p.endpoint,
      model: p.model,
      apiKey: p.apiKey,
    })
    setEditingId(p.id)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.endpoint.trim() || !form.model.trim() || !form.apiKey.trim()) {
      toast({ title: t('fillAllFields'), variant: 'warning' })
      return
    }
    if (editingId) {
      updateCustomProvider(editingId, {
        name: form.name.trim(),
        endpoint: form.endpoint.trim(),
        model: form.model.trim(),
        apiKey: form.apiKey.trim(),
      })
      toast({ title: t('updated') })
    } else {
      const id = `custom-${uuid().slice(0, 8)}`
      addCustomProvider({
        id,
        name: form.name.trim(),
        endpoint: form.endpoint.trim(),
        model: form.model.trim(),
        apiKey: form.apiKey.trim(),
      })
      toast({ title: t('added') })
    }
    resetForm()
  }

  const handleDelete = (id: string) => {
    removeCustomProvider(id)
    toast({ title: t('deleted') })
  }

  const activeName =
    BUILTIN_PROVIDERS.find((p) => p.id === activeProviderId)?.name ??
    customProviders.find((p) => p.id === activeProviderId)?.name ??
    t('noneSelected')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-accent" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {/* 提供商列表 */}
          <div className="space-y-2">
            {BUILTIN_PROVIDERS.map((p) => (
              <ProviderRow
                key={p.id}
                name={p.name}
                model={p.model}
                description={p.description}
                badge={t('builtin')}
                active={activeProviderId === p.id}
                onSelect={() => setActiveProvider(p.id)}
              />
            ))}

            {customProviders.map((p) => (
              <ProviderRow
                key={p.id}
                name={p.name}
                model={p.model}
                badge={t('custom')}
                active={activeProviderId === p.id}
                onSelect={() => setActiveProvider(p.id)}
                onEdit={() => openEditForm(p)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>

          {/* 添加 / 编辑表单 */}
          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-lg border border-border bg-surface-muted p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-body-sm font-medium">
                    {editingId ? t('editCustom') : t('addCustom')}
                  </h4>
                  <button
                    onClick={resetForm}
                    className="rounded p-1 text-ink-quaternary hover:bg-surface-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-name">{t('name')}</Label>
                    <Input
                      id="p-name"
                      placeholder={t('namePlaceholder')}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-endpoint">{t('endpoint')}</Label>
                    <Input
                      id="p-endpoint"
                      placeholder={t('endpointPlaceholder')}
                      value={form.endpoint}
                      onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-model">{t('model')}</Label>
                    <Input
                      id="p-model"
                      placeholder={t('modelPlaceholder')}
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-key">{t('apiKey')}</Label>
                    <Input
                      id="p-key"
                      type="password"
                      placeholder={t('apiKeyPlaceholder')}
                      value={form.apiKey}
                      onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={resetForm}>
                      {tc('cancel')}
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      {editingId ? t('save') : t('add')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="add-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={openAddForm}
                >
                  <Plus className="h-4 w-4" />
                  {t('addCustom')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 当前选择提示 */}
        <div className="flex items-center gap-2 rounded-md bg-accent-muted px-3 py-2 text-body-sm text-accent">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>
            {t('current')}
            <span className="font-medium">{activeName}</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** 提供商行 */
function ProviderRow({
  name,
  model,
  description,
  badge,
  active,
  onSelect,
  onEdit,
  onDelete,
}: {
  name: string
  model: string
  description?: string
  badge: string
  active: boolean
  onSelect: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-colors',
        active
          ? 'border-accent bg-accent-muted/50'
          : 'border-border bg-surface-elevated hover:border-border',
      )}
    >
      <button
        onClick={onSelect}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            active
              ? 'border-accent bg-accent'
              : 'border-border bg-surface-elevated',
          )}
        >
          {active && <Check className="h-3 w-3 text-white" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-body-sm font-medium text-ink-primary">
              {name}
            </span>
            <Badge variant={badge === '内置' || badge === 'Built-in' ? 'default' : 'outline'}>
              {badge}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-caption text-ink-tertiary">
            {description ?? model}
          </p>
        </div>
      </button>

      {(onEdit || onDelete) && (
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="rounded p-1.5 text-ink-quaternary hover:bg-surface-muted hover:text-ink-secondary"
              aria-label="edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="rounded p-1.5 text-ink-quaternary hover:bg-surface-muted hover:text-danger"
              aria-label="delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
