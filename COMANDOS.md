# Comandos do projeto

## Subir o ambiente

```bash
docker compose up --build
```

## Subir em segundo plano

```bash
docker compose up -d --build
```

## Parar o ambiente

```bash
docker compose down
```

## Ver logs

```bash
docker compose logs -f
```

## Ver logs de um serviço

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql
docker compose logs -f phpmyadmin
```

## Reiniciar tudo do zero

```bash
docker compose down -v
docker compose up --build
```