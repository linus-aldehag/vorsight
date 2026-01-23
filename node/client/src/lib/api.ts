import api from './axios';

export const fetcher = async (url: string) => {
    try {
        const res = await api.get(url);
        return res.data;
    } catch (error: any) {
        const err = new Error('An error occurred while fetching the data.');
        // Attach extra info to the error object.
        (err as any).info = error.response?.data;
        (err as any).status = error.response?.status;
        throw err;
    }
};
