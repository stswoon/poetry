# Моды Claude Code

`limits-band` — строка над полем ввода, которая всегда показывает, сколько осталось от 5-часового и недельного лимита (по всему аккаунту, а не только по текущему чату).

## Установка на новом компьютере

Из корня проекта poetry:

```bash
claude plugin marketplace add "$PWD/.claude/mods"
claude plugin install limits-band@local-mods
```

Мод ставится для пользователя, поэтому работает во всех проектах и чатах на этом компьютере. Появится в новых сессиях.

## Обновление после изменений в моде

Сначала поднимите `version` в `limits-band/.claude-plugin/plugin.json`, затем:

```bash
claude plugin marketplace update local-mods
claude plugin update limits-band@local-mods
```
