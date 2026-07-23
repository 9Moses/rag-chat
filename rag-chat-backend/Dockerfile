FROM python:3.11-slim

WORKDIR /app

# System deps needed by PyMuPDF and torch
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DEFAULT_TIMEOUT=1000 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install CPU-only PyTorch first (~150MB download vs ~2GB CUDA PyPI package)
RUN pip install --no-cache-dir torch==2.4.1+cpu --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python deps (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 --retries 10 -r requirements.txt

# Pre-download the embedding model at build time so the first request
# isn't slow and containers don't need internet access at runtime for this
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Pre-download tiktoken's BPE file at build time for the same reason —
# avoids a runtime call to openaipublic.blob.core.windows.net
RUN python -c "import tiktoken; tiktoken.get_encoding('cl100k_base')"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
