import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {act, renderHook} from '@testing-library/react'
import {useDebouncedValue} from '../useDebouncedValue'

describe('useDebouncedValue', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('returns the initial value immediately', () => {
        const {result} = renderHook(() => useDebouncedValue('new', 400))
        expect(result.current).toBe('new')
    })

    it('does not update before the delay elapses', () => {
        const {result, rerender} = renderHook(({value}) => useDebouncedValue(value, 400), {
            initialProps: {value: 'new'},
        })
        rerender({value: 'new york'})
        act(() => vi.advanceTimersByTime(399))
        expect(result.current).toBe('new')
    })

    it('updates once the delay elapses', () => {
        const {result, rerender} = renderHook(({value}) => useDebouncedValue(value, 400), {
            initialProps: {value: 'new'},
        })
        rerender({value: 'new york'})
        act(() => vi.advanceTimersByTime(400))
        expect(result.current).toBe('new york')
    })

    it('only emits the latest value when updates arrive rapidly', () => {
        const {result, rerender} = renderHook(({value}) => useDebouncedValue(value, 400), {
            initialProps: {value: 'n'},
        })
        rerender({value: 'ne'})
        act(() => vi.advanceTimersByTime(200))
        rerender({value: 'new'})
        act(() => vi.advanceTimersByTime(200))
        rerender({value: 'new y'})
        act(() => vi.advanceTimersByTime(400))
        expect(result.current).toBe('new y')
    })

    it('clears its pending timer on unmount', () => {
        const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
        const {rerender, unmount} = renderHook(({value}) => useDebouncedValue(value, 400), {
            initialProps: {value: 'new'},
        })
        rerender({value: 'new york'})
        unmount()
        expect(clearSpy).toHaveBeenCalled()
    })
})
