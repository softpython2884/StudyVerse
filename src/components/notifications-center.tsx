
"use client";

import React, { useState, useTransition } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { type Notification } from '@/lib/types';
import { markAllNotificationsAsRead, markNotificationAsRead } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "min";
    return Math.floor(seconds) + "s";
}


export function NotificationsCenter({ initialNotifications }: { initialNotifications: Notification[] }) {
    const [notifications, setNotifications] = useState(initialNotifications);
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { toast } = useToast();

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleMarkAsRead = (notificationId: number) => {
        startTransition(async () => {
            setNotifications(prev =>
                prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
            );
            const result = await markNotificationAsRead({ notificationId });
            if (!result.success) {
                toast({ title: "Error", description: "Failed to mark as read.", variant: "destructive" });
                 // Revert optimistic update
                setNotifications(prev =>
                    prev.map(n => (n.id === notificationId ? { ...n, is_read: false } : n))
                );
            }
        });
    };
    
    const handleMarkAllAsRead = () => {
        startTransition(async () => {
             setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
             const result = await markAllNotificationsAsRead();
             if (!result.success) {
                toast({ title: "Error", description: "Failed to mark all as read.", variant: "destructive" });
                 setNotifications(initialNotifications); // Revert to initial state on error
             }
        });
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary/90"></span>
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col p-0">
                <SheetHeader className="p-6 pb-2">
                    <SheetTitle>Notifications</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1">
                    <div className="p-6 pt-0 space-y-4">
                        {notifications.length === 0 ? (
                            <div className="text-center text-muted-foreground py-12">
                                <Bell className="mx-auto h-12 w-12 text-primary/20" strokeWidth={1} />
                                <p className="mt-4">You have no notifications yet.</p>
                            </div>
                        ) : (
                            notifications.map((notification, index) => (
                                <React.Fragment key={notification.id}>
                                    <div
                                        className={cn(
                                            "flex items-start gap-4 p-3 rounded-lg transition-colors",
                                            !notification.is_read && "bg-secondary/50",
                                            notification.link && "cursor-pointer hover:bg-secondary"
                                        )}
                                        onClick={() => {
                                            if (!notification.is_read) {
                                                handleMarkAsRead(notification.id);
                                            }
                                            if (notification.link) {
                                                router.push(notification.link);
                                                setIsOpen(false);
                                            }
                                        }}
                                    >
                                        <div className="pt-1">
                                            {!notification.is_read ? (
                                                 <span className="block h-2.5 w-2.5 rounded-full bg-primary" />
                                            ) : (
                                                <CheckCheck className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm">{notification.content}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatTimeAgo(notification.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    {index < notifications.length - 1 && <Separator />}
                                </React.Fragment>
                            ))
                        )}
                    </div>
                </ScrollArea>
                {notifications.some(n => !n.is_read) && (
                     <SheetFooter className="p-6 pt-0 border-t">
                        <Button variant="outline" className="w-full" onClick={handleMarkAllAsRead} disabled={isPending}>
                           {isPending ? "Marking..." : "Mark all as read"}
                        </Button>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}
