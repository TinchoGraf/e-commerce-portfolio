# ---- Imagen base ----
FROM python:3.12-slim AS base

# Variables de entorno para que Python no genere archivos .pyc y muestre los logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# ---- Dependencias ----
FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- App ----
FROM deps AS app
COPY . .

# El puerto donde corre uvicorn
EXPOSE 8000

# Comando para iniciar el servidor
# --host 0.0.0.0 permite conexiones desde fuera del contenedor
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
