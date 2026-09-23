import React from 'react'
import {Bell} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {Skeleton} from '@/components/ui/skeleton'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {NotificationRead} from '../types'
import {useNotifications} from '../hooks/useNotifications'
import {useMarkAllNotificationsRead} from '../hooks/useMarkAllNotificationsRead'
import {useMarkNotificationRead} from '../hooks/useMarkNotificationRead'
import {usePushRegistration} from '../hooks/usePushRegistration'
import {getLocalizedNotificationText} from '../utils/getLocalizedNotificationText'
import {useFormatDate} from '@/lib/hooks/useFormatters'

const RECENT_NOTIFICATIONS_LIMIT = 10

export const NotificationBell: React.FC = () => {
    // The WS connection itself is owned by AuthInitializer (mounted once for
    // the whole session) rather than here -- this component can mount and
    // unmount freely (e.g. across dashboard layouts) without dropping it.
    usePushRegistration()

    // `t` covers this component's own chrome; `i18n.language` drives which
    // of title_ar/fr/en (body_ar/fr/en) gets shown below -- previously
    // always title_fr/body_fr regardless of the active UI language, so an
    // Arabic- or English-reading user saw French notification text no
    // matter what the rest of the app was in.
    const {t, i18n} = useTranslation('notification')
    const formatDate = useFormatDate()

    const {data: unreadData} = useNotifications({unreadOnly: true, itemsPerPage: 1})
    const {data, isLoading} = useNotifications({itemsPerPage: RECENT_NOTIFICATIONS_LIMIT})
    const {mutate: markRead} = useMarkNotificationRead()
    const {mutate: markAllRead, isPending: isMarkingAllRead} = useMarkAllNotificationsRead()

    const unreadCount = unreadData?.total_count ?? 0
    const notifications = data?.data ?? []

    const handleItemClick = (notification: NotificationRead) => {
        if (!notification.read_at) {
            markRead(notification.id)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label={t('bell.triggerLabel')} data-testid="notification-bell-trigger">
                    <Bell className="h-5 w-5"/>
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -end-1 h-4 min-w-4 px-1 rounded-full text-[10px] justify-center"
                            aria-label={t('bell.unreadBadge', {count: unreadCount})}
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-80">
                <div className="flex items-center justify-between px-2 py-1.5">
                    <DropdownMenuLabel className="p-0">{t('bell.heading')}</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs"
                            disabled={isMarkingAllRead}
                            onClick={() => markAllRead()}
                            data-testid="mark-all-read-button"
                        >
                            {t('bell.markAllRead')}
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator/>

                {isLoading && (
                    <div className="space-y-2 p-2">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-10 w-full"/>
                        ))}
                    </div>
                )}

                {!isLoading && notifications.length === 0 && (
                    <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                        {t('bell.empty')}
                    </p>
                )}

                <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => {
                        const {title, body} = getLocalizedNotificationText(notification, i18n.language)
                        return (
                            <DropdownMenuItem
                                key={notification.id}
                                className="flex flex-col items-start gap-0.5 whitespace-normal py-2"
                                onClick={() => handleItemClick(notification)}
                            >
                                <div className="flex w-full items-start justify-between gap-2">
                                    <span className={notification.read_at ? 'font-normal' : 'font-semibold'}>
                                        {title}
                                    </span>
                                    {!notification.read_at && (
                                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={t('bell.unread')}/>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground">{body}</span>
                                <span className="text-[10px] text-muted-foreground">
                                    {formatDate(notification.created_at, {dateStyle: 'medium', timeStyle: 'short'})}
                                </span>
                            </DropdownMenuItem>
                        )
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
