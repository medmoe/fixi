from __future__ import annotations

from ...models import NotificationChannel

# Single source of truth for what Issue 6's notification-preferences
# settings UI offers a toggle for: every event_type ever passed to
# notify_user() (see events.py/callers), mapped to whichever of
# PUSH/EMAIL it can actually be sent on. Kept here (not derived from the
# call sites) so the API layer -- and NotificationService's preference
# check -- have one place to validate a (channel, event_type) pair
# against, rather than trusting whatever a client sends.
#
# IN_APP never appears here -- the notification feed always records
# everything, it's not a togglable channel. Neither does SMS: OTP
# (services/otp.py) never goes through notify_user()/NotificationService
# at all, so there's nothing for a preference row to suppress -- it's a
# mandatory auth requirement per Issue 5/6, not a preference.
TOGGLEABLE_EVENT_CHANNELS: dict[str, frozenset[NotificationChannel]] = {
    "job_application.accepted": frozenset({NotificationChannel.PUSH}),
    "job_application.rejected": frozenset({NotificationChannel.PUSH}),
    "job_application.confirmed": frozenset({NotificationChannel.PUSH}),
    "job_application.withdrawn": frozenset({NotificationChannel.PUSH}),
    "job.started": frozenset({NotificationChannel.PUSH}),
    "job.completed": frozenset({NotificationChannel.PUSH}),
    "job.completion_pending_confirmation": frozenset({NotificationChannel.PUSH}),
    "review_received": frozenset({NotificationChannel.PUSH, NotificationChannel.EMAIL}),
    "worker_verification_approved": frozenset({NotificationChannel.PUSH, NotificationChannel.EMAIL}),
}
