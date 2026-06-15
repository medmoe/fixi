export async function apiRequest<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const response = await fetch(path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
}