import { performance } from 'node:perf_hooks';

export const REQUEST_COUNT = 10;
export const TIMEOUT_MS = 60_000;

export async function downloadOnce(url, { timeoutMs = TIMEOUT_MS } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = performance.now();

    try {
        const response = await fetch(url, {
            headers: { 'Accept-Encoding': 'identity' },
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
        }

        const encoding = response.headers.get('content-encoding');
        if (encoding && encoding.trim().toLowerCase() !== 'identity') {
            throw new Error(`Сервер вернул сжатый ответ (${encoding}) вопреки Accept-Encoding: identity`);
        }

        let bytes = 0;
        if (response.body) {
            for await (const chunk of response.body) {
                bytes += chunk.byteLength;
            }
        }

        return { bytes, durationMs: performance.now() - startedAt };
    } catch (error) {
        const timedOut = controller.signal.aborted;
        controller.abort();

        if (timedOut) {
            throw new Error(`Превышен тайм-аут ${timeoutMs} мс`, { cause: error });
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

export function summarize(samples) {
    if (samples.length === 0) {
        throw new Error('Нет результатов для расчёта');
    }

    let totalBytes = 0;
    let totalDurationMs = 0;
    for (const sample of samples) {
        totalBytes += sample.bytes;
        totalDurationMs += sample.durationMs;
    }

    if (totalDurationMs <= 0) {
        throw new Error('Длительность измерения должна быть положительной');
    }

    return {
        requests: samples.length,
        totalBytes,
        totalDurationMs,
        averageDurationMs: totalDurationMs / samples.length,
        speedMbps: (totalBytes * 8) / (totalDurationMs / 1000) / 1_000_000,
    };
}
