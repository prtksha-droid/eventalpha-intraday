FROM python:3.12-alpine

WORKDIR /app

RUN pip install --no-cache-dir pymongo

COPY worker.py /app/worker.py

CMD ["python", "-u", "worker.py"]