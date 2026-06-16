# Курси валют

Статичний сайт для GitHub Pages. Дані беруться з `data/rates.json`, який можна оновлювати вручну або генерувати з Excel.

## Формат Excel

Перший аркуш має містити заголовки:

```text
code | name | country | buy | sell | nbu
```

`updatedAt` задається під час запуску конвертера.

## Оновлення JSON з Excel

```powershell
powershell -ExecutionPolicy Bypass -File scripts/excel-to-json.ps1 -InputPath rates.xlsx -OutputPath data/rates.json
```

Скрипт використовує встановлений Microsoft Excel через COM, тому додаткові npm або Python-залежності не потрібні.

## GitHub Pages

1. Завантажте репозиторій на GitHub.
2. Увімкніть Pages: `Settings -> Pages -> Build and deployment -> GitHub Actions`.
3. Після push на `main` workflow `.github/workflows/pages.yml` опублікує сайт.
