# B2B App Helm Chart

Цей Helm чарт призначений для розгортання B2B системи, що складається з двох компонентів:
1. Backend (price-app-b2b) - API сервер на Python FastAPI
2. Frontend (b2b-front) - React застосунок

## Вимоги

- Kubernetes 1.19+
- Helm 3.2.0+
- Налаштований Ingress Controller (рекомендується nginx)

## Встановлення

```bash
cd charts
helm install b2b ./b2b-app
```

Для встановлення з власними значеннями:

```bash
helm install b2b ./b2b-app -f my-values.yaml
```

## Параметри

| Параметр | Опис | Значення за замовчуванням |
| --- | --- | --- |
| `backend.image.repository` | Репозиторій образу для бекенду | `dreemix/price-app-b2b` |
| `backend.image.tag` | Тег образу для бекенду | `latest` |
| `backend.env.DB_HOST` | Хост PostgreSQL | `postgres-host` |
| `backend.env.DB_PORT` | Порт PostgreSQL | `5432` |
| `backend.env.DB_NAME` | Назва бази даних | `b2b_db` |
| `backend.env.DB_USER` | Користувач бази даних | `user` |
| `secrets.postgresql.DB_PASSWORD` | Пароль до бази даних | `change-me` |
| `frontend.image.repository` | Репозиторій образу для фронтенду | `dreemix/b2b-front` |
| `frontend.image.tag` | Тег образу для фронтенду | `latest` |
| `frontend.env.VITE_API_URL` | URL для API запитів | `/api` |
| `ingress.enabled` | Чи вмикати Ingress | `true` |
| `ingress.hosts[0].host` | Хост для Ingress | `b2b.example.com` |

Повний список параметрів можна знайти у файлі `values.yaml`.

## Приклад використання

1. Створіть файл `my-values.yaml` зі своїми налаштуваннями:

```yaml
backend:
  env:
    DB_HOST: "prod-postgres.example.com"
    DB_USER: "b2b_user"
    DB_NAME: "b2b_database"
  image:
    tag: "v1.2.3-abcdef"

frontend:
  image:
    tag: "v2.0.1-abcdef"

secrets:
  postgresql:
    DB_PASSWORD: "secure-password"

ingress:
  hosts:
    - host: "b2b.my-company.com"
```

2. Встановіть чарт з вашими налаштуваннями:

```bash
helm install b2b-app ./b2b-app -f my-values.yaml
```

3. Оновіть розгортання:

```bash
helm upgrade b2b-app ./b2b-app -f my-values.yaml
``` 