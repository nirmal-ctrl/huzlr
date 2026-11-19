FROM python:3.13-slim

WORKDIR /service
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/service
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY worker_runtime ./worker_runtime
CMD ["python", "-m", "worker_runtime.node"]
