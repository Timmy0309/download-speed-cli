import { downloadOnce, summarize, REQUEST_COUNT, TIMEOUT_MS } from './measure.mjs';

const usage = 'Использование: node src/cli.mjs "https://example.com/file.bin"';

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--help') {
        console.log(usage);
        return;
    }
    if (args.length !== 1) {
        throw new Error(usage);
    }

    let url;
    try {
        url = new URL(args[0]);
    } catch {
        throw new Error(`Некорректный URL. ${usage}`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Поддерживаются только HTTP и HTTPS');
    }

    console.log(`Запросов: ${REQUEST_COUNT}. Тайм-аут одного запроса: ${TIMEOUT_MS / 1000} с.`);
    const samples = [];

    for (let i = 1; i <= REQUEST_COUNT; i++) {
        let sample;
        try {
            sample = await downloadOnce(url);
        } catch (error) {
            throw new Error(`Запрос ${i}/${REQUEST_COUNT}: ${error.message}`, { cause: error });
        }
        samples.push(sample);
        console.log(`${i}/${REQUEST_COUNT}: ${sample.bytes} байт, ${sample.durationMs.toFixed(2)} мс`);
    }

    const result = summarize(samples);
    console.log('\nИтог:');
    console.log(`Успешных запросов: ${result.requests}/${REQUEST_COUNT}`);
    console.log(`Среднее время запроса: ${result.averageDurationMs.toFixed(2)} мс`);
    console.log(`Общий объём: ${result.totalBytes} байт`);
    console.log(`Суммарное время запросов: ${(result.totalDurationMs / 1000).toFixed(3)} с`);
    console.log(`Скорость скачивания: ${result.speedMbps.toFixed(2)} Мбит/с`);
}

main().catch((error) => {
    console.error(`Ошибка: ${error.message}`);
    process.exitCode = 1;
});
