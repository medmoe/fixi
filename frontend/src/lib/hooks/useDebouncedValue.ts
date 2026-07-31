import {useEffect, useState} from 'react'

/**
 * Returns `value` delayed by `delay` ms, resetting the timer on every change.
 * Used to keep keystroke-driven queries under third-party rate limits.
 */
export const useDebouncedValue = <T, >(value: T, delay: number): T => {
    const [debounced, setDebounced] = useState<T>(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debounced
}
