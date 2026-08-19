import React, {useState} from 'react'
import {SubmitHandler, useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {Loader2, Save} from 'lucide-react'
import {Form} from '@/components/ui/form'
import {Button} from '@/components/ui/button'
import {type WorkerProfileFormValues, workerProfileSchema} from '../schemas/workerProfileSchema'
import {useAssignTrades} from '@/features/worker/hooks/useAssignTrades'
import {useUpdateWorkerProfile} from '@/features/worker/hooks/useUpdateWorkerProfile'

import {AvatarUploadField, BioField, HourlyRateField, ServiceRadiusField, TradeCategoryPicker, UpdateWorkerProfilePayload, WorkerProfileWithTradesRead} from '@/features/worker'

interface ProfileFormProps {
    profile: WorkerProfileWithTradesRead
}

export const ProfileForm: React.FC<ProfileFormProps> = ({profile}) => {
    const {mutate: updateProfile, isPending: isUpdating} = useUpdateWorkerProfile()
    const {assignTrades, removeTrade} = useAssignTrades()

    // ─── Local state — assigned and pending trades ─────────────────────────

    const [assignedTrades, setAssignedTrades] = useState(
        profile.trade_categories ?? []
    )
    const [pendingIds, setPendingIds] = useState<number[]>([])

    // ─── Form setup ────────────────────────────────────────────────────────

    const form = useForm<WorkerProfileFormValues>({
        resolver: zodResolver(workerProfileSchema),
        defaultValues: {
            bio: profile.bio || '',
            hourly_rate: profile.hourly_rate ?? undefined,
            service_radius_km: profile.service_radius_km ?? 25,
        },
    })

    const {handleSubmit, formState: {isDirty, isValid}} = form

    const isPending = isUpdating || assignTrades.isPending

    // ─── Submit — two independent requests ────────────────────────────────

    const onSubmit: SubmitHandler<WorkerProfileFormValues> = async (values) => {
        const parsedPayload = workerProfileSchema.parse(values) as UpdateWorkerProfilePayload

        // Request 1 — update profile fields
        // Request 2 — assign pending trades (only if any)
        // Both fire independently — one failure doesn't block the other

        const requests: Promise<void>[] = []

        if (isDirty) {
            requests.push(
                new Promise<void>((resolve) => {
                    updateProfile(parsedPayload, {
                        onSuccess: () => resolve(),
                        onError: () => resolve(),  // resolve anyway — independent
                    })
                })
            )
        }

        if (pendingIds.length > 0) {
            requests.push(
                new Promise<void>((resolve) => {
                    assignTrades.mutate(pendingIds, {
                        onSuccess: (updatedTrades) => {
                            setAssignedTrades(updatedTrades)  // ✅ update from backend response
                            setPendingIds([])                  // ✅ clear pending
                            resolve()
                        },
                        onError: () => {
                            // ✅ preserve pending on error — user can adjust
                            resolve()
                        },
                    })
                })
            )
        }

        await Promise.all(requests)
        form.reset(values)
    }

    // ─── Remove trade — immediate, no save needed ──────────────────────────

    const handleRemoveTrade = (trade_category_id: number) => {
        removeTrade.mutate(trade_category_id, {
            onSuccess: (updatedTrades) => {
                setAssignedTrades(updatedTrades)  // ✅ replace with backend response
            },
        })
    }

    const canSubmit = (isDirty || pendingIds.length > 0) && isValid && !isPending

    return (
        <Form {...form}>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-8 bg-card border p-6 rounded-xl shadow-sm"
            >
                {/* Avatar */}
                <AvatarUploadField currentAvatarUrl={profile.avatar_url}/>

                {/* Profile fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <HourlyRateField/>
                    <ServiceRadiusField/>
                </div>

                <BioField/>

                {/* Trade categories */}
                <div className="border-t pt-6">
                    <TradeCategoryPicker
                        assignedTrades={assignedTrades}
                        pendingIds={pendingIds}
                        onPendingChange={setPendingIds}
                        onRemove={handleRemoveTrade}
                        isRemoving={removeTrade.isPending}
                    />
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-4 border-t">
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                    >
                        {isPending
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</>
                            : <><Save className="mr-2 h-4 w-4"/> Update Profile</>
                        }
                    </Button>
                </div>
            </form>
        </Form>
    )
}