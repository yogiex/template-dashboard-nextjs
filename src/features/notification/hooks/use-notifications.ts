"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { getNotifications, loadReadState, saveReadState } from "@/features/notification/service"
import type { Notification } from "@/features/notification/schema"

function applyReadState(notifications: Notification[], readIds: Set<string>): Notification[] {
  return notifications.map((notification) => ({ ...notification, isRead: readIds.has(notification.id) }))
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [, setReadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let isCancelled = false

    async function load() {
      const [result, persisted] = await Promise.all([getNotifications(), Promise.resolve(loadReadState())])
      if (isCancelled) return
      const ids = new Set(persisted)
      setReadIds(ids)
      setNotifications(applyReadState(result.notifications, ids))
      setIsLoaded(true)
    }

    void load()
    return () => {
      isCancelled = true
    }
  }, [])

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.isRead).length, [notifications])

  const markAsRead = useCallback((id: string) => {
    setReadIds((previous) => {
      const next = new Set(previous).add(id)
      setNotifications((current) => applyReadState(current, next))
      saveReadState([...next])
      return next
    })
  }, [])

  const markAllAsRead = useCallback(() => {
    const next = new Set(notifications.map((notification) => notification.id))
    setReadIds(next)
    setNotifications(applyReadState(notifications, next))
    saveReadState([...next])
  }, [notifications])

  return { notifications, unreadCount, isLoaded, markAsRead, markAllAsRead }
}
