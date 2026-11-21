FROM python:3.13-slim
RUN mkdir /workspace && chown 1000:1000 /workspace
USER 1000:1000
WORKDIR /workspace
ENV HOME=/workspace PYTHONDONTWRITEBYTECODE=1
CMD ["python", "-c", "import time; time.sleep(1830)"]
