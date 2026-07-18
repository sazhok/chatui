#! /bin/bash

mode=${1:-bg}  # 'fg' - foreground, anything else - background via nohup

cd "$(dirname "$0")"
source .venv/bin/activate

mkdir -p logs

if [ "$mode" == "fg" ]; then
    uvicorn app:app --host 127.0.0.1 --port 8002
else
    echo "Running chatui backend in background..."
    nohup uvicorn app:app --host 127.0.0.1 --port 8002 &> logs/backend.log &
    echo $! > backend.pid
    echo "Started with PID $(cat backend.pid), logging to logs/backend.log"
fi
