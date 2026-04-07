#!/usr/bin/env bash
mkdir -p /home/sprite/agent-server/data
jq -c '. + {recorded_at: (now | todate)}' >> /home/sprite/agent-server/data/events.jsonl
exit 0
