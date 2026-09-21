# SMS Gateway Runbook (Issue 5: SMS OTP)

Status: **hardware not provisioned yet**. The backend scaffolding (`Capcom6SmsProvider`,
`OtpService`, `POST /auth/otp/send`, `POST /auth/otp/verify`) is implemented and tested against
a mocked gateway. This doc is the checklist for standing up the real thing: an Android phone
running the open-source *SMS Gateway for Android* app by capcom6
(https://github.com/capcom6/android-sms-gateway), used as the SMS send path instead of
Twilio/an aggregator for launch (see `documentation/PHASE_6_NOTIFICATIONS_ISSUES.md`, Issue 5).

Fill in the blanks (phone model, app version, SIM plan) as those decisions get made, so this
stays a reproducible runbook and not tribal knowledge.

## 1. Hardware

- [ ] Android phone: model ___________, Android version ___________
      (needs: always-on power (keep it plugged in), a stable network connection --
      Wi-Fi for local mode, or mobile data/Wi-Fi for cloud mode -- and a screen-off-safe way
      to keep the app alive, see battery optimization below)
- [ ] SIM card(s) for the test matrix in section 5 -- start with one carrier to prove the
      round trip works at all, then add the other two

## 2. Install and configure the app

1. Install *SMS Gateway for Android* on the phone (GitHub releases, F-Droid, or Play Store --
   pick one and record which here: ___________, version ___________).
2. Grant it SMS and notification permissions when prompted.
3. **Disable battery optimization for the app** (Settings -> Apps -> SMS Gateway -> Battery ->
   Unrestricted). Without this, Android will kill the background service and SMS sends will
   silently stop working after the phone sleeps -- the single most common failure mode for
   this kind of setup.
4. In the app, set a username/password for API auth (HTTP Basic) -- these become
   `SMS_GATEWAY_USERNAME` / `SMS_GATEWAY_PASSWORD` below.

## 3. Pick a deployment mode

Both modes expose the same REST API shape (`POST /message` with HTTP Basic auth,
`{"textMessage": {"text": "..."}, "phoneNumbers": ["+213..."]}`) -- only the host differs.
`Capcom6SmsProvider` (`src/app/services/notifications/providers.py`) doesn't care which one
you use.

### Local mode (recommended to start, per the issue's own recommendation)

The backend talks directly to the phone's local HTTP server (port 8080 by default).

- [ ] Enable the local server in the app and note the phone's LAN IP.
- [ ] Make sure the backend can actually reach that IP:
  - Same LAN as the phone (fine for local dev/testing).
  - A VPN (Tailscale/WireGuard) between the phone and wherever the backend runs, for
    staging/production -- **do not** port-forward the phone's HTTP server directly onto the
    public internet.
- [ ] `SMS_GATEWAY_BASE_URL=http://<phone-lan-ip>:8080`

### Cloud mode

The app relays through capcom6's hosted service (https://sms-gate.app), so the backend doesn't
need network access to the phone at all -- trades that convenience for a third party sitting in
the delivery path.

- [ ] Register an account at sms-gate.app and link the device from within the app.
- [ ] `SMS_GATEWAY_BASE_URL=https://api.sms-gate.app/3rdparty/v1`

## 4. Backend configuration

Once a mode is chosen and the app is configured, set in the backend `.env`:

```
NOTIFICATION_SMS_PROVIDER=capcom6
SMS_GATEWAY_BASE_URL=<from section 3>
SMS_GATEWAY_USERNAME=<from section 2>
SMS_GATEWAY_PASSWORD=<from section 2>
```

`OTP_*` settings (code length, TTL, rate limits -- see `NotificationSettings`/`OtpSettings` in
`src/app/core/config.py`) already have sane defaults (6 digits, 5-minute TTL, 60s cooldown
between sends, 5 sends/hour/number, 5 verify attempts before a code is burned) and don't need
changing to get started.

Until `SMS_GATEWAY_BASE_URL` etc. are set, leave `NOTIFICATION_SMS_PROVIDER=noop` (the
default) -- `/auth/otp/send` and `/auth/otp/verify` both work end-to-end against the no-op
provider (the OTP round-trip and every rate limit is real, only the actual SMS send is
skipped/logged), so the rest of the app can be built and tested against this today.

## 5. Verify it end-to-end

1. Sanity-check the gateway directly, bypassing the backend entirely:
   ```
   curl -u "$SMS_GATEWAY_USERNAME:$SMS_GATEWAY_PASSWORD" \
        -H "Content-Type: application/json" \
        -d '{"textMessage": {"text": "test"}, "phoneNumbers": ["+213XXXXXXXXX"]}' \
        "$SMS_GATEWAY_BASE_URL/message"
   ```
   Confirm the SMS actually lands on a real phone before touching the backend.
2. Then exercise the real round trip through the API:
   ```
   curl -X POST http://localhost:8000/api/v1/auth/otp/send \
        -H "Content-Type: application/json" -d '{"phone_number": "+213XXXXXXXXX"}'

   curl -X POST http://localhost:8000/api/v1/auth/otp/verify \
        -H "Content-Type: application/json" \
        -d '{"phone_number": "+213XXXXXXXXX", "code": "<received code>"}'
   ```
3. Kill the gateway (turn off Wi-Fi on the phone, or stop the app) and confirm `/otp/send`
   returns a `503` with a clear error, not a `202`/hang -- this is the "failover path"
   acceptance criterion from Issue 5.

## 6. Test matrix (fill in as tested)

| Carrier  | SIM provisioned | Delivery time | Failure rate | Cost/SMS | Notes |
|----------|:---------------:|:--------------|:--------------|:---------|:------|
| Djezzy   | [ ]              |                |               |          |       |
| Mobilis  | [ ]              |                |               |          |       |
| Ooredoo  | [ ]              |                |               |          |       |

## 7. Troubleshooting

- **Gateway returns 401/403** -- `SMS_GATEWAY_USERNAME`/`PASSWORD` don't match what's set in
  the app.
- **Requests hang/timeout** -- phone is offline, asleep (see battery optimization above), or
  the backend can't reach the phone's IP (local mode) / has no internet (cloud mode).
- **Some messages never arrive despite a 2xx from the gateway** -- carrier-side filtering
  (some DZ carriers throttle/block SMS from numbers sending a high volume of short numeric
  codes). Track this per-carrier in the test matrix above; it's the main reason to test all
  three before launch rather than assuming Djezzy behavior generalizes.
- **`FAILED` entries in `notification_logs` with `event_type="otp_code"`** -- every send
  attempt is logged there regardless of channel (see `OtpService._log`), so that table is the
  first place to check for a delivery failure pattern.

## 8. Scaling path

`Capcom6SmsProvider` implements the same `SmsProvider` interface every other SMS adapter
would (see `src/app/services/notifications/providers.py`). Swapping to a local aggregator or
Twilio later means:

1. Add a new `SmsProvider` subclass in `providers.py`.
2. Add a branch for it in `_resolve_sms_provider()` in
   `src/app/services/notifications/service.py`.
3. Flip `NOTIFICATION_SMS_PROVIDER` to the new provider's name.

`OtpService`, `POST /auth/otp/send`, and `POST /auth/otp/verify` don't change at all.
